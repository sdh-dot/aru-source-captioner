// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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

  // docs/source/runtime/session-resources.mjs
  var draftKey = /* @__PURE__ */ Symbol.for("aru.effect-session-drafts.v1");
  function sessionDrafts(environment, namespace = "metadata") {
    const store = Reflect.get(environment, draftKey);
    if (!store) {
      return void 0;
    }
    let drafts = store.get(namespace);
    if (!drafts) {
      store.set(namespace, drafts = /* @__PURE__ */ new Map());
    }
    return drafts;
  }
  __name(sessionDrafts, "sessionDrafts");

  // docs/source/bundle-generator/controller.mjs
  function createBundleController({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const effectGate = contextEffectGate(environment);
    let bundle2 = createModuleScope(dependencies.bundle, ["Browser", "Client", "Panel"], ["Controller"]);
    let icons2 = createModuleScope(dependencies.icons, ["DesignSystem"], []);
    const initializeBundleController = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle2;
      class Controller {
        static {
          __name(this, "Controller");
        }
        constructor({ document = g.document, browser = B.Browser } = {}) {
          this.doc = document;
          this.browser = browser;
          this.client = new B.Client(document);
          this.entries = /* @__PURE__ */ new Map();
          this.active = false;
          this.disposed = false;
          this.generation = 0;
        }
        async start() {
          this.unsubscribe = this.browser.subscribe(() => this.options());
          await this.options();
        }
        async options() {
          const n = ++this.generation, active = await this.browser.active();
          if (this.disposed || n !== this.generation || active === this.active) {
            return;
          }
          this.active = active;
          if (active) {
            this.enable();
          } else {
            this.disable();
          }
        }
        enable() {
          this.observer = new g.MutationObserver((records) => {
            if (records.some((r) => [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 && (n.matches("#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite") || n.querySelector("#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite"))))) {
              g.clearTimeout(this.timer);
              this.timer = g.setTimeout(() => this.discover(), 160);
            }
          });
          this.observer.observe(this.doc.body, {
            childList: true,
            subtree: true
          });
          this.discover();
        }
        discover() {
          if (!this.active) {
            return;
          }
          for (const [root, r] of this.entries) {
            if (!root.isConnected || root.querySelector(".note-editable") !== r.input || root.querySelector(".note-toolbar") !== r.toolbar || root.querySelector("#ReactSummernoteLite") !== r.source || !r.host.isConnected) {
              this.remove(root);
            }
          }
          for (const root of this.doc.querySelectorAll("#editor_v2 .seditor")) {
            if (this.entries.has(root)) {
              continue;
            }
            const input = root.querySelector('.note-editable[contenteditable="true"]'), source = root.querySelector("#ReactSummernoteLite"), toolbar = root.querySelector(".note-toolbar"), camera = toolbar?.querySelector(".icon-camera")?.closest("button");
            if (!input || !source || !camera) {
              continue;
            }
            const token = g.crypto.randomUUID().replaceAll("-", "");
            root.dataset.aruBundleTarget = token;
            const host = this.doc.createElement("span");
            host.dataset.aruBundleEntry = "";
            const shadow = host.attachShadow({ mode: "open" });
            shadow.innerHTML = '<style>:host{display:inline-block;margin:3px;vertical-align:middle}button{font:12px system-ui;padding:6px;border:1px solid #bea3df;border-radius:5px;background:#f3ebff;color:#52337b;cursor:pointer}button:focus-visible{outline:3px solid #b58ee6}</style><button type="button">아이콘 통합</button>';
            const uiCleanup = icons2?.DesignSystem?.entry(shadow, {
              label: "아이콘 통합",
              tooltip: "여러 아이콘 공유 게시글을 하나의 통합팩으로 구성합니다."
            });
            camera.after(host);
            const rec = {
              root,
              input,
              source,
              toolbar,
              token,
              host,
              uiCleanup,
              button: shadow.querySelector("button")
            };
            this.entries.set(root, rec);
            rec.button.onclick = () => this.open(rec);
          }
        }
        open(rec) {
          if (!this.active) {
            return;
          }
          if (this.panel) {
            this.panel.q(".name").focus();
            return;
          }
          if (this.doc.querySelector("[data-aru-metadata-panel],[data-aru-icons-picker]")) {
            rec.button.title = "다른 아루 편집 창을 닫고 통합팩 생성기를 열어 주세요.";
            return;
          }
          this.panel = new B.Panel({
            document: this.doc,
            client: this.client,
            token: rec.token,
            browser: this.browser,
            restoredDraft: sessionDrafts(g, "bundle")?.get(rec.root),
            onClose: /* @__PURE__ */ __name(() => {
              this.panel = null;
              if (effectGate.allows()) {
                sessionDrafts(g, "bundle")?.delete(rec.root);
              }
              if (rec.root.isConnected && effectGate.allows()) {
                rec.button.focus();
              }
            }, "onClose")
          });
        }
        remove(root) {
          const r = this.entries.get(root);
          if (!r) {
            return;
          }
          if (this.panel?.token === r.token) {
            this.panel.close();
          }
          r.uiCleanup?.();
          r.host.remove();
          if (root.dataset.aruBundleTarget === r.token) {
            delete root.dataset.aruBundleTarget;
          }
          this.entries.delete(root);
        }
        disable() {
          this.observer?.disconnect();
          g.clearTimeout(this.timer);
          this.panel?.close();
          for (const root of [...this.entries.keys()]) {
            this.remove(root);
          }
        }
        suspend() {
          const panel = this.panel;
          const rec = Array.from(this.entries.values()).find((entry) => entry.token === panel?.token);
          if (panel && rec) {
            sessionDrafts(g, "bundle")?.set(rec.root, {
              draft: panel.draft.snapshot(),
              url: panel.q(".url").value
            });
          }
          if (effectGate.documentGate?.allows()) {
            this.destroy();
          } else {
            this.disposed = true;
            this.active = false;
            ++this.generation;
            this.unsubscribe?.();
            this.observer?.disconnect();
            this.client.destroy();
            if (panel) {
              panel.closed = true;
              panel.reader.destroy();
              panel.search.destroy();
            }
          }
        }
        destroy() {
          this.disposed = true;
          this.active = false;
          ++this.generation;
          this.unsubscribe?.();
          this.disable();
          this.client.destroy();
        }
      }
      Object.assign(B, { Controller });
      if (!g.__aruBundleNoAutoStart && g.document && /^https:\/\/(bbs|m)\.ruliweb\.com\/community\/board\/98\/(write|modify)(?:\/|\?|$)/.test(g.location.href) && !g.__aruBundleController) {
        g.__aruBundleController = new Controller();
        g.__aruBundleController.start();
        g.addEventListener("pagehide", () => g.__aruBundleController?.destroy(), {
          once: true
        });
      }
    }, "initializeBundleController");
    initializeBundleController(environment);
    return { bundle: selectModuleExports(bundle2, ["Controller"]) };
  }
  __name(createBundleController, "createBundleController");

  // docs/source/compat/bundle-generator-controller.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var result = createBundleController({ environment: globalThis, dependencies: {
    bundle: { "Browser": /* @__PURE__ */ __name(() => bundle["Browser"], "Browser"), "Client": /* @__PURE__ */ __name(() => bundle["Client"], "Client"), "Panel": /* @__PURE__ */ __name(() => bundle["Panel"], "Panel") },
    icons: { "DesignSystem": /* @__PURE__ */ __name(() => icons["DesignSystem"], "DesignSystem") }
  } });
  Object.assign(bundle, result.bundle);
})();
