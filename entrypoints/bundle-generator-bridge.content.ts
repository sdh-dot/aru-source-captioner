import { initBundleBridge } from "./features/bundle-generator/bridge.bundle.js";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/98/write*",
    "https://bbs.ruliweb.com/community/board/98/modify*",
  ],
  runAt: "document_idle",
  world: "MAIN",
  main() {
    initBundleBridge();
  },
});
