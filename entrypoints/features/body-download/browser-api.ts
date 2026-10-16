import { browser } from "wxt/browser";
import { JOB_KEY } from "./core.ts";

export type DownloadJob = { id: string; [key: string]: unknown };

export async function options() {
  const value: {
    enabled?: boolean | null;
    aruBodyDownloadOptions?: { enabled?: boolean } | null;
  } = await browser.storage.sync.get(["enabled", "aruBodyDownloadOptions"]);
  return (
    (value.enabled === undefined || value.enabled === true) &&
    value.aruBodyDownloadOptions?.enabled === true
  );
}

export async function readJob(id?: string | null) {
  const stored: {
    [JOB_KEY]?: DownloadJob | null;
    aruBodyDownloadErrorV1?: DownloadJob | null;
  } = await browser.storage.local.get([JOB_KEY, "aruBodyDownloadErrorV1"]);
  const current = stored[JOB_KEY] || null;
  return id && current?.id !== id
    ? stored.aruBodyDownloadErrorV1 || null
    : current;
}

export async function writeJob(job: DownloadJob) {
  await browser.storage.local.set({ [JOB_KEY]: job });
}

export function ownsDownload(item: { url?: string }) {
  const base = browser.runtime.getURL("");
  return (
    !!base &&
    typeof item.url === "string" &&
    item.url.startsWith("blob:" + base)
  );
}
