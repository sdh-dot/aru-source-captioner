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

  // docs/source/bundle-generator/search-ui.mjs
  function createBundleSearchUi({ environment = globalThis, dependencies = {} } = {}) {
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    let bundle2 = createModuleScope(dependencies.bundle, ["BoardSearch", "SearchSelection", "fail"], ["SearchPanel"]);
    const initializeBundleSearchUi = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle2;
      class SearchPanel {
        static {
          __name(this, "SearchPanel");
        }
        constructor(panel, searcher = new B.BoardSearch()) {
          Object.assign(this, { panel, searcher, selection: new B.SearchSelection(), busy: false, result: null, batchStop: false });
          const d = panel.doc;
          this.node = d.createElement("section");
          this.node.className = "article-search";
          this.node.setAttribute("aria-label", "게시글 제목 검색");
          this.node.innerHTML = `<style>.article-search{border:1px solid #ded2ed;border-radius:9px;padding:12px;margin:16px 0}.article-search h3{margin:0 0 10px}.search-toolbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0}.search-toolbar input{flex:1;min-width:140px}.search-results{list-style:none;padding:0;max-height:340px;overflow:auto}.search-row{display:flex;gap:10px;align-items:center;border:1px solid #e8dfef;padding:8px;margin:5px 0;border-radius:6px;cursor:pointer}.search-row.selected{background:#eee5fb;border-color:#9a73d0}.search-row:focus-visible{outline:3px solid #b58ee6}.search-row input{width:18px;flex:none}.search-row .thumbnail{width:64px;height:64px;flex:none;display:grid;place-items:center;background:#f5f0fa;border-radius:6px;overflow:hidden}.search-row img{width:64px;height:64px;object-fit:contain}.search-row strong{display:block;overflow-wrap:anywhere}.batch-report{max-height:180px;overflow:auto}.apply-reason{flex-basis:100%;margin:0;color:#76508e}</style><h3>게시글 제목 검색</h3><p class="hint">아이콘 게시판에서 제목으로 찾습니다. Ctrl로 추가 선택 · Shift로 범위 선택. 검색 결과 순서대로 추가됩니다.</p><div class="search-toolbar"><input class="query" aria-label="게시글 제목 검색어" maxlength="240" placeholder="게시글 제목 검색"><button type="button" class="search-run">검색</button><button type="button" class="search-cancel" disabled>취소</button></div><div class="search-status hint" role="status" aria-live="polite">제목을 입력하고 검색하세요.</div><ul class="search-results" aria-label="게시글 검색 결과"></ul><div class="search-toolbar"><button type="button" class="search-prev" disabled>이전 페이지</button><span class="search-page hint"></span><button type="button" class="search-next" disabled>다음 페이지</button></div><div class="search-toolbar"><button type="button" class="select-all" disabled>결과 전체 선택</button><button type="button" class="select-clear" disabled>선택 해제</button><span class="selection-count hint">0개 선택</span><button type="button" class="batch-add" disabled>선택한 글 추가</button></div><ol class="batch-report" hidden></ol>`;
          panel.q(".status").before(this.node);
          this.q = (s) => this.node.querySelector(s);
          this.q(".search-run").onclick = () => this.search(1);
          this.q(".query").onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.search(1);
            }
          };
          this.q(".search-cancel").onclick = () => {
            this.batchStop = true;
            this.searcher.cancel();
            panel.reader.cancel();
          };
          this.q(".search-prev").onclick = () => this.search(this.result.page - 1, true);
          this.q(".search-next").onclick = () => this.search(this.result.page + 1, true);
          this.q(".select-all").onclick = () => {
            this.selection.all();
            this.paintSelection();
          };
          this.q(".select-clear").onclick = () => {
            this.selection.clear();
            this.paintSelection();
          };
          this.q(".batch-add").onclick = () => this.batch();
          this.controls();
        }
        message(text, error = false) {
          if (this.panel.closed) return;
          this.q(".search-status").textContent = text;
          this.q(".search-status").classList.toggle("error", error);
        }
        controls() {
          if (this.panel.closed) return;
          const blocked = !this.panel.ready || this.busy || this.panel.busy;
          for (const s of [".query", ".search-run", ".select-all", ".select-clear", ".batch-add", ".search-prev", ".search-next"]) this.q(s).disabled = blocked;
          this.q(".search-cancel").disabled = !this.busy;
          this.q(".select-all").disabled = blocked || !this.selection.items.length;
          this.q(".select-clear").disabled = blocked || !this.selection.selected.size;
          this.q(".batch-add").disabled = blocked || !this.selection.selected.size;
          this.q(".search-prev").disabled = blocked || !this.result?.hasPrevious;
          this.q(".search-next").disabled = blocked || !this.result?.hasNext;
          for (const n of this.node.querySelectorAll(".search-row input")) n.disabled = blocked;
        }
        async search(page = 1, paging = false) {
          if (this.busy || this.panel.busy || !this.panel.ready) return;
          this.busy = true;
          this.message("게시판 제목 검색 중…");
          this.controls();
          try {
            const query = paging ? this.result.query : this.q(".query").value;
            const result2 = await this.searcher.search(query, page);
            if (this.panel.closed) return;
            this.result = result2;
            this.selection.set(result2);
            this.render();
            this.message(result2.items.length ? result2.items.length + "개 결과 · " + result2.page + "쪽 " : "검색 결과가 없습니다.");
          } catch (e) {
            this.message("[" + (e.code || "SEARCH_FAILED") + "] " + e.message, true);
          } finally {
            this.busy = false;
            this.controls();
          }
        }
        render() {
          if (this.panel.closed) return;
          const p = this.panel, d = p.doc, list = this.q(".search-results");
          list.replaceChildren();
          for (const [i, item] of this.selection.items.entries()) {
            const row = d.createElement("li");
            row.className = "search-row";
            row.dataset.articleId = item.articleId;
            row.tabIndex = 0;
            const selected = this.selection.selected.has(item.articleId);
            row.classList.toggle("selected", selected);
            const check = d.createElement("input");
            check.type = "checkbox";
            check.checked = selected;
            check.setAttribute("aria-label", item.title + " 선택");
            const thumbnail = d.createElement("span");
            thumbnail.className = "thumbnail";
            thumbnail.textContent = "팩";
            if (item.thumbnail) {
              const img = d.createElement("img");
              img.alt = "";
              img.setAttribute("loading", "lazy");
              img.setAttribute("decoding", "async");
              img.referrerPolicy = "no-referrer";
              let attempt = 0;
              img.src = item.thumbnail;
              thumbnail.replaceChildren(img);
              img.onerror = () => {
                const next = item.thumbnails?.[++attempt];
                if (next) img.src = next;
                else {
                  thumbnail.textContent = "팩";
                  thumbnail.title = "대표 썸네일 로딩 실패";
                }
              };
            }
            const body = d.createElement("span"), title = d.createElement("strong"), info = d.createElement("small");
            title.textContent = item.title;
            info.textContent = "98/" + item.articleId + " · 개수는 추가 시 확인" + (p.draft.rows.some((r) => r.slave.articleId === item.articleId) ? " · 이미 등록됨" : "");
            body.append(title, info);
            row.append(check, thumbnail, body);
            row.onclick = (e) => {
              if (this.busy || p.busy) return;
              this.selection.click(i, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, checkbox: e.target === check });
              this.paintSelection();
            };
            row.onkeydown = (e) => {
              if (e.target !== row || ![" ", "Enter"].includes(e.key) || this.busy || p.busy) return;
              e.preventDefault();
              this.selection.click(i, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, checkbox: true });
              this.paintSelection();
            };
            list.append(row);
          }
          this.q(".selection-count").textContent = this.selection.selected.size + "개 선택";
          this.q(".search-page").textContent = this.result ? this.result.query + " · " + this.result.page + "쪽" : "";
          this.controls();
        }
        paintSelection() {
          for (const row of this.q(".search-results").children) {
            const selected = this.selection.selected.has(Number(row.dataset.articleId));
            row.classList.toggle("selected", selected);
            row.querySelector("input").checked = selected;
          }
          this.q(".selection-count").textContent = this.selection.selected.size + "개 선택";
          this.controls();
        }
        async batch() {
          const p = this.panel;
          if (this.busy || p.busy || !p.ready) return;
          const selected = this.selection.ordered();
          if (!selected.length) return;
          this.busy = true;
          p.busy = true;
          this.batchStop = false;
          this.outcomes = [];
          p.controls();
          this.controls();
          try {
            for (const [index, item] of selected.entries()) {
              if (this.batchStop || p.closed) {
                for (const rest of selected.slice(index)) this.outcomes.push({ articleId: rest.articleId, status: "cancelled", message: "미조회 · 취소" });
                break;
              }
              if (p.draft.rows.some((r) => r.slave.articleId === item.articleId)) {
                this.outcomes.push({ articleId: item.articleId, status: "duplicate", message: "이미 등록됨 · 중복 제외" });
                continue;
              }
              this.message("일괄 추가 " + (index + 1) + "/" + selected.length + " · " + item.title);
              try {
                if (item.articleId === p.articleId) B.fail("SELF_REFERENCE", "대표 게시글은 원본으로 참조할 수 없습니다.");
                const summary = await p.reader.read(item.url);
                if (this.batchStop || p.closed) B.fail("ABORTED", "조회를 취소했습니다.");
                p.draft.add(summary);
                this.outcomes.push({ articleId: item.articleId, status: "added", message: summary.title + " · " + summary.icons + "개 추가" });
                this.selection.selected.delete(item.articleId);
              } catch (e) {
                this.outcomes.push({ articleId: item.articleId, status: e.code === "ABORTED" ? "cancelled" : "failed", code: e.code || "READ_FAILED", message: e.message });
                if (["ACCESS_DENIED", "ABORTED"].includes(e.code)) this.batchStop = true;
              }
              if (index < selected.length - 1 && !this.batchStop) await new Promise((resolve) => g.setTimeout(resolve, 300));
            }
          } finally {
            this.busy = false;
            p.busy = false;
            if (!p.closed) {
              p.invalidate();
              p.render();
              this.render();
              const report = this.q(".batch-report");
              report.hidden = false;
              report.replaceChildren();
              for (const x of this.outcomes) {
                const n = p.doc.createElement("li");
                n.textContent = "98/" + x.articleId + " · " + x.status + " · " + x.message;
                report.append(n);
              }
              const count = /* @__PURE__ */ __name((kind) => this.outcomes.filter((x) => x.status === kind).length, "count");
              this.message("추가 " + count("added") + " · 중복 제외 " + count("duplicate") + " · 실패 " + count("failed") + " · 취소/미조회 " + count("cancelled"), count("failed") > 0);
              p.controls();
              this.controls();
            }
          }
        }
        destroy() {
          this.batchStop = true;
          this.searcher.destroy();
        }
      }
      Object.assign(B, { SearchPanel });
    }, "initializeBundleSearchUi");
    initializeBundleSearchUi(environment);
    return { "bundle": selectModuleExports(bundle2, ["SearchPanel"]) };
  }
  __name(createBundleSearchUi, "createBundleSearchUi");

  // docs/source/compat/bundle-generator-search-ui.mjs
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var result = createBundleSearchUi({ environment: globalThis, dependencies: { bundle: { "BoardSearch": /* @__PURE__ */ __name(() => bundle["BoardSearch"], "BoardSearch"), "SearchSelection": /* @__PURE__ */ __name(() => bundle["SearchSelection"], "SearchSelection"), "fail": /* @__PURE__ */ __name(() => bundle["fail"], "fail") } } });
  Object.assign(bundle, result.bundle);
})();
