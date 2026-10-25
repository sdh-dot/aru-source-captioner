// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/content-dispatcher.mjs
  var dispatchers = /* @__PURE__ */ new WeakMap();
  function contentDispatcher(environment, gate) {
    const doc = environment.document;
    let dispatcher = dispatchers.get(doc);
    if (!dispatcher) {
      dispatcher = createDispatcher(doc, gate.documentGate ?? gate);
      dispatchers.set(doc, dispatcher);
    }
    return dispatcher.begin(gate) ? dispatcher : void 0;
  }
  __name(contentDispatcher, "contentDispatcher");
  function createDispatcher(doc, documentGate) {
    let current;
    let change;
    const forward = /* @__PURE__ */ __name((event) => {
      if (current?.allows()) {
        change?.(event);
      }
    }, "forward");
    doc.addEventListener("change", forward, true);
    documentGate.onStop(() => {
      doc.removeEventListener("change", forward, true);
      change = void 0;
    });
    return {
      begin(gate) {
        if (current === gate || (current?.allows() ?? false) || !gate.allows()) {
          return false;
        }
        current = gate;
        gate.onStop(() => {
          if (current === gate) {
            change = void 0;
          }
        });
        return true;
      },
      setChange(callback) {
        change = callback;
      }
    };
  }
  __name(createDispatcher, "createDispatcher");

  // docs/source/runtime/context-effect-gate.mjs
  var gates = /* @__PURE__ */ new WeakMap();
  var sharedGateKey = /* @__PURE__ */ Symbol.for("aru.context-effect-gate.v1");
  var sessionGateKey = /* @__PURE__ */ Symbol.for("aru.effect-session-gate.v1");
  var sessionSignalKey = /* @__PURE__ */ Symbol.for("aru.effect-session-signal.v1");
  function contextEffectGate(environment) {
    const scoped = Reflect.get(environment, sessionGateKey);
    if (scoped) {
      return scoped;
    }
    const root = environment;
    const key = root.window ?? environment;
    let shared;
    if (root.window) {
      try {
        shared = Reflect.get(key, sharedGateKey);
      } catch {
      }
    }
    const existing = shared ?? gates.get(key);
    if (existing) {
      return existing;
    }
    let state = "active";
    let runtimeId;
    const stopped = /* @__PURE__ */ new Set();
    const terminal = /* @__PURE__ */ __name(() => state === "invalidated" || state === "disposed", "terminal");
    const stop = /* @__PURE__ */ __name((next) => {
      if (terminal()) {
        return;
      }
      state = next;
      root.removeEventListener?.("pagehide", dispose);
      for (const callback of [...stopped]) {
        try {
          callback();
        } catch (error) {
          console.warn("[Aru] 컨텍스트 종료 정리 실패", "CONTEXT_CLEANUP_FAILED");
        }
      }
      stopped.clear();
    }, "stop");
    const dispose = /* @__PURE__ */ __name(() => stop("disposed"), "dispose");
    const gate = {
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
          throw Object.assign(new Error("확장 컨텍스트에서 새 작업을 실행할 수 없습니다."), {
            code: terminal() ? "CONTEXT_INVALIDATED" : "CONTEXT_SUSPENDED"
          });
        }
      },
      invalidate: /* @__PURE__ */ __name(() => stop("invalidated"), "invalidate"),
      dispose,
      observeError(error) {
        if (/extension context invalidated/i.test(error instanceof Error ? error.message : String(error))) {
          stop("invalidated");
        }
      },
      onStop(callback) {
        if (terminal()) {
          callback();
          return () => {
          };
        }
        stopped.add(callback);
        return () => {
          stopped.delete(callback);
        };
      }
    };
    gates.set(key, gate);
    if (root.window) {
      try {
        Object.defineProperty(key, sharedGateKey, { value: gate });
      } catch {
      }
    }
    gate.allows();
    if (!terminal()) {
      root.addEventListener?.("pagehide", dispose, { once: true });
    }
    return gate;
  }
  __name(contextEffectGate, "contextEffectGate");

  // docs/source/runtime/session-resources.mjs
  var draftKey = /* @__PURE__ */ Symbol.for("aru.effect-session-drafts.v1");
  var ownedKey = /* @__PURE__ */ Symbol.for("aru.effect-session-resources.v1");
  function sessionResources(environment, gate = contextEffectGate(environment), owned = Reflect.get(environment, ownedKey)) {
    const cleanups = /* @__PURE__ */ new Set();
    let closed = false;
    const own = /* @__PURE__ */ __name((cleanup, kind) => {
      if (closed) {
        cleanup();
        return () => {
        };
      }
      let retained = true;
      if (kind && owned) {
        owned.set(kind, (owned.get(kind) ?? 0) + 1);
      }
      const release = /* @__PURE__ */ __name(() => {
        if (!retained) {
          return;
        }
        retained = false;
        if (kind && owned) {
          owned.set(kind, (owned.get(kind) ?? 1) - 1);
        }
      }, "release");
      const wrapped = /* @__PURE__ */ __name(() => {
        release();
        cleanup();
      }, "wrapped");
      cleanups.add(wrapped);
      return () => {
        if (cleanups.delete(wrapped)) {
          release();
        }
      };
    }, "own");
    const listen = /* @__PURE__ */ __name((target, type, callback, options) => {
      if (closed) {
        return;
      }
      const listener = /* @__PURE__ */ __name((event) => {
        if (gate.allows()) {
          if (typeof callback === "function") {
            callback.call(target, event);
          } else {
            callback.handleEvent(event);
          }
        }
      }, "listener");
      target.addEventListener(type, listener, options);
      own(() => target.removeEventListener(type, listener, options));
    }, "listen");
    const dispose = /* @__PURE__ */ __name(() => {
      if (closed) {
        return;
      }
      closed = true;
      for (const cleanup of Array.from(cleanups).reverse()) {
        try {
          cleanup();
        } catch (error) {
          environment.console.warn("[Aru] 세션 자원 정리 실패", "SESSION_RESOURCE_CLEANUP_FAILED");
        }
      }
      cleanups.clear();
    }, "dispose");
    gate.onStop(dispose);
    return {
      own,
      listen,
      dispose,
      get size() {
        return cleanups.size;
      }
    };
  }
  __name(sessionResources, "sessionResources");
  function createSessionEnvironment(root, gate, drafts = Reflect.get(root, draftKey)) {
    const owned = Reflect.get(root, ownedKey) ?? /* @__PURE__ */ new Map();
    const cancellation = new root.AbortController();
    const resources = sessionResources(root, gate, owned);
    const local = /* @__PURE__ */ new Map();
    const timers = /* @__PURE__ */ new Map();
    const frames = /* @__PURE__ */ new Set();
    const listeners = /* @__PURE__ */ new Map();
    const observers = /* @__PURE__ */ new Set();
    const NativeObserver = root.MutationObserver;
    const scopedObserver = NativeObserver && class extends NativeObserver {
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
    const scopedResizeObserver = NativeResizeObserver && class extends NativeResizeObserver {
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
    const scopedIntersectionObserver = NativeIntersectionObserver && class extends NativeIntersectionObserver {
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
    const cancelTimer = /* @__PURE__ */ __name((handle) => {
      timers.get(handle)?.();
      timers.delete(handle);
    }, "cancelTimer");
    const timer = /* @__PURE__ */ __name((repeat, callback, delay, ...args) => {
      if (!gate.allows()) {
        return 0;
      }
      const run = /* @__PURE__ */ __name(() => {
        if (!repeat) {
          timers.delete(handle);
        }
        if (gate.allows() && typeof callback === "function") {
          callback(...args);
        }
      }, "run");
      const handle = repeat ? root.setInterval(run, delay) : root.setTimeout(run, delay);
      timers.set(handle, () => repeat ? root.clearInterval(handle) : root.clearTimeout(handle));
      return handle;
    }, "timer");
    let scoped;
    const bound = /* @__PURE__ */ new Set([
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
      "cancelAnimationFrame"
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
              listeners.set(callback, types = /* @__PURE__ */ new Map());
            }
            if (types.has(id)) {
              return;
            }
            const listener = /* @__PURE__ */ __name((event) => {
              if (gate.allows()) {
                callback.call(scoped, event);
              }
            }, "listener");
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
          return void 0;
        }
        const value = Reflect.get(target, key, target);
        return bound.has(key) && typeof value === "function" ? value.bind(root.window ?? root) : value;
      },
      set(target, key, value) {
        if (typeof key === "string" && key.startsWith("__aru")) {
          local.set(key, value);
          return true;
        }
        return Reflect.set(target, key, value, target);
      }
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
      snapshot: /* @__PURE__ */ __name(() => ({
        timers: timers.size,
        observers: observers.size,
        windowListeners: Array.from(listeners.values()).reduce((n, x) => n + x.size, 0),
        owned: Object.fromEntries(owned)
      }), "snapshot")
    };
  }
  __name(createSessionEnvironment, "createSessionEnvironment");

  // docs/source/runtime/settings-read.mjs
  var clock = {
    setTimeout: /* @__PURE__ */ __name((callback, delay) => globalThis.setTimeout(callback, delay), "setTimeout"),
    clearTimeout: /* @__PURE__ */ __name((handle) => globalThis.clearTimeout(handle), "clearTimeout")
  };
  function failure(code, message) {
    return Object.assign(new Error(message), { code });
  }
  __name(failure, "failure");
  function errorResult(error) {
    const value = error instanceof Error ? error : failure("API_ERROR", String(error));
    return {
      state: /extension context invalidated/i.test(value.message) ? "invalidated" : "failed",
      error: value,
      attempts: 1
    };
  }
  __name(errorResult, "errorResult");
  function selectApi(root) {
    const browser = root.browser;
    const promiseApi = !!(browser?.runtime && browser.storage);
    return { api: promiseApi ? browser : root.chrome, promiseApi };
  }
  __name(selectApi, "selectApi");
  function readOnce(root, keys, timer, signal) {
    return new Promise((resolve) => {
      let finished = false;
      let deadline;
      const finish = /* @__PURE__ */ __name((result2) => {
        if (finished) {
          return;
        }
        finished = true;
        timer.clearTimeout(deadline);
        signal?.removeEventListener("abort", cancel);
        resolve(result2);
      }, "finish");
      const cancel = /* @__PURE__ */ __name(() => finish({
        state: "cancelled",
        attempts: 1,
        error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다.")
      }), "cancel");
      if (signal?.aborted) {
        cancel();
        return;
      }
      signal?.addEventListener("abort", cancel, { once: true });
      deadline = timer.setTimeout(() => finish({
        state: "failed",
        attempts: 1,
        error: failure("SETTINGS_TIMEOUT", "설정 조회 응답 시간이 초과되었습니다.")
      }), 1e3);
      const accept = /* @__PURE__ */ __name((value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          finish({
            state: "failed",
            attempts: 1,
            error: failure("SETTINGS_INVALID_RESPONSE", "설정 조회 응답이 올바르지 않습니다.")
          });
        } else {
          finish({
            state: "success",
            values: value,
            attempts: 1
          });
        }
      }, "accept");
      try {
        const { api, promiseApi } = selectApi(root);
        const sync = api?.storage?.sync;
        if (!sync || typeof sync.get !== "function") {
          finish({
            state: "failed",
            attempts: 1,
            error: failure("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다.")
          });
          return;
        }
        const callback = /* @__PURE__ */ __name((value) => {
          try {
            const error = api?.runtime?.lastError;
            if (error) {
              finish(errorResult(failure("API_ERROR", error.message || "확장 프로그램 API 요청에 실패했습니다.")));
            } else {
              accept(value);
            }
          } catch (error) {
            finish(errorResult(error));
          }
        }, "callback");
        const returned = promiseApi ? sync.get(keys) : sync.get(keys, callback);
        if (returned && typeof returned.then === "function") {
          Promise.resolve(returned).then(accept, (error) => finish(errorResult(error)));
        }
      } catch (error) {
        finish(errorResult(error));
      }
    });
  }
  __name(readOnce, "readOnce");
  async function readSettings(root, keys, options = {}) {
    const timer = options.clock ?? clock;
    const controller = new AbortController();
    const scopedSignal = Reflect.get(root, sessionSignalKey);
    const cancel = /* @__PURE__ */ __name(() => controller.abort(), "cancel");
    if (scopedSignal?.aborted) {
      cancel();
    } else {
      scopedSignal?.addEventListener("abort", cancel, { once: true });
    }
    if (options.signal?.aborted) {
      cancel();
    } else {
      options.signal?.addEventListener("abort", cancel, { once: true });
    }
    const unsubscribe = subscribeSettings(root, (changes, area) => {
      if (area === "sync" && Object.keys(changes).some((key) => keys === null || keys.includes(key))) {
        cancel();
      }
    });
    try {
      for (let attempt = 1; ; attempt++) {
        const result2 = await readOnce(root, keys, timer, controller.signal);
        result2.attempts = attempt;
        if (result2.state === "invalidated") {
          contextEffectGate(root).invalidate();
        }
        if (controller.signal.aborted) {
          return {
            state: "cancelled",
            attempts: attempt,
            error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다.")
          };
        }
        if (result2.state !== "failed" || attempt === 3) {
          return result2;
        }
        const proceed = await new Promise((resolve) => {
          if (controller.signal.aborted) {
            resolve(false);
            return;
          }
          const cancelWait = /* @__PURE__ */ __name(() => {
            timer.clearTimeout(handle);
            resolve(false);
          }, "cancelWait");
          const handle = timer.setTimeout(() => {
            controller.signal.removeEventListener("abort", cancelWait);
            resolve(true);
          }, attempt === 1 ? 200 : 500);
          controller.signal.addEventListener("abort", cancelWait, { once: true });
        });
        if (!proceed) {
          return {
            state: "cancelled",
            attempts: attempt,
            error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다.")
          };
        }
      }
    } finally {
      scopedSignal?.removeEventListener("abort", cancel);
      options.signal?.removeEventListener("abort", cancel);
      unsubscribe?.();
    }
  }
  __name(readSettings, "readSettings");
  function subscribeSettings(root, listener) {
    try {
      const changed = selectApi(root).api?.storage?.onChanged;
      if (!changed) {
        return void 0;
      }
      changed.addListener(listener);
      return () => {
        try {
          changed.removeListener(listener);
        } catch {
        }
      };
    } catch {
      return void 0;
    }
  }
  __name(subscribeSettings, "subscribeSettings");

  // docs/source/source-caption/pixiv-filename.mjs
  function parsePixivFilenameUrl(filename) {
    if (typeof filename !== "string") {
      return null;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(filename);
    } catch {
      decoded = filename;
    }
    const basename = decoded.split(/[\\/]/).pop() || "";
    const match = basename.match(/^(pixiv[_\- ]?|illust[_\- ]?)?(\d{6,12})(_p\d+)?(?:_[a-z0-9]+)*(?: ?\([1-9]\d*\))?\.(?:jpg|jpeg|png|webp|gif)$/i);
    if (!match || !match[1] && !match[3]) {
      return null;
    }
    return `https://www.pixiv.net/artworks/${match[2]}`;
  }
  __name(parsePixivFilenameUrl, "parsePixivFilenameUrl");

  // docs/source/source-caption/link-display.mjs
  function formatSourceLinkText(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return url;
    }
    if (!["https:", "http:"].includes(parsed.protocol) || !["www.pixiv.net", "pixiv.net"].includes(parsed.hostname) || parsed.username || parsed.password || parsed.port) {
      return url;
    }
    const artwork = parsed.pathname.match(/^\/artworks\/(\d{6,12})\/?$/);
    return artwork ? `Pixiv - /artworks/${artwork[1]}` : url;
  }
  __name(formatSourceLinkText, "formatSourceLinkText");

  // docs/source/source-caption/png-chunks.mjs
  var PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  function hasPngSignature(buffer) {
    if (!buffer || buffer.byteLength < 8) {
      return false;
    }
    const sig = new Uint8Array(buffer, 0, 8);
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
      if (sig[i] !== PNG_SIGNATURE[i]) {
        return false;
      }
    }
    return true;
  }
  __name(hasPngSignature, "hasPngSignature");
  function* parsePngItxtChunks(buffer) {
    const view = new DataView(buffer);
    let offset = 8;
    while (offset + 12 <= buffer.byteLength) {
      const length = view.getUint32(offset, false);
      if (length > 2147483647) {
        return;
      }
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd + 4 > buffer.byteLength) {
        return;
      }
      const t0 = view.getUint8(offset + 4);
      const t1 = view.getUint8(offset + 5);
      const t2 = view.getUint8(offset + 6);
      const t3 = view.getUint8(offset + 7);
      const type = String.fromCodePoint(t0, t1, t2, t3);
      if (type === "iTXt" && length > 0) {
        yield new Uint8Array(buffer, dataStart, length);
      }
      if (type === "IEND") {
        return;
      }
      offset = dataEnd + 4;
    }
  }
  __name(parsePngItxtChunks, "parsePngItxtChunks");
  function parseItxtChunk(data) {
    if (!data || data.length < 6) {
      return null;
    }
    let kwEnd = -1;
    const maxKw = Math.min(data.length, 80);
    for (let i = 0; i < maxKw; i++) {
      if (data[i] === 0) {
        kwEnd = i;
        break;
      }
    }
    if (kwEnd < 1) {
      return null;
    }
    let keyword;
    try {
      keyword = "";
      for (let i = 0; i < kwEnd; i++) {
        keyword += String.fromCodePoint(data[i]);
      }
    } catch {
      return null;
    }
    if (kwEnd + 2 >= data.length) {
      return null;
    }
    const compressionFlag = data[kwEnd + 1];
    const compressionMethod = data[kwEnd + 2];
    let langEnd = -1;
    for (let i = kwEnd + 3; i < data.length; i++) {
      if (data[i] === 0) {
        langEnd = i;
        break;
      }
    }
    if (langEnd === -1) {
      return null;
    }
    let tkwEnd = -1;
    for (let i = langEnd + 1; i < data.length; i++) {
      if (data[i] === 0) {
        tkwEnd = i;
        break;
      }
    }
    if (tkwEnd === -1) {
      return null;
    }
    const textBytes = new Uint8Array(data.buffer, data.byteOffset + tkwEnd + 1, data.length - tkwEnd - 1);
    return { keyword, compressionFlag, compressionMethod, textBytes };
  }
  __name(parseItxtChunk, "parseItxtChunk");

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) {
        scope[name] = resolvers[name]?.();
      } else {
        Object.defineProperty(scope, name, {
          enumerable: true,
          get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get")
        });
      }
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");

  // docs/source/platform/firefox/content.mjs
  function installFirefoxContent({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const effectGate = contextEffectGate(environment);
    if (!effectGate.allows()) {
      return {};
    }
    const dispatcher = contentDispatcher(environment, effectGate);
    if (!dispatcher) {
      return {};
    }
    const scope = createSessionEnvironment(environment, effectGate);
    environment = scope.environment;
    const resources = scope.resources;
    const window = environment.window ?? environment;
    const { document, location, navigator, chrome, MutationObserver, HTMLElement, TextDecoder, URL: URL2, exifr, console: console2 } = environment;
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    const setInterval = typeof environment.setInterval === "function" ? (...args) => environment.setInterval(...args) : void 0;
    const clearInterval = typeof environment.clearInterval === "function" ? (...args) => environment.clearInterval(...args) : void 0;
    let attribution2 = createModuleScope(dependencies.attribution, ["Controller"], []);
    const runBootstrap1 = /* @__PURE__ */ __name(function bootstrap() {
      "use strict";
      console2.log("[Aru Source Captioner] content script loaded");
      const DEFAULT_OPTIONS = Object.freeze({
        enabled: true,
        allowHttp: false,
        strictAllowlist: false,
        allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
        ruliwebAiRevealMode: "off",
        ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
        ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"]
      });
      const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;
      const TEXT_FIELDS_FOR_JSON = [
        "UserComment",
        "userComment",
        "Comment",
        "Description",
        "ImageDescription"
      ];
      const WALK_MAX_DEPTH = 10;
      let uploadAttribution = null;
      const handledFileEvents = /* @__PURE__ */ new WeakSet();
      function isMobileAutoInsertEnvironment() {
        try {
          return /Android/i.test(navigator.userAgent || "") || window.innerWidth < 768 && window.matchMedia?.("(pointer: coarse)").matches === true;
        } catch (_) {
          return false;
        }
      }
      __name(isMobileAutoInsertEnvironment, "isMobileAutoInsertEnvironment");
      async function loadConfig() {
        const result2 = await readSettings(environment, null);
        if (result2.state !== "success") {
          throw result2.error;
        }
        const merged = { ...DEFAULT_OPTIONS };
        for (const key of Object.keys(DEFAULT_OPTIONS)) {
          if (key in result2.values) {
            merged[key] = result2.values[key];
          }
        }
        return merged;
      }
      __name(loadConfig, "loadConfig");
      function publishUploadStatus(snapshot) {
        if (!effectGate.allows()) {
          return;
        }
        const value = JSON.stringify(snapshot);
        if (document.documentElement.dataset.aruUploadDiagnostic !== value) {
          document.documentElement.dataset.aruUploadDiagnostic = value;
        }
      }
      __name(publishUploadStatus, "publishUploadStatus");
      function attachFileInputListeners(_config) {
        if (!effectGate.allows()) {
          return;
        }
        dispatcher.setChange(async (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLInputElement) || target.type !== "file" || !target.files?.length) {
            return;
          }
          if (handledFileEvents.has(ev)) {
            return;
          }
          handledFileEvents.add(ev);
          const images = Array.from(target.files).filter((file) => file?.type?.startsWith("image/"));
          if (!images.length) {
            return;
          }
          await handleSelectedImageFiles(images, target);
        });
      }
      __name(attachFileInputListeners, "attachFileInputListeners");
      async function handleSelectedImageFiles(files, input) {
        if (!effectGate.allows()) {
          return;
        }
        if (uploadAttribution) {
          await uploadAttribution.select(files, input);
        } else {
          publishUploadStatus({
            state: "editor-unavailable",
            selected: files.length
          });
        }
      }
      __name(handleSelectedImageFiles, "handleSelectedImageFiles");
      const ARU_ITXT_KEYWORD = "AruArchive";
      const ARU_PAYLOAD_URL_KEYS = ["artwork_url", "source_url", "artworkUrl"];
      function isPngFile(file) {
        if (!file) {
          return false;
        }
        if (typeof file.type === "string" && file.type === "image/png") {
          return true;
        }
        if (typeof file.name === "string" && /\.png$/i.test(file.name)) {
          return true;
        }
        return false;
      }
      __name(isPngFile, "isPngFile");
      function decodeAruPayloadFromItxtText(textBytes) {
        let jsonText;
        try {
          jsonText = new TextDecoder("utf-8", { fatal: false }).decode(textBytes);
        } catch {
          return { status: "error", url: null, reason: "png_itxt_invalid_chunk" };
        }
        let payload;
        try {
          payload = JSON.parse(jsonText);
        } catch {
          return {
            status: "error",
            url: null,
            reason: "png_itxt_json_parse_failed"
          };
        }
        return extractSourceFromAruArchivePayload(payload);
      }
      __name(decodeAruPayloadFromItxtText, "decodeAruPayloadFromItxtText");
      async function parseAruArchivePngItxt(file) {
        let buffer;
        try {
          buffer = await file.arrayBuffer();
        } catch {
          return { status: "error", url: null, reason: "arraybuffer_failed" };
        }
        if (!hasPngSignature(buffer)) {
          return {
            status: "missing",
            url: null,
            reason: "png_itxt_invalid_signature"
          };
        }
        for (const chunkBytes of parsePngItxtChunks(buffer)) {
          const itxt = parseItxtChunk(chunkBytes);
          if (!itxt) {
            continue;
          }
          if (itxt.keyword !== ARU_ITXT_KEYWORD) {
            continue;
          }
          if (itxt.compressionFlag !== 0) {
            return {
              status: "missing",
              url: null,
              reason: "png_itxt_compressed_unsupported"
            };
          }
          return decodeAruPayloadFromItxtText(itxt.textBytes);
        }
        return { status: "missing", url: null, reason: "png_itxt_missing" };
      }
      __name(parseAruArchivePngItxt, "parseAruArchivePngItxt");
      function extractSourceFromAruArchivePayload(payload) {
        if (!payload || typeof payload !== "object") {
          return { status: "missing", url: null, reason: "png_itxt_no_url" };
        }
        for (const key of ARU_PAYLOAD_URL_KEYS) {
          const v = payload[key];
          if (typeof v === "string" && v.trim().length > 0) {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              return { status: "ok", url: t, reason: "png_itxt_source_found" };
            }
          }
        }
        const artworkId = typeof payload.artwork_id === "string" ? payload.artwork_id.trim() : "";
        if (/^\d{6,12}$/.test(artworkId)) {
          return {
            status: "ok",
            url: `https://www.pixiv.net/artworks/${artworkId}`,
            reason: "png_itxt_artwork_id_fallback"
          };
        }
        return { status: "missing", url: null, reason: "png_itxt_no_url" };
      }
      __name(extractSourceFromAruArchivePayload, "extractSourceFromAruArchivePayload");
      async function parseSourceFromFile(file, { allowLooseFilenameFallback = true } = {}) {
        if (isPngFile(file)) {
          const aruResult = await parseAruArchivePngItxt(file);
          if (aruResult.status === "ok") {
            return aruResult;
          }
          if (aruResult.status === "error") {
            console2.debug("[Aru Source Captioner] png itxt fallback to exifr:", "PNG_METADATA_FALLBACK");
          }
        }
        {
          const filenameUrl = parsePixivFilenameUrl(file.name);
          if (filenameUrl) {
            console2.info("[Aru Source Captioner] filename parsed (priority 2)", "FILENAME_SOURCE_FOUND");
            return { status: "ok", url: filenameUrl, reason: "filename_parsed" };
          }
        }
        if (typeof exifr === "undefined" || !exifr || typeof exifr.parse !== "function") {
          const filenameUrl = allowLooseFilenameFallback ? parsePixivFilenameUrl(file.name) : null;
          if (filenameUrl) {
            console2.info("[Aru Source Captioner] filename fallback", {
              reason: "exifr_unavailable"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "error", url: null, reason: "exifr_unavailable" };
        }
        const isWebp = typeof file.type === "string" && file.type === "image/webp" || typeof file.name === "string" && /\.webp$/i.test(file.name);
        let metadata;
        try {
          metadata = await exifr.parse(file, {
            chunked: false,
            xmp: true,
            exif: true,
            iptc: true,
            userComment: true
          });
        } catch (err) {
          console2.warn("[Aru Source Captioner] exifr.parse failed —", "METADATA_PARSE_FAILED");
          const filenameUrl = allowLooseFilenameFallback ? parsePixivFilenameUrl(file.name) : null;
          if (filenameUrl) {
            console2.info("[Aru Source Captioner] filename fallback", {
              reason: "exifr_parse_failed"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          if (isWebp) {
            return { status: "missing", url: null, reason: "webp_no_exif" };
          }
          return { status: "error", url: null, reason: "metadata_parse_failed" };
        }
        if (!metadata || typeof metadata !== "object") {
          const filenameUrl = allowLooseFilenameFallback ? parsePixivFilenameUrl(file.name) : null;
          if (filenameUrl) {
            console2.info("[Aru Source Captioner] filename fallback", {
              reason: "no_metadata"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "missing", url: null, reason: "no_metadata" };
        }
        const candidates = extractSourceUrl(metadata);
        if (candidates.length === 0) {
          const filenameUrl = allowLooseFilenameFallback ? parsePixivFilenameUrl(file.name) : null;
          if (filenameUrl) {
            console2.info("[Aru Source Captioner] filename fallback", {
              reason: "no_url_candidates"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "missing", url: null, reason: "no_url_candidates" };
        }
        return { status: "ok", url: candidates[0], reason: "ok" };
      }
      __name(parseSourceFromFile, "parseSourceFromFile");
      function isPixivUserUrl(s) {
        if (typeof s !== "string") {
          return false;
        }
        try {
          const u = new URL2(s);
          return (u.hostname === "www.pixiv.net" || u.hostname === "pixiv.net") && /^\/users\/\d+/.test(u.pathname);
        } catch {
          return false;
        }
      }
      __name(isPixivUserUrl, "isPixivUserUrl");
      function extractSourceUrl(metadata) {
        if (!metadata || typeof metadata !== "object") {
          return [];
        }
        const candidates = [];
        const fallbackMetadata = collectFromPossibleAruJson(metadata, candidates);
        for (const key of ["Source", "source"]) {
          const v = metadata[key];
          if (typeof v === "string") {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              candidates.push(t);
            }
          }
        }
        for (const key of ["Identifier", "identifier"]) {
          const v = metadata[key];
          if (typeof v === "string") {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              candidates.push(t);
            } else if (/^\d{6,12}$/.test(t)) {
              candidates.push(`https://www.pixiv.net/artworks/${t}`);
            }
          } else if (Array.isArray(v)) {
            for (const item of v) {
              if (typeof item === "string") {
                const t = item.trim();
                if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
                  candidates.push(t);
                }
              }
            }
          }
        }
        collectUrlCandidates(fallbackMetadata, candidates);
        const rawAll = [];
        walkStringFields(fallbackMetadata, rawAll, 0);
        for (const u of rawAll) {
          if (!isPixivUserUrl(u)) {
            candidates.push(u);
          }
        }
        return uniqueOrdered(candidates);
      }
      __name(extractSourceUrl, "extractSourceUrl");
      function collectFromPossibleAruJson(metadata, candidates) {
        let fallbackMetadata = metadata;
        for (const field of TEXT_FIELDS_FOR_JSON) {
          const v = metadata[field];
          if (typeof v !== "string") {
            continue;
          }
          const obj = safeJsonParse(v);
          if (!obj || typeof obj !== "object") {
            continue;
          }
          const invalidKeys = [...ARU_PAYLOAD_URL_KEYS, "artwork_id"].filter((key) => key in obj && typeof obj[key] !== "string");
          if (invalidKeys.length) {
            const validFields = { ...obj };
            for (const key of invalidKeys) {
              delete validFields[key];
            }
            fallbackMetadata = {
              ...fallbackMetadata,
              [field]: JSON.stringify(validFields)
            };
          }
          for (const key of ["artwork_url", "source_url", "artworkUrl"]) {
            const urlVal = typeof obj[key] === "string" ? obj[key].trim() : "";
            if (urlVal && /^https?:\/\//.test(urlVal) && !isPixivUserUrl(urlVal)) {
              candidates.push(urlVal);
            } else if (urlVal && isPixivUserUrl(urlVal)) {
              console2.debug("[Aru Source Captioner] source candidate skipped (artist url):", "ARTIST_URL_SKIPPED");
            }
          }
          const artworkId = typeof obj.artwork_id === "string" ? obj.artwork_id.trim() : "";
          if (/^\d{6,12}$/.test(artworkId)) {
            candidates.push(`https://www.pixiv.net/artworks/${artworkId}`);
          }
          const origFilename = obj.original_filename;
          if (typeof origFilename === "string") {
            const filenameUrl = parsePixivFilenameUrl(origFilename);
            if (filenameUrl) {
              candidates.push(filenameUrl);
            }
          }
        }
        return fallbackMetadata;
      }
      __name(collectFromPossibleAruJson, "collectFromPossibleAruJson");
      function collectUrlCandidates(metadata, candidates) {
        for (const field of TEXT_FIELDS_FOR_JSON) {
          const v = metadata[field];
          if (typeof v !== "string") {
            continue;
          }
          const trimmed = v.trim();
          if (/^https?:\/\//.test(trimmed)) {
            candidates.push(trimmed);
          }
        }
      }
      __name(collectUrlCandidates, "collectUrlCandidates");
      function walkStringFields(value, candidates, depth) {
        if (depth > WALK_MAX_DEPTH) {
          return;
        }
        if (typeof value === "string") {
          const matches = value.match(URL_PATTERN);
          if (matches) {
            for (const m of matches) {
              candidates.push(m);
            }
          }
          return;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            walkStringFields(item, candidates, depth + 1);
          }
          return;
        }
        if (value && typeof value === "object") {
          for (const k of Object.keys(value)) {
            walkStringFields(value[k], candidates, depth + 1);
          }
        }
      }
      __name(walkStringFields, "walkStringFields");
      function safeJsonParse(text) {
        if (typeof text !== "string") {
          return null;
        }
        const trimmed = text.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return null;
        }
        try {
          return JSON.parse(trimmed);
        } catch (err) {
          console2.warn("[Aru Source Captioner] JSON parse failed; fallback continues", { parser: "aru_json", code: "JSON_PARSE_FAILED" });
          return null;
        }
      }
      __name(safeJsonParse, "safeJsonParse");
      function uniqueOrdered(arr) {
        const seen = /* @__PURE__ */ new Set();
        const out = [];
        for (const item of arr) {
          if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
          }
        }
        return out;
      }
      __name(uniqueOrdered, "uniqueOrdered");
      function sanitizeSourceUrl(rawUrl, config) {
        if (typeof rawUrl !== "string") {
          return null;
        }
        const trimmed = rawUrl.trim();
        if (trimmed.length === 0) {
          return null;
        }
        let parsed;
        try {
          parsed = new URL2(trimmed);
        } catch {
          return null;
        }
        const protocol = parsed.protocol;
        if (protocol === "https:") {
        } else if (protocol === "http:") {
          if (!config.allowHttp) {
            return null;
          }
        } else {
          return null;
        }
        if (config.strictAllowlist) {
          if (!isAllowedByPolicy(parsed.hostname, config)) {
            return null;
          }
        }
        return parsed.toString();
      }
      __name(sanitizeSourceUrl, "sanitizeSourceUrl");
      function isAllowedByPolicy(hostname, config) {
        if (typeof hostname !== "string" || hostname.length === 0) {
          return false;
        }
        if (!Array.isArray(config.allowedHosts)) {
          return false;
        }
        const h = hostname.toLowerCase();
        for (const allowed of config.allowedHosts) {
          if (typeof allowed !== "string") {
            continue;
          }
          const a = allowed.trim().toLowerCase();
          if (a.length === 0) {
            continue;
          }
          if (h === a) {
            return true;
          }
          if (h.endsWith("." + a)) {
            return true;
          }
        }
        return false;
      }
      __name(isAllowedByPolicy, "isAllowedByPolicy");
      function startEditorObserver(config) {
        if (!effectGate.allows()) {
          return;
        }
        const Controller = attribution2?.Controller;
        if (!Controller) {
          return null;
        }
        uploadAttribution = new Controller({
          document,
          parse: /* @__PURE__ */ __name(async (file) => {
            if (!effectGate.allows()) {
              return { status: "cancelled" };
            }
            const result2 = await parseSourceFromFile(file, {
              allowLooseFilenameFallback: !isMobileAutoInsertEnvironment()
            });
            return effectGate.allows() ? result2 : { status: "cancelled" };
          }, "parse"),
          sanitize: /* @__PURE__ */ __name((url) => sanitizeSourceUrl(url, config), "sanitize"),
          caption: createSourceCaption,
          anchor: findImageParagraph,
          existing: hasExistingSourceCaption,
          onStatus: publishUploadStatus
        });
        const controller = uploadAttribution;
        resources.own(() => controller.destroy(), "upload-controller");
        return uploadAttribution;
      }
      __name(startEditorObserver, "startEditorObserver");
      function findImageParagraph(img) {
        return img.closest("p") || img;
      }
      __name(findImageParagraph, "findImageParagraph");
      function hasExistingSourceCaption(img) {
        const anchor = findImageParagraph(img);
        const next = anchor.nextElementSibling;
        if (!next) {
          return false;
        }
        if (next instanceof HTMLElement && next.dataset?.aruSourceCaption === "1") {
          return true;
        }
        const text = (next.textContent || "").trim();
        if (text.startsWith("출처:")) {
          const a = next.querySelector?.("a[href]");
          if (a) {
            return true;
          }
        }
        return false;
      }
      __name(hasExistingSourceCaption, "hasExistingSourceCaption");
      function createSourceCaption(url) {
        effectGate.assert();
        const p = document.createElement("p");
        p.className = "aru-source-caption";
        p.style.textAlign = "center";
        p.dataset.aruSourceCaption = "1";
        p.appendChild(document.createTextNode("출처: "));
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = formatSourceLinkText(url);
        p.appendChild(a);
        return p;
      }
      __name(createSourceCaption, "createSourceCaption");
      const READ_PATH_PATTERN = /^\/community\/board\/[^/]+\/read\/[^/?]+/;
      function isReadPage() {
        try {
          return READ_PATH_PATTERN.test(location.pathname);
        } catch {
          return false;
        }
      }
      __name(isReadPage, "isReadPage");
      const COMMENT_TEXTAREA_SELECTOR = [
        // 일반 댓글
        'textarea[name="comment_input"]',
        'textarea[id="comment_input"]',
        'textarea[class~="comment_input"]',
        'textarea[name^="comment_input"]',
        // comment_input_<id>
        'textarea[id^="comment_input"]',
        'textarea[class*="comment_input"]',
        // class에 comment_input 부분 매칭
        // 대댓글 (Ruliweb: name="reply_input", class="common_input reply_input")
        'textarea[name="reply_input"]',
        'textarea[name^="reply_input"]',
        // reply_input_<id>
        'textarea[class~="reply_input"]',
        'textarea[class*="reply_input"]',
        // 다른 변형 패턴 (보존)
        'textarea[name^="re_comment_input"]',
        'textarea[id^="re_comment_input"]',
        'textarea[class*="re_comment"]'
      ].join(", ");
      const COMMENT_IMG_BUTTON_SELECTOR = ".common_img_button";
      const COMMENT_FILE_INPUT_SELECTOR = "input.common_img_input, input[type='file']";
      const COMMENT_FILE_BOUND_DATASET_KEY = "aruSourceFileBound";
      const COMMENT_SOURCE_PREFIX = "출처:";
      const wrapperSourceMap = /* @__PURE__ */ new WeakMap();
      const commentFileSelections = /* @__PURE__ */ new WeakMap();
      let readPageConfig = null;
      function resolveCommentWrapperForTextarea(textarea) {
        const outer = textarea.closest(".border_box.after_clear");
        if (outer) {
          return outer;
        }
        const borderBox = textarea.closest(".border_box");
        if (borderBox) {
          return borderBox;
        }
        const formish = textarea.closest("form, fieldset");
        if (formish) {
          return formish;
        }
        const innerWrapper = textarea.closest(".common_input_wrapper");
        if (innerWrapper?.parentElement) {
          return innerWrapper.parentElement;
        }
        return textarea.parentElement?.parentElement || textarea.parentElement || null;
      }
      __name(resolveCommentWrapperForTextarea, "resolveCommentWrapperForTextarea");
      function classifyAndPushWrapper(wrapper, result2) {
        const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
        if (!(textarea instanceof HTMLTextAreaElement)) {
          return;
        }
        const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);
        result2.push(wrapper);
        if (imgButton) {
          console2.log("[Aru Source Captioner] scan: wrapper OK (has textarea + .common_img_button)");
        } else {
          console2.log("[Aru Source Captioner] scan: wrapper has textarea but no .common_img_button — will use textarea position");
        }
      }
      __name(classifyAndPushWrapper, "classifyAndPushWrapper");
      function findCommentInputWrappers() {
        const textareas = document.querySelectorAll(COMMENT_TEXTAREA_SELECTOR);
        console2.log(`[Aru Source Captioner] scan: found ${textareas.length} comment textarea candidates`);
        const wrappers = /* @__PURE__ */ new Set();
        for (const textarea of textareas) {
          if (!(textarea instanceof HTMLTextAreaElement)) {
            continue;
          }
          const wrapper = resolveCommentWrapperForTextarea(textarea);
          if (wrapper instanceof HTMLElement) {
            wrappers.add(wrapper);
          }
        }
        const result2 = [];
        for (const wrapper of wrappers) {
          classifyAndPushWrapper(wrapper, result2);
        }
        console2.log(`[Aru Source Captioner] scan: ${result2.length} comment wrappers identified`);
        return result2;
      }
      __name(findCommentInputWrappers, "findCommentInputWrappers");
      function buildCommentSourceText(sourceUrl) {
        return `${COMMENT_SOURCE_PREFIX} ${sourceUrl}
`;
      }
      __name(buildCommentSourceText, "buildCommentSourceText");
      function logCommentInsertSkip(reason, _detail) {
        console2.debug("[Aru Source Captioner] comment insert skipped:", [
          "duplicate_source_line",
          "other_source_present",
          "maxlength_exceeded"
        ].includes(reason) ? reason : "COMMENT_INSERT_SKIPPED");
      }
      __name(logCommentInsertSkip, "logCommentInsertSkip");
      function focusTextareaSafe(textarea) {
        try {
          textarea.focus();
        } catch {
        }
      }
      __name(focusTextareaSafe, "focusTextareaSafe");
      function checkInsertSkipReason(textarea, existing, sourceLine, newValue) {
        if (existing.includes(sourceLine)) {
          focusTextareaSafe(textarea);
          console2.log("[Aru Source Captioner] insert: same source already present — focus only");
          logCommentInsertSkip("duplicate_source_line");
          return "duplicate";
        }
        if (/(^|\n)\s*출처\s*:\s*\S/.test(existing)) {
          focusTextareaSafe(textarea);
          console2.log("[Aru Source Captioner] insert: different source already present — skipped");
          logCommentInsertSkip("other_source_present");
          return "different-source";
        }
        const maxLen = typeof textarea.maxLength === "number" ? textarea.maxLength : -1;
        if (maxLen > 0 && newValue.length > maxLen) {
          console2.warn("[Aru Source Captioner] insert: maxLength exceeded — skipped", {
            newLength: newValue.length,
            maxLength: maxLen
          });
          logCommentInsertSkip("maxlength_exceeded", {
            maxLen,
            newLen: newValue.length
          });
          return "too-long";
        }
        return null;
      }
      __name(checkInsertSkipReason, "checkInsertSkipReason");
      function buildMergedTextareaValue(existing, sourceText) {
        if (existing.trim().length === 0) {
          return sourceText;
        }
        return existing.replace(/\s+$/u, "") + "\n\n" + sourceText;
      }
      __name(buildMergedTextareaValue, "buildMergedTextareaValue");
      function applyTextareaValue(textarea, newValue) {
        textarea.value = newValue;
        console2.log("[Aru Source Captioner] insert: value set", {
          valueMatches: textarea.value === newValue,
          valueLength: typeof textarea.value === "string" ? textarea.value.length : -1
        });
        const cursorPos = newValue.length;
        try {
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
        } catch {
        }
        try {
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          console2.debug("[Aru Source Captioner] event dispatch failed:", "COMMENT_EVENT_FAILED");
        }
      }
      __name(applyTextareaValue, "applyTextareaValue");
      function insertSourceIntoCommentTextarea(textarea, sourceText) {
        if (!effectGate.allows()) {
          return "context-inactive";
        }
        if (!(textarea instanceof HTMLTextAreaElement)) {
          console2.warn("[Aru Source Captioner] insert: not a textarea element");
          return "not-textarea";
        }
        const existing = typeof textarea.value === "string" ? textarea.value : "";
        const sourceLine = sourceText.split("\n")[0];
        console2.log("[Aru Source Captioner] insert: called", {
          textareaExists: true,
          inDOM: document.contains(textarea),
          maxLength: textarea.maxLength
        });
        const newValue = buildMergedTextareaValue(existing, sourceText);
        const skip = checkInsertSkipReason(textarea, existing, sourceLine, newValue);
        if (skip) {
          return skip;
        }
        applyTextareaValue(textarea, newValue);
        console2.log("[Aru Source Captioner] insert: completed successfully");
        return "ok";
      }
      __name(insertSourceIntoCommentTextarea, "insertSourceIntoCommentTextarea");
      function hookCommentFileInput(wrapper, config) {
        if (!effectGate.allows()) {
          return false;
        }
        if (!(wrapper instanceof HTMLElement)) {
          return false;
        }
        const fileInput = wrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR);
        if (!(fileInput instanceof HTMLInputElement)) {
          console2.log("[Aru Source Captioner] file: no file input in wrapper");
          return false;
        }
        if (fileInput.type !== "file") {
          return false;
        }
        let contextId;
        try {
          const id = chrome?.runtime?.id;
          if (typeof id !== "string" || !id) {
            return false;
          }
          contextId = id;
        } catch {
          return false;
        }
        let isContextInvalidated = false;
        const canApplyInContext = /* @__PURE__ */ __name(() => {
          if (!isContextInvalidated) {
            try {
              isContextInvalidated = chrome?.runtime?.id !== contextId;
            } catch {
              isContextInvalidated = true;
            }
          }
          return !isContextInvalidated;
        }, "canApplyInContext");
        const previous = commentFileSelections.get(fileInput);
        if (previous?.wrapper === wrapper) {
          return false;
        }
        if (previous) {
          fileInput.removeEventListener("change", previous.listener);
          const replacement = previous.wrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR);
          if (!replacement || replacement === fileInput) {
            wrapperSourceMap.delete(previous.wrapper);
          }
        }
        const selection = { revision: 0, wrapper, listener: onFileChange };
        commentFileSelections.set(fileInput, selection);
        wrapperSourceMap.delete(wrapper);
        fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY] = "1";
        resources.own(() => {
          delete fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY];
        });
        const targetInput = fileInput;
        const targetWrapper = wrapper;
        async function onFileChange(event) {
          if (commentFileSelections.get(targetInput) !== selection) {
            return;
          }
          const revision = ++selection.revision;
          if (targetWrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR) !== targetInput) {
            return;
          }
          wrapperSourceMap.delete(targetWrapper);
          const target = event.target;
          const files = target === targetInput ? targetInput.files : null;
          if (!files || files.length === 0) {
            return;
          }
          let imageFile = null;
          for (const f of files) {
            if (f && typeof f.type === "string" && f.type.startsWith("image/")) {
              imageFile = f;
              break;
            }
          }
          if (!imageFile) {
            console2.log("[Aru Source Captioner] file: no image in selection");
            return;
          }
          const textarea = targetWrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
          const isCurrentSelection = /* @__PURE__ */ __name(() => effectGate.allows() && canApplyInContext() && commentFileSelections.get(targetInput) === selection && revision === selection.revision && targetInput.isConnected && targetWrapper.isConnected && targetInput.ownerDocument === document && targetWrapper.ownerDocument === document && targetWrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR) === targetInput && targetWrapper.querySelector(COMMENT_TEXTAREA_SELECTOR) === textarea && (!textarea || textarea.isConnected) && Array.from(targetInput.files ?? []).find((file) => file.type.startsWith("image/")) === imageFile, "isCurrentSelection");
          if (!isCurrentSelection()) {
            return;
          }
          console2.log("[Aru Source Captioner] file: metadata parsing started");
          let sourceInfo;
          try {
            sourceInfo = await parseSourceFromFile(imageFile);
          } catch (err) {
            console2.warn("[Aru Source Captioner] file: metadata extraction threw", "COMMENT_METADATA_FAILED");
            return;
          }
          if (!isCurrentSelection()) {
            return;
          }
          if (sourceInfo?.status !== "ok" || !sourceInfo.url) {
            console2.log("[Aru Source Captioner] file: no Aru source metadata found in image");
            return;
          }
          const safeUrl = sanitizeSourceUrl(sourceInfo.url, config);
          if (!isCurrentSelection()) {
            return;
          }
          if (!safeUrl) {
            console2.log("[Aru Source Captioner] file: extracted source rejected by sanitizer");
            return;
          }
          console2.log("[Aru Source Captioner] file: source validated");
          wrapperSourceMap.set(targetWrapper, safeUrl);
          if (textarea instanceof HTMLTextAreaElement) {
            const sourceText = buildCommentSourceText(safeUrl);
            const result2 = insertSourceIntoCommentTextarea(textarea, sourceText);
            console2.log("[Aru Source Captioner] file: auto insertion result =", result2);
          } else {
            console2.log("[Aru Source Captioner] file: source stored, but no textarea found for auto insert");
          }
        }
        __name(onFileChange, "onFileChange");
        fileInput.addEventListener("change", onFileChange);
        resources.own(() => {
          ++selection.revision;
          fileInput.removeEventListener("change", onFileChange);
        });
        console2.log("[Aru Source Captioner] file: hooked file input change");
        return true;
      }
      __name(hookCommentFileInput, "hookCommentFileInput");
      function setupCommentSourceCaptioner(config = void 0) {
        if (!effectGate.allows()) {
          return;
        }
        if (!isReadPage()) {
          return;
        }
        const effectiveConfig = config || readPageConfig;
        const wrappers = findCommentInputWrappers();
        let hookedFileInputs = 0;
        for (const wrapper of wrappers) {
          if (effectiveConfig && hookCommentFileInput(wrapper, effectiveConfig)) {
            hookedFileInputs++;
          }
        }
        if (wrappers.length === 0) {
          console2.log("[Aru Source Captioner] setup: no comment wrapper found yet (may load later)");
        } else if (hookedFileInputs > 0) {
          console2.log(`[Aru Source Captioner] setup: hooked ${hookedFileInputs} new file inputs (auto-insert mode)`);
        }
      }
      __name(setupCommentSourceCaptioner, "setupCommentSourceCaptioner");
      let commentObserver = null;
      let commentObserverScheduled = false;
      function scheduleCommentSetup() {
        if (commentObserverScheduled) {
          return;
        }
        commentObserverScheduled = true;
        Promise.resolve().then(() => {
          commentObserverScheduled = false;
          try {
            setupCommentSourceCaptioner();
          } catch (err) {
            console2.debug("[Aru Source Captioner] comment setup failed:", "COMMENT_SETUP_FAILED");
          }
        });
      }
      __name(scheduleCommentSetup, "scheduleCommentSetup");
      function startCommentObserver() {
        if (!effectGate.allows()) {
          return;
        }
        if (!isReadPage()) {
          return null;
        }
        if (commentObserver) {
          return commentObserver;
        }
        commentObserver = new MutationObserver((mutations) => {
          for (const mut of mutations) {
            if (mut.type !== "childList") {
              continue;
            }
            if (mut.addedNodes && mut.addedNodes.length > 0) {
              scheduleCommentSetup();
              return;
            }
          }
        });
        if (document.body) {
          commentObserver.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
        let attempts = 0;
        const maxAttempts = 30;
        const pollIntervalId = setInterval(() => {
          attempts++;
          try {
            setupCommentSourceCaptioner();
          } catch (err) {
            console2.debug("[Aru Source Captioner] poll setup failed:", "COMMENT_POLL_FAILED");
          }
          if (attempts >= maxAttempts) {
            clearInterval(pollIntervalId);
            console2.log("[Aru Source Captioner] poll: stopping after 15s (MutationObserver continues)");
          }
        }, 500);
        console2.log("[Aru Source Captioner] observer: started (polling 15s + MutationObserver)");
        return commentObserver;
      }
      __name(startCommentObserver, "startCommentObserver");
      const RULIWEB_AI_BLIND_SELECTOR = "#board_read.ai_blind";
      const RULIWEB_BOARD_MAIN_VIEW_PRIMARY = "#board_read.ai_blind .board_main_view";
      const RULIWEB_BOARD_MAIN_VIEW_FALLBACK = "#board_read .board_main_view";
      const RULIWEB_UNSAFE_CLICK_SELECTOR = "a, button, input, textarea, select, iframe";
      const RULIWEB_REVEAL_RETRY_DELAYS_MS = [300, 800, 1500];
      const RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS = 5e3;
      function isRuliwebReadPage() {
        return isReadPage();
      }
      __name(isRuliwebReadPage, "isRuliwebReadPage");
      function hasRuliwebAiBlind() {
        return !!document.querySelector(RULIWEB_AI_BLIND_SELECTOR);
      }
      __name(hasRuliwebAiBlind, "hasRuliwebAiBlind");
      function _findBoardMainView() {
        return document.querySelector(RULIWEB_BOARD_MAIN_VIEW_PRIMARY) || document.querySelector(RULIWEB_BOARD_MAIN_VIEW_FALLBACK);
      }
      __name(_findBoardMainView, "_findBoardMainView");
      function getPseudoElementContent(el, pseudo) {
        try {
          const raw = window.getComputedStyle(el, pseudo).getPropertyValue("content");
          if (!raw || raw === "none" || raw === "normal" || raw === '""') {
            return "";
          }
          return raw.replace(/^["']|["']$/g, "").replace(/\\A/g, " ").replace(/\s+/g, " ").trim();
        } catch {
          return "";
        }
      }
      __name(getPseudoElementContent, "getPseudoElementContent");
      function getRuliwebRevealOverlayText() {
        const candidates = [
          document.querySelector("#board_read.ai_blind .board_main_view"),
          document.querySelector("#board_read .board_main_view"),
          document.querySelector(".board_main_view")
        ].filter(Boolean);
        const parts = [];
        for (const el of candidates) {
          const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
          if (text) {
            parts.push(text);
          }
          const before = getPseudoElementContent(el, "::before");
          if (before) {
            parts.push(before);
          }
          const after = getPseudoElementContent(el, "::after");
          if (after) {
            parts.push(after);
          }
        }
        return parts.join(" ").replace(/\s+/g, " ").trim();
      }
      __name(getRuliwebRevealOverlayText, "getRuliwebRevealOverlayText");
      function normalizeRuliwebOverlayText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
      }
      __name(normalizeRuliwebOverlayText, "normalizeRuliwebOverlayText");
      function normalizeKeyword(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
      }
      __name(normalizeKeyword, "normalizeKeyword");
      function normalizeKeywordList(keywords) {
        if (!Array.isArray(keywords)) {
          return typeof keywords === "string" && keywords.trim() ? [normalizeKeyword(keywords)] : [];
        }
        return keywords.map(normalizeKeyword).filter(Boolean);
      }
      __name(normalizeKeywordList, "normalizeKeywordList");
      function hasKeyword(text, keywords) {
        const normalizedText = normalizeRuliwebOverlayText(text);
        return normalizeKeywordList(keywords).some((keyword) => keyword && normalizedText.includes(keyword));
      }
      __name(hasKeyword, "hasKeyword");
      function shouldOpenRuliwebOverlayByKeywords(overlayText, config) {
        const allowKeywords = config && config.ruliwebAiRevealAllowKeywords || DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
        const blockKeywords = config && config.ruliwebAiRevealBlockKeywords || DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
        const blocked = hasKeyword(overlayText, blockKeywords);
        const allowed = hasKeyword(overlayText, allowKeywords);
        return { shouldOpen: allowed && !blocked, allowed, blocked };
      }
      __name(shouldOpenRuliwebOverlayByKeywords, "shouldOpenRuliwebOverlayByKeywords");
      function _dispatchPointerMouseSequence(el, x, y) {
        const hasPointerEvent = typeof PointerEvent === "function";
        const mkMouse = /* @__PURE__ */ __name((type) => new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y
        }), "mkMouse");
        const mkPointer = /* @__PURE__ */ __name((type) => new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true
        }), "mkPointer");
        if (hasPointerEvent) {
          el.dispatchEvent(mkPointer("pointerdown"));
        }
        el.dispatchEvent(mkMouse("mousedown"));
        if (hasPointerEvent) {
          el.dispatchEvent(mkPointer("pointerup"));
        }
        el.dispatchEvent(mkMouse("mouseup"));
        el.dispatchEvent(mkMouse("click"));
      }
      __name(_dispatchPointerMouseSequence, "_dispatchPointerMouseSequence");
      function _tryRuliwebOverlayClickOnce(config) {
        const boardMainView = _findBoardMainView();
        if (!boardMainView) {
          console2.debug("[Aru][reveal] .board_main_view not found");
          return false;
        }
        const overlayText = getRuliwebRevealOverlayText();
        const { shouldOpen, allowed, blocked } = shouldOpenRuliwebOverlayByKeywords(overlayText, config);
        const _allowKeywords = config && config.ruliwebAiRevealAllowKeywords || DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
        const _blockKeywords = config && config.ruliwebAiRevealBlockKeywords || DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
        console2.info("[Aru][reveal] overlay keyword decision", {
          allowed,
          blocked,
          shouldOpen
        });
        if (!shouldOpen) {
          if (blocked) {
            console2.info("[Aru][reveal] skip overlay: blocked keyword matched");
          } else {
            console2.info("[Aru][reveal] skip overlay: no allow keyword matched");
          }
          return false;
        }
        const rect = boardMainView.getBoundingClientRect();
        const cx = Math.round(rect.left + rect.width / 2);
        const cy = Math.round(rect.top + Math.min(rect.height * 0.45, 260));
        const pointEl = document.elementFromPoint(cx, cy);
        if (!pointEl) {
          console2.debug("[Aru][reveal] elementFromPoint returned null", {
            cx,
            cy
          });
          return false;
        }
        const unsafe = pointEl.closest(RULIWEB_UNSAFE_CLICK_SELECTOR);
        if (unsafe) {
          console2.warn("[Aru][reveal] click aborted — unsafe element at overlay center");
          return false;
        }
        console2.log("[Aru][reveal] overlay click target");
        const hrefBefore = location.href;
        _dispatchPointerMouseSequence(pointEl, cx, cy);
        setTimeout(() => {
          if (location.href !== hrefBefore) {
            console2.error("[Aru][reveal] URL changed after overlay click", "REVEAL_NAVIGATION_CHANGED");
          }
          const hasAiBlind = hasRuliwebAiBlind();
          const imgCount = document.querySelectorAll(".view_content img").length;
          const viewContent = document.querySelector(".view_content");
          const textLength = viewContent ? (viewContent.textContent || "").length : 0;
          console2.log("[Aru][reveal] after overlay click", {
            hasAiBlind,
            imgCount,
            textLength
          });
        }, 300);
        return true;
      }
      __name(_tryRuliwebOverlayClickOnce, "_tryRuliwebOverlayClickOnce");
      function _setupRuliwebClickWithRetry(config) {
        let done = false;
        function attempt() {
          if (done) {
            return;
          }
          if (_tryRuliwebOverlayClickOnce(config)) {
            done = true;
          }
        }
        __name(attempt, "attempt");
        attempt();
        if (done) {
          return;
        }
        RULIWEB_REVEAL_RETRY_DELAYS_MS.forEach((delay) => {
          setTimeout(attempt, delay);
        });
        const obs = new MutationObserver(() => {
          if (done) {
            obs.disconnect();
            return;
          }
          attempt();
          if (done) {
            obs.disconnect();
          }
        });
        obs.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          done = true;
          obs.disconnect();
        }, RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS);
      }
      __name(_setupRuliwebClickWithRetry, "_setupRuliwebClickWithRetry");
      function restoreRuliwebMetaDescription() {
        const meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          console2.debug("[Aru][reveal] text_fallback: no meta description found");
          return false;
        }
        const text = (meta.content || "").trim();
        if (!text) {
          console2.debug("[Aru][reveal] text_fallback: meta description is empty");
          return false;
        }
        const viewContent = document.querySelector(".view_content");
        if (!viewContent) {
          console2.debug("[Aru][reveal] text_fallback: .view_content not found");
          return false;
        }
        const p = document.createElement("p");
        p.textContent = text;
        p.dataset.aruMetaFallback = "1";
        viewContent.prepend(p);
        console2.info("[Aru][reveal] text_fallback: meta description prepended (images not restored)");
        return true;
      }
      __name(restoreRuliwebMetaDescription, "restoreRuliwebMetaDescription");
      function setupRuliwebAiReveal(config) {
        const mode = config.ruliwebAiRevealMode ?? "off";
        console2.log("[Aru][reveal] setup", {
          isRead: isRuliwebReadPage(),
          hasBoardRead: !!document.querySelector("#board_read"),
          hasAiBlind: hasRuliwebAiBlind(),
          hasBoardMainView: !!_findBoardMainView()
        });
        if (mode === "off") {
          return;
        }
        if (!isRuliwebReadPage()) {
          return;
        }
        if (mode === "click_overlay") {
          _setupRuliwebClickWithRetry(config);
          return;
        }
        if (mode === "text_fallback") {
          restoreRuliwebMetaDescription();
          return;
        }
      }
      __name(setupRuliwebAiReveal, "setupRuliwebAiReveal");
      async function init() {
        console2.info("[Aru Source Captioner] content loaded", {
          exifrAvailable: typeof exifr !== "undefined"
        });
        const config = await loadConfig();
        if (!effectGate.allows()) {
          return;
        }
        if (!config.enabled) {
          console2.info("[Aru Source Captioner] disabled — skipping content script");
          return;
        }
        if (isReadPage()) {
          readPageConfig = config;
          setupCommentSourceCaptioner(config);
          startCommentObserver();
          setupRuliwebAiReveal(config);
          console2.info("[Aru Source Captioner] read page active — comment source button enabled", {
            strictAllowlist: config.strictAllowlist === true,
            allowHttp: config.allowHttp === true
          });
          return;
        }
        if (typeof exifr === "undefined") {
          console2.warn("[Aru Source Captioner] exifr not loaded — running in filename-only fallback mode");
        }
        attachFileInputListeners(config);
        startEditorObserver(config);
        console2.info("[Aru Source Captioner] auto-insert mode active — file selection triggers caption insertion", {
          strictAllowlist: config.strictAllowlist === true,
          allowHttp: config.allowHttp === true,
          mobile: isMobileAutoInsertEnvironment()
        });
      }
      __name(init, "init");
      init().catch((_err) => {
        console2.warn("[Aru Source Captioner] init failed:", "CONTENT_INIT_FAILED");
      });
    }, "bootstrap");
    runBootstrap1();
    return {};
  }
  __name(installFirefoxContent, "installFirefoxContent");

  // docs/source/compat/platform-firefox-content.mjs
  var attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
  var result = installFirefoxContent({ environment: globalThis, dependencies: { attribution: { "Controller": /* @__PURE__ */ __name(() => attribution["Controller"], "Controller") } } });
})();
