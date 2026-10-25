// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
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

  // docs/source/runtime/context-effect-gate.mjs
  var gates = /* @__PURE__ */ new WeakMap();
  var sharedGateKey = /* @__PURE__ */ Symbol.for("aru.context-effect-gate.v1");
  var sessionGateKey = /* @__PURE__ */ Symbol.for("aru.effect-session-gate.v1");
  function contextEffectGate(environment) {
    const scoped = Reflect.get(environment, sessionGateKey);
    if (scoped) {
      return scoped;
    }
    const root = environment;
    const key = root.window ?? environment;
    let shared;
    if (root.window) {
      try {
        shared = Reflect.get(key, sharedGateKey);
      } catch {
      }
    }
    const existing = shared ?? gates.get(key);
    if (existing) {
      return existing;
    }
    let state = "active";
    let runtimeId;
    const stopped = /* @__PURE__ */ new Set();
    const terminal = /* @__PURE__ */ __name(() => state === "invalidated" || state === "disposed", "terminal");
    const stop = /* @__PURE__ */ __name((next) => {
      if (terminal()) {
        return;
      }
      state = next;
      root.removeEventListener?.("pagehide", dispose);
      for (const callback of [...stopped]) {
        try {
          callback();
        } catch (error) {
          console.warn("[Aru] 컨텍스트 종료 정리 실패", "CONTEXT_CLEANUP_FAILED");
        }
      }
      stopped.clear();
    }, "stop");
    const dispose = /* @__PURE__ */ __name(() => stop("disposed"), "dispose");
    const gate = {
      claimPageLifecycle() {
        root.removeEventListener?.("pagehide", dispose);
      },
      get state() {
        return state;
      },
      allows() {
        if (terminal()) {
          return false;
        }
        try {
          const runtime = root.browser?.runtime ?? root.chrome?.runtime;
          const id = runtime?.id;
          if (typeof id === "string" && id) {
            if (runtimeId && runtimeId !== id) {
              stop("invalidated");
              return false;
            }
            runtimeId = id;
          } else if (runtimeId) {
            stop("invalidated");
            return false;
          }
          state = "active";
          return true;
        } catch (error) {
          gate.observeError(error);
          if (!terminal()) {
            state = "suspended";
          }
          return false;
        }
      },
      assert() {
        if (!gate.allows()) {
          throw Object.assign(new Error("확장 컨텍스트에서 새 작업을 실행할 수 없습니다."), {
            code: terminal() ? "CONTEXT_INVALIDATED" : "CONTEXT_SUSPENDED"
          });
        }
      },
      invalidate: /* @__PURE__ */ __name(() => stop("invalidated"), "invalidate"),
      dispose,
      observeError(error) {
        if (/extension context invalidated/i.test(error instanceof Error ? error.message : String(error))) {
          stop("invalidated");
        }
      },
      onStop(callback) {
        if (terminal()) {
          callback();
          return () => {
          };
        }
        stopped.add(callback);
        return () => {
          stopped.delete(callback);
        };
      }
    };
    gates.set(key, gate);
    if (root.window) {
      try {
        Object.defineProperty(key, sharedGateKey, { value: gate });
      } catch {
      }
    }
    gate.allows();
    if (!terminal()) {
      root.addEventListener?.("pagehide", dispose, { once: true });
    }
    return gate;
  }
  __name(contextEffectGate, "contextEffectGate");

  // docs/source/bundle-generator/ui.mjs
  function createBundleUi({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const effectGate = contextEffectGate(environment);
    let bundle2 = createModuleScope(dependencies.bundle, [
      "Browser",
      "SourceReader",
      "Draft",
      "SearchPanel",
      "articleUrl",
      "fail",
      "encode",
      "clone"
    ], ["Panel"]);
    let icons2 = createModuleScope(dependencies.icons, ["DesignSystem", "Metadata"], []);
    const initializeBundleUi = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const B = bundle2;
      const CSS = `:host{all:initial;font:14px system-ui;color:#30283e}.shade{position:fixed;inset:0;background:#201b3755;z-index:2147483600;display:grid;place-items:center}.dialog{width:min(960px,94vw);max-height:92vh;background:#fff;border-radius:14px;display:flex;flex-direction:column;box-shadow:0 20px 90px #211b3555}header,footer{padding:16px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #e4deed}header strong{font-size:19px;flex:1}main{padding:18px;overflow:auto}footer{border-top:1px solid #e4deed;border-bottom:0;flex-wrap:wrap}button,input,textarea{font:inherit;box-sizing:border-box}button{cursor:pointer;border:1px solid #d7c7ec;border-radius:7px;padding:8px 12px;background:#f6f1fc;color:#513378}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #b58ee6;outline-offset:2px}.primary{background:#724daf;color:white}label{display:block;margin:12px 0}input{width:100%;border:1px solid #d6c9e8;border-radius:7px;padding:10px}small,.hint{color:#706279;font-size:12px;line-height:1.65}.lookup{display:flex;gap:8px}.lookup input{flex:1;min-width:100px}.status{padding:10px;background:#f5f0fc;white-space:pre-wrap;border-radius:7px;margin:12px 0}.status.error{background:#fff0eb;color:#993526}.refs{padding:0;list-style:none;max-height:380px;overflow:auto}.row{padding:12px;border:1px solid #e6ddee;border-radius:8px;margin:8px 0;background:#fdfbff}.row-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.row-head strong{flex:1;min-width:180px}.actions{display:flex;gap:5px}.actions button{padding:6px}.info{display:block;margin-top:5px}.drag{color:#887695;cursor:grab}.row.drag-over{outline:2px solid #9974cd}.preview{border:1px solid #ddd1ee;border-radius:8px;padding:14px;background:#faf7ff}.preview ol{max-height:200px;overflow:auto}textarea{width:100%;height:150px;border:1px solid #ddd;padding:8px}img{max-width:96px;max-height:96px;display:block}details{margin-top:8px}.empty{color:#7d7188}.close{background:#fff}.busy-note{min-height:22px}@media(max-width:600px){.lookup{flex-wrap:wrap}.lookup input{flex-basis:100%}.actions{flex-wrap:wrap}header,footer,main{padding:12px}.dialog{max-height:96vh}.row-head strong{min-width:100%}}`;
      class Panel {
        static {
          __name(this, "Panel");
        }
        constructor({ document = g.document, client, token, browser = B.Browser, reader = new B.SourceReader(), searcher, onClose = /* @__PURE__ */ __name(() => {
        }, "onClose"), restoredDraft }) {
          Object.assign(this, {
            restoredDraft,
            doc: document,
            client,
            token,
            browser,
            reader,
            onClose,
            draft: new B.Draft(),
            busy: false,
            closed: false,
            ready: false,
            preview: null,
            dragId: null,
            page: 0,
            pageSize: 50
          });
          this.host = this.doc.createElement("div");
          this.host.dataset.aruBundlePanel = "";
          this.shadow = this.host.attachShadow({ mode: "open" });
          for (const type of ["click", "input", "change", "keydown", "submit"]) {
            this.shadow.addEventListener(type, (event) => {
              if (!effectGate.allows()) {
                event.stopImmediatePropagation();
              }
            }, true);
          }
          this.shadow.innerHTML = `<style>${CSS}</style><div class="shade"><section class="dialog" role="dialog" aria-modal="true" aria-label="아이콘 통합"><header><strong>아이콘 통합</strong><button type="button" class="close" aria-label="닫기"><svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><main><p class="hint">원본 게시글을 모아 통합팩을 만듭니다. 게시글 저장은 직접 진행하세요.</p><p class="context hint"></p><label>통합팩 제목<input class="name" maxlength="240" placeholder="통합 아이콘팩 제목"></label><label for="aru-bundle-url">원본 아이콘 공유 게시글 URL</label><div class="lookup"><input id="aru-bundle-url" class="url" type="url" placeholder="https://bbs.ruliweb.com/community/board/98/read/…"><button type="button" class="add">조회 · 추가</button><button type="button" class="cancel" disabled>조회 취소</button></div><div class="status" role="status" aria-live="polite">에디터 확인 중…</div><p class="hint">드래그하거나 위·아래 버튼으로 순서를 바꾸세요.</p><ul class="refs" aria-label="원본 글별 그룹"></ul><div class="preview" hidden></div></main><footer><button type="button" class="save">초안 저장</button><button type="button" class="load">초안 불러오기</button><button type="button" class="generate">변경 미리보기</button><button type="button" class="apply primary" disabled>편집기에 적용</button></footer></section></div>`;
          this.uiCleanup = icons2?.DesignSystem?.attach(this.shadow);
          icons2?.DesignSystem?.modalHeader(this.shadow.querySelector("header"), {
            kind: "bundle",
            description: "아이콘 공유 게시글을 통합팩으로 구성합니다."
          });
          this.doc.body.append(this.host);
          this.q = (s) => this.shadow.querySelector(s);
          this.search = new B.SearchPanel(this, searcher);
          this.revision = 0;
          this.invalidReason = "에디터 연결 확인 중입니다.";
          const reason = this.doc.createElement("p");
          reason.className = "apply-reason";
          reason.setAttribute("role", "status");
          this.q("footer").append(reason);
          this.q("footer").append(this.button("에디터 다시 연결", () => {
            if (!this.busy) {
              this.init();
            }
          }, "에디터 다시 연결"));
          this.q(".close").onclick = () => this.close();
          this.q(".name").oninput = () => {
            this.draft.name = this.q(".name").value;
            this.invalidate();
          };
          this.q(".url").onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.add();
            }
          };
          this.q(".add").onclick = () => this.add();
          this.q(".cancel").onclick = () => this.reader.cancel();
          this.q(".generate").onclick = () => this.generate();
          this.q(".apply").onclick = () => this.apply();
          this.q(".save").onclick = () => this.save();
          this.q(".load").onclick = () => this.load();
          const paging = this.doc.createElement("div");
          paging.className = "pages";
          this.pageLabel = this.doc.createElement("small");
          paging.append(this.button("이전 목록", () => {
            if (this.busy || this.page === 0) {
              return;
            }
            this.page--;
            this.render();
          }), this.pageLabel, this.button("다음 목록", () => {
            if (this.busy || this.page + 1 >= Math.ceil(this.draft.rows.length / this.pageSize)) {
              return;
            }
            this.page++;
            this.render();
          }));
          this.q(".refs").after(paging);
          this.key = (event) => {
            const e = event;
            if (e.key === "Escape") {
              e.preventDefault();
              this.close();
            }
            if (e.key === "Tab") {
              const nodes = [
                ...this.shadow.querySelectorAll("button,input,summary,textarea")
              ].filter((n) => !n.disabled && !n.closest("[hidden]"));
              const first = nodes[0], last = nodes.at(-1), active = this.shadow.activeElement;
              if (e.shiftKey && active === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          };
          this.shadow.addEventListener("keydown", this.key);
          this.controls();
          this.init();
        }
        async init() {
          if (this.session) {
            await this.client.request("release", { session: this.session }).catch(() => {
            });
          }
          this.ready = false;
          this.controls();
          try {
            const r = await this.client.request("scan", { token: this.token });
            if (this.closed) {
              this.client.request("release", { session: r.session }).catch(() => {
              });
              return;
            }
            this.session = r.session;
            this.articleId = r.articleId;
            if (!this.initialized) {
              this.draft = this.restoredDraft ? B.Draft.restore(this.restoredDraft.draft) : new B.Draft(r.value);
              if (this.restoredDraft) {
                this.q(".url").value = this.restoredDraft.url;
              }
              this.q(".name").value = this.draft.name;
              this.initialized = true;
            }
            this.ready = true;
            this.q(".context").textContent = this.articleId ? "대표 게시글: 98/" + this.articleId : "신규 작성: 대표 글 번호가 아직 없습니다.";
            this.render();
            this.message(r.value ? "기존 통합팩을 불러왔습니다." : "통합할 개별 아이콘 게시글을 추가하세요.");
            this.q(".name").focus();
            this.invalidate();
          } catch (e) {
            this.invalidReason = "[" + (e.code || "EDITOR_UNAVAILABLE") + "] " + e.message;
            this.message(this.invalidReason, true);
          } finally {
            this.controls();
          }
        }
        message(text, error = false) {
          if (this.closed) {
            return;
          }
          const n = this.q(".status");
          n.textContent = text;
          n.classList.toggle("error", error);
        }
        watchEditor() {
          this.editorObserver?.disconnect();
          const root = this.doc.querySelector('[data-aru-bundle-target="' + this.token + '"]');
          if (!root) {
            return;
          }
          this.editorObserver = new g.MutationObserver(() => {
            if (this.closed || this.busy) {
              return;
            }
            this.invalidate();
            this.message("에디터 변경을 감지했습니다. 최신 본문에서 미리보기를 다시 확인합니다.");
          });
          this.editorObserver.observe(root, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: [
              "class",
              "hidden",
              "contenteditable",
              "src",
              "data-aru-id",
              "data-aru-tags"
            ]
          });
        }
        invalidate() {
          this.revision++;
          g.clearTimeout(this.previewTimer);
          g.clearTimeout(this.expiryTimer);
          this.preview = null;
          this.currentValue = null;
          this.invalidReason = "변경 미리보기를 확인해 주세요.";
          this.q(".preview").hidden = true;
          this.controls();
          if (this.ready && !this.busy && this.draft.name.trim() && this.draft.rows.length) {
            this.previewTimer = g.setTimeout(() => this.generate({ automatic: true }), 350);
          }
        }
        controls() {
          if (this.closed) {
            return;
          }
          for (const s of [
            ".name",
            ".url",
            ".add",
            ".save",
            ".load",
            ".generate"
          ]) {
            this.q(s).disabled = !this.ready || this.busy;
          }
          this.q(".cancel").disabled = !this.busy || !this.reader.pending.size;
          const reason = !this.ready ? this.invalidReason : this.busy ? "작업 중…" : !this.draft.name.trim() ? "통합팩 제목을 입력해 주세요." : !this.draft.rows.length ? "원본 게시글을 하나 이상 추가하세요." : this.preview?.changed === false ? "편집기에 적용할 변경사항이 없습니다." : !this.preview ? this.invalidReason : "";
          this.q(".apply").disabled = !!reason;
          this.q(".apply-reason").textContent = reason || "변경 미리보기를 확인한 뒤 편집기에 적용해 주세요.";
          for (const n of this.shadow.querySelectorAll(".actions button,.pages button")) {
            n.disabled = this.busy;
          }
          this.search?.controls();
        }
        async query(url) {
          this.busy = true;
          this.message("원본 게시글을 확인하는 중…");
          this.controls();
          try {
            const promise = this.reader.read(url);
            this.controls();
            return await promise;
          } finally {
            this.busy = false;
            this.controls();
          }
        }
        async add() {
          if (!this.ready || this.busy) {
            return;
          }
          try {
            const ref = B.articleUrl(this.q(".url").value.trim());
            if (this.draft.rows.some((r) => r.slave.articleId === ref.articleId)) {
              B.fail("DUPLICATE_REFERENCE", "이미 추가한 게시글입니다.");
            }
            if (ref.articleId === this.articleId) {
              B.fail("SELF_REFERENCE", "대표 게시글은 원본으로 참조할 수 없습니다.");
            }
            const summary = await this.query(ref.url);
            if (this.closed) {
              return;
            }
            this.draft.add(summary);
            this.q(".url").value = "";
            this.invalidate();
            this.render();
            this.message(summary.title + " · 아이콘 " + summary.icons + "개를 추가했습니다.");
          } catch (e) {
            this.message(e.message, true);
          }
        }
        async refresh(articleId) {
          if (this.busy) {
            return;
          }
          try {
            const summary = await this.query(icons2.Metadata.publicArticleUrl(articleId));
            if (this.closed) {
              return;
            }
            this.draft.refresh(summary);
            this.invalidate();
            this.render();
            this.message("원본 " + articleId + "의 최신 URL 목록과 요약을 읽었습니다. 태그는 선택기에서 원본을 다시 읽을 때 반영됩니다.");
          } catch (e) {
            this.message(e.message, true);
          }
        }
        button(text, fn, label) {
          const n = this.doc.createElement("button");
          n.type = "button";
          n.textContent = text;
          if (label) {
            n.setAttribute("aria-label", label);
          }
          n.onclick = fn;
          return n;
        }
        render() {
          const list = this.q(".refs");
          list.replaceChildren();
          if (!this.draft.rows.length) {
            const n = this.doc.createElement("li");
            n.className = "empty";
            n.textContent = "추가된 원본 게시글이 없습니다.";
            list.append(n);
          }
          this.page = Math.min(this.page, Math.max(0, Math.ceil(this.draft.rows.length / this.pageSize) - 1));
          this.pageLabel.textContent = " 전체 " + this.draft.rows.length + "개 글 · " + (this.page + 1) + "/" + Math.max(1, Math.ceil(this.draft.rows.length / this.pageSize)) + "쪽 (최대 50개씩 표시) ";
          for (const [localIndex, row] of this.draft.rows.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize).entries()) {
            const index = this.page * this.pageSize + localIndex;
            const { slave: s, summary } = row, n = this.doc.createElement("li");
            n.className = "row";
            n.draggable = true;
            n.dataset.articleId = String(s.articleId);
            const head = this.doc.createElement("div");
            head.className = "row-head";
            const drag = this.doc.createElement("span");
            drag.className = "drag";
            drag.textContent = "↕ " + (index + 1);
            const title = this.doc.createElement("strong");
            title.textContent = summary?.title || "원본 글 " + s.articleId;
            const actions = this.doc.createElement("div");
            actions.className = "actions";
            for (const [text, fn, label] of [
              [
                "위",
                () => this.move(s.articleId, -1),
                "원본 " + s.articleId + " 위로"
              ],
              [
                "아래",
                () => this.move(s.articleId, 1),
                "원본 " + s.articleId + " 아래로"
              ],
              ["새로고침", () => this.refresh(s.articleId)],
              [
                "제거",
                () => {
                  if (this.busy) {
                    return;
                  }
                  this.draft.remove(this.draft.rows.findIndex((r) => r.slave.articleId === s.articleId));
                  this.invalidate();
                  this.render();
                }
              ]
            ]) {
              actions.append(this.button(text, fn, label));
            }
            head.append(drag, title, actions);
            n.append(head);
            const info = this.doc.createElement("small");
            info.className = "info";
            info.textContent = "그룹 " + (index + 1) + " · 98/" + s.articleId + " · " + s.images.length + "개" + (summary ? " · 이미지 " + summary.images + " / 동영상 " + summary.videos + " · 태그 있는 아이콘 " + summary.taggedIcons + " · 메타데이터 " + (summary.hasMetadata ? "있음" : "없음") : " · 원본 요약 미조회");
            n.append(info);
            if (summary?.thumbnail) {
              const details = this.doc.createElement("details"), label = this.doc.createElement("summary");
              label.textContent = "대표 썸네일";
              details.append(label);
              details.addEventListener("toggle", () => {
                if (details.open && !details.querySelector("img")) {
                  const img = this.doc.createElement("img");
                  img.loading = "lazy";
                  img.referrerPolicy = "no-referrer";
                  img.alt = "대표 이미지";
                  img.src = summary.thumbnail;
                  img.onerror = () => {
                    img.remove();
                    const text = this.doc.createElement("small");
                    text.textContent = "썸네일을 읽지 못했습니다. 새로고침로 재시도해 주세요.";
                    details.append(text);
                  };
                  details.append(img);
                }
              });
              n.append(details);
            }
            n.ondragstart = (e) => {
              if (this.busy) {
                e.preventDefault();
                return;
              }
              this.dragId = s.articleId;
              e.dataTransfer?.setData("text/plain", String(s.articleId));
            };
            n.ondragover = (e) => {
              if (this.dragId && !this.busy) {
                e.preventDefault();
                n.classList.add("drag-over");
              }
            };
            n.ondragleave = () => n.classList.remove("drag-over");
            n.ondragend = () => {
              this.dragId = null;
              for (const row2 of list.children) {
                row2.classList.remove("drag-over");
              }
            };
            n.ondrop = (e) => {
              e.preventDefault();
              if (this.busy || !this.dragId) {
                return;
              }
              const from = this.draft.rows.findIndex((r) => r.slave.articleId === this.dragId), to = this.draft.rows.findIndex((r) => r.slave.articleId === s.articleId);
              if (from < 0 || to < 0) {
                return;
              }
              this.draft.move(from, to);
              this.dragId = null;
              this.invalidate();
              this.render();
            };
            list.append(n);
          }
          this.controls();
        }
        move(articleId, offset) {
          if (this.busy) {
            return;
          }
          const from = this.draft.rows.findIndex((r) => r.slave.articleId === articleId), to = from + offset;
          if (to < 0 || to >= this.draft.rows.length) {
            return;
          }
          this.draft.move(from, to);
          this.invalidate();
          this.render();
        }
        async generate({ automatic: _automatic = false } = {}) {
          if (this.busy || !this.ready) {
            return;
          }
          g.clearTimeout(this.previewTimer);
          this.busy = true;
          const revision = this.revision;
          this.controls();
          try {
            this.draft.name = this.q(".name").value;
            const n = this.q(".preview");
            n.replaceChildren();
            n.hidden = false;
            const title = this.doc.createElement("strong");
            title.textContent = this.draft.name.trim() || "제목 미입력";
            n.append(title);
            const list = this.doc.createElement("ol");
            for (const r of this.draft.rows) {
              const item = this.doc.createElement("li");
              item.textContent = (r.summary?.title || "원본 글 " + r.slave.articleId) + " · " + r.slave.images.length + "개";
              list.append(item);
            }
            n.append(list);
            const value = this.draft.value(this.articleId), encoded = B.encode(value), p = await this.client.request("preview", {
              session: this.session,
              encoded
            });
            if (this.closed) {
              return;
            }
            this.watchEditor();
            if (!this.articleId) {
              this.q(".context").textContent = "새 게시글입니다. 저장 후 글 번호가 연결됩니다. 이전 선택기에서는 읽지 못할 수 있습니다.";
            }
            if (revision !== this.revision) {
              return;
            }
            this.preview = p;
            this.currentValue = value;
            g.clearTimeout(this.expiryTimer);
            this.expiryTimer = g.setTimeout(() => {
              if (this.closed) {
                return;
              }
              this.preview = null;
              this.invalidReason = "미리보기가 만료되었습니다. 다시 생성해 주세요.";
              this.controls();
            }, p.expiresInMs || 12e4);
            const text = this.doc.createElement("p");
            text.textContent = p.changes + " 총 " + p.references + "개 그룹 / " + p.icons + "개 아이콘. 원본 파일과 개별 태그는 복제하지 않습니다.";
            n.append(text);
            const details = this.doc.createElement("details"), label = this.doc.createElement("summary"), raw = this.doc.createElement("textarea");
            label.textContent = "메타데이터 보기";
            raw.readOnly = true;
            raw.value = JSON.stringify(value, null, 2);
            raw.setAttribute("aria-label", "생성된 메타데이터");
            details.append(label, raw);
            n.append(details);
            this.message("미리보기를 확인하고 편집기에 적용하세요.");
          } catch (e) {
            this.preview = null;
            this.invalidReason = "[" + (e.code || "PREVIEW_FAILED") + "] " + e.message;
            this.q(".preview").hidden = true;
            this.message(this.invalidReason, true);
          } finally {
            this.busy = false;
            this.controls();
          }
        }
        async apply() {
          if (this.busy || !this.preview || this.preview.changed === false) {
            return;
          }
          this.busy = true;
          this.controls();
          try {
            await this.client.request("apply", {
              session: this.session,
              previewId: this.preview.previewId
            });
            if (this.closed) {
              return;
            }
            this.draft.base = B.clone(this.currentValue);
            this.preview = null;
            this.invalidReason = "적용했습니다. 새 변경사항이 없습니다.";
            g.clearTimeout(this.expiryTimer);
            this.message("편집기에 적용했습니다. 루리웹에서 게시글을 저장하세요.");
          } catch (e) {
            this.preview = null;
            this.invalidReason = "[" + (e.code || "APPLY_FAILED") + "] " + e.message;
            this.message(this.invalidReason, true);
          } finally {
            this.busy = false;
            this.controls();
          }
        }
        async save() {
          if (this.busy || !this.ready) {
            return;
          }
          this.busy = true;
          this.controls();
          try {
            this.draft.name = this.q(".name").value;
            await this.browser.saveDraft(this.draft);
            this.message("이 브라우저에 초안을 저장했습니다. 이전 초안은 교체됩니다.");
          } catch (e) {
            this.message(e.message, true);
          } finally {
            this.busy = false;
            this.controls();
          }
        }
        async load() {
          if (this.busy || !this.ready) {
            return;
          }
          this.busy = true;
          this.controls();
          try {
            const draft = await this.browser.loadDraft();
            if (draft.base?.mainArticleId > 0 && draft.base.mainArticleId !== this.articleId) {
              B.fail("ARTICLE_ID_MISMATCH", "다른 대표 글의 수정 초안입니다. 해당 글에서 불러와 주세요.");
            }
            if (this.draft.base) {
              B.fail("DRAFT_CONFLICT", "본문에 통합팩이 있습니다. 기존 구성은 저장 초안으로 덮어쓰지 않습니다.");
            }
            this.draft = draft;
            this.q(".name").value = draft.name;
            this.invalidate();
            this.render();
            this.message("초안을 불러왔습니다. 미리보기를 확인하고 적용하세요.");
          } catch (e) {
            this.message(e.message, true);
          } finally {
            this.busy = false;
            this.controls();
            if (this.ready) {
              this.schedulePreview();
            }
          }
        }
        schedulePreview() {
          if (this.closed || this.busy || !this.ready || !this.draft.name.trim() || !this.draft.rows.length) {
            return;
          }
          g.clearTimeout(this.previewTimer);
          this.previewTimer = g.setTimeout(() => this.generate({ automatic: true }), 350);
        }
        close() {
          if (this.closed) {
            return;
          }
          this.closed = true;
          this.editorObserver?.disconnect();
          g.clearTimeout(this.previewTimer);
          g.clearTimeout(this.expiryTimer);
          this.search.destroy();
          this.reader.destroy();
          if (this.session) {
            this.client.request("release", { session: this.session }).catch(() => {
            });
          }
          this.uiCleanup?.();
          this.host.remove();
          this.onClose();
        }
      }
      Object.assign(B, { Panel });
    }, "initializeBundleUi");
    initializeBundleUi(environment);
    return { bundle: selectModuleExports(bundle2, ["Panel"]) };
  }
  __name(createBundleUi, "createBundleUi");

  // docs/source/compat/bundle-generator-ui.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var result = createBundleUi({ environment: globalThis, dependencies: {
    bundle: { "Browser": /* @__PURE__ */ __name(() => bundle["Browser"], "Browser"), "SourceReader": /* @__PURE__ */ __name(() => bundle["SourceReader"], "SourceReader"), "Draft": /* @__PURE__ */ __name(() => bundle["Draft"], "Draft"), "SearchPanel": /* @__PURE__ */ __name(() => bundle["SearchPanel"], "SearchPanel"), "articleUrl": /* @__PURE__ */ __name(() => bundle["articleUrl"], "articleUrl"), "fail": /* @__PURE__ */ __name(() => bundle["fail"], "fail"), "encode": /* @__PURE__ */ __name(() => bundle["encode"], "encode"), "clone": /* @__PURE__ */ __name(() => bundle["clone"], "clone") },
    icons: { "DesignSystem": /* @__PURE__ */ __name(() => icons["DesignSystem"], "DesignSystem"), "Metadata": /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata") }
  } });
  Object.assign(bundle, result.bundle);
})();
