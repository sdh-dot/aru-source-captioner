import { defineConfig } from "wxt";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentOrder, createManifest } from "./config/manifests";

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => createManifest(browser),
  imports: false,
  hooks: {
    "entrypoints:found": (_wxt, entries) => {
      entries.sort(
        (a, b) => contentOrder.indexOf(a.name) - contentOrder.indexOf(b.name),
      );
    },
    "entrypoints:resolved": (wxt, entries) => {
      // 저장된 관리 탭 URL과 다운로드 소유권 판별 경로를 변경하지 않는다.
      const page = entries.find((entry) => entry.name === "download");
      if (page) {
        page.outputDir = resolve(wxt.config.outDir, "features/body-download");
      }
    },
  },
  vite: ({ browser }) => ({
    plugins: [
      {
        name: "aru-options-template",
        transformIndexHtml: {
          order: "pre",
          handler(html, context) {
            if (
              !context.filename
                .replaceAll("\\", "/")
                .endsWith("/entrypoints/options/index.html")
            ) {
              return html;
            }
            return readFileSync(
              resolve(
                browser === "firefox"
                  ? "firefox/options.html"
                  : "whale/options.html",
              ),
              "utf8",
            )
              .replace(
                /<script src="options.js"><\/script>/,
                '<script type="module" src="./main.ts"></script>',
              )
              .replace('href="options.css"', 'href="./options.css"');
          },
        },
      },
    ],
  }),
});
