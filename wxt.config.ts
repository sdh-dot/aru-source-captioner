import { defineConfig } from "wxt";
import { manifest } from "./manifest.ts"
import { resolve } from "node:path"

const contentScriptOrder = [
  "ruliweb-composer",
  "ruliweb-icons",
  "body-download",
  "icon-metadata-bridge",
  "icon-metadata",
  "bundle-generator-bridge",
  "bundle-generator",
];

// @TODO remove hardcoded path
const chromeExec = "C:/Program Files/Google/Chrome Beta/Application/chrome.exe"

export default defineConfig({
  manifestVersion: 3,
  manifest: manifest,
  hooks: {
    // Preserve the legacy manifest order when WXT discovers files alphabetically.
    "entrypoints:found": (_wxt, entrypoints) => {
      const rank = (name: string) => {
        const index = contentScriptOrder.indexOf(name);
        return index === -1 ? contentScriptOrder.length : index;
      };
      entrypoints.sort((a, b) => rank(a.name) - rank(b.name));
    },
  },
  webExt: {
    binaries: {
      chrome: chromeExec, // Use Chrome Beta instead of regular Chrome
    },
    chromiumArgs: ["--remote-debugging-port=8327"],
    startUrls: ["https://bbs.ruliweb.com/community/board/300143"],
    chromiumProfile: resolve(".chrome"),
    keepProfileChanges: true,
    chromiumPort: 8326,
  },
})
