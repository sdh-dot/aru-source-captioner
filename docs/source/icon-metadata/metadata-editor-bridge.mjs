// 자동 생성: src/icon-metadata/metadata-editor-bridge.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// MAIN 작성기의 동기 이벤트·속성 변경·직렬화·undo 규칙을 공통 태그 ESM과 연결한다.
import { decode, fail } from "../../../shared/icon-metadata/tag-codec.mjs";
import { plan } from "../../../shared/icon-metadata/tag-edit-model.mjs";
export function installMetadataEditorBridge(g = defaultEnvironment) {
    const M = { decode, fail, plan }, d = g.document;
    if (!d ||
        !/^(bbs|m)\.ruliweb\.com$/.test(g.location.hostname) ||
        g.__aruMetadataBridgeInstalled) {
        return;
    }
    g.__aruMetadataBridgeInstalled = true;
    const REQUEST = "aru-metadata-request-v1", RESPONSE = "aru-metadata-response-v1", COUNT = "aru-metadata-count-v1";
    const sessions = new Map(), watchers = new Map(), lastCounts = new Map(), handles = new WeakMap();
    const uuid = () => g.crypto.randomUUID().replaceAll("-", "");
    const valid = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{16,96}$/.test(s);
    function target(token) {
        if (!valid(token)) {
            M.fail("TARGET_INVALID", "에디터 식별값이 올바르지 않습니다.");
        }
        const nodes = d.querySelectorAll('[data-aru-metadata-target="' + token + '"]');
        const root = nodes.length === 1 ? nodes[0] : null;
        if (!root?.isConnected || !root.matches("#editor_v2 .seditor")) {
            M.fail("EDITOR_CHANGED", "에디터가 제거되거나 교체되었습니다.");
        }
        const input = root.querySelector('.note-editable[contenteditable="true"]'), source = root.querySelector("#ReactSummernoteLite");
        for (let n = root; n && n.nodeType === 1; n = n.parentElement) {
            if (n.hidden ||
                g.getComputedStyle(n).display === "none") {
                M.fail("EDITOR_UNSUPPORTED", "숨겨진 에디터에는 적용할 수 없습니다. 에디터2 편집 화면으로 돌아와 주세요.");
            }
        }
        if (!input ||
            !source ||
            root.querySelector(".note-editor.codeview,.btn-codeview.active")) {
            M.fail("EDITOR_UNSUPPORTED", "에디터2의 편집 화면에서 사용해 주세요.");
        }
        const $ = g.jQuery, editor = $?.(source), context = editor?.data("summernote"), native = context?.modules?.editor, history = native?.history;
        if (d.querySelectorAll("#ReactSummernoteLite").length !== 1 ||
            native?.editable !== input ||
            !Array.isArray(history?.stack) ||
            !Number.isInteger(history.stackOffset) ||
            typeof history.recordUndo !== "function" ||
            typeof native.beforeCommand !== "function" ||
            typeof context.triggerEvent !== "function" ||
            typeof g.seditor?.getHtml !== "function") {
            M.fail("EDITOR_API_UNAVAILABLE", "Summernote 기록·직렬화 API를 확인하지 못했습니다.");
        }
        return { token, root, input, source, editor, context, history };
    }
    function count(t) {
        const imgs = [...t.input.querySelectorAll("img")], videos = t.input.querySelectorAll("video").length;
        const policyImages = imgs.filter((n) => (n.getAttribute("src") || "").trim()).length;
        const boardInputs = [
            ...d.querySelectorAll('input[name="board_id"]'),
        ];
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
            exceeded: limit !== null && total > limit,
        };
    }
    function list(t) {
        const nodes = [...t.input.querySelectorAll("img")];
        if (nodes.length > 10000) {
            M.fail("IMAGE_LIMIT", "이 편집기의 한 번 수집 범위인 이미지 10,000개를 넘었습니다.");
        }
        const ids = new Map();
        const images = nodes.map((node, index) => {
            if (!handles.has(node)) {
                handles.set(node, uuid());
            }
            const id = node.getAttribute("data-aru-id"), rawTags = node.getAttribute("data-aru-tags");
            if (id) {
                ids.set(id, (ids.get(id) || 0) + 1);
            }
            let tags = [], error = null;
            try {
                tags = M.decode(rawTags);
            }
            catch (e) {
                error = e.code;
            }
            return {
                handle: handles.get(node),
                id,
                rawTags,
                tags,
                error,
                index,
                src: node.currentSrc ||
                    ((node.getAttribute("src") || "").trim() ? node.src : ""),
                alt: node.getAttribute("alt") || "",
            };
        });
        return {
            nodes,
            images,
            collisions: [...ids.values()].reduce((n, x) => n + Math.max(0, x - 1), 0),
        };
    }
    function scan(token, session) {
        const t = target(token), r = list(t);
        let s = session && sessions.get(session);
        if (s && (s.input !== t.input || s.source !== t.source)) {
            M.fail("EDITOR_CHANGED", "에디터가 바뀌었습니다. 다시 열어 주세요.");
        }
        if (!s) {
            if (sessions.size >= 2) {
                M.fail("SESSION_LIMIT", "다른 메타데이터 편집기를 닫아 주세요.");
            }
            session = uuid();
            s = { ...t, commands: [], cursor: 0 };
            sessions.set(session, s);
        }
        s.touched = Date.now();
        return {
            session,
            images: r.images,
            collisions: r.collisions,
            count: count(t),
            ...historyState(s),
        };
    }
    function current(session) {
        const s = sessions.get(session);
        if (!s || Date.now() - s.touched > 30 * 60 * 1000) {
            M.fail("SESSION_EXPIRED", "편집 대상이 만료되었습니다. 다시 열어 주세요.");
        }
        const t = target(s.token);
        if (t.input !== s.input ||
            t.source !== s.source ||
            t.context !== s.context) {
            M.fail("EDITOR_CHANGED", "에디터가 교체되었습니다. 다시 열어 주세요.");
        }
        s.touched = Date.now();
        return s;
    }
    function historyState(s) {
        const h = s.history, prev = s.commands[s.cursor - 1], next = s.commands[s.cursor];
        return {
            canUndo: !!prev &&
                h.stack[h.stackOffset] === prev.after &&
                s.input.innerHTML === prev.after.contents,
            canRedo: !!next &&
                h.stack[h.stackOffset] === next.before &&
                s.input.innerHTML === next.before.contents,
        };
    }
    function preview(s, p) {
        return M.plan(list(s).images, p.handles, p.tags, p.operation, uuid);
    }
    function apply(session, p) {
        const s = current(session), r = list(s), plan = M.plan(r.images, p.handles, p.tags, p.operation, uuid);
        if (s.input.querySelector('[data-upload-loading="1"],.seditor-upload-loading')) {
            M.fail("UPLOAD_PENDING", "진행 중인 이미지 업로드가 완료된 뒤 적용해 주세요.");
        }
        if (!plan.changed) {
            return { ...plan, ...historyState(s) };
        }
        const byHandle = new Map(r.nodes.map((n) => [handles.get(n), n]));
        const backups = plan.changes.map((x) => ({
            node: byHandle.get(x.handle),
            id: byHandle.get(x.handle).getAttribute("data-aru-id"),
            tags: byHandle.get(x.handle).getAttribute("data-aru-tags"),
        }));
        const before = s.input.innerHTML, expected = s.input.cloneNode(true), expectedNodes = [...expected.querySelectorAll("img")];
        const index = new Map(r.images.map((x, i) => [x.handle, i]));
        for (const x of plan.changes) {
            const n = expectedNodes[index.get(x.handle)];
            n.setAttribute("data-aru-id", x.id);
            n.setAttribute("data-aru-tags", x.rawTags);
        }
        const h = s.history, oldStack = h.stack.slice(), oldOffset = h.stackOffset;
        const restore = (node, key, value) => value == null
            ? g.Element.prototype.removeAttribute.call(node, key)
            : g.Element.prototype.setAttribute.call(node, key, value);
        try {
            // 작성 중인 본문과 이전 undo 기록을 유지한다. editor.commit은 기존 기록을 지우므로 호출하지 않는다.
            if (h.stack[h.stackOffset]?.contents !== before) {
                h.recordUndo();
            }
            const beforeSnapshot = h.stack[h.stackOffset];
            s.editor.summernote("editor.beforeCommand");
            if (s.input.innerHTML !== before) {
                M.fail("EDITOR_CHANGED", "작업 시작 이벤트가 본문을 변경했습니다. 적용을 중단했습니다.");
            }
            for (const x of plan.changes) {
                const n = byHandle.get(x.handle);
                n.setAttribute("data-aru-id", x.id);
                n.setAttribute("data-aru-tags", x.rawTags);
            }
            if (s.input.innerHTML !== expected.innerHTML) {
                M.fail("VERIFY_FAILED", "대상 외 HTML 변경이 감지되었습니다.");
            }
            // 속성만 수정하고 전체 HTML 재설정 없이 기존 작성기의 history·change 계약을 따른다.
            h.recordUndo();
            s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
            if (s.input.innerHTML !== expected.innerHTML) {
                M.fail("VERIFY_FAILED", "변경 이벤트가 대상 외 HTML을 변경했습니다.");
            }
            const template = d.createElement("template");
            template.innerHTML = g.seditor.getHtml();
            const saved = [...template.content.querySelectorAll("img")];
            if (saved.length !== r.nodes.length) {
                M.fail("SERIALIZE_FAILED", "저장 HTML의 이미지 수가 편집 화면과 다릅니다.");
            }
            for (const x of plan.changes) {
                const n = saved[index.get(x.handle)], live = byHandle.get(x.handle);
                if (n.getAttribute("data-aru-id") !== x.id ||
                    n.getAttribute("data-aru-tags") !== x.rawTags ||
                    n.getAttribute("src") !== live.getAttribute("src")) {
                    M.fail("SERIALIZE_FAILED", "저장 HTML에서 이미지 메타데이터를 확인하지 못했습니다.");
                }
            }
            const afterSnapshot = h.stack[h.stackOffset];
            s.commands = s.commands.slice(0, s.cursor);
            s.commands.push({ before: beforeSnapshot, after: afterSnapshot });
            if (s.commands.length > 20) {
                s.commands.shift();
            }
            s.cursor = s.commands.length;
            emitCount(s);
            return { ...plan, serialized: true, ...historyState(s) };
        }
        catch (e) {
            for (const b of backups) {
                restore(b.node, "data-aru-id", b.id);
                restore(b.node, "data-aru-tags", b.tags);
            }
            h.stack = oldStack;
            h.stackOffset = oldOffset;
            try {
                s.context.triggerEvent("change", s.input.innerHTML, s.context.layoutInfo.editable);
            }
            catch (_) { }
            if (s.input.innerHTML !== before) {
                e.message +=
                    " 에디터 이벤트가 별도로 변경한 본문은 원래 작성기에서 확인해 주세요.";
            }
            throw e;
        }
    }
    function history(session, op) {
        const s = current(session), state = historyState(s), command = op === "undo" ? s.commands[s.cursor - 1] : s.commands[s.cursor];
        if (!state[op === "undo" ? "canUndo" : "canRedo"]) {
            M.fail("HISTORY_CHANGED", "본문의 다른 작업이 기록되었습니다. 에디터의 기본 실행 취소를 사용해 주세요.");
        }
        s.editor.summernote(op);
        const expected = op === "undo" ? command.before : command.after;
        if (s.input.innerHTML !== expected.contents) {
            M.fail("HISTORY_VERIFY", "에디터 실행 취소 결과를 확인하지 못했습니다.");
        }
        s.cursor += op === "undo" ? -1 : 1;
        emitCount(s);
        return scan(s.token, session);
    }
    function emitCount(t) {
        const c = count(t), key = JSON.stringify(c);
        if (lastCounts.get(t.token) === key) {
            return;
        }
        lastCounts.set(t.token, key);
        d.dispatchEvent(new g.CustomEvent(COUNT, {
            detail: JSON.stringify({ token: t.token, count: c }),
        }));
    }
    function watch(token) {
        const t = target(token);
        unwatch(token);
        let timer = null, disposed = false;
        const refresh = () => {
            g.clearTimeout(timer);
            timer = g.setTimeout(() => {
                if (!disposed && t.input.isConnected) {
                    emitCount(t);
                }
            }, 180);
        };
        g.jQuery(t.source).on("summernote.change.aruMetadata summernote.image.upload.aruMetadata summernote.paste.aruMetadata", refresh);
        const observer = new g.MutationObserver((records) => {
            if (records.some((r) => r.type === "attributes" ||
                [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 &&
                    (n.matches("img,video,source") ||
                        n.querySelector("img,video,source"))))) {
                refresh();
            }
        });
        observer.observe(t.input, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"],
        });
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
    function unwatch(token) {
        watchers.get(token)?.();
        watchers.delete(token);
        lastCounts.delete(token);
        for (const [id, s] of sessions) {
            if (s.token === token) {
                sessions.delete(id);
            }
        }
    }
    d.addEventListener(REQUEST, (event) => {
        if (event.target !== d ||
            typeof event.detail !== "string" ||
            event.detail.length > 1024 * 1024) {
            return;
        }
        let p;
        try {
            p = JSON.parse(event.detail);
        }
        catch (_) {
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
                    const plan = preview(current(p.session), p);
                    result = {
                        selected: plan.selected,
                        changed: plan.changed,
                        ids: plan.ids,
                        tagChanges: plan.tagChanges,
                    };
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
        }
        catch (e) {
            response = {
                requestId: p.requestId,
                ok: false,
                error: {
                    code: e.code || "METADATA_FAILED",
                    message: e.message || "메타데이터 처리에 실패했습니다.",
                },
            };
        }
        d.dispatchEvent(new g.CustomEvent(RESPONSE, { detail: JSON.stringify(response) }));
    });
    g.addEventListener("pagehide", () => {
        // oxlint-disable-next-line unicorn/no-useless-spread -- 정리·외부 콜백의 재진입이 순회 대상을 바꾸더라도 이번 작업의 대상은 보존한다.
        for (const token of [...watchers.keys()]) {
            unwatch(token);
        }
        sessions.clear();
    });
}
