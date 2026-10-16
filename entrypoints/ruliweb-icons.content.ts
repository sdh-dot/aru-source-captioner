import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import * as parser from "exifr";
import { createEnvironment } from "../runtime/environment";
import { createAttributionCore } from "../docs/source/upload-attribution/core.mjs";
import { createAttributionUi } from "../docs/source/upload-attribution/ui.mjs";
import { installFirefoxContent } from "../docs/source/platform/firefox/content.mjs";
import { installWhaleContent } from "../docs/source/platform/whale/content.mjs";
import { createIconReader } from "../docs/source/runtime/icons.mjs";
import { createPerformanceMetrics } from "../docs/source/performance/metrics.mjs";
import "../whale/styles.css";
export default defineContentScript({
  matches: contentMatches(1),
  runAt: "document_idle",
  world: "ISOLATED",
  main() {
    const environment = createEnvironment(parser);
    const metrics = createPerformanceMetrics({ environment });
    const { attribution } = createAttributionCore({ environment, metrics });
    const install = import.meta.env.FIREFOX
      ? installFirefoxContent
      : installWhaleContent;
    install({
      environment,
      dependencies: {
        attribution: { Controller: () => attribution.Controller },
      },
    });
    const icons = createIconReader({ environment, metrics });
    Object.assign(isolatedState().icons, icons);
    createAttributionUi({
      environment,
      metrics,
      dependencies: {
        icons: { DesignSystem: () => Reflect.get(icons, "DesignSystem") },
      },
    });
  },
});
