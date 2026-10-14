import { initMetadata } from "./features/icon-metadata/content.bundle.js";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/*/write*",
    "https://bbs.ruliweb.com/community/board/*/modify*",
  ],
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    initMetadata();
  },
});
