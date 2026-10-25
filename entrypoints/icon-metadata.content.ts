import { bindContextEffectGate } from "../src/runtime/context-effect-gate.ts";
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
    if (!bindContextEffectGate(defaultEnvironment, ctx).allows()) {
      return;
    }
    const state = isolatedState();
    const result = createMetadataUi({
      environment: defaultEnvironment,
      initialIcons: state.icons,
      initialMetadata: state.metadata,
    });
    Object.assign(state.icons, result.icons);
    Object.assign(state.metadata, result.metadata);
  },
});
