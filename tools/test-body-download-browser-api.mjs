import assert from "node:assert/strict";
import { fakeBrowser } from "wxt/testing/fake-browser";

globalThis.browser = fakeBrowser;
globalThis.chrome = fakeBrowser;
const { options, readJob, writeJob, ownsDownload } =
  await import("../entrypoints/features/body-download/browser-api.ts");

for (const [stored, expected] of [
  [{}, false],
  [{ aruBodyDownloadOptions: { enabled: true } }, true],
  [{ enabled: true, aruBodyDownloadOptions: { enabled: true } }, true],
  [{ enabled: false, aruBodyDownloadOptions: { enabled: true } }, false],
  [{ enabled: true, aruBodyDownloadOptions: { enabled: false } }, false],
]) {
  await fakeBrowser.storage.sync.clear();
  await fakeBrowser.storage.sync.set(stored);
  assert.equal(await options(), expected);
}

// fake-browser treats stored null as missing; supply it explicitly for this case.
const originalSyncGet = fakeBrowser.storage.sync.get;
fakeBrowser.storage.sync.get = async () => ({
  enabled: null,
  aruBodyDownloadOptions: { enabled: true },
});
try {
  assert.equal(await options(), false);
} finally {
  fakeBrowser.storage.sync.get = originalSyncGet;
}

assert.equal(await readJob(), null);
const job = { id: "current", status: "prepared", images: [] };
await writeJob(job);
assert.deepEqual(await fakeBrowser.storage.local.get("aruBodyDownloadJobV1"), {
  aruBodyDownloadJobV1: job,
});
assert.deepEqual(await readJob(), job);
assert.deepEqual(await readJob("current"), job);
assert.equal(await readJob("other"), null);
const failed = { id: "failed", status: "error" };
await fakeBrowser.storage.local.set({ aruBodyDownloadErrorV1: failed });
assert.deepEqual(await readJob("failed"), failed);
assert.deepEqual(await readJob("current"), job);

const base = fakeBrowser.runtime.getURL("");
assert.equal(ownsDownload({ url: `blob:${base}media` }), true);
assert.equal(
  ownsDownload({ url: "blob:https://bbs.ruliweb.com/media" }),
  false,
);
assert.equal(ownsDownload({ url: `${base}media` }), false);
assert.equal(ownsDownload({}), false);

const originalGet = fakeBrowser.storage.local.get;
const failure = new Error("storage unavailable");
fakeBrowser.storage.local.get = async () => {
  throw failure;
};
try {
  await assert.rejects(readJob(), (error) => error === failure);
} finally {
  fakeBrowser.storage.local.get = originalGet;
}

console.log(
  "Body download browser API: options, jobs, ownership, and rejection verified.",
);
