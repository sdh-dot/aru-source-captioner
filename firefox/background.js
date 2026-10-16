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

  // docs/source/platform/firefox/background.mjs
  function installFirefoxBackground({ environment = globalThis, dependencies = {} } = {}) {
    const { chrome, console } = environment;
    let downloads2 = createModuleScope(dependencies.downloads, ["ownsDownload"], []);
    const DEFAULT_OPTIONS = Object.freeze({
      enabled: true,
      aruIconsOptions: { enabled: false, autoLoad: true },
      aruBodyDownloadOptions: { enabled: false },
      allowHttp: false,
      strictAllowlist: false,
      allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
      ruliwebAiRevealMode: "off",
      ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
      ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"]
    });
    function seedMissingOptions() {
      chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) {
          console.warn("[Aru Source Captioner] storage.get failed:", chrome.runtime.lastError.message);
          return;
        }
        const updates = {};
        for (const key of Object.keys(DEFAULT_OPTIONS)) {
          if (!(key in items)) {
            updates[key] = DEFAULT_OPTIONS[key];
          }
        }
        if (Object.keys(updates).length === 0) {
          return;
        }
        chrome.storage.sync.set(updates, () => {
          if (chrome.runtime.lastError) {
            console.warn("[Aru Source Captioner] storage.set failed:", chrome.runtime.lastError.message);
            return;
          }
          console.info("[Aru Source Captioner] seeded missing default options:", Object.keys(updates));
        });
      });
    }
    __name(seedMissingOptions, "seedMissingOptions");
    chrome.runtime.onInstalled.addListener(() => {
      seedMissingOptions();
    });
    const NATIVE_HOST_ID = "net.aru_archive.host";
    const _IMAGE_EXTS = /* @__PURE__ */ new Set(["jpg", "jpeg", "png", "webp", "gif"]);
    const _PIXIV_CDN_RE = /\/(\d{6,12})_p\d+/;
    function _getFileExt(filename) {
      const m = (filename || "").match(/\.([a-z0-9]+)$/i);
      return m ? m[1].toLowerCase() : "";
    }
    __name(_getFileExt, "_getFileExt");
    function _extractPixivId(str) {
      if (!str) return null;
      const m = str.match(_PIXIV_CDN_RE);
      return m ? m[1] : null;
    }
    __name(_extractPixivId, "_extractPixivId");
    function _onDownloadComplete(item) {
      if (downloads2?.ownsDownload(item)) return;
      const ext = _getFileExt(item.filename);
      if (!_IMAGE_EXTS.has(ext)) return;
      const artworkId = _extractPixivId(item.url) || _extractPixivId(item.referrer) || _extractPixivId(item.filename);
      if (!artworkId) return;
      const fileFormat = ext === "jpeg" ? "jpg" : ext;
      const metadata = {
        schema_version: "2.0",
        source_site: "pixiv",
        artwork_id: artworkId,
        artwork_url: `https://www.pixiv.net/artworks/${artworkId}`
      };
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_ID,
        {
          action: "embed_download_metadata",
          request_id: `dl_${item.id}_${Date.now()}`,
          payload: { file_path: item.filename, file_format: fileFormat, metadata }
        },
        (response) => {
          if (chrome.runtime?.lastError) {
            console.warn("[Aru] embed native message failed:", chrome.runtime.lastError.message);
            return;
          }
          if (response?.success) {
            console.info("[Aru] metadata embedded:", response.data?.message);
          } else {
            console.warn("[Aru] embed failed:", response?.error);
          }
        }
      );
    }
    __name(_onDownloadComplete, "_onDownloadComplete");
    if (typeof chrome !== "undefined" && chrome.downloads?.onChanged) {
      chrome.downloads.onChanged.addListener((delta) => {
        if (delta.state?.current !== "complete") return;
        chrome.downloads.search({ id: delta.id }, (items) => {
          if (items?.length) _onDownloadComplete(items[0]);
        });
      });
    }
    return {};
  }
  __name(installFirefoxBackground, "installFirefoxBackground");

  // docs/source/compat/platform-firefox-background.mjs
  var downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
  var result = installFirefoxBackground({ environment: globalThis, dependencies: { downloads: { "ownsDownload": /* @__PURE__ */ __name(() => downloads["ownsDownload"], "ownsDownload") } } });
})();
