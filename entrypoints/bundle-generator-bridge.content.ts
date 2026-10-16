import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createBundleMain } from "../docs/source/runtime/icons.mjs";
export default defineContentScript({
  matches: contentMatches(5),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    createBundleMain({ environment: globalThis });
  },
});
