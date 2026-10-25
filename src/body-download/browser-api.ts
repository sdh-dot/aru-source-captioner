import { contextEffectGate } from "../runtime/context-effect-gate.ts";
import type { DynamicApi } from "../runtime/contracts.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 다운로드 설정과 로컬 원장에 대한 Promise·callback 브라우저 API 차이를 흡수한다.
import {
  createModuleScope,
  selectModuleExports,
} from "../runtime/module-scope.ts";

export function createDownloadBrowserApi({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const effectGate = contextEffectGate(environment);
  let downloads = createModuleScope(
    dependencies.downloads,
    ["error", "JOB_KEY"],
    ["api", "call", "options", "readJob", "writeJob", "ownsDownload"],
  );
  const initializeDownloadBrowserApi = function (root: RuntimeEnvironment) {
    "use strict";
    const D = downloads,
      promise = !!root.browser?.runtime,
      api = promise ? root.browser : root.chrome;
    function invoke(
      target: DynamicApi,
      method: string,
      ...args: unknown[]
    ): Promise<DynamicApi> {
      if (!target || typeof target[method] !== "function") {
        return Promise.reject(
          D.error(
            "API_UNAVAILABLE",
            "브라우저 기능을 사용할 수 없습니다: " + method,
          ),
        );
      }
      if (promise) {
        try {
          return Promise.resolve(target[method](...args));
        } catch (err) {
          return Promise.reject(err);
        }
      }
      return new Promise<DynamicApi>((resolve, reject) => {
        try {
          target[method](...args, (value: DynamicApi) => {
            try {
              effectGate.assert();
              const err = api!.runtime.lastError;
              if (err) {
                reject(D.error("BROWSER_API", err.message));
              } else {
                resolve(value);
              }
            } catch (error) {
              effectGate.observeError(error);
              reject(error);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    }
    function call(
      target: DynamicApi,
      method: string,
      ...args: unknown[]
    ): Promise<DynamicApi> {
      try {
        effectGate.assert();
        return invoke(target, method, ...args).then(
          (value) => {
            effectGate.assert();
            return value;
          },
          (error) => {
            effectGate.observeError(error);
            throw error;
          },
        );
      } catch (error) {
        effectGate.observeError(error);
        return Promise.reject(error);
      }
    }
    async function options() {
      const value = await call(api!.storage.sync, "get", [
        "enabled",
        "aruBodyDownloadOptions",
      ]);
      return (
        (value.enabled === undefined || value.enabled === true) &&
        value.aruBodyDownloadOptions?.enabled === true
      );
    }
    async function readJob(id: any) {
      const stored = await call(api!.storage.local, "get", [
        D.JOB_KEY,
        "aruBodyDownloadErrorV1",
      ]);
      const current = stored[D.JOB_KEY] || null;
      return id && current?.id !== id
        ? stored.aruBodyDownloadErrorV1 || null
        : current;
    }
    async function writeJob(job: any) {
      await call(api!.storage.local, "set", { [D.JOB_KEY]: job });
    }
    function own(item: { url: string }) {
      const base = api?.runtime?.getURL?.("");
      return (
        !!base &&
        typeof item.url === "string" &&
        item.url.startsWith("blob:" + base)
      );
    }
    Object.assign(D, {
      api,
      call,
      options,
      readJob,
      writeJob,
      ownsDownload: own,
    });
  };
  initializeDownloadBrowserApi(environment);

  return {
    downloads: selectModuleExports(downloads, [
      "api",
      "call",
      "options",
      "readJob",
      "writeJob",
      "ownsDownload",
    ]),
  };
}
