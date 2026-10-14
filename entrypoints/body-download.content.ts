import { initBodyDownload } from "./features/body-download/content.bundle.js";

export default defineContentScript({
  matches: ["https://bbs.ruliweb.com/community/board/98/read/*"],
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    initBodyDownload();
  },
});
