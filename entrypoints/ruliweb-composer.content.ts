import { initComposerBridge } from "./features/ruliweb-icons/composer-bridge.js";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/300143/*",
    "https://bbs.ruliweb.com/community/board/*/read/*",
  ],
  runAt: "document_idle",
  world: "MAIN",
  main() {
    initComposerBridge();
  },
});
