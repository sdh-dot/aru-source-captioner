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
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/body-download/browser-api.mjs
  function createDownloadBrowserApi({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const effectGate = contextEffectGate(environment);
    let downloads2 = createModuleScope(dependencies.downloads, ["error", "JOB_KEY"], ["api", "call", "options", "readJob", "writeJob", "ownsDownload"]);
    const initializeDownloadBrowserApi = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const D = downloads2, promise = !!root.browser?.runtime, api = promise ? root.browser : root.chrome;
      function invoke(target, method, ...args) {
        if (!target || typeof target[method] !== "function") {
          return Promise.reject(D.error("API_UNAVAILABLE", "브라우저 기능을 사용할 수 없습니다: " + method));
        }
        if (promise) {
          try {
            return Promise.resolve(target[method](...args));
          } catch (err) {
            return Promise.reject(err);
          }
        }
        return new Promise((resolve, reject) => {
          try {
            target[method](...args, (value) => {
              try {
                effectGate.assert();
                const err = api.runtime.lastError;
                if (err) {
                  reject(D.error("BROWSER_API", err.message));
                } else {
                  resolve(value);
                }
              } catch (error) {
                effectGate.observeError(error);
                reject(error);
              }
            });
          } catch (err) {
            reject(err);
          }
        });
      }
      __name(invoke, "invoke");
      function call(target, method, ...args) {
        try {
          effectGate.assert();
          return invoke(target, method, ...args).then((value) => {
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
      __name(call, "call");
      async function options() {
        const value = await call(api.storage.sync, "get", [
          "enabled",
          "aruBodyDownloadOptions"
        ]);
        return (value.enabled === void 0 || value.enabled === true) && value.aruBodyDownloadOptions?.enabled === true;
      }
      __name(options, "options");
      async function readJob(id) {
        const stored = await call(api.storage.local, "get", [
          D.JOB_KEY,
          "aruBodyDownloadErrorV1"
        ]);
        const current = stored[D.JOB_KEY] || null;
        return id && current?.id !== id ? stored.aruBodyDownloadErrorV1 || null : current;
      }
      __name(readJob, "readJob");
      async function writeJob(job) {
        await call(api.storage.local, "set", { [D.JOB_KEY]: job });
      }
      __name(writeJob, "writeJob");
      function own(item) {
        const base = api?.runtime?.getURL?.("");
        return !!base && typeof item.url === "string" && item.url.startsWith("blob:" + base);
      }
      __name(own, "own");
      Object.assign(D, {
        api,
        call,
        options,
        readJob,
        writeJob,
        ownsDownload: own
      });
    }, "initializeDownloadBrowserApi");
    initializeDownloadBrowserApi(environment);
    return {
      downloads: selectModuleExports(downloads2, [
        "api",
        "call",
        "options",
        "readJob",
        "writeJob",
        "ownsDownload"
      ])
    };
  }
  __name(createDownloadBrowserApi, "createDownloadBrowserApi");

  // docs/source/compat/body-download-browser-api.mjs
  var downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
  var result = createDownloadBrowserApi({ environment: globalThis, dependencies: { downloads: { "error": /* @__PURE__ */ __name(() => downloads["error"], "error"), "JOB_KEY": /* @__PURE__ */ __name(() => downloads["JOB_KEY"], "JOB_KEY") } } });
  Object.assign(downloads, result.downloads);
})();
