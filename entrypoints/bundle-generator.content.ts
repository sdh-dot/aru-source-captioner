import { initBundleGenerator } from "./features/bundle-generator/content.bundle.js";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/98/write*",
    "https://bbs.ruliweb.com/community/board/98/modify*",
  ],
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    initBundleGenerator();
  },
});
