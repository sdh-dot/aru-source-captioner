import { initMetadataBridge } from "./features/icon-metadata/bridge.bundle.js";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/*/write*",
    "https://bbs.ruliweb.com/community/board/*/modify*",
  ],
  runAt: "document_idle",
  world: "MAIN",
  main() {
    initMetadataBridge();
  },
});
