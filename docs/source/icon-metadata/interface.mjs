// 자동 생성: src/icon-metadata/interface.ts. tools/compile-typescript.mjs로 갱신한다.
import { contextEffectGate } from "../runtime/context-effect-gate.mjs";
import { sessionDrafts } from "../runtime/session-resources.mjs";
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 태그 편집 UI와 선택 모델을 연결하고 MAIN의 이미지 handle 검증 계약을 유지한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createMetadataInterface({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const effectGate = contextEffectGate(environment);
    const { URL } = environment;
    let metadata = createModuleScope(dependencies.metadata, ["Selection", "FIXED", "normalize", "Panel", "Browser", "Client"], ["Client", "Browser", "Panel", "Controller", "countLabel"]);
    let icons = createModuleScope(dependencies.icons, ["DesignSystem"], []);
    const initializeMetadataClient = function (g) {
        "use strict";
        const M = metadata;
        class Client {
            constructor(doc) {
                this.doc = doc;
                this.pending = new Map();
                this.closed = false;
                this.receive = (e) => {
                    if (e.target !== doc ||
                        typeof e.detail !== "string") {
                        return;
                    }
                    let p;
                    try {
                        p = JSON.parse(e.detail);
                    }
                    catch (_) {
                        return;
                    }
                    const item = this.pending.get(p.requestId);
                    if (!item) {
                        return;
                    }
                    g.clearTimeout(item.timer);
                    this.pending.delete(p.requestId);
                    if (!effectGate.allows()) {
                        item.reject(Object.assign(new Error("확장 컨텍스트가 종료되었습니다."), {
                            code: "CONTEXT_INVALIDATED",
                        }));
                    }
                    else if (p.ok) {
                        item.resolve(p.result);
                    }
                    else {
                        item.reject(Object.assign(new Error(p.error?.message || "메타데이터 오류"), {
                            code: p.error?.code,
                        }));
                    }
                };
                doc.addEventListener("aru-metadata-response-v1", this.receive);
                this.detachGate = effectGate.onStop(() => this.destroy());
            }
            request(op, body = {}) {
                try {
                    effectGate.assert();
                }
                catch (error) {
                    return Promise.reject(error);
                }
                if (this.closed) {
                    return Promise.reject(new Error("편집기가 종료되었습니다."));
                }
                return new Promise((resolve, reject) => {
                    const requestId = g.crypto.randomUUID().replaceAll("-", "");
                    const detail = JSON.stringify({ ...body, op, requestId });
                    if (detail.length > 1024 * 1024) {
                        reject(Object.assign(new Error("작업 요청이 1MB를 넘었습니다. 선택 범위나 태그를 줄여 주세요."), { code: "REQUEST_LIMIT" }));
                        return;
                    }
                    const timer = g.setTimeout(() => {
                        this.pending.delete(requestId);
                        reject(Object.assign(new Error("에디터 연결 응답이 없습니다. 페이지를 다시 열어 주세요."), { code: "BRIDGE_TIMEOUT" }));
                    }, 20000);
                    this.pending.set(requestId, { resolve, reject, timer });
                    this.doc.dispatchEvent(new g.CustomEvent("aru-metadata-request-v1", { detail }));
                });
            }
            destroy() {
                if (this.closed) {
                    return;
                }
                this.detachGate?.();
                this.closed = true;
                this.doc.removeEventListener("aru-metadata-response-v1", this.receive);
                for (const p of this.pending.values()) {
                    g.clearTimeout(p.timer);
                    p.reject(new Error("편집기가 종료되었습니다."));
                }
                this.pending.clear();
            }
        }
        const api = g.browser || g.chrome;
        const Browser = {
            async active() {
                try {
                    if (!effectGate.allows()) {
                        return false;
                    }
                    if (!api?.storage?.sync) {
                        return false;
                    }
                    let values;
                    if (g.browser) {
                        values = await api.storage.sync.get(["enabled", "aruIconsOptions"]);
                    }
                    else {
                        values = await new Promise((resolve) => api.storage.sync.get(["enabled", "aruIconsOptions"], (v) => {
                            try {
                                const error = api.runtime?.lastError;
                                if (error) {
                                    effectGate.observeError(error.message);
                                }
                                resolve(error ? {} : v);
                            }
                            catch (error) {
                                effectGate.observeError(error);
                                resolve({});
                            }
                        }));
                    }
                    return (effectGate.allows() &&
                        values?.enabled !== false &&
                        values?.aruIconsOptions?.enabled === true);
                }
                catch (error) {
                    effectGate.observeError(error);
                    throw error;
                }
            },
            subscribe(fn) {
                const listener = (changes, area) => {
                    if (area === "sync" && (changes.enabled || changes.aruIconsOptions)) {
                        fn();
                    }
                };
                api?.storage?.onChanged?.addListener(listener);
                return () => api?.storage?.onChanged?.removeListener(listener);
            },
        };
        Object.assign(M, { Client, Browser });
    };
    initializeMetadataClient(environment);
    // 보이는 행만 렌더링하며 선택 대상은 이미지별 handle로 유지한다.
    const initializeMetadataPanel = function (g) {
        "use strict";
        const M = metadata;
        const CSS = `:host{all:initial;color:#252339;font:14px system-ui,sans-serif}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #d4c9ef;border-radius:8px;background:white;color:#342954;padding:9px}button:disabled{opacity:.45;cursor:default}button[aria-pressed=true]{background:#7650ba;color:white}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #a782e7}input,select{border:1px solid #d4c9ef;border-radius:8px;padding:8px;background:white;color:#252339}.overlay{position:fixed;inset:0;z-index:2147483647;background:#19152977;display:flex;align-items:center;justify-content:center;padding:16px}.dialog{width:min(1100px,100%);max-height:94vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 80px #21173b55}.header,.footer{padding:14px 18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#faf8ff}.header h2{margin:0;font-size:19px;flex:1}.body{padding:16px;overflow:auto;min-height:0}.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.search{min-width:180px;flex:1}.viewport{height:36vh;min-height:190px;max-height:400px;overflow:auto;position:relative;border:1px solid #e3dcef;border-radius:10px;background:#faf9fc;contain:strict}.space{position:relative;width:100%}.card{position:absolute;width:var(--cardwidth);height:126px;padding:6px;display:flex;flex-direction:column;gap:3px;align-items:center;border-radius:8px;overflow:hidden}.card[aria-pressed=true]{box-shadow:inset 0 0 0 3px #7650ba;background:#f1e9ff;color:#252339}.card img{width:100%;height:72px;object-fit:contain}.card .tags{width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.card small{font-size:11px}.fixed,.chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.fixed button{padding:7px 11px}.chips button{padding:4px 8px}.note{font-size:12px;color:#665b78;margin:6px 0}.status{min-height:24px;margin:8px 0;white-space:pre-wrap}.error{color:#a3321a}.footer span{flex:1}.apply{background:#7650ba;color:white}.warn{color:#a3321a}@media(max-width:600px){.overlay{padding:6px}.body{padding:10px}.dialog{max-height:97vh}.controls button{padding:6px}.viewport{height:30vh}}`;
        class Panel {
            constructor({ document, client, token, onClose, draft, }) {
                effectGate.assert();
                this.doc = document;
                this.client = client;
                this.token = token;
                this.onClose = onClose;
                this.restoredDraft = draft;
                this.selection = new M.Selection();
                this.images = [];
                this.filtered = [];
                this.tags = [];
                this.busy = false;
                this.closed = false;
                this.rowHeight = 132;
                this.previewRevision = 0;
                this.host = document.createElement("div");
                this.host.dataset.aruMetadataPanel = "";
                this.shadow = this.host.attachShadow({ mode: "open" });
                // 무효화 시 입력값은 남겨 복사할 수 있게 하고 확장 동작으로 이어지는 이벤트만 막는다.
                for (const type of ["click", "input", "change", "keydown", "submit"]) {
                    this.shadow.addEventListener(type, (event) => {
                        if (!effectGate.allows()) {
                            event.stopImmediatePropagation();
                        }
                    }, true);
                }
                this.shadow.innerHTML = `<style>${CSS}</style><div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="title"><header class="header"><h2 id="title">아이콘 태그</h2><button type="button" data-action="close">닫기</button></header><div class="body"><div class="controls"><input class="search" type="search" placeholder="번호·이름·태그 검색" aria-label="이미지 필터"><button type="button" data-action="filtered">검색 결과 선택</button><button type="button" data-action="all">전체 선택</button><button type="button" data-action="clear">선택 해제</button><label><input type="checkbox" class="checkbox"> 체크박스 선택</label></div><div class="note summary" aria-live="polite"></div><div class="viewport" tabindex="0" aria-label="이미지 다중 선택 목록"><div class="space"></div></div><p class="note">Ctrl로 추가 선택 · Shift로 범위 선택 · Ctrl+A로 검색 결과 선택</p><div class="fixed" aria-label="고정 태그"></div><div class="controls"><input class="free" aria-label="자유 태그" placeholder="자유 태그 입력"><button type="button" data-action="tag">태그 추가</button><select class="operation" aria-label="태그 작업"><option value="add">추가 · 기존 태그 보존</option><option value="remove">제거 · 지정한 태그만</option><option value="replace">교체 · 기존 태그 덮어쓰기</option></select></div><div class="chips" aria-label="이번 작업의 태그"></div><p class="note operation-note"></p><div class="status" role="status" aria-live="polite"></div></div><footer class="footer"><span class="change-count">이미지를 선택해 주세요.</span><button type="button" data-action="refresh">목록 갱신</button><button type="button" data-action="undo" disabled>실행 취소</button><button type="button" data-action="redo" disabled>다시 실행</button><button type="button" class="apply" data-action="apply" disabled>편집기에 적용</button></footer></section></div>`;
                this.uiCleanup = icons?.DesignSystem?.attach(this.shadow);
                icons?.DesignSystem?.modalHeader(this.shadow.querySelector("header"), {
                    kind: "tags",
                    description: "이미지와 동영상의 태그를 편집합니다.",
                });
                this.q = (s) => this.shadow.querySelector(s);
                this.viewport = this.q(".viewport");
                this.space = this.q(".space");
                for (const tag of M.FIXED) {
                    const b = document.createElement("button");
                    b.type = "button";
                    b.textContent = tag;
                    b.dataset.tag = tag;
                    b.setAttribute("aria-pressed", "false");
                    this.q(".fixed").append(b);
                }
                this.shadow.addEventListener("click", (e) => this.click(e));
                this.shadow.addEventListener("input", (e) => {
                    if (e.target.matches(".search")) {
                        this.filter();
                        this.render();
                        this.summary();
                    }
                });
                this.shadow.addEventListener("change", (e) => {
                    if (e.target.matches(".operation")) {
                        this.changed();
                    }
                    if (e.target.matches(".checkbox")) {
                        this.render();
                    }
                });
                this.shadow.addEventListener("keydown", (e) => {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        this.close();
                    }
                    if (e.key === "Enter" && e.target.matches(".free")) {
                        e.preventDefault();
                        this.addFree();
                    }
                    if ((e.ctrlKey || e.metaKey) &&
                        e.key.toLowerCase() === "a" &&
                        !e.target.matches("input,textarea,select") &&
                        !e.target.isContentEditable) {
                        e.preventDefault();
                        this.selection.all(this.filtered.map((x) => x.handle));
                        this.changed();
                    }
                    if (e.key === "Tab") {
                        const focusable = [
                            ...this.shadow.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]'),
                        ];
                        const first = focusable[0], last = focusable[focusable.length - 1];
                        if (e.shiftKey && this.shadow.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                        else if (!e.shiftKey && this.shadow.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                });
                this.viewport.addEventListener("scroll", () => this.scheduleRender(), {
                    passive: true,
                });
                this.resize = () => this.scheduleRender();
                g.addEventListener("resize", this.resize);
                if (g.ResizeObserver) {
                    this.observer = new g.ResizeObserver(this.resize);
                    this.observer.observe(this.viewport);
                }
                document.body.append(this.host);
                // 초안 문자열은 효과 권한이 아니다. scan 실패 때도 복사할 수 있도록 먼저 복원한다.
                if (draft) {
                    this.tags = [...draft.tags];
                    this.q(".free").value = draft.free;
                    this.q(".search").value = draft.search;
                    this.q(".operation").value = draft.operation;
                    this.q(".checkbox").checked = draft.checkbox;
                }
                this.q(".search").focus();
                this.load();
            }
            async load() {
                this.setBusy(true);
                try {
                    const data = await this.client.request("scan", {
                        token: this.token,
                        session: this.session,
                    });
                    if (!this.closed && effectGate.allows()) {
                        this.accept(data);
                        const draft = this.restoredDraft;
                        if (draft) {
                            this.restoredDraft = undefined;
                            this.tags = [...draft.tags];
                            this.q(".free").value = draft.free;
                            this.q(".search").value = draft.search;
                            this.q(".operation").value = draft.operation;
                            this.q(".checkbox").checked = draft.checkbox;
                            // MAIN handle은 새 scan에서만 얻는다. 이전 선택을 자동 적용하지 않는다.
                            this.filter();
                            this.changed();
                        }
                        this.status(data.collisions
                            ? `중복 ID ${data.collisions}개: 적용할 때 선택한 이미지의 충돌만 정리합니다.`
                            : "이미지 선택만으로 본문은 바뀌지 않습니다.");
                    }
                }
                catch (e) {
                    this.status(`[${e.code || "ERROR"}] ${e.message}`, true);
                }
                finally {
                    this.setBusy(false);
                    if (!this.closed && effectGate.allows()) {
                        this.q(".search").focus();
                    }
                }
            }
            accept(data) {
                this.session = data.session;
                this.images = data.images;
                this.history = data;
                this.selection.retain(this.images.map((x) => x.handle));
                this.filter();
                this.render();
                this.summary();
                this.changed();
            }
            filter() {
                const terms = this.q(".search")
                    .value.toLocaleLowerCase()
                    .trim()
                    .split(/\s+/u)
                    .filter(Boolean);
                this.filtered = this.images.filter((x) => {
                    const hay = [String(x.index + 1), x.alt, ...x.tags]
                        .join(" ")
                        .toLocaleLowerCase();
                    return terms.every((t) => hay.includes(t));
                });
                this.viewport.scrollTop = 0;
            }
            summary() {
                this.q(".summary").textContent =
                    `본문 이미지 ${this.images.length}개 · 검색 결과 ${this.filtered.length}개 · 선택 ${this.selection.values.size}개`;
            }
            scheduleRender() {
                if (this.frame || this.closed) {
                    return;
                }
                this.frame = g.requestAnimationFrame(() => {
                    this.frame = null;
                    if (!this.closed && effectGate.allows()) {
                        this.render();
                    }
                });
            }
            render() {
                const width = this.viewport.clientWidth || 650, cols = Math.max(1, Math.floor(width / 142)), cardWidth = width / cols;
                const rows = Math.ceil(this.filtered.length / cols);
                this.space.style.height = rows * this.rowHeight + "px";
                this.space.style.setProperty("--cardwidth", cardWidth - 6 + "px");
                const first = Math.max(0, Math.floor(this.viewport.scrollTop / this.rowHeight) - 1), last = Math.min(rows, first +
                    Math.ceil((this.viewport.clientHeight || 300) / this.rowHeight) +
                    3);
                const from = first * cols, to = Math.min(this.filtered.length, last * cols), keep = new Set(this.filtered.slice(from, to).map((x) => x.handle));
                // oxlint-disable-next-line unicorn/no-useless-spread -- 정리·외부 콜백의 재진입이 순회 대상을 바꾸더라도 이번 작업의 대상은 보존한다.
                for (const card of [...this.space.children]) {
                    if (!keep.has(card.dataset.handle)) {
                        card.querySelector("img")?.removeAttribute("src");
                        card.remove();
                    }
                }
                const cards = new Map([...this.space.children].map((n) => [n.dataset.handle, n]));
                for (let i = from; i < to; i++) {
                    const x = this.filtered[i];
                    let b = cards.get(x.handle);
                    if (!b) {
                        b = this.doc.createElement("button");
                        b.type = "button";
                        b.className = "card";
                        b.dataset.handle = x.handle;
                        const img = this.doc.createElement("img");
                        img.alt = x.alt || `이미지 ${x.index + 1}`;
                        img.decoding = "async";
                        img.loading = "eager";
                        let src;
                        try {
                            if (!x.src || !x.src.trim()) {
                                throw new Error("empty");
                            }
                            src = new URL(x.src, this.doc.baseURI);
                            if (!["https:", "http:", "blob:", "data:"].includes(src.protocol) ||
                                src.username ||
                                src.password ||
                                (src.protocol === "data:" && !x.src.startsWith("data:image/"))) {
                                src = null;
                            }
                        }
                        catch (_) { }
                        img.addEventListener("error", () => {
                            if (!this.closed && effectGate.allows()) {
                                img.removeAttribute("src");
                                img.alt = "썸네일 로딩 실패 · 다시 누르면 재시도";
                                b.dataset.failed = "true";
                            }
                        }, { once: true });
                        if (src) {
                            img.src = src.href;
                        }
                        else {
                            img.alt = "표시할 이미지 URL 없음";
                        }
                        const label = this.doc.createElement("small");
                        label.textContent = `${x.index + 1} · ${x.id ? "태그 편집 가능" : "새 이미지"}`;
                        const tags = this.doc.createElement("span");
                        tags.className = "tags";
                        tags.textContent = x.error
                            ? "기존 태그 오류"
                            : x.tags.join(" · ") || "태그 없음";
                        tags.title = tags.textContent;
                        const check = this.doc.createElement("span");
                        check.className = "check";
                        check.setAttribute("aria-hidden", "true");
                        check.style.cssText =
                            "position:absolute;top:5px;left:8px;font-size:18px;color:#7650ba;background:#fff;border-radius:3px";
                        b.append(img, label, tags, check);
                        this.space.append(b);
                    }
                    b.style.left = (i % cols) * cardWidth + "px";
                    b.style.top = Math.floor(i / cols) * this.rowHeight + "px";
                    b.setAttribute("aria-pressed", String(this.selection.values.has(x.handle)));
                    const checkbox = this.q(".checkbox").checked;
                    b.setAttribute("role", checkbox ? "checkbox" : "button");
                    if (checkbox) {
                        b.setAttribute("aria-checked", String(this.selection.values.has(x.handle)));
                    }
                    else {
                        b.removeAttribute("aria-checked");
                    }
                    const check = b.querySelector(".check");
                    check.hidden = !checkbox;
                    check.textContent = this.selection.values.has(x.handle) ? "☑" : "☐";
                }
            }
            click(e) {
                const b = e.target.closest("button");
                if (!b) {
                    return;
                }
                const h = b.dataset.handle;
                if (h && !this.busy) {
                    if (b.dataset.failed) {
                        b.remove();
                        this.render();
                    }
                    this.selection.click(h, this.filtered.map((x) => x.handle), {
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        shiftKey: e.shiftKey,
                        checkbox: this.q(".checkbox").checked,
                    });
                    this.changed();
                    return;
                }
                if (b.dataset.tag && !this.busy) {
                    const tag = b.dataset.tag;
                    this.tags = this.tags.includes(tag)
                        ? this.tags.filter((x) => x !== tag)
                        : this.tags.concat(tag);
                    this.changed();
                    return;
                }
                if (b.dataset.remove && !this.busy) {
                    this.tags = this.tags.filter((x) => x !== b.dataset.remove);
                    this.changed();
                    return;
                }
                switch (b.dataset.action) {
                    case "close":
                        this.close();
                        break;
                    case "tag":
                        this.addFree();
                        break;
                    case "filtered":
                        this.selection.all(this.filtered.map((x) => x.handle));
                        this.changed();
                        break;
                    case "all":
                        this.selection.all(this.images.map((x) => x.handle));
                        this.changed();
                        break;
                    case "clear":
                        this.selection.clear();
                        this.changed();
                        break;
                    case "refresh":
                        this.space.replaceChildren();
                        this.load();
                        break;
                    case "apply":
                        this.apply();
                        break;
                    case "undo":
                    case "redo":
                        this.travel(b.dataset.action);
                        break;
                }
            }
            addFree() {
                if (this.busy) {
                    return;
                }
                try {
                    this.tags = M.normalize(this.tags.concat(this.q(".free").value));
                    this.q(".free").value = "";
                    this.changed();
                }
                catch (e) {
                    this.status(e.message, true);
                }
            }
            changed() {
                if (this.closed) {
                    return;
                }
                this.summary();
                this.render();
                for (const b of this.shadow.querySelectorAll(".fixed button")) {
                    b.setAttribute("aria-pressed", String(this.tags.includes(b.dataset.tag)));
                }
                this.q(".chips").replaceChildren();
                for (const tag of this.tags) {
                    const b = this.doc.createElement("button");
                    b.type = "button";
                    b.dataset.remove = tag;
                    b.textContent = tag + " ×";
                    b.title = "이번 작업의 태그에서 제거";
                    this.q(".chips").append(b);
                }
                const operation = this.q(".operation").value;
                this.q(".operation-note").textContent =
                    operation === "replace"
                        ? "교체: 선택한 이미지의 기존 태그 전체를 바꿉니다. 태그가 비어 있으면 모두 지웁니다."
                        : operation === "remove"
                            ? "제거: 이번 작업에서 지정한 태그만 지웁니다."
                            : "추가: 기존 태그를 보존합니다. 자유 태그의 쉼표는 태그 한 개의 일부입니다.";
                this.q(".operation-note").classList.toggle("warn", operation === "replace");
                this.updateButtons();
                g.clearTimeout(this.previewTimer);
                const revision = ++this.previewRevision;
                if (this.session && this.selection.values.size) {
                    this.previewTimer = g.setTimeout(async () => {
                        try {
                            const r = await this.client.request("preview", this.payload());
                            if (!this.closed && revision === this.previewRevision) {
                                this.q(".change-count").textContent =
                                    `적용 전: 선택 ${r.selected}개 · 변경 예정 ${r.changed}개 (ID ${r.ids} · 태그 ${r.tagChanges})`;
                            }
                        }
                        catch (e) {
                            if (!this.closed && revision === this.previewRevision) {
                                this.q(".change-count").textContent = e.message;
                            }
                        }
                    }, 160);
                }
                else {
                    this.q(".change-count").textContent = "이미지를 선택해 주세요.";
                }
            }
            payload() {
                return {
                    session: this.session,
                    handles: [...this.selection.values],
                    tags: this.tags,
                    operation: this.q(".operation").value,
                };
            }
            updateButtons() {
                this.q("[data-action=apply]").disabled =
                    this.busy ||
                        !this.session ||
                        !this.selection.values.size ||
                        (this.q(".operation").value !== "replace" && !this.tags.length);
                this.q("[data-action=undo]").disabled =
                    this.busy || !this.history?.canUndo;
                this.q("[data-action=redo]").disabled =
                    this.busy || !this.history?.canRedo;
                for (const n of this.shadow.querySelectorAll("input,select,.fixed button,.chips button,[data-action=all],[data-action=filtered],[data-action=clear],[data-action=refresh],[data-action=tag]")) {
                    n.disabled = this.busy;
                }
                this.q("[data-action=close]").disabled = this.busy;
            }
            setBusy(b) {
                if (this.closed) {
                    return;
                }
                this.busy = b;
                this.updateButtons();
            }
            status(text, error = false) {
                if (this.closed) {
                    return;
                }
                this.q(".status").textContent = text;
                this.q(".status").classList.toggle("error", error);
            }
            async apply() {
                if (this.busy || this.q("[data-action=apply]").disabled) {
                    return;
                }
                this.setBusy(true);
                g.clearTimeout(this.previewTimer);
                ++this.previewRevision;
                try {
                    const r = await this.client.request("apply", this.payload());
                    const data = await this.client.request("scan", {
                        token: this.token,
                        session: this.session,
                    });
                    if (!this.closed && effectGate.allows()) {
                        this.space.replaceChildren();
                        this.accept(data);
                        this.status(`적용 완료: 선택 ${r.selected}개 · 변경 ${r.changed}개 (ID ${r.ids} · 태그 ${r.tagChanges})\n본문 저장은 루리웹 기본 등록 버튼으로 직접 진행해 주세요.`);
                    }
                }
                catch (e) {
                    this.status(`[${e.code || "ERROR"}] ${e.message}`, true);
                }
                finally {
                    this.setBusy(false);
                    if (!this.closed && effectGate.allows()) {
                        this.q("[data-action=apply]").focus();
                    }
                }
            }
            async travel(op) {
                if (this.busy) {
                    return;
                }
                this.setBusy(true);
                this.selection.clear();
                try {
                    const data = await this.client.request(op, { session: this.session });
                    if (!this.closed && effectGate.allows()) {
                        this.space.replaceChildren();
                        this.accept(data);
                        this.status(op === "undo"
                            ? "메타데이터 작업을 실행 취소했습니다."
                            : "메타데이터 작업을 다시 실행했습니다.");
                    }
                }
                catch (e) {
                    this.history = {};
                    this.status(`[${e.code || "ERROR"}] ${e.message}`, true);
                }
                finally {
                    this.setBusy(false);
                    if (!this.closed && effectGate.allows()) {
                        this.q(".search").focus();
                    }
                }
            }
            close(force = false) {
                if (this.closed || (this.busy && !force)) {
                    return;
                }
                this.closed = true;
                g.clearTimeout(this.previewTimer);
                g.cancelAnimationFrame(this.frame);
                g.removeEventListener("resize", this.resize);
                this.observer?.disconnect();
                for (const img of this.shadow.querySelectorAll("img")) {
                    img.removeAttribute("src");
                }
                this.uiCleanup?.();
                this.host.remove();
                if (this.session) {
                    this.client
                        .request("release", { session: this.session })
                        .catch(() => { });
                }
                this.images = [];
                this.filtered = [];
                this.selection.clear();
                this.tags = [];
                this.onClose?.();
            }
        }
        M.Panel = Panel;
    };
    initializeMetadataPanel(environment);
    const initializeMetadataController = function (g) {
        "use strict";
        const M = metadata;
        function countLabel(c) {
            if (!c) {
                return "미디어 수 확인 중";
            }
            const counts = `이미지 ${c.images}개 · 동영상 ${c.videos}개`;
            return (counts +
                (c.limit != null
                    ? ` / 미디어 최대 ${c.limit}개${c.exceeded ? " · 제한 초과" : c.reached ? " · 제한 도달" : ""}${c.images !== c.policyImages ? ` · src 없는 이미지 ${c.images - c.policyImages}개는 한도 집계 제외` : ""}`
                    : " · 제한 정보 없음"));
        }
        class Controller {
            constructor({ document = g.document, browser = M.Browser } = {}) {
                this.doc = document;
                this.browser = browser;
                this.entries = new Map();
                this.active = false;
                this.disposed = false;
                this.generation = 0;
                this.client = new M.Client(document);
                if (effectGate.documentGate) {
                    effectGate.onStop(() => {
                        if (effectGate.documentGate.allows()) {
                            const panel = this.panel;
                            const rec = Array.from(this.entries.values()).find((item) => item.token === panel?.token);
                            if (panel && rec) {
                                sessionDrafts(g)?.set(rec.root, {
                                    tags: [...panel.tags],
                                    free: panel.q(".free").value,
                                    search: panel.q(".search").value,
                                    operation: panel.q(".operation").value,
                                    checkbox: panel.q(".checkbox").checked,
                                });
                            }
                            this.destroy();
                        }
                        else {
                            // terminal 컨텍스트에서는 기존 입력을 복사할 수 있게 두고 외부 자원만 닫는다.
                            this.disposed = true;
                            this.active = false;
                            ++this.generation;
                            this.unsubscribe?.();
                            this.observer?.disconnect();
                            this.doc.removeEventListener("aru-metadata-count-v1", this.countListener);
                            this.client.destroy();
                        }
                    });
                }
            }
            async start() {
                this.unsubscribe = this.browser.subscribe(() => this.options());
                await this.options();
            }
            async options() {
                const generation = ++this.generation;
                let active = false;
                try {
                    active = await this.browser.active();
                }
                catch (error) {
                    effectGate.observeError(error);
                }
                if (this.disposed ||
                    generation !== this.generation ||
                    active === this.active) {
                    return;
                }
                if (!effectGate.allows()) {
                    return;
                }
                this.active = active;
                if (active) {
                    this.enable();
                }
                else {
                    this.disable();
                }
            }
            enable() {
                if (!effectGate.allows()) {
                    return;
                }
                this.countListener = (e) => {
                    if (!effectGate.allows()) {
                        return;
                    }
                    if (typeof e.detail !== "string") {
                        return;
                    }
                    let p;
                    try {
                        p = JSON.parse(e.detail);
                    }
                    catch (_) {
                        return;
                    }
                    for (const rec of this.entries.values()) {
                        if (rec.token === p.token) {
                            rec.label.textContent = countLabel(p.count);
                            rec.label.classList.toggle("warn", p.count.reached);
                        }
                    }
                };
                this.doc.addEventListener("aru-metadata-count-v1", this.countListener);
                this.observer = new g.MutationObserver((records) => {
                    // 광고·캡션·모달 갱신을 작성기 교체로 오인해 다시 초기화하지 않는다.
                    if (records.some((r) => [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1 &&
                        (n.matches("#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite") ||
                            n.querySelector("#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite"))))) {
                        this.schedule();
                    }
                });
                this.observer.observe(this.doc.body, {
                    childList: true,
                    subtree: true,
                });
                this.discover();
            }
            schedule() {
                g.clearTimeout(this.timer);
                this.timer = g.setTimeout(() => this.discover(), 160);
            }
            discover() {
                if (!this.active || !effectGate.allows()) {
                    return;
                }
                for (const [root, r] of this.entries) {
                    if (!root.isConnected ||
                        !r.host.isConnected ||
                        root.querySelector(".note-editable") !== r.input ||
                        root.querySelector("#ReactSummernoteLite") !== r.source ||
                        root.querySelector(".note-toolbar") !== r.toolbar) {
                        this.remove(root);
                    }
                }
                for (const root of this.doc.querySelectorAll("#editor_v2 .seditor")) {
                    if (this.entries.has(root)) {
                        continue;
                    }
                    const source = root.querySelector("#ReactSummernoteLite"), toolbar = root.querySelector(".note-toolbar"), camera = toolbar?.querySelector(".icon-camera")?.closest("button");
                    const input = root.querySelector('.note-editable[contenteditable="true"]');
                    if (!source || !toolbar || !camera || !input) {
                        continue;
                    }
                    const token = g.crypto.randomUUID().replaceAll("-", "");
                    root.dataset.aruMetadataTarget = token;
                    const host = this.doc.createElement("span");
                    host.dataset.aruMetadataEntry = "";
                    const shadow = host.attachShadow({ mode: "open" });
                    shadow.innerHTML =
                        '<style>:host{font:12px system-ui;display:inline-flex;vertical-align:middle;margin:3px}button{font:inherit;border:1px solid #bc9ce7;border-radius:5px;background:#f7f0ff;color:#513478;padding:6px;cursor:pointer}span{padding:5px;color:#655776}.warn{color:#af381f}</style><button type="button">아이콘 태그</button><span aria-live="polite"></span>';
                    const uiCleanup = icons?.DesignSystem?.entry(shadow, {
                        label: "아이콘 태그",
                        tooltip: "게시글에 첨부한 이미지와 동영상의 태그를 편집합니다.",
                    });
                    shadow.querySelector("span").classList.add("aru-media-count");
                    camera.after(host);
                    const rec = {
                        token,
                        host,
                        uiCleanup,
                        label: shadow.querySelector("span"),
                        button: shadow.querySelector("button"),
                        source,
                        toolbar,
                        input,
                        root,
                    };
                    this.entries.set(root, rec);
                    rec.label.textContent = countLabel(null);
                    rec.button.addEventListener("click", () => this.open(rec));
                    this.startWatch(rec);
                    // 편집 영역만 제거된 경우에도 해당 작성기 인스턴스의 자원을 해제한다.
                    rec.observer = new g.MutationObserver(() => {
                        if (!root.querySelector(".note-editable") || !host.isConnected) {
                            this.schedule();
                        }
                    });
                    rec.observer.observe(root, { childList: true, subtree: true });
                }
            }
            startWatch(rec, attempt = 0) {
                this.client
                    .request("watch", { token: rec.token })
                    .then((c) => {
                    if (this.entries.get(rec.root) === rec) {
                        rec.label.textContent = countLabel(c);
                        rec.label.classList.toggle("warn", c.reached);
                        rec.label.removeAttribute("title");
                    }
                })
                    .catch((e) => {
                    if (this.entries.get(rec.root) !== rec) {
                        return;
                    }
                    rec.label.textContent = "미디어 수 확인 불가";
                    rec.label.title = e.message;
                    // DOM보다 serializer가 늦게 준비될 수 있어 최초 준비 확인만 제한 횟수로 재시도한다.
                    if (e.code === "EDITOR_API_UNAVAILABLE" && attempt < 4) {
                        rec.readyTimer = g.setTimeout(() => {
                            if (this.active && this.entries.get(rec.root) === rec) {
                                this.startWatch(rec, attempt + 1);
                            }
                        }, 500 * (attempt + 1));
                    }
                });
            }
            open(rec) {
                if (!this.active) {
                    return;
                }
                if (this.panel) {
                    this.panel.q(".search").focus();
                    return;
                }
                // 업로드·붙여넣기 완료 후 표시 수가 어긋나지 않도록 버튼 조작 시 다시 확인한다.
                g.clearTimeout(rec.readyTimer);
                this.client
                    .request("watch", { token: rec.token })
                    .then((c) => {
                    if (this.entries.get(rec.root) === rec) {
                        rec.label.textContent = countLabel(c);
                        rec.label.classList.toggle("warn", c.reached);
                        rec.label.removeAttribute("title");
                    }
                })
                    .catch(() => { });
                this.panel = new M.Panel({
                    document: this.doc,
                    client: this.client,
                    token: rec.token,
                    draft: sessionDrafts(g)?.get(rec.root),
                    onClose: () => {
                        this.panel = null;
                        if (effectGate.allows()) {
                            sessionDrafts(g)?.delete(rec.root);
                        }
                        if (rec.root.isConnected && effectGate.allows()) {
                            rec.button.focus();
                        }
                    },
                });
            }
            remove(root) {
                const rec = this.entries.get(root);
                if (!rec) {
                    return;
                }
                if (this.panel?.token === rec.token) {
                    this.panel.close(true);
                }
                g.clearTimeout(rec.readyTimer);
                rec.observer?.disconnect();
                this.client.request("unwatch", { token: rec.token }).catch(() => { });
                rec.uiCleanup?.();
                rec.host.remove();
                if (root.dataset.aruMetadataTarget === rec.token) {
                    delete root.dataset.aruMetadataTarget;
                }
                this.entries.delete(root);
            }
            disable() {
                this.observer?.disconnect();
                g.clearTimeout(this.timer);
                this.panel?.close(true);
                // oxlint-disable-next-line unicorn/no-useless-spread -- 정리·외부 콜백의 재진입이 순회 대상을 바꾸더라도 이번 작업의 대상은 보존한다.
                for (const root of [...this.entries.keys()]) {
                    this.remove(root);
                }
                this.doc.removeEventListener("aru-metadata-count-v1", this.countListener);
            }
            destroy() {
                this.disposed = true;
                this.active = false;
                ++this.generation;
                this.unsubscribe?.();
                this.disable();
                this.client.destroy();
            }
        }
        Object.assign(M, { Controller, countLabel });
        if (!g.__aruMetadataNoAutoStart &&
            g.document &&
            /^(bbs|m)\.ruliweb\.com$/.test(g.location.hostname) &&
            !g.__aruMetadataController) {
            g.__aruMetadataController = new Controller();
            g.__aruMetadataController.start();
            g.addEventListener("pagehide", () => g.__aruMetadataController?.destroy(), { once: true });
        }
    };
    initializeMetadataController(environment);
    return {
        metadata: selectModuleExports(metadata, [
            "Client",
            "Browser",
            "Panel",
            "Controller",
            "countLabel",
        ]),
    };
}
