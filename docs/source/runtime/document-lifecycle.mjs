// 자동 생성: src/runtime/document-lifecycle.ts. tools/compile-typescript.mjs로 갱신한다.
import { contextEffectGate, createEffectSessionGate, bindContextEffectGate, } from "./context-effect-gate.mjs";
import { readSettings, subscribeSettings } from "./settings-read.mjs";
import { createSessionEnvironment } from "./session-resources.mjs";
const ownerKey = Symbol.for("aru.document-lifecycle.v1");
// 문서의 이벤트 전달부는 한 번만 설치하고 효과 인스턴스는 검증된 epoch마다 새로 만든다.
export function documentLifecycle(root) {
    const target = root.window ?? root;
    const existing = Reflect.get(target, ownerKey);
    if (existing) {
        return existing;
    }
    const owner = createOwner(root);
    Object.defineProperty(target, ownerKey, { value: owner });
    return owner;
}
function createOwner(root) {
    const documentGate = contextEffectGate(root);
    documentGate.claimPageLifecycle?.();
    let state = "inactive";
    let epoch = 0, sessionsCreated = 0;
    let awaitingRestore = false;
    let pending;
    let current;
    const factories = new Map();
    const contexts = new Set();
    const drafts = new Map();
    const nativeAlive = () => {
        try {
            for (const context of contexts) {
                if (context.isInvalid) {
                    documentGate.invalidate();
                }
            }
            return documentGate.allows();
        }
        catch (error) {
            documentGate.observeError(error);
            return false;
        }
    };
    const stop = (next) => {
        ++epoch;
        pending?.abort();
        pending = undefined;
        const previous = current;
        current = undefined;
        state = next;
        previous?.session.gate.dispose();
        previous?.abort.abort();
    };
    const startFactory = (name, start) => {
        const active = current;
        if (!active || !active.session.isCurrent() || active.started.has(name)) {
            return;
        }
        active.started.add(name);
        try {
            start(active.session);
        }
        catch (error) {
            stop("inactive");
            root.console.warn("[Aru] 효과 세션 초기화 실패", "SESSION_START_FAILED");
        }
    };
    const verify = async () => {
        stop("verifying");
        if (!nativeAlive()) {
            state = "inactive";
            return;
        }
        const ticket = epoch;
        const request = (pending = new root.AbortController());
        const result = await readSettings(root, ["enabled"], {
            signal: request.signal,
        });
        if (ticket !== epoch || request.signal.aborted || awaitingRestore) {
            return;
        }
        if (!nativeAlive()) {
            if (ticket === epoch) {
                state = "inactive";
            }
            return;
        }
        pending = undefined;
        if (result.state !== "success" || result.values.enabled === false) {
            state = "inactive";
            return;
        }
        const gate = createEffectSessionGate(documentGate);
        const scope = createSessionEnvironment(root, gate, drafts);
        const abort = new root.AbortController();
        const session = {
            epoch: ticket,
            environment: scope.environment,
            gate,
            signal: abort.signal,
            isCurrent: () => current?.session === session &&
                ticket === epoch &&
                state === "running" &&
                gate.allows(),
            onCleanup: (callback) => {
                scope.resources.own(callback);
            },
        };
        current = { session, abort, scope, started: new Set() };
        sessionsCreated++;
        state = "running";
        for (const [name, start] of factories) {
            startFactory(name, start);
        }
    };
    const hide = (event) => {
        if (!event.isTrusted) {
            return;
        }
        if (event.persisted && nativeAlive()) {
            awaitingRestore = true;
            stop("suspended");
        }
        else {
            documentGate.dispose();
        }
    };
    const show = (event) => {
        if (!event.isTrusted ||
            !event.persisted ||
            !awaitingRestore ||
            state !== "suspended") {
            return;
        }
        awaitingRestore = false;
        void verify();
    };
    root.addEventListener("pagehide", hide);
    root.addEventListener("pageshow", show);
    const unsubscribe = subscribeSettings(root, (changes, area) => {
        if (area === "sync" &&
            "enabled" in changes &&
            !awaitingRestore &&
            nativeAlive()) {
            stop("inactive");
            const ticket = epoch;
            // 현재 onChanged 전달이 끝난 뒤 새 조회를 구독해 같은 변경으로 새 조회까지 취소하지 않는다.
            void Promise.resolve().then(() => {
                if (ticket === epoch && !awaitingRestore) {
                    return verify();
                }
            });
        }
    });
    documentGate.onStop(() => {
        stop("inactive");
        root.removeEventListener("pagehide", hide);
        root.removeEventListener("pageshow", show);
        unsubscribe?.();
    });
    const owner = {
        register(name, start, context) {
            if (context && !contexts.has(context)) {
                contexts.add(context);
                bindContextEffectGate(root, context);
            }
            if (factories.has(name)) {
                return;
            }
            factories.set(name, start);
            if (state === "running") {
                startFactory(name, start);
            }
            else if (epoch === 0) {
                void verify();
            }
        },
        snapshot() {
            return {
                native: documentGate.state === "invalidated" ||
                    documentGate.state === "disposed"
                    ? documentGate.state
                    : "alive",
                state,
                epoch,
                sessionsCreated,
                activeFactories: current?.started.size ?? 0,
                resources: current?.scope.snapshot() ?? {
                    timers: 0,
                    observers: 0,
                    windowListeners: 0,
                },
            };
        },
    };
    return owner;
}
