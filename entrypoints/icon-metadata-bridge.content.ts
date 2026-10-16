import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { installMetadataEditorBridge } from "../src/icon-metadata/metadata-editor-bridge.ts";
export default defineContentScript({
  matches: contentMatches(3),
  runAt: "document_idle",
  world: "MAIN",
  main() {
    installMetadataEditorBridge(defaultEnvironment);
  },
});
