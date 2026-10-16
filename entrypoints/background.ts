import { defineBackground } from "wxt/utils/define-background";
import { installFirefoxBackground } from "../docs/source/platform/firefox/background.mjs";
import { installWhaleBackground } from "../docs/source/platform/whale/background.mjs";
import { createIconsBackground } from "../docs/source/ruliweb-icons/background.mjs";
import { installDownloadBackground } from "../docs/source/runtime/downloads.mjs";
export default defineBackground(() => {
  // Native 다운로드 완료 처리가 공통 다운로드의 소유권 판별자를 늦게 조회해야 한다.
  const downloads = {};
  const install = import.meta.env.FIREFOX
    ? installFirefoxBackground
    : installWhaleBackground;
  install({
    environment: globalThis,
    dependencies: {
      downloads: { ownsDownload: () => Reflect.get(downloads, "ownsDownload") },
    },
  });
  createIconsBackground({ environment: globalThis });
  Object.assign(
    downloads,
    installDownloadBackground({ environment: globalThis, initial: downloads })
      .downloads,
  );
});
