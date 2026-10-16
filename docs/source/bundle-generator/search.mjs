// 자동 생성: src/bundle-generator/search.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 게시판 검색과 다중 선택 순서를 관리하고 중복 요청·취소 계약을 유지한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createBundleSearch({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { TextEncoder, TextDecoder, URL } = environment;
    const fetch = typeof environment.fetch === "function"
        ? (...args) => environment.fetch(...args)
        : undefined;
    let bundle = createModuleScope(dependencies.bundle, ["fail", "articleUrl", "clone"], [
        "searchUrl",
        "parseSearch",
        "readSearchHTML",
        "BoardSearch",
        "SearchSelection",
    ]);
    let icons = createModuleScope(dependencies.icons, ["Metadata"], []);
    /* Native board_list.js title-search parameters; HTML only, same-origin. */
    const initializeBoardSearch = function (g) {
        "use strict";
        const B = bundle;
        const normalized = (q) => {
            if (typeof q !== "string" || /[\u0000-\u001f\u007f]/u.test(q)) {
                B.fail("SEARCH_INVALID", "검색어를 확인해 주세요.");
            }
            q = q.normalize("NFC").trim();
            if (!q || [...q].length > 120) {
                B.fail("SEARCH_INVALID", "제목 검색어는 1~120자로 입력해 주세요.");
            }
            return q;
        };
        function searchUrl(query, page = 1, origin = g.location.origin) {
            if (!["https://bbs.ruliweb.com", "https://m.ruliweb.com"].includes(origin)) {
                B.fail("SEARCH_ORIGIN", "루리웹 페이지에서 검색해 주세요.");
            }
            if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
                B.fail("SEARCH_PAGE", "검색 페이지가 올바르지 않습니다.");
            }
            const u = new URL("/community/board/98", origin);
            u.searchParams.set("search_type", "subject");
            u.searchParams.set("search_key", normalized(query));
            u.searchParams.set("view", "thumbnail");
            u.searchParams.set("page", String(page));
            return u.href;
        }
        function contract(doc, origin) {
            const root = doc.querySelector("#board_list"), search = root?.querySelector('[name="board_search"],.search_wrapper');
            const board = root?.querySelector('input[name="board_id"]')?.value, boardUrl = root?.querySelector('input[name="board_url"]')?.value;
            let u;
            try {
                u = new URL(boardUrl, origin);
            }
            catch (_) { }
            if (board !== "98" ||
                u?.origin !== origin ||
                !/^\/community\/board\/98\/?$/.test(u.pathname) ||
                !search?.querySelector('select[name="search_type"] option[value="subject"]') ||
                !search.querySelector('input[name="search_key"]')) {
                B.fail("SEARCH_UNAVAILABLE", "98번 게시판의 제목 검색 화면을 확인하지 못했습니다. 로그인·접근 권한과 기본 게시판 검색을 확인해 주세요.");
            }
            return root;
        }
        function thumbs(row, origin) {
            const raw = [], img = row.querySelector(".thumbnail img,img.thumbnail,.thumbnail_wrapper img");
            if (img) {
                raw.push(img.getAttribute("data-src"), img.getAttribute("src"));
            }
            for (const n of row.querySelectorAll(".thumbnail[style]")) {
                for (const m of n.style.backgroundImage.matchAll(/url\(["']?([^"'()\s]+)["']?\)/gu)) {
                    raw.push(m[1]);
                }
            }
            const safe = [];
            for (const s of raw.filter(Boolean)) {
                try {
                    const u = new URL(s, origin);
                    icons.Metadata.mediaUrl(u.href);
                    if (!/\.(mp4|webm|m3u8|mpd)(?:$|\?)/i.test(u.href) &&
                        !safe.includes(u.href)) {
                        safe.push(u.href);
                    }
                }
                catch (_) { }
            }
            return safe.sort((a, b) => Number(/\.webp(?:$|\?)/i.test(b)) - Number(/\.webp(?:$|\?)/i.test(a)));
        }
        function parseSearch(doc, { query, page, origin }) {
            const root = contract(doc, origin), input = root.querySelector('[name="search_key"]'), type = root.querySelector('[name="search_type"]');
            if (normalized(input.value) !== normalized(query) ||
                type.value !== "subject") {
                B.fail("SEARCH_MISMATCH", "서버 응답의 검색 조건이 요청과 다릅니다. 기본 검색 화면을 확인해 주세요.");
            }
            const table = root.querySelector(".board_list_table"), cards = [...root.querySelectorAll(".flex_item.article_wrapper")];
            if (!table && !cards.length) {
                B.fail("SEARCH_LAYOUT", "게시판 목록 구조가 변경되었습니다. URL 직접 추가를 사용해 주세요.");
            }
            const items = [], seen = new Set();
            const rows = [
                ...(table?.querySelectorAll("tr.table_body") || []),
                ...cards,
            ];
            for (const row of rows) {
                if (row.matches(".notice,.other,.list_inner")) {
                    continue;
                }
                const a = row.querySelector("a.subject_link[href]");
                if (!a) {
                    continue;
                }
                let ref;
                try {
                    ref = B.articleUrl(new URL(a.getAttribute("href"), origin).href);
                }
                catch (_) {
                    continue;
                }
                if (seen.has(ref.articleId)) {
                    continue;
                }
                seen.add(ref.articleId);
                const title = a.cloneNode(true);
                for (const n of title.querySelectorAll(".num_reply")) {
                    n.remove();
                }
                const text = (a.getAttribute("title") || title.textContent).trim();
                if (!text) {
                    continue;
                }
                if (items.length >= 100) {
                    B.fail("SEARCH_LIMIT", "한 페이지의 검색 항목이 안전한 표시 상한을 넘었습니다.");
                }
                const thumbnails = thumbs(row, origin);
                items.push({
                    ...ref,
                    title: text.slice(0, 240),
                    thumbnail: thumbnails[0] || null,
                    thumbnails,
                    page,
                    index: items.length,
                });
            }
            const active = root
                .querySelector(".paging_wrapper .active")
                ?.textContent.trim();
            if (active && /^\d+$/.test(active) && Number(active) !== page) {
                B.fail("SEARCH_PAGE", "요청한 검색 페이지와 응답이 다릅니다.");
            }
            const pages = [];
            for (const a of root.querySelectorAll(".paging_wrapper a[href]")) {
                try {
                    const u = new URL(a.getAttribute("href"), origin), n = Number(u.searchParams.get("page") || 1);
                    if (u.origin === origin &&
                        /^\/community\/board\/98\/?$/.test(u.pathname) &&
                        u.searchParams.get("search_type") === "subject" &&
                        u.searchParams.get("search_key") === normalized(query) &&
                        Number.isSafeInteger(n) &&
                        n >= 1 &&
                        n <= 10000) {
                        pages.push(n);
                    }
                }
                catch (_) { }
            }
            return {
                query: normalized(query),
                page,
                items,
                hasPrevious: page > 1,
                hasNext: items.length > 0 && pages.some((n) => n > page),
                url: searchUrl(query, page, origin),
            };
        }
        async function readSearchHTML(url, { signal, fetchFn = g.fetch, timeoutMs = 10000, } = {}) {
            const controller = new g.AbortController(), abort = () => controller.abort();
            signal?.addEventListener("abort", abort, { once: true });
            if (signal?.aborted) {
                abort();
            }
            const timer = g.setTimeout(abort, timeoutMs);
            try {
                const response = await fetchFn(url, {
                    method: "GET",
                    mode: "same-origin",
                    credentials: "same-origin",
                    redirect: "error",
                    cache: "no-cache",
                    signal: controller.signal,
                });
                if (response.redirected || (response.url && response.url !== url)) {
                    B.fail("SEARCH_REDIRECT", "검색 페이지가 다른 주소로 이동하여 중단했습니다.");
                }
                if (!response.ok) {
                    B.fail([401, 403, 429].includes(response.status)
                        ? "ACCESS_DENIED"
                        : "SEARCH_FAILED", "게시판 검색 실패 (HTTP " +
                        response.status +
                        "). 기본 검색을 확인해 주세요.");
                }
                const limit = 3 * 1024 * 1024;
                if (Number(response.headers?.get("content-length")) > limit) {
                    B.fail("RESOURCE_LIMIT", "검색 HTML 응답이 3MB를 넘었습니다.");
                }
                let html = "";
                if (response.body?.getReader) {
                    const r = response.body.getReader(), decoder = new TextDecoder();
                    let bytes = 0;
                    try {
                        while (true) {
                            const x = await r.read();
                            if (x.done) {
                                break;
                            }
                            bytes += x.value.byteLength;
                            if (bytes > limit) {
                                await r.cancel();
                                B.fail("RESOURCE_LIMIT", "검색 HTML 응답이 3MB를 넘었습니다.");
                            }
                            html += decoder.decode(x.value, { stream: true });
                        }
                        html += decoder.decode();
                    }
                    finally {
                        r.releaseLock();
                    }
                }
                else {
                    html = await response.text();
                    if (new TextEncoder().encode(html).length > limit) {
                        B.fail("RESOURCE_LIMIT", "검색 HTML 응답이 3MB를 넘었습니다.");
                    }
                }
                if (controller.signal.aborted) {
                    B.fail("ABORTED", "검색을 취소했습니다.");
                }
                const t = g.document.createElement("template");
                t.innerHTML = html;
                return t.content;
            }
            catch (e) {
                if (controller.signal.aborted) {
                    B.fail(signal?.aborted ? "ABORTED" : "TIMEOUT", signal?.aborted
                        ? "검색을 취소했습니다."
                        : "검색 시간이 초과되었습니다.");
                }
                throw e;
            }
            finally {
                g.clearTimeout(timer);
                signal?.removeEventListener("abort", abort);
            }
        }
        class BoardSearch {
            constructor({ origin = g.location.origin, readHTML = readSearchHTML, ttl = 60000, now = () => Date.now(), } = {}) {
                Object.assign(this, {
                    origin,
                    readHTML,
                    ttl,
                    now,
                    cache: new Map(),
                    pending: new Map(),
                    stopped: false,
                });
            }
            search(query, page = 1, { force = false } = {}) {
                if (this.stopped) {
                    return Promise.reject(Object.assign(new Error("생성기를 다시 열어 주세요."), {
                        code: "ABORTED",
                    }));
                }
                const url = searchUrl(query, page, this.origin), hit = this.cache.get(url);
                if (!force && hit && this.now() - hit.time < this.ttl) {
                    return Promise.resolve(B.clone(hit.result));
                }
                if (this.pending.has(url)) {
                    return this.pending.get(url).promise;
                }
                if (this.pending.size) {
                    B.fail("SEARCH_BUSY", "진행 중인 검색을 취소한 뒤 다시 검색해 주세요.");
                }
                const controller = new g.AbortController();
                const readSearchPage = async () => {
                    const doc = await this.readHTML(url, { signal: controller.signal });
                    if (controller.signal.aborted) {
                        B.fail("ABORTED", "검색을 취소했습니다.");
                    }
                    const result = parseSearch(doc, { query, page, origin: this.origin });
                    if (this.cache.size >= 20) {
                        this.cache.delete(this.cache.keys().next().value);
                    }
                    this.cache.set(url, { time: this.now(), result });
                    return B.clone(result);
                };
                const promise = readSearchPage().finally(() => this.pending.delete(url));
                this.pending.set(url, { promise, controller });
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
                this.cache.clear();
            }
        }
        class SearchSelection {
            constructor() {
                this.query = null;
                this.items = [];
                this.selected = new Map();
                this.anchor = null;
            }
            set(result) {
                if (result.query !== this.query) {
                    this.selected.clear();
                    this.query = result.query;
                }
                this.items = result.items;
                this.anchor = null;
            }
            click(index, { shiftKey = false, ctrlKey = false, metaKey = false, checkbox = false, } = {}) {
                const item = this.items[index];
                if (!item) {
                    return;
                }
                if (shiftKey && this.anchor !== null) {
                    if (!ctrlKey && !metaKey && !checkbox) {
                        this.selected.clear();
                    }
                    for (let i = Math.min(index, this.anchor); i <= Math.max(index, this.anchor); i++) {
                        this.selected.set(this.items[i].articleId, this.items[i]);
                    }
                }
                else {
                    if (!ctrlKey && !metaKey && !checkbox) {
                        this.selected.clear();
                    }
                    if ((ctrlKey || metaKey || checkbox) &&
                        this.selected.has(item.articleId)) {
                        this.selected.delete(item.articleId);
                    }
                    else {
                        this.selected.set(item.articleId, item);
                    }
                    this.anchor = index;
                }
            }
            all() {
                for (const item of this.items) {
                    this.selected.set(item.articleId, item);
                }
            }
            clear() {
                this.selected.clear();
                this.anchor = null;
            }
            ordered() {
                return [...this.selected.values()].sort((a, b) => a.page - b.page || a.index - b.index);
            }
        }
        Object.assign(B, {
            searchUrl,
            parseSearch,
            readSearchHTML,
            BoardSearch,
            SearchSelection,
        });
    };
    initializeBoardSearch(environment);
    return {
        bundle: selectModuleExports(bundle, [
            "searchUrl",
            "parseSearch",
            "readSearchHTML",
            "BoardSearch",
            "SearchSelection",
        ]),
    };
}
