// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // shared/icon-metadata/tag-codec.mjs
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

  // shared/icon-metadata/tag-edit-model.mjs
  function plan(images, handles, tags, operation, generate) {
    if (!["add", "remove", "replace"].includes(operation)) {
      fail("OP_INVALID", "태그 작업을 선택해 주세요.");
    }
    const normalizedTags = normalize(tags);
    if (operation !== "replace" && !normalizedTags.length) {
      fail("TAGS_EMPTY", "추가하거나 제거할 태그를 지정해 주세요.");
    }
    const selected = new Set(handles);
    if (!selected.size || selected.size !== handles.length) {
      fail("SELECTION_INVALID", "선택한 이미지가 없거나 중복되었습니다.");
    }
    const available = new Set(images.map((image) => image.handle));
    for (const handle of selected) {
      if (!available.has(handle)) {
        fail("IMAGE_CHANGED", "선택한 이미지가 삭제되거나 교체되었습니다. 목록을 다시 확인해 주세요.");
      }
    }
    const occupied = new Set(images.filter((image) => !selected.has(image.handle) && image.id).map((image) => image.id));
    const allIds = new Set(images.filter((image) => image.id).map((image) => image.id));
    const changes = [];
    const remove = new Set(normalizedTags);
    let ids = 0;
    let tagChanges = 0;
    for (const image of images) {
      if (!selected.has(image.handle)) {
        continue;
      }
      const before = decode(image.rawTags);
      const after = operation === "add" ? normalize(before.concat(normalizedTags)) : operation === "remove" ? before.filter((tag) => !remove.has(tag)) : normalizedTags;
      let id = image.id;
      if (!id || occupied.has(id)) {
        let tries = 0;
        do {
          id = generate();
          if (++tries > 100) {
            fail("ID_COLLISION", "고유 ID 생성에 실패했습니다.");
          }
        } while (allIds.has(id) || occupied.has(id));
        if (typeof id !== "string" || !id) {
          fail("ID_INVALID", "고유 ID 생성에 실패했습니다.");
        }
        allIds.add(id);
      }
      occupied.add(id);
      const same = JSON.stringify(before) === JSON.stringify(after);
      const rawTags = same && image.rawTags != null ? image.rawTags : encode(after);
      if (id !== image.id || rawTags !== image.rawTags) {
        changes.push({ handle: image.handle, id, rawTags });
        if (id !== image.id) {
          ids++;
        }
        if (rawTags !== image.rawTags) {
          tagChanges++;
        }
      }
    }
    return {
      changes,
      selected: selected.size,
      changed: changes.length,
      ids,
      tagChanges
    };
  }
  __name(plan, "plan");
  var Selection = class {
    static {
      __name(this, "Selection");
    }
    values;
    anchor;
    constructor() {
      this.values = /* @__PURE__ */ new Set();
      this.anchor = null;
    }
    click(handle, order, { ctrlKey = false, metaKey = false, shiftKey = false, checkbox = false } = {}) {
      const additive = ctrlKey || metaKey;
      if (shiftKey && this.anchor && order.includes(this.anchor)) {
        if (!additive) {
          this.values.clear();
        }
        const start = order.indexOf(this.anchor);
        const end = order.indexOf(handle);
        for (const value of order.slice(Math.min(start, end), Math.max(start, end) + 1)) {
          this.values.add(value);
        }
      } else if (additive || checkbox) {
        if (this.values.has(handle)) {
          this.values.delete(handle);
        } else {
          this.values.add(handle);
        }
        this.anchor = handle;
      } else {
        this.values = /* @__PURE__ */ new Set([handle]);
        this.anchor = handle;
      }
    }
    all(order) {
      this.values = new Set(order);
    }
    clear() {
      this.values.clear();
      this.anchor = null;
    }
    retain(order) {
      const keep = new Set(order);
      for (const handle of this.values) {
        if (!keep.has(handle)) {
          this.values.delete(handle);
        }
      }
      if (!keep.has(this.anchor)) {
        this.anchor = null;
      }
    }
  };

  // docs/source/compat/metadata-writer.mjs
  Object.assign(globalThis.AruMetadata = globalThis.AruMetadata || {}, { PREFIX, FIXED, fail, normalize, decode, encode, plan, Selection });
})();
