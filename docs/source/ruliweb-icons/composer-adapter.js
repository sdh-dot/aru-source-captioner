// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // shared/icon-metadata/tag-codec.mjs
  var tag_codec_exports = {};
  __export(tag_codec_exports, {
    FIXED: () => FIXED,
    PREFIX: () => PREFIX,
    decode: () => decode,
    encode: () => encode,
    fail: () => fail,
    normalize: () => normalize
  });
  var PREFIX = "aru-tags:v1:";
  var FIXED = Object.freeze([
    "인사",
    "사과",
    "축하",
    "응원",
    "감사",
    "미소",
    "도발",
    "조토피아",
    "매도",
    "분노",
    "슬픔",
    "당황",
    "놀람"
  ]);
  function fail(code, message) {
    throw Object.assign(new Error(message), { code });
  }
  __name(fail, "fail");
  function normalize(values) {
    if (!Array.isArray(values) || values.length > 1e3) {
      fail("TAGS_INVALID", "태그 목록이 올바르지 않거나 1,000개를 넘었습니다.");
    }
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    for (const value of values) {
      if (typeof value !== "string") {
        fail("TAGS_INVALID", "태그는 문자열이어야 합니다.");
      }
      const tag = value.replace(/\s+/gu, " ").trim();
      if (tag.length > 512 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(tag)) {
        fail("TAGS_INVALID", "태그 길이 또는 제어 문자를 확인해 주세요.");
      }
      if (tag && !seen.has(tag)) {
        seen.add(tag);
        result.push(tag);
      }
    }
    return result;
  }
  __name(normalize, "normalize");
  function decode(raw) {
    if (raw == null || raw === "") {
      return [];
    }
    if (raw.length > 65536) {
      fail("TAGS_INVALID", "기존 태그 속성이 너무 큽니다. 원본은 변경하지 않았습니다.");
    }
    if (raw.startsWith(PREFIX)) {
      try {
        return normalize(JSON.parse(decodeURIComponent(raw.slice(PREFIX.length))));
      } catch (_) {
        fail("TAGS_INVALID", "인코딩된 기존 태그를 읽을 수 없습니다. 원본을 확인해 주세요.");
      }
    }
    if (raw.startsWith("aru-tags:")) {
      fail("TAGS_VERSION", "지원하지 않는 태그 규격입니다. 기존 속성은 보존합니다.");
    }
    return normalize(raw.split(","));
  }
  __name(decode, "decode");
  function encode(values) {
    let raw;
    try {
      raw = PREFIX + encodeURIComponent(JSON.stringify(normalize(values)));
    } catch (error) {
      if (error.code) {
        throw error;
      }
      fail("TAGS_INVALID", "태그에 올바르지 않은 유니코드 문자가 있습니다.");
    }
    if (raw.length > 65536) {
      fail("TAGS_INVALID", "인코딩된 태그가 64KB를 넘었습니다. 태그를 줄여 주세요.");
    }
    return raw;
  }
  __name(encode, "encode");

  // docs/source/ruliweb-icons/metadata-core.mjs
  function createMetadataCore(environment = defaultEnvironment) {
    const LIMITS = Object.freeze({
      decodedBytes: 1048576,
      icons: 1e4,
      sources: 512
    });
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
    function fail2(code, message) {
      throw new MetadataError(code, message);
    }
    __name(fail2, "fail");
    function object(value, label, allowed, required = allowed) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        fail2("INVALID_STRUCTURE", label + ": 객체가 필요합니다.");
      }
      if (allowed && Object.keys(value).some((key) => !allowed.includes(key))) {
        fail2("UNKNOWN_FIELD", label + ": 지원하지 않는 필드가 있습니다.");
      }
      if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
        fail2("MISSING_FIELD", label + ": 필수 필드가 없습니다.");
      }
    }
    __name(object, "object");
    function integer(value, min, max, label) {
      if (!Number.isSafeInteger(value) || value < min || value > max) {
        fail2("INVALID_NUMBER", label + ": 숫자 범위가 올바르지 않습니다.");
      }
    }
    __name(integer, "integer");
    function text(value, min, max, label) {
      if (typeof value !== "string" || [...value].length < min || [...value].length > max || min && !value.trim()) {
        fail2("INVALID_TEXT", label + ": 텍스트 길이/내용이 올바르지 않습니다.");
      }
    }
    __name(text, "text");
    function array(value, min, max, label, unique = false) {
      if (!Array.isArray(value) || value.length < min || value.length > max) {
        fail2("INVALID_ARRAY", label + ": 항목 수가 올바르지 않습니다.");
      }
      if (unique && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
        fail2("DUPLICATE_VALUE", label + ": 중복 항목이 있습니다.");
      }
    }
    __name(array, "array");
    function localId(value, label) {
      if (typeof value !== "string" || !LOCAL_ID.test(value)) {
        fail2("INVALID_ID", label + ": 식별자가 올바르지 않습니다.");
      }
    }
    __name(localId, "localId");
    function articleId(value, label) {
      integer(value, 1, Number.MAX_SAFE_INTEGER, label);
    }
    __name(articleId, "articleId");
    function uuid(value, label) {
      if (typeof value !== "string" || !UUID.test(value)) {
        fail2("INVALID_ID", label + ": UUID가 올바르지 않습니다.");
      }
    }
    __name(uuid, "uuid");
    function mediaUrl(value) {
      if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value) || !/^https:\/\/i[123]\.ruliweb\.com\//u.test(value)) {
        fail2("UNSAFE_URL", "허용된 HTTPS 루리웹 CDN URL이 아닙니다.");
      }
      let parsed;
      try {
        parsed = new URL(value);
      } catch (_) {
        fail2("UNSAFE_URL", "미디어 URL을 해석할 수 없습니다.");
      }
      if (parsed.protocol !== "https:" || !/^i[123]\.ruliweb\.com$/u.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.hash) {
        fail2("UNSAFE_URL", "미디어 URL에 허용되지 않은 주소 요소가 있습니다.");
      }
      return value;
    }
    __name(mediaUrl, "mediaUrl");
    function publicArticleUrl(id, mobile = false) {
      articleId(id, "articleId");
      return "https://" + (mobile ? "m" : "bbs") + ".ruliweb.com/community/board/98/read/" + id;
    }
    __name(publicArticleUrl, "publicArticleUrl");
    function decodeCarrier(encoded) {
      if (typeof encoded !== "string" || encoded.length > Math.ceil(LIMITS.decodedBytes * 4 / 3) + 65536) {
        fail2("RESOURCE_LIMIT", "메타데이터 크기 상한을 초과했습니다.");
      }
      const compact = encoded.replace(/\s/gu, "");
      if (!compact || !/^[A-Za-z0-9_+/-]+={0,2}$/u.test(compact)) {
        fail2("INVALID_BASE64", "메타데이터 base64 형식이 올바르지 않습니다.");
      }
      const unpadded = compact.replace(/=+$/u, "").replace(/-/gu, "+").replace(/_/gu, "/");
      if (unpadded.length % 4 === 1) {
        fail2("INVALID_BASE64", "메타데이터 base64 길이가 올바르지 않습니다.");
      }
      const padded = unpadded + "=".repeat((4 - unpadded.length % 4) % 4);
      let binary;
      try {
        binary = environment.atob(padded);
      } catch (_) {
        fail2("INVALID_BASE64", "메타데이터를 디코딩할 수 없습니다.");
      }
      if (binary.length > LIMITS.decodedBytes) {
        fail2("RESOURCE_LIMIT", "메타데이터 decoded 크기 상한을 초과했습니다.");
      }
      const decodedBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      let decodedText;
      try {
        decodedText = new TextDecoder("utf-8", { fatal: true }).decode(decodedBytes);
      } catch (_) {
        fail2("INVALID_UTF8", "메타데이터가 올바른 UTF-8이 아닙니다.");
      }
      let value;
      try {
        value = JSON.parse(decodedText);
      } catch (_) {
        fail2("INVALID_JSON", "메타데이터 JSON을 해석할 수 없습니다.");
      }
      return { encoded, decodedText, decodedBytes, value };
    }
    __name(decodeCarrier, "decodeCarrier");
    function validateV1(value, { allowUnbound = false } = {}) {
      object(value, "v1", null, [
        "version",
        "name",
        "boardId",
        "mainArticleId",
        "slaves"
      ]);
      if (value.version !== 1) {
        fail2("UNSUPPORTED_VERSION", "지원하지 않는 ruricon 버전입니다.");
      }
      if (value.boardId !== 98) {
        fail2("INVALID_BOARD", "아이콘 게시판 98의 메타데이터가 아닙니다.");
      }
      text(value.name, 1, 120, "v1.name");
      if (!(allowUnbound && value.mainArticleId === 0)) {
        articleId(value.mainArticleId, "v1.mainArticleId");
      }
      array(value.slaves, 1, LIMITS.sources, "v1.slaves");
      const pages = /* @__PURE__ */ new Set();
      let count = 0;
      for (const slave of value.slaves) {
        object(slave, "v1.slave", null, ["page", "articleId", "images"]);
        integer(slave.page, 1, 512, "v1.page");
        if (pages.has(slave.page)) {
          fail2("DUPLICATE_PAGE", "통합팩의 page가 중복되었습니다.");
        }
        pages.add(slave.page);
        articleId(slave.articleId, "v1.articleId");
        array(slave.images, 0, LIMITS.icons, "v1.images");
        count += slave.images.length;
        if (count > LIMITS.icons) {
          fail2("RESOURCE_LIMIT", "통합팩 아이콘 수 상한을 초과했습니다.");
        }
        slave.images.forEach(mediaUrl);
      }
      if (!count) {
        fail2("EMPTY_PACK", "통합팩에 선언된 아이콘이 없습니다.");
      }
      return value;
    }
    __name(validateV1, "validateV1");
    function validateV2(value) {
      object(value, "v2", [
        "format",
        "version",
        "kind",
        "packId",
        "boardId",
        "mainArticleId",
        "revision",
        "name",
        "description",
        "v1Digest",
        "tags",
        "categories",
        "sources",
        "icons"
      ], [
        "format",
        "version",
        "kind",
        "packId",
        "boardId",
        "mainArticleId",
        "revision",
        "name",
        "tags",
        "categories",
        "sources",
        "icons"
      ]);
      if (value.format !== "aru-icons" || value.version !== 2) {
        fail2("UNSUPPORTED_VERSION", "지원하지 않는 aru-icons 형식/버전입니다.");
      }
      if (!["TAGGED", "BUNDLE"].includes(value.kind)) {
        fail2("INVALID_KIND", "지원하지 않는 아이콘팩 유형입니다.");
      }
      if (value.boardId !== 98) {
        fail2("INVALID_BOARD", "아이콘 게시판 98의 메타데이터가 아닙니다.");
      }
      uuid(value.packId, "packId");
      articleId(value.mainArticleId, "mainArticleId");
      integer(value.revision, 1, 2147483647, "revision");
      text(value.name, 1, 120, "name");
      if ("description" in value) {
        text(value.description, 0, 2e3, "description");
      }
      if (value.kind === "BUNDLE") {
        if (typeof value.v1Digest !== "string" || !/^[0-9a-f]{64}$/u.test(value.v1Digest)) {
          fail2("INVALID_DIGEST", "BUNDLE의 v1Digest가 올바르지 않습니다.");
        }
      } else if ("v1Digest" in value) {
        fail2("INVALID_DIGEST", "TAGGED에는 v1Digest를 둘 수 없습니다.");
      }
      const labelMap = /* @__PURE__ */ __name((values, category) => {
        array(values, 0, 512, category ? "categories" : "tags");
        const map = /* @__PURE__ */ new Map();
        for (const label of values) {
          object(label, "label", category ? ["id", "name", "aliases"] : ["id", "name"], ["id", "name"]);
          localId(label.id, "label.id");
          text(label.name, 1, 80, "label.name");
          if (map.has(label.id)) {
            fail2("DUPLICATE_ID", "태그/카테고리 ID가 중복되었습니다.");
          }
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
        if (sources.has(source.sourceId)) {
          fail2("DUPLICATE_ID", "출처 ID가 중복되었습니다.");
        }
        sources.set(source.sourceId, source);
      }
      const origin = /* @__PURE__ */ __name((item) => {
        object(item, "origin", ["sourceId", "articleId", "originalIndex"]);
        localId(item.sourceId, "origin.sourceId");
        articleId(item.articleId, "origin.articleId");
        integer(item.originalIndex, 0, 9999, "origin.originalIndex");
        if (!sources.has(item.sourceId) || sources.get(item.sourceId).articleId !== item.articleId) {
          fail2("INVALID_REFERENCE", "아이콘 출처 참조가 올바르지 않습니다.");
        }
      }, "origin");
      const variants = /* @__PURE__ */ __name((items) => {
        array(items, 1, 8, "variants");
        for (const variant of items) {
          object(variant, "variant", ["role", "url", "articleId"], ["role", "url"]);
          if (!["body", "editor", "selection", "thumbnail"].includes(variant.role)) {
            fail2("INVALID_ROLE", "미디어 variant 역할이 올바르지 않습니다.");
          }
          mediaUrl(variant.url);
          if ("articleId" in variant) {
            articleId(variant.articleId, "variant.articleId");
          }
        }
      }, "variants");
      array(value.icons, 1, LIMITS.icons, "icons");
      const ids = /* @__PURE__ */ new Set();
      const refs = /* @__PURE__ */ new Set();
      for (const icon of value.icons) {
        object(icon, "icon", [
          "iconId",
          "name",
          "keywords",
          "tagIds",
          "categoryIds",
          "sortOrder",
          "origin",
          "mediaKind",
          "alsoFrom",
          "ref",
          "media",
          "variants",
          "publishedSlot"
        ], [
          "iconId",
          "name",
          "keywords",
          "tagIds",
          "categoryIds",
          "sortOrder",
          "origin",
          "mediaKind"
        ]);
        uuid(icon.iconId, "iconId");
        text(icon.name, 1, 120, "icon.name");
        integer(icon.sortOrder, -1e9, 1e9, "sortOrder");
        if (ids.has(icon.iconId)) {
          fail2("DUPLICATE_ID", "아이콘 ID가 중복되었습니다.");
        }
        ids.add(icon.iconId);
        array(icon.keywords, 0, 32, "keywords", true);
        icon.keywords.forEach((keyword) => text(keyword, 1, 80, "keyword"));
        for (const [key, maximum, dictionary] of [
          ["tagIds", 64, tags],
          ["categoryIds", 32, categories]
        ]) {
          array(icon[key], 0, maximum, key, true);
          for (const id of icon[key]) {
            localId(id, key);
            if (!dictionary.has(id)) {
              fail2("INVALID_REFERENCE", key + ": 존재하지 않는 참조입니다.");
            }
          }
        }
        origin(icon.origin);
        if (!MEDIA_KINDS.includes(icon.mediaKind)) {
          fail2("INVALID_MEDIA", "아이콘 미디어 유형이 올바르지 않습니다.");
        }
        if ("alsoFrom" in icon) {
          array(icon.alsoFrom, 1, 64, "alsoFrom", true);
          icon.alsoFrom.forEach(origin);
        }
        if ("variants" in icon) {
          variants(icon.variants);
        }
        if ("publishedSlot" in icon) {
          object(icon.publishedSlot, "publishedSlot", ["articleId", "index"]);
          articleId(icon.publishedSlot.articleId, "publishedSlot.articleId");
          integer(icon.publishedSlot.index, 0, 9999, "publishedSlot.index");
        }
        if (value.kind === "BUNDLE") {
          if ("media" in icon) {
            fail2("INVALID_MEDIA", "BUNDLE 아이콘에는 media를 둘 수 없습니다.");
          }
          object(icon.ref, "ref", ["page", "index"]);
          integer(icon.ref.page, 1, 512, "ref.page");
          integer(icon.ref.index, 0, 9999, "ref.index");
          const slot = icon.ref.page + ":" + icon.ref.index;
          if (refs.has(slot)) {
            fail2("DUPLICATE_REFERENCE", "BUNDLE metadata 슬롯이 중복되었습니다.");
          }
          refs.add(slot);
        } else {
          if ("ref" in icon) {
            fail2("INVALID_MEDIA", "TAGGED 아이콘에는 ref를 둘 수 없습니다.");
          }
          object(icon.media, "media", ["kind", "variants"]);
          if (!MEDIA_KINDS.includes(icon.media.kind) || icon.media.kind !== icon.mediaKind) {
            fail2("INVALID_MEDIA", "media.kind와 mediaKind가 다릅니다.");
          }
          variants(icon.media.variants);
        }
      }
      return value;
    }
    __name(validateV2, "validateV2");
    function parseCarrier(encoded, options = {}) {
      const decoded = decodeCarrier(encoded);
      const type = options.type || (decoded.value?.format === "aru-icons" ? "v2" : "v1");
      if (type === "v1" || type === "ruricon:v1") {
        validateV1(decoded.value);
      } else if (type === "v2" || type === "aru-icons:v2") {
        validateV2(decoded.value);
      } else {
        fail2("UNKNOWN_CARRIER", "지원하지 않는 carrier입니다.");
      }
      return decoded;
    }
    __name(parseCarrier, "parseCarrier");
    function urlKey(url) {
      let hash = 2166136261;
      for (let i = 0; i < url.length; i++) {
        hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
      }
      return (hash >>> 0).toString(16);
    }
    __name(urlKey, "urlKey");
    function fromV1(value) {
      const sources = /* @__PURE__ */ new Map();
      const icons2 = [];
      for (const slave of value.slaves) {
        const sourceId = "source-" + slave.articleId;
        if (!sources.has(sourceId)) {
          sources.set(sourceId, {
            sourceId,
            articleId: slave.articleId,
            title: "원본 글 " + slave.articleId,
            availability: "declared"
          });
        }
        for (const [index, url] of slave.images.entries()) {
          const id = [
            "v1",
            value.mainArticleId,
            slave.articleId,
            slave.page,
            index,
            urlKey(url)
          ].join(":");
          icons2.push({
            id,
            iconId: id,
            name: "아이콘 " + (index + 1),
            keywords: [],
            tagIds: [],
            categoryIds: [],
            sourceId,
            url,
            mediaKind: "unknown",
            variants: [{ role: "body", url, articleId: slave.articleId }],
            sortOrder: icons2.length,
            origin: {
              sourceId,
              articleId: slave.articleId,
              originalIndex: index
            },
            ref: { page: slave.page, index },
            availability: "declared"
          });
        }
      }
      return {
        kind: "BUNDLE",
        metadataVersion: 1,
        packId: "v1:" + value.boardId + ":" + value.mainArticleId,
        name: value.name,
        boardId: value.boardId,
        mainArticleId: value.mainArticleId,
        categories: [],
        tags: [],
        sources: [...sources.values()],
        icons: icons2
      };
    }
    __name(fromV1, "fromV1");
    function preferredUrl(variants) {
      for (const role of ["selection", "editor", "body", "thumbnail"]) {
        const found = variants.find((variant) => variant.role === role);
        if (found) {
          return found.url;
        }
      }
      return variants[0].url;
    }
    __name(preferredUrl, "preferredUrl");
    function fromTagged(value) {
      return {
        ...value,
        metadataVersion: 2,
        categories: value.categories.map((category) => ({
          ...category,
          aliases: category.aliases || []
        })),
        icons: value.icons.map((icon) => ({
          ...icon,
          id: icon.iconId,
          sourceId: icon.origin.sourceId,
          variants: icon.media.variants,
          url: preferredUrl(icon.media.variants)
        }))
      };
    }
    __name(fromTagged, "fromTagged");
    async function sha256(bytes) {
      if (!environment.crypto?.subtle) {
        fail2("DIGEST_UNAVAILABLE", "SHA-256 검증을 실행할 수 없어 v1으로 표시합니다.");
      }
      const digest = await environment.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    __name(sha256, "sha256");
    async function fromBundle(value, v1) {
      if (value.mainArticleId !== v1.value.mainArticleId || value.boardId !== v1.value.boardId) {
        fail2("BUNDLE_ID_MISMATCH", "v1과 v2 대표 글 식별자가 다릅니다.");
      }
      if (await sha256(v1.decodedBytes) !== value.v1Digest) {
        fail2("DIGEST_MISMATCH", "v1 원본 바이트와 v2 digest가 일치하지 않습니다.");
      }
      const pages = new Map(v1.value.slaves.map((slave) => [slave.page, slave]));
      for (const icon of value.icons) {
        const slave = pages.get(icon.ref.page);
        if (!slave || icon.ref.index >= slave.images.length) {
          fail2("INVALID_REFERENCE", "v2 ref가 v1 아이콘 범위를 벗어났습니다.");
        }
      }
      const base = fromV1(v1.value);
      const overrides = new Map(value.icons.map((icon) => [icon.ref.page + ":" + icon.ref.index, icon]));
      const icons2 = base.icons.map((icon) => {
        const metadata = overrides.get(icon.ref.page + ":" + icon.ref.index);
        if (!metadata) {
          return icon;
        }
        const variants = metadata.variants || icon.variants;
        return {
          ...metadata,
          id: metadata.iconId,
          sourceId: metadata.origin.sourceId,
          url: icon.url,
          variants,
          declaredUrl: icon.url,
          availability: "declared"
        };
      });
      const usedSources = new Set(icons2.map((icon) => icon.sourceId));
      const sources = new Map(base.sources.map((source) => [source.sourceId, source]));
      value.sources.forEach((source) => sources.set(source.sourceId, source));
      return {
        ...value,
        metadataVersion: 2,
        categories: value.categories.map((category) => ({
          ...category,
          aliases: category.aliases || []
        })),
        sources: [...sources.values()].filter((source) => usedSources.has(source.sourceId) || value.sources.some((item) => item.sourceId === source.sourceId)),
        icons: icons2
      };
    }
    __name(fromBundle, "fromBundle");
    async function parseCarriers(carriers = {}, options = {}) {
      const warnings = [];
      const rawMetadata = { v1: [], v2: [] };
      const decoded = {};
      for (const type of ["v1", "v2"]) {
        const entries = Array.isArray(carriers[type]) ? carriers[type] : [];
        rawMetadata[type] = entries.map((encoded) => ({
          encoded: typeof encoded === "string" ? encoded : "",
          decodedText: null,
          decodedBytes: null
        }));
        if (entries.length > 1) {
          warnings.push({
            code: "DUPLICATE_CARRIER",
            message: type + " carrier가 여러 개여서 해당 metadata를 사용하지 않습니다."
          });
          continue;
        }
        if (!entries.length) {
          continue;
        }
        try {
          const raw = decodeCarrier(entries[0]);
          rawMetadata[type][0] = {
            encoded: raw.encoded,
            decodedText: raw.decodedText,
            decodedBytes: raw.decodedBytes
          };
          if (type === "v1") {
            validateV1(raw.value, {
              allowUnbound: options.boardId === 98 && Number.isSafeInteger(options.articleId) && options.articleId > 0
            });
          } else {
            validateV2(raw.value);
          }
          decoded[type] = raw;
        } catch (error) {
          warnings.push({
            code: error.code || "INVALID_METADATA",
            message: error.message
          });
        }
      }
      let pack = null;
      let metadataVersion = null;
      if (decoded.v2) {
        try {
          if (decoded.v2.value.kind === "TAGGED") {
            pack = fromTagged(decoded.v2.value);
          } else {
            if (!decoded.v1) {
              fail2("MISSING_V1", "BUNDLE v2의 유효한 원본 v1을 찾을 수 없습니다.");
            }
            pack = await fromBundle(decoded.v2.value, decoded.v1);
          }
          metadataVersion = 2;
        } catch (error) {
          warnings.push({
            code: error.code || "INVALID_METADATA",
            message: error.message
          });
        }
      }
      if (!pack && decoded.v1) {
        let value = decoded.v1.value;
        if (value.mainArticleId === 0) {
          value = { ...value, mainArticleId: options.articleId };
          if (value.slaves.some((slave) => slave.articleId === value.mainArticleId)) {
            warnings.push({
              code: "SELF_REFERENCE",
              message: "현재 글을 원본으로 참조하는 통합팩은 읽을 수 없습니다."
            });
            value = null;
          } else {
            warnings.push({
              code: "REPRESENTATIVE_BOUND",
              message: "신규 통합팩의 대표 번호를 현재 저장된 글 번호로 판독했습니다. 원본 저장값 0은 변경하지 않습니다."
            });
          }
        }
        if (value) {
          pack = fromV1(value);
          metadataVersion = 1;
        }
      }
      if (pack && options.articleId != null && Number(options.articleId) !== pack.mainArticleId) {
        warnings.push({
          code: "ARTICLE_ID_MISMATCH",
          message: "현재 글 ID와 metadata의 대표 글 ID가 다릅니다. 원본 metadata는 수정하지 않습니다."
        });
      }
      if (pack && options.boardId != null && Number(options.boardId) !== pack.boardId) {
        warnings.push({
          code: "BOARD_ID_MISMATCH",
          message: "현재 게시판과 metadata의 게시판 ID가 다릅니다."
        });
      }
      return {
        kind: pack ? pack.kind : "NORMAL",
        metadataVersion,
        pack,
        warnings,
        limited: !pack && warnings.length > 0,
        rawMetadata,
        v1Slaves: decoded.v1 ? decoded.v1.value.slaves.map((slave) => ({
          page: slave.page,
          articleId: slave.articleId,
          images: [...slave.images],
          url: publicArticleUrl(slave.articleId)
        })) : []
      };
    }
    __name(parseCarriers, "parseCarriers");
    return Object.freeze({
      MetadataError,
      LIMITS,
      mediaUrl,
      publicArticleUrl,
      decodeCarrier,
      validateV1,
      validateV2,
      parseCarrier,
      parseCarriers,
      fromV1,
      fromTagged,
      sha256
    });
  }
  __name(createMetadataCore, "createMetadataCore");

  // docs/source/ruliweb-icons/metadata.mjs
  function createMetadata({ environment: global = defaultEnvironment } = {}) {
    const core = createMetadataCore(global);
    const { LIMITS, parseCarriers } = core;
    const fail2 = /* @__PURE__ */ __name((code, message) => {
      throw new core.MetadataError(code, message);
    }, "fail");
    function readDocumentCarriers(root) {
      if (!root || typeof root.querySelectorAll !== "function") {
        fail2("INVALID_DOCUMENT", "읽을 수 있는 DOM이 필요합니다.");
      }
      const result = { v1: [], v2: [] };
      for (const [type, marker, stateMarker] of [
        ["v1", "ruricon:v1", "ruricon-state"],
        ["v2", "aru-icons:v2", "aru-icons-state"]
      ]) {
        const markers = [
          ...root.querySelectorAll('[data-meta="' + marker + '"]')
        ];
        if (root.matches?.('[data-meta="' + marker + '"]')) {
          markers.unshift(root);
        }
        for (const markerNode of markers) {
          const states = [
            ...markerNode.querySelectorAll('[data-meta="' + stateMarker + '"]')
          ];
          if (states.length === 1) {
            result[type].push(states[0].textContent || "");
          } else if (states.length === 0) {
            result[type].push("");
          } else {
            result[type].push(...states.map((node) => node.textContent || ""));
          }
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
      if (typeof rootOrHtml !== "string") {
        return parseDocument(rootOrHtml, options);
      }
      if (typeof global.DOMParser !== "function") {
        fail2("DOM_PARSER_UNAVAILABLE", "HTML 판독에는 DOMParser가 필요합니다. 데이터 테스트는 parseCarriers를 사용하세요.");
      }
      if (rootOrHtml.length > 8 * LIMITS.decodedBytes) {
        fail2("RESOURCE_LIMIT", "본문 HTML의 로컬 처리 상한을 초과했습니다.");
      }
      const doc = new global.DOMParser().parseFromString(rootOrHtml, "text/html");
      const body = doc.querySelector(".view_content") || doc.querySelector('[itemprop="articleBody"]') || doc.body;
      return parseDocument(body, options);
    }
    __name(parseMetadata, "parseMetadata");
    return {
      MetadataError: core.MetadataError,
      Metadata: Object.freeze({
        supportsUnboundV1: true,
        LIMITS: core.LIMITS,
        mediaUrl: core.mediaUrl,
        publicArticleUrl: core.publicArticleUrl,
        decodeCarrier: core.decodeCarrier,
        validateV1: core.validateV1,
        validateV2: core.validateV2,
        parseCarrier: core.parseCarrier,
        parseCarriers: core.parseCarriers,
        fromV1: core.fromV1,
        fromTagged: core.fromTagged,
        sha256: core.sha256,
        parseDocument,
        parseMetadata,
        readDocumentCarriers
      })
    };
  }
  __name(createMetadata, "createMetadata");

  // docs/source/ruliweb-icons/site-adapter.mjs
  function createSiteAdapter({ environment: global = defaultEnvironment, metadata = createMetadata({ environment: global }).Metadata, attributeTags = tag_codec_exports, isSafeMediaUrl } = {}) {
    const { DOMParser, AbortController, TextDecoder: TextDecoder2, TextEncoder } = global;
    const number = /* @__PURE__ */ __name((value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null, "number");
    const stopped = /* @__PURE__ */ __name(() => Object.assign(new Error("수집을 중지했습니다."), { code: "ABORTED" }), "stopped");
    function delay(ms, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          return reject(stopped());
        }
        const done = /* @__PURE__ */ __name(() => {
          signal?.removeEventListener("abort", cancel);
          resolve();
        }, "done");
        const timer = setTimeout(done, ms);
        const cancel = /* @__PURE__ */ __name(() => {
          clearTimeout(timer);
          signal.removeEventListener("abort", cancel);
          reject(stopped());
        }, "cancel");
        signal?.addEventListener("abort", cancel, { once: true });
      });
    }
    __name(delay, "delay");
    function selectionId(element) {
      const text = element?.getAttribute?.("onclick") || "";
      const match = text.match(/^\s*(?:window\.)?app\.icon_data_show\(\s*this\s*,\s*(\d+)\s*\)\s*;?\s*$/);
      return match ? number(match[1]) : null;
    }
    __name(selectionId, "selectionId");
    function moreInfo(button) {
      const match = (button?.getAttribute?.("onclick") || "").match(/^\s*(?:window\.)?app\.icon_data_load_more\(\s*this\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*;?\s*$/);
      return match ? { articleId: number(match[1]), offset: Number(match[2]) } : null;
    }
    __name(moreInfo, "moreInfo");
    function safeMedia(url) {
      if (metadata?.mediaUrl) {
        try {
          metadata.mediaUrl(url);
          return true;
        } catch (_) {
          return false;
        }
      }
      if (isSafeMediaUrl) {
        return isSafeMediaUrl(url);
      }
      try {
        const u = new URL(url);
        return u.protocol === "https:" && ["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"].includes(u.hostname) && !u.username && !u.password && !u.port && !u.hash && !/[\u0000-\u0020\u007f\\]/.test(url);
      } catch (_) {
        return false;
      }
    }
    __name(safeMedia, "safeMedia");
    function snapshot(panel, articleId) {
      const detail = panel.querySelector(".icon_share_data");
      const box = detail?.querySelector(".select_icon_box");
      const media = box ? [...box.querySelectorAll("img.select_icon, video.select_icon")] : [];
      const icons2 = [], seen = /* @__PURE__ */ new Set();
      for (let ordinal = 0; ordinal < media.length; ordinal++) {
        const node = media[ordinal], url = node.getAttribute("src") || node.querySelector("source")?.getAttribute("src");
        if (!safeMedia(url) || seen.has(url)) {
          continue;
        }
        seen.add(url);
        icons2.push({
          url,
          ordinal,
          node,
          mediaKind: node.tagName === "VIDEO" ? "video" : node.getAttribute("data-gifct") === "yes" ? "animated" : "image",
          format: new URL(url).pathname.split(".").pop()
        });
      }
      const button = detail?.querySelector(".btn_icon_load_more");
      const next = moreInfo(button);
      const text = detail?.textContent || "";
      const totalMatch = text.match(/총\s*([\d,]+)\s*개/);
      const declaredTotal = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null;
      const loadedText = detail?.querySelector(".loaded_icon_cnt")?.textContent || "";
      const loadedCount = Number(loadedText.replace(/[^\d]/g, "")) || media.length;
      const visible = panel.isConnected && !panel.hidden && panel.style.display !== "none" && detail?.style.display !== "none";
      const done = /모든 아이콘을 불러왔습니다/.test(text) || !button && declaredTotal !== null && media.length >= declaredTotal;
      return {
        icons: icons2,
        rawCount: media.length,
        loadedCount,
        declaredTotal,
        button,
        offset: next?.offset ?? null,
        articleId: next?.articleId || articleId,
        visible: !!visible,
        ready: !!box,
        loading: !!button && (/불러오는 중/.test(button.textContent) || button.disabled || button.getAttribute("aria-busy") === "true"),
        error: !!button && /불러오기 실패/.test(button.textContent),
        done
      };
    }
    __name(snapshot, "snapshot");
    class NativeLoadSession {
      static {
        __name(this, "NativeLoadSession");
      }
      constructor(options) {
        this.options = {
          intervalMs: 300,
          pollMs: 100,
          timeoutMs: 1e4,
          maxRequests: 256,
          maxIcons: 1e4,
          isCurrent: /* @__PURE__ */ __name(() => true, "isCurrent"),
          ...options
        };
        this.running = false;
      }
      async run(signal) {
        if (this.running) {
          throw new Error("이미 수집 중입니다.");
        }
        this.running = true;
        let count = 0, lastOffset = -1;
        const read = /* @__PURE__ */ __name(() => this.options.read(), "read");
        const report = /* @__PURE__ */ __name((s, status, message) => this.options.onProgress?.({
          ...s,
          status,
          phase: "native",
          processed: s.rawCount,
          loaded: s.rawCount,
          total: s.declaredTotal,
          uniqueCount: s.icons.length,
          requests: count,
          message,
          busy: status === "loading"
        }), "report");
        try {
          let s = read();
          if (!s.ready) {
            throw Object.assign(new Error("정상 아이콘 목록을 찾을 수 없습니다. 원래 선택기를 다시 열어 주세요."), { code: "NATIVE_UNAVAILABLE" });
          }
          while (true) {
            if (signal?.aborted) {
              throw stopped();
            }
            if (!s.visible || !this.options.isCurrent?.()) {
              throw stopped();
            }
            if (s.articleId !== this.options.articleId) {
              throw stopped();
            }
            report(s, "loading", "정상 사이트 버튼으로 순차 수집 중");
            if (s.done) {
              report(s, "complete", "사이트가 전체 로딩 완료를 표시했습니다.");
              return { ...s, status: "complete", requests: count };
            }
            if (!s.button || s.offset === null) {
              report(s, "partial", "완료를 확인할 수 없습니다. 원래 선택기에서 제공 범위를 확인해 주세요.");
              return { ...s, status: "partial", requests: count };
            }
            if (s.rawCount >= this.options.maxIcons || count >= this.options.maxRequests) {
              report(s, "partial", "수집 자원 상한입니다. 재시도로 이어서 수집할 수 있습니다.");
              return { ...s, status: "partial", requests: count };
            }
            if (s.offset <= lastOffset) {
              throw Object.assign(new Error("다음 로딩 위치가 증가하지 않아 중지했습니다."), { code: "OFFSET_STALLED" });
            }
            if (s.error) {
              throw Object.assign(new Error("사이트가 아이콘 로딩 실패를 표시했습니다. 재시도를 눌러 주세요."), { code: "NATIVE_ERROR" });
            }
            const start = Date.now();
            if (s.loading) {
              do {
                await delay(this.options.pollMs, signal);
                s = read();
                if (!s.visible || !this.options.isCurrent?.() || s.articleId !== this.options.articleId) {
                  throw stopped();
                }
              } while (s.loading && Date.now() - start < this.options.timeoutMs);
              if (s.loading) {
                throw Object.assign(new Error("기존 사이트 요청이 끝나지 않아 중지했습니다."), { code: "TIMEOUT" });
              }
              continue;
            }
            await delay(this.options.intervalMs, signal);
            if (!this.options.isCurrent?.() || signal?.aborted) {
              throw stopped();
            }
            const fresh = read();
            if (!fresh.visible || fresh.articleId !== this.options.articleId) {
              throw stopped();
            }
            if (fresh.loading || fresh.button !== s.button || fresh.offset !== s.offset || fresh.rawCount !== s.rawCount || fresh.done) {
              s = fresh;
              continue;
            }
            const before = s;
            lastOffset = s.offset;
            count++;
            this.options.click(s.button);
            const deadline = Date.now() + this.options.timeoutMs;
            while (true) {
              await delay(this.options.pollMs, signal);
              s = read();
              if (!s.visible || !this.options.isCurrent?.() || s.articleId !== this.options.articleId) {
                throw stopped();
              }
              if (s.error) {
                throw Object.assign(new Error("사이트 아이콘 로딩이 실패했습니다."), { code: "NATIVE_ERROR" });
              }
              if (!s.loading && (s.done || s.rawCount > before.rawCount || s.offset !== before.offset)) {
                break;
              }
              if (Date.now() >= deadline) {
                throw Object.assign(new Error("10초 동안 새 아이콘이 도착하지 않아 중지했습니다. 자동 재요청은 하지 않습니다."), { code: "TIMEOUT" });
              }
            }
            if (!s.done && s.rawCount <= before.rawCount) {
              throw Object.assign(new Error("목록 증가가 없어 수집을 중지했습니다."), { code: "NO_PROGRESS" });
            }
          }
        } catch (error) {
          const s = read();
          report(s, error.code === "ABORTED" ? "stopped" : "error", error.message);
          throw error;
        } finally {
          this.running = false;
        }
      }
    }
    function imageAttributes(node) {
      if (!["IMG", "VIDEO"].includes(node?.tagName?.toUpperCase())) {
        return { metadataId: null, tags: [], tagError: null };
      }
      const metadataId = node.getAttribute("data-aru-id"), raw = node.getAttribute("data-aru-tags");
      const id = typeof metadataId === "string" && metadataId.length <= 512 ? metadataId : null;
      if (raw == null || raw === "") {
        return { metadataId: id, tags: [], tagError: null };
      }
      try {
        if (!attributeTags) {
          throw Object.assign(new Error("Tag codec unavailable"), {
            code: "TAGS_CODEC_UNAVAILABLE"
          });
        }
        return {
          metadataId: id,
          tags: attributeTags.decode(raw),
          tagError: null
        };
      } catch (error) {
        return {
          metadataId: id,
          tags: [],
          tagError: error.code || "TAGS_INVALID"
        };
      }
    }
    __name(imageAttributes, "imageAttributes");
    function normalPack(s, articleId, title) {
      const sourceId = "article:" + articleId;
      return {
        id: "normal:" + articleId,
        kind: "NORMAL",
        name: title || "아이콘 글 " + articleId,
        mainArticleId: articleId,
        categories: [],
        tags: [],
        sources: [{ sourceId, articleId, title: title || "글 " + articleId }],
        attributeReaderVersion: 2,
        icons: s.icons.map((item) => {
          const attributes = item.attributes || imageAttributes(item.node);
          return {
            id: "normal:" + articleId + ":" + item.url,
            name: "아이콘 " + (item.ordinal + 1),
            url: item.url,
            variants: [{ role: "selection", url: item.url, articleId }],
            keywords: [...attributes.tags],
            categoryIds: [],
            tagIds: [],
            sourceId,
            imageMetadata: {
              id: attributes.metadataId,
              tags: [...attributes.tags]
            },
            mediaKind: item.mediaKind,
            format: item.format,
            origin: { sourceId, articleId, originalIndex: item.ordinal }
          };
        })
      };
    }
    __name(normalPack, "normalPack");
    function findArticleBody(doc) {
      let nodes = [
        ...doc.querySelectorAll('.view_content[itemprop="articleBody"]')
      ], selector = '.view_content[itemprop="articleBody"]';
      if (!nodes.length) {
        nodes = [...doc.querySelectorAll(".view_content article")];
        selector = ".view_content article";
      }
      if (nodes.length !== 1) {
        throw Object.assign(new Error("게시글 본문을 한 곳으로 식별할 수 없습니다. 페이지 전체는 수집하지 않습니다."), { code: "BODY_NOT_FOUND" });
      }
      return { element: nodes[0], selector };
    }
    __name(findArticleBody, "findArticleBody");
    function readArticlePack(doc, articleId, title, boardId = "98", options = {}) {
      const { element, selector } = findArticleBody(doc), base = readPath(articleId, "https://bbs.ruliweb.com", boardId);
      const nodes = [
        ...element.querySelectorAll("img,video,source[src],a[href]")
      ];
      if (nodes.length > 5e3) {
        throw Object.assign(new Error("본문 미디어 탐색 상한 5,000개를 넘었습니다."), { code: "RESOURCE_LIMIT" });
      }
      const media = nodes.filter((node) => ["IMG", "VIDEO"].includes(node.tagName.toUpperCase())), images = media.filter((node) => node.tagName.toUpperCase() === "IMG");
      const attributesByImage = /* @__PURE__ */ new WeakMap(), positions = /* @__PURE__ */ new WeakMap(), imagePositions = /* @__PURE__ */ new WeakMap();
      images.forEach((node, index) => imagePositions.set(node, index + 1));
      const metadataCounts = {
        images: images.length,
        videos: media.length - images.length,
        media: media.length,
        ids: 0,
        tagAttributes: 0,
        decoded: 0,
        decodeFailed: 0,
        taggedImages: 0,
        mediaIds: 0,
        mediaTagAttributes: 0,
        mediaDecoded: 0,
        mediaDecodeFailed: 0,
        taggedMedia: 0
      };
      media.forEach((node, index) => {
        positions.set(node, index + 1);
        const attrs = imageAttributes(node);
        attributesByImage.set(node, attrs);
        if (node.getAttribute("data-aru-id") != null) {
          metadataCounts.mediaIds++;
        }
        if (node.getAttribute("data-aru-tags") != null) {
          metadataCounts.mediaTagAttributes++;
          if (attrs.tagError) {
            metadataCounts.mediaDecodeFailed++;
          } else {
            metadataCounts.mediaDecoded++;
          }
        }
        if (attrs.tags.length) {
          metadataCounts.taggedMedia++;
        }
        if (node.tagName.toUpperCase() === "IMG") {
          if (node.getAttribute("data-aru-id") != null) {
            metadataCounts.ids++;
          }
          if (node.getAttribute("data-aru-tags") != null) {
            metadataCounts.tagAttributes++;
            if (attrs.tagError) {
              metadataCounts.decodeFailed++;
            } else {
              metadataCounts.decoded++;
            }
          }
          if (attrs.tags.length) {
            metadataCounts.taggedImages++;
          }
        }
      });
      const counts = {
        domNodes: nodes.length,
        bodyImages: images.length,
        bodyVideos: element.querySelectorAll("video").length,
        candidates: 0,
        excluded: 0,
        duplicates: 0,
        wrappedImages: 0,
        ignoredLinks: 0,
        finalIcons: 0,
        reasons: {},
        metadataImages: 0,
        taggedIcons: 0,
        tagErrors: 0,
        tagErrorCodes: {},
        metadata: metadataCounts
      };
      const icons2 = [], seen = /* @__PURE__ */ new Set(), imageAttributesByUrl = [], recordedOwners = /* @__PURE__ */ new WeakMap();
      const deliveredOwners = /* @__PURE__ */ new Map();
      const exclude = /* @__PURE__ */ __name((reason) => {
        counts.excluded++;
        counts.reasons[reason] = (counts.reasons[reason] || 0) + 1;
      }, "exclude");
      const scoped = /* @__PURE__ */ __name((n) => n.closest("[data-aru-icons-entry],[data-aru-icons-picker],[data-aru-body-download],.comment,.comment_view,.comment_wrapper,.comment_icon,.select_icon_box,.ad,.advertisement,[data-ad],.profile_image,.user_profile,.sidebar,.right_best,aside"), "scoped");
      const stream = /* @__PURE__ */ __name((url, type = "") => /\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(url).pathname) || [
        "application/vnd.apple.mpegurl",
        "application/x-mpegurl",
        "audio/mpegurl",
        "audio/x-mpegurl",
        "application/dash+xml",
        "video/mp2t"
      ].includes(type.split(";")[0].trim().toLowerCase()), "stream");
      const normalize2 = /* @__PURE__ */ __name((raw) => {
        if (typeof raw !== "string" || !raw || raw.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(raw)) {
          return null;
        }
        try {
          const url = new URL(raw, base).href;
          return safeMedia(url) ? url : null;
        } catch (_) {
          return null;
        }
      }, "normalize");
      for (const node of nodes) {
        const tag = node.tagName.toUpperCase();
        if (scoped(node)) {
          counts.candidates++;
          exclude("outside-content");
          continue;
        }
        if (tag === "SOURCE" && node.closest("video")) {
          continue;
        }
        if (tag === "IMG" && node.closest("a.img_load[href]")) {
          counts.wrappedImages++;
          continue;
        }
        const candidates = [];
        let owner = tag === "IMG" || tag === "VIDEO" ? node : null;
        if (tag === "A") {
          const raw = node.getAttribute("href") || "", type = node.getAttribute("type") || "";
          if (!node.matches("a.img_load") && !/\.(?:png|jpe?g|gif|webp|avif|mp4|webm|m3u8|mpd|m4s|ts)(?:[?#]|$)/i.test(raw) && !/^video\/(?:mp4|webm)(?:;|$)/i.test(type)) {
            counts.ignoredLinks++;
            continue;
          }
          candidates.push({ raw, type });
          const children = [...node.querySelectorAll?.("img") || []];
          if (children.length === 1) {
            owner = children[0];
          }
        }
        if (tag === "IMG") {
          let raw = node.getAttribute("src") || "";
          if ((!raw || /^(?:data:|about:blank)/i.test(raw)) && node.getAttribute("data-src")) {
            raw = node.getAttribute("data-src");
          }
          if (!raw) {
            const parts = (node.getAttribute("srcset") || "").split(",").map((x) => x.trim()).filter(Boolean);
            if (parts.length === 1) {
              raw = parts[0].split(/\s+/)[0];
            } else if (parts.length > 1) {
              counts.candidates++;
              exclude("ambiguous-srcset");
              continue;
            }
          }
          candidates.push({ raw });
        }
        if (tag === "VIDEO") {
          if (node.mediaKeys || node.getAttribute("data-drm") === "true" || node.getAttribute("data-encrypted") === "true") {
            counts.candidates++;
            exclude("encrypted-media");
            continue;
          }
          if (node.currentSrc && (/^blob:/i.test(node.currentSrc) || stream(node.currentSrc))) {
            counts.candidates++;
            exclude("streaming-media");
            continue;
          }
          for (const raw of [
            node.currentSrc,
            node.getAttribute("src"),
            node.src
          ]) {
            if (raw) {
              candidates.push({ raw });
            }
          }
          for (const child of node.querySelectorAll("source[src]")) {
            if (!scoped(child)) {
              for (const raw of [
                child.getAttribute("src"),
                child.src
              ]) {
                if (raw) {
                  candidates.push({
                    raw,
                    type: child.getAttribute("type") || ""
                  });
                }
              }
            }
          }
          if (!candidates.length) {
            candidates.push({ raw: "" });
          }
        }
        if (tag === "SOURCE") {
          for (const raw of [
            node.getAttribute("src"),
            node.src
          ]) {
            if (raw) {
              candidates.push({ raw, type: node.getAttribute("type") || "" });
            }
          }
        }
        const normalized = candidates.map((c) => ({
          ...c,
          url: normalize2(c.raw)
        })), streams = new Set(normalized.filter((c) => c.url && stream(c.url, c.type)).map((c) => c.url)), local = /* @__PURE__ */ new Set();
        for (const candidate of normalized) {
          const key = candidate.url || candidate.raw;
          if (local.has(key)) {
            continue;
          }
          local.add(key);
          counts.candidates++;
          const url = candidate.url;
          if (!url) {
            exclude("unsafe-url");
            continue;
          }
          const format = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
          if (streams.has(url)) {
            exclude("streaming-media");
            continue;
          }
          if (["svg", "mov", "mp3", "ogg"].includes(format)) {
            exclude("unsupported-format");
            continue;
          }
          const attributes = attributesByImage.get(owner) || imageAttributes(owner);
          let ownerUrls = owner && recordedOwners.get(owner);
          if (owner && !ownerUrls?.has(url)) {
            if (!ownerUrls) {
              ownerUrls = /* @__PURE__ */ new Set();
              recordedOwners.set(owner, ownerUrls);
            }
            ownerUrls.add(url);
            imageAttributesByUrl.push({
              url,
              ...attributes,
              imageIndex: imagePositions.get(owner),
              mediaIndex: positions.get(owner)
            });
            if (owner.getAttribute("data-aru-id") != null || owner.getAttribute("data-aru-tags") != null) {
              counts.metadataImages++;
            }
            if (attributes.tagError) {
              counts.tagErrors++;
              counts.tagErrorCodes[attributes.tagError] = (counts.tagErrorCodes[attributes.tagError] || 0) + 1;
            }
          }
          if (seen.has(url)) {
            counts.duplicates++;
            continue;
          }
          seen.add(url);
          if (owner) {
            deliveredOwners.set(url, owner);
          }
          const video = ["mp4", "webm"].includes(format) || tag === "VIDEO" || tag === "SOURCE" || /^video\//i.test(candidate.type || "");
          if (attributes.tags.length) {
            counts.taggedIcons++;
          }
          icons2.push({
            url,
            ordinal: counts.candidates - 1,
            mediaKind: video ? "video" : format === "gif" ? "animated" : "image",
            format,
            attributes
          });
        }
      }
      counts.finalIcons = icons2.length;
      const name = doc.querySelector('.subject_text[itemprop="headline"],.subject_text')?.textContent?.trim().slice(0, 120) || title;
      const pack = normalPack({ icons: icons2 }, articleId, name);
      pack.collectionMode = "article-body-v1";
      pack.boardId = String(boardId);
      pack.articleUrl = base;
      pack.bodySelector = selector;
      pack.bodyCounts = counts;
      if (String(boardId) !== "98") {
        pack.id = "normal:" + boardId + ":" + articleId;
        pack.sources[0].sourceId = "article:" + boardId + ":" + articleId;
        for (const icon of pack.icons) {
          icon.id = "normal:" + boardId + ":" + articleId + ":" + icon.url;
          icon.sourceId = pack.sources[0].sourceId;
          icon.origin.sourceId = icon.sourceId;
        }
      }
      for (const source of pack.sources) {
        source.boardId = String(boardId);
        source.articleUrl = base;
      }
      for (const icon of pack.icons) {
        icon.variants[0].role = "body";
      }
      let metadataDiagnostics = null;
      if (options.diagnostics === true) {
        const recordsByImage = /* @__PURE__ */ new Map(), iconsByUrl = new Map(pack.icons.map((icon) => [icon.url, icon]));
        for (const record of imageAttributesByUrl) {
          if (!recordsByImage.has(record.mediaIndex)) {
            recordsByImage.set(record.mediaIndex, []);
          }
          recordsByImage.get(record.mediaIndex).push(record);
        }
        metadataDiagnostics = {
          ...metadataCounts,
          mediaDetail: media.map((image, index) => {
            const attrs = attributesByImage.get(image), records = recordsByImage.get(index + 1) || [];
            const delivered = records.find((record) => deliveredOwners.get(record.url) === image);
            const icon = delivered && iconsByUrl.get(delivered.url);
            const wrapper = image.closest("a.img_load[href]");
            const reason = icon ? attrs.tagError ? "decode-failed" : image.getAttribute("data-aru-tags") == null ? "tag-attribute-missing" : attrs.tags.length ? "mapped" : "empty-tags" : scoped(image) ? "outside-content" : records.length ? "duplicate-url" : wrapper && wrapper.querySelectorAll("img").length !== 1 ? "ambiguous-wrapper-owner" : "no-collected-url";
            return {
              position: index + 1,
              imageIndex: imagePositions.get(image) || null,
              element: image.tagName.toUpperCase(),
              id: image.getAttribute("data-aru-id"),
              url: delivered?.url || records[0]?.url || normalize2(wrapper?.getAttribute("href") || image.getAttribute("src") || image.getAttribute("data-src")),
              rawTags: image.getAttribute("data-aru-tags"),
              decodedTags: [...attrs.tags],
              decodeError: attrs.tagError,
              iconId: icon?.id || null,
              reason
            };
          })
        };
        metadataDiagnostics.imagesDetail = metadataDiagnostics.mediaDetail.filter((row) => row.element === "IMG");
      }
      return {
        pack,
        counts,
        selector,
        imageAttributesByUrl,
        metadataDiagnostics
      };
    }
    __name(readArticlePack, "readArticlePack");
    function readPath(articleId, origin = global.location?.origin, boardId = "98") {
      const id = number(articleId);
      if (!id || !/^[1-9]\d{0,11}$/.test(String(boardId)) || !["https://bbs.ruliweb.com", "https://m.ruliweb.com"].includes(origin)) {
        throw new Error("허용되지 않은 공개 글 경로입니다.");
      }
      return origin + "/community/board/" + boardId + "/read/" + id;
    }
    __name(readPath, "readPath");
    async function getPublicDocument(articleId, { signal, origin = global.location?.origin, fetchFn = global.fetch, timeoutMs = 1e4, forceRead = false, boardId = "98" } = {}) {
      const url = readPath(articleId, origin, boardId);
      const current = global.document;
      if (!forceRead && global.location?.href?.split(/[?#]/)[0] === url && current?.querySelector('.view_content[itemprop="articleBody"],.view_content article')) {
        return current;
      }
      const controller = new AbortController(), abort = /* @__PURE__ */ __name(() => controller.abort(), "abort");
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) {
        controller.abort();
      }
      const timer = setTimeout(abort, timeoutMs);
      try {
        const response = await fetchFn(url, {
          method: "GET",
          credentials: "same-origin",
          mode: "same-origin",
          redirect: "error",
          cache: "no-cache",
          signal: controller.signal
        });
        if (response.redirected || response.url && response.url !== url) {
          throw Object.assign(new Error("공개 글이 다른 주소로 이동하여 읽기를 중지했습니다."), { code: "READ_REDIRECT" });
        }
        if (!response.ok) {
          throw Object.assign(new Error("공개 글 " + articleId + " 조회 실패 (HTTP " + response.status + "). 접근 제한을 우회하지 않습니다."), {
            code: [401, 403, 429].includes(response.status) ? "ACCESS_DENIED" : "READ_FAILED",
            articleId
          });
        }
        const maxBytes = 3 * 1024 * 1024;
        if (Number(response.headers?.get("content-length")) > maxBytes) {
          throw new Error("공개 글 응답 크기 상한을 넘었습니다.");
        }
        let html = "";
        if (response.body?.getReader) {
          const reader = response.body.getReader(), decoder = new TextDecoder2();
          let bytes = 0;
          try {
            while (true) {
              const r = await reader.read();
              if (controller.signal.aborted) {
                await reader.cancel();
                throw stopped();
              }
              if (r.done) {
                break;
              }
              bytes += r.value.byteLength;
              if (bytes > maxBytes) {
                await reader.cancel();
                throw new Error("공개 글 응답 크기 상한을 넘었습니다.");
              }
              html += decoder.decode(r.value, { stream: true });
            }
            html += decoder.decode();
          } finally {
            reader.releaseLock();
          }
        } else {
          html = await response.text();
          if (new TextEncoder().encode(html).length > maxBytes) {
            throw new Error("공개 글 응답 크기 상한을 넘었습니다.");
          }
        }
        if (controller.signal.aborted) {
          throw stopped();
        }
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc.querySelector('.view_content[itemprop="articleBody"],.view_content article')) {
          throw Object.assign(new Error("글 본문을 확인할 수 없습니다. 정상 탭에서 해당 글을 열어 주세요."), { code: "READ_UNAVAILABLE" });
        }
        return doc;
      } catch (error) {
        if (controller.signal.aborted) {
          throw signal?.aborted ? stopped() : Object.assign(new Error("공개 글 조회 시간이 초과되어 중지했습니다."), { code: "TIMEOUT" });
        }
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    }
    __name(getPublicDocument, "getPublicDocument");
    async function verifyReferences(result, { signal, onProgress, readDocument = getPublicDocument, intervalMs = 300 } = {}) {
      const slaves = result.v1Slaves || [];
      const states = [];
      let verified = 0, processed = 0;
      const iconsByReference = /* @__PURE__ */ new Map(), repeatCounts = /* @__PURE__ */ new Map(), readSources = /* @__PURE__ */ new Map();
      for (const icon of result.pack.icons) {
        const key = icon.ref?.page + ":" + icon.origin?.articleId;
        if (!iconsByReference.has(key)) {
          iconsByReference.set(key, []);
        }
        iconsByReference.get(key).push(icon);
      }
      for (const slave of slaves) {
        repeatCounts.set(slave.articleId, (repeatCounts.get(slave.articleId) || 0) + 1);
      }
      const progress = /* @__PURE__ */ __name((phase, message, status = "loading") => onProgress?.({
        status,
        phase,
        processed,
        total: result.pack.icons.length,
        loaded: result.pack.icons.length,
        verifiedCount: verified,
        declaredCount: result.pack.icons.length,
        referencesProcessed: states.length,
        referencesTotal: slaves.length,
        message,
        states: [...states],
        busy: status === "loading"
      }), "progress");
      const check = /* @__PURE__ */ __name(() => {
        if (signal?.aborted) {
          throw stopped();
        }
      }, "check");
      for (const slave of slaves) {
        check();
        progress("references", "원본 글 " + slave.articleId + "을 확인하고 있어요.");
        if (!readSources.has(slave.articleId)) {
          await delay(intervalMs, signal);
        }
        try {
          let observed = readSources.get(slave.articleId);
          if (!observed) {
            const doc2 = await readDocument(slave.articleId, { signal });
            check();
            const body = doc2.querySelector('.view_content[itemprop="articleBody"],.view_content article');
            if (!body) {
              throw new Error("원본 본문 없음");
            }
            progress("tags", "원본 아이콘과 태그를 읽고 있어요.");
            let articleRead2 = null, attributeError2 = null;
            try {
              articleRead2 = readArticlePack(doc2, slave.articleId, "", "98");
            } catch (error) {
              attributeError2 = error.code || "ATTRIBUTES_UNAVAILABLE";
            }
            const urls2 = new Set(articleRead2?.pack.icons.map((icon) => icon.url) || []);
            for (const node of body.querySelectorAll("img,video,video source,a[href]")) {
              const raw = node.getAttribute("src") || node.getAttribute("data-src") || node.getAttribute("href");
              if (!raw) {
                continue;
              }
              try {
                const absolute = new URL(raw, readPath(slave.articleId, "https://bbs.ruliweb.com", "98")).href;
                if (safeMedia(absolute)) {
                  urls2.add(absolute);
                }
              } catch (_) {
              }
            }
            const byUrl2 = /* @__PURE__ */ new Map(), mediaByUrl2 = new Map((articleRead2?.pack.icons || []).map((icon) => [
              icon.url,
              icon
            ]));
            for (const item of articleRead2?.imageAttributesByUrl || []) {
              if (!byUrl2.has(item.url)) {
                byUrl2.set(item.url, []);
              }
              byUrl2.get(item.url).push(item);
            }
            observed = {
              doc: doc2,
              articleRead: articleRead2,
              attributeError: attributeError2,
              urls: urls2,
              byUrl: byUrl2,
              mediaByUrl: mediaByUrl2
            };
            if (repeatCounts.get(slave.articleId) > 1) {
              readSources.set(slave.articleId, observed);
            }
          }
          check();
          const { doc, articleRead, attributeError, urls, byUrl, mediaByUrl } = observed;
          const matched = slave.images.filter((url) => urls.has(url)).length;
          verified += matched;
          processed += slave.images.length;
          let tagged = 0, ambiguous = 0, tagErrors = 0, metadataReadError = attributeError;
          try {
            const metadata2 = articleRead;
            tagErrors = metadata2.counts.tagErrors;
            for (const icon of iconsByReference.get(slave.page + ":" + slave.articleId) || []) {
              const entries = byUrl.get(icon.url) || [];
              if (entries.length > 1) {
                ambiguous++;
                continue;
              }
              const attrs = entries[0];
              if (!attrs) {
                continue;
              }
              icon.imageMetadata = {
                id: attrs.metadataId,
                tags: [...attrs.tags]
              };
              icon.keywords = [
                .../* @__PURE__ */ new Set([...icon.keywords || [], ...attrs.tags])
              ];
              const original = mediaByUrl.get(icon.url);
              if (original) {
                icon.mediaKind = original.mediaKind;
                icon.format = original.format;
              }
              if (attrs.tags.length) {
                tagged++;
              }
            }
          } catch (error) {
            metadataReadError = error.code || "ATTRIBUTES_UNAVAILABLE";
          }
          const title = doc.querySelector(".subject_text,.subject,.view_content h1")?.textContent?.trim().slice(0, 120) || "글 " + slave.articleId;
          const source = result.pack.sources.find((s) => s.articleId === slave.articleId);
          if (source) {
            source.title = title;
          }
          const missing = [];
          for (let index = 0; index < slave.images.length; index++) {
            if (!urls.has(slave.images[index])) {
              if (missing.length === 5) {
                break;
              }
              const url = new URL(slave.images[index]);
              missing.push({ index, url: url.origin + url.pathname });
            }
          }
          states.push({
            articleId: slave.articleId,
            page: slave.page,
            status: matched === slave.images.length ? "verified" : "url-unconfirmed",
            declared: slave.images.length,
            matched,
            tagged,
            ambiguousMetadata: ambiguous,
            tagErrors,
            metadataReadError,
            metadataStatus: metadataReadError || tagErrors || ambiguous ? "partial" : articleRead?.counts.metadata.mediaTagAttributes ? "complete" : "none",
            missingCount: slave.images.length - matched,
            missing
          });
        } catch (error) {
          if (error.code === "ABORTED" || signal?.aborted) {
            throw stopped();
          }
          states.push({
            articleId: slave.articleId,
            page: slave.page,
            status: "unavailable",
            message: error.message
          });
          if (error.code === "ACCESS_DENIED" || error.code === "TIMEOUT") {
            progress("references", error.message, "partial");
            return {
              states,
              verifiedCount: verified,
              processedCount: processed,
              status: "partial",
              stoppedByRestriction: true
            };
          }
        }
        progress("references", "원본 " + states.length + "/" + slaves.length + "개를 확인했어요.");
      }
      const complete = states.every((x) => x.status === "verified" && x.metadataStatus !== "partial");
      return {
        states,
        verifiedCount: verified,
        processedCount: processed,
        referencesProcessed: states.length,
        referencesTotal: slaves.length,
        status: complete ? "complete" : "partial"
      };
    }
    __name(verifyReferences, "verifyReferences");
    function prepareInsertion(icon, context) {
      const variants = icon.variants || icon.media?.variants || [];
      const url = variants.find((v) => v.role === "selection")?.url || icon.url;
      const nodes = context?.panel?.querySelectorAll?.("img.select_icon,video.select_icon") || [];
      const native = [...nodes].find((node) => (node.getAttribute("src") || node.querySelector("source")?.getAttribute("src")) === url);
      return {
        iconId: icon.id,
        url,
        available: !!native,
        context: context?.kind || "unknown",
        nativeElement: native || null,
        message: native ? "네이티브 선택 항목을 확인했습니다. Phase 1은 선택 정보만 준비하며 삽입·등록은 실행하지 않습니다." : "원래 선택기에 대응 항목이 없습니다. 삽입 지원은 검증 대기입니다."
      };
    }
    __name(prepareInsertion, "prepareInsertion");
    return {
      selectionId,
      moreInfo,
      snapshot,
      normalPack,
      imageAttributes,
      findArticleBody,
      readArticlePack,
      readPath,
      getPublicDocument,
      verifyReferences,
      prepareInsertion,
      NativeLoadSession,
      delay,
      safeMedia
    };
  }
  __name(createSiteAdapter, "createSiteAdapter");

  // docs/source/ruliweb-icons/composer-adapter.mjs
  function createComposerAdapter({ environment: global = defaultEnvironment, site = createSiteAdapter({ environment: global }), getDesignSystem = /* @__PURE__ */ __name(() => null, "getDesignSystem") } = {}) {
    const { MutationObserver, AbortController, CustomEvent } = global;
    const requestAnimationFrame = /* @__PURE__ */ __name((callback) => global.requestAnimationFrame(callback), "requestAnimationFrame");
    const cancelAnimationFrame = /* @__PURE__ */ __name((frame) => global.cancelAnimationFrame(frame), "cancelAnimationFrame");
    const REQUEST = "aru-icons-composer-request-v1", RESPONSE = "aru-icons-composer-response-v1";
    const token = /* @__PURE__ */ __name(() => global.crypto.randomUUID().replaceAll("-", ""), "token");
    function request(document, op, payload = {}) {
      const requestId = token();
      return new Promise((resolve, reject) => {
        let replied = false;
        const listener = /* @__PURE__ */ __name((event) => {
          if (event.target !== document || typeof event.detail !== "string") {
            return;
          }
          let reply;
          try {
            reply = JSON.parse(event.detail);
          } catch (_) {
            return;
          }
          if (reply.requestId !== requestId) {
            return;
          }
          replied = true;
          document.removeEventListener(RESPONSE, listener);
          if (reply.ok) {
            resolve(reply.result);
          } else {
            reject(Object.assign(new Error(reply.error?.message || "작성기에 반영하지 못했습니다."), { code: reply.error?.code }));
          }
        }, "listener");
        document.addEventListener(RESPONSE, listener);
        document.dispatchEvent(new CustomEvent(REQUEST, {
          detail: JSON.stringify({ requestId, op, ...payload })
        }));
        if (!replied) {
          document.removeEventListener(RESPONSE, listener);
          reject(Object.assign(new Error("네이티브 연결 모듈 응답이 없습니다. 테스트 확장을 다시 로드하고 페이지를 새로 열어 주세요."), { code: "BRIDGE_UNAVAILABLE" }));
        }
      });
    }
    __name(request, "request");
    function selectedMedia(icon) {
      const variants = icon.variants || icon.media?.variants || [];
      const v = variants.find((v2) => v2.role === "selection") || variants.find((v2) => v2.role === "original") || variants.find((v2) => v2.role === "body") || variants[0];
      const url = v?.url || icon.url;
      const format = v?.format || icon.media?.format || icon.format;
      const kind = v?.kind || icon.media?.kind || icon.mediaKind;
      return {
        url,
        format,
        kind: kind === "animated" ? "image" : kind === "unknown" ? void 0 : kind
      };
    }
    __name(selectedMedia, "selectedMedia");
    function nativeButton(wrapper) {
      return [...wrapper.querySelectorAll("button[onclick],span[onclick]")].find((node) => {
        const code = node.getAttribute("onclick") || "";
        return /app\.comment_icon(?:_toggle)?\(/.test(code) && !/['"](?:preset|pick)['"]/.test(code) && node.closest(".common_write_wrapper") === wrapper && !node.closest(".comment_icon");
      });
    }
    __name(nativeButton, "nativeButton");
    function packChoices(panel) {
      const seen = /* @__PURE__ */ new Set(), choices = [];
      for (const node of panel?.querySelectorAll(".icon_data_show_target[onclick]") || []) {
        const articleId = site.selectionId(node);
        if (!articleId || seen.has(articleId)) {
          continue;
        }
        seen.add(articleId);
        choices.push({
          articleId,
          title: node.getAttribute("title") || "글 " + articleId
        });
      }
      return choices;
    }
    __name(packChoices, "packChoices");
    function parseArticle(value) {
      const text = String(value || "").trim();
      let id = text;
      if (!/^[1-9]\d*$/.test(text)) {
        let url;
        try {
          url = new URL(text);
        } catch (_) {
          throw new Error("루리웹 아이콘 게시판의 글 URL 또는 번호를 입력해 주세요.");
        }
        if (url.protocol !== "https:" || !["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) || url.port || url.username || url.password || url.hash || !/^\/community\/board\/98\/read\/([1-9]\d*)\/?$/.test(url.pathname)) {
          throw new Error("아이콘 게시판의 공개 읽기 URL만 사용할 수 있습니다.");
        }
        id = url.pathname.match(/\/read\/([1-9]\d*)/)[1];
      }
      if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) {
        throw new Error("글 번호가 올바르지 않습니다.");
      }
      return Number(id);
    }
    __name(parseArticle, "parseArticle");
    class ComposerController {
      static {
        __name(this, "ComposerController");
      }
      constructor({ document = global.document, onOpen, onRemoved, debug = false } = {}) {
        this.document = document;
        this.onOpen = onOpen;
        this.onRemoved = onRemoved;
        this.debug = debug;
        this.entries = /* @__PURE__ */ new Map();
        this.frame = 0;
        this.stopped = true;
      }
      start() {
        if (!this.stopped) {
          return;
        }
        this.stopped = false;
        this.scan();
        this.observer = new MutationObserver((records) => {
          if (this.stopped) {
            return;
          }
          const relevant = records.some((record) => {
            if (record.target.closest?.("[data-aru-icons-entry],[data-aru-icons-picker]")) {
              return false;
            }
            return [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1 && !node.matches("[data-aru-icons-entry],[data-aru-icons-picker]") && (node.matches(".common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar") || node.querySelector(".common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar")));
          });
          if (relevant && !this.frame) {
            this.frame = requestAnimationFrame(() => {
              this.frame = 0;
              if (!this.stopped) {
                this.scan();
              }
            });
          }
        });
        this.observer.observe(this.document.body, {
          childList: true,
          subtree: true
        });
      }
      scan() {
        for (const [root, entry] of this.entries) {
          if (!root.isConnected || !entry.anchor.isConnected || !entry.host.isConnected) {
            entry.events.abort();
            entry.uiCleanup?.();
            entry.host.remove();
            root.removeAttribute("data-aru-composer-token");
            this.entries.delete(root);
            this.onRemoved?.(root);
          }
        }
        for (const root of this.document.querySelectorAll(".common_write_wrapper")) {
          if (this.entries.has(root) || root.closest("#editor_v2")) {
            continue;
          }
          const inputs = [
            ...root.querySelectorAll("textarea.comment_input,textarea.reply_input")
          ].filter((n) => n.closest(".common_write_wrapper") === root);
          const anchor = nativeButton(root);
          if (inputs.length !== 1 || !anchor) {
            continue;
          }
          this.add(root, anchor, inputs[0].matches(".reply_input") ? "reply" : "comment");
        }
        for (const root of this.document.querySelectorAll("#editor_v2 .seditor")) {
          if (this.entries.has(root) || !root.querySelector("#ReactSummernoteLite")) {
            continue;
          }
          const camera = root.querySelector(".note-toolbar .icon-camera");
          const anchor = camera?.closest("button");
          if (anchor) {
            this.add(root, anchor, "post");
          }
        }
      }
      add(root, anchor, kind) {
        const id = token();
        root.dataset.aruComposerToken = id;
        const host = this.document.createElement("span");
        host.dataset.aruIconsEntry = "true";
        const shadow = host.attachShadow({ mode: "open" }), style = this.document.createElement("style"), button = this.document.createElement("button");
        style.textContent = ":host{display:inline-block;vertical-align:middle;margin:0 4px}button{all:initial;box-sizing:border-box;display:inline-block;padding:5px 9px;border:1px solid #78609f;border-radius:6px;background:#f4effb;color:#463362;font:13px/1.4 system-ui;cursor:pointer;min-height:30px}button:focus-visible{outline:2px solid #7150b6}button:disabled{opacity:.5}";
        button.type = "button";
        button.textContent = "아이콘 선택";
        button.setAttribute("aria-label", kind === "post" ? "아이콘 선택 · 게시글" : kind === "reply" ? "아이콘 선택 · 이 답글" : "아이콘 선택 · 이 댓글");
        shadow.append(style, button);
        const uiCleanup = getDesignSystem()?.entry(shadow, {
          label: "아이콘 선택",
          tooltip: "아이콘 라이브러리에서 원하는 아이콘을 선택해 삽입합니다.",
          priority: "primary"
        });
        anchor.after(host);
        const events = new AbortController();
        const entry = {
          root,
          anchor,
          kind,
          host,
          button,
          token: id,
          events,
          uiCleanup,
          pending: null
        };
        this.entries.set(root, entry);
        button.addEventListener("pointerdown", (event) => {
          if (event.button === 0) {
            event.preventDefault();
          }
        }, { signal: events.signal });
        button.addEventListener("click", async () => {
          if (entry.pending || this.stopped) {
            return;
          }
          button.disabled = true;
          button.setAttribute("aria-busy", "true");
          const pending = request(this.document, "capture", {
            token: id,
            debug: this.debug
          });
          entry.pending = pending;
          try {
            const session = await pending;
            if (this.stopped || !root.isConnected || this.entries.get(root) !== entry) {
              await request(this.document, "release", {
                session: session.session
              });
              return;
            }
            await this.onOpen({ ...entry, session });
          } catch (error) {
            if (this.debug) {
              global.console?.info?.("[Aru Icons Composer]", {
                stage: "capture",
                status: "failed",
                code: error.code || "CAPTURE_FAILED",
                kind,
                connected: root.isConnected
              });
            }
            if (!this.stopped) {
              await this.onOpen({ ...entry, error });
            }
          } finally {
            entry.pending = null;
            if (button.isConnected) {
              button.disabled = false;
              button.removeAttribute("aria-busy");
            }
          }
        }, { signal: events.signal });
      }
      stop() {
        this.stopped = true;
        this.observer?.disconnect();
        if (this.frame) {
          cancelAnimationFrame(this.frame);
        }
        this.frame = 0;
        for (const [root, entry] of this.entries) {
          entry.events.abort();
          entry.uiCleanup?.();
          entry.host.remove();
          root.removeAttribute("data-aru-composer-token");
        }
        this.entries.clear();
      }
    }
    return {
      ComposerAdapter: Object.freeze({
        request,
        selectedMedia,
        nativeButton,
        packChoices,
        parseArticle
      }),
      ComposerController
    };
  }
  __name(createComposerAdapter, "createComposerAdapter");

  // docs/source/compat/composer-adapter.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  Object.assign(icons, createComposerAdapter({ environment: globalThis, site: icons.SiteAdapter, getDesignSystem: /* @__PURE__ */ __name(() => icons.DesignSystem, "getDesignSystem") }));
})();
