import { documentLifecycle } from "../src/runtime/document-lifecycle.ts";
import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { defineContentScript } from "wxt/utils/define-content-script";
import { contentMatches } from "../config/manifests";
import { installDownloadContent } from "../src/runtime/downloads.ts";
export default defineContentScript({
  matches: contentMatches(2),
  runAt: "document_idle",
  world: "ISOLATED",
  main(ctx) {
    documentLifecycle(defaultEnvironment).register(
      "body-download",
      (session) => {
        installDownloadContent({ environment: session.environment });
      },
      ctx,
    );
  },
});
