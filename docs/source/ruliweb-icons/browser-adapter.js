// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/context-effect-gate.mjs
  var gates = /* @__PURE__ */ new WeakMap();
  var sharedGateKey = /* @__PURE__ */ Symbol.for("aru.context-effect-gate.v1");
  var sessionGateKey = /* @__PURE__ */ Symbol.for("aru.effect-session-gate.v1");
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
          console.warn("[Aru] 컨텍스트 종료 정리 실패", error);
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
      const finish = /* @__PURE__ */ __name((result) => {
        if (finished) {
          return;
        }
        finished = true;
        timer.clearTimeout(deadline);
        signal?.removeEventListener("abort", cancel);
        resolve(result);
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
    const cancel = /* @__PURE__ */ __name(() => controller.abort(), "cancel");
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
        const result = await readOnce(root, keys, timer, controller.signal);
        result.attempts = attempt;
        if (result.state === "invalidated") {
          contextEffectGate(root).invalidate();
        }
        if (controller.signal.aborted) {
          return {
            state: "cancelled",
            attempts: attempt,
            error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다.")
          };
        }
        if (result.state !== "failed" || attempt === 3) {
          return result;
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

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // docs/source/ruliweb-icons/browser-adapter.mjs
  function createBrowserAdapter(root = defaultEnvironment) {
    const effectGate = contextEffectGate(root);
    const defaults = Object.freeze({
      enabled: false,
      autoLoad: true,
      preferredSort: "source",
      localOverlay: true
    });
    let promiseApi = false;
    let api;
    try {
      promiseApi = !!(root.browser?.runtime && root.browser.storage);
      api = promiseApi ? root.browser : root.chrome;
    } catch {
    }
    function failure2(code, message) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
    __name(failure2, "failure");
    const BYTE_MARKER = "$aruIconsBytesV1";
    function carrierBytes(value, encode) {
      let nodes = 0;
      const seen = /* @__PURE__ */ new Set();
      const invalid = /* @__PURE__ */ __name(() => failure2("INVALID_REQUEST", "메타데이터 원본 바이트를 캐시에 전달할 수 없습니다."), "invalid");
      function visit(item, depth) {
        if (++nodes > 1e6 || depth > 20) {
          throw invalid();
        }
        if (!item || typeof item !== "object") {
          return item;
        }
        if (ArrayBuffer.isView(item)) {
          if (Object.prototype.toString.call(item) !== "[object Uint8Array]" || item.byteLength > 1048576) {
            throw invalid();
          }
          if (!encode) {
            return new Uint8Array(item);
          }
          const parts = [];
          for (let i = 0; i < item.length; i += 8192) {
            parts.push(String.fromCharCode(...item.subarray(i, i + 8192)));
          }
          return {
            [BYTE_MARKER]: root.btoa(parts.join("")),
            byteLength: item.byteLength
          };
        }
        if (seen.has(item)) {
          throw invalid();
        }
        seen.add(item);
        if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
          if (encode || Object.keys(item).length !== 2 || !Object.prototype.hasOwnProperty.call(item, "byteLength")) {
            throw invalid();
          }
          const text = item[BYTE_MARKER], length = item.byteLength;
          if (typeof text !== "string" || text.length > 1398104 || !Number.isInteger(length) || length < 0 || length > 1048576 || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length / 4 * 3 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !== length) {
            throw invalid();
          }
          let binary;
          try {
            binary = root.atob(text);
          } catch (_) {
            throw invalid();
          }
          if (binary.length !== length || root.btoa(binary) !== text) {
            throw invalid();
          }
          return Uint8Array.from(binary, (char) => char.charCodeAt(0));
        }
        let result;
        if (Array.isArray(item)) {
          if (item.length > 1e4) {
            throw invalid();
          }
          result = item.map((child) => visit(child, depth + 1));
        } else {
          result = Object.fromEntries(Object.entries(item).map(([key, child]) => [
            key,
            visit(child, depth + 1)
          ]));
        }
        seen.delete(item);
        return result;
      }
      __name(visit, "visit");
      return visit(value, 0);
    }
    __name(carrierBytes, "carrierBytes");
    function invoke(target, method, args) {
      try {
        effectGate.assert();
        if (!api || !target || typeof target[method] !== "function") {
          throw failure2("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다.");
        }
        const pending = promiseApi ? Promise.resolve(target[method](...args)) : new Promise((resolve, reject) => {
          target[method](...args, (value) => {
            try {
              effectGate.assert();
              const error = api.runtime?.lastError;
              if (error) {
                reject(failure2("API_ERROR", error.message || "확장 프로그램 API 요청에 실패했습니다."));
              } else {
                resolve(value);
              }
            } catch (error) {
              effectGate.observeError(error);
              reject(error);
            }
          });
        });
        return pending.then((value) => {
          effectGate.assert();
          return value;
        }, (error) => {
          effectGate.observeError(error);
          throw error;
        });
      } catch (error) {
        effectGate.observeError(error);
        return Promise.reject(error);
      }
    }
    __name(invoke, "invoke");
    async function readOptions() {
      effectGate.assert();
      const result = await readSettings(root, ["enabled", "aruIconsOptions"]);
      if (result.state !== "success") {
        throw result.error;
      }
      effectGate.assert();
      const items = result.values;
      const supplied = items.aruIconsOptions;
      const iconOptions = Object.assign({}, defaults, supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied : {});
      const enabled = Object.prototype.hasOwnProperty.call(items, "enabled") ? items.enabled === true : true;
      return {
        enabled,
        aruIconsOptions: iconOptions,
        active: enabled && iconOptions.enabled === true
      };
    }
    __name(readOptions, "readOptions");
    function onChanged(callback, onPending) {
      let disposed = false;
      let revision = 0;
      const listener = /* @__PURE__ */ __name((changes, area) => {
        if (area !== "sync" || !changes.enabled && !changes.aruIconsOptions) {
          return;
        }
        const current = ++revision;
        onPending?.();
        readOptions().then((options) => {
          if (!disposed && current === revision) {
            callback(options);
          }
        }).catch(() => {
          if (!disposed && current === revision) {
            callback({
              enabled: false,
              aruIconsOptions: { ...defaults },
              active: false
            });
          }
        });
      }, "listener");
      const unsubscribe = subscribeSettings(root, listener);
      return () => {
        disposed = true;
        ++revision;
        unsubscribe?.();
      };
    }
    __name(onChanged, "onChanged");
    async function requestCache(action, payload) {
      if (!["get", "put", "invalidate", "info"].includes(action)) {
        throw failure2("INVALID_REQUEST", "지원하지 않는 캐시 요청입니다.");
      }
      if (!(await readOptions()).active) {
        throw failure2("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
      }
      let requestPayload = payload || {};
      if (action === "put" && Object.prototype.hasOwnProperty.call(requestPayload, "rawMetadata")) {
        requestPayload = {
          ...requestPayload,
          rawMetadata: carrierBytes(requestPayload.rawMetadata, true)
        };
      }
      const response = await invoke(api && api.runtime, "sendMessage", [
        { type: "ARU_ICONS_CACHE", action, payload: requestPayload }
      ]);
      if (!response || response.ok !== true) {
        const error = response && response.error;
        throw failure2(error && error.code || "CACHE_UNAVAILABLE", error && error.message || "아이콘 캐시 응답을 받지 못했습니다.");
      }
      if (action === "get" && response.result) {
        return {
          ...response.result,
          rawMetadata: carrierBytes(response.result.rawMetadata, false)
        };
      }
      return response.result;
    }
    __name(requestCache, "requestCache");
    return Object.freeze({ readOptions, onChanged, requestCache, defaults });
  }
  __name(createBrowserAdapter, "createBrowserAdapter");

  // docs/source/compat/browser-adapter.mjs
  (globalThis.AruIcons = globalThis.AruIcons || {}).BrowserAdapter = createBrowserAdapter(globalThis);
})();
