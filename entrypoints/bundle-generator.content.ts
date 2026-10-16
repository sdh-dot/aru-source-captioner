import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createBundleUiRuntime } from "../docs/source/runtime/icons.mjs";
export default defineContentScript({
  matches: contentMatches(6),
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    const state = isolatedState();
    const result = createBundleUiRuntime({
      environment: globalThis,
      initialIcons: state.icons,
      initialBundle: state.bundle,
    });
    Object.assign(state.icons, result.icons);
    Object.assign(state.bundle, result.bundle);
  },
});
