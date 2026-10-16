// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/ruliweb-icons/browser-adapter.mjs
  function createBrowserAdapter(root = globalThis) {
    const defaults = Object.freeze({ enabled: false, autoLoad: true, preferredSort: "source", localOverlay: true });
    const promiseApi = typeof root.browser !== "undefined" && root.browser.runtime && root.browser.storage;
    const api = promiseApi ? root.browser : root.chrome;
    function failure(code, message) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
    __name(failure, "failure");
    const BYTE_MARKER = "$aruIconsBytesV1";
    function carrierBytes(value, encode) {
      let nodes = 0;
      const seen = /* @__PURE__ */ new Set();
      const invalid = /* @__PURE__ */ __name(() => failure("INVALID_REQUEST", "메타데이터 원본 바이트를 캐시에 전달할 수 없습니다."), "invalid");
      function visit(item, depth) {
        if (++nodes > 1e6 || depth > 20) throw invalid();
        if (!item || typeof item !== "object") return item;
        if (ArrayBuffer.isView(item)) {
          if (Object.prototype.toString.call(item) !== "[object Uint8Array]" || item.byteLength > 1048576) throw invalid();
          if (!encode) return new Uint8Array(item);
          const parts = [];
          for (let i = 0; i < item.length; i += 8192) parts.push(String.fromCharCode(...item.subarray(i, i + 8192)));
          return { [BYTE_MARKER]: root.btoa(parts.join("")), byteLength: item.byteLength };
        }
        if (seen.has(item)) throw invalid();
        seen.add(item);
        if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
          if (encode || Object.keys(item).length !== 2 || !Object.prototype.hasOwnProperty.call(item, "byteLength")) throw invalid();
          const text = item[BYTE_MARKER], length = item.byteLength;
          if (typeof text !== "string" || text.length > 1398104 || !Number.isInteger(length) || length < 0 || length > 1048576 || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length / 4 * 3 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !== length) throw invalid();
          let binary;
          try {
            binary = root.atob(text);
          } catch (_) {
            throw invalid();
          }
          if (binary.length !== length || root.btoa(binary) !== text) throw invalid();
          return Uint8Array.from(binary, (char) => char.charCodeAt(0));
        }
        let result;
        if (Array.isArray(item)) {
          if (item.length > 1e4) throw invalid();
          result = item.map((child) => visit(child, depth + 1));
        } else result = Object.fromEntries(Object.entries(item).map(([key, child]) => [key, visit(child, depth + 1)]));
        seen.delete(item);
        return result;
      }
      __name(visit, "visit");
      return visit(value, 0);
    }
    __name(carrierBytes, "carrierBytes");
    function invoke(target, method, args) {
      if (!api || !target || typeof target[method] !== "function") {
        return Promise.reject(failure("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다."));
      }
      if (promiseApi) {
        try {
          return Promise.resolve(target[method](...args));
        } catch (error) {
          return Promise.reject(error);
        }
      }
      return new Promise((resolve, reject) => {
        try {
          target[method](...args, (value) => {
            const error = api.runtime && api.runtime.lastError;
            if (error) reject(failure("API_ERROR", error.message || "확장 프로그램 API 요청에 실패했습니다."));
            else resolve(value);
          });
        } catch (error) {
          reject(error);
        }
      });
    }
    __name(invoke, "invoke");
    async function readOptions() {
      const stored = await invoke(api && api.storage && api.storage.sync, "get", [["enabled", "aruIconsOptions"]]);
      const items = stored || {};
      const supplied = items.aruIconsOptions;
      const iconOptions = Object.assign(
        {},
        defaults,
        supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied : {}
      );
      const enabled = Object.prototype.hasOwnProperty.call(items, "enabled") ? items.enabled === true : true;
      return { enabled, aruIconsOptions: iconOptions, active: enabled && iconOptions.enabled === true };
    }
    __name(readOptions, "readOptions");
    function onChanged(callback) {
      if (!api || !api.storage || !api.storage.onChanged) return () => {
      };
      let disposed = false;
      let revision = 0;
      const listener = /* @__PURE__ */ __name((changes, area) => {
        if (area !== "sync" || !changes.enabled && !changes.aruIconsOptions) return;
        const current = ++revision;
        readOptions().then((options) => {
          if (!disposed && current === revision) callback(options);
        }).catch(() => {
          if (!disposed && current === revision) callback({ enabled: false, aruIconsOptions: { ...defaults }, active: false });
        });
      }, "listener");
      api.storage.onChanged.addListener(listener);
      return () => {
        disposed = true;
        ++revision;
        api.storage.onChanged.removeListener(listener);
      };
    }
    __name(onChanged, "onChanged");
    async function requestCache(action, payload) {
      if (!["get", "put", "invalidate", "info"].includes(action)) {
        throw failure("INVALID_REQUEST", "지원하지 않는 캐시 요청입니다.");
      }
      if (!(await readOptions()).active) throw failure("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
      let requestPayload = payload || {};
      if (action === "put" && Object.prototype.hasOwnProperty.call(requestPayload, "rawMetadata")) {
        requestPayload = { ...requestPayload, rawMetadata: carrierBytes(requestPayload.rawMetadata, true) };
      }
      const response = await invoke(api && api.runtime, "sendMessage", [{ type: "ARU_ICONS_CACHE", action, payload: requestPayload }]);
      if (!response || response.ok !== true) {
        const error = response && response.error;
        throw failure(error && error.code || "CACHE_UNAVAILABLE", error && error.message || "아이콘 캐시 응답을 받지 못했습니다.");
      }
      if (action === "get" && response.result) return { ...response.result, rawMetadata: carrierBytes(response.result.rawMetadata, false) };
      return response.result;
    }
    __name(requestCache, "requestCache");
    return Object.freeze({ readOptions, onChanged, requestCache, defaults });
  }
  __name(createBrowserAdapter, "createBrowserAdapter");

  // docs/source/compat/browser-adapter.mjs
  (globalThis.AruIcons = globalThis.AruIcons || {}).BrowserAdapter = createBrowserAdapter(globalThis);
})();
