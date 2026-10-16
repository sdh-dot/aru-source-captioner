// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) scope[name] = resolvers[name]?.();
      else Object.defineProperty(scope, name, { enumerable: true, get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get") });
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/ruliweb-icons/ui-preferences.mjs
  function createIconsUiPreferences({ environment = globalThis, dependencies = {} } = {}) {
    const { chrome, browser } = environment;
    let icons2 = createModuleScope(dependencies.icons, ["createUiPreferences", "UiPreferences"], ["createUiPreferences", "UiPreferences"]);
    const initializeIconsUiPreferences = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const A = icons2 = icons2 || {}, key = "aruIconsPickerUiV1";
      const defaults = Object.freeze({ modalSize: "default", iconSize: "normal", previewVisible: true });
      function sanitize(value) {
        const v = value && typeof value === "object" ? value : {};
        return {
          modalSize: ["default", "wide", "max"].includes(v.modalSize) ? v.modalSize : "default",
          iconSize: ["small", "normal", "large"].includes(v.iconSize) ? v.iconSize : "normal",
          previewVisible: typeof v.previewVisible === "boolean" ? v.previewVisible : true
        };
      }
      __name(sanitize, "sanitize");
      function create({ api = g.browser || g.chrome, promiseApi = !!g.browser } = {}) {
        let writes = Promise.resolve();
        function invoke(method, args) {
          const storage = api?.storage?.local;
          if (typeof storage?.[method] !== "function") return Promise.reject(Error("Local storage unavailable"));
          if (promiseApi) {
            try {
              return Promise.resolve(storage[method](...args));
            } catch (error) {
              return Promise.reject(error);
            }
          }
          return new Promise((resolve, reject) => {
            try {
              storage[method](...args, (result2) => {
                const error = api.runtime?.lastError;
                if (error) reject(Error(error.message || "Storage failed"));
                else resolve(result2);
              });
            } catch (error) {
              reject(error);
            }
          });
        }
        __name(invoke, "invoke");
        return Object.freeze({
          key,
          defaults,
          sanitize,
          read: /* @__PURE__ */ __name(async () => sanitize((await invoke("get", [[key]]))?.[key]), "read"),
          write: /* @__PURE__ */ __name((value) => {
            const next = { schemaVersion: 1, ...sanitize(value) };
            const pending = writes.catch(() => {
            }).then(() => invoke("set", [{ [key]: next }]));
            writes = pending;
            return pending;
          }, "write")
        });
      }
      __name(create, "create");
      A.createUiPreferences = create;
      A.UiPreferences = create();
    }, "initializeIconsUiPreferences");
    initializeIconsUiPreferences(environment);
    return { "icons": selectModuleExports(icons2, ["createUiPreferences", "UiPreferences"]) };
  }
  __name(createIconsUiPreferences, "createIconsUiPreferences");

  // docs/source/compat/ruliweb-icons-ui-preferences.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var result = createIconsUiPreferences({ environment: globalThis, dependencies: { icons: { "createUiPreferences": /* @__PURE__ */ __name(() => icons["createUiPreferences"], "createUiPreferences"), "UiPreferences": /* @__PURE__ */ __name(() => icons["UiPreferences"], "UiPreferences") } } });
  Object.assign(icons, result.icons);
})();
