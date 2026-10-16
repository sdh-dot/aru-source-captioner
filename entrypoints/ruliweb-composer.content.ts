import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createIconsComposerBridge } from "../src/ruliweb-icons/composer-bridge.ts";
export default defineContentScript({
  matches: contentMatches(0),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    createIconsComposerBridge({ environment: defaultEnvironment });
  },
});
