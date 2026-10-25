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

  // docs/source/platform/whale/background.mjs
  function installWhaleBackground({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { chrome, console: console2 } = environment;
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
      ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"],
      pixelTableMode: "off",
      pixelTableMaxWidth: 800,
      pixelTableMaxHeight: 600,
      pixelTableCellSize: 4
    });
    function seedMissingOptions() {
      chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) {
          console2.warn("[Aru Source Captioner] storage.get failed:", "STORAGE_READ_FAILED");
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
            console2.warn("[Aru Source Captioner] storage.set failed:", "STORAGE_WRITE_FAILED");
            return;
          }
          console2.info("[Aru Source Captioner] seeded missing default options:", {
            count: Object.keys(updates).length
          });
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
      if (!str) {
        return null;
      }
      const m = str.match(_PIXIV_CDN_RE);
      return m ? m[1] : null;
    }
    __name(_extractPixivId, "_extractPixivId");
    function _onDownloadComplete(item) {
      if (downloads2?.ownsDownload(item)) {
        return;
      }
      const ext = _getFileExt(item.filename);
      if (!_IMAGE_EXTS.has(ext)) {
        return;
      }
      const artworkId = _extractPixivId(item.url) || _extractPixivId(item.referrer) || _extractPixivId(item.filename);
      if (!artworkId) {
        return;
      }
      const fileFormat = ext === "jpeg" ? "jpg" : ext;
      const metadata = {
        schema_version: "2.0",
        source_site: "pixiv",
        artwork_id: artworkId,
        artwork_url: `https://www.pixiv.net/artworks/${artworkId}`
      };
      chrome.runtime.sendNativeMessage(NATIVE_HOST_ID, {
        action: "embed_download_metadata",
        request_id: `dl_${item.id}_${Date.now()}`,
        payload: {
          file_path: item.filename,
          file_format: fileFormat,
          metadata
        }
      }, (response) => {
        if (chrome.runtime?.lastError) {
          console2.warn("[Aru] embed native message failed:", "NATIVE_MESSAGE_FAILED");
          return;
        }
        if (response?.success) {
          console2.info("[Aru] metadata embedded:", "NATIVE_EMBED_COMPLETE");
        } else {
          console2.warn("[Aru] embed failed:", "NATIVE_EMBED_FAILED");
        }
      });
    }
    __name(_onDownloadComplete, "_onDownloadComplete");
    if (typeof chrome !== "undefined" && chrome.downloads?.onChanged) {
      chrome.downloads.onChanged.addListener((delta) => {
        if (delta.state?.current !== "complete") {
          return;
        }
        chrome.downloads.search({ id: delta.id }, (items) => {
          if (items?.length) {
            _onDownloadComplete(items[0]);
          }
        });
      });
    }
    return {};
  }
  __name(installWhaleBackground, "installWhaleBackground");

  // docs/source/ruliweb-icons/background.mjs
  function createIconsBackground({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { TextEncoder, URL } = environment;
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    const clearTimeout = typeof environment.clearTimeout === "function" ? (...args) => environment.clearTimeout(...args) : void 0;
    let icons = createModuleScope(dependencies.icons, ["CacheProtocol"], ["CacheProtocol"]);
    const initializeIconsBackground = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const namespace = icons = icons || {};
      const promiseApi = typeof root.browser !== "undefined" && root.browser.runtime && root.browser.storage;
      const api = promiseApi ? root.browser : root.chrome;
      if (!api || !api.runtime || !api.runtime.onMessage || !api.storage || !api.storage.sync) {
        return;
      }
      const TYPE = "ARU_ICONS_CACHE";
      const DB_NAME = "aru-icons-cache";
      const VERSION = 1;
      const MAX_BYTES = 50 * 1024 * 1024;
      const MAX_ENTRY_BYTES = 10 * 1024 * 1024;
      const MAX_STRING_CHARS = 1536 * 1024;
      const MAX_RAW_BYTES = 8 * 1024 * 1024;
      const MAX_DECODED_BYTES = 1024 * 1024;
      const MAX_ENTRIES = 200;
      const DEFAULT_TTL = 24 * 60 * 60 * 1e3;
      const MAX_TTL = 7 * DEFAULT_TTL;
      let databasePromise = null;
      let queue = Promise.resolve();
      let generation = 0;
      const activeTransactions = /* @__PURE__ */ new Set();
      const messages = Object.freeze({
        FORBIDDEN: "허용되지 않은 캐시 요청입니다.",
        FEATURE_DISABLED: "아이콘 기능이 비활성화되어 있습니다.",
        INVALID_REQUEST: "캐시 요청 데이터가 올바르지 않습니다.",
        CACHE_UNAVAILABLE: "아이콘 캐시를 사용할 수 없습니다. 공개 자료를 다시 읽어 주세요.",
        CACHE_SCHEMA_UNSUPPORTED: "이 버전에서 캐시 형식을 열 수 없습니다. 기존 데이터를 보존했습니다.",
        CACHE_QUOTA: "캐시 저장 공간이 부족합니다. 캐시 없이 읽기를 계속할 수 있습니다.",
        CACHE_CANCELLED: "설정 변경으로 캐시 작업이 중단되었습니다."
      });
      function error(code) {
        const value = new Error(messages[code]);
        value.code = code;
        return value;
      }
      __name(error, "error");
      const BYTE_MARKER = "$aruIconsBytesV1";
      function carrierBytes(value, encode) {
        let nodes = 0;
        const seen = /* @__PURE__ */ new Set();
        function visit(item, depth) {
          if (++nodes > 1e6 || depth > 20) {
            throw error("INVALID_REQUEST");
          }
          if (!item || typeof item !== "object") {
            return item;
          }
          if (ArrayBuffer.isView(item)) {
            if (!bytesArray(item) || item.byteLength > MAX_DECODED_BYTES) {
              throw error("INVALID_REQUEST");
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
            throw error("INVALID_REQUEST");
          }
          seen.add(item);
          if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
            if (encode || Object.keys(item).length !== 2 || !Object.prototype.hasOwnProperty.call(item, "byteLength")) {
              throw error("INVALID_REQUEST");
            }
            const text = item[BYTE_MARKER], length = item.byteLength;
            if (typeof text !== "string" || text.length > 1398104 || !Number.isInteger(length) || length < 0 || length > MAX_DECODED_BYTES || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length / 4 * 3 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !== length) {
              throw error("INVALID_REQUEST");
            }
            let binary;
            try {
              binary = root.atob(text);
            } catch (_) {
              throw error("INVALID_REQUEST");
            }
            if (binary.length !== length || root.btoa(binary) !== text) {
              throw error("INVALID_REQUEST");
            }
            return Uint8Array.from(binary, (char) => char.charCodeAt(0));
          }
          let result;
          if (Array.isArray(item)) {
            if (item.length > 1e4) {
              throw error("INVALID_REQUEST");
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
      function classify(value) {
        if (value && value.code && messages[value.code]) {
          return value;
        }
        if (value && value.name === "QuotaExceededError") {
          return error("CACHE_QUOTA");
        }
        if (value && value.name === "VersionError") {
          return error("CACHE_SCHEMA_UNSUPPORTED");
        }
        return error("CACHE_UNAVAILABLE");
      }
      __name(classify, "classify");
      function readSettings() {
        if (promiseApi) {
          return Promise.resolve(api.storage.sync.get(["enabled", "aruIconsOptions"]));
        }
        return new Promise((resolve, reject) => {
          api.storage.sync.get(["enabled", "aruIconsOptions"], (items) => {
            if (api.runtime.lastError) {
              reject(error("CACHE_UNAVAILABLE"));
            } else {
              resolve(items || {});
            }
          });
        });
      }
      __name(readSettings, "readSettings");
      async function requireEnabled() {
        const settings = await readSettings();
        const master = Object.prototype.hasOwnProperty.call(settings, "enabled") ? settings.enabled === true : true;
        if (!master || !settings.aruIconsOptions || settings.aruIconsOptions.enabled !== true) {
          throw error("FEATURE_DISABLED");
        }
      }
      __name(requireEnabled, "requireEnabled");
      function authorized(sender) {
        if (!sender || sender.id !== api.runtime.id || !sender.tab || !Number.isInteger(sender.tab.id)) {
          return false;
        }
        if (sender.frameId !== void 0 && sender.frameId !== 0) {
          return false;
        }
        try {
          const url = new URL(sender.url || sender.tab.url);
          return url.protocol === "https:" && !url.username && !url.password && !url.port && ["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) && /^\/community\/board\/\d+(?:\/|$)/.test(url.pathname) && (!sender.origin || sender.origin === url.origin);
        } catch (_) {
          return false;
        }
      }
      __name(authorized, "authorized");
      function cacheKey(payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw error("INVALID_REQUEST");
        }
        const boardId = String(payload.boardId === void 0 ? 98 : payload.boardId);
        const articleId = String(payload.articleId);
        if (!/^[1-9]\d{0,11}$/.test(boardId) || !/^[1-9]\d{0,11}$/.test(articleId)) {
          throw error("INVALID_REQUEST");
        }
        if (payload.catalogSource !== void 0) {
          if (!["developer", "favorite", "direct"].includes(payload.catalogSource) || !["NORMAL", "BUNDLE"].includes(payload.packKind) || payload.readerVersion !== 2) {
            throw error("INVALID_REQUEST");
          }
          return "catalog:2:" + payload.catalogSource + ":" + payload.packKind + ":" + boardId + ":" + articleId;
        }
        return boardId + ":" + articleId;
      }
      __name(cacheKey, "cacheKey");
      function validPublicUrl(text) {
        if (typeof text !== "string" || text.length > 4096 || /[\x00-\x20\x7f\\]/.test(text)) {
          return false;
        }
        try {
          const url = new URL(text);
          if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) {
            return false;
          }
          if (["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"].includes(url.hostname)) {
            return true;
          }
          return ["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) && /^\/community\/board\/[1-9]\d*\/read\/[1-9]\d*\/?$/.test(url.pathname);
        } catch (_) {
          return false;
        }
      }
      __name(validPublicUrl, "validPublicUrl");
      function bytesArray(value) {
        return ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]";
      }
      __name(bytesArray, "bytesArray");
      function publicJson(value, allowBytes = false) {
        let nodes = 0;
        const seen = /* @__PURE__ */ new Set();
        function visit(item, depth) {
          if (++nodes > 1e6 || depth > 20) {
            throw error("INVALID_REQUEST");
          }
          if (item === null || typeof item === "boolean") {
            return;
          }
          if (typeof item === "number") {
            if (!Number.isFinite(item)) {
              throw error("INVALID_REQUEST");
            }
            return;
          }
          if (typeof item === "string") {
            if (item.length > MAX_STRING_CHARS || /^(?:https?:|data:|blob:|javascript:)/i.test(item) && !validPublicUrl(item)) {
              throw error("INVALID_REQUEST");
            }
            return;
          }
          if (allowBytes && bytesArray(item)) {
            if (item.byteLength > MAX_DECODED_BYTES) {
              throw error("INVALID_REQUEST");
            }
            return;
          }
          if (typeof item !== "object" || seen.has(item)) {
            throw error("INVALID_REQUEST");
          }
          const prototype = Object.getPrototypeOf(item);
          if (!Array.isArray(item) && prototype !== Object.prototype && prototype !== null) {
            throw error("INVALID_REQUEST");
          }
          seen.add(item);
          if (Array.isArray(item)) {
            if (item.length > 1e4) {
              throw error("INVALID_REQUEST");
            }
            for (const child of item) {
              visit(child, depth + 1);
            }
          } else {
            for (const key of Object.keys(item)) {
              if (key.length > 128 || /^(?:__proto__|prototype|constructor|cookie|cookies|authorization|password|credentials|session|token|accessToken|refreshToken|headers|privateOverrides|usage|drafts|publishJobs)$/i.test(key)) {
                throw error("INVALID_REQUEST");
              }
              if (/url$|^src$/i.test(key) && item[key] !== null && !validPublicUrl(item[key])) {
                throw error("INVALID_REQUEST");
              }
              const descriptor = Object.getOwnPropertyDescriptor(item, key);
              if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                throw error("INVALID_REQUEST");
              }
              visit(descriptor.value, depth + 1);
            }
          }
          seen.delete(item);
        }
        __name(visit, "visit");
        visit(value, 0);
        return value;
      }
      __name(publicJson, "publicJson");
      function byteSize(value) {
        let binaryBytes = 0;
        const json = JSON.stringify(value, (_, item) => {
          if (bytesArray(item)) {
            binaryBytes += item.byteLength;
            return null;
          }
          return item;
        });
        return new TextEncoder().encode(json).byteLength + binaryBytes;
      }
      __name(byteSize, "byteSize");
      function copyRaw(value) {
        if (bytesArray(value)) {
          return new Uint8Array(value);
        }
        if (Array.isArray(value)) {
          return value.map(copyRaw);
        }
        if (value && typeof value === "object") {
          return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyRaw(item)]));
        }
        return value;
      }
      __name(copyRaw, "copyRaw");
      function makeRecord(payload) {
        const key = cacheKey(payload);
        if (!payload.snapshot || typeof payload.snapshot !== "object" || Array.isArray(payload.snapshot)) {
          throw error("INVALID_REQUEST");
        }
        publicJson(payload.snapshot);
        let raw = payload.rawMetadata === void 0 ? null : payload.rawMetadata;
        if (typeof raw === "string" && raw.length > MAX_STRING_CHARS) {
          throw error("INVALID_REQUEST");
        }
        if (raw !== null && typeof raw !== "string") {
          publicJson(raw, true);
        }
        if (byteSize(raw) > MAX_RAW_BYTES) {
          throw error("INVALID_REQUEST");
        }
        const ttl = payload.ttlMs === void 0 ? DEFAULT_TTL : payload.ttlMs;
        if (!Number.isFinite(ttl) || ttl < 1e3 || ttl > MAX_TTL) {
          throw error("INVALID_REQUEST");
        }
        const acquiredAt = Date.now();
        const record = {
          cacheKey: key,
          snapshot: JSON.parse(JSON.stringify(payload.snapshot)),
          rawMetadata: copyRaw(raw),
          acquiredAt,
          expiresAt: acquiredAt + ttl,
          lastAccess: acquiredAt,
          byteSize: 0
        };
        record.byteSize = byteSize(record);
        record.byteSize = byteSize(record);
        if (record.byteSize > MAX_ENTRY_BYTES) {
          throw error("INVALID_REQUEST");
        }
        return record;
      }
      __name(makeRecord, "makeRecord");
      function openDatabase() {
        if (databasePromise) {
          return databasePromise;
        }
        if (!root.indexedDB) {
          return Promise.reject(error("CACHE_UNAVAILABLE"));
        }
        const opening = new Promise((resolve, reject) => {
          let request;
          let settled = false;
          let timer;
          const fail = /* @__PURE__ */ __name((value) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timer);
            reject(classify(value));
          }, "fail");
          try {
            request = root.indexedDB.open(DB_NAME, VERSION);
          } catch (value) {
            fail(value);
            return;
          }
          timer = setTimeout(() => fail(error("CACHE_UNAVAILABLE")), 5e3);
          request.onupgradeneeded = () => {
            if (settled) {
              request.transaction.abort();
              return;
            }
            const db = request.result;
            if (!db.objectStoreNames.contains("packSnapshots")) {
              db.createObjectStore("packSnapshots", { keyPath: "cacheKey" });
            }
            if (!db.objectStoreNames.contains("schemaMeta")) {
              db.createObjectStore("schemaMeta", { keyPath: "key" });
            }
            request.transaction.objectStore("schemaMeta").put({ key: "version", schemaVersion: VERSION, phase: 1 });
          };
          request.onerror = () => fail(request.error);
          request.onblocked = () => fail(error("CACHE_UNAVAILABLE"));
          request.onsuccess = () => {
            const db = request.result;
            if (settled) {
              db.close();
              return;
            }
            settled = true;
            clearTimeout(timer);
            db.onversionchange = () => {
              db.close();
              databasePromise = null;
            };
            resolve(db);
          };
        });
        databasePromise = opening;
        opening.catch(() => {
          if (databasePromise === opening) {
            databasePromise = null;
          }
        });
        return opening;
      }
      __name(openDatabase, "openDatabase");
      function transaction(db, mode, run) {
        return new Promise((resolve, reject) => {
          const transactionGeneration = generation;
          let tx;
          let result;
          let explicitError = null;
          try {
            tx = db.transaction("packSnapshots", mode);
          } catch (value) {
            reject(classify(value));
            return;
          }
          activeTransactions.add(tx);
          const cleanup = /* @__PURE__ */ __name(() => activeTransactions.delete(tx), "cleanup");
          tx.oncomplete = () => {
            cleanup();
            resolve(result);
          };
          tx.onabort = () => {
            cleanup();
            reject(generation !== transactionGeneration ? error("CACHE_CANCELLED") : explicitError || classify(tx.error));
          };
          tx.onerror = () => {
          };
          try {
            run(tx.objectStore("packSnapshots"), (value) => {
              result = value;
            }, (value) => {
              explicitError = classify(value);
              tx.abort();
            });
          } catch (value) {
            explicitError = classify(value);
            try {
              tx.abort();
            } catch (_) {
              cleanup();
              reject(explicitError);
            }
          }
        });
      }
      __name(transaction, "transaction");
      async function execute(action, payload, expectedGeneration, record) {
        await requireEnabled();
        if (generation !== expectedGeneration) {
          throw error("CACHE_CANCELLED");
        }
        const db = await openDatabase();
        await requireEnabled();
        if (generation !== expectedGeneration) {
          throw error("CACHE_CANCELLED");
        }
        if (action === "get") {
          return transaction(db, "readwrite", (store, done) => {
            const request = store.get(cacheKey(payload));
            request.onsuccess = () => {
              const value = request.result;
              if (!value) {
                done(null);
                return;
              }
              const stale = value.expiresAt <= Date.now();
              value.lastAccess = Date.now();
              store.put(value);
              done({
                cacheKey: value.cacheKey,
                snapshot: value.snapshot,
                rawMetadata: value.rawMetadata,
                acquiredAt: value.acquiredAt,
                expiresAt: value.expiresAt,
                stale
              });
            };
          });
        }
        if (action === "invalidate") {
          return transaction(db, "readwrite", (store, done) => {
            if (payload && payload.all === true) {
              store.clear();
            } else {
              store.delete(cacheKey(payload));
            }
            done({ invalidated: true });
          });
        }
        if (action === "info") {
          return transaction(db, "readonly", (store, done) => {
            const request = store.getAll();
            request.onsuccess = () => done({
              schemaVersion: VERSION,
              entries: request.result.length,
              bytes: request.result.reduce((sum, item) => sum + item.byteSize, 0),
              maxBytes: MAX_BYTES,
              maxEntries: MAX_ENTRIES
            });
          });
        }
        return transaction(db, "readwrite", (store, done) => {
          const request = store.getAll();
          request.onsuccess = () => {
            const candidates = request.result.filter((item) => item.cacheKey !== record.cacheKey);
            let bytes = candidates.reduce((sum, item) => sum + item.byteSize, record.byteSize);
            let count = candidates.length + 1;
            candidates.sort((a, b) => Number(a.expiresAt > Date.now()) - Number(b.expiresAt > Date.now()) || a.lastAccess - b.lastAccess);
            for (const item of candidates) {
              if (bytes <= MAX_BYTES && count <= MAX_ENTRIES) {
                break;
              }
              store.delete(item.cacheKey);
              bytes -= item.byteSize;
              count -= 1;
            }
            store.put(record);
            done({
              cacheKey: record.cacheKey,
              acquiredAt: record.acquiredAt,
              expiresAt: record.expiresAt,
              byteSize: record.byteSize
            });
          };
        });
      }
      __name(execute, "execute");
      async function handle(message, sender) {
        if (!authorized(sender)) {
          throw error("FORBIDDEN");
        }
        await requireEnabled();
        const action = message.action;
        if (!["get", "put", "invalidate", "info"].includes(action)) {
          throw error("INVALID_REQUEST");
        }
        let payload = message.payload || {};
        let record;
        if (action === "put") {
          if (Object.prototype.hasOwnProperty.call(payload, "rawMetadata")) {
            payload = {
              ...payload,
              rawMetadata: carrierBytes(payload.rawMetadata, false)
            };
          }
          record = makeRecord(payload);
        } else if (action === "get" || action === "invalidate" && payload.all !== true) {
          cacheKey(payload);
        }
        const expectedGeneration = generation;
        const task = queue.then(() => execute(action, payload, expectedGeneration, record));
        queue = task.catch(() => {
        });
        return task;
      }
      __name(handle, "handle");
      api.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || message.type !== TYPE) {
          return false;
        }
        handle(message, sender).then((result) => {
          if (message.action === "get" && result) {
            result = {
              ...result,
              rawMetadata: carrierBytes(result.rawMetadata, true)
            };
          }
          return { ok: true, result };
        }).catch((value) => {
          const safe = classify(value);
          return {
            ok: false,
            error: { code: safe.code, message: safe.message }
          };
        }).then(sendResponse);
        return true;
      });
      if (api.storage.onChanged) {
        api.storage.onChanged.addListener((changes, area) => {
          if (area !== "sync" || !changes.enabled && !changes.aruIconsOptions) {
            return;
          }
          const disabled = changes.enabled && changes.enabled.newValue !== true || changes.aruIconsOptions && (!changes.aruIconsOptions.newValue || changes.aruIconsOptions.newValue.enabled !== true);
          if (disabled) {
            ++generation;
            for (const tx of activeTransactions) {
              try {
                tx.abort();
              } catch (_) {
              }
            }
          }
        });
      }
      namespace.CacheProtocol = Object.freeze({
        type: TYPE,
        database: DB_NAME,
        schemaVersion: VERSION,
        maxBytes: MAX_BYTES
      });
    }, "initializeIconsBackground");
    initializeIconsBackground(environment);
    return { icons: selectModuleExports(icons, ["CacheProtocol"]) };
  }
  __name(createIconsBackground, "createIconsBackground");

  // docs/source/body-download/core.mjs
  function createDownloadCore({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { URL } = environment;
    let downloads2 = createModuleScope(dependencies.downloads, [], [
      "HOSTS",
      "JOB_KEY",
      "error",
      "article",
      "mediaUrl",
      "safeName",
      "folder",
      "originalFilename",
      "numbered",
      "streamMedia",
      "signature",
      "inspect",
      "actualName",
      "localManifest"
    ]);
    const initializeDownloadCore = /* @__PURE__ */ __name(function(_root) {
      "use strict";
      const D = downloads2 = downloads2 || {};
      const HOSTS = ["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"];
      const JOB_KEY = "aruBodyDownloadJobV1";
      const error = /* @__PURE__ */ __name((code, message) => Object.assign(new Error(message), { code }), "error");
      function article(url) {
        let u;
        try {
          u = new URL(url);
        } catch (_) {
          throw error("PAGE_URL", "게시글 주소를 확인할 수 없습니다.");
        }
        const match = u.pathname.match(/^\/community\/board\/98\/read\/([1-9]\d{0,14})\/?$/);
        if (u.protocol !== "https:" || !["bbs.ruliweb.com", "m.ruliweb.com"].includes(u.hostname) || u.port || u.username || u.password || !match) {
          throw error("PAGE_URL", "아이콘 공유 게시판의 게시글 읽기 페이지에서 실행해 주세요.");
        }
        return {
          site: "ruliweb",
          boardId: 98,
          articleId: match[1],
          url: u.origin + "/community/board/98/read/" + match[1]
        };
      }
      __name(article, "article");
      function mediaUrl(value, base) {
        if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) {
          throw error("MEDIA_URL", "안전하지 않은 이미지 주소입니다.");
        }
        let u;
        try {
          u = new URL(value, base);
        } catch (_) {
          throw error("MEDIA_URL", "이미지 주소를 해석할 수 없습니다.");
        }
        if (u.protocol !== "https:" || !HOSTS.includes(u.hostname) || u.username || u.password || u.port || u.hash) {
          throw error("MEDIA_URL", "허용된 루리웹 이미지 CDN 주소가 아닙니다.");
        }
        return u.href;
      }
      __name(mediaUrl, "mediaUrl");
      function safeName(value, max = 100) {
        let text = String(value || "").normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "_").replace(/\s+/gu, " ").trim().replace(/^[. ]+|[. ]+$/gu, "");
        if (!text) {
          text = "제목 없음";
        }
        if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(text)) {
          text = "_" + text;
        }
        text = [...text].slice(0, max).join("").replace(/[. ]+$/u, "");
        while (text.length > max) {
          text = [...text].slice(0, -1).join("");
        }
        return text || "제목 없음";
      }
      __name(safeName, "safeName");
      function folder(source, runId) {
        const suffix = String(runId).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30);
        if (!suffix) {
          throw error("RUN_ID", "다운로드 실행 식별자가 없습니다.");
        }
        return "Aru-Icons/" + safeName(source.title, 75) + " (" + source.articleId + ")/" + suffix;
      }
      __name(folder, "folder");
      function originalFilename(url) {
        const value = new URL(url).pathname.split("/").pop();
        try {
          return decodeURIComponent(value);
        } catch (_) {
          return value;
        }
      }
      __name(originalFilename, "originalFilename");
      function numbered(index, ext) {
        return String(index).padStart(3, "0") + "." + ext;
      }
      __name(numbered, "numbered");
      function streamMedia(value, mime = "") {
        const type = String(mime).split(";")[0].trim().toLowerCase();
        if ([
          "application/vnd.apple.mpegurl",
          "application/x-mpegurl",
          "audio/mpegurl",
          "audio/x-mpegurl",
          "application/dash+xml",
          "video/mp2t"
        ].includes(type)) {
          return true;
        }
        try {
          return /\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(value).pathname);
        } catch (_) {
          return false;
        }
      }
      __name(streamMedia, "streamMedia");
      function isoMedia(b) {
        const text = /* @__PURE__ */ __name((p, n) => String.fromCharCode(...b.subarray(p, p + n)), "text");
        const u32 = /* @__PURE__ */ __name((p) => b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3], "u32");
        let budget = 4096, encrypted = false;
        function boxes(start, end, depth = 0) {
          if (depth > 16) {
            throw Error("depth");
          }
          const result = [];
          for (let p = start; p < end; ) {
            if (--budget < 0 || p + 8 > end) {
              throw Error("box");
            }
            let size = u32(p), head = 8;
            const type = text(p + 4, 4);
            if (size === 1) {
              if (p + 16 > end) {
                throw Error("large box");
              }
              size = u32(p + 8) * 4294967296 + u32(p + 12);
              head = 16;
            }
            if (size === 0) {
              size = end - p;
            }
            if (!Number.isSafeInteger(size) || size < head || p + size > end) {
              throw Error("size");
            }
            const data = p + head, limit = p + size;
            result.push({ type, data, end: limit });
            if (["pssh", "encv", "enca", "sinf"].includes(type)) {
              encrypted = true;
            }
            if ([
              "moov",
              "trak",
              "mdia",
              "minf",
              "stbl",
              "mvex",
              "moof",
              "traf",
              "sinf",
              "schi"
            ].includes(type)) {
              boxes(data, limit, depth + 1);
            }
            if (type === "stsd") {
              if (data + 8 > limit) {
                throw Error("stsd");
              }
              boxes(data + 8, limit, depth + 1);
            }
            if ([
              "avc1",
              "avc3",
              "hvc1",
              "hev1",
              "av01",
              "vp08",
              "vp09",
              "encv"
            ].includes(type) && data + 78 < limit) {
              boxes(data + 78, limit, depth + 1);
            }
            p = limit;
          }
          return result;
        }
        __name(boxes, "boxes");
        try {
          const top = boxes(0, b.length), ftyp = top.find((x) => x.type === "ftyp");
          if (!ftyp || ftyp.data + 8 > ftyp.end || (ftyp.end - ftyp.data) % 4) {
            return null;
          }
          const brands = [text(ftyp.data, 4)];
          for (let p = ftyp.data + 8; p + 4 <= ftyp.end; p += 4) {
            brands.push(text(p, 4));
          }
          if (brands.some((x) => ["avif", "avis"].includes(x))) {
            return { ext: "avif", mime: "image/avif", mediaKind: "image" };
          }
          if (brands.some((x) => ["qt  ", "heic", "heix", "hevc", "hevx"].includes(x))) {
            return null;
          }
          if (!brands.some((x) => /^(?:isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(x))) {
            return null;
          }
          if (encrypted) {
            return { ext: null, mime: "video/mp4", reason: "encrypted-media" };
          }
          if (!top.some((x) => x.type === "moov") || !top.some((x) => x.type === "mdat" && x.end > x.data)) {
            return null;
          }
          return { ext: "mp4", mime: "video/mp4", mediaKind: "video" };
        } catch (_) {
          return null;
        }
      }
      __name(isoMedia, "isoMedia");
      function webmMedia(b) {
        let budget = 4096, encrypted = false;
        function vint(p, asId = false) {
          if (p >= b.length || !b[p]) {
            throw Error("vint");
          }
          let n = 1, mask = 128;
          while (!(b[p] & mask)) {
            n++;
            mask >>= 1;
          }
          if (n > (asId ? 4 : 8) || p + n > b.length) {
            throw Error("vint length");
          }
          let value = asId ? b[p] : b[p] & mask - 1, unknown = !asId && value === mask - 1;
          for (let i = 1; i < n; i++) {
            value = value * 256 + b[p + i];
            unknown = unknown && b[p + i] === 255;
          }
          if (!unknown && !Number.isSafeInteger(value)) {
            throw Error("vint range");
          }
          return { value, n, unknown };
        }
        __name(vint, "vint");
        function elements(start, end, depth = 0) {
          if (depth > 16) {
            throw Error("depth");
          }
          const list = [];
          for (let p = start; p < end; ) {
            if (--budget < 0) {
              throw Error("budget");
            }
            const id = vint(p, true), size = vint(p + id.n), data = p + id.n + size.n;
            if (size.unknown && ![408125543, 524531317].includes(id.value)) {
              throw Error("unknown size");
            }
            const limit = size.unknown ? end : data + size.value;
            if (data > end || limit > end) {
              throw Error("element size");
            }
            list.push({ id: id.value, data, end: limit });
            if ([28032, 20533].includes(id.value)) {
              encrypted = true;
            }
            if ([408125543, 374648427, 174, 28032, 25152].includes(id.value)) {
              elements(data, limit, depth + 1);
            }
            p = limit;
          }
          return list;
        }
        __name(elements, "elements");
        try {
          const top = elements(0, b.length), header = top[0];
          if (header?.id !== 440786851) {
            return null;
          }
          const doc = elements(header.data, header.end).find((x) => x.id === 17026);
          if (!doc || String.fromCharCode(...b.subarray(doc.data, doc.end)) !== "webm") {
            return null;
          }
          const segment = top.find((x) => x.id === 408125543);
          if (!segment) {
            return null;
          }
          const children = elements(segment.data, segment.end);
          if (encrypted) {
            return { ext: null, mime: "video/webm", reason: "encrypted-media" };
          }
          if (!children.some((x) => x.id === 374648427) || !children.some((x) => x.id === 524531317 && x.end > x.data)) {
            return null;
          }
          return { ext: "webm", mime: "video/webm", mediaKind: "video" };
        } catch (_) {
          return null;
        }
      }
      __name(webmMedia, "webmMedia");
      function signature(bytes) {
        const b = bytes, s = /* @__PURE__ */ __name((start, count) => String.fromCharCode(...b.subarray(start, start + count)), "s");
        if (b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) {
          return { ext: "png", mime: "image/png" };
        }
        if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) {
          return { ext: "jpg", mime: "image/jpeg" };
        }
        if (b.length >= 6 && ["GIF87a", "GIF89a"].includes(s(0, 6))) {
          return { ext: "gif", mime: "image/gif" };
        }
        if (b.length >= 12 && s(0, 4) === "RIFF" && s(8, 4) === "WEBP") {
          return { ext: "webp", mime: "image/webp" };
        }
        if (b.length >= 8 && ["ftyp", "free", "skip", "wide"].includes(s(4, 4))) {
          return isoMedia(b) || { ext: null, mime: "unknown" };
        }
        if (b.length >= 4 && [26, 69, 223, 163].every((v, i) => b[i] === v)) {
          return webmMedia(b) || { ext: null, mime: "unknown" };
        }
        return { ext: null, mime: "unknown" };
      }
      __name(signature, "signature");
      function inspect(bytes, mime, url) {
        const detected = signature(bytes), declared = String(mime || "").split(";")[0].trim().toLowerCase();
        if (!detected.ext) {
          throw error("UNSUPPORTED_MEDIA", detected.reason === "encrypted-media" ? "암호화된 미디어는 지원하지 않습니다." : "지원하는 미디어 파일 구조가 아닙니다 (" + detected.mime + ").");
        }
        if (declared === "text/html" || declared === "application/xhtml+xml") {
          throw error("UNSUPPORTED_MEDIA", "서버가 미디어 대신 HTML을 반환했습니다.");
        }
        if (streamMedia(url, declared)) {
          throw error("UNSUPPORTED_MEDIA", "스트리밍 목록이나 분할 파일은 지원하지 않습니다.");
        }
        const urlExt = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
        const normal = /* @__PURE__ */ __name((x) => x === "jpeg" ? "jpg" : x, "normal");
        const mismatches = [];
        if (normal(urlExt) !== detected.ext) {
          mismatches.push("url-extension");
        }
        if (declared !== detected.mime) {
          mismatches.push("response-mime");
        }
        return {
          ...detected,
          mediaKind: detected.mediaKind || "image",
          responseMimeType: declared,
          urlExtension: urlExt,
          mismatches
        };
      }
      __name(inspect, "inspect");
      function actualName(path) {
        return String(path || "").replace(/\\/g, "/").split("/").pop();
      }
      __name(actualName, "actualName");
      function localManifest(job) {
        return {
          schemaVersion: 1,
          kind: "aru-local-body-download",
          source: job.source,
          runId: job.id,
          createdAt: job.createdAt,
          finishedAt: job.finishedAt || null,
          status: job.status,
          requestedFolder: job.folder,
          bodySelector: job.bodySelector,
          counts: job.counts,
          unsupported: job.unsupported,
          images: job.images.map((x) => ({
            ...x,
            filename: x.status === "complete" ? actualName(x.actualPath) : null
          })),
          notice: "로컬 저장 기록입니다. 공개 메타데이터나 재배포 허가가 아닙니다."
        };
      }
      __name(localManifest, "localManifest");
      Object.assign(D, {
        HOSTS,
        JOB_KEY,
        error,
        article,
        mediaUrl,
        safeName,
        folder,
        originalFilename,
        numbered,
        streamMedia,
        signature,
        inspect,
        actualName,
        localManifest
      });
    }, "initializeDownloadCore");
    initializeDownloadCore(environment);
    return {
      downloads: selectModuleExports(downloads2, [
        "HOSTS",
        "JOB_KEY",
        "error",
        "article",
        "mediaUrl",
        "safeName",
        "folder",
        "originalFilename",
        "numbered",
        "streamMedia",
        "signature",
        "inspect",
        "actualName",
        "localManifest"
      ])
    };
  }
  __name(createDownloadCore, "createDownloadCore");

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

  // docs/source/body-download/background.mjs
  function createDownloadBackground({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { TextEncoder, console: console2 } = environment;
    let downloads2 = createModuleScope(dependencies.downloads, [
      "api",
      "options",
      "call",
      "writeJob",
      "error",
      "article",
      "readJob",
      "actualName",
      "mediaUrl",
      "folder"
    ], []);
    const initializeDownloadBackground = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const D = downloads2, api = D.api, MENU = "aru-body-download-v1", PAGE = "features/body-download/download.html";
      if (!api?.contextMenus) {
        return;
      }
      let queue = Promise.resolve();
      const serialize = /* @__PURE__ */ __name((fn) => {
        const run = queue.then(fn);
        queue = run.catch(() => {
        });
        return run;
      }, "serialize");
      async function menu() {
        const routes = ["https://bbs.ruliweb.com/community/board/98/read/*"];
        if (api.runtime.getManifest().host_permissions.some((x) => x.startsWith("https://m.ruliweb.com/"))) {
          routes.push("https://m.ruliweb.com/community/board/98/read/*");
        }
        const config = {
          title: "아루 · 게시글 아이콘 일괄 다운로드",
          contexts: ["all"],
          documentUrlPatterns: routes,
          enabled: await D.options()
        };
        try {
          await D.call(api.contextMenus, "update", MENU, config);
        } catch (_) {
          await new Promise((resolve, reject) => {
            try {
              api.contextMenus.create({ id: MENU, ...config }, () => {
                const err = api.runtime.lastError;
                if (err) {
                  reject(new Error(err.message));
                } else {
                  resolve();
                }
              });
            } catch (err) {
              reject(err);
            }
          });
        }
      }
      __name(menu, "menu");
      async function open(job) {
        const url = api.runtime.getURL(PAGE) + "?job=" + encodeURIComponent(job.id);
        if (job.managerTabId != null) {
          try {
            const tab2 = await D.call(api.tabs, "get", job.managerTabId);
            if (tab2.url === url) {
              await D.call(api.tabs, "update", tab2.id, { active: true });
              return;
            }
          } catch (_) {
          }
        }
        const tab = await D.call(api.tabs, "create", { url, active: true });
        job.managerTabId = tab.id;
        if (job.status === "error") {
          await D.call(api.storage.local, "set", { aruBodyDownloadErrorV1: job });
        } else {
          await D.writeJob(job);
        }
      }
      __name(open, "open");
      async function clicked(info, tab) {
        if (info.menuItemId !== MENU) {
          return;
        }
        if (!await D.options()) {
          return;
        }
        const current = await D.call(api.tabs, "get", tab.id);
        if (!current.active || current.incognito) {
          throw D.error("TAB", "현재 활성화된 일반 탭에서 실행해 주세요.");
        }
        const source = D.article(current.url);
        const prior = await D.readJob();
        if (prior && ["prepared", "running", "cancelling"].includes(prior.status)) {
          try {
            const manager = await D.call(api.tabs, "get", prior.managerTabId);
            if (manager.url === api.runtime.getURL(PAGE) + "?job=" + encodeURIComponent(prior.id)) {
              await open(prior);
              return;
            }
          } catch (_) {
          }
          for (const image of prior.images) {
            if (image.downloadId == null || !["processing", "saving"].includes(image.status)) {
              continue;
            }
            try {
              const item = (await D.call(api.downloads, "search", { id: image.downloadId }))[0];
              if (item?.state === "complete" && item.exists !== false && item.filename && item.fileSize === image.byteLength) {
                Object.assign(image, {
                  status: "complete",
                  actualPath: item.filename,
                  filename: D.actualName(item.filename)
                });
              } else {
                if (item?.state === "in_progress") {
                  await D.call(api.downloads, "cancel", item.id);
                }
                image.status = "interrupted";
              }
            } catch (_) {
              image.status = "interrupted";
            }
          }
          prior.status = prior.status === "prepared" ? "cancelled" : "interrupted";
          await D.call(api.storage.local, "set", {
            aruBodyDownloadPreviousJobV1: prior
          });
        }
        const response = await D.call(api.tabs, "sendMessage", tab.id, { type: "aru-body-download:collect", url: source.url }, { frameId: 0 });
        if (!response?.ok) {
          throw D.error(response?.error?.code || "COLLECT", response?.error?.message || "게시글 수집 응답이 없습니다. 페이지를 새로고침해 주세요.");
        }
        const snapshot = response.result;
        if (D.article(snapshot?.source?.url).url !== source.url || snapshot.source.articleId !== source.articleId || !Array.isArray(snapshot.images) || snapshot.images.length > 5e3) {
          throw D.error("SNAPSHOT", "본문 수집 결과가 올바르지 않습니다.");
        }
        snapshot.images.forEach((x) => D.mediaUrl(x.originalUrl));
        if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 4 * 1024 * 1024) {
          throw D.error("RESOURCE_LIMIT", "본문 수집 기록이 4 MiB를 넘습니다.");
        }
        const id = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19) + "-" + root.crypto.randomUUID().slice(0, 8);
        const job = {
          ...snapshot,
          id,
          status: "prepared",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          folder: D.folder(snapshot.source, id),
          sourceTabId: tab.id,
          managerTabId: null
        };
        await D.writeJob(job);
        await open(job);
      }
      __name(clicked, "clicked");
      api.contextMenus.onClicked.addListener((info, tab) => {
        serialize(() => clicked(info, tab)).catch(async (err) => {
          console2.warn("[Aru body download]", "DOWNLOAD_REQUEST_FAILED");
          const id = root.crypto.randomUUID();
          const job = {
            id,
            status: "error",
            error: err.message,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            images: [],
            unsupported: []
          };
          try {
            await D.call(api.storage.local, "set", {
              aruBodyDownloadErrorV1: job
            });
            await open(job);
          } catch (openError) {
            console2.warn("[Aru body download] 오류 화면 열기 실패", "DOWNLOAD_ERROR_UI_FAILED");
          }
        });
      });
      api.runtime.onInstalled.addListener(() => serialize(menu).catch((_err) => console2.warn("[Aru body download] 메뉴 등록 실패", "DOWNLOAD_MENU_INSTALL_FAILED")));
      api.runtime.onStartup?.addListener(() => serialize(menu).catch((_err) => console2.warn("[Aru body download]", "DOWNLOAD_MENU_STARTUP_FAILED")));
      api.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && (changes.enabled || changes.aruBodyDownloadOptions)) {
          serialize(menu).catch((_err) => console2.warn("[Aru body download]", "DOWNLOAD_MENU_UPDATE_FAILED"));
        }
      });
      serialize(menu).catch((_err) => console2.warn("[Aru body download] 메뉴 준비 실패", "DOWNLOAD_MENU_PREPARE_FAILED"));
    }, "initializeDownloadBackground");
    initializeDownloadBackground(environment);
    return {};
  }
  __name(createDownloadBackground, "createDownloadBackground");

  // docs/source/runtime/downloads.mjs
  function installDownloadBackground({ environment = defaultEnvironment, initial = {} } = {}) {
    const downloads2 = { ...initial };
    let part;
    part = createDownloadCore({ environment, dependencies: { downloads: {} } });
    Object.assign(downloads2, part.downloads);
    part = createDownloadBrowserApi({
      environment,
      dependencies: {
        downloads: {
          error: /* @__PURE__ */ __name(() => downloads2["error"], "error"),
          JOB_KEY: /* @__PURE__ */ __name(() => downloads2["JOB_KEY"], "JOB_KEY")
        }
      }
    });
    Object.assign(downloads2, part.downloads);
    part = createDownloadBackground({
      environment,
      dependencies: {
        downloads: {
          api: /* @__PURE__ */ __name(() => downloads2["api"], "api"),
          options: /* @__PURE__ */ __name(() => downloads2["options"], "options"),
          call: /* @__PURE__ */ __name(() => downloads2["call"], "call"),
          writeJob: /* @__PURE__ */ __name(() => downloads2["writeJob"], "writeJob"),
          error: /* @__PURE__ */ __name(() => downloads2["error"], "error"),
          article: /* @__PURE__ */ __name(() => downloads2["article"], "article"),
          readJob: /* @__PURE__ */ __name(() => downloads2["readJob"], "readJob"),
          actualName: /* @__PURE__ */ __name(() => downloads2["actualName"], "actualName"),
          mediaUrl: /* @__PURE__ */ __name(() => downloads2["mediaUrl"], "mediaUrl"),
          folder: /* @__PURE__ */ __name(() => downloads2["folder"], "folder")
        }
      }
    });
    return { downloads: downloads2 };
  }
  __name(installDownloadBackground, "installDownloadBackground");

  // docs/source/compat/platform-whale-background.mjs
  var downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
  installWhaleBackground({ environment: globalThis, dependencies: { downloads: { "ownsDownload": /* @__PURE__ */ __name(() => downloads["ownsDownload"], "ownsDownload") } } });
  createIconsBackground({ environment: globalThis });
  Object.assign(downloads, installDownloadBackground({ environment: globalThis, initial: downloads }).downloads);
})();
