// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/performance/metrics.mjs
  function createPerformanceMetrics({ environment = globalThis } = {}) {
    const g = environment;
    const names = /* @__PURE__ */ new Set([
      "upload.discover",
      "upload.observer",
      "upload.reconcile",
      "upload.match",
      "upload.snapshot",
      "metadata.parse",
      "uploadUI.observer",
      "uploadUI.discover",
      "library.rebuild",
      "library.search",
      "reader.cache",
      "reader.network",
      "cache.hit",
      "cache.miss",
      "search.hit",
      "search.miss",
      "registry.records",
      "upload.candidates",
      "upload.roots",
      "library.rows",
      "library.cache"
    ]);
    const stats = /* @__PURE__ */ new Map(), windowSize = 512;
    let enabled = false, generation = 0;
    const clock2 = /* @__PURE__ */ __name(() => g.performance.now(), "clock");
    const row = /* @__PURE__ */ __name((name) => {
      if (!stats.has(name)) {
        stats.set(name, {
          count: 0,
          total: 0,
          max: 0,
          active: 0,
          peak: 0,
          samples: [],
          cursor: 0
        });
      }
      return stats.get(name);
    }, "row");
    const valid = /* @__PURE__ */ __name((name) => enabled && names.has(name), "valid");
    const api = {
      configure(options = {}) {
        enabled = options.enabled === true;
        generation++;
        for (const value of stats.values()) {
          value.active = 0;
        }
      },
      reset() {
        generation++;
        stats.clear();
      },
      start(name) {
        if (!valid(name)) {
          return;
        }
        const value = row(name), started = clock2(), epoch = generation;
        value.active++;
        value.peak = Math.max(value.peak, value.active);
        let finished = false;
        return () => {
          if (finished || epoch !== generation || !enabled) {
            return;
          }
          finished = true;
          const duration = Math.max(0, clock2() - started);
          value.active--;
          value.count++;
          value.total += duration;
          value.max = Math.max(value.max, duration);
          value.samples[value.cursor] = duration;
          value.cursor = (value.cursor + 1) % windowSize;
        };
      },
      count(name) {
        if (valid(name)) {
          row(name).count++;
        }
      },
      gauge(name, number) {
        if (valid(name) && Number.isFinite(number) && number >= 0) {
          const value = row(name);
          value.current = number;
          value.peak = Math.max(value.peak, number);
        }
      },
      snapshot() {
        const metrics = {};
        for (const [name, value] of stats) {
          const sorted = value.samples.slice().sort((a, b) => a - b), percentile = /* @__PURE__ */ __name((p) => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null, "percentile");
          metrics[name] = {
            calls: value.count,
            totalMs: value.total,
            meanMs: value.count ? value.total / value.count : 0,
            maxMs: value.max,
            p50Ms: percentile(0.5),
            p95Ms: percentile(0.95),
            sampleCount: sorted.length,
            active: value.active,
            peak: value.peak,
            ...value.current === void 0 ? {} : { current: value.current }
          };
        }
        return {
          enabled,
          windowSize,
          percentiles: "last 512 completed calls per metric; totals cover this reset interval",
          metrics
        };
      }
    };
    return Object.freeze(api);
  }
  __name(createPerformanceMetrics, "createPerformanceMetrics");

  // docs/source/compat/performance-api.mjs
  function getLegacyPerformanceMetrics(environment = globalThis) {
    return environment.AruPerformance ||= createPerformanceMetrics({ environment });
  }
  __name(getLegacyPerformanceMetrics, "getLegacyPerformanceMetrics");

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

  // docs/source/upload-attribution/ui.mjs
  var activeUi = /* @__PURE__ */ new WeakMap();
  function createAttributionUi({ environment = defaultEnvironment, dependencies = {}, metrics = null } = {}) {
    let icons2 = createModuleScope(dependencies.icons, ["DesignSystem"], []);
    let uploadUI2 = createModuleScope(dependencies.uploadUI, [], []);
    const initializeAttributionUi = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const D = icons2?.DesignSystem;
      class UploadUI {
        static {
          __name(this, "UploadUI");
        }
        constructor(doc = g.document) {
          this.doc = doc;
          this.records = /* @__PURE__ */ new Map();
          const style = doc.createElement("style");
          style.dataset.aruNativeUploadStyle = "";
          style.textContent = `[data-aru-native-upload]{position:relative!important;box-sizing:border-box!important;min-height:44px!important;min-width:110px!important;border:1px solid #C5A268!important;border-radius:7px!important;touch-action:manipulation}
      [data-aru-native-upload]:focus-visible{outline:3px solid #923F61!important;outline-offset:2px}
      [data-aru-native-upload]:disabled{opacity:.55}
      [data-aru-native-upload]>[data-aru-native-label]{position:absolute;inset:0;display:flex;border-radius:inherit;pointer-events:none}
      input[data-aru-native-file]{max-width:100%;min-height:44px;font:inherit}
      input[data-aru-native-file]::file-selector-button{min-height:44px;border:1px solid #C5A268;border-radius:7px;padding:8px 12px;font:inherit;background:#fff9f0;color:#642940}
      [data-aru-upload-status]{display:block;margin:6px 0;overflow-wrap:anywhere}
      [data-aru-upload-status][hidden]{display:none}
      @media(prefers-color-scheme:dark){input[data-aru-native-file]::file-selector-button{background:#261d24;color:#E5CFA7}}
      @media(forced-colors:active){[data-aru-native-upload]{border-color:ButtonText!important}[data-aru-native-upload]:focus-visible{outline-color:Highlight!important}}
      `;
          (doc.head || doc.documentElement).append(style);
          this.style = style;
          this.status = doc.createElement("div");
          this.status.dataset.aruUploadStatus = "";
          this.status.setAttribute("role", "status");
          this.status.setAttribute("aria-live", "polite");
          this.status.hidden = true;
          const statusShadow = this.status.attachShadow({ mode: "open" });
          this.statusLabel = doc.createElement("span");
          statusShadow.append(this.statusLabel);
          this.statusCleanup = D?.attach(statusShadow);
          const statusStyle = doc.createElement("style");
          statusStyle.textContent = ':host{color:var(--aru-deep-wine);font:13px/1.5 "Aru Pretendard",system-ui,sans-serif}';
          statusShadow.append(statusStyle);
          this.observer = new g.MutationObserver((mutations) => {
            metrics?.count("uploadUI.observer");
            const controlsChanged = mutations.some((mutation) => mutation.type === "childList" && [...mutation.addedNodes, ...mutation.removedNodes].some((node) => this.controlChanged(node)));
            if (controlsChanged) {
              this.discover();
            }
            if (controlsChanged || mutations.some((m) => m.type === "attributes")) {
              this.report();
            }
          });
          this.observer.observe(doc.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-aru-upload-diagnostic"]
          });
          this.discover();
          this.report();
        }
        controlChanged(node) {
          if (node.nodeType !== 1) {
            return false;
          }
          if (node.tagName === "LABEL" || node.tagName === "INPUT" && node.type === "file" || node.classList.contains("note-toolbar") || node.classList.contains("icon-camera") || node.getAttribute("contenteditable") === "true") {
            return true;
          }
          if (node.childElementCount > 0 && node.querySelector('.note-toolbar,.icon-camera,input[type="file"],label,[contenteditable="true"]')) {
            return true;
          }
          for (const [control, record] of this.records) {
            if (node === control || node === record.host || node.childElementCount > 0 && (node.contains(control) || node.contains(record.host))) {
              return true;
            }
          }
          return false;
        }
        decorate(control) {
          if (this.records.has(control) || !D || control.closest("#editor_tab_bar")) {
            return;
          }
          const previous = control.getAttribute("aria-label");
          control.dataset.aruNativeUpload = "";
          control.setAttribute("aria-label", "이미지 첨부");
          const host = this.doc.createElement("span");
          host.dataset.aruNativeLabel = "";
          host.setAttribute("aria-hidden", "true");
          const shadow = host.attachShadow({ mode: "open" });
          const label = this.doc.createElement("span");
          label.className = "label";
          label.textContent = "이미지 첨부";
          const image = D.assetImage(this.doc, "assets/icons/editor-upload-20.png", "upload", "aru-entry-icon");
          if (image) {
            label.prepend(image);
          }
          shadow.append(label);
          const cleanup = D.attach(shadow);
          const style = this.doc.createElement("style");
          style.textContent = ':host{width:100%;height:100%;pointer-events:none}.label{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;padding:6px 10px;border-radius:7px;background:var(--aru-surface);color:var(--aru-deep-wine);font:700 13px/1.4 "Aru Pretendard",system-ui,sans-serif}.aru-entry-icon{width:20px;height:20px;object-fit:contain;flex-shrink:0}svg{fill:none;stroke:currentColor;stroke-width:1.6}';
          shadow.append(style);
          control.append(host);
          this.records.set(control, { host, cleanup, previous });
        }
        discover() {
          const finish = metrics?.start("uploadUI.discover");
          try {
            for (const [control, record] of this.records) {
              if (!control.isConnected || !record.host.isConnected) {
                record.cleanup?.();
                record.host.remove();
                delete control.dataset.aruNativeUpload;
                if (record.previous === null) {
                  control.removeAttribute("aria-label");
                } else {
                  control.setAttribute("aria-label", record.previous);
                }
                this.records.delete(control);
              }
            }
            for (const icon of this.doc.querySelectorAll(".note-toolbar .icon-camera")) {
              const button = icon.closest("button");
              if (button) {
                this.decorate(button);
              }
            }
            for (const input of this.doc.querySelectorAll('input[type="file"]')) {
              if (input.closest(".common_write_wrapper")) {
                continue;
              }
              if (!/image|\.jpe?g|\.png|\.gif|\.webp/i.test(input.accept)) {
                continue;
              }
              const labels = [...input.labels || []];
              if (labels.length) {
                labels.forEach((label) => this.decorate(label));
              } else if (input.getClientRects().length) {
                input.dataset.aruNativeFile = "";
              }
            }
            const toolbar = this.doc.querySelector(".note-toolbar") || [...this.records.keys()][0]?.parentElement || this.doc.querySelector('input[type="file"]') || this.doc.querySelector('[contenteditable="true"]');
            if (toolbar && !this.status.isConnected) {
              if (toolbar === this.doc.body) {
                toolbar.append(this.status);
              } else {
                toolbar.after(this.status);
              }
            }
          } finally {
            finish?.();
          }
        }
        report() {
          let data;
          try {
            data = JSON.parse(this.doc.documentElement.dataset.aruUploadDiagnostic || "{}");
          } catch (_) {
            return;
          }
          const blocked = Object.entries(data.blocked || {}).filter(([state]) => !["waiting", "upload-pending", "media-loading"].includes(state)).reduce((sum, [, n]) => sum + n, 0);
          const text = data.state === "editor-unavailable" ? "이 작성기에서는 이미지와 출처의 대응을 확인할 수 없습니다. 출처를 직접 기재해 주세요." : data.state === "capacity" ? "이번 작성 세션의 출처 확인 한도에 도달했습니다. 이후 이미지의 출처는 직접 기재해 주세요." : blocked ? `이미지 ${blocked}개의 출처 대응을 확인하지 못해 자동 기재하지 않았습니다. 출처를 확인해 직접 기재해 주세요.` : "";
          if (this.statusLabel.textContent !== text) {
            this.statusLabel.textContent = text;
          }
          this.status.hidden = !text;
        }
        destroy() {
          this.observer.disconnect();
          this.style.remove();
          this.statusCleanup?.();
          this.status.remove();
          for (const [control, record] of this.records) {
            record.cleanup?.();
            record.host.remove();
            delete control.dataset.aruNativeUpload;
            if (record.previous === null) {
              control.removeAttribute("aria-label");
            } else {
              control.setAttribute("aria-label", record.previous);
            }
          }
          this.records.clear();
          for (const input of this.doc.querySelectorAll("[data-aru-native-file]")) {
            delete input.dataset.aruNativeFile;
          }
        }
      }
      uploadUI2 = UploadUI;
      if (!g.__aruUploadNoAutoStart && g.document && /^\/community\/board\/[^/]+\/(write|modify)(?:\/|$)/.test(g.location.pathname)) {
        const effectGate = contextEffectGate(g);
        activeUi.get(g.document)?.();
        if (!effectGate.allows()) {
          return;
        }
        let ui;
        let revision = 0;
        let disposed = false;
        let request;
        let unsubscribe;
        let detachGate;
        const pause = /* @__PURE__ */ __name(() => {
          ui?.destroy();
          ui = void 0;
        }, "pause");
        const changed = /* @__PURE__ */ __name((changes, area) => {
          if (area === "sync" && changes.enabled) {
            void refresh();
          }
        }, "changed");
        const refresh = /* @__PURE__ */ __name(async () => {
          if (!effectGate.allows()) {
            return;
          }
          const current = ++revision;
          request?.abort();
          request = new g.AbortController();
          pause();
          unsubscribe ??= subscribeSettings(g, changed);
          const result2 = await readSettings(g, ["enabled"], {
            signal: request.signal
          });
          if (disposed || current !== revision || result2.state !== "success" || !effectGate.allows()) {
            return;
          }
          unsubscribe ??= subscribeSettings(g, changed);
          if (result2.values.enabled !== false) {
            ui = new UploadUI();
          }
        }, "refresh");
        const dispose = /* @__PURE__ */ __name(() => {
          disposed = true;
          ++revision;
          request?.abort();
          pause();
          unsubscribe?.();
          detachGate?.();
          g.removeEventListener("pagehide", dispose);
          if (activeUi.get(g.document) === dispose) {
            activeUi.delete(g.document);
          }
        }, "dispose");
        activeUi.set(g.document, dispose);
        detachGate = effectGate.onStop(dispose);
        g.addEventListener("pagehide", dispose, { once: true });
        void refresh();
      }
    }, "initializeAttributionUi");
    initializeAttributionUi(environment);
    return { uploadUI: uploadUI2 };
  }
  __name(createAttributionUi, "createAttributionUi");

  // docs/source/compat/upload-attribution-ui.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var uploadUI = globalThis.AruUploadUI = globalThis.AruUploadUI || {};
  var result = createAttributionUi({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: {
    icons: { "DesignSystem": /* @__PURE__ */ __name(() => icons["DesignSystem"], "DesignSystem") },
    uploadUI: {}
  } });
  globalThis.AruUploadUI = result.uploadUI;
})();
