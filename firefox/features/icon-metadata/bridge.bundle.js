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
      if (typeof value !== "string") fail("TAGS_INVALID", "태그는 문자열이어야 합니다.");
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
    if (raw == null || raw === "") return [];
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
      if (error.code) throw error;
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
    tags = normalize(tags);
    if (operation !== "replace" && !tags.length) {
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
    const remove = new Set(tags);
    let ids = 0;
    let tagChanges = 0;
    for (const image of images) {
      if (!selected.has(image.handle)) continue;
      const before = decode(image.rawTags);
      const after = operation === "add" ? normalize(before.concat(tags)) : operation === "remove" ? before.filter((tag) => !remove.has(tag)) : tags;
      let id = image.id;
      if (!id || occupied.has(id)) {
        let tries = 0;
        do {
          id = generate();
          if (++tries > 100) fail("ID_COLLISION", "고유 ID 생성에 실패했습니다.");
        } while (allIds.has(id) || occupied.has(id));
        if (typeof id !== "string" || !id) fail("ID_INVALID", "고유 ID 생성에 실패했습니다.");
        allIds.add(id);
      }
      occupied.add(id);
      const same = JSON.stringify(before) === JSON.stringify(after);
      const rawTags = same && image.rawTags != null ? image.rawTags : encode(after);
      if (id !== image.id || rawTags !== image.rawTags) {
        changes.push({ handle: image.handle, id, rawTags });
        if (id !== image.id) ids++;
        if (rawTags !== image.rawTags) tagChanges++;
      }
    }
    return { changes, selected: selected.size, changed: changes.length, ids, tagChanges };
  }
  __name(plan, "plan");
  var Selection = class {
    static {
      __name(this, "Selection");
    }
    constructor() {
      this.values = /* @__PURE__ */ new Set();
      this.anchor = null;
    }
    click(handle, order, { ctrlKey = false, metaKey = false, shiftKey = false, checkbox = false } = {}) {
      const additive = ctrlKey || metaKey;
      if (shiftKey && this.anchor && order.includes(this.anchor)) {
        if (!additive) this.values.clear();
        const start = order.indexOf(this.anchor);
        const end = order.indexOf(handle);
        for (const value of order.slice(Math.min(start, end), Math.max(start, end) + 1)) {
          this.values.add(value);
        }
      } else if (additive || checkbox) {
        if (this.values.has(handle)) this.values.delete(handle);
        else this.values.add(handle);
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
        if (!keep.has(handle)) this.values.delete(handle);
      }
      if (!keep.has(this.anchor)) this.anchor = null;
    }
  };

  // docs/source/compat/metadata-writer.mjs
  Object.assign(globalThis.AruMetadata = globalThis.AruMetadata || {}, { PREFIX, FIXED, fail, normalize, decode, encode, plan, Selection });

  // docs/source/icon-metadata/metadata-editor-bridge.mjs
  function installMetadataEditorBridge(g = globalThis) {
    const M = { decode, fail, plan }, d = g.document;
    if (!d || !/^(bbs|m)\.ruliweb\.com$/.test(g.location.hostname) || g.__aruMetadataBridgeInstalled) return;
    g.__aruMetadataBridgeInstalled = true;
    const REQUEST = "aru-metadata-request-v1", RESPONSE = "aru-metadata-response-v1", COUNT = "aru-metadata-count-v1";
    const sessions = /* @__PURE__ */ new Map(), watchers = /* @__PURE__ */ new Map(), lastCounts = /* @__PURE__ */ new Map(), handles = /* @__PURE__ */ new WeakMap();
    const uuid = /* @__PURE__ */ __name(() => g.crypto.randomUUID().replaceAll("-", ""), "uuid");
    const valid = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(s), "valid");
    function target(token) {
      if (!valid(token)) M.fail("TARGET_INVALID", "에디터 식별값이 올바르지 않습니다.");
      const nodes = d.querySelectorAll('[data-aru-metadata-target="' + token + '"]');
      const root = nodes.length === 1 ? nodes[0] : null;
      if (!root?.isConnected || !root.matches("#editor_v2 .seditor")) M.fail("EDITOR_CHANGED", "에디터가 제거되거나 교체되었습니다.");
      const input = root.querySelector('.note-editable[contenteditable="true"]'), source = root.querySelector("#ReactSummernoteLite");
      for (let n = root; n && n.nodeType === 1; n = n.parentElement) if (n.hidden || g.getComputedStyle(n).display === "none") M.fail("EDITOR_UNSUPPORTED", "숨겨진 에디터에는 적용할 수 없습니다. 에디터2 편집 화면으로 돌아와 주세요.");
      if (!input || !source || root.querySelector(".note-editor.codeview,.btn-codeview.active")) M.fail("EDITOR_UNSUPPORTED", "에디터2의 편집 화면에서 사용해 주세요.");
      const $ = g.jQuery, editor = $?.(source), context = editor?.data("summernote"), native = context?.modules?.editor, history2 = native?.history;
      if (d.querySelectorAll("#ReactSummernoteLite").length !== 1 || native?.editable !== input || !Array.isArray(history2?.stack) || !Number.isInteger(history2.stackOffset) || typeof history2.recordUndo !== "function" || typeof native.beforeCommand !== "function" || typeof context.triggerEvent !== "function" || typeof g.seditor?.getHtml !== "function") M.fail("EDITOR_API_UNAVAILABLE", "Summernote 기록·직렬화 API를 확인하지 못했습니다.");
      return { token, root, input, source, editor, context, history: history2 };
    }
    __name(target, "target");
    function count(t) {
      const imgs = [...t.input.querySelectorAll("img")], videos = t.input.querySelectorAll("video").length;
      const policyImages = imgs.filter((n) => (n.getAttribute("src") || "").trim()).length;
      const boardInputs = [...d.querySelectorAll('input[name="board_id"]')];
      const boards = new Set(boardInputs.map((n) => n.value.trim()).filter(Boolean));
      const board = boards.size === 1 ? [...boards][0] : null;
      const limit = board === "98" ? 100 : null, total = policyImages + videos;
      return {
        images: imgs.length,
        policyImages,
        videos,
        total,
        limit,
        board,
        limitUnit: limit ? "img-with-src-plus-video" : null,
        reached: limit !== null && total >= limit,
        exceeded: limit !== null && total > limit
      };
    }
    __name(count, "count");
    function list(t) {
      const nodes = [...t.input.querySelectorAll("img")];
      if (nodes.length > 1e4) M.fail("IMAGE_LIMIT", "이 편집기의 한 번 수집 범위인 이미지 10,000개를 넘었습니다.");
      const ids = /* @__PURE__ */ new Map();
      const images = nodes.map((node, index) => {
        if (!handles.has(node)) handles.set(node, uuid());
        const id = node.getAttribute("data-aru-id"), rawTags = node.getAttribute("data-aru-tags");
        if (id) ids.set(id, (ids.get(id) || 0) + 1);
        let tags = [], error = null;
        try {
          tags = M.decode(rawTags);
        } catch (e) {
          error = e.code;
        }
        return { handle: handles.get(node), id, rawTags, tags, error, index, src: node.currentSrc || ((node.getAttribute("src") || "").trim() ? node.src : ""), alt: node.getAttribute("alt") || "" };
      });
      return { nodes, images, collisions: [...ids.values()].reduce((n, x) => n + Math.max(0, x - 1), 0) };
    }
    __name(list, "list");
    function scan(token, session) {
      const t = target(token), r = list(t);
      let s = session && sessions.get(session);
      if (s && (s.input !== t.input || s.source !== t.source)) M.fail("EDITOR_CHANGED", "에디터가 바뀌었습니다. 다시 열어 주세요.");
      if (!s) {
        if (sessions.size >= 2) M.fail("SESSION_LIMIT", "다른 메타데이터 편집기를 닫아 주세요.");
        session = uuid();
        s = { ...t, commands: [], cursor: 0 };
        sessions.set(session, s);
      }
      s.touched = Date.now();
      return { session, images: r.images, collisions: r.collisions, count: count(t), ...historyState(s) };
    }
    __name(scan, "scan");
    function current(session) {
      const s = sessions.get(session);
      if (!s || Date.now() - s.touched > 30 * 60 * 1e3) M.fail("SESSION_EXPIRED", "편집 대상이 만료되었습니다. 다시 열어 주세요.");
      const t = target(s.token);
      if (t.input !== s.input || t.source !== s.source || t.context !== s.context) M.fail("EDITOR_CHANGED", "에디터가 교체되었습니다. 다시 열어 주세요.");
      s.touched = Date.now();
      return s;
    }
    __name(current, "current");
    function historyState(s) {
      const h = s.history, prev = s.commands[s.cursor - 1], next = s.commands[s.cursor];
      return {
        canUndo: !!prev && h.stack[h.stackOffset] === prev.after && s.input.innerHTML === prev.after.contents,
        canRedo: !!next && h.stack[h.stackOffset] === next.before && s.input.innerHTML === next.before.contents
      };
    }
    __name(historyState, "historyState");
    function preview(s, p) {
      return M.plan(list(s).images, p.handles, p.tags, p.operation, uuid);
    }
    __name(preview, "preview");
    function apply(session, p) {
      const s = current(session), r = list(s), plan2 = M.plan(r.images, p.handles, p.tags, p.operation, uuid);
      if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) M.fail("UPLOAD_PENDING", "진행 중인 이미지 업로드가 완료된 뒤 적용해 주세요.");
      if (!plan2.changed) return { ...plan2, ...historyState(s) };
      const byHandle = new Map(r.nodes.map((n) => [handles.get(n), n]));
      const backups = plan2.changes.map((x) => ({ node: byHandle.get(x.handle), id: byHandle.get(x.handle).getAttribute("data-aru-id"), tags: byHandle.get(x.handle).getAttribute("data-aru-tags") }));
      const before = s.input.innerHTML, expected = s.input.cloneNode(true), expectedNodes = [...expected.querySelectorAll("img")];
      const index = new Map(r.images.map((x, i) => [x.handle, i]));
      for (const x of plan2.changes) {
        const n = expectedNodes[index.get(x.handle)];
        n.setAttribute("data-aru-id", x.id);
        n.setAttribute("data-aru-tags", x.rawTags);
      }
      const h = s.history, oldStack = h.stack.slice(), oldOffset = h.stackOffset;
      const restore = /* @__PURE__ */ __name((node, key, value) => value == null ? g.Element.prototype.removeAttribute.call(node, key) : g.Element.prototype.setAttribute.call(node, key, value), "restore");
      try {
        if (h.stack[h.stackOffset]?.contents !== before) h.recordUndo();
        const beforeSnapshot = h.stack[h.stackOffset];
        s.editor.summernote("editor.beforeCommand");
        if (s.input.innerHTML !== before) M.fail("EDITOR_CHANGED", "작업 시작 이벤트가 본문을 변경했습니다. 적용을 중단했습니다.");
        for (const x of plan2.changes) {
          const n = byHandle.get(x.handle);
          n.setAttribute("data-aru-id", x.id);
          n.setAttribute("data-aru-tags", x.rawTags);
        }
        if (s.input.innerHTML !== expected.innerHTML) M.fail("VERIFY_FAILED", "대상 외 HTML 변경이 감지되었습니다.");
        h.recordUndo();
        s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
        if (s.input.innerHTML !== expected.innerHTML) M.fail("VERIFY_FAILED", "변경 이벤트가 대상 외 HTML을 변경했습니다.");
        const template = d.createElement("template");
        template.innerHTML = g.seditor.getHtml();
        const saved = [...template.content.querySelectorAll("img")];
        if (saved.length !== r.nodes.length) M.fail("SERIALIZE_FAILED", "저장 HTML의 이미지 수가 편집 화면과 다릅니다.");
        for (const x of plan2.changes) {
          const n = saved[index.get(x.handle)], live = byHandle.get(x.handle);
          if (n.getAttribute("data-aru-id") !== x.id || n.getAttribute("data-aru-tags") !== x.rawTags || n.getAttribute("src") !== live.getAttribute("src")) M.fail("SERIALIZE_FAILED", "저장 HTML에서 이미지 메타데이터를 확인하지 못했습니다.");
        }
        const afterSnapshot = h.stack[h.stackOffset];
        s.commands = s.commands.slice(0, s.cursor);
        s.commands.push({ before: beforeSnapshot, after: afterSnapshot });
        if (s.commands.length > 20) s.commands.shift();
        s.cursor = s.commands.length;
        emitCount(s);
        return { ...plan2, serialized: true, ...historyState(s) };
      } catch (e) {
        for (const b of backups) {
          restore(b.node, "data-aru-id", b.id);
          restore(b.node, "data-aru-tags", b.tags);
        }
        h.stack = oldStack;
        h.stackOffset = oldOffset;
        try {
          s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
        } catch (_) {
        }
        if (s.input.innerHTML !== before) e.message += " 에디터 이벤트가 별도로 변경한 본문은 원래 작성기에서 확인해 주세요.";
        throw e;
      }
    }
    __name(apply, "apply");
    function history(session, op) {
      const s = current(session), state = historyState(s), command = op === "undo" ? s.commands[s.cursor - 1] : s.commands[s.cursor];
      if (!state[op === "undo" ? "canUndo" : "canRedo"]) M.fail("HISTORY_CHANGED", "본문의 다른 작업이 기록되었습니다. 에디터의 기본 실행 취소를 사용해 주세요.");
      s.editor.summernote(op);
      const expected = op === "undo" ? command.before : command.after;
      if (s.input.innerHTML !== expected.contents) M.fail("HISTORY_VERIFY", "에디터 실행 취소 결과를 확인하지 못했습니다.");
      s.cursor += op === "undo" ? -1 : 1;
      emitCount(s);
      return scan(s.token, session);
    }
    __name(history, "history");
    function emitCount(t) {
      const c = count(t), key = JSON.stringify(c);
      if (lastCounts.get(t.token) === key) return;
      lastCounts.set(t.token, key);
      d.dispatchEvent(new g.CustomEvent(COUNT, { detail: JSON.stringify({ token: t.token, count: c }) }));
    }
    __name(emitCount, "emitCount");
    function watch(token) {
      const t = target(token);
      unwatch(token);
      let timer = null, disposed = false;
      const refresh = /* @__PURE__ */ __name(() => {
        g.clearTimeout(timer);
        timer = g.setTimeout(() => {
          if (!disposed && t.input.isConnected) emitCount(t);
        }, 180);
      }, "refresh");
      g.jQuery(t.source).on("summernote.change.aruMetadata summernote.image.upload.aruMetadata summernote.paste.aruMetadata", refresh);
      const observer = new g.MutationObserver((records) => {
        if (records.some((r) => r.type === "attributes" || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 && (n.matches("img,video,source") || n.querySelector("img,video,source"))))) refresh();
      });
      observer.observe(t.input, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
      d.addEventListener("boardCategoryLoaded", refresh);
      watchers.set(token, () => {
        disposed = true;
        g.clearTimeout(timer);
        observer.disconnect();
        g.jQuery(t.source).off(".aruMetadata");
        d.removeEventListener("boardCategoryLoaded", refresh);
      });
      const initial = count(t);
      lastCounts.set(token, JSON.stringify(initial));
      return initial;
    }
    __name(watch, "watch");
    function unwatch(token) {
      watchers.get(token)?.();
      watchers.delete(token);
      lastCounts.delete(token);
      for (const [id, s] of sessions) if (s.token === token) sessions.delete(id);
    }
    __name(unwatch, "unwatch");
    d.addEventListener(REQUEST, (event) => {
      if (event.target !== d || typeof event.detail !== "string" || event.detail.length > 1024 * 1024) return;
      let p;
      try {
        p = JSON.parse(event.detail);
      } catch (_) {
        return;
      }
      if (!valid(p?.requestId)) return;
      let response;
      try {
        for (const [id, s] of sessions) if (!s.input.isConnected || Date.now() - s.touched > 30 * 60 * 1e3) sessions.delete(id);
        let result;
        switch (p.op) {
          case "watch":
            result = watch(p.token);
            break;
          case "unwatch":
            unwatch(p.token);
            result = { released: true };
            break;
          case "scan":
            result = scan(p.token, p.session);
            break;
          case "preview": {
            const plan2 = preview(current(p.session), p);
            result = { selected: plan2.selected, changed: plan2.changed, ids: plan2.ids, tagChanges: plan2.tagChanges };
            break;
          }
          case "apply":
            result = apply(p.session, p);
            break;
          case "undo":
          case "redo":
            result = history(p.session, p.op);
            break;
          case "release":
            sessions.delete(p.session);
            result = { released: true };
            break;
          default:
            M.fail("OP_INVALID", "지원하지 않는 메타데이터 작업입니다.");
        }
        response = { requestId: p.requestId, ok: true, result };
      } catch (e) {
        response = { requestId: p.requestId, ok: false, error: { code: e.code || "METADATA_FAILED", message: e.message || "메타데이터 처리에 실패했습니다." } };
      }
      d.dispatchEvent(new g.CustomEvent(RESPONSE, { detail: JSON.stringify(response) }));
    });
    g.addEventListener("pagehide", () => {
      for (const token of [...watchers.keys()]) unwatch(token);
      sessions.clear();
    });
  }
  __name(installMetadataEditorBridge, "installMetadataEditorBridge");

  // docs/source/compat/metadata-editor-bridge.mjs
  installMetadataEditorBridge(globalThis);
})();
