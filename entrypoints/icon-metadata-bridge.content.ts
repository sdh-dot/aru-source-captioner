import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { installMetadataEditorBridge } from "../docs/source/icon-metadata/metadata-editor-bridge.mjs";
export default defineContentScript({
  matches: contentMatches(3),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    installMetadataEditorBridge(globalThis);
  },
});
