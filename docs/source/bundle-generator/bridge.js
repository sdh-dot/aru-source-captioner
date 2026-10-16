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

  // docs/source/bundle-generator/bridge.mjs
  function createBundleBridge({ environment = globalThis, dependencies = {} } = {}) {
    const { document, location, CustomEvent, TextEncoder, URL, crypto } = environment;
    const getComputedStyle = typeof environment.getComputedStyle === "function" ? (...args) => environment.getComputedStyle(...args) : void 0;
    let bundle2 = createModuleScope(dependencies.bundle, ["fail", "existing", "validate", "preserveUnknown"], []);
    let icons2 = createModuleScope(dependencies.icons, ["Metadata"], []);
    const initializeBundleBridge = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle2, d = g.document;
      if (!d || !/^https:\/\/(bbs|m)\.ruliweb\.com\/community\/board\/98\/(write|modify)(?:\/|\?|$)/.test(g.location.href) || g.__aruBundleBridgeInstalled) return;
      g.__aruBundleBridgeInstalled = true;
      const REQUEST = "aru-bundle-request-v1", RESPONSE = "aru-bundle-response-v1", sessions = /* @__PURE__ */ new Map();
      const uuid = /* @__PURE__ */ __name(() => g.crypto.randomUUID().replaceAll("-", ""), "uuid"), valid = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(s), "valid");
      function currentArticle() {
        const u = new URL(g.location.href), m = u.pathname.match(/^\/community\/board\/98\/modify\/([1-9]\d*)\/?$/);
        const query = u.pathname === "/community/board/98/modify" ? u.searchParams.get("article_id") : null;
        const n = Number(m?.[1] || query);
        return Number.isSafeInteger(n) && n > 0 ? n : null;
      }
      __name(currentArticle, "currentArticle");
      function target(token) {
        if (!valid(token)) B.fail("TARGET_INVALID", "에디터 식별값을 확인할 수 없습니다.");
        const roots = d.querySelectorAll('[data-aru-bundle-target="' + token + '"]'), root = roots.length === 1 ? roots[0] : null;
        if (!root?.isConnected || !root.matches("#editor_v2 .seditor")) B.fail("EDITOR_CHANGED", "에디터가 교체되었습니다. 생성기를 다시 열어 주세요.");
        const input = root.querySelector('.note-editable[contenteditable="true"]'), source = root.querySelector("#ReactSummernoteLite");
        for (let n = root; n?.nodeType === 1; n = n.parentElement) if (n.hidden || g.getComputedStyle(n).display === "none") B.fail("EDITOR_UNSUPPORTED", "에디터2 편집 화면으로 돌아와 주세요.");
        if (!input || !source || root.querySelector(".note-editor.codeview,.btn-codeview.active")) B.fail("EDITOR_UNSUPPORTED", "에디터2의 편집 화면에서 사용해 주세요.");
        const editor = g.jQuery?.(source), context = editor?.data("summernote"), native = context?.modules?.editor, history = native?.history;
        if (d.querySelectorAll("#ReactSummernoteLite").length !== 1 || native?.editable !== input || !Array.isArray(history?.stack) || !Number.isInteger(history.stackOffset) || typeof history.recordUndo !== "function" || typeof native.beforeCommand !== "function" || typeof context.triggerEvent !== "function" || typeof g.seditor?.getHtml !== "function") B.fail("EDITOR_API_UNAVAILABLE", "Summernote 기록·저장 API를 확인하지 못했습니다.");
        const boards = new Set([...d.querySelectorAll('input[name="board_id"]')].map((n) => n.value.trim()).filter(Boolean));
        if (boards.size !== 1 || !boards.has("98")) B.fail("BOARD_UNSUPPORTED", "게시판 98의 작성기 데이터를 확인하지 못했습니다.");
        return { token, root, input, source, editor, context, history, articleId: currentArticle() };
      }
      __name(target, "target");
      function scan(token) {
        const t = target(token), value = B.existing(t.input);
        if (value?.mainArticleId > 0 && value.mainArticleId !== t.articleId) B.fail("ARTICLE_ID_MISMATCH", "현재 수정 글과 BUNDLE 대표 글 번호가 다릅니다.");
        if (sessions.size >= 2) B.fail("SESSION_LIMIT", "다른 통합팩 생성기를 닫아 주세요.");
        const session = uuid();
        sessions.set(session, { ...t, touched: Date.now(), preview: null });
        return { session, articleId: t.articleId, value };
      }
      __name(scan, "scan");
      function current(id) {
        const s = sessions.get(id);
        if (!s || Date.now() - s.touched > 30 * 60 * 1e3) B.fail("SESSION_EXPIRED", "생성기 세션이 만료되었습니다. 다시 열어 주세요.");
        const t = target(s.token);
        if (t.input !== s.input || t.source !== s.source || t.context !== s.context || t.articleId !== s.articleId) B.fail("EDITOR_CHANGED", "편집 대상이 바뀌었습니다. 생성기를 다시 열어 주세요.");
        s.touched = Date.now();
        return s;
      }
      __name(current, "current");
      function checkedValue(s, encoded) {
        const value = B.validate(icons2.Metadata.decodeCarrier(encoded).value);
        if (!s.articleId && value.mainArticleId !== 0) B.fail("ARTICLE_ID_PENDING", "신규 글은 대표 글 번호 0만 사용할 수 있습니다. 실제 번호를 추측하지 않습니다.");
        if (s.articleId && value.mainArticleId !== s.articleId) B.fail("ARTICLE_ID_MISMATCH", "현재 게시글 번호와 메타데이터가 다릅니다.");
        B.preserveUnknown(B.existing(s.input), value);
        return value;
      }
      __name(checkedValue, "checkedValue");
      function carrier(value, encoded) {
        const node = d.createElement("div");
        node.setAttribute("data-meta", "ruricon:v1");
        node.setAttribute("contenteditable", "false");
        const title = d.createElement("p");
        title.textContent = "통합 아이콘팩: " + value.name;
        node.append(title);
        const refs = d.createElement("p");
        for (const [i, s] of value.slaves.entries()) {
          if (i) refs.append(d.createTextNode(" · "));
          const a = d.createElement("a");
          a.href = icons2.Metadata.publicArticleUrl(s.articleId);
          a.textContent = "원본 " + (i + 1) + " (" + s.articleId + ")";
          refs.append(a);
        }
        node.append(refs);
        const state = d.createElement("span");
        state.setAttribute("data-meta", "ruricon-state");
        state.style.display = "none";
        state.textContent = encoded;
        node.append(state);
        return node;
      }
      __name(carrier, "carrier");
      function preview(id, encoded) {
        const s = current(id), value = checkedValue(s, encoded);
        if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 미리보기해 주세요.");
        const states = s.input.querySelectorAll('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]');
        if (states.length && states[0].children.length) B.fail("STATE_UNSUPPORTED", "기존 메타데이터 저장 요소가 일반 텍스트 형식이 아닙니다.");
        const html = s.input.innerHTML, expected = s.input.cloneNode(true);
        if (states.length) expected.querySelector('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]').textContent = encoded;
        else expected.append(carrier(value, encoded));
        const serializedOutside = outsideCarrier(g.seditor.getHtml());
        if (s.input.innerHTML !== html) B.fail("EDITOR_CHANGED", "저장 HTML 확인 과정에서 본문이 바뀌었습니다.");
        if (new TextEncoder().encode(expected.innerHTML).length > 1048576) B.fail("BODY_SIZE_LIMIT", "적용 후 본문이 사이트의 1MB 제한을 넘습니다. 참조 수나 기존 본문 크기를 줄여 주세요.");
        const previewId = uuid();
        s.preview = { previewId, encoded, html, serializedOutside, expected: expected.innerHTML, touched: Date.now() };
        return { previewId, changed: expected.innerHTML !== html, expiresInMs: 12e4, mode: states.length ? "update" : "append", references: value.slaves.length, icons: value.slaves.reduce((n, r) => n + r.images.length, 0), unknownFieldsPreserved: true, changes: states.length ? "기존 BUNDLE 저장값만 갱신합니다. 기존 안내 문구·링크는 유지합니다." : "본문 끝에 BUNDLE 안내·참조 링크·저장값을 추가합니다. 기존 본문은 보존합니다." };
      }
      __name(preview, "preview");
      function outsideCarrier(html) {
        if (typeof html !== "string" || html.length > 8 * 1024 * 1024) B.fail("SERIALIZE_FAILED", "에디터 저장 HTML을 안전한 범위에서 확인할 수 없습니다.");
        const template = d.createElement("template");
        template.innerHTML = html;
        for (const n of template.content.querySelectorAll('[data-meta="ruricon:v1"]')) n.remove();
        return template.innerHTML;
      }
      __name(outsideCarrier, "outsideCarrier");
      function apply(id, previewId) {
        const s = current(id), p = s.preview;
        if (!p || p.previewId !== previewId || Date.now() - p.touched > 12e4) B.fail("PREVIEW_REQUIRED", "먼저 변경 미리보기를 생성해 주세요.");
        if (s.input.innerHTML !== p.html) B.fail("EDITOR_CHANGED", "미리보기 이후 본문이 바뀌었습니다. 다시 미리보기해 주세요.");
        const value = checkedValue(s, p.encoded);
        if (p.expected === p.html) B.fail("NO_CHANGES", "본문에 적용할 변경사항이 없습니다.");
        if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 적용해 주세요.");
        const state = s.input.querySelector('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]'), oldText = state?.textContent, newNode = state ? null : carrier(value, p.encoded);
        const h = s.history, stack = h.stack.slice(), offset = h.stackOffset;
        let changed = false;
        try {
          if (h.stack[h.stackOffset]?.contents !== p.html) h.recordUndo();
          s.editor.summernote("editor.beforeCommand");
          if (s.input.innerHTML !== p.html) B.fail("EDITOR_CHANGED", "에디터 시작 이벤트가 본문을 변경했습니다.");
          changed = true;
          if (state) state.textContent = p.encoded;
          else s.input.append(newNode);
          if (s.input.innerHTML !== p.expected) B.fail("VERIFY_FAILED", "메타데이터 외 본문 변경이 감지되었습니다.");
          h.recordUndo();
          s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
          if (s.input.innerHTML !== p.expected) B.fail("VERIFY_FAILED", "에디터 변경 이벤트가 본문을 변경했습니다.");
          const serialized = g.seditor.getHtml(), template = d.createElement("template");
          template.innerHTML = serialized;
          const saved = B.existing(template.content);
          if (JSON.stringify(saved) !== JSON.stringify(value)) B.fail("SERIALIZE_FAILED", "실제 저장 HTML에서 BUNDLE 메타데이터를 확인하지 못했습니다.");
          if (outsideCarrier(serialized) !== p.serializedOutside || s.input.innerHTML !== p.expected) B.fail("SERIALIZE_FAILED", "저장 HTML에서 메타데이터 외 본문 변경이 감지되었습니다.");
          s.preview = null;
          return { applied: true, serialized: true, references: value.slaves.length, icons: value.slaves.reduce((n, r) => n + r.images.length, 0) };
        } catch (e) {
          if (changed) {
            if (state) state.textContent = oldText;
            else newNode.remove();
          }
          if (s.input.innerHTML === p.html) {
            h.stack = stack;
            h.stackOffset = offset;
          } else {
            h.recordUndo();
            e.message += " 사이트 이벤트가 변경한 본문을 작성기에서 확인해 주세요.";
          }
          try {
            s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
          } catch (_) {
          }
          s.preview = null;
          throw e;
        }
      }
      __name(apply, "apply");
      d.addEventListener(REQUEST, (e) => {
        if (e.target !== d || typeof e.detail !== "string" || e.detail.length > 2 * 1024 * 1024) return;
        let p;
        try {
          p = JSON.parse(e.detail);
        } catch (_) {
          return;
        }
        if (!valid(p?.requestId)) return;
        let response;
        try {
          for (const [id, s] of sessions) if (!s.input.isConnected || Date.now() - s.touched > 30 * 60 * 1e3) sessions.delete(id);
          let result2;
          if (p.op === "scan") result2 = scan(p.token);
          else if (p.op === "preview") result2 = preview(p.session, p.encoded);
          else if (p.op === "apply") result2 = apply(p.session, p.previewId);
          else if (p.op === "release") {
            sessions.delete(p.session);
            result2 = { released: true };
          } else B.fail("OP_INVALID", "지원하지 않는 생성기 작업입니다.");
          response = { requestId: p.requestId, ok: true, result: result2 };
        } catch (error) {
          response = { requestId: p.requestId, ok: false, error: { code: error.code || "BUNDLE_FAILED", message: error.message } };
        }
        d.dispatchEvent(new g.CustomEvent(RESPONSE, { detail: JSON.stringify(response) }));
      });
      g.addEventListener("pagehide", () => sessions.clear(), { once: true });
    }, "initializeBundleBridge");
    initializeBundleBridge(environment);
    return {};
  }
  __name(createBundleBridge, "createBundleBridge");

  // docs/source/compat/bundle-generator-bridge.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var result = createBundleBridge({ environment: globalThis, dependencies: {
    bundle: { "fail": /* @__PURE__ */ __name(() => bundle["fail"], "fail"), "existing": /* @__PURE__ */ __name(() => bundle["existing"], "existing"), "validate": /* @__PURE__ */ __name(() => bundle["validate"], "validate"), "preserveUnknown": /* @__PURE__ */ __name(() => bundle["preserveUnknown"], "preserveUnknown") },
    icons: { "Metadata": /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata") }
  } });
})();
