// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/source-caption/pixiv-filename.mjs
  function parsePixivFilenameUrl(filename) {
    if (typeof filename !== "string") {
      return null;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(filename);
    } catch {
      decoded = filename;
    }
    const basename = decoded.split(/[\\/]/).pop() || "";
    const match = basename.match(/^(pixiv[_\- ]?|illust[_\- ]?)?(\d{6,12})(_p\d+)?(?:_[a-z0-9]+)*(?: ?\([1-9]\d*\))?\.(?:jpg|jpeg|png|webp|gif)$/i);
    if (!match || !match[1] && !match[3]) {
      return null;
    }
    return `https://www.pixiv.net/artworks/${match[2]}`;
  }
  __name(parsePixivFilenameUrl, "parsePixivFilenameUrl");

  // docs/source/source-caption/png-chunks.mjs
  var PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  function hasPngSignature(buffer) {
    if (!buffer || buffer.byteLength < 8) {
      return false;
    }
    const sig = new Uint8Array(buffer, 0, 8);
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
      if (sig[i] !== PNG_SIGNATURE[i]) {
        return false;
      }
    }
    return true;
  }
  __name(hasPngSignature, "hasPngSignature");
  function* parsePngItxtChunks(buffer) {
    const view = new DataView(buffer);
    let offset = 8;
    while (offset + 12 <= buffer.byteLength) {
      const length = view.getUint32(offset, false);
      if (length > 2147483647) {
        return;
      }
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd + 4 > buffer.byteLength) {
        return;
      }
      const t0 = view.getUint8(offset + 4);
      const t1 = view.getUint8(offset + 5);
      const t2 = view.getUint8(offset + 6);
      const t3 = view.getUint8(offset + 7);
      const type = String.fromCodePoint(t0, t1, t2, t3);
      if (type === "iTXt" && length > 0) {
        yield new Uint8Array(buffer, dataStart, length);
      }
      if (type === "IEND") {
        return;
      }
      offset = dataEnd + 4;
    }
  }
  __name(parsePngItxtChunks, "parsePngItxtChunks");
  function parseItxtChunk(data) {
    if (!data || data.length < 6) {
      return null;
    }
    let kwEnd = -1;
    const maxKw = Math.min(data.length, 80);
    for (let i = 0; i < maxKw; i++) {
      if (data[i] === 0) {
        kwEnd = i;
        break;
      }
    }
    if (kwEnd < 1) {
      return null;
    }
    let keyword;
    try {
      keyword = String.fromCodePoint(...data.subarray(0, kwEnd));
    } catch {
      return null;
    }
    if (kwEnd + 2 >= data.length) {
      return null;
    }
    const compressionFlag = data[kwEnd + 1];
    const compressionMethod = data[kwEnd + 2];
    let langEnd = -1;
    for (let i = kwEnd + 3; i < data.length; i++) {
      if (data[i] === 0) {
        langEnd = i;
        break;
      }
    }
    if (langEnd === -1) {
      return null;
    }
    let tkwEnd = -1;
    for (let i = langEnd + 1; i < data.length; i++) {
      if (data[i] === 0) {
        tkwEnd = i;
        break;
      }
    }
    if (tkwEnd === -1) {
      return null;
    }
    const textBytes = data.subarray(tkwEnd + 1);
    return { keyword, compressionFlag, compressionMethod, textBytes };
  }
  __name(parseItxtChunk, "parseItxtChunk");

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

  // docs/source/platform/whale/content.mjs
  function installWhaleContent({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const window = environment.window ?? environment;
    const { document, location, navigator, chrome, MutationObserver, HTMLElement, TextDecoder, Image, URL, exifr, console } = environment;
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    const setInterval = typeof environment.setInterval === "function" ? (...args) => environment.setInterval(...args) : void 0;
    const clearInterval = typeof environment.clearInterval === "function" ? (...args) => environment.clearInterval(...args) : void 0;
    let attribution2 = createModuleScope(dependencies.attribution, ["Controller"], []);
    const runBootstrap1 = /* @__PURE__ */ __name(function bootstrap() {
      "use strict";
      const DEFAULT_OPTIONS = Object.freeze({
        enabled: true,
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
      const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;
      const TEXT_FIELDS_FOR_JSON = [
        "UserComment",
        "userComment",
        "Comment",
        "Description",
        "ImageDescription"
      ];
      const EDITOR_ROOT_SELECTORS = [
        '[contenteditable="true"]',
        ".cke_editable",
        ".fr-element",
        ".editor"
      ];
      const WALK_MAX_DEPTH = 10;
      let uploadAttribution = null;
      const handledFileEvents = /* @__PURE__ */ new WeakSet();
      function isChromeStorageSyncAvailable() {
        try {
          if (typeof chrome === "undefined") {
            return false;
          }
          if (!chrome) {
            return false;
          }
          if (!chrome.storage) {
            return false;
          }
          if (!chrome.storage.sync) {
            return false;
          }
          if (typeof chrome.storage.sync.get !== "function") {
            return false;
          }
          return true;
        } catch {
          return false;
        }
      }
      __name(isChromeStorageSyncAvailable, "isChromeStorageSyncAvailable");
      function loadConfig() {
        return new Promise((resolve) => {
          try {
            if (!isChromeStorageSyncAvailable()) {
              console.warn("[Aru Source Captioner] chrome.storage.sync unavailable — using default options");
              resolve({ ...DEFAULT_OPTIONS });
              return;
            }
            chrome.storage.sync.get(null, (items) => {
              try {
                if (typeof chrome !== "undefined" && chrome && chrome.runtime && chrome.runtime.lastError) {
                  console.warn("[Aru Source Captioner] storage.get failed, falling back to defaults:", chrome.runtime.lastError.message);
                  resolve({ ...DEFAULT_OPTIONS });
                  return;
                }
                const merged = {
                  ...DEFAULT_OPTIONS
                };
                const safeItems = items && typeof items === "object" ? items : {};
                for (const key of Object.keys(DEFAULT_OPTIONS)) {
                  if (key in safeItems) {
                    merged[key] = safeItems[key];
                  }
                }
                resolve(merged);
              } catch (callbackErr) {
                console.warn("[Aru Source Captioner] storage.get callback threw, falling back to defaults:", callbackErr);
                resolve({ ...DEFAULT_OPTIONS });
              }
            });
          } catch (err) {
            console.warn("[Aru Source Captioner] loadConfig threw, falling back to defaults:", err);
            resolve({ ...DEFAULT_OPTIONS });
          }
        });
      }
      __name(loadConfig, "loadConfig");
      function publishUploadStatus(snapshot) {
        const value = JSON.stringify(snapshot);
        if (document.documentElement.dataset.aruUploadDiagnostic !== value) {
          document.documentElement.dataset.aruUploadDiagnostic = value;
        }
      }
      __name(publishUploadStatus, "publishUploadStatus");
      function attachFileInputListeners(config) {
        document.addEventListener("change", async (ev) => {
          const target = ev.target;
          if (!(target instanceof HTMLInputElement) || target.type !== "file" || !target.files?.length) {
            return;
          }
          if (handledFileEvents.has(ev)) {
            return;
          }
          handledFileEvents.add(ev);
          const images = Array.from(target.files).filter((file) => file?.type?.startsWith("image/"));
          if (!images.length) {
            return;
          }
          if ((config.pixelTableMode ?? "off") !== "off") {
            const isMobile = isMobileAutoInsertEnvironment();
            if (shouldUsePixelTableInsert(config, isMobile)) {
              ev.stopImmediatePropagation();
              ev.stopPropagation();
              ev.preventDefault();
              await handlePixelTableInsert(images, config, isMobile);
              return;
            }
          }
          await handleSelectedImageFiles(images, target);
        }, true);
      }
      __name(attachFileInputListeners, "attachFileInputListeners");
      async function handleSelectedImageFiles(files, input) {
        if (uploadAttribution) {
          await uploadAttribution.select(files, input);
        } else {
          publishUploadStatus({
            state: "editor-unavailable",
            selected: files.length
          });
        }
      }
      __name(handleSelectedImageFiles, "handleSelectedImageFiles");
      const ARU_ITXT_KEYWORD = "AruArchive";
      const ARU_PAYLOAD_URL_KEYS = ["artwork_url", "source_url", "artworkUrl"];
      function isPngFile(file) {
        if (!file) {
          return false;
        }
        if (typeof file.type === "string" && file.type === "image/png") {
          return true;
        }
        if (typeof file.name === "string" && /\.png$/i.test(file.name)) {
          return true;
        }
        return false;
      }
      __name(isPngFile, "isPngFile");
      function decodeAruPayloadFromItxtText(textBytes) {
        let jsonText;
        try {
          jsonText = new TextDecoder("utf-8", { fatal: false }).decode(textBytes);
        } catch {
          return { status: "error", url: null, reason: "png_itxt_invalid_chunk" };
        }
        let payload;
        try {
          payload = JSON.parse(jsonText);
        } catch {
          return {
            status: "error",
            url: null,
            reason: "png_itxt_json_parse_failed"
          };
        }
        return extractSourceFromAruArchivePayload(payload);
      }
      __name(decodeAruPayloadFromItxtText, "decodeAruPayloadFromItxtText");
      async function parseAruArchivePngItxt(file) {
        let buffer;
        try {
          buffer = await file.arrayBuffer();
        } catch {
          return { status: "error", url: null, reason: "arraybuffer_failed" };
        }
        if (!hasPngSignature(buffer)) {
          return {
            status: "missing",
            url: null,
            reason: "png_itxt_invalid_signature"
          };
        }
        for (const chunkBytes of parsePngItxtChunks(buffer)) {
          const itxt = parseItxtChunk(chunkBytes);
          if (!itxt) {
            continue;
          }
          if (itxt.keyword !== ARU_ITXT_KEYWORD) {
            continue;
          }
          if (itxt.compressionFlag !== 0) {
            return {
              status: "missing",
              url: null,
              reason: "png_itxt_compressed_unsupported"
            };
          }
          return decodeAruPayloadFromItxtText(itxt.textBytes);
        }
        return { status: "missing", url: null, reason: "png_itxt_missing" };
      }
      __name(parseAruArchivePngItxt, "parseAruArchivePngItxt");
      function extractSourceFromAruArchivePayload(payload) {
        if (!payload || typeof payload !== "object") {
          return { status: "missing", url: null, reason: "png_itxt_no_url" };
        }
        for (const key of ARU_PAYLOAD_URL_KEYS) {
          const v = payload[key];
          if (typeof v === "string" && v.trim().length > 0) {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              return { status: "ok", url: t, reason: "png_itxt_source_found" };
            }
          }
        }
        const artworkId = (payload.artwork_id || "").trim();
        if (/^\d{6,12}$/.test(artworkId)) {
          return {
            status: "ok",
            url: `https://www.pixiv.net/artworks/${artworkId}`,
            reason: "png_itxt_artwork_id_fallback"
          };
        }
        return { status: "missing", url: null, reason: "png_itxt_no_url" };
      }
      __name(extractSourceFromAruArchivePayload, "extractSourceFromAruArchivePayload");
      async function parseSourceFromFile(file, _options) {
        if (isPngFile(file)) {
          const aruResult = await parseAruArchivePngItxt(file);
          if (aruResult.status === "ok") {
            return aruResult;
          }
          if (aruResult.status === "error") {
            console.debug("[Aru Source Captioner] png itxt fallback to exifr:", file.name, aruResult.reason);
          }
        }
        if (typeof exifr === "undefined" || !exifr || typeof exifr.parse !== "function") {
          const filenameUrl = parsePixivFilenameUrl(file.name);
          if (filenameUrl) {
            console.info("[Aru Source Captioner] filename fallback", {
              fileName: file.name,
              url: filenameUrl,
              reason: "exifr_unavailable"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "error", url: null, reason: "exifr_unavailable" };
        }
        const isWebp = typeof file.type === "string" && file.type === "image/webp" || typeof file.name === "string" && /\.webp$/i.test(file.name);
        let metadata;
        try {
          metadata = await exifr.parse(file, {
            xmp: true,
            exif: true,
            iptc: true,
            userComment: true
          });
        } catch (err) {
          console.warn("[Aru Source Captioner] exifr.parse failed —", `name=${file.name} type=${file.type || "unknown"} size=${file.size}B isWebp=${isWebp}`, err.message || err);
          const filenameUrl = parsePixivFilenameUrl(file.name);
          if (filenameUrl) {
            console.info("[Aru Source Captioner] filename fallback", {
              fileName: file.name,
              url: filenameUrl,
              reason: "exifr_parse_failed"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          if (isWebp) {
            return { status: "missing", url: null, reason: "webp_no_exif" };
          }
          return { status: "error", url: null, reason: "metadata_parse_failed" };
        }
        if (!metadata || typeof metadata !== "object") {
          const filenameUrl = parsePixivFilenameUrl(file.name);
          if (filenameUrl) {
            console.info("[Aru Source Captioner] filename fallback", {
              fileName: file.name,
              url: filenameUrl,
              reason: "no_metadata"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "missing", url: null, reason: "no_metadata" };
        }
        const candidates = extractSourceUrl(metadata);
        if (candidates.length === 0) {
          const filenameUrl = parsePixivFilenameUrl(file.name);
          if (filenameUrl) {
            console.info("[Aru Source Captioner] filename fallback", {
              fileName: file.name,
              url: filenameUrl,
              reason: "no_url_candidates"
            });
            return {
              status: "ok",
              url: filenameUrl,
              reason: "filename_fallback"
            };
          }
          return { status: "missing", url: null, reason: "no_url_candidates" };
        }
        return { status: "ok", url: candidates[0], reason: "ok" };
      }
      __name(parseSourceFromFile, "parseSourceFromFile");
      function isPixivUserUrl(s) {
        if (typeof s !== "string") {
          return false;
        }
        try {
          const u = new URL(s);
          return (u.hostname === "www.pixiv.net" || u.hostname === "pixiv.net") && /^\/users\/\d+/.test(u.pathname);
        } catch {
          return false;
        }
      }
      __name(isPixivUserUrl, "isPixivUserUrl");
      function extractSourceUrl(metadata) {
        if (!metadata || typeof metadata !== "object") {
          return [];
        }
        const candidates = [];
        collectFromPossibleAruJson(metadata, candidates);
        for (const key of ["Source", "source"]) {
          const v = metadata[key];
          if (typeof v === "string") {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              candidates.push(t);
            }
          }
        }
        for (const key of ["Identifier", "identifier"]) {
          const v = metadata[key];
          if (typeof v === "string") {
            const t = v.trim();
            if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
              candidates.push(t);
            } else if (/^\d{6,12}$/.test(t)) {
              candidates.push(`https://www.pixiv.net/artworks/${t}`);
            }
          } else if (Array.isArray(v)) {
            for (const item of v) {
              if (typeof item === "string") {
                const t = item.trim();
                if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
                  candidates.push(t);
                }
              }
            }
          }
        }
        collectUrlCandidates(metadata, candidates);
        const rawAll = [];
        walkStringFields(metadata, rawAll, 0);
        for (const u of rawAll) {
          if (!isPixivUserUrl(u)) {
            candidates.push(u);
          }
        }
        return uniqueOrdered(candidates);
      }
      __name(extractSourceUrl, "extractSourceUrl");
      function collectFromPossibleAruJson(metadata, candidates) {
        for (const field of TEXT_FIELDS_FOR_JSON) {
          const v = metadata[field];
          if (typeof v !== "string") {
            continue;
          }
          const obj = safeJsonParse(v);
          if (!obj || typeof obj !== "object") {
            continue;
          }
          for (const key of ["artwork_url", "source_url", "artworkUrl"]) {
            const urlVal = (obj[key] || "").trim();
            if (urlVal && /^https?:\/\//.test(urlVal) && !isPixivUserUrl(urlVal)) {
              candidates.push(urlVal);
            } else if (urlVal && isPixivUserUrl(urlVal)) {
              console.debug("[Aru Source Captioner] source candidate skipped (artist url):", { key, urlVal });
            }
          }
          const artworkId = (obj.artwork_id || "").trim();
          if (/^\d{6,12}$/.test(artworkId)) {
            candidates.push(`https://www.pixiv.net/artworks/${artworkId}`);
          }
          const origFilename = obj.original_filename;
          if (typeof origFilename === "string") {
            const filenameUrl = parsePixivFilenameUrl(origFilename);
            if (filenameUrl) {
              candidates.push(filenameUrl);
            }
          }
        }
      }
      __name(collectFromPossibleAruJson, "collectFromPossibleAruJson");
      function collectUrlCandidates(metadata, candidates) {
        for (const field of TEXT_FIELDS_FOR_JSON) {
          const v = metadata[field];
          if (typeof v !== "string") {
            continue;
          }
          const trimmed = v.trim();
          if (/^https?:\/\//.test(trimmed)) {
            candidates.push(trimmed);
          }
        }
      }
      __name(collectUrlCandidates, "collectUrlCandidates");
      function walkStringFields(value, candidates, depth) {
        if (depth > WALK_MAX_DEPTH) {
          return;
        }
        if (typeof value === "string") {
          const matches = value.match(URL_PATTERN);
          if (matches) {
            for (const m of matches) {
              candidates.push(m);
            }
          }
          return;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            walkStringFields(item, candidates, depth + 1);
          }
          return;
        }
        if (value && typeof value === "object") {
          for (const k of Object.keys(value)) {
            walkStringFields(value[k], candidates, depth + 1);
          }
        }
      }
      __name(walkStringFields, "walkStringFields");
      function safeJsonParse(text) {
        if (typeof text !== "string") {
          return null;
        }
        const trimmed = text.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return null;
        }
        try {
          return JSON.parse(trimmed);
        } catch (err) {
          console.warn("[Aru Source Captioner] JSON parse failed; fallback continues", {
            parser: "aru_json",
            error: String(err),
            sample: String(text).slice(0, 160)
          });
          return null;
        }
      }
      __name(safeJsonParse, "safeJsonParse");
      function uniqueOrdered(arr) {
        const seen = /* @__PURE__ */ new Set();
        const out = [];
        for (const item of arr) {
          if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
          }
        }
        return out;
      }
      __name(uniqueOrdered, "uniqueOrdered");
      function sanitizeSourceUrl(rawUrl, config) {
        if (typeof rawUrl !== "string") {
          return null;
        }
        const trimmed = rawUrl.trim();
        if (trimmed.length === 0) {
          return null;
        }
        let parsed;
        try {
          parsed = new URL(trimmed);
        } catch {
          return null;
        }
        const protocol = parsed.protocol;
        if (protocol === "https:") {
        } else if (protocol === "http:") {
          if (!config.allowHttp) {
            return null;
          }
        } else {
          return null;
        }
        if (config.strictAllowlist) {
          if (!isAllowedByPolicy(parsed.hostname, config)) {
            return null;
          }
        }
        return parsed.toString();
      }
      __name(sanitizeSourceUrl, "sanitizeSourceUrl");
      function isAllowedByPolicy(hostname, config) {
        if (typeof hostname !== "string" || hostname.length === 0) {
          return false;
        }
        if (!Array.isArray(config.allowedHosts)) {
          return false;
        }
        const h = hostname.toLowerCase();
        for (const allowed of config.allowedHosts) {
          if (typeof allowed !== "string") {
            continue;
          }
          const a = allowed.trim().toLowerCase();
          if (a.length === 0) {
            continue;
          }
          if (h === a) {
            return true;
          }
          if (h.endsWith("." + a)) {
            return true;
          }
        }
        return false;
      }
      __name(isAllowedByPolicy, "isAllowedByPolicy");
      function isMobileAutoInsertEnvironment() {
        try {
          const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
          const isAndroid = /Android/i.test(ua);
          const isCoarsePointer = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
          const isNarrow = typeof window !== "undefined" && window.innerWidth < 768;
          return isAndroid || isCoarsePointer && isNarrow;
        } catch {
          return false;
        }
      }
      __name(isMobileAutoInsertEnvironment, "isMobileAutoInsertEnvironment");
      const PIXEL_TABLE_ALLOWED_MIME = /* @__PURE__ */ new Set([
        "image/jpeg",
        "image/png",
        "image/webp"
      ]);
      const PIXEL_TABLE_DEFAULT_MAX_WIDTH = 800;
      const PIXEL_TABLE_DEFAULT_MAX_HEIGHT = 600;
      const PIXEL_TABLE_DEFAULT_CELL_SIZE = 4;
      const PIXEL_TABLE_MAX_CELLS = 5e4;
      function shouldUsePixelTableInsert(config, isMobile) {
        const mode = config.pixelTableMode ?? "off";
        if (mode === "manual") {
          return true;
        }
        if (mode === "auto_android") {
          return isMobile;
        }
        return false;
      }
      __name(shouldUsePixelTableInsert, "shouldUsePixelTableInsert");
      function validatePixelTableFile(file) {
        if (!PIXEL_TABLE_ALLOWED_MIME.has(file.type)) {
          return { valid: false, reason: `허용되지 않는 MIME: ${file.type}` };
        }
        return { valid: true };
      }
      __name(validatePixelTableFile, "validatePixelTableFile");
      async function loadImageBitmap(file) {
        if (typeof createImageBitmap === "function") {
          return await createImageBitmap(file);
        }
        return await new Promise((resolve, reject) => {
          const objectUrl = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`이미지 로드 실패: ${file.name}`));
          };
          img.src = objectUrl;
        });
      }
      __name(loadImageBitmap, "loadImageBitmap");
      async function renderPixelTableCanvas(file, config) {
        const cellSize = Math.max(1, config.pixelTableCellSize ?? PIXEL_TABLE_DEFAULT_CELL_SIZE);
        const maxW = config.pixelTableMaxWidth ?? PIXEL_TABLE_DEFAULT_MAX_WIDTH;
        const maxH = config.pixelTableMaxHeight ?? PIXEL_TABLE_DEFAULT_MAX_HEIGHT;
        const maxCols = Math.max(1, Math.floor(maxW / cellSize));
        const maxRows = Math.max(1, Math.floor(maxH / cellSize));
        const bitmapSource = await loadImageBitmap(file);
        const origWidth = bitmapSource.width;
        const origHeight = bitmapSource.height;
        const scale = Math.min(1, maxCols / origWidth, maxRows / origHeight);
        const tableWidth = Math.max(1, Math.floor(origWidth * scale));
        const tableHeight = Math.max(1, Math.floor(origHeight * scale));
        if (tableWidth * tableHeight > PIXEL_TABLE_MAX_CELLS) {
          if (typeof bitmapSource.close === "function") {
            bitmapSource.close();
          }
          throw new Error(`셀 수 초과: ${tableWidth * tableHeight} > ${PIXEL_TABLE_MAX_CELLS}`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = tableWidth;
        canvas.height = tableHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmapSource, 0, 0, tableWidth, tableHeight);
        if (typeof bitmapSource.close === "function") {
          bitmapSource.close();
        }
        const imageData = ctx.getImageData(0, 0, tableWidth, tableHeight);
        return { pixels: imageData.data, tableWidth, tableHeight };
      }
      __name(renderPixelTableCanvas, "renderPixelTableCanvas");
      function buildPixelTable(pixels, tableWidth, tableHeight, config) {
        const cellSize = Math.max(1, config.pixelTableCellSize ?? PIXEL_TABLE_DEFAULT_CELL_SIZE);
        const cellPx = `${cellSize}px`;
        const table = document.createElement("table");
        table.style.borderCollapse = "collapse";
        table.style.lineHeight = "0";
        table.dataset.aruPixelTable = "1";
        for (let row = 0; row < tableHeight; row++) {
          const tr = document.createElement("tr");
          for (let col = 0; col < tableWidth; col++) {
            const idx = (row * tableWidth + col) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            const td = document.createElement("td");
            td.style.width = cellPx;
            td.style.height = cellPx;
            td.style.padding = "0";
            td.style.border = "none";
            td.style.backgroundColor = `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        return table;
      }
      __name(buildPixelTable, "buildPixelTable");
      function insertPixelTableWithCaption(editor, table, sourceUrl, fileName) {
        const wrapper = document.createElement("p");
        wrapper.style.textAlign = "center";
        wrapper.dataset.aruPixelTableWrapper = "1";
        wrapper.appendChild(table);
        editor.appendChild(wrapper);
        if (sourceUrl) {
          editor.appendChild(createSourceCaption(sourceUrl));
        } else {
          console.log("[Aru Source Captioner] pixelTable: no source URL — caption omitted", { fileName });
        }
      }
      __name(insertPixelTableWithCaption, "insertPixelTableWithCaption");
      async function handlePixelTableInsert(images, config, _isMobile) {
        const editor = findEditorRoot();
        if (!editor) {
          console.warn("[Aru Source Captioner] pixelTable: no editor found — cannot insert");
          return;
        }
        for (const file of images) {
          const validation = validatePixelTableFile(file);
          if (!validation.valid) {
            console.warn("[Aru Source Captioner] pixelTable: file rejected —", validation.reason, { name: file.name });
            continue;
          }
          let pixels, tableWidth, tableHeight;
          try {
            ({ pixels, tableWidth, tableHeight } = await renderPixelTableCanvas(file, config));
          } catch (err) {
            console.warn("[Aru Source Captioner] pixelTable: canvas render failed:", err);
            continue;
          }
          const table = buildPixelTable(pixels, tableWidth, tableHeight, config);
          let sourceUrl = null;
          try {
            const sourceInfo = await parseSourceFromFile(file);
            if (sourceInfo?.status === "ok" && sourceInfo.url) {
              sourceUrl = sanitizeSourceUrl(sourceInfo.url, config ?? { ...DEFAULT_OPTIONS });
            }
          } catch (err) {
            console.debug("[Aru Source Captioner] pixelTable: parseSourceFromFile failed:", err);
          }
          try {
            insertPixelTableWithCaption(editor, table, sourceUrl, file.name);
            console.info("[Aru Source Captioner] pixelTable: inserted", {
              name: file.name,
              tableWidth,
              tableHeight,
              hasCaption: !!sourceUrl
            });
          } catch (err) {
            console.warn("[Aru Source Captioner] pixelTable: insert failed:", err);
          }
        }
      }
      __name(handlePixelTableInsert, "handlePixelTableInsert");
      function findEditorRoot() {
        for (const selector of EDITOR_ROOT_SELECTORS) {
          const root = document.querySelector(selector);
          if (root instanceof HTMLElement) {
            return root;
          }
        }
        return null;
      }
      __name(findEditorRoot, "findEditorRoot");
      function startEditorObserver(config) {
        const Controller = attribution2?.Controller;
        if (!Controller) {
          return null;
        }
        uploadAttribution = new Controller({
          document,
          parse: /* @__PURE__ */ __name((file) => parseSourceFromFile(file, {
            allowLooseFilenameFallback: !isMobileAutoInsertEnvironment()
          }), "parse"),
          sanitize: /* @__PURE__ */ __name((url) => sanitizeSourceUrl(url, config), "sanitize"),
          caption: createSourceCaption,
          anchor: findImageParagraph,
          existing: hasExistingSourceCaption,
          onStatus: publishUploadStatus
        });
        window.addEventListener("pagehide", () => uploadAttribution?.destroy(), {
          once: true
        });
        return uploadAttribution;
      }
      __name(startEditorObserver, "startEditorObserver");
      function findImageParagraph(img) {
        return img.closest("p") || img;
      }
      __name(findImageParagraph, "findImageParagraph");
      function hasExistingSourceCaption(img) {
        const anchor = findImageParagraph(img);
        const next = anchor.nextElementSibling;
        if (!next) {
          return false;
        }
        if (next instanceof HTMLElement && next.dataset?.aruSourceCaption === "1") {
          return true;
        }
        const text = (next.textContent || "").trim();
        if (text.startsWith("출처:")) {
          const a = next.querySelector?.("a[href]");
          if (a) {
            return true;
          }
        }
        return false;
      }
      __name(hasExistingSourceCaption, "hasExistingSourceCaption");
      function createSourceCaption(url) {
        const p = document.createElement("p");
        p.className = "aru-source-caption";
        p.style.textAlign = "center";
        p.dataset.aruSourceCaption = "1";
        p.appendChild(document.createTextNode("출처: "));
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = url;
        p.appendChild(a);
        return p;
      }
      __name(createSourceCaption, "createSourceCaption");
      const READ_PATH_PATTERN = /^\/community\/board\/[^/]+\/read\/[^/?]+/;
      function isReadPage() {
        try {
          return READ_PATH_PATTERN.test(location.pathname);
        } catch {
          return false;
        }
      }
      __name(isReadPage, "isReadPage");
      const COMMENT_TEXTAREA_SELECTOR = [
        // 일반 댓글
        'textarea[name="comment_input"]',
        'textarea[id="comment_input"]',
        'textarea[class~="comment_input"]',
        'textarea[name^="comment_input"]',
        // comment_input_<id>
        'textarea[id^="comment_input"]',
        'textarea[class*="comment_input"]',
        // class에 comment_input 부분 매칭
        // 대댓글 (Ruliweb: name="reply_input", class="common_input reply_input")
        'textarea[name="reply_input"]',
        'textarea[name^="reply_input"]',
        // reply_input_<id>
        'textarea[class~="reply_input"]',
        'textarea[class*="reply_input"]',
        // 다른 변형 패턴 (보존)
        'textarea[name^="re_comment_input"]',
        'textarea[id^="re_comment_input"]',
        'textarea[class*="re_comment"]'
      ].join(", ");
      const COMMENT_IMG_BUTTON_SELECTOR = ".common_img_button";
      const COMMENT_FILE_INPUT_SELECTOR = "input.common_img_input, input[type='file']";
      const COMMENT_BOUND_DATASET_KEY = "aruSourceCommentBound";
      const COMMENT_BUTTON_CLASS = "aru-source-caption-comment-button";
      function handleCommentSourceButtonClick(textarea) {
        console.log("[Aru Source Captioner] click: button clicked");
        if (!(textarea instanceof HTMLTextAreaElement)) {
          console.warn("[Aru Source Captioner] click: textarea reference is not a textarea");
          return;
        }
        if (!document.contains(textarea)) {
          console.warn("[Aru Source Captioner] click: textarea is detached from DOM, re-scanning...");
          try {
            setupCommentSourceCaptioner();
          } catch (err) {
            console.debug("[Aru Source Captioner] click: re-scan failed:", err);
          }
          return;
        }
        const wrapper = resolveCommentWrapperForTextarea(textarea);
        const savedSource = wrapper ? wrapperSourceMap.get(wrapper) : null;
        if (!savedSource) {
          console.log("[Aru Source Captioner] click: no extracted source — image not attached or has no Aru metadata");
          try {
            alert("이미지에 출처 metadata가 없습니다.\nAru Archive로 처리한 이미지를 댓글에 첨부해 주세요.");
          } catch {
          }
          return;
        }
        console.log("[Aru Source Captioner] click: using stored source =", savedSource);
        const sourceText = buildCommentSourceText(savedSource);
        const result2 = insertSourceIntoCommentTextarea(textarea, sourceText);
        console.log("[Aru Source Captioner] click: insertion result =", result2);
      }
      __name(handleCommentSourceButtonClick, "handleCommentSourceButtonClick");
      const COMMENT_FILE_BOUND_DATASET_KEY = "aruSourceFileBound";
      const COMMENT_SOURCE_PREFIX = "출처:";
      const wrapperSourceMap = /* @__PURE__ */ new WeakMap();
      let readPageConfig = null;
      function resolveCommentWrapperForTextarea(textarea) {
        const outer = textarea.closest(".border_box.after_clear");
        if (outer) {
          return outer;
        }
        const borderBox = textarea.closest(".border_box");
        if (borderBox) {
          return borderBox;
        }
        const formish = textarea.closest("form, fieldset");
        if (formish) {
          return formish;
        }
        const innerWrapper = textarea.closest(".common_input_wrapper");
        if (innerWrapper?.parentElement) {
          return innerWrapper.parentElement;
        }
        return textarea.parentElement?.parentElement || textarea.parentElement || null;
      }
      __name(resolveCommentWrapperForTextarea, "resolveCommentWrapperForTextarea");
      function classifyAndPushWrapper(wrapper, result2) {
        const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
        if (!(textarea instanceof HTMLTextAreaElement)) {
          return;
        }
        const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);
        result2.push(wrapper);
        const textareaInfo = {
          name: textarea.name,
          id: textarea.id,
          className: textarea.className
        };
        if (imgButton) {
          console.log("[Aru Source Captioner] scan: wrapper OK (has textarea + .common_img_button)", { wrapper, textarea: textareaInfo });
        } else {
          console.log("[Aru Source Captioner] scan: wrapper has textarea but no .common_img_button — will use textarea position", { wrapper, textarea: textareaInfo });
        }
      }
      __name(classifyAndPushWrapper, "classifyAndPushWrapper");
      function findCommentInputWrappers() {
        const textareas = document.querySelectorAll(COMMENT_TEXTAREA_SELECTOR);
        console.log(`[Aru Source Captioner] scan: found ${textareas.length} comment textarea candidates`);
        const wrappers = /* @__PURE__ */ new Set();
        for (const textarea of textareas) {
          if (!(textarea instanceof HTMLTextAreaElement)) {
            continue;
          }
          const wrapper = resolveCommentWrapperForTextarea(textarea);
          if (wrapper instanceof HTMLElement) {
            wrappers.add(wrapper);
          }
        }
        const result2 = [];
        for (const wrapper of wrappers) {
          classifyAndPushWrapper(wrapper, result2);
        }
        console.log(`[Aru Source Captioner] scan: ${result2.length} comment wrappers identified`);
        return result2;
      }
      __name(findCommentInputWrappers, "findCommentInputWrappers");
      function buildCommentSourceText(sourceUrl) {
        return `${COMMENT_SOURCE_PREFIX} ${sourceUrl}
`;
      }
      __name(buildCommentSourceText, "buildCommentSourceText");
      function logCommentInsertSkip(reason, detail) {
        console.debug("[Aru Source Captioner] comment insert skipped:", reason, detail || "");
      }
      __name(logCommentInsertSkip, "logCommentInsertSkip");
      function focusTextareaSafe(textarea) {
        try {
          textarea.focus();
        } catch {
        }
      }
      __name(focusTextareaSafe, "focusTextareaSafe");
      function checkInsertSkipReason(textarea, existing, sourceLine, newValue) {
        if (existing.includes(sourceLine)) {
          focusTextareaSafe(textarea);
          console.log("[Aru Source Captioner] insert: same source already present — focus only");
          logCommentInsertSkip("duplicate_source_line");
          return "duplicate";
        }
        if (/(^|\n)\s*출처\s*:\s*\S/.test(existing)) {
          focusTextareaSafe(textarea);
          console.log("[Aru Source Captioner] insert: different source already present — skipped");
          logCommentInsertSkip("other_source_present");
          return "different-source";
        }
        const maxLen = typeof textarea.maxLength === "number" ? textarea.maxLength : -1;
        if (maxLen > 0 && newValue.length > maxLen) {
          console.warn("[Aru Source Captioner] insert: maxLength exceeded — skipped", {
            newLength: newValue.length,
            maxLength: maxLen
          });
          logCommentInsertSkip("maxlength_exceeded", {
            maxLen,
            newLen: newValue.length
          });
          return "too-long";
        }
        return null;
      }
      __name(checkInsertSkipReason, "checkInsertSkipReason");
      function buildMergedTextareaValue(existing, sourceText) {
        if (existing.trim().length === 0) {
          return sourceText;
        }
        return existing.replace(/\s+$/u, "") + "\n\n" + sourceText;
      }
      __name(buildMergedTextareaValue, "buildMergedTextareaValue");
      function applyTextareaValue(textarea, newValue) {
        textarea.value = newValue;
        console.log("[Aru Source Captioner] insert: value set", {
          actualValue: typeof textarea.value === "string" ? textarea.value.slice(0, 50) : null,
          valueMatches: textarea.value === newValue,
          valueLength: typeof textarea.value === "string" ? textarea.value.length : -1
        });
        const cursorPos = newValue.length;
        try {
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
        } catch {
        }
        try {
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (err) {
          console.debug("[Aru Source Captioner] event dispatch failed:", err);
        }
      }
      __name(applyTextareaValue, "applyTextareaValue");
      function insertSourceIntoCommentTextarea(textarea, sourceText) {
        if (!(textarea instanceof HTMLTextAreaElement)) {
          console.warn("[Aru Source Captioner] insert: not a textarea element");
          return "not-textarea";
        }
        const existing = typeof textarea.value === "string" ? textarea.value : "";
        const sourceLine = sourceText.split("\n")[0];
        console.log("[Aru Source Captioner] insert: called", {
          textareaExists: true,
          inDOM: document.contains(textarea),
          currentValue: existing.slice(0, 50),
          maxLength: textarea.maxLength
        });
        const newValue = buildMergedTextareaValue(existing, sourceText);
        const skip = checkInsertSkipReason(textarea, existing, sourceLine, newValue);
        if (skip) {
          return skip;
        }
        applyTextareaValue(textarea, newValue);
        console.log("[Aru Source Captioner] insert: completed successfully");
        return "ok";
      }
      __name(insertSourceIntoCommentTextarea, "insertSourceIntoCommentTextarea");
      function injectCommentSourceButton(wrapper) {
        if (!(wrapper instanceof HTMLElement)) {
          return false;
        }
        if (wrapper.dataset[COMMENT_BOUND_DATASET_KEY] === "1") {
          console.log("[Aru Source Captioner] inject: skipped (already bound)", wrapper);
          return false;
        }
        const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
        if (!(textarea instanceof HTMLTextAreaElement)) {
          console.log("[Aru Source Captioner] inject: skipped (no textarea)", wrapper);
          return false;
        }
        if (wrapper.querySelector("." + COMMENT_BUTTON_CLASS)) {
          wrapper.dataset[COMMENT_BOUND_DATASET_KEY] = "1";
          console.log("[Aru Source Captioner] inject: skipped (button already in this wrapper)", wrapper);
          return false;
        }
        const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);
        const button = document.createElement("button");
        button.type = "button";
        button.className = COMMENT_BUTTON_CLASS;
        button.textContent = "출처 추가";
        button.title = "현재 게시글 URL을 댓글에 출처로 추가합니다";
        button.dataset.aruSourceCommentButton = "1";
        button.addEventListener("click", (ev) => {
          try {
            ev.preventDefault();
          } catch {
          }
          try {
            ev.stopPropagation();
          } catch {
          }
          handleCommentSourceButtonClick(textarea);
        });
        try {
          if (imgButton instanceof HTMLElement) {
            imgButton.after(button);
          } else {
            textarea.after(button);
            console.log("[Aru Source Captioner] inject: used textarea fallback (no .common_img_button)", { wrapper, textarea });
          }
        } catch (err) {
          console.debug("[Aru Source Captioner] comment button insert failed:", err);
          return false;
        }
        console.log("[Aru Source Captioner] inject: button added", { wrapper });
        return true;
      }
      __name(injectCommentSourceButton, "injectCommentSourceButton");
      function hookCommentFileInput(wrapper, config) {
        if (!(wrapper instanceof HTMLElement)) {
          return false;
        }
        const fileInput = wrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR);
        if (!(fileInput instanceof HTMLInputElement)) {
          console.log("[Aru Source Captioner] file: no file input in wrapper", wrapper);
          return false;
        }
        if (fileInput.type !== "file") {
          return false;
        }
        if (fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY] === "1") {
          return false;
        }
        fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY] = "1";
        fileInput.addEventListener("change", async (event) => {
          const target = event.target;
          const files = target instanceof HTMLInputElement ? target.files : null;
          if (!files || files.length === 0) {
            return;
          }
          let imageFile = null;
          for (const f of files) {
            if (f && typeof f.type === "string" && f.type.startsWith("image/")) {
              imageFile = f;
              break;
            }
          }
          if (!imageFile) {
            console.log("[Aru Source Captioner] file: no image in selection");
            return;
          }
          console.log("[Aru Source Captioner] file: extracting metadata from", imageFile.name);
          let sourceInfo;
          try {
            sourceInfo = await parseSourceFromFile(imageFile);
          } catch (err) {
            console.warn("[Aru Source Captioner] file: metadata extraction threw", err);
            return;
          }
          if (sourceInfo?.status !== "ok" || !sourceInfo.url) {
            console.log("[Aru Source Captioner] file: no Aru source metadata found in image", { reason: sourceInfo?.reason });
            return;
          }
          const safeUrl = sanitizeSourceUrl(sourceInfo.url, config);
          if (!safeUrl) {
            console.log("[Aru Source Captioner] file: extracted source rejected by sanitizer", { rawUrl: sourceInfo.url });
            return;
          }
          console.log("[Aru Source Captioner] file: extracted source =", safeUrl);
          wrapperSourceMap.set(wrapper, safeUrl);
          const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
          if (textarea instanceof HTMLTextAreaElement) {
            const sourceText = buildCommentSourceText(safeUrl);
            const result2 = insertSourceIntoCommentTextarea(textarea, sourceText);
            console.log("[Aru Source Captioner] file: auto insertion result =", result2);
          } else {
            console.log("[Aru Source Captioner] file: source stored, but no textarea found for auto insert", wrapper);
          }
        });
        console.log("[Aru Source Captioner] file: hooked file input change", {
          wrapper,
          fileInput
        });
        return true;
      }
      __name(hookCommentFileInput, "hookCommentFileInput");
      function setupCommentSourceCaptioner(config = void 0) {
        if (!isReadPage()) {
          return;
        }
        const effectiveConfig = config || readPageConfig;
        const wrappers = findCommentInputWrappers();
        let injected = 0;
        let hookedFileInputs = 0;
        for (const wrapper of wrappers) {
          if (wrapper.dataset[COMMENT_BOUND_DATASET_KEY] !== "1") {
            const ok = injectCommentSourceButton(wrapper);
            if (ok) {
              wrapper.dataset[COMMENT_BOUND_DATASET_KEY] = "1";
              injected++;
            }
          }
          if (effectiveConfig && hookCommentFileInput(wrapper, effectiveConfig)) {
            hookedFileInputs++;
          }
        }
        if (wrappers.length === 0) {
          console.log("[Aru Source Captioner] setup: no comment wrapper found yet (may load later)");
        } else if (injected > 0 || hookedFileInputs > 0) {
          console.log(`[Aru Source Captioner] setup: injected ${injected} new buttons, hooked ${hookedFileInputs} new file inputs`);
        }
      }
      __name(setupCommentSourceCaptioner, "setupCommentSourceCaptioner");
      let commentObserver = null;
      let commentObserverScheduled = false;
      function scheduleCommentSetup() {
        if (commentObserverScheduled) {
          return;
        }
        commentObserverScheduled = true;
        Promise.resolve().then(() => {
          commentObserverScheduled = false;
          try {
            setupCommentSourceCaptioner();
          } catch (err) {
            console.debug("[Aru Source Captioner] comment setup failed:", err);
          }
        });
      }
      __name(scheduleCommentSetup, "scheduleCommentSetup");
      function startCommentObserver() {
        if (!isReadPage()) {
          return null;
        }
        if (commentObserver) {
          return commentObserver;
        }
        commentObserver = new MutationObserver((mutations) => {
          for (const mut of mutations) {
            if (mut.type !== "childList") {
              continue;
            }
            if (mut.addedNodes && mut.addedNodes.length > 0) {
              scheduleCommentSetup();
              return;
            }
          }
        });
        if (document.body) {
          commentObserver.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
        let attempts = 0;
        const maxAttempts = 30;
        const pollIntervalId = setInterval(() => {
          attempts++;
          try {
            setupCommentSourceCaptioner();
          } catch (err) {
            console.debug("[Aru Source Captioner] poll setup failed:", err);
          }
          if (attempts >= maxAttempts) {
            clearInterval(pollIntervalId);
            console.log("[Aru Source Captioner] poll: stopping after 15s (MutationObserver continues)");
          }
        }, 500);
        console.log("[Aru Source Captioner] observer: started (polling 15s + MutationObserver)");
        return commentObserver;
      }
      __name(startCommentObserver, "startCommentObserver");
      const RULIWEB_AI_BLIND_SELECTOR = "#board_read.ai_blind";
      const RULIWEB_BOARD_MAIN_VIEW_PRIMARY = "#board_read.ai_blind .board_main_view";
      const RULIWEB_BOARD_MAIN_VIEW_FALLBACK = "#board_read .board_main_view";
      const RULIWEB_UNSAFE_CLICK_SELECTOR = "a, button, input, textarea, select, iframe";
      const RULIWEB_REVEAL_RETRY_DELAYS_MS = [300, 800, 1500];
      const RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS = 5e3;
      function isRuliwebReadPage() {
        return isReadPage();
      }
      __name(isRuliwebReadPage, "isRuliwebReadPage");
      function hasRuliwebAiBlind() {
        return !!document.querySelector(RULIWEB_AI_BLIND_SELECTOR);
      }
      __name(hasRuliwebAiBlind, "hasRuliwebAiBlind");
      function _findBoardMainView() {
        return document.querySelector(RULIWEB_BOARD_MAIN_VIEW_PRIMARY) || document.querySelector(RULIWEB_BOARD_MAIN_VIEW_FALLBACK);
      }
      __name(_findBoardMainView, "_findBoardMainView");
      function getPseudoElementContent(el, pseudo) {
        try {
          const raw = window.getComputedStyle(el, pseudo).getPropertyValue("content");
          if (!raw || raw === "none" || raw === "normal" || raw === '""') {
            return "";
          }
          return raw.replace(/^["']|["']$/g, "").replace(/\\A/g, " ").replace(/\s+/g, " ").trim();
        } catch {
          return "";
        }
      }
      __name(getPseudoElementContent, "getPseudoElementContent");
      function getRuliwebRevealOverlayText() {
        const candidates = [
          document.querySelector("#board_read.ai_blind .board_main_view"),
          document.querySelector("#board_read .board_main_view"),
          document.querySelector(".board_main_view")
        ].filter(Boolean);
        const parts = [];
        for (const el of candidates) {
          const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
          if (text) {
            parts.push(text);
          }
          const before = getPseudoElementContent(el, "::before");
          if (before) {
            parts.push(before);
          }
          const after = getPseudoElementContent(el, "::after");
          if (after) {
            parts.push(after);
          }
        }
        return parts.join(" ").replace(/\s+/g, " ").trim();
      }
      __name(getRuliwebRevealOverlayText, "getRuliwebRevealOverlayText");
      function normalizeRuliwebOverlayText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
      }
      __name(normalizeRuliwebOverlayText, "normalizeRuliwebOverlayText");
      function normalizeKeyword(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
      }
      __name(normalizeKeyword, "normalizeKeyword");
      function normalizeKeywordList(keywords) {
        if (!Array.isArray(keywords)) {
          return typeof keywords === "string" && keywords.trim() ? [normalizeKeyword(keywords)] : [];
        }
        return keywords.map(normalizeKeyword).filter(Boolean);
      }
      __name(normalizeKeywordList, "normalizeKeywordList");
      function hasKeyword(text, keywords) {
        const normalizedText = normalizeRuliwebOverlayText(text);
        return normalizeKeywordList(keywords).some((keyword) => keyword && normalizedText.includes(keyword));
      }
      __name(hasKeyword, "hasKeyword");
      function shouldOpenRuliwebOverlayByKeywords(overlayText, config) {
        const allowKeywords = config && config.ruliwebAiRevealAllowKeywords || DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
        const blockKeywords = config && config.ruliwebAiRevealBlockKeywords || DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
        const blocked = hasKeyword(overlayText, blockKeywords);
        const allowed = hasKeyword(overlayText, allowKeywords);
        return { shouldOpen: allowed && !blocked, allowed, blocked };
      }
      __name(shouldOpenRuliwebOverlayByKeywords, "shouldOpenRuliwebOverlayByKeywords");
      function _dispatchPointerMouseSequence(el, x, y) {
        const hasPointerEvent = typeof PointerEvent === "function";
        const mkMouse = /* @__PURE__ */ __name((type) => new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y
        }), "mkMouse");
        const mkPointer = /* @__PURE__ */ __name((type) => new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true
        }), "mkPointer");
        if (hasPointerEvent) {
          el.dispatchEvent(mkPointer("pointerdown"));
        }
        el.dispatchEvent(mkMouse("mousedown"));
        if (hasPointerEvent) {
          el.dispatchEvent(mkPointer("pointerup"));
        }
        el.dispatchEvent(mkMouse("mouseup"));
        el.dispatchEvent(mkMouse("click"));
      }
      __name(_dispatchPointerMouseSequence, "_dispatchPointerMouseSequence");
      function _tryRuliwebOverlayClickOnce(config) {
        const boardMainView = _findBoardMainView();
        if (!boardMainView) {
          console.debug("[Aru][reveal] .board_main_view not found");
          return false;
        }
        const overlayText = getRuliwebRevealOverlayText();
        const { shouldOpen, allowed, blocked } = shouldOpenRuliwebOverlayByKeywords(overlayText, config);
        const allowKeywords = config && config.ruliwebAiRevealAllowKeywords || DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
        const blockKeywords = config && config.ruliwebAiRevealBlockKeywords || DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
        console.info("[Aru][reveal] overlay keyword decision", {
          overlayText: overlayText.slice(0, 200),
          allowKeywords,
          blockKeywords,
          allowed,
          blocked,
          shouldOpen
        });
        if (!shouldOpen) {
          if (blocked) {
            console.info("[Aru][reveal] skip overlay: blocked keyword matched");
          } else {
            console.info("[Aru][reveal] skip overlay: no allow keyword matched");
          }
          return false;
        }
        const rect = boardMainView.getBoundingClientRect();
        const cx = Math.round(rect.left + rect.width / 2);
        const cy = Math.round(rect.top + Math.min(rect.height * 0.45, 260));
        const pointEl = document.elementFromPoint(cx, cy);
        if (!pointEl) {
          console.debug("[Aru][reveal] elementFromPoint returned null", {
            cx,
            cy
          });
          return false;
        }
        const unsafe = pointEl.closest(RULIWEB_UNSAFE_CLICK_SELECTOR);
        if (unsafe) {
          console.warn("[Aru][reveal] click aborted — unsafe element at overlay center", {
            pointTag: pointEl.tagName,
            unsafeTag: unsafe.tagName,
            unsafeHref: unsafe.href || "(none)"
          });
          return false;
        }
        console.log("[Aru][reveal] overlay click target", {
          x: cx,
          y: cy,
          tag: pointEl.tagName,
          id: pointEl.id || "(none)",
          className: (pointEl.className || "").toString().slice(0, 60),
          href: pointEl.href || "(none)"
        });
        const hrefBefore = location.href;
        _dispatchPointerMouseSequence(pointEl, cx, cy);
        setTimeout(() => {
          if (location.href !== hrefBefore) {
            console.error("[Aru][reveal] URL changed after overlay click", {
              beforeUrl: hrefBefore,
              afterUrl: location.href
            });
          }
          const hasAiBlind = hasRuliwebAiBlind();
          const imgCount = document.querySelectorAll(".view_content img").length;
          const viewContent = document.querySelector(".view_content");
          const textLength = viewContent ? (viewContent.textContent || "").length : 0;
          console.log("[Aru][reveal] after overlay click", {
            hasAiBlind,
            imgCount,
            textLength
          });
        }, 300);
        return true;
      }
      __name(_tryRuliwebOverlayClickOnce, "_tryRuliwebOverlayClickOnce");
      function _setupRuliwebClickWithRetry(config) {
        let done = false;
        function attempt() {
          if (done) {
            return;
          }
          if (_tryRuliwebOverlayClickOnce(config)) {
            done = true;
          }
        }
        __name(attempt, "attempt");
        attempt();
        if (done) {
          return;
        }
        RULIWEB_REVEAL_RETRY_DELAYS_MS.forEach((delay) => {
          setTimeout(attempt, delay);
        });
        const obs = new MutationObserver(() => {
          if (done) {
            obs.disconnect();
            return;
          }
          attempt();
          if (done) {
            obs.disconnect();
          }
        });
        obs.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
        setTimeout(() => {
          done = true;
          obs.disconnect();
        }, RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS);
      }
      __name(_setupRuliwebClickWithRetry, "_setupRuliwebClickWithRetry");
      function restoreRuliwebMetaDescription() {
        const meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          console.debug("[Aru][reveal] text_fallback: no meta description found");
          return false;
        }
        const text = (meta.content || "").trim();
        if (!text) {
          console.debug("[Aru][reveal] text_fallback: meta description is empty");
          return false;
        }
        const viewContent = document.querySelector(".view_content");
        if (!viewContent) {
          console.debug("[Aru][reveal] text_fallback: .view_content not found");
          return false;
        }
        const p = document.createElement("p");
        p.textContent = text;
        p.dataset.aruMetaFallback = "1";
        viewContent.prepend(p);
        console.info("[Aru][reveal] text_fallback: meta description prepended (images not restored)");
        return true;
      }
      __name(restoreRuliwebMetaDescription, "restoreRuliwebMetaDescription");
      function setupRuliwebAiReveal(config) {
        const mode = config.ruliwebAiRevealMode ?? "off";
        console.log("[Aru][reveal] setup", {
          mode,
          href: location.href,
          isRead: isRuliwebReadPage(),
          hasBoardRead: !!document.querySelector("#board_read"),
          hasAiBlind: hasRuliwebAiBlind(),
          hasBoardMainView: !!_findBoardMainView()
        });
        if (mode === "off") {
          return;
        }
        if (!isRuliwebReadPage()) {
          return;
        }
        if (mode === "click_overlay") {
          _setupRuliwebClickWithRetry(config);
          return;
        }
        if (mode === "text_fallback") {
          restoreRuliwebMetaDescription();
          return;
        }
      }
      __name(setupRuliwebAiReveal, "setupRuliwebAiReveal");
      async function init() {
        console.info("[Aru Source Captioner] content loaded", {
          href: location.href,
          userAgent: navigator.userAgent,
          exifrAvailable: typeof exifr !== "undefined"
        });
        const config = await loadConfig();
        if (!config.enabled) {
          console.info("[Aru Source Captioner] disabled — skipping content script");
          return;
        }
        if (isReadPage()) {
          readPageConfig = config;
          setupCommentSourceCaptioner(config);
          startCommentObserver();
          setupRuliwebAiReveal(config);
          console.info("[Aru Source Captioner] read page active — comment source button enabled", {
            strictAllowlist: config.strictAllowlist,
            allowHttp: config.allowHttp
          });
          return;
        }
        if (typeof exifr === "undefined") {
          console.warn("[Aru Source Captioner] exifr not loaded — running in filename-only fallback mode");
        }
        attachFileInputListeners(config);
        startEditorObserver(config);
        console.info("[Aru Source Captioner] phase 2B active — caption insertion enabled", {
          strictAllowlist: config.strictAllowlist,
          allowHttp: config.allowHttp
        });
      }
      __name(init, "init");
      init().catch((err) => {
        console.warn("[Aru Source Captioner] init failed:", err);
      });
    }, "bootstrap");
    runBootstrap1();
    return {};
  }
  __name(installWhaleContent, "installWhaleContent");

  // docs/source/compat/platform-whale-content.mjs
  var attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
  var result = installWhaleContent({ environment: globalThis, dependencies: { attribution: { "Controller": /* @__PURE__ */ __name(() => attribution["Controller"], "Controller") } } });
})();
