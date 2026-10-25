import type { RuntimeEnvironment } from "./contracts.ts";
import {
  contextEffectGate,
  sessionGateKey,
  sessionSignalKey,
  type ContextEffectGate,
} from "./context-effect-gate.ts";
const draftKey = Symbol.for("aru.effect-session-drafts.v1");
const ownedKey = Symbol.for("aru.effect-session-resources.v1");
export function sessionDrafts(
  environment: object,
  namespace = "metadata",
): Map<object, unknown> | undefined {
  const store = Reflect.get(environment, draftKey) as
    | Map<string, Map<object, unknown>>
    | undefined;
  if (!store) {
    return undefined;
  }
  let drafts = store.get(namespace);
  if (!drafts) {
    store.set(namespace, (drafts = new Map()));
  }
  return drafts;
}

// 세션이 만든 외부 자원만 해제한다. 사이트 노드·사용자 입력은 이 수명에 포함하지 않는다.
export function sessionResources(
  environment: RuntimeEnvironment,
  gate = contextEffectGate(environment),
  owned: Map<string, number> | undefined = Reflect.get(environment, ownedKey),
) {
  const cleanups = new Set<() => void>();
  let closed = false;
  const own = (cleanup: () => void, kind?: string) => {
    if (closed) {
      cleanup();
      return () => {};
    }
    let retained = true;
    if (kind && owned) {
      owned.set(kind, (owned.get(kind) ?? 0) + 1);
    }
    const release = () => {
      if (!retained) {
        return;
      }
      retained = false;
      if (kind && owned) {
        owned.set(kind, (owned.get(kind) ?? 1) - 1);
      }
    };
    const wrapped = () => {
      release();
      cleanup();
    };
    cleanups.add(wrapped);
    return () => {
      if (cleanups.delete(wrapped)) {
        release();
      }
    };
  };
  const listen = (
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    if (closed) {
      return;
    }
    const listener: EventListener = (event) => {
      if (gate.allows()) {
        if (typeof callback === "function") {
          callback.call(target, event);
        } else {
          callback.handleEvent(event);
        }
      }
    };
    target.addEventListener(type, listener, options);
    own(() => target.removeEventListener(type, listener, options));
  };
  const dispose = () => {
    if (closed) {
      return;
    }
    closed = true;
    for (const cleanup of Array.from(cleanups).reverse()) {
      try {
        cleanup();
      } catch (error) {
        environment.console.warn(
          "[Aru] 세션 자원 정리 실패",
          "SESSION_RESOURCE_CLEANUP_FAILED",
        );
      }
    }
    cleanups.clear();
  };
  gate.onStop(dispose);
  return {
    own,
    listen,
    dispose,
    get size() {
      return cleanups.size;
    },
  };
}

export function createSessionEnvironment(
  root: RuntimeEnvironment,
  gate: ContextEffectGate,
  drafts: Map<string, Map<object, unknown>> | undefined = Reflect.get(
    root,
    draftKey,
  ),
) {
  const owned: Map<string, number> = Reflect.get(root, ownedKey) ?? new Map();
  const cancellation = new root.AbortController();
  const resources = sessionResources(root, gate, owned);
  const local = new Map<PropertyKey, unknown>();
  const timers = new Map<number, () => void>();
  const frames = new Set<number>();
  const listeners = new Map<
    EventListenerOrEventListenerObject,
    Map<string, EventListener>
  >();
  const observers = new Set<{ disconnect(): void }>();
  const NativeObserver = root.MutationObserver;
  const scopedObserver =
    NativeObserver &&
    class extends NativeObserver {
      constructor(callback: MutationCallback) {
        super((records, observer) => {
          if (gate.allows()) {
            callback(records, observer);
          }
        });
      }
      override observe(target: Node, options?: MutationObserverInit) {
        if (!gate.allows()) {
          return;
        }
        observers.add(this);
        super.observe(target, options);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
  const NativeResizeObserver = root.ResizeObserver;
  const scopedResizeObserver =
    NativeResizeObserver &&
    class extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          if (gate.allows()) {
            callback(entries, observer);
          }
        });
      }
      override observe(target: Element, options?: ResizeObserverOptions) {
        if (!gate.allows()) {
          return;
        }
        observers.add(this);
        super.observe(target, options);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
  const NativeIntersectionObserver = root.IntersectionObserver;
  const scopedIntersectionObserver =
    NativeIntersectionObserver &&
    class extends NativeIntersectionObserver {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        super((entries, observer) => {
          if (gate.allows()) {
            callback(entries, observer);
          }
        }, options);
      }
      override observe(target: Element) {
        if (!gate.allows()) {
          return;
        }
        observers.add(this);
        super.observe(target);
      }
      override disconnect() {
        observers.delete(this);
        super.disconnect();
      }
    };
  const cancelTimer = (handle: number) => {
    timers.get(handle)?.();
    timers.delete(handle);
  };
  const timer = (
    repeat: boolean,
    callback: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ) => {
    if (!gate.allows()) {
      return 0;
    }
    const run = () => {
      if (!repeat) {
        timers.delete(handle);
      }
      if (gate.allows() && typeof callback === "function") {
        callback(...args);
      }
    };
    const handle = repeat
      ? root.setInterval(run, delay)
      : root.setTimeout(run, delay);
    timers.set(handle, () =>
      repeat ? root.clearInterval(handle) : root.clearTimeout(handle),
    );
    return handle;
  };
  let scoped: RuntimeEnvironment;
  const bound = new Set([
    "alert",
    "confirm",
    "getSelection",
    "queueMicrotask",
    "getComputedStyle",
    "matchMedia",
    "fetch",
    "atob",
    "btoa",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]);
  scoped = new Proxy(root, {
    get(target, key) {
      if (key === sessionGateKey) {
        return gate;
      }
      if (key === sessionSignalKey) {
        return cancellation.signal;
      }
      if (key === draftKey) {
        return drafts;
      }
      if (key === ownedKey) {
        return owned;
      }
      if (key === "window" || key === "self") {
        return scoped;
      }
      if (key === "MutationObserver") {
        return scopedObserver;
      }
      if (key === "ResizeObserver") {
        return scopedResizeObserver;
      }
      if (key === "IntersectionObserver") {
        return scopedIntersectionObserver;
      }
      if (key === "setTimeout") {
        return (callback: TimerHandler, delay?: number, ...args: unknown[]) =>
          timer(false, callback, delay, ...args);
      }
      if (key === "setInterval") {
        return (callback: TimerHandler, delay?: number, ...args: unknown[]) =>
          timer(true, callback, delay, ...args);
      }
      if (key === "clearTimeout" || key === "clearInterval") {
        return cancelTimer;
      }
      if (key === "requestAnimationFrame") {
        return (callback: FrameRequestCallback) => {
          if (!gate.allows()) {
            return 0;
          }
          const frame = root.requestAnimationFrame((time) => {
            frames.delete(frame);
            if (gate.allows()) {
              callback(time);
            }
          });
          frames.add(frame);
          return frame;
        };
      }
      if (key === "cancelAnimationFrame") {
        return (frame: number) => {
          frames.delete(frame);
          root.cancelAnimationFrame(frame);
        };
      }
      if (key === "addEventListener") {
        return (
          type: string,
          callback: EventListener,
          options?: boolean | AddEventListenerOptions,
        ) => {
          if (!gate.allows()) {
            return;
          }
          const capture =
            typeof options === "boolean" ? options : !!options?.capture;
          const id = type + ":" + capture;
          let types = listeners.get(callback);
          if (!types) {
            listeners.set(callback, (types = new Map()));
          }
          if (types.has(id)) {
            return;
          }
          const listener: EventListener = (event) => {
            if (gate.allows()) {
              callback.call(scoped, event);
            }
          };
          types.set(id, listener);
          root.addEventListener(type, listener, options);
          resources.own(() =>
            root.removeEventListener(type, listener, capture),
          );
        };
      }
      if (key === "removeEventListener") {
        return (
          type: string,
          callback: EventListener,
          options?: boolean | EventListenerOptions,
        ) => {
          const capture =
            typeof options === "boolean" ? options : !!options?.capture;
          const id = type + ":" + capture,
            types = listeners.get(callback),
            listener = types?.get(id);
          if (listener) {
            root.removeEventListener(type, listener, capture);
          }
          types?.delete(id);
        };
      }
      if (local.has(key)) {
        return local.get(key);
      }
      if (typeof key === "string" && /^__aru.*Controller$/.test(key)) {
        return undefined;
      }
      const value = Reflect.get(target, key, target);
      return bound.has(key as string) && typeof value === "function"
        ? value.bind(root.window ?? root)
        : value;
    },
    set(target, key, value) {
      if (typeof key === "string" && key.startsWith("__aru")) {
        local.set(key, value);
        return true;
      }
      return Reflect.set(target, key, value, target);
    },
  });
  resources.own(() => {
    for (const cancel of timers.values()) {
      cancel();
    }
    timers.clear();
    for (const frame of frames) {
      root.cancelAnimationFrame(frame);
    }
    frames.clear();
    for (const observer of Array.from(observers)) {
      observer.disconnect();
    }
    listeners.clear();
    local.clear();
  });
  resources.own(() => cancellation.abort());
  return {
    environment: scoped,
    resources,
    snapshot: () => ({
      timers: timers.size,
      observers: observers.size,
      windowListeners: Array.from(listeners.values()).reduce(
        (n, x) => n + x.size,
        0,
      ),
      owned: Object.fromEntries(owned),
    }),
  };
}
