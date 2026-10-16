import { defaultEnvironment } from "../src/runtime/contracts.ts";
import { defineBackground } from "wxt/utils/define-background";
import { installFirefoxBackground } from "../src/platform/firefox/background.ts";
import { installWhaleBackground } from "../src/platform/whale/background.ts";
import { createIconsBackground } from "../src/ruliweb-icons/background.ts";
import { installDownloadBackground } from "../src/runtime/downloads.ts";
export default defineBackground(() => {
  // Native 다운로드 완료 처리가 공통 다운로드의 소유권 판별자를 늦게 조회해야 한다.
  const downloads = {};
  const install = import.meta.env.FIREFOX
    ? installFirefoxBackground
    : installWhaleBackground;
  install({
    environment: defaultEnvironment,
    dependencies: {
      downloads: { ownsDownload: () => Reflect.get(downloads, "ownsDownload") },
    },
  });
  createIconsBackground({ environment: defaultEnvironment });
  Object.assign(
    downloads,
    installDownloadBackground({
      environment: defaultEnvironment,
      initial: downloads,
    }).downloads,
  );
});
