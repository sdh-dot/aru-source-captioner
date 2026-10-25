import type { DynamicApi } from "../runtime/contracts.ts";
import type { CodedError } from "../runtime/contracts.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 사용자 옵션에 따라 작성기별 기능을 시작·정리하고 탐색 후 중복 초기화를 막는다.
import {
  createModuleScope,
  selectModuleExports,
} from "../runtime/module-scope.ts";

export function createIconsFeature(
  this: any,
  { environment = defaultEnvironment, dependencies = {} }: FactoryOptions = {},
) {
  const { MutationObserver, AbortController, console } = environment;
  const setTimeout =
    typeof environment.setTimeout === "function"
      ? (...args: Parameters<RuntimeEnvironment["setTimeout"]>) =>
          environment.setTimeout(...args)
      : undefined;
  let icons = createModuleScope(
    dependencies.icons,
    [
      "SiteAdapter",
      "BrowserAdapter",
      "createPicker",
      "ComposerController",
      "ComposerAdapter",
      "CatalogSources",
      "LibrarySearchEngine",
      "LibraryPackReader",
      "Metadata",
      "IconFeature",
      "feature",
    ],
    ["IconFeature", "feature"],
  );

  const initializeIconsFeature = function (global: RuntimeEnvironment) {
    "use strict";
    const API = (icons = icons || {});
    const Site = API.SiteAdapter;
    class IconFeature {
      declare destroyed: false | true;
      declare document: Document;

      declare browser: any;

      declare createPicker: any;

      declare site: any;

      declare enabled: boolean;

      declare generation: number;

      declare entry: null | HTMLDivElement;

      declare picker: null | any;

      declare current: DynamicApi | null;

      declare controller: null | any;

      declare optionsRevision: number;

      declare onNavigate: () => void;

      declare unsubscribe: any;

      declare options: any;

      declare composers: any;

      declare packSelection: DynamicApi | null;

      declare panelObserver: any;

      declare librarySearch: any;

      declare libraryDirect: null | Map<any, any>;

      declare libraryCatalogSignature: string;

      declare catalogObserver: any;

      declare preparedSelection: null | any;

      declare inserting: any;

      declare collectionTask: DynamicApi | null;
      constructor({
        document = global.document,
        browser = API.BrowserAdapter,
        createPicker = API.createPicker,
        site = Site,
      } = {}) {
        this.document = document;
        this.browser = browser;
        this.createPicker = createPicker;
        this.site = site;
        this.enabled = false;
        this.generation = 0;
        this.entry = null;
        this.picker = null;
        this.current = null;
        this.controller = null;
        this.optionsRevision = 0;
        this.destroyed = false;
        this.onClick = this.onClick.bind(this);
        this.onNavigate = () => this.stopSession(true);
      }
      async start() {
        if (this.unsubscribe || this.destroyed) {
          return;
        }
        this.unsubscribe = this.browser.onChanged(() => this.applyOptions());
        await this.applyOptions();
      }
      async applyOptions() {
        const revision = ++this.optionsRevision;
        let opts;
        try {
          opts = await this.browser.readOptions();
        } catch (_) {
          opts = {
            active: false,
            aruIconsOptions: { enabled: false, autoLoad: true },
          };
        }
        if (this.destroyed || revision !== this.optionsRevision) {
          return;
        }
        const active = opts.active === true;
        this.options = opts.aruIconsOptions;
        if (active === this.enabled) {
          return;
        }
        this.enabled = active;
        if (active) {
          this.document.addEventListener("click", this.onClick, true);
          global.addEventListener?.("popstate", this.onNavigate);
          global.addEventListener?.("hashchange", this.onNavigate);
          if (API.ComposerController) {
            this.composers = new API.ComposerController({
              document: this.document,
              debug: this.options?.debug === true,
              onOpen: (entry: {
                kind: string;
                root: { querySelector: (arg0: string) => any };
                anchor: { click: () => void };
                button: any;
              }) => this.openComposer(entry),
              onRemoved: (root: any) => {
                if (this.current?.target?.root === root) {
                  this.stopSession(true);
                }
              },
            });
            this.composers.start();
          }
        } else {
          this.document.removeEventListener("click", this.onClick, true);
          global.removeEventListener?.("popstate", this.onNavigate);
          global.removeEventListener?.("hashchange", this.onNavigate);
          this.composers?.stop();
          this.composers = null;
          this.stopSession(true);
          this.entry?.remove();
          this.entry = null;
        }
      }
      addReadEntry() {
        const id = global.location?.pathname.match(
          /^\/community\/board\/98\/read\/(\d+)\/?$/,
        )?.[1];
        const body = this.document.querySelector(
          '.view_content[itemprop="articleBody"],.view_content article',
        );
        if (!id || !body) {
          return;
        }
        const host = this.document.createElement("div");
        host.dataset.aruIconsEntry = "true";
        const shadow = host.attachShadow({ mode: "open" }),
          button = this.document.createElement("button");
        button.type = "button";
        button.textContent = "확장 아이콘 보기 · 읽기 전용";
        const style = this.document.createElement("style");
        style.textContent =
          ":host{display:block;margin:12px 0}button{min-height:44px;padding:10px 16px;border:1px solid #70609a;border-radius:10px;color:#463362;background:#f4effb;font:14px system-ui;cursor:pointer}";
        shadow.append(style, button);
        body.before(host);
        this.entry = host;
        button.addEventListener("click", () =>
          this.open({
            articleId: Number(id),
            title: body.querySelector("h1")?.textContent || "글 " + id,
            panel: null,
            document: this.document,
            opener: button,
          }),
        );
      }
      onClick(event: MouseEvent) {
        // 사이트 버튼의 기존 동작과 확장 Picker의 실행 진입점을 구분한다.
        if (API.ComposerController) {
          return;
        }
        const target = (event.target as Element)?.closest?.(
          ".icon_data_show_target[onclick]",
        );
        if (!target) {
          return;
        }
        const articleId = this.site.selectionId(target),
          panel = target.closest(".comment_icon");
        if (!articleId || !panel) {
          return;
        }
        // 기존 이벤트가 사이트 리스너에 도달하도록 기본 동작을 취소하거나 브리지로 대체하지 않는다.
        const closingSame =
          this.current?.articleId === articleId &&
          this.current?.panel === panel;
        this.stopSession(true);
        const context = {
          articleId,
          panel,
          title: target.getAttribute("title") || "글 " + articleId,
          opener: target,
        };
        const generation = this.generation;
        setTimeout!(() => {
          if (
            closingSame &&
            panel.querySelector<HTMLElement>(".icon_share_data")?.style
              .display === "none"
          ) {
            return;
          }
          if (this.enabled && generation === this.generation) {
            this.open(context);
          }
        }, 0);
      }
      stopSession(destroy = false) {
        this.packSelection = null;
        this.generation++;
        this.controller?.abort();
        this.controller = null;
        this.panelObserver?.disconnect();
        this.panelObserver = null;
        if (destroy) {
          this.librarySearch?.destroy();
          this.librarySearch = null;
          this.libraryDirect = null;
          this.libraryCatalogSignature = "";
          this.catalogObserver?.disconnect();
          this.catalogObserver = null;
          const session = this.current?.target?.session?.session;
          if (session) {
            API.ComposerAdapter?.request(this.document, "release", {
              session,
            }).catch(() => {});
          }
          this.picker?.destroy();
          this.picker = null;
          this.current = null;
          this.preparedSelection = null;
        }
      }
      async openComposer(entry: {
        kind: string;
        root: { querySelector: (arg0: string) => any };
        anchor: { click: () => void };
        button: any;
      }) {
        if (!this.enabled) {
          return;
        }
        const panel =
          entry.kind === "post"
            ? this.document.querySelector(
                "#editor_common_write_wrapper .comment_icon",
              )
            : entry.root.querySelector(".comment_icon");
        // 사이트 버튼이 자체 목록·모듈을 준비하도록 두며 거부된 내부 API를 직접 호출하지 않는다.
        // 삽입 세션을 확보하지 못해도 즐겨찾기 조회는 가능해야 한다.
        if (entry.kind !== "post" && panel && !panel.children.length) {
          entry.anchor.click();
        }
        // 작성기 대상과 미디어 출처는 별개이므로 현재 게시글을 출처로 자동 선택하지 않는다.
        await this.open({
          articleId: null,
          boardId: "98",
          title: "아이콘팩과 즐겨찾기",
          panel: null,
          document: null,
          opener: entry.button,
          target: entry,
          nativePanel: panel,
          catalogMode: !!API.CatalogSources,
        });
      }
      cancelPackSelection() {
        const task: DynamicApi | null = this.packSelection;
        if (!task) {
          return;
        }
        this.packSelection = null;
        this.stopCollection();
        if (this.current === task.context) {
          Object.assign(task.context, task.before);
        }
      }
      chooseArticle(value: DynamicApi, boardId = "98", _query?: unknown) {
        if (!this.current || !this.picker) {
          return Promise.resolve({ ok: false });
        }
        // 같은 항목을 다시 누르면 진행 중인 조회를 재사용한다.
        // 다른 항목으로 바뀌면 이전 요청을 취소하고 해당 문맥을 복원한다.
        let ref;
        try {
          ref = API.CatalogSources
            ? typeof value === "object"
              ? { ...value, ...API.CatalogSources.parseRef(value.url) }
              : {
                  ...API.CatalogSources.parseRef(value, boardId),
                  source: "direct",
                }
            : {
                articleId: API.ComposerAdapter.parseArticle(value),
                boardId: "98",
              };
        } catch (error) {
          return Promise.reject(error);
        }
        ref.key = ref.key || "direct:" + ref.boardId + ":" + ref.articleId;
        const key = String(ref.boardId) + ":" + ref.articleId;
        if (
          this.packSelection?.key === key &&
          this.packSelection.context === this.current
        ) {
          return this.packSelection.promise;
        }
        this.cancelPackSelection();
        const context = this.current,
          picker = this.picker;
        const before = Object.fromEntries(
          [
            "articleId",
            "boardId",
            "catalogRef",
            "title",
            "document",
            "panel",
            "sourceQuery",
          ].map((k) => [k, context[k]]),
        );
        const task: DynamicApi = { key, context, before };
        this.packSelection = task;
        task.promise = this.loadChosenArticle(ref, task, picker);
        return task.promise;
      }
      async loadChosenArticle(
        ref: { source: string; boardId: any; articleId: string; title: any },
        task: DynamicApi,
        picker: {
          setCatalog: (arg0: any[]) => void;
          completeCatalogSelection: () => void;
        },
      ) {
        const { context, before } = task;
        if (this.librarySearch) {
          if (ref.source === "direct") {
            this.libraryDirect?.set(
              String(ref.boardId) + ":" + ref.articleId,
              ref,
            );
          }
          this.librarySearch.setEntries([
            ...this.librarySearch.entries.values(),
            ref,
          ]);
        }
        if (ref.source === "direct") {
          picker.setCatalog?.([
            ...API.CatalogSources.developerPacks(),
            ...API.CatalogSources.favorites(context.nativePanel),
            ...this.libraryDirect!.values(),
          ]);
        }
        this.stopCollection();
        Object.assign(context, {
          articleId: ref.articleId,
          boardId: ref.boardId,
          catalogRef: ref,
          title: ref.title || "글 " + ref.articleId,
          document: null,
          panel: null,
          sourceQuery: "",
        });
        const result = await this.collect(false, false, true);
        if (this.packSelection !== task || this.current !== context) {
          return { ok: false, cancelled: true };
        }
        this.packSelection = null;
        if (!result?.ok) {
          Object.assign(context, before);
          return result || { ok: false };
        }
        picker.completeCatalogSelection?.();
        return result;
      }
      async insertSelection(icon: any, context: DynamicApi) {
        if (!this.enabled) {
          throw Object.assign(new Error("아이콘 기능이 비활성화되었습니다."), {
            code: "FEATURE_DISABLED",
          });
        }
        if (this.current !== context) {
          throw Object.assign(
            new Error(
              "선택기 대상이 바뀌었습니다. 해당 작성기에서 다시 열어 주세요.",
            ),
            { code: "PICKER_TARGET_CHANGED" },
          );
        }
        if (!context.target?.session) {
          throw Object.assign(
            new Error(
              context.target?.error?.message ||
                "삽입 세션이 없습니다. 작성기에서 다시 열어 주세요.",
            ),
            { code: context.target?.error?.code || "SESSION_UNAVAILABLE" },
          );
        }
        if (this.inserting) {
          throw new Error("아이콘을 첨부하는 중입니다.");
        }
        this.inserting = true;
        try {
          const result = await API.ComposerAdapter.request(
            this.document,
            "insert",
            {
              session: context.target.session.session,
              media: API.ComposerAdapter.selectedMedia(icon),
              debug: this.options?.debug === true,
            },
          );
          if (this.current !== context) {
            return result;
          }
          const input = context.target.root.querySelector(
            "textarea.comment_input,textarea.reply_input,.note-editable",
          );
          this.stopSession(true);
          input?.focus({ preventScroll: true });
          return { message: "작성기에 아이콘을 첨부했습니다.", ...result };
        } finally {
          this.inserting = false;
        }
      }
      async open(context: DynamicApi) {
        if (!this.enabled) {
          return;
        }
        const readBudget = this.current?.readBudget || { count: 0, max: 128 };
        this.stopSession(true);
        this.current = context;
        context.readBudget = readBudget;
        // 현재 팩 수집과 전체 팩 조회를 구분하며 전체 조회에는 수집 상한을 적용한다.
        if (API.LibrarySearchEngine && API.LibraryPackReader) {
          this.librarySearch = new API.LibrarySearchEngine({
            reader: new API.LibraryPackReader({
              browser: this.browser,
              site: this.site,
              isActive: () => this.enabled,
            }),
          });
        }
        this.libraryDirect = new Map();
        this.picker = this.createPicker({
          opener: context.opener,
          debug: this.options?.debug === true,
          insertionMode: !!context.target,
          catalogMode: context.catalogMode,
          openCatalogInitially:
            !!context.target && context.catalogMode === true,
          targetValid: !context.target || !!context.target.session,
          librarySearch: this.librarySearch,
          onLibraryScope: (scope: string) => {
            if (scope === "all") {
              this.stopCollection();
            } else if (
              context.articleId &&
              !this.librarySearch?.packs.has(
                String(context.boardId) + ":" + context.articleId,
              )
            ) {
              this.collect(false);
            }
          },
          onCatalogSource: (ref: { boardId: string | undefined }, query: any) =>
            this.chooseArticle(ref, ref.boardId, query),
          onDirectSource: (value: any, board?: string | undefined) =>
            this.chooseArticle(value, board),
          onCatalogCancel: () => this.cancelPackSelection(),
          targetLabel:
            context.target?.kind === "post"
              ? "게시글"
              : context.target?.kind === "reply"
                ? "현재 답글"
                : "현재 댓글",
          onSource: context.target
            ? (value: { url: any }) => this.chooseArticle(value)
            : null,
          onClose: () => this.stopSession(true),
          onNativeReturn: () => {
            this.stopSession(true);
            if (context.target?.kind === "post") {
              this.document.querySelector<HTMLElement>("#iconImage")?.click();
            } else {
              context.target?.anchor?.click();
            }
          },
          onStop: () => {
            if (this.packSelection) {
              this.cancelPackSelection();
            } else {
              this.stopCollection();
            }
          },
          onRetry: () => this.collect(true, true),
          onRefresh: () => this.collect(true),
          onSelect: context.target
            ? (icon: any) => this.insertSelection(icon, context)
            : (icon: any) => {
                const prepared = this.site.prepareInsertion(icon, {
                  panel: context.panel,
                  kind: context.panel?.closest("#editor_common_write_wrapper")
                    ? "post"
                    : "comment",
                });
                this.preparedSelection = prepared;
                return { message: prepared.message };
              },
        });
        this.document.body.append(this.picker!.element);
        if (context.target) {
          const update = () => {
            if (this.current !== context) {
              return;
            }
            if (context.catalogMode) {
              const favorites = API.CatalogSources.favorites(
                context.nativePanel,
              );
              const entries = [
                ...API.CatalogSources.developerPacks(),
                ...favorites,
              ];
              entries.push(...this.libraryDirect!.values());
              if (
                context.catalogRef &&
                context.catalogRef.source !== "direct"
              ) {
                entries.push(context.catalogRef);
              }
              const signature = JSON.stringify(
                entries.map((ref) => [
                  ref.boardId,
                  ref.articleId,
                  ref.title,
                  ref.url,
                  ref.source,
                ]),
              );
              if (signature !== this.libraryCatalogSignature) {
                this.libraryCatalogSignature = signature;
                this.librarySearch?.setEntries(entries);
                this.picker?.refreshLibrary?.();
              }
              this.picker?.setCatalog?.(
                entries,
                favorites.length
                  ? "즐겨찾기는 사이트 기본 목록의 현재 상태를 읽었습니다."
                  : "즐겨찾기 목록을 아직 확인하지 못했습니다. 기존 아이콘 버튼의 로그인·목록 상태를 확인해 주세요.",
              );
            } else {
              this.picker?.setSources?.(
                API.ComposerAdapter.packChoices(context.nativePanel),
              );
            }
          };
          update();
          if (context.nativePanel) {
            this.catalogObserver = new MutationObserver(update);
            this.catalogObserver.observe(context.nativePanel, {
              childList: true,
              subtree: true,
            });
          }
          this.picker!.setTargetState?.(
            !!context.target.session,
            context.target.error,
          );
          if (context.target.error) {
            this.picker!.setError(
              "[" +
                (context.target.error.code || "CAPTURE_FAILED") +
                "] " +
                context.target.error.message,
            );
          }
        }
        if (context.panel && typeof MutationObserver !== "undefined") {
          this.panelObserver = new MutationObserver(() => {
            if (this.current !== context) {
              return;
            }
            if (
              !context.panel.isConnected ||
              context.panel.style.display === "none" ||
              context.panel.querySelector(".icon_share_data")?.style.display ===
                "none"
            ) {
              this.stopCollection();
            }
          });
          this.panelObserver.observe(context.panel, {
            attributes: true,
            attributeFilter: ["style", "hidden"],
            subtree: true,
          });
        }
        if (context.articleId) {
          await this.collect(false);
        } else {
          this.picker!.setProgress({
            status: "partial",
            message:
              "기본 목록에서 팩을 고르거나 아이콘 게시글 URL 또는 번호를 입력해 주세요.",
            busy: false,
          });
        }
      }
      stopCollection() {
        this.generation++;
        this.controller?.abort();
        this.controller = null;
        this.picker?.setProgress({
          status: "stopped",
          message: "수집을 중지했습니다. 재시도로 이어서 수집할 수 있습니다.",
          busy: false,
        });
      }
      collect(refresh: boolean, manualNative = false, transactional = false) {
        if (!this.enabled || !this.current || !this.picker) {
          return Promise.resolve();
        }
        const key = JSON.stringify([
          this.current.boardId,
          this.current.articleId,
          !!refresh,
          !!manualNative,
          !!transactional,
        ]);
        if (
          this.collectionTask?.context === this.current &&
          this.collectionTask.key === key &&
          this.controller &&
          !this.controller.signal.aborted
        ) {
          return this.collectionTask.promise;
        }
        const task: DynamicApi | null = { key, context: this.current };
        this.collectionTask = task;
        task.promise = this.runCollection(
          refresh,
          manualNative,
          transactional,
        ).finally(() => {
          if (this.collectionTask === task) {
            this.collectionTask = null;
          }
        });
        return task.promise;
      }
      async runCollection(
        refresh: any,
        manualNative = false,
        transactional = false,
      ) {
        if (!this.enabled || !this.current || !this.picker) {
          return;
        }
        this.controller?.abort();
        const controller = new AbortController();
        this.controller = controller;
        const signal = controller.signal,
          token = ++this.generation,
          context = this.current,
          picker = this.picker;
        const current = () =>
          !signal.aborted &&
          this.enabled &&
          this.generation === token &&
          this.current === context;
        const ensure = () => {
          if (!current()) {
            throw Object.assign(new Error("수집 중지"), { code: "ABORTED" });
          }
        };
        const diagnostics = new Map();
        const log = (
          stage: string,
          data: {
            kind?: any;
            delivered?: any;
            visibleMatches?: any;
            groups?: any;
            renderedCards?: any;
            hit?: boolean;
            icons?: any;
            action?: string;
            metadataVersion?: any;
            metadataIcons?: any;
            warnings?: any;
            route?: string;
          },
        ) => {
          if (!current() || this.options?.debug !== true) {
            return;
          }
          const key = JSON.stringify(data);
          if (diagnostics.get(stage) === key) {
            return;
          }
          diagnostics.set(stage, key);
          // 외부 팩·검색 데이터는 펼쳐 쓰지 않고 고정 단계·팩 종류·건수만 콘솔에 전달한다.
          global.console?.info?.("[Aru Icons]", {
            stage: [
              "picker-delivery",
              "cache",
              "pack-type",
              "body-collect",
              "cache-write",
            ].includes(stage)
              ? stage
              : "icons",
            kind:
              data.kind === "NORMAL" || data.kind === "BUNDLE"
                ? data.kind
                : "unknown",
            icons:
              Number.isSafeInteger(data.icons) && data.icons >= 0
                ? data.icons
                : null,
          });
        };
        let pendingPack: null | any = null,
          pendingData: null | {} = null,
          latestProgress: DynamicApi | null = null;
        const progress: (info: DynamicApi) => void = (info) => {
          latestProgress = { ...info };
          picker.setProgress(info);
        };
        const commit: (pack: DynamicApi, data?: DynamicApi | null) => void = (
          pack,
          data = {},
        ) => {
          if (this.librarySearch && context.articleId) {
            const ref = context.catalogRef || {
              boardId: context.boardId || "98",
              articleId: context.articleId,
              title: context.title,
              source: "direct",
            };
            this.librarySearch.remember(ref, pack, {
              stale:
                data!.stale === true ||
                (pack!.kind === "NORMAL" && pack!.bodyCounts?.tagErrors > 0) ||
                (pack!.kind === "BUNDLE" &&
                  (pack!.attributeReaderVersion !== 2 ||
                    pack!.mediaReaderVersion !== 1)),
            });
            this.librarySearch.setState({
              currentKey: String(ref.boardId) + ":" + ref.articleId,
            });
          }
          picker.setCurrentSource?.(
            String(context.boardId) + ":" + context.articleId,
          );
          picker.setPack(pack);
          if (context.catalogRef) {
            picker.setCatalogPack?.(context.catalogRef, pack);
          }
          const view = picker.getSnapshot?.();
          log("picker-delivery", {
            kind: pack!.kind,
            delivered: pack!.icons.length,
            visibleMatches: view?.uniqueCount ?? null,
            groups: view?.groups?.length ?? null,
            renderedCards: view?.renderedCards ?? null,
            ...data,
          });
        };
        const publish = (pack: any, data = {}) => {
          if (transactional) {
            pendingPack = pack;
            pendingData = data;
          } else {
            commit(pack, data);
          }
        };
        const cacheArgs = {
          boardId: context.boardId || "98",
          articleId: String(context.articleId),
        };
        const cacheFor = (kind: string) =>
          context.catalogRef
            ? {
                ...cacheArgs,
                catalogSource: context.catalogRef.source || "direct",
                packKind: kind,
                readerVersion: 2,
              }
            : cacheArgs;
        const cacheWarning = () => {
          if (current()) {
            picker.setError(
              "캐시를 사용할 수 없어 이번 세션에서만 표시합니다. 원래 기능은 계속 사용할 수 있습니다.",
            );
          }
        };
        const readPublic = async (id: any, opts = {}) => {
          ensure();
          const budget = context.readBudget || { count: 0, max: 128 };
          if (budget.count >= budget.max) {
            throw Object.assign(
              new Error(
                "이번 선택기의 공개 글 조회 상한 128회에 도달했습니다. 닫고 다시 열어 주세요.",
              ),
              { code: "REQUEST_LIMIT" },
            );
          }
          budget.count++;
          return this.site.getPublicDocument(id, { ...opts, signal });
        };
        try {
          picker.clearError();
          progress({
            status: "loading",
            phase: "cache",
            processed: null,
            total: null,
            message: "저장된 팩을 확인하고 있어요.",
            busy: true,
          });
          if (refresh) {
            try {
              for (const kind of context.catalogRef
                ? ["BUNDLE", "NORMAL"]
                : ["NORMAL"]) {
                await this.browser.requestCache("invalidate", cacheFor(kind));
              }
            } catch (_) {
              cacheWarning();
            }
            ensure();
          } else {
            try {
              let cached;
              for (const kind of context.catalogRef
                ? ["BUNDLE", "NORMAL"]
                : ["NORMAL"]) {
                cached = await this.browser.requestCache("get", cacheFor(kind));
                ensure();
                if (cached?.snapshot?.pack) {
                  break;
                }
              }
              const cachedPack = cached?.snapshot?.pack;
              const normal = cachedPack?.kind === "NORMAL";
              const empty =
                normal &&
                (!Array.isArray(cachedPack.icons) || !cachedPack.icons.length);
              const bodyForNative =
                normal &&
                !!context.panel &&
                cachedPack.collectionMode === "article-body-v1";
              // 읽기 화면에서는 현재 DOM의 태그 상태를 우선한다.
              // 이전 NORMAL 캐시가 변경된 메타데이터나 빈 목록을 계속 가리지 않게 한다.
              const readCurrent = normal && !context.panel;
              const readAttributes =
                cachedPack?.kind === "BUNDLE" &&
                (cachedPack.attributeReaderVersion !== 2 ||
                  cachedPack.mediaReaderVersion !== 1 ||
                  cached.stale === true ||
                  cached.snapshot?.sourceCheck?.status === "partial" ||
                  cached.snapshot?.sourceCheck?.states?.some(
                    (s: {
                      metadataReadError?: string;
                      tagErrors?: number;
                      ambiguousMetadata?: number;
                    }) =>
                      s.metadataReadError || s.tagErrors || s.ambiguousMetadata,
                  ));
              log("cache", {
                hit: !!cachedPack,
                kind: cachedPack?.kind || null,
                icons: cachedPack?.icons?.length ?? 0,
                action: empty
                  ? "ignore-empty-normal"
                  : bodyForNative
                    ? "ignore-body-for-native"
                    : readCurrent
                      ? "read-current-normal-body"
                      : readAttributes
                        ? "read-bundle-attributes"
                        : cachedPack
                          ? "reuse"
                          : "miss",
              });
              if (
                cachedPack &&
                !empty &&
                !bodyForNative &&
                !readCurrent &&
                !readAttributes
              ) {
                publish(cachedPack, {
                  from: "cache",
                  stale: cached.stale === true,
                });
                progress({
                  status: "cached",
                  phase: "ready",
                  processed: cachedPack.icons.length,
                  loaded: cachedPack.icons.length,
                  total: cachedPack.icons.length,
                  message:
                    "저장된 팩을 불러왔어요." +
                    (cached.stale
                      ? " 최신 정보는 새로고침으로 확인해 주세요."
                      : ""),
                  fetchedAt: cached.acquiredAt,
                  busy: false,
                });
                // 캐시만으로 현재 네이티브 목록의 준비 상태나 출처 검증 완료를 판단하지 않는다.
                if (transactional) {
                  ensure();
                  commit(pendingPack, pendingData);
                }
                return { ok: true, pack: cachedPack };
              }
            } catch (error) {
              ensure();
              cacheWarning();
            }
          }
          let resolved, doc;
          try {
            progress({
              status: "loading",
              phase: "article",
              processed: null,
              total: null,
              message: "아이콘 게시글을 읽고 있어요.",
              busy: true,
            });
            doc =
              (!refresh && context.document) ||
              (await readPublic(context.articleId, {
                forceRead: refresh,
                boardId: context.boardId || "98",
              }));
            ensure();
            const body = doc.querySelector(
              '.view_content[itemprop="articleBody"],.view_content article',
            );
            progress({
              status: "loading",
              phase: "metadata",
              processed: null,
              total: null,
              message: "팩 정보를 확인하고 있어요.",
              busy: true,
            });
            resolved =
              context.boardId && context.boardId !== "98"
                ? {
                    kind: "NORMAL",
                    pack: null,
                    warnings: [],
                    rawMetadata: null,
                  }
                : await API.Metadata.parseDocument(body || doc, {
                    articleId: context.articleId,
                    boardId: 98,
                  });
            ensure();
          } catch (error) {
            ensure();
            if (transactional) {
              throw error;
            }
            picker.setError(
              "[" +
                ((error as CodedError).code || "READ_FAILED") +
                "] " +
                (error as CodedError).message +
                " 정상 탭에서 대표 글을 열거나 원래 선택기로 돌아갈 수 있습니다.",
            );
            if ((error as CodedError).code === "ACCESS_DENIED") {
              progress({
                status: "partial",
                message:
                  "접근 제한으로 중지했습니다. 자동 재요청은 하지 않습니다.",
                busy: false,
              });
              return;
            }
            resolved = {
              kind: "NORMAL",
              pack: null,
              warnings: [],
              rawMetadata: null,
            };
          }
          log("pack-type", {
            kind: resolved.kind,
            metadataVersion: resolved.metadataVersion ?? null,
            metadataIcons: resolved.pack?.icons?.length ?? 0,
            warnings: resolved.warnings?.length || 0,
            route: context.panel ? "native-panel" : "article-read",
          });
          if (resolved.warnings?.length) {
            picker.setError(
              resolved.warnings
                .map((w: { message?: string }) => w.message || String(w))
                .join(" "),
            );
          }
          let pack: DynamicApi = resolved.pack,
            sourceCheck: null | any = null;
          if (!pack) {
            if (!context.panel) {
              if (!doc) {
                progress({
                  status: "partial",
                  message:
                    "공개 본문을 읽지 못했습니다. 정상 탭에서 다시 열거나 원본 다시 읽기를 사용해 주세요.",
                  busy: false,
                });
                return;
              }
              progress({
                status: "loading",
                phase: "tags",
                processed: null,
                total: null,
                message: "아이콘과 태그를 읽고 있어요.",
                busy: true,
              });
              const collected = this.site.readArticlePack(
                doc,
                context.articleId,
                context.title,
                context.boardId || "98",
                { diagnostics: this.options?.debug === true },
              );
              ensure();
              pack = collected.pack;
              log("body-collect", {
                selector: collected.selector,
                ...collected.counts,
              });
              publish(pack, { from: "article-body" });
              picker.setMetadataDiagnostics?.(collected.metadataDiagnostics);
              progress({
                status:
                  !pack.icons.length ||
                  collected.counts.excluded ||
                  collected.counts.tagErrors
                    ? "partial"
                    : "complete",
                phase: "ready",
                processed: pack.icons.length,
                loaded: pack.icons.length,
                total: pack.icons.length,
                message:
                  "NORMAL 본문 URL 수집 · 대상 " +
                  collected.counts.candidates +
                  "개 · 제외 " +
                  collected.counts.excluded +
                  "개 · 중복 " +
                  collected.counts.duplicates +
                  "개. " +
                  (!pack.icons.length
                    ? "지원하는 본문 미디어가 없습니다. "
                    : "") +
                  (collected.counts.tagErrors
                    ? "태그를 읽지 못한 이미지 " +
                      collected.counts.tagErrors +
                      "개는 태그 없이 표시합니다."
                    : ""),
                busy: false,
              });
            } else {
              progress({
                status: "loading",
                phase: "native",
                processed: null,
                total: null,
                message: "사이트 아이콘 목록이 준비되기를 기다리고 있어요.",
                busy: true,
              });
              const start = Date.now();
              let s = this.site.snapshot(context.panel, context.articleId);
              while (!s.ready && Date.now() - start < 10000) {
                await this.site.delay(100, signal);
                ensure();
                s = this.site.snapshot(context.panel, context.articleId);
              }
              ensure();
              pack = this.site.normalPack(s, context.articleId, context.title);
              publish(pack, { from: "native-panel", raw: s.rawCount });
              if (this.options.autoLoad !== false || manualNative) {
                const session = new this.site.NativeLoadSession({
                  articleId: context.articleId,
                  read: () =>
                    this.site.snapshot(context.panel, context.articleId),
                  click: (b: { click: () => { click: () => any } }) =>
                    b.click(),
                  isCurrent: current,
                  onProgress: (p: { rawCount: any }) => {
                    if (!current()) {
                      return;
                    }
                    publish(
                      this.site.normalPack(p, context.articleId, context.title),
                      { from: "native-panel", raw: p.rawCount },
                    );
                    progress(p);
                  },
                });
                const final = await session.run(signal);
                ensure();
                pack = this.site.normalPack(
                  final,
                  context.articleId,
                  context.title,
                );
              } else {
                progress({
                  status: s.done ? "complete" : "partial",
                  loaded: s.rawCount,
                  total: s.declaredTotal,
                  message:
                    "자동 추가 수집 꺼짐 · 원래 버튼 사용 후 설정에서 자동 수집을 켤 수 있습니다.",
                  busy: false,
                });
              }
            }
          } else {
            publish(pack, { from: "metadata" });
            if (resolved.v1Slaves?.length) {
              sourceCheck = await this.site.verifyReferences(resolved, {
                signal,
                readDocument: (id: any, opts?: {} | undefined) =>
                  readPublic(id, {
                    ...opts,
                    boardId: "98",
                    forceRead: refresh,
                  }),
                onProgress: (p: any) => {
                  if (current()) {
                    progress(p);
                  }
                },
              });
              ensure();
              // 팩 객체가 바뀌면 목록에 저장된 검색 인덱스도 다시 구성한다.
              pack = {
                ...pack,
                attributeReaderVersion: 2,
                mediaReaderVersion: 1,
              };
              publish(pack, {
                from: "metadata",
                stale: sourceCheck.status !== "complete",
              });
              progress({
                ...sourceCheck,
                phase: "ready",
                processed:
                  sourceCheck.processedCount ?? sourceCheck.verifiedCount,
                loaded: pack.icons.length,
                total: pack.icons.length,
                declaredCount: pack.icons.length,
                message:
                  sourceCheck.status === "partial"
                    ? "일부 원본 정보(URL·태그)를 확인하지 못했어요. 아래 안내를 확인해 주세요."
                    : "원본 아이콘과 태그를 확인했어요.",
                busy: false,
              });
              const problems = sourceCheck.states.filter(
                (s: DynamicApi) =>
                  s.status !== "verified" || s.metadataStatus === "partial",
              );
              if (problems.length) {
                picker.setError(
                  problems
                    .map(
                      (s: DynamicApi) =>
                        "글 " +
                        s.articleId +
                        ": " +
                        (s.message ||
                          [
                            s.status !== "verified"
                              ? "원본 URL " +
                                s.matched +
                                "/" +
                                s.declared +
                                "개 확인 · 나머지 URL 대응 미확인"
                              : "",
                            s.metadataStatus === "partial"
                              ? "일부 태그를 읽지 못했어요. 새로고침하거나 원본 태그를 확인해 주세요."
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")),
                    )
                    .join(" / "),
                );
              }
            } else {
              progress({
                status: "complete",
                phase: "ready",
                processed: pack.icons.length,
                loaded: pack.icons.length,
                total: pack.icons.length,
                message: "팩 정보를 읽었어요.",
                busy: false,
              });
            }
          }
          ensure();
          if (pack.kind === "NORMAL" && !pack.icons.length) {
            log("cache-write", { action: "skip-empty-normal", icons: 0 });
            if (transactional) {
              throw Object.assign(
                new Error("이 게시글에는 표시할 수 있는 아이콘이 없습니다."),
                { code: "PACK_EMPTY" },
              );
            }
            return;
          }
          // 기존 v1의 부분 출처 검증은 경고로 유지하며 새로운 팩 거절 조건으로 바꾸지 않는다.
          const completedProgress = {
            ...(latestProgress as DynamicApi | null),
            phase: "ready",
            processed: sourceCheck?.processedCount ?? pack.icons.length,
            loaded: pack.icons.length,
            total: pack.icons.length,
            busy: false,
          };
          progress({
            ...completedProgress,
            status: "loading",
            phase: "storage",
            message: "다음에 사용할 팩을 저장하고 있어요.",
            busy: true,
          });
          try {
            await this.browser.requestCache("put", {
              ...cacheFor(pack.kind),
              snapshot: { pack, kind: resolved.kind, sourceCheck },
              rawMetadata: resolved.rawMetadata,
            });
          } catch (_) {
            cacheWarning();
          }
          ensure();
          progress(completedProgress);
          ensure();
          if (transactional && pendingPack) {
            commit(pendingPack, pendingData);
          }
          return { ok: true, pack };
        } catch (error) {
          if (!current()) {
            return { ok: false, cancelled: true };
          }
          picker.setError(
            "[" +
              ((error as CodedError).code || "READ_FAILED") +
              "] " +
              (error as CodedError).message,
          );
          progress({
            status:
              (error as CodedError).code === "ABORTED" ? "stopped" : "error",
            message: (error as CodedError).message,
            busy: false,
          });
          return {
            ok: false,
            error: {
              code: (error as CodedError).code || "READ_FAILED",
              message: (error as CodedError).message,
            },
          };
        }
      }
      destroy() {
        this.destroyed = true;
        this.optionsRevision++;
        this.enabled = false;
        this.document.removeEventListener("click", this.onClick, true);
        global.removeEventListener?.("popstate", this.onNavigate);
        global.removeEventListener?.("hashchange", this.onNavigate);
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.composers?.stop();
        this.composers = null;
        this.stopSession(true);
        this.entry?.remove();
        this.entry = null;
      }
    }
    API.IconFeature = IconFeature;
    // 저장된 두 설정이 모두 켜진 경우에만 수집하며 import만으로 사이트 UI를 만들지 않는다.
    if (
      global.document &&
      API.BrowserAdapter &&
      /^(bbs|m)\.ruliweb\.com$/.test(global.location?.hostname || "")
    ) {
      const feature = new IconFeature();
      API.feature = feature;
      feature
        .start()
        .catch((_error) =>
          console.warn("[Aru Icons] 초기화 실패:", "ICONS_INIT_FAILED"),
        );
    }
  };
  initializeIconsFeature(
    typeof environment !== "undefined" ? environment : this,
  );

  return { icons: selectModuleExports(icons, ["IconFeature", "feature"]) };
}
