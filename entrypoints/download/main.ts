import { createDownloadCore } from "../../docs/source/body-download/core.mjs";
import { createDownloadBrowserApi } from "../../docs/source/body-download/browser-api.mjs";
import { createDownloadEngine } from "../../docs/source/body-download/engine.mjs";
import { createDownloadUi } from "../../docs/source/body-download/ui.mjs";
const environment = globalThis;
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
