import { readSettings, subscribeSettings } from "../runtime/settings-read.ts";
import type { DynamicApi, CodedError } from "../runtime/contracts.ts";

import {
  defaultEnvironment,
  type RuntimeEnvironment,
} from "../runtime/contracts.ts";
// Promise/callback 차이와 Chromium JSON 바이트 포맷을 이 경계에서 보존한다.
export function createBrowserAdapter(
  root: RuntimeEnvironment = defaultEnvironment,
) {
  const defaults = Object.freeze({
    enabled: false as boolean,
    autoLoad: true,
    preferredSort: "source",
    localOverlay: true,
  });
  let promiseApi = false;
  let api: DynamicApi | undefined;
  try {
    promiseApi = !!(root.browser?.runtime && root.browser.storage);
    api = promiseApi ? root.browser : root.chrome;
  } catch {
    // 설정 getter의 실패는 readOptions의 유한 조회에서 판정한다.
  }

  function failure(code: string, message?: string | undefined): CodedError {
    const error = new Error(message);
    (error as CodedError).code = code;
    return error;
  }
  const BYTE_MARKER = "$aruIconsBytesV1";
  function carrierBytes(value: any, encode: boolean): any {
    let nodes = 0;
    const seen = new Set();
    const invalid = () =>
      failure(
        "INVALID_REQUEST",
        "메타데이터 원본 바이트를 캐시에 전달할 수 없습니다.",
      );
    function visit(item: any, depth: number): any {
      if (++nodes > 1000000 || depth > 20) {
        throw invalid();
      }
      if (!item || typeof item !== "object") {
        return item;
      }
      if (ArrayBuffer.isView(item)) {
        if (
          Object.prototype.toString.call(item) !== "[object Uint8Array]" ||
          item.byteLength > 1048576
        ) {
          throw invalid();
        }
        if (!encode) {
          return new Uint8Array(item as Uint8Array<ArrayBuffer>);
        }
        const parts = [];
        for (let i = 0; i < (item as Uint8Array).length; i += 8192) {
          parts.push(
            String.fromCharCode(...(item as Uint8Array).subarray(i, i + 8192)),
          );
        }
        return {
          [BYTE_MARKER]: root.btoa(parts.join("")),
          byteLength: item.byteLength,
        };
      }
      if (seen.has(item)) {
        throw invalid();
      }
      seen.add(item);
      if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
        if (
          encode ||
          Object.keys(item).length !== 2 ||
          !Object.prototype.hasOwnProperty.call(item, "byteLength")
        ) {
          throw invalid();
        }
        const text = item[BYTE_MARKER],
          length = item.byteLength;
        if (
          typeof text !== "string" ||
          text.length > 1398104 ||
          !Number.isInteger(length) ||
          length < 0 ||
          length > 1048576 ||
          text.length % 4 !== 0 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(text) ||
          (text.length / 4) * 3 -
            (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !==
            length
        ) {
          throw invalid();
        }
        let binary;
        try {
          binary = root.atob(text);
        } catch (_) {
          throw invalid();
        }
        if (binary.length !== length || root.btoa(binary) !== text) {
          throw invalid();
        }
        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
      }
      let result;
      if (Array.isArray(item)) {
        if (item.length > 10000) {
          throw invalid();
        }
        result = item.map((child) => visit(child, depth + 1));
      } else {
        result = Object.fromEntries(
          Object.entries(item).map(([key, child]) => [
            key,
            visit(child, depth + 1),
          ]),
        );
      }
      seen.delete(item);
      return result;
    }
    return visit(value, 0);
  }

  function invoke(
    target: DynamicApi | undefined,
    method: string,
    args: unknown[],
  ): Promise<DynamicApi> {
    if (!api || !target || typeof target[method] !== "function") {
      return Promise.reject(
        failure("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다."),
      );
    }
    if (promiseApi) {
      try {
        return Promise.resolve(target[method](...args));
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return new Promise((resolve, reject) => {
      try {
        target[method](...args, (value: unknown) => {
          const error = api.runtime && api.runtime.lastError;
          if (error) {
            reject(
              failure(
                "API_ERROR",
                error.message || "확장 프로그램 API 요청에 실패했습니다.",
              ),
            );
          } else {
            resolve(value as DynamicApi);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function readOptions() {
    const result = await readSettings(root, ["enabled", "aruIconsOptions"]);
    if (result.state !== "success") {
      throw result.error;
    }
    const items = result.values;
    const supplied = items.aruIconsOptions;
    const iconOptions = Object.assign(
      {},
      defaults,
      supplied && typeof supplied === "object" && !Array.isArray(supplied)
        ? supplied
        : {},
    );
    const enabled = Object.prototype.hasOwnProperty.call(items, "enabled")
      ? items.enabled === true
      : true;
    return {
      enabled,
      aruIconsOptions: iconOptions,
      active: enabled && iconOptions.enabled === true,
    };
  }

  function onChanged(
    callback: (arg0: {
      enabled: boolean;
      aruIconsOptions: any;
      active: boolean;
    }) => void,
    onPending?: () => void,
  ) {
    let disposed = false;
    let revision = 0;
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area !== "sync" || (!changes.enabled && !changes.aruIconsOptions)) {
        return;
      }
      const current = ++revision;
      onPending?.();
      readOptions()
        .then((options) => {
          if (!disposed && current === revision) {
            callback(options);
          }
        })
        .catch(() => {
          if (!disposed && current === revision) {
            callback({
              enabled: false,
              aruIconsOptions: { ...defaults },
              active: false,
            });
          }
        });
    };
    const unsubscribe = subscribeSettings(root, listener);
    return () => {
      disposed = true;
      ++revision;
      unsubscribe?.();
    };
  }

  async function requestCache(action: string, payload: DynamicApi) {
    if (!["get", "put", "invalidate", "info"].includes(action)) {
      throw failure("INVALID_REQUEST", "지원하지 않는 캐시 요청입니다.");
    }
    if (!(await readOptions()).active) {
      throw failure("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
    }
    let requestPayload = payload || {};
    if (
      action === "put" &&
      Object.prototype.hasOwnProperty.call(requestPayload, "rawMetadata")
    ) {
      requestPayload = {
        ...requestPayload,
        rawMetadata: carrierBytes(requestPayload.rawMetadata, true),
      };
    }
    const response = await invoke(api && api.runtime, "sendMessage", [
      { type: "ARU_ICONS_CACHE", action, payload: requestPayload },
    ]);
    if (!response || response.ok !== true) {
      const error = response && response.error;
      throw failure(
        (error && error.code) || "CACHE_UNAVAILABLE",
        (error && error.message) || "아이콘 캐시 응답을 받지 못했습니다.",
      );
    }
    if (action === "get" && response.result) {
      return {
        ...response.result,
        rawMetadata: carrierBytes(response.result.rawMetadata, false),
      };
    }
    return response.result;
  }
  return Object.freeze({ readOptions, onChanged, requestCache, defaults });
}
