// 네이티브 컨텍스트의 종료는 설정 ON과 별개다. 종료를 확인한 인스턴스는 다시 활성화하지 않는다.
import type { CodedError } from "./contracts.ts";

interface ContextRoot {
  window?: object;
  browser?: { runtime?: { id?: unknown } };
  chrome?: { runtime?: { id?: unknown } };
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: object,
  ) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}
export interface ContextEffectGate {
  readonly documentGate?: ContextEffectGate;
  claimPageLifecycle?(): void;
  readonly state: "active" | "suspended" | "invalidated" | "disposed";
  allows(): boolean;
  assert(): void;
  invalidate(): void;
  dispose(): void;
  observeError(error: unknown): void;
  onStop(callback: () => void): () => void;
}
const gates = new WeakMap<object, ContextEffectGate>();
// 별도 생성 번들도 같은 ISOLATED Window의 종료 판단을 공유한다. MAIN의 Window와 저장 데이터는 사용하지 않는다.
const sharedGateKey = Symbol.for("aru.context-effect-gate.v1");
export const sessionGateKey = Symbol.for("aru.effect-session-gate.v1");
export const sessionSignalKey = Symbol.for("aru.effect-session-signal.v1");
export function contextEffectGate(environment: object): ContextEffectGate {
  const scoped = Reflect.get(environment, sessionGateKey) as
    | ContextEffectGate
    | undefined;
  if (scoped) {
    return scoped;
  }
  const root = environment as ContextRoot;
  const key = root.window ?? environment;
  let shared: ContextEffectGate | undefined;
  if (root.window) {
    try {
      shared = Reflect.get(key, sharedGateKey);
    } catch {
      /* 확장 expando를 지원하지 않는 호스트는 로컬 경계만 사용한다. */
    }
  }
  const existing = shared ?? gates.get(key);
  if (existing) {
    return existing;
  }
  let state: ContextEffectGate["state"] = "active";
  let runtimeId: string | undefined;
  const stopped = new Set<() => void>();
  const terminal = () => state === "invalidated" || state === "disposed";
  const stop = (next: "invalidated" | "disposed") => {
    if (terminal()) {
      return;
    }
    state = next;
    root.removeEventListener?.("pagehide", dispose);
    // 취소 불가능한 외부 Promise도 있을 수 있다. 정리와 별개로 완료 경계에서 다시 검사한다.
    // oxlint-disable-next-line unicorn/no-useless-spread -- 정리 콜백의 구독 해제가 이번 순회 대상을 바꾸지 않게 한다.
    for (const callback of [...stopped]) {
      try {
        callback();
      } catch (error) {
        console.warn("[Aru] 컨텍스트 종료 정리 실패", "CONTEXT_CLEANUP_FAILED");
      }
    }
    stopped.clear();
  };
  const dispose = () => stop("disposed");
  const gate: ContextEffectGate = {
    claimPageLifecycle() {
      root.removeEventListener?.("pagehide", dispose);
    },
    get state() {
      return state;
    },
    allows() {
      if (terminal()) {
        return false;
      }
      try {
        const runtime = root.browser?.runtime ?? root.chrome?.runtime;
        const id = runtime?.id;
        if (typeof id === "string" && id) {
          if (runtimeId && runtimeId !== id) {
            stop("invalidated");
            return false;
          }
          runtimeId = id;
        } else if (runtimeId) {
          stop("invalidated");
          return false;
        }
        // 순수 모듈·테스트 호스트처럼 네이티브 ID를 제공하지 않는 환경은 ID만으로 판정하지 않는다.
        state = "active";
        return true;
      } catch (error) {
        gate.observeError(error);
        if (!terminal()) {
          state = "suspended";
        }
        return false;
      }
    },
    assert() {
      if (!gate.allows()) {
        throw Object.assign(
          new Error("확장 컨텍스트에서 새 작업을 실행할 수 없습니다."),
          {
            code: terminal() ? "CONTEXT_INVALIDATED" : "CONTEXT_SUSPENDED",
          },
        ) satisfies CodedError;
      }
    },
    invalidate: () => stop("invalidated"),
    dispose,
    observeError(error) {
      if (
        /extension context invalidated/i.test(
          error instanceof Error ? error.message : String(error),
        )
      ) {
        stop("invalidated");
      }
    },
    onStop(callback) {
      if (terminal()) {
        callback();
        return () => {};
      }
      stopped.add(callback);
      return () => {
        stopped.delete(callback);
      };
    },
  };
  gates.set(key, gate);
  if (root.window) {
    try {
      Object.defineProperty(key, sharedGateKey, { value: gate });
    } catch {
      /* 같은 모듈의 WeakMap 경계는 계속 유지한다. */
    }
  }
  gate.allows();
  if (!terminal()) {
    root.addEventListener?.("pagehide", dispose, { once: true });
  }
  return gate;
}

// 이전 세션을 닫아도 문서 권한은 살아 있을 수 있다. 닫힌 세션 자체는 절대 재사용하지 않는다.
export function createEffectSessionGate(
  documentGate: ContextEffectGate,
): ContextEffectGate {
  let closed = false;
  const stopped = new Set<() => void>();
  let detach: (() => void) | undefined;
  const dispose = () => {
    if (closed) {
      return;
    }
    closed = true;
    detach?.();
    for (const callback of Array.from(stopped)) {
      try {
        callback();
      } catch (error) {
        console.warn("[Aru] 효과 세션 정리 실패", "SESSION_CLEANUP_FAILED");
      }
    }
    stopped.clear();
  };
  const gate: ContextEffectGate = {
    documentGate,
    get state() {
      return closed ? "disposed" : documentGate.state;
    },
    allows() {
      return !closed && documentGate.allows();
    },
    assert() {
      if (!gate.allows()) {
        throw Object.assign(new Error("효과 세션이 종료되었습니다."), {
          code: "CONTEXT_INVALIDATED",
        });
      }
    },
    dispose,
    invalidate() {
      documentGate.invalidate();
    },
    observeError(error) {
      // 이전 작업의 정상 결과는 버려도 같은 native context의 무효화는 문서 전체에 전달한다.
      documentGate.observeError(error);
    },
    onStop(callback) {
      if (closed) {
        callback();
        return () => {};
      }
      stopped.add(callback);
      return () => {
        stopped.delete(callback);
      };
    },
  };
  detach = documentGate.onStop(dispose);
  return gate;
}

// WXT hook은 감지의 한 경로다. hook만으로 OFF/ON을 모두 감지한다고 가정하지 않는다.
export function bindContextEffectGate(
  environment: object,
  context: {
    readonly isInvalid: boolean;
    onInvalidated(callback: () => void): void;
  },
) {
  const gate = contextEffectGate(environment);
  context.onInvalidated(() => gate.invalidate());
  if (context.isInvalid) {
    gate.invalidate();
  }
  return gate;
}
