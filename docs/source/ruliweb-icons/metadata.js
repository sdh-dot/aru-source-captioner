// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/ruliweb-icons/metadata-core.mjs
  function createMetadataCore(environment = globalThis) {
    const LIMITS = Object.freeze({ decodedBytes: 1048576, icons: 1e4, sources: 512 });
    const LOCAL_ID = /^[A-Za-z0-9_-]{1,64}$/;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const MEDIA_KINDS = ["image", "video", "animated", "unknown"];
    class MetadataError extends Error {
      static {
        __name(this, "MetadataError");
      }
      constructor(code, message) {
        super(message);
        this.name = "MetadataError";
        this.code = code;
      }
    }
    function fail(code, message) {
      throw new MetadataError(code, message);
    }
    __name(fail, "fail");
    function object(value, label, allowed, required = allowed) {
      if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_STRUCTURE", label + ": 객체가 필요합니다.");
      if (allowed && Object.keys(value).some((key) => !allowed.includes(key))) fail("UNKNOWN_FIELD", label + ": 지원하지 않는 필드가 있습니다.");
      if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) fail("MISSING_FIELD", label + ": 필수 필드가 없습니다.");
    }
    __name(object, "object");
    function integer(value, min, max, label) {
      if (!Number.isSafeInteger(value) || value < min || value > max) fail("INVALID_NUMBER", label + ": 숫자 범위가 올바르지 않습니다.");
    }
    __name(integer, "integer");
    function text(value, min, max, label) {
      if (typeof value !== "string" || [...value].length < min || [...value].length > max || min && !value.trim()) fail("INVALID_TEXT", label + ": 텍스트 길이/내용이 올바르지 않습니다.");
    }
    __name(text, "text");
    function array(value, min, max, label, unique = false) {
      if (!Array.isArray(value) || value.length < min || value.length > max) fail("INVALID_ARRAY", label + ": 항목 수가 올바르지 않습니다.");
      if (unique && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) fail("DUPLICATE_VALUE", label + ": 중복 항목이 있습니다.");
    }
    __name(array, "array");
    function localId(value, label) {
      if (typeof value !== "string" || !LOCAL_ID.test(value)) fail("INVALID_ID", label + ": 식별자가 올바르지 않습니다.");
    }
    __name(localId, "localId");
    function articleId(value, label) {
      integer(value, 1, Number.MAX_SAFE_INTEGER, label);
    }
    __name(articleId, "articleId");
    function uuid(value, label) {
      if (typeof value !== "string" || !UUID.test(value)) fail("INVALID_ID", label + ": UUID가 올바르지 않습니다.");
    }
    __name(uuid, "uuid");
    function mediaUrl(value) {
      if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value) || !/^https:\/\/i[123]\.ruliweb\.com\//u.test(value)) fail("UNSAFE_URL", "허용된 HTTPS 루리웹 CDN URL이 아닙니다.");
      let parsed;
      try {
        parsed = new URL(value);
      } catch (_) {
        fail("UNSAFE_URL", "미디어 URL을 해석할 수 없습니다.");
      }
      if (parsed.protocol !== "https:" || !/^i[123]\.ruliweb\.com$/u.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.hash) fail("UNSAFE_URL", "미디어 URL에 허용되지 않은 주소 요소가 있습니다.");
      return value;
    }
    __name(mediaUrl, "mediaUrl");
    function publicArticleUrl(id, mobile = false) {
      articleId(id, "articleId");
      return "https://" + (mobile ? "m" : "bbs") + ".ruliweb.com/community/board/98/read/" + id;
    }
    __name(publicArticleUrl, "publicArticleUrl");
    function decodeCarrier(encoded) {
      if (typeof encoded !== "string" || encoded.length > Math.ceil(LIMITS.decodedBytes * 4 / 3) + 65536) fail("RESOURCE_LIMIT", "메타데이터 크기 상한을 초과했습니다.");
      const compact = encoded.replace(/\s/gu, "");
      if (!compact || !/^[A-Za-z0-9_+\/-]+={0,2}$/u.test(compact)) fail("INVALID_BASE64", "메타데이터 base64 형식이 올바르지 않습니다.");
      const unpadded = compact.replace(/=+$/u, "").replace(/-/gu, "+").replace(/_/gu, "/");
      if (unpadded.length % 4 === 1) fail("INVALID_BASE64", "메타데이터 base64 길이가 올바르지 않습니다.");
      const padded = unpadded + "=".repeat((4 - unpadded.length % 4) % 4);
      let binary;
      try {
        binary = environment.atob(padded);
      } catch (_) {
        fail("INVALID_BASE64", "메타데이터를 디코딩할 수 없습니다.");
      }
      if (binary.length > LIMITS.decodedBytes) fail("RESOURCE_LIMIT", "메타데이터 decoded 크기 상한을 초과했습니다.");
      const decodedBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      let decodedText;
      try {
        decodedText = new TextDecoder("utf-8", { fatal: true }).decode(decodedBytes);
      } catch (_) {
        fail("INVALID_UTF8", "메타데이터가 올바른 UTF-8이 아닙니다.");
      }
      let value;
      try {
        value = JSON.parse(decodedText);
      } catch (_) {
        fail("INVALID_JSON", "메타데이터 JSON을 해석할 수 없습니다.");
      }
      return { encoded, decodedText, decodedBytes, value };
    }
    __name(decodeCarrier, "decodeCarrier");
    function validateV1(value, { allowUnbound = false } = {}) {
      object(value, "v1", null, ["version", "name", "boardId", "mainArticleId", "slaves"]);
      if (value.version !== 1) fail("UNSUPPORTED_VERSION", "지원하지 않는 ruricon 버전입니다.");
      if (value.boardId !== 98) fail("INVALID_BOARD", "아이콘 게시판 98의 메타데이터가 아닙니다.");
      text(value.name, 1, 120, "v1.name");
      if (!(allowUnbound && value.mainArticleId === 0)) articleId(value.mainArticleId, "v1.mainArticleId");
      array(value.slaves, 1, LIMITS.sources, "v1.slaves");
      const pages = /* @__PURE__ */ new Set();
      let count = 0;
      for (const slave of value.slaves) {
        object(slave, "v1.slave", null, ["page", "articleId", "images"]);
        integer(slave.page, 1, 512, "v1.page");
        if (pages.has(slave.page)) fail("DUPLICATE_PAGE", "통합팩의 page가 중복되었습니다.");
        pages.add(slave.page);
        articleId(slave.articleId, "v1.articleId");
        array(slave.images, 0, LIMITS.icons, "v1.images");
        count += slave.images.length;
        if (count > LIMITS.icons) fail("RESOURCE_LIMIT", "통합팩 아이콘 수 상한을 초과했습니다.");
        slave.images.forEach(mediaUrl);
      }
      if (!count) fail("EMPTY_PACK", "통합팩에 선언된 아이콘이 없습니다.");
      return value;
    }
    __name(validateV1, "validateV1");
    function validateV2(value) {
      object(value, "v2", ["format", "version", "kind", "packId", "boardId", "mainArticleId", "revision", "name", "description", "v1Digest", "tags", "categories", "sources", "icons"], ["format", "version", "kind", "packId", "boardId", "mainArticleId", "revision", "name", "tags", "categories", "sources", "icons"]);
      if (value.format !== "aru-icons" || value.version !== 2) fail("UNSUPPORTED_VERSION", "지원하지 않는 aru-icons 형식/버전입니다.");
      if (!["TAGGED", "BUNDLE"].includes(value.kind)) fail("INVALID_KIND", "지원하지 않는 아이콘팩 유형입니다.");
      if (value.boardId !== 98) fail("INVALID_BOARD", "아이콘 게시판 98의 메타데이터가 아닙니다.");
      uuid(value.packId, "packId");
      articleId(value.mainArticleId, "mainArticleId");
      integer(value.revision, 1, 2147483647, "revision");
      text(value.name, 1, 120, "name");
      if ("description" in value) text(value.description, 0, 2e3, "description");
      if (value.kind === "BUNDLE") {
        if (typeof value.v1Digest !== "string" || !/^[0-9a-f]{64}$/u.test(value.v1Digest)) fail("INVALID_DIGEST", "BUNDLE의 v1Digest가 올바르지 않습니다.");
      } else if ("v1Digest" in value) fail("INVALID_DIGEST", "TAGGED에는 v1Digest를 둘 수 없습니다.");
      const labelMap = /* @__PURE__ */ __name((values, category) => {
        array(values, 0, 512, category ? "categories" : "tags");
        const map = /* @__PURE__ */ new Map();
        for (const label of values) {
          object(label, "label", category ? ["id", "name", "aliases"] : ["id", "name"], ["id", "name"]);
          localId(label.id, "label.id");
          text(label.name, 1, 80, "label.name");
          if (map.has(label.id)) fail("DUPLICATE_ID", "태그/카테고리 ID가 중복되었습니다.");
          if (category && "aliases" in label) {
            array(label.aliases, 0, 32, "aliases", true);
            label.aliases.forEach((alias) => text(alias, 1, 80, "alias"));
          }
          map.set(label.id, label);
        }
        return map;
      }, "labelMap");
      const tags = labelMap(value.tags, false);
      const categories = labelMap(value.categories, true);
      array(value.sources, 1, LIMITS.sources, "sources");
      const sources = /* @__PURE__ */ new Map();
      for (const source of value.sources) {
        object(source, "source", ["sourceId", "articleId", "title"]);
        localId(source.sourceId, "sourceId");
        articleId(source.articleId, "source.articleId");
        text(source.title, 1, 200, "source.title");
        if (sources.has(source.sourceId)) fail("DUPLICATE_ID", "출처 ID가 중복되었습니다.");
        sources.set(source.sourceId, source);
      }
      const origin = /* @__PURE__ */ __name((item) => {
        object(item, "origin", ["sourceId", "articleId", "originalIndex"]);
        localId(item.sourceId, "origin.sourceId");
        articleId(item.articleId, "origin.articleId");
        integer(item.originalIndex, 0, 9999, "origin.originalIndex");
        if (!sources.has(item.sourceId) || sources.get(item.sourceId).articleId !== item.articleId) fail("INVALID_REFERENCE", "아이콘 출처 참조가 올바르지 않습니다.");
      }, "origin");
      const variants = /* @__PURE__ */ __name((items) => {
        array(items, 1, 8, "variants");
        for (const variant of items) {
          object(variant, "variant", ["role", "url", "articleId"], ["role", "url"]);
          if (!["body", "editor", "selection", "thumbnail"].includes(variant.role)) fail("INVALID_ROLE", "미디어 variant 역할이 올바르지 않습니다.");
          mediaUrl(variant.url);
          if ("articleId" in variant) articleId(variant.articleId, "variant.articleId");
        }
      }, "variants");
      array(value.icons, 1, LIMITS.icons, "icons");
      const ids = /* @__PURE__ */ new Set();
      const refs = /* @__PURE__ */ new Set();
      for (const icon of value.icons) {
        object(icon, "icon", ["iconId", "name", "keywords", "tagIds", "categoryIds", "sortOrder", "origin", "mediaKind", "alsoFrom", "ref", "media", "variants", "publishedSlot"], ["iconId", "name", "keywords", "tagIds", "categoryIds", "sortOrder", "origin", "mediaKind"]);
        uuid(icon.iconId, "iconId");
        text(icon.name, 1, 120, "icon.name");
        integer(icon.sortOrder, -1e9, 1e9, "sortOrder");
        if (ids.has(icon.iconId)) fail("DUPLICATE_ID", "아이콘 ID가 중복되었습니다.");
        ids.add(icon.iconId);
        array(icon.keywords, 0, 32, "keywords", true);
        icon.keywords.forEach((keyword) => text(keyword, 1, 80, "keyword"));
        for (const [key, maximum, dictionary] of [["tagIds", 64, tags], ["categoryIds", 32, categories]]) {
          array(icon[key], 0, maximum, key, true);
          for (const id of icon[key]) {
            localId(id, key);
            if (!dictionary.has(id)) fail("INVALID_REFERENCE", key + ": 존재하지 않는 참조입니다.");
          }
        }
        origin(icon.origin);
        if (!MEDIA_KINDS.includes(icon.mediaKind)) fail("INVALID_MEDIA", "아이콘 미디어 유형이 올바르지 않습니다.");
        if ("alsoFrom" in icon) {
          array(icon.alsoFrom, 1, 64, "alsoFrom", true);
          icon.alsoFrom.forEach(origin);
        }
        if ("variants" in icon) variants(icon.variants);
        if ("publishedSlot" in icon) {
          object(icon.publishedSlot, "publishedSlot", ["articleId", "index"]);
          articleId(icon.publishedSlot.articleId, "publishedSlot.articleId");
          integer(icon.publishedSlot.index, 0, 9999, "publishedSlot.index");
        }
        if (value.kind === "BUNDLE") {
          if ("media" in icon) fail("INVALID_MEDIA", "BUNDLE 아이콘에는 media를 둘 수 없습니다.");
          object(icon.ref, "ref", ["page", "index"]);
          integer(icon.ref.page, 1, 512, "ref.page");
          integer(icon.ref.index, 0, 9999, "ref.index");
          const slot = icon.ref.page + ":" + icon.ref.index;
          if (refs.has(slot)) fail("DUPLICATE_REFERENCE", "BUNDLE metadata 슬롯이 중복되었습니다.");
          refs.add(slot);
        } else {
          if ("ref" in icon) fail("INVALID_MEDIA", "TAGGED 아이콘에는 ref를 둘 수 없습니다.");
          object(icon.media, "media", ["kind", "variants"]);
          if (!MEDIA_KINDS.includes(icon.media.kind) || icon.media.kind !== icon.mediaKind) fail("INVALID_MEDIA", "media.kind와 mediaKind가 다릅니다.");
          variants(icon.media.variants);
        }
      }
      return value;
    }
    __name(validateV2, "validateV2");
    function parseCarrier(encoded, options = {}) {
      const decoded = decodeCarrier(encoded);
      const type = options.type || (decoded.value?.format === "aru-icons" ? "v2" : "v1");
      if (type === "v1" || type === "ruricon:v1") validateV1(decoded.value);
      else if (type === "v2" || type === "aru-icons:v2") validateV2(decoded.value);
      else fail("UNKNOWN_CARRIER", "지원하지 않는 carrier입니다.");
      return decoded;
    }
    __name(parseCarrier, "parseCarrier");
    function urlKey(url) {
      let hash = 2166136261;
      for (let i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
      return (hash >>> 0).toString(16);
    }
    __name(urlKey, "urlKey");
    function fromV1(value) {
      const sources = /* @__PURE__ */ new Map();
      const icons = [];
      for (const slave of value.slaves) {
        const sourceId = "source-" + slave.articleId;
        if (!sources.has(sourceId)) sources.set(sourceId, { sourceId, articleId: slave.articleId, title: "원본 글 " + slave.articleId, availability: "declared" });
        for (const [index, url] of slave.images.entries()) {
          const id = ["v1", value.mainArticleId, slave.articleId, slave.page, index, urlKey(url)].join(":");
          icons.push({ id, iconId: id, name: "아이콘 " + (index + 1), keywords: [], tagIds: [], categoryIds: [], sourceId, url, mediaKind: "unknown", variants: [{ role: "body", url, articleId: slave.articleId }], sortOrder: icons.length, origin: { sourceId, articleId: slave.articleId, originalIndex: index }, ref: { page: slave.page, index }, availability: "declared" });
        }
      }
      return { kind: "BUNDLE", metadataVersion: 1, packId: "v1:" + value.boardId + ":" + value.mainArticleId, name: value.name, boardId: value.boardId, mainArticleId: value.mainArticleId, categories: [], tags: [], sources: [...sources.values()], icons };
    }
    __name(fromV1, "fromV1");
    function preferredUrl(variants) {
      for (const role of ["selection", "editor", "body", "thumbnail"]) {
        const found = variants.find((variant) => variant.role === role);
        if (found) return found.url;
      }
      return variants[0].url;
    }
    __name(preferredUrl, "preferredUrl");
    function fromTagged(value) {
      return { ...value, metadataVersion: 2, categories: value.categories.map((category) => ({ ...category, aliases: category.aliases || [] })), icons: value.icons.map((icon) => ({ ...icon, id: icon.iconId, sourceId: icon.origin.sourceId, variants: icon.media.variants, url: preferredUrl(icon.media.variants) })) };
    }
    __name(fromTagged, "fromTagged");
    async function sha256(bytes) {
      if (!environment.crypto?.subtle) fail("DIGEST_UNAVAILABLE", "SHA-256 검증을 실행할 수 없어 v1으로 표시합니다.");
      const digest = await environment.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    __name(sha256, "sha256");
    async function fromBundle(value, v1) {
      if (value.mainArticleId !== v1.value.mainArticleId || value.boardId !== v1.value.boardId) fail("BUNDLE_ID_MISMATCH", "v1과 v2 대표 글 식별자가 다릅니다.");
      if (await sha256(v1.decodedBytes) !== value.v1Digest) fail("DIGEST_MISMATCH", "v1 원본 바이트와 v2 digest가 일치하지 않습니다.");
      const pages = new Map(v1.value.slaves.map((slave) => [slave.page, slave]));
      for (const icon of value.icons) {
        const slave = pages.get(icon.ref.page);
        if (!slave || icon.ref.index >= slave.images.length) fail("INVALID_REFERENCE", "v2 ref가 v1 아이콘 범위를 벗어났습니다.");
      }
      const base = fromV1(v1.value);
      const overrides = new Map(value.icons.map((icon) => [icon.ref.page + ":" + icon.ref.index, icon]));
      const icons = base.icons.map((icon) => {
        const metadata = overrides.get(icon.ref.page + ":" + icon.ref.index);
        if (!metadata) return icon;
        const variants = metadata.variants || icon.variants;
        return { ...metadata, id: metadata.iconId, sourceId: metadata.origin.sourceId, url: icon.url, variants, declaredUrl: icon.url, availability: "declared" };
      });
      const usedSources = new Set(icons.map((icon) => icon.sourceId));
      const sources = new Map(base.sources.map((source) => [source.sourceId, source]));
      value.sources.forEach((source) => sources.set(source.sourceId, source));
      return { ...value, metadataVersion: 2, categories: value.categories.map((category) => ({ ...category, aliases: category.aliases || [] })), sources: [...sources.values()].filter((source) => usedSources.has(source.sourceId) || value.sources.some((item) => item.sourceId === source.sourceId)), icons };
    }
    __name(fromBundle, "fromBundle");
    async function parseCarriers(carriers = {}, options = {}) {
      const warnings = [];
      const rawMetadata = { v1: [], v2: [] };
      const decoded = {};
      for (const type of ["v1", "v2"]) {
        const entries = Array.isArray(carriers[type]) ? carriers[type] : [];
        rawMetadata[type] = entries.map((encoded) => ({ encoded: typeof encoded === "string" ? encoded : "", decodedText: null, decodedBytes: null }));
        if (entries.length > 1) {
          warnings.push({ code: "DUPLICATE_CARRIER", message: type + " carrier가 여러 개여서 해당 metadata를 사용하지 않습니다." });
          continue;
        }
        if (!entries.length) continue;
        try {
          const raw = decodeCarrier(entries[0]);
          rawMetadata[type][0] = { encoded: raw.encoded, decodedText: raw.decodedText, decodedBytes: raw.decodedBytes };
          if (type === "v1") validateV1(raw.value, { allowUnbound: options.boardId === 98 && Number.isSafeInteger(options.articleId) && options.articleId > 0 });
          else validateV2(raw.value);
          decoded[type] = raw;
        } catch (error) {
          warnings.push({ code: error.code || "INVALID_METADATA", message: error.message });
        }
      }
      let pack = null;
      let metadataVersion = null;
      if (decoded.v2) {
        try {
          if (decoded.v2.value.kind === "TAGGED") pack = fromTagged(decoded.v2.value);
          else {
            if (!decoded.v1) fail("MISSING_V1", "BUNDLE v2의 유효한 원본 v1을 찾을 수 없습니다.");
            pack = await fromBundle(decoded.v2.value, decoded.v1);
          }
          metadataVersion = 2;
        } catch (error) {
          warnings.push({ code: error.code || "INVALID_METADATA", message: error.message });
        }
      }
      if (!pack && decoded.v1) {
        let value = decoded.v1.value;
        if (value.mainArticleId === 0) {
          value = { ...value, mainArticleId: options.articleId };
          if (value.slaves.some((slave) => slave.articleId === value.mainArticleId)) {
            warnings.push({ code: "SELF_REFERENCE", message: "현재 글을 원본으로 참조하는 통합팩은 읽을 수 없습니다." });
            value = null;
          } else warnings.push({ code: "REPRESENTATIVE_BOUND", message: "신규 통합팩의 대표 번호를 현재 저장된 글 번호로 판독했습니다. 원본 저장값 0은 변경하지 않습니다." });
        }
        if (value) {
          pack = fromV1(value);
          metadataVersion = 1;
        }
      }
      if (pack && options.articleId != null && Number(options.articleId) !== pack.mainArticleId) warnings.push({ code: "ARTICLE_ID_MISMATCH", message: "현재 글 ID와 metadata의 대표 글 ID가 다릅니다. 원본 metadata는 수정하지 않습니다." });
      if (pack && options.boardId != null && Number(options.boardId) !== pack.boardId) warnings.push({ code: "BOARD_ID_MISMATCH", message: "현재 게시판과 metadata의 게시판 ID가 다릅니다." });
      return { kind: pack ? pack.kind : "NORMAL", metadataVersion, pack, warnings, limited: !pack && warnings.length > 0, rawMetadata, v1Slaves: decoded.v1 ? decoded.v1.value.slaves.map((slave) => ({ page: slave.page, articleId: slave.articleId, images: [...slave.images], url: publicArticleUrl(slave.articleId) })) : [] };
    }
    __name(parseCarriers, "parseCarriers");
    return Object.freeze({ MetadataError, LIMITS, mediaUrl, publicArticleUrl, decodeCarrier, validateV1, validateV2, parseCarrier, parseCarriers, fromV1, fromTagged, sha256 });
  }
  __name(createMetadataCore, "createMetadataCore");

  // docs/source/ruliweb-icons/metadata.mjs
  function createMetadata({ environment: global = globalThis } = {}) {
    const core = createMetadataCore(global);
    const { LIMITS, parseCarriers } = core;
    const fail = /* @__PURE__ */ __name((code, message) => {
      throw new core.MetadataError(code, message);
    }, "fail");
    function readDocumentCarriers(root) {
      if (!root || typeof root.querySelectorAll !== "function") fail("INVALID_DOCUMENT", "읽을 수 있는 DOM이 필요합니다.");
      const result = { v1: [], v2: [] };
      for (const [type, marker, stateMarker] of [["v1", "ruricon:v1", "ruricon-state"], ["v2", "aru-icons:v2", "aru-icons-state"]]) {
        const markers = [...root.querySelectorAll('[data-meta="' + marker + '"]')];
        if (root.matches?.('[data-meta="' + marker + '"]')) markers.unshift(root);
        for (const markerNode of markers) {
          const states = [...markerNode.querySelectorAll('[data-meta="' + stateMarker + '"]')];
          if (states.length === 1) result[type].push(states[0].textContent || "");
          else if (states.length === 0) result[type].push("");
          else result[type].push(...states.map((node) => node.textContent || ""));
        }
      }
      return result;
    }
    __name(readDocumentCarriers, "readDocumentCarriers");
    async function parseDocument(root, options = {}) {
      return parseCarriers(readDocumentCarriers(root), options);
    }
    __name(parseDocument, "parseDocument");
    async function parseMetadata(rootOrHtml, options = {}) {
      if (typeof rootOrHtml !== "string") return parseDocument(rootOrHtml, options);
      if (typeof global.DOMParser !== "function") fail("DOM_PARSER_UNAVAILABLE", "HTML 판독에는 DOMParser가 필요합니다. 데이터 테스트는 parseCarriers를 사용하세요.");
      if (rootOrHtml.length > 8 * LIMITS.decodedBytes) fail("RESOURCE_LIMIT", "본문 HTML의 로컬 처리 상한을 초과했습니다.");
      const doc = new global.DOMParser().parseFromString(rootOrHtml, "text/html");
      const body = doc.querySelector(".view_content") || doc.querySelector('[itemprop="articleBody"]') || doc.body;
      return parseDocument(body, options);
    }
    __name(parseMetadata, "parseMetadata");
    return { MetadataError: core.MetadataError, Metadata: Object.freeze({ supportsUnboundV1: true, LIMITS: core.LIMITS, mediaUrl: core.mediaUrl, publicArticleUrl: core.publicArticleUrl, decodeCarrier: core.decodeCarrier, validateV1: core.validateV1, validateV2: core.validateV2, parseCarrier: core.parseCarrier, parseCarriers: core.parseCarriers, fromV1: core.fromV1, fromTagged: core.fromTagged, sha256: core.sha256, parseDocument, parseMetadata, readDocumentCarriers }) };
  }
  __name(createMetadata, "createMetadata");

  // docs/source/compat/metadata.mjs
  Object.assign(globalThis.AruIcons = globalThis.AruIcons || {}, createMetadata({ environment: globalThis }));
})();
