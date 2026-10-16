import type { CodedError } from "../runtime/contracts.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// MAIN 작성기에서 미리보기 세션을 검증한 뒤 명시적 적용 요청만 편집기에 반영한다.
import { createModuleScope } from "../runtime/module-scope.ts";

export function createBundleBridge({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const { TextEncoder, URL } = environment;

  let bundle = createModuleScope(
    dependencies.bundle,
    ["fail", "existing", "validate", "preserveUnknown"],
    [],
  );
  let icons = createModuleScope(dependencies.icons, ["Metadata"], []);
  /* MAIN world: isolated BUNDLE commands using the verified Summernote history/change/serializer API. */
  const initializeBundleBridge = function (g: RuntimeEnvironment) {
    "use strict";
    const B = bundle,
      d = g.document;
    if (
      !d ||
      !/^https:\/\/(bbs|m)\.ruliweb\.com\/community\/board\/98\/(write|modify)(?:\/|\?|$)/.test(
        g.location.href,
      ) ||
      g.__aruBundleBridgeInstalled
    ) {
      return;
    }
    g.__aruBundleBridgeInstalled = true;
    const REQUEST = "aru-bundle-request-v1",
      RESPONSE = "aru-bundle-response-v1",
      sessions = new Map();
    const uuid = () => g.crypto.randomUUID().replaceAll("-", ""),
      valid = (s: string) =>
        typeof s === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(s);
    function currentArticle() {
      const u = new URL(g.location.href),
        m = u.pathname.match(/^\/community\/board\/98\/modify\/([1-9]\d*)\/?$/);
      const query =
        u.pathname === "/community/board/98/modify"
          ? u.searchParams.get("article_id")
          : null;
      const n = Number(m?.[1] || query);
      return Number.isSafeInteger(n) && n > 0 ? n : null;
    }
    function target(token: string) {
      if (!valid(token)) {
        B.fail("TARGET_INVALID", "에디터 식별값을 확인할 수 없습니다.");
      }
      const roots = d.querySelectorAll(
          '[data-aru-bundle-target="' + token + '"]',
        ),
        root = roots.length === 1 ? roots[0] : null;
      if (!root?.isConnected || !root.matches("#editor_v2 .seditor")) {
        B.fail(
          "EDITOR_CHANGED",
          "에디터가 교체되었습니다. 생성기를 다시 열어 주세요.",
        );
      }
      const input = root!.querySelector(
          '.note-editable[contenteditable="true"]',
        ),
        source = root!.querySelector("#ReactSummernoteLite");
      for (let n = root; n?.nodeType === 1; n = n.parentElement) {
        if (
          (n as HTMLElement).hidden ||
          g.getComputedStyle(n).display === "none"
        ) {
          B.fail("EDITOR_UNSUPPORTED", "에디터2 편집 화면으로 돌아와 주세요.");
        }
      }
      if (
        !input ||
        !source ||
        root!.querySelector(".note-editor.codeview,.btn-codeview.active")
      ) {
        B.fail("EDITOR_UNSUPPORTED", "에디터2의 편집 화면에서 사용해 주세요.");
      }
      const editor = g.jQuery?.(source),
        context = editor?.data("summernote"),
        native = context?.modules?.editor,
        history = native?.history;
      if (
        d.querySelectorAll("#ReactSummernoteLite").length !== 1 ||
        native?.editable !== input ||
        !Array.isArray(history?.stack) ||
        !Number.isInteger(history.stackOffset) ||
        typeof history.recordUndo !== "function" ||
        typeof native.beforeCommand !== "function" ||
        typeof context.triggerEvent !== "function" ||
        typeof g.seditor?.getHtml !== "function"
      ) {
        B.fail(
          "EDITOR_API_UNAVAILABLE",
          "Summernote 기록·저장 API를 확인하지 못했습니다.",
        );
      }
      const boards = new Set(
        [...d.querySelectorAll<HTMLInputElement>('input[name="board_id"]')]
          .map((n) => n.value.trim())
          .filter(Boolean),
      );
      if (boards.size !== 1 || !boards.has("98")) {
        B.fail(
          "BOARD_UNSUPPORTED",
          "게시판 98의 작성기 데이터를 확인하지 못했습니다.",
        );
      }
      return {
        token,
        root,
        input,
        source,
        editor,
        context,
        history,
        articleId: currentArticle(),
      };
    }
    function scan(token: any) {
      const t = target(token),
        value = B.existing(t.input);
      if (value?.mainArticleId > 0 && value.mainArticleId !== t.articleId) {
        B.fail(
          "ARTICLE_ID_MISMATCH",
          "현재 수정 글과 BUNDLE 대표 글 번호가 다릅니다.",
        );
      }
      if (sessions.size >= 2) {
        B.fail("SESSION_LIMIT", "다른 통합팩 생성기를 닫아 주세요.");
      }
      const session = uuid();
      sessions.set(session, { ...t, touched: Date.now(), preview: null });
      // Only public carrier data crosses the bridge. Never return the user's body text.
      return { session, articleId: t.articleId, value };
    }
    function current(id: any) {
      const s = sessions.get(id);
      if (!s || Date.now() - s.touched > 30 * 60 * 1000) {
        B.fail(
          "SESSION_EXPIRED",
          "생성기 세션이 만료되었습니다. 다시 열어 주세요.",
        );
      }
      const t = target(s.token);
      if (
        t.input !== s.input ||
        t.source !== s.source ||
        t.context !== s.context ||
        t.articleId !== s.articleId
      ) {
        B.fail(
          "EDITOR_CHANGED",
          "편집 대상이 바뀌었습니다. 생성기를 다시 열어 주세요.",
        );
      }
      s.touched = Date.now();
      return s;
    }
    function checkedValue(s: { articleId: any; input: any }, encoded: any) {
      const value = B.validate(icons.Metadata.decodeCarrier(encoded).value);
      if (!s.articleId && value.mainArticleId !== 0) {
        B.fail(
          "ARTICLE_ID_PENDING",
          "신규 글은 대표 글 번호 0만 사용할 수 있습니다. 실제 번호를 추측하지 않습니다.",
        );
      }
      if (s.articleId && value.mainArticleId !== s.articleId) {
        B.fail(
          "ARTICLE_ID_MISMATCH",
          "현재 게시글 번호와 메타데이터가 다릅니다.",
        );
      }
      B.preserveUnknown(B.existing(s.input), value);
      return value;
    }
    function carrier(
      value: { name: string; slaves: any[] },
      encoded: string | null,
    ) {
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
    function preview(id: any, encoded: any) {
      const s = current(id),
        value = checkedValue(s, encoded);
      if (
        s.input.querySelector(
          '[data-upload-loading="1"],.seditor-upload-loading',
        )
      ) {
        B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 미리보기해 주세요.");
      }
      const states = s.input.querySelectorAll(
        '[data-meta="ruricon:v1"] [data-meta="ruricon-state"]',
      );
      if (states.length && states[0].children.length) {
        B.fail(
          "STATE_UNSUPPORTED",
          "기존 메타데이터 저장 요소가 일반 텍스트 형식이 아닙니다.",
        );
      }
      const html = s.input.innerHTML,
        expected = s.input.cloneNode(true);
      if (states.length) {
        expected.querySelector(
          '[data-meta="ruricon:v1"] [data-meta="ruricon-state"]',
        ).textContent = encoded;
      } else {
        expected.append(carrier(value, encoded));
      }
      const serializedOutside = outsideCarrier(g.seditor.getHtml());
      if (s.input.innerHTML !== html) {
        B.fail(
          "EDITOR_CHANGED",
          "저장 HTML 확인 과정에서 본문이 바뀌었습니다.",
        );
      }
      if (new TextEncoder().encode(expected.innerHTML).length > 1048576) {
        B.fail(
          "BODY_SIZE_LIMIT",
          "적용 후 본문이 사이트의 1MB 제한을 넘습니다. 참조 수나 기존 본문 크기를 줄여 주세요.",
        );
      }
      const previewId = uuid();
      s.preview = {
        previewId,
        encoded,
        html,
        serializedOutside,
        expected: expected.innerHTML,
        touched: Date.now(),
      };
      return {
        previewId,
        changed: expected.innerHTML !== html,
        expiresInMs: 120000,
        mode: states.length ? "update" : "append",
        references: value.slaves.length,
        icons: value.slaves.reduce(
          (n: number, r: import("./models.ts").BundleSlave) =>
            n + r.images.length,
          0,
        ),
        unknownFieldsPreserved: true,
        changes: states.length
          ? "기존 BUNDLE 저장값만 갱신합니다. 기존 안내 문구·링크는 유지합니다."
          : "본문 끝에 BUNDLE 안내·참조 링크·저장값을 추가합니다. 기존 본문은 보존합니다.",
      };
    }
    function outsideCarrier(html: string) {
      if (typeof html !== "string" || html.length > 8 * 1024 * 1024) {
        B.fail(
          "SERIALIZE_FAILED",
          "에디터 저장 HTML을 안전한 범위에서 확인할 수 없습니다.",
        );
      }
      const template = d.createElement("template");
      template.innerHTML = html;
      for (const n of template.content.querySelectorAll(
        '[data-meta="ruricon:v1"]',
      )) {
        n.remove();
      }
      return template.innerHTML;
    }
    function apply(id: any, previewId: any) {
      const s = current(id),
        p = s.preview;
      if (!p || p.previewId !== previewId || Date.now() - p.touched > 120000) {
        B.fail("PREVIEW_REQUIRED", "먼저 변경 미리보기를 생성해 주세요.");
      }
      if (s.input.innerHTML !== p.html) {
        B.fail(
          "EDITOR_CHANGED",
          "미리보기 이후 본문이 바뀌었습니다. 다시 미리보기해 주세요.",
        );
      }
      const value = checkedValue(s, p.encoded);
      if (p.expected === p.html) {
        B.fail("NO_CHANGES", "본문에 적용할 변경사항이 없습니다.");
      }
      if (
        s.input.querySelector(
          '[data-upload-loading="1"],.seditor-upload-loading',
        )
      ) {
        B.fail("UPLOAD_PENDING", "업로드가 끝난 뒤 다시 적용해 주세요.");
      }
      const state = s.input.querySelector(
          '[data-meta="ruricon:v1"] [data-meta="ruricon-state"]',
        ),
        oldText = state?.textContent,
        newNode = state ? null : carrier(value, p.encoded);
      const h = s.history,
        stack = h.stack.slice(),
        offset = h.stackOffset;
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
        s.context.triggerEvent(
          "change",
          s.input.innerHTML,
          s.context.layoutInfo.editable,
        );
        if (s.input.innerHTML !== p.expected) {
          B.fail("VERIFY_FAILED", "에디터 변경 이벤트가 본문을 변경했습니다.");
        }
        const serialized = g.seditor.getHtml(),
          template = d.createElement("template");
        template.innerHTML = serialized;
        const saved = B.existing(template.content);
        if (JSON.stringify(saved) !== JSON.stringify(value)) {
          B.fail(
            "SERIALIZE_FAILED",
            "실제 저장 HTML에서 BUNDLE 메타데이터를 확인하지 못했습니다.",
          );
        }
        if (
          outsideCarrier(serialized) !== p.serializedOutside ||
          s.input.innerHTML !== p.expected
        ) {
          B.fail(
            "SERIALIZE_FAILED",
            "저장 HTML에서 메타데이터 외 본문 변경이 감지되었습니다.",
          );
        }
        s.preview = null;
        return {
          applied: true,
          serialized: true,
          references: value.slaves.length,
          icons: value.slaves.reduce(
            (n: number, r: import("./models.ts").BundleSlave) =>
              n + r.images.length,
            0,
          ),
        };
      } catch (e) {
        if (changed) {
          if (state) {
            state.textContent = oldText;
          } else {
            newNode!.remove();
          }
        }
        if (s.input.innerHTML === p.html) {
          h.stack = stack;
          h.stackOffset = offset;
        } else {
          h.recordUndo();
          (e as CodedError).message +=
            " 사이트 이벤트가 변경한 본문을 작성기에서 확인해 주세요.";
        }
        try {
          s.context.triggerEvent(
            "change",
            s.input.innerHTML,
            s.context.layoutInfo.editable,
          );
        } catch (_) {}
        s.preview = null;
        throw e;
      }
    }
    d.addEventListener(REQUEST, (e) => {
      if (
        e.target !== d ||
        typeof (e as CustomEvent<string>).detail !== "string" ||
        (e as CustomEvent<string>).detail.length > 2 * 1024 * 1024
      ) {
        return;
      }
      let p;
      try {
        p = JSON.parse((e as CustomEvent<string>).detail);
      } catch (_) {
        return;
      }
      if (!valid(p?.requestId)) {
        return;
      }
      let response;
      try {
        for (const [id, s] of sessions) {
          if (!s.input.isConnected || Date.now() - s.touched > 30 * 60 * 1000) {
            sessions.delete(id);
          }
        }
        let result;
        if (p.op === "scan") {
          result = scan(p.token);
        } else if (p.op === "preview") {
          result = preview(p.session, p.encoded);
        } else if (p.op === "apply") {
          result = apply(p.session, p.previewId);
        } else if (p.op === "release") {
          sessions.delete(p.session);
          result = { released: true };
        } else {
          B.fail("OP_INVALID", "지원하지 않는 생성기 작업입니다.");
        }
        response = { requestId: p.requestId, ok: true, result };
      } catch (error) {
        response = {
          requestId: p.requestId,
          ok: false,
          error: {
            code: (error as CodedError).code || "BUNDLE_FAILED",
            message: (error as CodedError).message,
          },
        };
      }
      d.dispatchEvent(
        new g.CustomEvent(RESPONSE, { detail: JSON.stringify(response) }),
      );
    });
    g.addEventListener("pagehide", () => sessions.clear(), { once: true });
  };
  initializeBundleBridge(environment);

  return {};
}
