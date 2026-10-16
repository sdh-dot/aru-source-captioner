import type { DynamicApi } from "../runtime/contracts.ts";
import type { CodedError } from "../runtime/contracts.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 페이지 작성기 API와 동기 DOM 이벤트 계약을 연결하며 직접 게시하지 않는다.

export function createIconsComposerBridge({
  environment = defaultEnvironment,
  dependencies: _dependencies = {},
}: FactoryOptions = {}) {
  const { CustomEvent, URL } = environment;

  /* MAIN world: narrowly scoped native composer operations, no extension/network APIs. */
  const initializeIconsComposerBridge = function (global: RuntimeEnvironment) {
    "use strict";
    const doc = global.document;
    if (
      !doc ||
      !/^(bbs|m)\.ruliweb\.com$/.test(global.location?.hostname || "")
    ) {
      return;
    }
    const REQUEST = "aru-icons-composer-request-v1",
      RESPONSE = "aru-icons-composer-response-v1";
    const sessions = new Map(),
      TTL = 10 * 60 * 1000;
    let debug = false;
    const trace = (stage: string, fields = {}) => {
      if (debug) {
        global.console?.info?.("[Aru Icons Composer]", { stage, ...fields });
      }
    };
    const fail = (code: string, message?: string | undefined): never => {
      throw Object.assign(new Error(message), { code });
    };
    const validToken = (value: string) =>
      typeof value === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(value);
    function visible(node: Element | null) {
      if (!node?.isConnected) {
        return false;
      }
      for (
        let n: Element | null = node;
        n && n.nodeType === 1;
        n = n.parentElement
      ) {
        if (
          (n as HTMLElement).hidden ||
          global.getComputedStyle(n).display === "none" ||
          global.getComputedStyle(n).visibility === "hidden"
        ) {
          return false;
        }
      }
      return node.getClientRects().length > 0;
    }
    function target(token: string) {
      if (!validToken(token)) {
        fail("TARGET_INVALID", "작성기 식별값이 올바르지 않습니다.");
      }
      const nodes = doc.querySelectorAll(
        '[data-aru-composer-token="' + token + '"]',
      );
      trace("target", {
        connected: nodes.length === 1 && nodes[0].isConnected,
        visible: nodes.length === 1 && visible(nodes[0]),
      });
      if (nodes.length !== 1) {
        fail(
          "TARGET_DETACHED",
          "작성기가 사라졌거나 대상을 하나로 확인할 수 없습니다. 작성기에서 다시 열어 주세요.",
        );
      }
      if (!visible(nodes[0])) {
        fail(
          "TARGET_HIDDEN",
          "작성기가 숨겨졌습니다. 해당 작성기에서 다시 열어 주세요.",
        );
      }
      const root = nodes[0];
      if (root.matches(".common_write_wrapper")) {
        const inputs = [
          ...root.querySelectorAll<HTMLTextAreaElement>(
            "textarea.comment_input,textarea.reply_input",
          ),
        ].filter((n) => n.closest(".common_write_wrapper") === root);
        if (inputs.length !== 1 || inputs[0].disabled || !visible(inputs[0])) {
          fail("TARGET_INVALID", "댓글 작성기를 하나로 확인할 수 없습니다.");
        }
        const input = inputs[0],
          reply = input.matches(".reply_input")
            ? input.closest(".comment_reply")
            : null;
        if (
          input.matches(".reply_input") &&
          (!reply || !/^rct_[1-9]\d*$/.test(reply.id))
        ) {
          fail("REPLY_INVALID", "답글 작성기의 대상 ID를 확인할 수 없습니다.");
        }
        // Native comment.js initializes comment_info on .comment_container (not its wrapper).
        // Prefer the authoritative container; keep older wrapper-only markup compatible.
        const owner =
          root.closest(".comment_container") ||
          root.closest(".comment_wrapper");
        const info = owner && global.jQuery?.(owner).data("comment_info");
        trace("native-composer-data", {
          inputValid: inputs.length === 1,
          kind: reply ? "reply" : "comment",
          dataReady: !!info,
          boardIdValid: /^[1-9]\d*$/.test(String(info?.board_id)),
          articleIdValid: /^[1-9]\d*$/.test(String(info?.article_id)),
          replyMatch:
            !reply || String(info?.active_reply_id) === reply.id.slice(4),
        });
        if (
          !info ||
          !/^[1-9]\d*$/.test(String(info.board_id)) ||
          !/^[1-9]\d*$/.test(String(info.article_id))
        ) {
          fail(
            "COMPOSER_NOT_READY",
            "사이트의 댓글 작성기 정보를 확인할 수 없습니다. 페이지와 해당 작성기 상태를 확인한 뒤 다시 열어 주세요.",
          );
        }
        // comment_reply_submit chooses #rct_active_reply_id, independently of the clicked wrapper.
        if (
          reply &&
          (!info || String(info.active_reply_id) !== reply.id.slice(4))
        ) {
          fail(
            "REPLY_CHANGED",
            "활성 답글 대상이 바뀌었습니다. 해당 답글에서 다시 열어 주세요.",
          );
        }
        if (
          info?.is_disable ||
          info?.is_submit ||
          root.querySelector(
            ".common_input_btn.disable,.comment_progress_blocker",
          )
        ) {
          fail("COMPOSER_BUSY", "현재 작성기는 입력할 수 없는 상태입니다.");
        }
        return {
          root,
          input,
          owner,
          reply,
          boardId: String(info.board_id),
          articleId: String(info.article_id),
          kind: reply ? "reply" : "comment",
        };
      }
      if (root.matches("#editor_v2 .seditor")) {
        const input = root.querySelector(
          '.note-editable[contenteditable="true"]',
        );
        const source = root.querySelector("#ReactSummernoteLite");
        if (
          !visible(input) ||
          !source ||
          root.querySelector(".note-editor.codeview") ||
          root.querySelector(".btn-codeview.active")
        ) {
          fail(
            "EDITOR_UNSUPPORTED",
            "에디터2의 편집 화면에서 열어 주세요. 코드 보기와 구 에디터는 이번 버전에서 지원하지 않습니다.",
          );
        }
        const $ = global.jQuery,
          editor = $?.(source),
          context = editor?.data("summernote");
        if (
          doc.querySelectorAll("#ReactSummernoteLite").length !== 1 ||
          context?.modules?.editor?.editable !== input ||
          !context?.modules?.editor?.history ||
          typeof global.app?.editor_insertContents !== "function" ||
          typeof global.seditor?.getHtml !== "function"
        ) {
          fail(
            "EDITOR_API_UNAVAILABLE",
            "확인된 Summernote 삽입 API가 준비되지 않았습니다.",
          );
        }
        return { root, input, source, editor, context, kind: "post" };
      }
      fail("TARGET_INVALID", "지원하는 작성기가 아닙니다.");
    }
    function media(raw: { url: any; format: any; kind: string }) {
      const value = raw?.url;
      if (
        typeof value !== "string" ||
        value.length > 2048 ||
        /[\u0000-\u0020\u007f\\"'<>]/u.test(value)
      ) {
        fail("URL_INVALID", "아이콘 URL을 사용할 수 없습니다.");
      }
      let url;
      try {
        url = new URL(value);
      } catch (_) {
        fail("URL_INVALID", "아이콘 URL을 사용할 수 없습니다.");
      }
      if (
        url!.protocol !== "https:" ||
        !["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"].includes(
          url!.hostname,
        ) ||
        url!.port ||
        url!.username ||
        url!.password ||
        url!.hash ||
        !/^\/(img|ori|mo|thumb)\//.test(url!.pathname)
      ) {
        fail(
          "URL_INVALID",
          "확인된 루리웹 원본 미디어 URL만 사용할 수 있습니다.",
        );
      }
      const extension = url!.pathname
        .match(/\.(png|jpe?g|gif|webp|mp4)$/i)?.[1]
        ?.toLowerCase();
      if (!extension) {
        fail(
          "MEDIA_UNSUPPORTED",
          "네이티브 삽입을 확인한 PNG·JPG·GIF·WEBP·MP4만 첨부할 수 있습니다. WEBM은 다운로드·조회 기능을 이용해 주세요.",
        );
      }
      const nativeVideo = value.includes(".mp4");
      if (nativeVideo && extension !== "mp4") {
        fail(
          "MEDIA_MISMATCH",
          "URL의 네이티브 동영상 판정과 원본 확장자가 다릅니다.",
        );
      }
      if (extension === "mp4" && !nativeVideo) {
        fail(
          "MEDIA_UNSUPPORTED",
          "네이티브 선택기가 이 MP4 URL을 동영상으로 판정하지 못합니다.",
        );
      }
      const declared = String(raw.format || "")
        .toLowerCase()
        .replace("jpeg", "jpg");
      if (
        declared &&
        declared !== "unknown" &&
        declared !== (extension === "jpeg" ? "jpg" : extension)
      ) {
        fail(
          "MEDIA_MISMATCH",
          "메타데이터 형식과 URL의 네이티브 처리 형식이 다릅니다. 원본을 다시 확인해 주세요.",
        );
      }
      if (raw.kind && raw.kind !== (nativeVideo ? "video" : "image")) {
        fail("MEDIA_MISMATCH", "미디어 유형이 일치하지 않습니다.");
      }
      return { url: value, video: nativeVideo, extension };
    }
    function capture(token: any) {
      for (const [key, s] of sessions) {
        if (Date.now() - s.created > TTL) {
          sessions.delete(key);
        }
      }
      const t = target(token);
      const s: DynamicApi = { ...t, token, created: Date.now() };
      if (t!.kind === "post") {
        let range = t!.editor.summernote("editor.getLastRange");
        const selection = global.getSelection();
        if (selection?.rangeCount) {
          const r = selection.getRangeAt(0);
          if (
            t!.input!.contains(r.startContainer) &&
            t!.input!.contains(r.endContainer)
          ) {
            range = global.jQuery.summernote.range.create(
              r.startContainer,
              r.startOffset,
              r.endContainer,
              r.endOffset,
            );
          }
        }
        if (
          !range ||
          !t!.input!.contains(range.sc) ||
          !t!.input!.contains(range.ec)
        ) {
          fail(
            "CARET_MISSING",
            "본문을 클릭하여 삽입할 커서 위치를 먼저 정해 주세요.",
          );
        }
        // Retain node references, not a shared global "last range" which the picker can replace.
        s.range = global.jQuery.summernote.range.create(
          range.sc,
          range.so,
          range.ec,
          range.eo,
        );
        s.html = t!.input!.innerHTML;
        s.sourceApi = global.app.editor_insertContents;
      } else {
        s.start = (t!.input! as HTMLTextAreaElement).selectionStart;
        s.end = (t!.input! as HTMLTextAreaElement).selectionEnd;
        s.direction = (t!.input! as HTMLTextAreaElement).selectionDirection;
      }
      if (sessions.size >= 4) {
        fail(
          "SESSION_LIMIT",
          "열려 있는 아이콘 선택기를 닫고 다시 시도해 주세요.",
        );
      }
      const id = global.crypto.randomUUID().replaceAll("-", "");
      sessions.set(id, s);
      trace("capture", {
        status: "passed",
        kind: t!.kind,
        sessionCreated: true,
      });
      return { session: id, kind: t!.kind };
    }
    function attachComment(
      s: DynamicApi,
      m: { url: any; video: any; extension?: any },
    ) {
      const app = global.app;
      if (
        typeof app?.select_icon !== "function" ||
        app.select_icon.__ruliDynamicStub ||
        app.g_comment_icon_data?.is_editor === true
      ) {
        fail(
          "NATIVE_API_UNAVAILABLE",
          "댓글용 네이티브 아이콘 모듈이 준비되지 않았습니다. 기존 아이콘 버튼으로 목록을 연 뒤 다시 시도해 주세요.",
        );
      }
      // Native select_icon removes upload previews. Reject rather than discarding a pending upload.
      if (
        s.root.querySelector(".preview") ||
        s.root.uploadFile ||
        s.root.preview
      ) {
        fail(
          "UPLOAD_PRESENT",
          "기존 이미지 첨부가 있습니다. 기존 첨부를 직접 해제한 뒤 아이콘을 삽입해 주세요.",
        );
      }
      const previous = [...s.root.querySelectorAll(".icon_preview")].map(
        (node) => ({ node, parent: node.parentNode, next: node.nextSibling }),
      );
      const text = s.input.value,
        props = {
          uploadFile: s.root.uploadFile,
          preview: s.root.preview,
          icon_preview: s.root.icon_preview,
        };
      const argument = doc.createElement(m.video ? "video" : "img");
      argument.hidden = true;
      argument.setAttribute("src", m.url);
      s.root.append(argument);
      try {
        // jQuery.remove inside the native API clears handlers; detach backups before invoking it.
        for (const p of previous) {
          global.jQuery(p.node).detach();
        }
        app.select_icon(argument);
        const previews = s.root.querySelectorAll(".icon_preview");
        if (
          previews.length !== 1 ||
          previews[0].getAttribute("src") !== m.url ||
          previews[0].tagName !== (m.video ? "VIDEO" : "IMG") ||
          previews[0].parentElement !==
            s.input.closest(".common_input_wrapper")?.parentElement ||
          s.input.value !== text
        ) {
          fail(
            "NATIVE_VERIFY_FAILED",
            "네이티브 첨부 상태 확인에 실패하여 기존 내용을 복원했습니다.",
          );
        }
        for (const p of previous) {
          global.jQuery(p.node).remove();
        }
        return {
          kind: s.kind,
          commentImg: previews[0].getAttribute("src"),
          tag: previews[0].tagName,
        };
      } catch (error) {
        for (const node of s.root.querySelectorAll(".icon_preview")) {
          if (!previous.some((p) => p.node === node)) {
            node.remove();
          }
        }
        for (const p of previous) {
          if (!p.node.isConnected && p.parent.isConnected) {
            p.parent.insertBefore(
              p.node,
              p.next?.parentNode === p.parent ? p.next : null,
            );
          }
        }
        Object.assign(s.root, props);
        if (s.input.value !== text) {
          s.input.value = text;
        }
        throw error;
      } finally {
        argument.remove();
      }
    }
    function attachPost(
      s: DynamicApi,
      m: { url: any; video: any; extension?: any },
    ) {
      if (
        s.input.innerHTML !== s.html ||
        !s.input.contains(s.range.sc) ||
        !s.input.contains(s.range.ec) ||
        global.app.editor_insertContents !== s.sourceApi
      ) {
        fail(
          "EDITOR_CHANGED",
          "선택기를 연 뒤 본문이나 에디터가 바뀌었습니다. 커서를 정하고 다시 열어 주세요.",
        );
      }
      const before = s.input.innerHTML,
        history = s.context.modules.editor.history;
      if (
        !Number.isInteger(history.stackOffset) ||
        !Array.isArray(history.stack) ||
        typeof s.context.modules.editor.commit !== "function"
      ) {
        fail(
          "EDITOR_API_UNAVAILABLE",
          "에디터 실행 취소 상태를 확인할 수 없습니다.",
        );
      }
      // Commit pending typing through the editor before a new command, so Undo cannot erase the existing draft.
      s.editor.summernote("editor.commit");
      const offset = history.stackOffset;
      const count = (html: string) => {
        const template = doc.createElement("template");
        template.innerHTML = html;
        return [
          ...template.content.querySelectorAll(
            m.video ? "video[src]" : "img[src]",
          ),
        ].filter((n) => n.getAttribute("src") === m.url).length;
      };
      const originalCount = count(before);
      // Reproduce the native callback's media markup through the confirmed site insertion API.
      const node = doc.createElement(m.video ? "video" : "img");
      node.setAttribute("src", m.url);
      if (m.video) {
        node.className = "inline_block";
        for (const a of ["muted", "autoplay", "playsinline"]) {
          node.setAttribute(a, "");
        }
      } else {
        node.style.maxWidth = "100%";
        if (m.url!.includes(".webp") || m.url!.includes(".gif")) {
          node.dataset.gifct = "yes";
        }
      }
      try {
        s.range.select();
        s.editor.summernote("editor.setLastRange", s.range);
        s.editor.summernote("editor.saveRange");
        s.sourceApi(
          node.outerHTML,
          m.video
            ? "text-align: center;max-width:100%;"
            : "text-align: center;",
        );
        const serialized = global.seditor.getHtml();
        if (
          !s.root.isConnected ||
          count(s.input.innerHTML) !== originalCount + 1 ||
          count(serialized) !== originalCount + 1
        ) {
          fail(
            "EDITOR_VERIFY_FAILED",
            "에디터 화면과 본문 데이터의 삽입 결과가 일치하지 않습니다.",
          );
        }
        return { kind: "post", tag: node.tagName, serialized: true };
      } catch (error) {
        // Exactly one insertContents call: undo its history entry using the editor, never rewrite the editable DOM.
        if (history.stackOffset > offset) {
          s.editor.summernote("undo");
        }
        if (s.input.innerHTML !== before) {
          (error as CodedError).message +=
            " 기존 본문 자동 복원을 확인하지 못했습니다. 에디터 실행 취소로 확인해 주세요.";
        }
        throw error;
      }
    }
    function insert(id: any, raw: any) {
      const s: DynamicApi = sessions.get(id);
      if (!s || Date.now() - s.created > TTL) {
        sessions.delete(id);
        fail(
          "SESSION_EXPIRED",
          "삽입 대상이 만료되었습니다. 작성기에서 다시 열어 주세요.",
        );
      }
      trace("session", {
        exists: !!s,
        ageMs: Date.now() - s.created,
        kind: s.kind,
      });
      const t = target(s.token);
      trace("identity", {
        wrapperRetained: t!.root === s.root,
        inputRetained: t!.input === s.input,
        boardMatch: t!.boardId === s.boardId,
        articleMatch: t!.articleId === s.articleId,
        kindMatch: t!.kind === s.kind,
      });
      if (
        t!.root !== s.root ||
        t!.input !== s.input ||
        t!.owner !== s.owner ||
        t!.kind !== s.kind ||
        t!.source !== s.source ||
        t!.boardId !== s.boardId ||
        t!.articleId !== s.articleId
      ) {
        fail(
          "TARGET_CHANGED",
          "작성기나 대상 게시글이 바뀌었습니다. 작성기에서 다시 열어 주세요.",
        );
      }
      const m = media(raw),
        result = s.kind === "post" ? attachPost(s, m) : attachComment(s, m);
      sessions.delete(id);
      trace("native-insert", {
        status: "passed",
        kind: s.kind,
        sessionConsumed: true,
      });
      s.input.focus({ preventScroll: true });
      if (s.kind !== "post") {
        s.input.setSelectionRange(
          Math.min(s.start, s.input.value.length),
          Math.min(s.end, s.input.value.length),
          s.direction,
        );
      }
      return result;
    }
    doc.addEventListener(REQUEST, (event) => {
      // String detail avoids Firefox cross-world object wrappers. No functions, selectors or arbitrary code accepted.
      if (
        event.target !== doc ||
        typeof (event as CustomEvent<string>).detail !== "string" ||
        (event as CustomEvent<string>).detail.length > 5000
      ) {
        return;
      }
      let request;
      try {
        request = JSON.parse((event as CustomEvent<string>).detail);
      } catch (_) {
        return;
      }
      if (!validToken(request?.requestId)) {
        return;
      }
      debug = request.debug === true;
      let response;
      try {
        let result;
        if (request.op === "capture") {
          result = capture(request.token);
        } else if (request.op === "insert") {
          result = insert(request.session, request.media);
        } else if (request.op === "release") {
          sessions.delete(request.session);
          result = { released: true };
        } else {
          fail("OP_INVALID", "지원하지 않는 작성기 작업입니다.");
        }
        response = { requestId: request.requestId, ok: true, result };
      } catch (error) {
        trace(request.op, {
          status: "failed",
          code: (error as CodedError).code || "NATIVE_INSERT_FAILURE",
        });
        response = {
          requestId: request.requestId,
          ok: false,
          error: {
            code: (error as CodedError).code || "NATIVE_INSERT_FAILURE",
            message: (error as CodedError).message || "삽입에 실패했습니다.",
          },
        };
      }
      doc.dispatchEvent(
        new CustomEvent(RESPONSE, { detail: JSON.stringify(response) }),
      );
      debug = false;
    });
  };
  initializeIconsComposerBridge(environment);

  return {};
}
