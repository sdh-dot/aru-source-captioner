import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createBundleMain } from "../src/runtime/icons.ts";
export default defineContentScript({
  matches: contentMatches(5),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    createBundleMain({ environment: defaultEnvironment });
  },
});
