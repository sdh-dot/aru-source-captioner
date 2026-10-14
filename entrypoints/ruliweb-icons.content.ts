import { initIcons } from "./features/ruliweb-icons/content.bundle.js";
import { initExifr } from "./features/source-caption/exifr.js";
import { initSourceCaption } from "./features/source-caption/content.js";
import "./features/source-caption/styles.css";

export default defineContentScript({
  matches: [
    "https://bbs.ruliweb.com/community/board/300143/*",
    "https://bbs.ruliweb.com/community/board/*/read/*",
  ],
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    initExifr();
    initSourceCaption();
    initIcons();
  },
});
