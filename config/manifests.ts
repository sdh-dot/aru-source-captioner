import type { UserManifest } from "wxt";
import firefox from "../firefox/manifest.json";
import chromium from "../whale/manifest.json";

export const contentOrder = [
  "ruliweb-composer",
  "ruliweb-icons",
  "body-download",
  "icon-metadata-bridge",
  "icon-metadata",
  "bundle-generator-bridge",
  "bundle-generator",
];
export function legacyManifest(browser: string) {
  return browser === "firefox" ? firefox : chromium;
}
export function contentMatches(index: number): string[] {
  return legacyManifest(import.meta.env.BROWSER).content_scripts[index].matches;
}
export function createManifest(browser: string): UserManifest {
  // 등록 파일명은 WXT가 생성하되 기존 권한·ID·버전·모바일 URL 범위를 보존한다.
  const {
    manifest_version: _version,
    background: _background,
    content_scripts: _scripts,
    options_ui: _options,
    ...manifest
  } = legacyManifest(browser);
  return manifest as UserManifest;
}
