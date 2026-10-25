// 자동 생성: src/runtime/session-resources.ts. tools/compile-typescript.mjs로 갱신한다.
import { contextEffectGate, sessionGateKey, sessionSignalKey, } from "./context-effect-gate.mjs";
const draftKey = Symbol.for("aru.effect-session-drafts.v1");
const ownedKey = Symbol.for("aru.effect-session-resources.v1");
export function sessionDrafts(environment, namespace = "metadata") {
    const store = Reflect.get(environment, draftKey);
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
export function sessionResources(environment, gate = contextEffectGate(environment), owned = Reflect.get(environment, ownedKey)) {
    const cleanups = new Set();
    let closed = false;
    const own = (cleanup, kind) => {
        if (closed) {
            cleanup();
            return () => { };
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
    const listen = (target, type, callback, options) => {
        if (closed) {
            return;
        }
        const listener = (event) => {
            if (gate.allows()) {
                if (typeof callback === "function") {
                    callback.call(target, event);
                }
                else {
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
            }
            catch (error) {
                environment.console.warn("[Aru] 세션 자원 정리 실패", "SESSION_RESOURCE_CLEANUP_FAILED");
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
export function createSessionEnvironment(root, gate, drafts = Reflect.get(root, draftKey)) {
    const owned = Reflect.get(root, ownedKey) ?? new Map();
    const cancellation = new root.AbortController();
    const resources = sessionResources(root, gate, owned);
    const local = new Map();
    const timers = new Map();
    const frames = new Set();
    const listeners = new Map();
    const observers = new Set();
    const NativeObserver = root.MutationObserver;
    const scopedObserver = NativeObserver &&
        class extends NativeObserver {
            constructor(callback) {
                super((records, observer) => {
                    if (gate.allows()) {
                        callback(records, observer);
                    }
                });
            }
            observe(target, options) {
                if (!gate.allows()) {
                    return;
                }
                observers.add(this);
                super.observe(target, options);
            }
            disconnect() {
                observers.delete(this);
                super.disconnect();
            }
        };
    const NativeResizeObserver = root.ResizeObserver;
    const scopedResizeObserver = NativeResizeObserver &&
        class extends NativeResizeObserver {
            constructor(callback) {
                super((entries, observer) => {
                    if (gate.allows()) {
                        callback(entries, observer);
                    }
                });
            }
            observe(target, options) {
                if (!gate.allows()) {
                    return;
                }
                observers.add(this);
                super.observe(target, options);
            }
            disconnect() {
                observers.delete(this);
                super.disconnect();
            }
        };
    const NativeIntersectionObserver = root.IntersectionObserver;
    const scopedIntersectionObserver = NativeIntersectionObserver &&
        class extends NativeIntersectionObserver {
            constructor(callback, options) {
                super((entries, observer) => {
                    if (gate.allows()) {
                        callback(entries, observer);
                    }
                }, options);
            }
            observe(target) {
                if (!gate.allows()) {
                    return;
                }
                observers.add(this);
                super.observe(target);
            }
            disconnect() {
                observers.delete(this);
                super.disconnect();
            }
        };
    const cancelTimer = (handle) => {
        timers.get(handle)?.();
        timers.delete(handle);
    };
    const timer = (repeat, callback, delay, ...args) => {
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
        timers.set(handle, () => repeat ? root.clearInterval(handle) : root.clearTimeout(handle));
        return handle;
    };
    let scoped;
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
                return (callback, delay, ...args) => timer(false, callback, delay, ...args);
            }
            if (key === "setInterval") {
                return (callback, delay, ...args) => timer(true, callback, delay, ...args);
            }
            if (key === "clearTimeout" || key === "clearInterval") {
                return cancelTimer;
            }
            if (key === "requestAnimationFrame") {
                return (callback) => {
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
                return (frame) => {
                    frames.delete(frame);
                    root.cancelAnimationFrame(frame);
                };
            }
            if (key === "addEventListener") {
                return (type, callback, options) => {
                    if (!gate.allows()) {
                        return;
                    }
                    const capture = typeof options === "boolean" ? options : !!options?.capture;
                    const id = type + ":" + capture;
                    let types = listeners.get(callback);
                    if (!types) {
                        listeners.set(callback, (types = new Map()));
                    }
                    if (types.has(id)) {
                        return;
                    }
                    const listener = (event) => {
                        if (gate.allows()) {
                            callback.call(scoped, event);
                        }
                    };
                    types.set(id, listener);
                    root.addEventListener(type, listener, options);
                    resources.own(() => root.removeEventListener(type, listener, capture));
                };
            }
            if (key === "removeEventListener") {
                return (type, callback, options) => {
                    const capture = typeof options === "boolean" ? options : !!options?.capture;
                    const id = type + ":" + capture, types = listeners.get(callback), listener = types?.get(id);
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
            return bound.has(key) && typeof value === "function"
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
            windowListeners: Array.from(listeners.values()).reduce((n, x) => n + x.size, 0),
            owned: Object.fromEntries(owned),
        }),
    };
}
