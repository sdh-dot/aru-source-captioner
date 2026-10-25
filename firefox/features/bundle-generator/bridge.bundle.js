// 자동 생성: tools/build-esm.mjs. ESM runtime/compat 원본만 수정한다.
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

  // docs/source/bundle-generator/core.mjs
  function createBundleCore({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { TextEncoder, TextDecoder: TextDecoder2, URL: URL2 } = environment;
    const fetch = typeof environment.fetch === "function" ? (...args) => environment.fetch(...args) : void 0;
    let bundle = createModuleScope(dependencies.bundle, [], [
      "fail",
      "clone",
      "articleUrl",
      "validate",
      "existing",
      "encode",
      "preserveUnknown",
      "Draft",
      "readPublicDocument",
      "SourceReader"
    ]);
    let icons = createModuleScope(dependencies.icons, ["Metadata", "SiteAdapter"], []);
    const initializeBundleCore = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle = bundle || {}, M = icons.Metadata;
      const clone = /* @__PURE__ */ __name((x) => JSON.parse(JSON.stringify(x)), "clone");
      function fail2(code, message) {
        throw Object.assign(new Error(message), { code });
      }
      __name(fail2, "fail");
      function articleUrl(value) {
        if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) {
          fail2("URL_INVALID", "공개 아이콘 게시글 URL을 입력해 주세요.");
        }
        let u;
        try {
          u = new URL2(value);
        } catch (_) {
          fail2("URL_INVALID", "올바른 게시글 URL이 아닙니다.");
        }
        if (u.protocol !== "https:" || !["bbs.ruliweb.com", "m.ruliweb.com"].includes(u.hostname) || u.username || u.password || u.port) {
          fail2("URL_INVALID", "루리웹 HTTPS 공개 게시글만 지원합니다.");
        }
        const match = u.pathname.match(/^\/community\/board\/98\/read\/([1-9]\d*)\/?$/);
        if (!match || !Number.isSafeInteger(Number(match[1]))) {
          fail2("BOARD_UNSUPPORTED", "ruricon:v1 통합팩은 아이콘 공유 게시판(98)의 글만 참조할 수 있습니다.");
        }
        const articleId = Number(match[1]);
        return { boardId: 98, articleId, url: M.publicArticleUrl(articleId) };
      }
      __name(articleUrl, "articleUrl");
      function validate(value) {
        M.validateV1(value, { allowUnbound: true });
        if (new Set(value.slaves.map((s) => s.articleId)).size !== value.slaves.length) {
          fail2("DUPLICATE_REFERENCE", "동일 글을 여러 페이지로 나눈 기존 통합팩은 안전한 편집을 지원하지 않습니다. 원본을 유지합니다.");
        }
        if (value.slaves.some((s) => s.articleId === value.mainArticleId)) {
          fail2("SELF_REFERENCE", "대표 게시글을 원본으로 참조할 수 없습니다.");
        }
        return value;
      }
      __name(validate, "validate");
      function existing(root) {
        const markers = [...root.querySelectorAll("[data-meta]")].filter((n) => /^(ruricon|aru-icons):/.test(n.getAttribute("data-meta")));
        if (markers.some((n) => n.getAttribute("data-meta") !== "ruricon:v1")) {
          fail2("FORMAT_UNSUPPORTED", "v2 또는 알 수 없는 메타데이터가 있습니다. 기존 필드를 보존하기 위해 적용을 중단합니다.");
        }
        const carriers = M.readDocumentCarriers(root);
        if (!markers.length) {
          return null;
        }
        if (markers.length !== 1 || carriers.v1.length !== 1) {
          fail2("CARRIER_DUPLICATE", "BUNDLE 메타데이터가 중복되거나 불완전합니다. 자동으로 합치지 않습니다.");
        }
        return validate(M.decodeCarrier(carriers.v1[0]).value);
      }
      __name(existing, "existing");
      function encode2(value) {
        validate(value);
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        if (bytes.length > M.LIMITS.decodedBytes) {
          fail2("RESOURCE_LIMIT", "통합팩 메타데이터가 v1의 1MB 상한을 넘었습니다.");
        }
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        return g.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
      }
      __name(encode2, "encode");
      function preserveUnknown(before, after) {
        const known = /* @__PURE__ */ new Set([
          "version",
          "name",
          "boardId",
          "mainArticleId",
          "slaves"
        ]);
        for (const key of Object.keys(before || {})) {
          if (!known.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            fail2("UNKNOWN_FIELD_CHANGED", "알 수 없는 기존 최상위 필드를 변경할 수 없습니다: " + key);
          }
        }
        for (const old of before?.slaves || []) {
          const next = after.slaves.find((s) => s.articleId === old.articleId);
          if (!next) {
            continue;
          }
          if (next.page !== old.page) {
            fail2("PAGE_CHANGED", "기존 참조의 page 식별값을 변경할 수 없습니다.");
          }
          for (const key of Object.keys(old)) {
            if (!["page", "articleId", "images"].includes(key) && JSON.stringify(old[key]) !== JSON.stringify(next[key])) {
              fail2("UNKNOWN_FIELD_CHANGED", "알 수 없는 기존 참조 필드를 변경할 수 없습니다: " + key);
            }
          }
        }
      }
      __name(preserveUnknown, "preserveUnknown");
      class Draft {
        static {
          __name(this, "Draft");
        }
        constructor(value = null) {
          this.base = value ? clone(validate(value)) : null;
          this.name = value?.name || "";
          this.rows = (value?.slaves || []).map((s) => ({
            slave: clone(s),
            summary: null
          }));
        }
        add(summary) {
          if (this.rows.some((r) => r.slave.articleId === summary.articleId)) {
            fail2("DUPLICATE_REFERENCE", "이미 추가한 게시글입니다. PC·모바일 주소는 같은 글로 처리합니다.");
          }
          if (this.rows.length >= M.LIMITS.sources) {
            fail2("RESOURCE_LIMIT", "참조 글은 최대 512개입니다.");
          }
          if (this.base?.mainArticleId === summary.articleId) {
            fail2("SELF_REFERENCE", "대표 게시글을 원본으로 참조할 수 없습니다.");
          }
          const used = new Set(this.rows.map((r) => r.slave.page));
          let page = 1;
          while (used.has(page)) {
            page++;
          }
          this.rows.push({
            slave: {
              page,
              articleId: summary.articleId,
              images: [...summary.urls]
            },
            summary: clone(summary)
          });
        }
        remove(index) {
          if (!Number.isInteger(index) || index < 0 || index >= this.rows.length) {
            fail2("ROW_INVALID", "참조 항목이 바뀌었습니다.");
          }
          this.rows.splice(index, 1);
        }
        move(from, to) {
          if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= this.rows.length || to >= this.rows.length) {
            fail2("ROW_INVALID", "이동할 참조를 확인해 주세요.");
          }
          const row = this.rows.splice(from, 1)[0];
          this.rows.splice(to, 0, row);
        }
        refresh(summary) {
          const row = this.rows.find((r) => r.slave.articleId === summary.articleId);
          if (!row) {
            fail2("ROW_INVALID", "제거된 참조입니다.");
          }
          row.summary = clone(summary);
          row.slave.images = [...summary.urls];
        }
        value(mainArticleId) {
          if (mainArticleId === null && this.base?.mainArticleId > 0) {
            fail2("ARTICLE_ID_PENDING", "다른 대표 글의 구성은 해당 글의 수정 화면에서 적용해 주세요.");
          }
          if (mainArticleId === null) {
            mainArticleId = 0;
          }
          if (!Number.isSafeInteger(mainArticleId) || mainArticleId < 0) {
            fail2("ARTICLE_ID_PENDING", "대표 글 번호를 확인할 수 없습니다.");
          }
          if (this.base?.mainArticleId > 0 && this.base.mainArticleId !== mainArticleId) {
            fail2("ARTICLE_ID_MISMATCH", "현재 수정 글과 기존 메타데이터의 대표 글 번호가 다릅니다.");
          }
          const value = this.base ? clone(this.base) : { version: 1, boardId: 98 };
          value.name = this.name.trim();
          value.mainArticleId = mainArticleId;
          value.slaves = this.rows.map((r) => clone(r.slave));
          validate(value);
          preserveUnknown(this.base, value);
          return value;
        }
        snapshot() {
          return {
            format: "aru-bundle-local-draft",
            version: 1,
            base: clone(this.base),
            name: this.name,
            rows: clone(this.rows)
          };
        }
        static restore(saved) {
          if (saved?.format !== "aru-bundle-local-draft" || saved.version !== 1 || !Array.isArray(saved.rows) || saved.rows.length > M.LIMITS.sources) {
            fail2("DRAFT_INVALID", "저장한 초안 형식을 확인할 수 없습니다.");
          }
          const draft = new Draft(saved.base);
          draft.name = String(saved.name || "");
          draft.rows = clone(saved.rows);
          const probe = {
            version: 1,
            boardId: 98,
            name: draft.name.trim() || "초안",
            mainArticleId: draft.base?.mainArticleId || Number.MAX_SAFE_INTEGER,
            slaves: draft.rows.map((r) => r.slave)
          };
          if (probe.slaves.length) {
            validate(probe);
          }
          return draft;
        }
      }
      async function readPublicDocument(articleId, { signal, origin = g.location.origin, fetchFn = g.fetch, timeoutMs = 1e4 } = {}) {
        const url = icons.SiteAdapter.readPath(articleId, origin, "98"), controller = new g.AbortController(), abort = /* @__PURE__ */ __name(() => controller.abort(), "abort");
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) {
          abort();
        }
        const timer = g.setTimeout(abort, timeoutMs);
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
            fail2("READ_REDIRECT", "공개 글 주소가 변경되어 조회를 중단했습니다.");
          }
          if (!response.ok) {
            fail2([401, 403, 429].includes(response.status) ? "ACCESS_DENIED" : "READ_FAILED", "원본 글 조회 실패 (HTTP " + response.status + "). 삭제·접근 제한 여부를 원본에서 확인해 주세요.");
          }
          const limit = 3 * 1024 * 1024;
          if (Number(response.headers?.get("content-length")) > limit) {
            fail2("RESOURCE_LIMIT", "공개 본문 응답이 3MB 상한을 넘었습니다.");
          }
          let html = "";
          if (response.body?.getReader) {
            const reader = response.body.getReader(), decoder = new TextDecoder2();
            let bytes = 0;
            try {
              while (true) {
                const r = await reader.read();
                if (r.done) {
                  break;
                }
                bytes += r.value.byteLength;
                if (bytes > limit) {
                  await reader.cancel();
                  fail2("RESOURCE_LIMIT", "공개 본문 응답이 3MB 상한을 넘었습니다.");
                }
                html += decoder.decode(r.value, { stream: true });
              }
              html += decoder.decode();
            } finally {
              reader.releaseLock();
            }
          } else {
            html = await response.text();
            if (new TextEncoder().encode(html).length > limit) {
              fail2("RESOURCE_LIMIT", "공개 본문 응답이 3MB 상한을 넘었습니다.");
            }
          }
          const template = g.document.createElement("template");
          template.innerHTML = html;
          if (!template.content.querySelector('.view_content[itemprop="articleBody"],.view_content article')) {
            fail2("READ_UNAVAILABLE", "공개 본문이 없습니다. 삭제·로그인 요구·접근 제한 여부를 원본에서 확인해 주세요.");
          }
          return template.content;
        } catch (e) {
          if (controller.signal.aborted) {
            fail2(signal?.aborted ? "ABORTED" : "TIMEOUT", signal?.aborted ? "조회를 취소했습니다." : "조회 시간이 초과되었습니다.");
          }
          throw e;
        } finally {
          g.clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
        }
      }
      __name(readPublicDocument, "readPublicDocument");
      class SourceReader {
        static {
          __name(this, "SourceReader");
        }
        constructor({ site = icons.SiteAdapter, origin = g.location.origin, readDocument = readPublicDocument } = {}) {
          this.site = site;
          this.origin = origin;
          this.readDocument = readDocument;
          this.pending = /* @__PURE__ */ new Map();
          this.stopped = false;
        }
        read(url, { signal } = {}) {
          if (this.stopped) {
            return Promise.reject(Object.assign(new Error("생성기를 다시 열어 주세요."), {
              code: "ABORTED"
            }));
          }
          const ref = articleUrl(url);
          if (this.pending.has(ref.articleId)) {
            return this.pending.get(ref.articleId).promise;
          }
          const controller = new g.AbortController(), abort = /* @__PURE__ */ __name(() => controller.abort(), "abort");
          signal?.addEventListener("abort", abort, { once: true });
          if (signal?.aborted) {
            abort();
          }
          const readSourceDocument = /* @__PURE__ */ __name(async () => {
            const doc = await this.readDocument(ref.articleId, {
              origin: this.origin,
              signal: controller.signal
            });
            if (controller.signal.aborted) {
              fail2("ABORTED", "조회를 취소했습니다.");
            }
            const body = this.site.findArticleBody(doc).element;
            const parsed = await M.parseDocument(body, {
              articleId: ref.articleId,
              boardId: 98
            });
            if (parsed.kind === "BUNDLE" || parsed.limited) {
              fail2("SOURCE_UNSUPPORTED", "통합팩이나 잘못된 메타데이터를 원본으로 중첩 참조할 수 없습니다. 개별 NORMAL 글을 사용해 주세요.");
            }
            const titleNode = doc.querySelector(".subject_text") || doc.querySelector(".subject") || body.querySelector("h1");
            const title = titleNode?.textContent?.trim().slice(0, 120) || "원본 글 " + ref.articleId;
            const result2 = this.site.readArticlePack(doc, ref.articleId, title, "98"), icons2 = result2.pack.icons;
            if (!icons2.length) {
              fail2("SOURCE_EMPTY", "다운로드 가능한 아이콘이 없는 게시글입니다.");
            }
            const urls = icons2.map((x) => x.url);
            const imageIcons = icons2.filter((x) => x.mediaKind !== "video"), videoIcons = icons2.filter((x) => x.mediaKind === "video");
            return {
              ...ref,
              title,
              urls,
              icons: icons2.length,
              images: imageIcons.length,
              videos: videoIcons.length,
              bodyImages: body.querySelectorAll("img").length,
              bodyVideos: body.querySelectorAll("video").length,
              hasMetadata: !!body.querySelector("[data-aru-id],[data-aru-tags],[data-meta]"),
              taggedIcons: icons2.filter((x) => x.imageMetadata?.tags?.length).length,
              thumbnail: imageIcons[0]?.url || null,
              excluded: result2.counts.excluded,
              duplicates: result2.counts.duplicates
            };
          }, "readSourceDocument");
          const promise = readSourceDocument().finally(() => {
            this.pending.delete(ref.articleId);
            signal?.removeEventListener("abort", abort);
          });
          this.pending.set(ref.articleId, { promise, controller });
          return promise;
        }
        cancel() {
          for (const p of this.pending.values()) {
            p.controller.abort();
          }
        }
        destroy() {
          this.stopped = true;
          this.cancel();
        }
      }
      Object.assign(B, {
        fail: fail2,
        clone,
        articleUrl,
        validate,
        existing,
        encode: encode2,
        preserveUnknown,
        Draft,
        readPublicDocument,
        SourceReader
      });
    }, "initializeBundleCore");
    initializeBundleCore(environment);
    return {
      bundle: selectModuleExports(bundle, [
        "fail",
        "clone",
        "articleUrl",
        "validate",
        "existing",
        "encode",
        "preserveUnknown",
        "Draft",
        "readPublicDocument",
        "SourceReader"
      ])
    };
  }
  __name(createBundleCore, "createBundleCore");

  // docs/source/bundle-generator/bridge.mjs
  function createBundleBridge({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { TextEncoder, URL: URL2 } = environment;
    let bundle = createModuleScope(dependencies.bundle, ["fail", "existing", "validate", "preserveUnknown"], []);
    let icons = createModuleScope(dependencies.icons, ["Metadata"], []);
    const initializeBundleBridge = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle, d = g.document;
      if (!d || !/^https:\/\/(bbs|m)\.ruliweb\.com\/community\/board\/98\/(write|modify)(?:\/|\?|$)/.test(g.location.href) || g.__aruBundleBridgeInstalled) {
        return;
      }
      g.__aruBundleBridgeInstalled = true;
      const REQUEST = "aru-bundle-request-v1", RESPONSE = "aru-bundle-response-v1", sessions = /* @__PURE__ */ new Map();
      const uuid = /* @__PURE__ */ __name(() => g.crypto.randomUUID().replaceAll("-", ""), "uuid"), valid = /* @__PURE__ */ __name((s) => typeof s === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(s), "valid");
      function currentArticle() {
        const u = new URL2(g.location.href), m = u.pathname.match(/^\/community\/board\/98\/modify\/([1-9]\d*)\/?$/);
        const query = u.pathname === "/community/board/98/modify" ? u.searchParams.get("article_id") : null;
        const n = Number(m?.[1] || query);
        return Number.isSafeInteger(n) && n > 0 ? n : null;
      }
      __name(currentArticle, "currentArticle");
      function target(token) {
        if (!valid(token)) {
          B.fail("TARGET_INVALID", "에디터 식별값을 확인할 수 없습니다.");
        }
        const roots = d.querySelectorAll('[data-aru-bundle-target="' + token + '"]'), root = roots.length === 1 ? roots[0] : null;
        if (!root?.isConnected || !root.matches("#editor_v2 .seditor")) {
          B.fail("EDITOR_CHANGED", "에디터가 교체되었습니다. 생성기를 다시 열어 주세요.");
        }
        const input = root.querySelector('.note-editable[contenteditable="true"]'), source = root.querySelector("#ReactSummernoteLite");
        for (let n = root; n?.nodeType === 1; n = n.parentElement) {
          if (n.hidden || g.getComputedStyle(n).display === "none") {
            B.fail("EDITOR_UNSUPPORTED", "에디터2 편집 화면으로 돌아와 주세요.");
          }
        }
        if (!input || !source || root.querySelector(".note-editor.codeview,.btn-codeview.active")) {
          B.fail("EDITOR_UNSUPPORTED", "에디터2의 편집 화면에서 사용해 주세요.");
        }
        const editor = g.jQuery?.(source), context = editor?.data("summernote"), native = context?.modules?.editor, history = native?.history;
        if (d.querySelectorAll("#ReactSummernoteLite").length !== 1 || native?.editable !== input || !Array.isArray(history?.stack) || !Number.isInteger(history.stackOffset) || typeof history.recordUndo !== "function" || typeof native.beforeCommand !== "function" || typeof context.triggerEvent !== "function" || typeof g.seditor?.getHtml !== "function") {
          B.fail("EDITOR_API_UNAVAILABLE", "Summernote 기록·저장 API를 확인하지 못했습니다.");
        }
        const boards = new Set([...d.querySelectorAll('input[name="board_id"]')].map((n) => n.value.trim()).filter(Boolean));
        if (boards.size !== 1 || !boards.has("98")) {
          B.fail("BOARD_UNSUPPORTED", "게시판 98의 작성기 데이터를 확인하지 못했습니다.");
        }
        return {
          token,
          root,
          input,
          source,
          editor,
          context,
          history,
          articleId: currentArticle()
        };
      }
      __name(target, "target");
      function scan(token) {
        const t = target(token), value = B.existing(t.input);
        if (value?.mainArticleId > 0 && value.mainArticleId !== t.articleId) {
          B.fail("ARTICLE_ID_MISMATCH", "현재 수정 글과 BUNDLE 대표 글 번호가 다릅니다.");
        }
        if (sessions.size >= 2) {
          B.fail("SESSION_LIMIT", "다른 통합팩 생성기를 닫아 주세요.");
        }
        const session = uuid();
        sessions.set(session, { ...t, touched: Date.now(), preview: null });
        return { session, articleId: t.articleId, value };
      }
      __name(scan, "scan");
      function current(id) {
        const s = sessions.get(id);
        if (!s || Date.now() - s.touched > 30 * 60 * 1e3) {
          B.fail("SESSION_EXPIRED", "생성기 세션이 만료되었습니다. 다시 열어 주세요.");
        }
        const t = target(s.token);
        if (t.input !== s.input || t.source !== s.source || t.context !== s.context || t.articleId !== s.articleId) {
          B.fail("EDITOR_CHANGED", "편집 대상이 바뀌었습니다. 생성기를 다시 열어 주세요.");
        }
        s.touched = Date.now();
        return s;
      }
      __name(current, "current");
      function checkedValue(s, encoded) {
        const value = B.validate(icons.Metadata.decodeCarrier(encoded).value);
        if (!s.articleId && value.mainArticleId !== 0) {
          B.fail("ARTICLE_ID_PENDING", "신규 글은 대표 글 번호 0만 사용할 수 있습니다. 실제 번호를 추측하지 않습니다.");
        }
        if (s.articleId && value.mainArticleId !== s.articleId) {
          B.fail("ARTICLE_ID_MISMATCH", "현재 게시글 번호와 메타데이터가 다릅니다.");
        }
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
          if (i) {
            refs.append(d.createTextNode(" · "));
          }
          const a = d.createElement("a");
          a.href = icons.Metadata.publicArticleUrl(s.articleId);
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
        if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) {
          B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 미리보기해 주세요.");
        }
        const states = s.input.querySelectorAll('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]');
        if (states.length && states[0].children.length) {
          B.fail("STATE_UNSUPPORTED", "기존 메타데이터 저장 요소가 일반 텍스트 형식이 아닙니다.");
        }
        const html = s.input.innerHTML, expected = s.input.cloneNode(true);
        if (states.length) {
          expected.querySelector('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]').textContent = encoded;
        } else {
          expected.append(carrier(value, encoded));
        }
        const serializedOutside = outsideCarrier(g.seditor.getHtml());
        if (s.input.innerHTML !== html) {
          B.fail("EDITOR_CHANGED", "저장 HTML 확인 과정에서 본문이 바뀌었습니다.");
        }
        if (new TextEncoder().encode(expected.innerHTML).length > 1048576) {
          B.fail("BODY_SIZE_LIMIT", "적용 후 본문이 사이트의 1MB 제한을 넘습니다. 참조 수나 기존 본문 크기를 줄여 주세요.");
        }
        const previewId = uuid();
        s.preview = {
          previewId,
          encoded,
          html,
          serializedOutside,
          expected: expected.innerHTML,
          touched: Date.now()
        };
        return {
          previewId,
          changed: expected.innerHTML !== html,
          expiresInMs: 12e4,
          mode: states.length ? "update" : "append",
          references: value.slaves.length,
          icons: value.slaves.reduce((n, r) => n + r.images.length, 0),
          unknownFieldsPreserved: true,
          changes: states.length ? "기존 BUNDLE 저장값만 갱신합니다. 기존 안내 문구·링크는 유지합니다." : "본문 끝에 BUNDLE 안내·참조 링크·저장값을 추가합니다. 기존 본문은 보존합니다."
        };
      }
      __name(preview, "preview");
      function outsideCarrier(html) {
        if (typeof html !== "string" || html.length > 8 * 1024 * 1024) {
          B.fail("SERIALIZE_FAILED", "에디터 저장 HTML을 안전한 범위에서 확인할 수 없습니다.");
        }
        const template = d.createElement("template");
        template.innerHTML = html;
        for (const n of template.content.querySelectorAll('[data-meta="ruricon:v1"]')) {
          n.remove();
        }
        return template.innerHTML;
      }
      __name(outsideCarrier, "outsideCarrier");
      function apply(id, previewId) {
        const s = current(id), p = s.preview;
        if (!p || p.previewId !== previewId || Date.now() - p.touched > 12e4) {
          B.fail("PREVIEW_REQUIRED", "먼저 변경 미리보기를 생성해 주세요.");
        }
        if (s.input.innerHTML !== p.html) {
          B.fail("EDITOR_CHANGED", "미리보기 이후 본문이 바뀌었습니다. 다시 미리보기해 주세요.");
        }
        const value = checkedValue(s, p.encoded);
        if (p.expected === p.html) {
          B.fail("NO_CHANGES", "본문에 적용할 변경사항이 없습니다.");
        }
        if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) {
          B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 적용해 주세요.");
        }
        const state = s.input.querySelector('[data-meta="ruricon:v1"] [data-meta="ruricon-state"]'), oldText = state?.textContent, newNode = state ? null : carrier(value, p.encoded);
        const h = s.history, stack = h.stack.slice(), offset = h.stackOffset;
        let changed = false;
        try {
          if (h.stack[h.stackOffset]?.contents !== p.html) {
            h.recordUndo();
          }
          s.editor.summernote("editor.beforeCommand");
          if (s.input.innerHTML !== p.html) {
            B.fail("EDITOR_CHANGED", "에디터 시작 이벤트가 본문을 변경했습니다.");
          }
          changed = true;
          if (state) {
            state.textContent = p.encoded;
          } else {
            s.input.append(newNode);
          }
          if (s.input.innerHTML !== p.expected) {
            B.fail("VERIFY_FAILED", "메타데이터 외 본문 변경이 감지되었습니다.");
          }
          h.recordUndo();
          s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
          if (s.input.innerHTML !== p.expected) {
            B.fail("VERIFY_FAILED", "에디터 변경 이벤트가 본문을 변경했습니다.");
          }
          const serialized = g.seditor.getHtml(), template = d.createElement("template");
          template.innerHTML = serialized;
          const saved = B.existing(template.content);
          if (JSON.stringify(saved) !== JSON.stringify(value)) {
            B.fail("SERIALIZE_FAILED", "실제 저장 HTML에서 BUNDLE 메타데이터를 확인하지 못했습니다.");
          }
          if (outsideCarrier(serialized) !== p.serializedOutside || s.input.innerHTML !== p.expected) {
            B.fail("SERIALIZE_FAILED", "저장 HTML에서 메타데이터 외 본문 변경이 감지되었습니다.");
          }
          s.preview = null;
          return {
            applied: true,
            serialized: true,
            references: value.slaves.length,
            icons: value.slaves.reduce((n, r) => n + r.images.length, 0)
          };
        } catch (e) {
          if (changed) {
            if (state) {
              state.textContent = oldText;
            } else {
              newNode.remove();
            }
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
        if (e.target !== d || typeof e.detail !== "string" || e.detail.length > 2 * 1024 * 1024) {
          return;
        }
        let p;
        try {
          p = JSON.parse(e.detail);
        } catch (_) {
          return;
        }
        if (!valid(p?.requestId)) {
          return;
        }
        let response;
        try {
          for (const [id, s] of sessions) {
            if (!s.input.isConnected || Date.now() - s.touched > 30 * 60 * 1e3) {
              sessions.delete(id);
            }
          }
          let result2;
          if (p.op === "scan") {
            result2 = scan(p.token);
          } else if (p.op === "preview") {
            result2 = preview(p.session, p.encoded);
          } else if (p.op === "apply") {
            result2 = apply(p.session, p.previewId);
          } else if (p.op === "release") {
            sessions.delete(p.session);
            result2 = { released: true };
          } else {
            B.fail("OP_INVALID", "지원하지 않는 생성기 작업입니다.");
          }
          response = { requestId: p.requestId, ok: true, result: result2 };
        } catch (error) {
          response = {
            requestId: p.requestId,
            ok: false,
            error: {
              code: error.code || "BUNDLE_FAILED",
              message: error.message
            }
          };
        }
        d.dispatchEvent(new g.CustomEvent(RESPONSE, { detail: JSON.stringify(response) }));
      });
      g.addEventListener("pagehide", () => sessions.clear());
    }, "initializeBundleBridge");
    initializeBundleBridge(environment);
    return {};
  }
  __name(createBundleBridge, "createBundleBridge");

  // shared/icon-metadata/tag-codec.mjs
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
      const icons = [];
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
          icons.push({
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
            sortOrder: icons.length,
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
        icons
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
      const icons = base.icons.map((icon) => {
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
      const usedSources = new Set(icons.map((icon) => icon.sourceId));
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
        icons
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
      const result2 = { v1: [], v2: [] };
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
            result2[type].push(states[0].textContent || "");
          } else if (states.length === 0) {
            result2[type].push("");
          } else {
            result2[type].push(...states.map((node) => node.textContent || ""));
          }
        }
      }
      return result2;
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

  // docs/source/runtime/icons.mjs
  function createBundleMain({ environment = defaultEnvironment, initialIcons = {}, initialBundle = {} } = {}) {
    const icons = { ...initialIcons }, bundle = { ...initialBundle };
    let part;
    if (!icons.Metadata?.supportsUnboundV1) {
      Object.assign(icons, createMetadata({ environment }));
    }
    part = createBundleCore({
      environment,
      dependencies: {
        bundle: {},
        icons: {
          Metadata: /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata"),
          SiteAdapter: /* @__PURE__ */ __name(() => icons["SiteAdapter"], "SiteAdapter")
        }
      }
    });
    Object.assign(bundle, part.bundle);
    part = createBundleBridge({
      environment,
      dependencies: {
        bundle: {
          fail: /* @__PURE__ */ __name(() => bundle["fail"], "fail"),
          existing: /* @__PURE__ */ __name(() => bundle["existing"], "existing"),
          validate: /* @__PURE__ */ __name(() => bundle["validate"], "validate"),
          preserveUnknown: /* @__PURE__ */ __name(() => bundle["preserveUnknown"], "preserveUnknown")
        },
        icons: { Metadata: /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata") }
      }
    });
    return { icons, bundle };
  }
  __name(createBundleMain, "createBundleMain");

  // docs/source/compat/runtime-bundle-main.mjs
  var result = createBundleMain({ environment: globalThis, initialIcons: globalThis.AruIcons, initialBundle: globalThis.AruBundle });
  Object.assign(globalThis.AruIcons = globalThis.AruIcons || {}, result.icons);
  Object.assign(globalThis.AruBundle = globalThis.AruBundle || {}, result.bundle);
})();
