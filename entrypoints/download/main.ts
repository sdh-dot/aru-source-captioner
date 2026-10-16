import { defaultEnvironment } from "../../src/runtime/contracts.ts";
import { createDownloadCore } from "../../src/body-download/core.ts";
import { createDownloadBrowserApi } from "../../src/body-download/browser-api.ts";
import { createDownloadEngine } from "../../src/body-download/engine.ts";
import { createDownloadUi } from "../../src/body-download/ui.ts";
const environment = defaultEnvironment;
const downloads = createDownloadCore({ environment }).downloads;
const dependencies = {
  downloads: new Proxy(
    {},
    { get: (_target, key) => () => Reflect.get(downloads, key) },
  ),
};
Object.assign(
  downloads,
  createDownloadBrowserApi({ environment, dependencies }).downloads,
);
Object.assign(
  downloads,
  createDownloadEngine({ environment, dependencies }).downloads,
);
createDownloadUi({ environment, dependencies });
