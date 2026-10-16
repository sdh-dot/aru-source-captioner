// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/ruliweb-icons/pack-registry.json
  var pack_registry_default = {
    registryVersion: 1,
    packs: [
      {
        id: "ruliweb-4998",
        url: "https://m.ruliweb.com/community/board/98/read/4998",
        boardId: "98",
        articleId: 4998,
        name: "블루아카 백업용 여러캐릭터콘 (M)",
        thumbnail: null,
        enabled: true,
        expectedKind: "BUNDLE"
      }
    ]
  };

  // docs/source/ruliweb-icons/registry.mjs
  function createIconsRegistry() {
    return { icons: { packRegistry: JSON.parse(JSON.stringify(pack_registry_default)) } };
  }
  __name(createIconsRegistry, "createIconsRegistry");

  // docs/source/compat/ruliweb-icons-registry.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var result = createIconsRegistry({ environment: globalThis, dependencies: { icons: { "packRegistry": /* @__PURE__ */ __name(() => icons["packRegistry"], "packRegistry") } } });
  Object.assign(icons, result.icons);
})();
