import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createMetadataUi } from "../docs/source/runtime/icons.mjs";
export default defineContentScript({
  matches: contentMatches(4),
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    const state = isolatedState();
    const result = createMetadataUi({
      environment: globalThis,
      initialIcons: state.icons,
      initialMetadata: state.metadata,
    });
    Object.assign(state.icons, result.icons);
    Object.assign(state.metadata, result.metadata);
  },
});
