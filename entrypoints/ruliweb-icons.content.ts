import { isolatedState } from "../runtime/world-state";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import * as parser from "exifr";
import { createEnvironment } from "../runtime/environment";
import { createAttributionCore } from "../src/upload-attribution/core.ts";
import { createAttributionUi } from "../src/upload-attribution/ui.ts";
import { installFirefoxContent } from "../src/platform/firefox/content.ts";
import { installWhaleContent } from "../src/platform/whale/content.ts";
import { createIconReader } from "../src/runtime/icons.ts";
import { createPerformanceMetrics } from "../src/performance/metrics.ts";
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
