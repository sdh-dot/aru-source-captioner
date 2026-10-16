import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createIconsComposerBridge } from "../docs/source/ruliweb-icons/composer-bridge.mjs";
export default defineContentScript({
  matches: contentMatches(0),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    createIconsComposerBridge({ environment: globalThis });
  },
});
