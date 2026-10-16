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

  // docs/source/body-download/browser-api.mjs
  function createDownloadBrowserApi({ environment = defaultEnvironment, dependencies = {} } = {}) {
    let downloads2 = createModuleScope(dependencies.downloads, ["error", "JOB_KEY"], ["api", "call", "options", "readJob", "writeJob", "ownsDownload"]);
    const initializeDownloadBrowserApi = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const D = downloads2, promise = !!root.browser?.runtime, api = promise ? root.browser : root.chrome;
      function call(target, method, ...args) {
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
              const err = api.runtime.lastError;
              if (err) {
                reject(D.error("BROWSER_API", err.message));
              } else {
                resolve(value);
              }
            });
          } catch (err) {
            reject(err);
          }
        });
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
