import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { createBundleUiRuntime } from "../src/runtime/icons.ts";
import { documentLifecycle } from "../src/runtime/document-lifecycle.ts";
export default defineContentScript({
  matches: contentMatches(6),
  runAt: "document_idle",
  world: "ISOLATED",
  main(ctx) {
    documentLifecycle(defaultEnvironment).register(
      "bundle-ui",
      (session) => {
        const state = isolatedState();
        const result = createBundleUiRuntime({
          environment: session.environment,
          initialIcons: state.icons,
          initialBundle: state.bundle,
        });
        Object.assign(state.icons, result.icons);
        Object.assign(state.bundle, result.bundle);
        const controller = session.environment.__aruBundleController;
        session.onCleanup(() => controller?.suspend());
      },
      ctx,
    );
  },
});
