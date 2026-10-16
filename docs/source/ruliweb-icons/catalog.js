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
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/ruliweb-icons/catalog.mjs
  function createIconsCatalog({ environment = globalThis, dependencies = {} } = {}) {
    const { AbortController, URL, performance } = environment;
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    const clearTimeout = typeof environment.clearTimeout === "function" ? (...args) => environment.clearTimeout(...args) : void 0;
    const requestAnimationFrame = typeof environment.requestAnimationFrame === "function" ? (...args) => environment.requestAnimationFrame(...args) : void 0;
    const cancelAnimationFrame = typeof environment.cancelAnimationFrame === "function" ? (...args) => environment.cancelAnimationFrame(...args) : void 0;
    let icons2 = createModuleScope(dependencies.icons, ["packRegistry", "SiteAdapter", "SearchIndex", "DesignSystem", "Catalog", "CatalogView", "MediaBudget", "CatalogSources"], ["Catalog", "CatalogView", "MediaBudget", "CatalogSources"]);
    const initializeIconsCatalog = /* @__PURE__ */ __name(function(global) {
      "use strict";
      const A = icons2 = icons2 || {}, MAX_ROWS = 16, ROW_HEIGHT = 76, MAX_INDEXED = 6;
      const error = /* @__PURE__ */ __name((code, message) => Object.assign(new Error(message), { code }), "error");
      function parseRef(value, boardId = "98") {
        const text = String(value || "").trim();
        let articleId = text, origin = "https://bbs.ruliweb.com";
        if (!/^[1-9]\d*$/.test(text)) {
          let url;
          try {
            url = new URL(text);
          } catch (_) {
            throw error("ARTICLE_URL_INVALID", "공개 게시글 URL 또는 게시판 번호와 글 번호를 입력해 주세요.");
          }
          const match = url.pathname.match(/^\/community\/board\/([1-9]\d*)\/read\/([1-9]\d*)\/?$/);
          if (url.protocol !== "https:" || !["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) || url.port || url.username || url.password || url.hash || !match)
            throw error("ARTICLE_PATH_NOT_ALLOWED", "현재 권한의 루리웹 community/board 공개 읽기 URL만 지원합니다. 다른 게시판 경로의 권한은 확대하지 않습니다.");
          boardId = match[1];
          articleId = match[2];
          origin = url.origin;
        }
        if (!/^[1-9]\d{0,11}$/.test(String(boardId)) || !Number.isSafeInteger(Number(articleId)) || Number(articleId) < 1 || String(articleId).length > 12)
          throw error("ARTICLE_ID_INVALID", "게시판 번호와 글 번호가 올바르지 않습니다.");
        boardId = String(boardId);
        articleId = Number(articleId);
        return { boardId, articleId, url: origin + "/community/board/" + boardId + "/read/" + articleId };
      }
      __name(parseRef, "parseRef");
      const refKey = /* @__PURE__ */ __name((ref) => String(ref.boardId) + ":" + ref.articleId, "refKey");
      function developerPacks(registry = A.packRegistry) {
        if (registry?.registryVersion !== 1 || !Array.isArray(registry.packs)) return [];
        const seen = /* @__PURE__ */ new Set(), list = [];
        for (const item of registry.packs.slice(0, 100)) try {
          if (item.enabled !== true) continue;
          const ref = parseRef(item.url);
          if (String(item.boardId) !== ref.boardId || Number(item.articleId) !== ref.articleId || seen.has(refKey(ref))) continue;
          seen.add(refKey(ref));
          list.push({
            ...ref,
            key: "developer:" + refKey(ref),
            source: "developer",
            title: String(item.name || "글 " + ref.articleId).slice(0, 160),
            thumbnail: A.SiteAdapter.safeMedia(item.thumbnail) ? item.thumbnail : null,
            expectedKind: ["NORMAL", "BUNDLE"].includes(item.expectedKind) ? item.expectedKind : null
          });
        } catch (_) {
        }
        return list;
      }
      __name(developerPacks, "developerPacks");
      function favorites(panel) {
        const seen = /* @__PURE__ */ new Set(), list = [];
        for (const node of panel?.querySelectorAll(".icon_data_show_target[onclick]") || []) {
          if (![...node.parentElement?.querySelectorAll("[onclick]") || []].some((n) => /^\s*(?:window\.)?app\.comment_icon_pick_remove\(/.test(n.getAttribute("onclick") || ""))) continue;
          const articleId = A.SiteAdapter.selectionId(node);
          if (!articleId || seen.has(articleId)) continue;
          seen.add(articleId);
          if (list.length >= 100) break;
          const ref = parseRef(String(articleId)), raw = node.querySelector("img")?.getAttribute("src");
          list.push({
            ...ref,
            key: "favorite:" + refKey(ref),
            source: "favorite",
            title: node.getAttribute("title")?.slice(0, 160) || "글 " + articleId,
            thumbnail: A.SiteAdapter.safeMedia(raw) ? raw : null,
            expectedKind: null
          });
        }
        return list;
      }
      __name(favorites, "favorites");
      class Catalog {
        static {
          __name(this, "Catalog");
        }
        constructor() {
          this.entries = [];
          this.indexed = /* @__PURE__ */ new Map();
          this.active = null;
          this.query = "";
          this.scope = "all";
        }
        setEntries(entries) {
          const seen = /* @__PURE__ */ new Set();
          this.entries = entries.filter((e) => {
            const key = refKey(e);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 200);
        }
        remember(ref, pack) {
          const key = refKey(ref), old = this.indexed.get(key);
          if (old?.pack === pack) return;
          this.indexed.delete(key);
          this.indexed.set(key, { pack, index: new A.SearchIndex(pack) });
          while (this.indexed.size > MAX_INDEXED) this.indexed.delete(this.indexed.keys().next().value);
        }
        search(query = this.query, scope = this.scope) {
          this.query = query;
          this.scope = scope;
          const terms = String(query).normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
          const scoped = this.entries.filter((e) => scope === "all" || e.source === scope), rows = [];
          let indexed = 0;
          for (const entry of scoped) {
            const record = this.indexed.get(refKey(entry));
            if (record) indexed++;
            const fields = [entry.title, entry.boardId, String(entry.articleId), record?.pack.name, record?.pack.title].filter(Boolean).map((s) => s.normalize("NFKC").toLocaleLowerCase());
            const remaining = terms.filter((t) => !fields.some((f) => f.includes(t)));
            const matches = record && remaining.length ? record.index.search({ query: remaining.join(" ") }).uniqueCount : record?.pack.icons.length;
            if (!remaining.length || matches > 0) rows.push({ ...entry, iconCount: record?.pack.icons.length ?? entry.knownIconCount, matches: terms.length ? matches : null, indexed: !!record });
          }
          return { rows, indexed, total: scoped.length, partial: indexed < scoped.length, unindexed: scoped.length - indexed };
        }
        destroy() {
          this.entries = [];
          this.indexed.clear();
        }
      }
      class MediaBudget {
        static {
          __name(this, "MediaBudget");
        }
        constructor(limit = 4) {
          this.limit = limit;
          this.queue = [];
          this.running = /* @__PURE__ */ new Set();
          this.jobs = /* @__PURE__ */ new Set();
          this.frame = 0;
          this.closed = false;
          this.started = 0;
          this.peak = 0;
        }
        add(node, url, onTimeout, canStart = () => true, completion = null) {
          if (this.closed) return;
          const job = { node, url, onTimeout, canStart, completion, finish: null };
          this.jobs.add(job);
          this.queue.push(job);
          if (!this.frame) this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.pump();
          });
        }
        pump() {
          if (this.closed) return;
          while (this.running.size < this.limit && this.queue.length) {
            const next = this.queue.findIndex((j) => !j.node.isConnected || j.canStart());
            if (next < 0) break;
            const job = this.queue.splice(next, 1)[0];
            if (!job.node.isConnected) {
              this.jobs.delete(job);
              continue;
            }
            this.running.add(job);
            this.peak = Math.max(this.peak, this.running.size);
            this.started++;
            const doneEvents = job.completion ? [...job.completion.events, "error"] : job.node.tagName === "VIDEO" ? ["loadedmetadata", "error"] : ["load", "error"];
            const completed = /* @__PURE__ */ __name((event) => {
              if (event.type === "error" || !job.completion || job.completion.isReady()) finish();
            }, "completed");
            let timer;
            const finish = /* @__PURE__ */ __name(() => {
              if (!this.running.delete(job)) return;
              clearTimeout(timer);
              for (const type of doneEvents) job.node.removeEventListener(type, completed);
              this.jobs.delete(job);
              this.pump();
            }, "finish");
            job.finish = finish;
            for (const type of doneEvents) job.node.addEventListener(type, completed);
            timer = setTimeout(() => {
              job.node.removeAttribute("src");
              try {
                if (job.node.isConnected && !this.closed) job.onTimeout?.();
              } finally {
                finish();
              }
            }, 1e4);
            job.node.src = job.url;
          }
        }
        prune() {
          this.queue = this.queue.filter((j) => j.node.isConnected);
          for (const j of [...this.jobs]) if (!j.node.isConnected) {
            j.node.removeAttribute("src");
            this.jobs.delete(j);
            j.finish?.();
          }
          this.pump();
        }
        reset() {
          if (this.frame) cancelAnimationFrame(this.frame);
          this.frame = 0;
          this.queue = [];
          for (const j of [...this.jobs]) {
            j.node.removeAttribute("src");
            j.finish?.();
          }
          this.jobs.clear();
          this.running.clear();
        }
        destroy() {
          this.closed = true;
          this.reset();
        }
        snapshot() {
          return { active: this.running.size, queued: this.queue.length, peak: this.peak, started: this.started, limit: this.limit };
        }
      }
      class CatalogView {
        static {
          __name(this, "CatalogView");
        }
        constructor({ container, onChoose, onDirect, onCancel }) {
          this.catalog = new Catalog();
          this.onChoose = onChoose;
          this.onDirect = onDirect;
          this.events = new AbortController();
          this.media = new MediaBudget(4);
          this.frame = 0;
          this.closed = false;
          this.busy = false;
          this.operation = 0;
          this.failures = /* @__PURE__ */ new Map();
          const doc = container.ownerDocument, el = /* @__PURE__ */ __name((tag, text) => {
            const n = doc.createElement(tag);
            if (text) n.textContent = text;
            return n;
          }, "el");
          this.el = el;
          this.node = el("section");
          this.node.className = "catalog";
          this.node.tabIndex = -1;
          this.node.setAttribute("role", "dialog");
          this.node.setAttribute("aria-modal", "true");
          this.node.setAttribute("aria-label", "아이콘 리스트");
          const heading = el("h2", "아이콘 리스트"), cancel = el("button", "목록 닫기");
          cancel.type = "button";
          cancel.className = "quiet";
          cancel.id = "catalog-cancel";
          const head = el("div");
          head.className = "catalog-heading";
          head.append(heading, cancel);
          const controls = el("div");
          controls.className = "catalog-controls";
          this.scope = el("select");
          this.scope.setAttribute("aria-label", "팩 검색 범위");
          for (const [value, label] of [["all", "전체"], ["developer", "기본 제공 팩"], ["favorite", "즐겨찾기"], ["direct", "직접 등록"]]) {
            const o = el("option", label);
            o.value = value;
            this.scope.append(o);
          }
          this.input = el("input");
          this.input.type = "search";
          this.input.placeholder = "팩 이름·글 번호 검색";
          this.input.setAttribute("aria-label", "팩 목록 검색");
          controls.append(this.scope, this.input);
          this.notice = el("p");
          this.notice.className = "help";
          this.notice.setAttribute("role", "status");
          this.nativeStatus = el("p");
          this.nativeStatus.className = "help";
          this.loadStatus = el("p");
          this.loadStatus.className = "catalog-load-status";
          this.loadStatus.tabIndex = -1;
          this.loadStatus.setAttribute("role", "status");
          this.loadStatus.setAttribute("aria-live", "polite");
          this.loadStatus.textContent = "사용할 팩을 선택하세요.";
          this.loadingArt = el("img");
          this.loadingArt.className = "catalog-loading-art";
          this.loadingArt.alt = "";
          this.loadingArt.setAttribute("aria-hidden", "true");
          this.loadingArt.hidden = true;
          const artURL = A.DesignSystem?.assetURL?.("assets/icons/aru-main-64.png");
          if (artURL) this.loadingArt.src = artURL;
          this.loadingArt.addEventListener("error", () => {
            this.artFailed = true;
            this.loadingArt.hidden = true;
          }, { once: true });
          this.artAvailable = !!artURL;
          this.progress = el("progress");
          this.progress.className = "catalog-progress";
          this.progress.setAttribute("aria-label", "아이콘 정보 처리량");
          this.progress.hidden = true;
          this.retry = el("button", "다시 시도");
          this.retry.type = "button";
          this.retry.hidden = true;
          this.retry.id = "catalog-retry";
          this.viewport = el("div");
          this.viewport.className = "catalog-viewport";
          this.viewport.tabIndex = 0;
          this.viewport.setAttribute("aria-label", "팩 목록 스크롤");
          this.content = el("div");
          this.content.className = "catalog-content";
          this.viewport.append(this.content);
          const direct = el("form");
          direct.className = "catalog-direct";
          this.url = el("input");
          this.url.setAttribute("aria-label", "공개 게시글 URL 또는 번호");
          this.url.placeholder = "공개 게시글 URL 또는 글 번호";
          this.board = el("input");
          this.board.value = "98";
          this.board.inputMode = "numeric";
          this.board.setAttribute("aria-label", "직접 조회 게시판 번호");
          this.board.style.cssText = "width:85px;min-width:70px;flex:0 0 85px";
          this.submit = el("button", "직접 조회");
          this.submit.type = "submit";
          direct.append(this.url, this.board, this.submit);
          this.cancel = cancel;
          this.node.append(head, controls, this.notice, this.nativeStatus, this.loadingArt, this.loadStatus, this.progress, this.retry, this.viewport, direct);
          container.append(this.node);
          const listen = /* @__PURE__ */ __name((n, t, fn) => n.addEventListener(t, fn, { signal: this.events.signal }), "listen");
          listen(cancel, "click", () => onCancel?.());
          listen(this.input, "input", () => this.render());
          listen(this.scope, "change", () => this.render());
          listen(this.viewport, "scroll", () => {
            if (!this.frame) this.frame = requestAnimationFrame(() => {
              this.frame = 0;
              this.renderRows();
            });
          });
          listen(direct, "submit", (e) => {
            e.preventDefault();
            this.run(() => this.onDirect?.(this.url.value, this.board.value));
          });
          listen(this.retry, "click", () => {
            if (this.lastRequest) this.run(this.lastRequest, this.lastRef);
          });
          this.render();
        }
        async run(request, ref = null) {
          if (this.busy || this.closed) return;
          const token = ++this.operation;
          this.lastRequest = request;
          this.lastRef = ref;
          this.errorCode = null;
          this.busy = true;
          this.pending = ref ? refKey(ref) : null;
          this.retry.hidden = true;
          this.loadStatus.textContent = "아이콘팩을 불러오는 중…";
          this.node.setAttribute("aria-busy", "true");
          this.submit.disabled = true;
          this.renderRows();
          this.loadStatus.focus({ preventScroll: true });
          try {
            const result2 = await request();
            if (this.closed || token !== this.operation) return;
            if (result2?.cancelled) return;
            if (result2?.ok !== true) throw Object.assign(new Error(result2?.error?.message || "아이콘팩을 불러오지 못했습니다."), { code: result2?.error?.code || "READ_FAILED" });
            if (ref) this.failures.delete(refKey(ref));
            this.loadStatus.textContent = "아이콘팩을 불러왔어요.";
          } catch (err) {
            if (this.closed || token !== this.operation) return;
            const code = err.code || "READ_FAILED";
            this.errorCode = code;
            this.loadStatus.textContent = (code === "ACCESS_DENIED" ? "접근할 수 없는 게시글이에요. " : code === "ARTICLE_URL_INVALID" || code === "ARTICLE_PATH_NOT_ALLOWED" ? "게시글 주소를 확인해 주세요. " : "팩을 불러오지 못했어요. ") + err.message + " 다른 팩을 선택하거나 다시 시도해 주세요.";
            this.retry.hidden = false;
            this.retry.focus({ preventScroll: true });
            if (ref) this.failures.set(refKey(ref), code);
          } finally {
            if (!this.closed && token === this.operation) {
              this.busy = false;
              this.pending = null;
              this.setProgress({ busy: false });
              this.node.setAttribute("aria-busy", "false");
              this.submit.disabled = false;
              this.renderRows();
            }
          }
        }
        setProgress(info = {}) {
          if (this.closed) return;
          const busy = info.busy === void 0 ? info.status === "loading" : !!info.busy;
          this.progress.hidden = !busy;
          this.loadingArt.hidden = !busy || !this.artAvailable || this.artFailed;
          this.cancel.textContent = busy && !["cache", "storage"].includes(info.phase) ? "중지하고 목록 닫기" : "목록 닫기";
          this.cancel.title = ["cache", "storage"].includes(info.phase) ? "이미 시작한 캐시 작업은 마무리되며 목록에는 반영하지 않습니다." : "목록을 닫고 진행 중인 원본 수집을 중지합니다.";
          if (busy && info.message) {
            const n = Number.isFinite(info.processed) ? info.processed : null, total = Number.isFinite(info.total) && info.total > 0 ? info.total : null;
            this.loadStatus.textContent = info.message + (n === null ? "" : " · " + n.toLocaleString("ko-KR") + (total === null ? "개 처리" : " / " + total.toLocaleString("ko-KR") + "개 처리"));
            if (n !== null && total !== null) {
              this.progress.max = total;
              this.progress.value = Math.min(total, Math.max(0, n));
            } else {
              this.progress.removeAttribute("value");
              this.progress.removeAttribute("max");
            }
          }
        }
        cancelPending() {
          this.operation++;
          this.busy = false;
          this.pending = null;
          this.setProgress({ busy: false });
          this.node.setAttribute("aria-busy", "false");
          this.submit.disabled = false;
          this.renderRows();
        }
        setEntries(entries, message = "", packs = null) {
          this.catalog.setEntries(entries.map((ref) => ({ ...ref, knownIconCount: packs?.get(refKey(ref))?.pack?.icons.length ?? ref.knownIconCount })));
          const cached = this.catalog.entries.filter((ref) => packs?.has(refKey(ref))), indexed = cached.slice(-MAX_INDEXED);
          const active = cached.find((ref) => refKey(ref) === this.catalog.active);
          if (active && !indexed.includes(active)) {
            indexed.shift();
            indexed.push(active);
          }
          for (const ref of indexed) this.catalog.remember(ref, packs.get(refKey(ref)).pack);
          this.nativeStatus.textContent = message;
          this.render();
        }
        setPack(ref, pack) {
          this.catalog.active = refKey(ref);
          this.catalog.remember(ref, pack);
          this.render();
        }
        collapse() {
          this.render();
        }
        render() {
          if (this.closed) return;
          const started = performance.now();
          this.result = this.catalog.search(this.input.value, this.scope.value);
          this.notice.textContent = "팩 " + this.result.rows.length + "/" + this.result.total + "개 · " + (this.result.partial ? "선택한 팩만 불러옵니다." : "아이콘 수를 확인했습니다.");
          this.renderRows();
          this.lastSearchMs = performance.now() - started;
        }
        renderRows() {
          if (this.closed) return;
          this.media.reset();
          this.content.replaceChildren();
          const rows = this.result?.rows || [];
          this.content.style.height = rows.length * ROW_HEIGHT + "px";
          const start = Math.max(0, Math.floor(this.viewport.scrollTop / ROW_HEIGHT) - 2), end = Math.min(rows.length, start + MAX_ROWS);
          let moving = 0;
          for (let i = start; i < end; i++) {
            const entry = rows[i], key = refKey(entry), selected = this.catalog.active === key, row = this.el("button");
            row.type = "button";
            row.className = "catalog-row";
            row.style.top = i * ROW_HEIGHT + "px";
            row.dataset.catalogKey = entry.key;
            row.dataset.articleId = entry.articleId;
            row.disabled = this.busy;
            row.setAttribute("aria-current", String(selected));
            row.setAttribute("aria-expanded", String(selected));
            row.setAttribute("aria-label", entry.title + " · " + (entry.iconCount === void 0 ? "아이콘 수 미확인" : entry.iconCount + "개") + (selected ? " · 현재 팩" : ""));
            const animated = /\.(?:gif|webp)(?:[?#]|$)/i.test(entry.thumbnail || "");
            const show = entry.thumbnail && !/\.(?:mp4|webm)(?:[?#]|$)/i.test(entry.thumbnail) && (!animated || moving++ < 4);
            const thumbnail = this.el(show ? "img" : "span", show ? "" : "팩");
            thumbnail.className = "catalog-thumbnail";
            if (show) {
              thumbnail.alt = "";
              thumbnail.loading = "lazy";
              thumbnail.decoding = "async";
              if (animated) thumbnail.dataset.animatedCatalogThumb = "true";
              thumbnail.addEventListener("error", () => {
                const placeholder = this.el("span", "팩");
                placeholder.className = "catalog-thumbnail";
                thumbnail.replaceWith(placeholder);
              }, { once: true });
              this.media.add(thumbnail, entry.thumbnail);
            }
            const detail = this.el("span");
            detail.className = "catalog-detail";
            detail.append(this.el("strong", entry.title), this.el("small", (entry.source === "developer" ? "기본 제공 팩" : entry.source === "favorite" ? "즐겨찾기" : "직접 등록") + " · " + entry.boardId + "/" + entry.articleId + " · " + (entry.iconCount === void 0 ? "아이콘 수 미확인" : entry.iconCount + "개")));
            const status = this.pending === key ? "로딩 중" : this.failures.has(key) ? this.failures.get(key) === "ACCESS_DENIED" ? "접근 불가" : "조회 실패" : selected ? "현재 팩" : "선택";
            row.append(thumbnail, detail, this.el("span", status));
            row.addEventListener("click", () => this.run(() => this.onChoose?.(entry), entry));
            row.addEventListener("keydown", (e) => {
              let next;
              if (e.key === "ArrowDown") next = Math.min(rows.length - 1, i + 1);
              else if (e.key === "ArrowUp") next = Math.max(0, i - 1);
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = rows.length - 1;
              else return;
              e.preventDefault();
              this.viewport.scrollTop = next * ROW_HEIGHT;
              this.renderRows();
              this.content.querySelector('[data-catalog-key="' + rows[next].key + '"]')?.focus();
            });
            this.content.append(row);
          }
        }
        snapshot() {
          return { entries: this.catalog.entries.length, rows: this.content.children.length, indexed: this.catalog.indexed.size, active: this.catalog.active, partial: this.result.partial, busy: this.busy, pending: this.pending, errorCode: this.errorCode || null, lastSearchMs: this.lastSearchMs || 0, media: this.media.snapshot() };
        }
        destroy() {
          this.closed = true;
          this.operation++;
          this.events.abort();
          if (this.frame) cancelAnimationFrame(this.frame);
          this.frame = 0;
          this.media.destroy();
          this.catalog.destroy();
          this.node.remove();
        }
      }
      A.Catalog = Catalog;
      A.CatalogView = CatalogView;
      A.MediaBudget = MediaBudget;
      A.CatalogSources = Object.freeze({ parseRef, refKey, developerPacks, favorites });
    }, "initializeIconsCatalog");
    initializeIconsCatalog(environment);
    return { "icons": selectModuleExports(icons2, ["Catalog", "CatalogView", "MediaBudget", "CatalogSources"]) };
  }
  __name(createIconsCatalog, "createIconsCatalog");

  // docs/source/compat/ruliweb-icons-catalog.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var result = createIconsCatalog({ environment: globalThis, dependencies: { icons: { "packRegistry": /* @__PURE__ */ __name(() => icons["packRegistry"], "packRegistry"), "SiteAdapter": /* @__PURE__ */ __name(() => icons["SiteAdapter"], "SiteAdapter"), "SearchIndex": /* @__PURE__ */ __name(() => icons["SearchIndex"], "SearchIndex"), "DesignSystem": /* @__PURE__ */ __name(() => icons["DesignSystem"], "DesignSystem"), "Catalog": /* @__PURE__ */ __name(() => icons["Catalog"], "Catalog"), "CatalogView": /* @__PURE__ */ __name(() => icons["CatalogView"], "CatalogView"), "MediaBudget": /* @__PURE__ */ __name(() => icons["MediaBudget"], "MediaBudget"), "CatalogSources": /* @__PURE__ */ __name(() => icons["CatalogSources"], "CatalogSources") } } });
  Object.assign(icons, result.icons);
})();
