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

  // docs/source/bundle-generator/client.mjs
  function createBundleClient({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const effectGate = contextEffectGate(environment);
    const { TextEncoder } = environment;
    let bundle2 = createModuleScope(dependencies.bundle, ["fail", "Draft"], ["Client", "Browser"]);
    const initializeBundleClient = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle2;
      class Client {
        static {
          __name(this, "Client");
        }
        constructor(doc) {
          this.doc = doc;
          this.pending = /* @__PURE__ */ new Map();
          this.closed = false;
          this.receive = (e) => {
            if (e.target !== doc || typeof e.detail !== "string" || e.detail.length > 2 * 1024 * 1024) {
              return;
            }
            let p;
            try {
              p = JSON.parse(e.detail);
            } catch (_) {
              return;
            }
            const r = this.pending.get(p.requestId);
            if (!r) {
              return;
            }
            g.clearTimeout(r.timer);
            this.pending.delete(p.requestId);
            if (!effectGate.allows()) {
              r.reject(new Error("효과 세션이 종료되었습니다."));
            } else if (p.ok) {
              r.resolve(p.result);
            } else {
              r.reject(Object.assign(new Error(p.error?.message || "생성기 연결 오류"), {
                code: p.error?.code
              }));
            }
          };
          doc.addEventListener("aru-bundle-response-v1", this.receive);
          effectGate.onStop(() => this.destroy());
        }
        request(op, data = {}) {
          try {
            effectGate.assert();
          } catch (error) {
            return Promise.reject(error);
          }
          if (this.closed) {
            return Promise.reject(new Error("생성기가 종료되었습니다."));
          }
          return new Promise((resolve, reject) => {
            const requestId = g.crypto.randomUUID().replaceAll("-", ""), detail = JSON.stringify({ ...data, op, requestId });
            if (detail.length > 2 * 1024 * 1024) {
              reject(Object.assign(new Error("요청 크기가 2MB 상한을 넘었습니다."), {
                code: "RESOURCE_LIMIT"
              }));
              return;
            }
            const timer = g.setTimeout(() => {
              this.pending.delete(requestId);
              reject(Object.assign(new Error("에디터 연결 응답을 확인하지 못했습니다."), { code: "BRIDGE_TIMEOUT" }));
            }, 15e3);
            this.pending.set(requestId, { resolve, reject, timer });
            this.doc.dispatchEvent(new g.CustomEvent("aru-bundle-request-v1", { detail }));
          });
        }
        destroy() {
          this.closed = true;
          this.doc.removeEventListener("aru-bundle-response-v1", this.receive);
          for (const r of this.pending.values()) {
            g.clearTimeout(r.timer);
            r.reject(new Error("생성기가 종료되었습니다."));
          }
          this.pending.clear();
        }
      }
      const api = g.browser || g.chrome, KEY = "aruBundleDraftV1";
      async function storage(area, method, arg) {
        effectGate.assert();
        if (!api?.storage?.[area]) {
          throw new Error("확장 저장소에 접근할 수 없습니다.");
        }
        if (g.browser) {
          const value2 = await api.storage[area][method](arg);
          effectGate.assert();
          return value2;
        }
        const value = await new Promise((resolve, reject) => api.storage[area][method](arg, (r) => api.runtime?.lastError ? reject(new Error(api.runtime.lastError.message)) : resolve(r)));
        effectGate.assert();
        return value;
      }
      __name(storage, "storage");
      const Browser = {
        async active() {
          try {
            const v = await storage("sync", "get", [
              "enabled",
              "aruIconsOptions"
            ]);
            return v.enabled !== false && v.aruIconsOptions?.enabled === true;
          } catch (_) {
            return false;
          }
        },
        subscribe(fn) {
          const listener = /* @__PURE__ */ __name((c, a) => {
            if (a === "sync" && (c.enabled || c.aruIconsOptions)) {
              fn();
            }
          }, "listener");
          api?.storage?.onChanged?.addListener(listener);
          return () => api?.storage?.onChanged?.removeListener(listener);
        },
        async saveDraft(draft) {
          const data = draft.snapshot();
          if (new TextEncoder().encode(JSON.stringify(data)).length > 2 * 1024 * 1024) {
            B.fail("RESOURCE_LIMIT", "저장할 초안이 2MB 상한을 넘었습니다.");
          }
          await storage("local", "set", { [KEY]: data });
        },
        async loadDraft() {
          const r = await storage("local", "get", KEY);
          if (!r[KEY]) {
            B.fail("DRAFT_EMPTY", "저장한 생성기 초안이 없습니다.");
          }
          return B.Draft.restore(r[KEY]);
        }
      };
      Object.assign(B, { Client, Browser });
    }, "initializeBundleClient");
    initializeBundleClient(environment);
    return { bundle: selectModuleExports(bundle2, ["Client", "Browser"]) };
  }
  __name(createBundleClient, "createBundleClient");

  // docs/source/compat/bundle-generator-client.mjs
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var result = createBundleClient({ environment: globalThis, dependencies: { bundle: { "fail": /* @__PURE__ */ __name(() => bundle["fail"], "fail"), "Draft": /* @__PURE__ */ __name(() => bundle["Draft"], "Draft") } } });
  Object.assign(bundle, result.bundle);
})();
