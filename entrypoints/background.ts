import { initSourceBackground } from "./features/source-caption/background.js";
import { initIconsBackground } from "./features/ruliweb-icons/background.bundle.js";
import { initBodyDownloadBackground } from "./features/body-download/background.bundle.js";

export default defineBackground(() => {
  initSourceBackground();
  initIconsBackground();
  initBodyDownloadBackground();
});
