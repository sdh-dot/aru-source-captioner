import {
  defaultEnvironment,
  type RuntimeOptions,
  type DynamicApi,
} from "./contracts.ts";
// 다운로드의 공통 Core/API를 한 번만 생성하고 브라우저별 실행 진입점을 연결한다.
import { createDownloadCore } from "../body-download/core.ts";
import { createDownloadBrowserApi } from "../body-download/browser-api.ts";
import { createDownloadBackground } from "../body-download/background.ts";
import { createDownloadContent } from "../body-download/content.ts";
import { createDownloadExtractor } from "../body-download/extractor.ts";
function installDownloadBackground({
  environment = defaultEnvironment,
  initial = {},
}: RuntimeOptions = {}) {
  const downloads: DynamicApi = { ...initial };
  let part;
  part = createDownloadCore({ environment, dependencies: { downloads: {} } });
  Object.assign(downloads, part.downloads);
  part = createDownloadBrowserApi({
    environment,
    dependencies: {
      downloads: {
        error: () => downloads["error"],
        JOB_KEY: () => downloads["JOB_KEY"],
      },
    },
  });
  Object.assign(downloads, part.downloads);
  part = createDownloadBackground({
    environment,
    dependencies: {
      downloads: {
        api: () => downloads["api"],
        options: () => downloads["options"],
        call: () => downloads["call"],
        writeJob: () => downloads["writeJob"],
        error: () => downloads["error"],
        article: () => downloads["article"],
        readJob: () => downloads["readJob"],
        actualName: () => downloads["actualName"],
        mediaUrl: () => downloads["mediaUrl"],
        folder: () => downloads["folder"],
      },
    },
  });
  return { downloads };
}
function installDownloadContent({
  environment = defaultEnvironment,
  initial = {},
}: RuntimeOptions = {}) {
  const downloads = { ...initial };
  let part;
  part = createDownloadCore({ environment, dependencies: { downloads: {} } });
  Object.assign(downloads, part.downloads);
  part = createDownloadBrowserApi({
    environment,
    dependencies: {
      downloads: {
        error: () => downloads["error"],
        JOB_KEY: () => downloads["JOB_KEY"],
      },
    },
  });
  Object.assign(downloads, part.downloads);
  part = createDownloadExtractor({
    environment,
    dependencies: {
      downloads: {
        error: () => downloads.error,
        article: () => downloads.article,
        mediaUrl: () => downloads.mediaUrl,
        streamMedia: () => downloads.streamMedia,
        originalFilename: () => downloads.originalFilename,
      },
    },
  });
  Object.assign(downloads, part.downloads);
  part = createDownloadContent({
    environment,
    dependencies: {
      downloads: {
        api: () => downloads["api"],
        error: () => downloads["error"],
        options: () => downloads["options"],
        article: () => downloads["article"],
        extract: () => downloads["extract"],
      },
    },
  });
  return { downloads };
}
export { installDownloadBackground, installDownloadContent };
