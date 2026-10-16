import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { installDownloadContent } from "../docs/source/runtime/downloads.mjs";
export default defineContentScript({
  matches: contentMatches(2),
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    installDownloadContent({ environment: globalThis });
  },
});
