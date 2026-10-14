import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".output/chrome-mv3");
const read = (file) => fs.readFileSync(file, "utf8");
const legacy = JSON.parse(read(path.join(root, "_old/whale/manifest.json")));
const manifest = JSON.parse(read(path.join(output, "manifest.json")));
const names = [
  "ruliweb-composer",
  "ruliweb-icons",
  "body-download",
  "icon-metadata-bridge",
  "icon-metadata",
  "bundle-generator-bridge",
  "bundle-generator",
];

for (const key of [
  "manifest_version",
  "name",
  "version",
  "description",
  "permissions",
  "host_permissions",
  "action",
  "background",
  "options_ui",
  "web_accessible_resources",
]) {
  assert.deepEqual(manifest[key], legacy[key], key);
}
for (const [size, file] of Object.entries(legacy.icons)) {
  assert.equal(manifest.icons[size], file);
}
assert.equal(manifest.content_scripts.length, legacy.content_scripts.length);
for (const [index, expected] of legacy.content_scripts.entries()) {
  const actual = manifest.content_scripts[index];
  assert.deepEqual([...actual.matches].sort(), [...expected.matches].sort());
  assert.equal(actual.run_at, expected.run_at);
  assert.equal(actual.world, expected.world ?? "ISOLATED");
  assert.deepEqual(actual.js, [`content-scripts/${names[index]}.js`]);
  assert.equal(!!actual.css?.length, !!expected.css?.length);
}

const referenced = [
  manifest.background.service_worker,
  manifest.options_ui.page,
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap((script) => [
    ...script.js,
    ...(script.css ?? []),
  ]),
  ...manifest.web_accessible_resources.flatMap((entry) => entry.resources),
];
for (const file of referenced)
  assert.ok(fs.existsSync(path.join(output, file)), file);

// The download manager keeps its legacy URL and ordered local scripts for now.
const downloadPage = path.join(output, "features/body-download/download.html");
const downloadHtml = read(downloadPage);
for (const match of downloadHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert.ok(
    fs.existsSync(path.resolve(path.dirname(downloadPage), match[1])),
    match[1],
  );
}

// Exercise the generated bundle, with features disabled to avoid site/network work.
const dom = new JSDOM("<html><body></body></html>", {
  url: "https://bbs.ruliweb.com/community/board/300143/read/1",
  runScripts: "outside-only",
});
const errors = [];
dom.window.console.warn = (...args) => errors.push(args);
dom.window.console.error = (...args) => errors.push(args);
dom.window.console.info = () => {};
dom.window.chrome = {
  runtime: { id: "test-extension" },
  storage: {
    sync: {
      get: (_keys, callback) =>
        callback({ enabled: false, aruIconsOptions: { enabled: false } }),
    },
    onChanged: { addListener() {}, removeListener() {} },
  },
};
try {
  dom.window.eval(read(path.join(output, "content-scripts/ruliweb-icons.js")));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(typeof dom.window.exifr?.parse, "function");
  assert.ok(dom.window.AruIcons?.feature);
  assert.deepEqual(errors, []);
} finally {
  dom.window.close();
}
console.log(
  "WXT manifest: 7 legacy groups, resources, and bundled startup verified.",
);
