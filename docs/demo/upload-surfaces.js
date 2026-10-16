// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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

  // docs/demo/upload-surfaces.mjs
  function installUploadDemo({ environment = globalThis, dependencies = {} } = {}) {
    const window = environment.window ?? environment;
    const { document, location, chrome, browser, URL, URLSearchParams } = environment;
    let icons2 = createModuleScope(dependencies.icons, ["ComposerController", "Metadata", "LibrarySearchEngine", "createPicker"], ["Metadata"]);
    let metadata2 = createModuleScope(dependencies.metadata, ["Controller", "Panel"], []);
    let bundle2 = createModuleScope(dependencies.bundle, ["Controller", "Panel", "Draft"], []);
    let uploadUI2 = createModuleScope(dependencies.uploadUI, [], []);
    const initializeUploadDemo = /* @__PURE__ */ __name(async () => {
      const params = new URLSearchParams(location.search), view = params.get("view") || "controls";
      const base = new URL("../../", location.href);
      window.chrome = { runtime: { getURL: /* @__PURE__ */ __name((file) => new URL("whale/" + file, base).href, "getURL") } };
      window.__aruMetadataNoAutoStart = window.__aruBundleNoAutoStart = window.__aruUploadNoAutoStart = true;
      if (params.get("theme") === "dark") document.body.dataset.theme = "dark";
      const load = /* @__PURE__ */ __name((file) => new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = new URL(file, base).href;
        s.onload = resolve;
        s.onerror = reject;
        document.head.append(s);
      }), "load");
      for (const file of ["whale/features/icon-metadata/content.bundle.js", "whale/features/bundle-generator/content.bundle.js", "docs/source/upload-attribution/ui.js"]) await load(file);
      const A = icons2, M = metadata2, B = bundle2;
      const nativeButton = document.querySelector("#native-upload");
      let calls = 0;
      nativeButton.addEventListener("click", () => document.querySelector("#native-result").textContent = "기존 클릭 이벤트 " + ++calls + "회 확인 · 실제 파일 선택기/업로드를 실행하지 않음");
      new uploadUI2(document);
      const c = new A.ComposerController({ document, onOpen: /* @__PURE__ */ __name(() => {
      }, "onOpen") });
      c.start();
      const m = new M.Controller({ document });
      m.client.request = async () => ({ images: 97, videos: 3, total: 100, policyImages: 97, limit: null });
      m.active = true;
      m.discover();
      const b = new B.Controller({ document });
      b.active = true;
      b.discover();
      const media = new URL("media/sample-0.png", location.href).href;
      if (view === "tags") {
        const data = { session: "synthetic-tags", collisions: 0, canUndo: false, canRedo: false, images: Array.from({ length: 100 }, (_, index) => ({ handle: "synthetic-" + index, index, alt: "샘플 " + index, src: media, id: "id-" + index, tags: ["아루", "미소"] })) };
        new M.Panel({ document, client: { request: /* @__PURE__ */ __name(async (op) => op === "scan" ? data : {}, "request") }, token: "synthetic", onClose() {
        } });
      } else if (view === "bundle") {
        const client = { request: /* @__PURE__ */ __name(async (op) => op === "scan" ? { session: "synthetic-bundle", articleId: null, value: null } : { changed: false }, "request") };
        new B.Panel({
          document,
          client,
          token: "synthetic",
          reader: { pending: /* @__PURE__ */ new Map(), read: /* @__PURE__ */ __name(async () => {
            throw new Error("실제 사이트 조회 없음");
          }, "read"), cancel() {
          }, destroy() {
          } },
          searcher: { search: /* @__PURE__ */ __name(async () => ({ items: [] }), "search"), cancel() {
          }, destroy() {
          } },
          browser: { saveDraft: /* @__PURE__ */ __name(async () => {
          }, "saveDraft"), loadDraft: /* @__PURE__ */ __name(async () => new B.Draft(), "loadDraft") },
          onClose() {
          }
        });
      } else if (view === "select") {
        await load("docs/source/ruliweb-icons/picker.js");
        const original = A.Metadata.mediaUrl;
        A.Metadata = { ...A.Metadata, mediaUrl: /* @__PURE__ */ __name((value) => value.startsWith(location.origin + "/docs/demo/media/") ? value : original(value), "mediaUrl") };
        const pack = { kind: "BUNDLE", articleId: 6e3, title: "합성 샘플 통합팩", tags: [], categories: [], sources: [], icons: Array.from({ length: 608 }, (_, index) => ({ id: "synthetic-" + index, name: "샘플 " + (index + 1), url: media + "?index=" + index, mediaKind: "image", tagIds: [], categoryIds: [], keywords: [], sourceId: "synthetic-source", origin: { articleId: 6001, originalIndex: index }, imageMetadata: { id: "synthetic-" + index, tags: ["아루", index % 2 ? "미소" : "인사"] } })) };
        const engine = new A.LibrarySearchEngine();
        const ref = { articleId: 6e3, boardId: "98", source: "direct", title: pack.title, url: "https://bbs.ruliweb.com/community/board/98/read/6000" };
        engine.setEntries([ref]);
        engine.remember(ref, pack);
        engine.setState({ scope: "current", currentKey: "98:6000" });
        const picker = A.createPicker({ librarySearch: engine, insertionMode: true, targetValid: true, catalogMode: false, uiPreferences: { read: /* @__PURE__ */ __name(async () => null, "read"), write: /* @__PURE__ */ __name(async () => {
        }, "write") }, onSelect: /* @__PURE__ */ __name(async () => ({ message: "로컬 콜백 확인 · 실제 작성기 변경 없음" }), "onSelect") });
        picker.setPack(pack);
      }
    }, "initializeUploadDemo");
    initializeUploadDemo().catch((error) => document.querySelector("#native-result").textContent = "합성 화면 오류: " + error.message);
    return { "icons": selectModuleExports(icons2, ["Metadata"]) };
  }
  __name(installUploadDemo, "installUploadDemo");

  // docs/source/compat/docs-demo-upload-surfaces.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var metadata = globalThis.AruMetadata = globalThis.AruMetadata || {};
  var bundle = globalThis.AruBundle = globalThis.AruBundle || {};
  var uploadUI = globalThis.AruUploadUI = globalThis.AruUploadUI || {};
  var result = installUploadDemo({ environment: globalThis, dependencies: {
    icons: { "ComposerController": /* @__PURE__ */ __name(() => icons["ComposerController"], "ComposerController"), "Metadata": /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata"), "LibrarySearchEngine": /* @__PURE__ */ __name(() => icons["LibrarySearchEngine"], "LibrarySearchEngine"), "createPicker": /* @__PURE__ */ __name(() => icons["createPicker"], "createPicker") },
    metadata: { "Controller": /* @__PURE__ */ __name(() => metadata["Controller"], "Controller"), "Panel": /* @__PURE__ */ __name(() => metadata["Panel"], "Panel") },
    bundle: { "Controller": /* @__PURE__ */ __name(() => bundle["Controller"], "Controller"), "Panel": /* @__PURE__ */ __name(() => bundle["Panel"], "Panel"), "Draft": /* @__PURE__ */ __name(() => bundle["Draft"], "Draft") },
    uploadUI: {}
  } });
  Object.assign(icons, result.icons);
})();
