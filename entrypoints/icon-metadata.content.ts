import { documentLifecycle } from "../src/runtime/document-lifecycle.ts";
import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createMetadataUi } from "../src/runtime/icons.ts";
export default defineContentScript({
  matches: contentMatches(4),
  runAt: "document_idle",
  world: "ISOLATED",
  main(ctx) {
    documentLifecycle(defaultEnvironment).register(
      "metadata-ui",
      (session) => {
        const state = isolatedState();
        const result = createMetadataUi({
          environment: session.environment,
          initialIcons: state.icons,
          initialMetadata: state.metadata,
        });
        Object.assign(state.icons, result.icons);
        Object.assign(state.metadata, result.metadata);
      },
      ctx,
    );
  },
});
