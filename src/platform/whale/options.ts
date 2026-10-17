import type { DefaultValues } from "../../runtime/contracts.ts";
import {
  defaultEnvironment,
  type FactoryOptions,
} from "../../runtime/contracts.ts";
// 브라우저별 기존 초기화·저장 키·사용자 설정과 이벤트 계약을 유지한다.

export function installWhaleOptions({
  environment = defaultEnvironment,
  dependencies: _dependencies = {},
}: FactoryOptions = {}) {
  const { document, chrome, console } = environment;

  //
  // Phase 2A: chrome.storage.sync 기반 옵션 로드/저장 구현.
  // - DOMContentLoaded 시점에 현재 설정을 폼에 반영.
  // - submit 이벤트에서 폼 값을 chrome.storage.sync에 저장.
  // - allowedHosts는 줄 단위로 파싱 (공백 trim, 빈 줄 무시).
  // - 저장 결과는 textContent로만 표시 (innerHTML 사용 금지).

  const runInit6 = function init() {
    "use strict";

    const DEFAULT_OPTIONS = Object.freeze({
      enabled: true,
      aruIconsOptions: { enabled: false, autoLoad: true },
      aruBodyDownloadOptions: { enabled: false },
      allowHttp: false,
      strictAllowlist: false,
      allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
      ruliwebAiRevealMode: "off",
      ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
      ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"],
      pixelTableMode: "off",
      pixelTableMaxWidth: 800,
      pixelTableMaxHeight: 600,
      pixelTableCellSize: 4,
    });
    type Options = DefaultValues<typeof DEFAULT_OPTIONS>;

    let existingIconsOptions: Record<string, unknown> = {};
    let existingBodyDownloadOptions: Record<string, unknown> = {};

    function parseKeywordTextarea(value: any) {
      return String(value || "")
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item, index, arr) => arr.indexOf(item) === index);
    }

    function formatKeywordTextarea(keywords: any[]) {
      return Array.isArray(keywords) ? keywords.join("\n") : "";
    }

    function parseHostList(text: string) {
      return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    function renderHostList(hosts: any[]) {
      if (!Array.isArray(hosts)) {
        return "";
      }
      return hosts.join("\n");
    }

    function setStatus(text: string | null) {
      const el = document.getElementById("save-status");
      if (el) {
        el.textContent = text;
      }
    }

    function loadOptions(strict = false): Promise<Options> {
      return new Promise<Options>((resolve, reject) => {
        chrome.storage.sync.get(null, (items: Record<string, unknown>) => {
          if (chrome.runtime.lastError) {
            if (strict) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            console.warn(
              "[Aru Source Captioner] options load failed, using defaults:",
              chrome.runtime.lastError.message,
            );
            resolve({ ...DEFAULT_OPTIONS });
            return;
          }
          const merged: Options & Record<string, unknown> = {
            ...DEFAULT_OPTIONS,
          };
          for (const key of Object.keys(DEFAULT_OPTIONS)) {
            if (key in items) {
              merged[key] = items[key];
            }
          }
          resolve(merged);
        });
      });
    }

    function saveOptions(options: Partial<{ [key: string]: any }>) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.sync.set(options, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });
    }

    function applyToForm(opts: Options) {
      const enabledEl = document.getElementById("opt-enabled");
      const allowHttpEl = document.getElementById("opt-allow-http");
      const strictEl = document.getElementById("opt-strict-allowlist");
      const hostsEl = document.getElementById("opt-allowed-hosts");

      if (enabledEl) {
        (enabledEl as HTMLInputElement).checked = !!opts.enabled;
      }
      existingBodyDownloadOptions =
        opts.aruBodyDownloadOptions &&
        typeof opts.aruBodyDownloadOptions === "object" &&
        !Array.isArray(opts.aruBodyDownloadOptions)
          ? { ...opts.aruBodyDownloadOptions }
          : {};
      const downloadEnabledEl = document.getElementById(
        "opt-aru-body-download-enabled",
      );
      if (downloadEnabledEl) {
        (downloadEnabledEl as HTMLInputElement).checked =
          existingBodyDownloadOptions.enabled === true;
      }
      existingIconsOptions =
        opts.aruIconsOptions &&
        typeof opts.aruIconsOptions === "object" &&
        !Array.isArray(opts.aruIconsOptions)
          ? { ...opts.aruIconsOptions }
          : {};
      const iconsEnabledEl = document.getElementById("opt-aru-icons-enabled");
      const iconsAutoLoadEl = document.getElementById(
        "opt-aru-icons-auto-load",
      );
      if (iconsEnabledEl) {
        (iconsEnabledEl as HTMLInputElement).checked =
          existingIconsOptions.enabled === true;
      }
      if (iconsAutoLoadEl) {
        (iconsAutoLoadEl as HTMLInputElement).checked =
          existingIconsOptions.autoLoad !== false;
      }
      if (allowHttpEl) {
        (allowHttpEl as HTMLInputElement).checked = !!opts.allowHttp;
      }
      if (strictEl) {
        (strictEl as HTMLInputElement).checked = !!opts.strictAllowlist;
      }
      if (hostsEl) {
        (hostsEl as HTMLInputElement).value = renderHostList(opts.allowedHosts);
      }
      const revealModeEl = document.getElementById(
        "opt-ruliweb-ai-reveal-mode",
      );
      if (revealModeEl) {
        (revealModeEl as HTMLInputElement).value =
          opts.ruliwebAiRevealMode ?? "off";
      }
      const revealAllowEl = document.getElementById(
        "opt-ruliweb-ai-reveal-allow-keywords",
      );
      if (revealAllowEl) {
        (revealAllowEl as HTMLInputElement).value = formatKeywordTextarea(
          opts.ruliwebAiRevealAllowKeywords,
        );
      }
      const revealBlockEl = document.getElementById(
        "opt-ruliweb-ai-reveal-block-keywords",
      );
      if (revealBlockEl) {
        (revealBlockEl as HTMLInputElement).value = formatKeywordTextarea(
          opts.ruliwebAiRevealBlockKeywords,
        );
      }
      const ptModeEl = document.getElementById("opt-pixel-table-mode");
      if (ptModeEl) {
        (ptModeEl as HTMLInputElement).value = opts.pixelTableMode ?? "off";
      }
      const ptMaxWEl = document.getElementById("opt-pixel-table-max-width");
      if (ptMaxWEl) {
        (ptMaxWEl as HTMLInputElement).value = String(
          opts.pixelTableMaxWidth ?? 800,
        );
      }
      const ptMaxHEl = document.getElementById("opt-pixel-table-max-height");
      if (ptMaxHEl) {
        (ptMaxHEl as HTMLInputElement).value = String(
          opts.pixelTableMaxHeight ?? 600,
        );
      }
      const ptCellEl = document.getElementById("opt-pixel-table-cell-size");
      if (ptCellEl) {
        (ptCellEl as HTMLInputElement).value = String(
          opts.pixelTableCellSize ?? 4,
        );
      }
    }

    function readFromForm() {
      const readPixelTableMode = function () {
        const el = document.getElementById("opt-pixel-table-mode");
        const v = el ? (el as HTMLInputElement).value : "off";
        return ["off", "manual", "auto_android"].includes(v) ? v : "off";
      };
      const readPixelCellSize = function () {
        const el = document.getElementById("opt-pixel-table-cell-size");
        const v = el ? Number.parseInt((el as HTMLInputElement).value, 10) : 4;
        return Number.isFinite(v) && v >= 1 && v <= 20 ? v : 4;
      };
      const readRevealMode = function () {
        const el = document.getElementById("opt-ruliweb-ai-reveal-mode");
        const v = el ? (el as HTMLInputElement).value : "off";
        return ["off", "click_overlay", "text_fallback"].includes(v)
          ? v
          : "off";
      };
      const readPixelMaxWidth = function () {
        const el = document.getElementById("opt-pixel-table-max-width");
        const v = el
          ? Number.parseInt((el as HTMLInputElement).value, 10)
          : 800;
        return Number.isFinite(v) && v >= 50 && v <= 2000 ? v : 800;
      };
      const readPixelMaxHeight = function () {
        const el = document.getElementById("opt-pixel-table-max-height");
        const v = el
          ? Number.parseInt((el as HTMLInputElement).value, 10)
          : 600;
        return Number.isFinite(v) && v >= 50 && v <= 2000 ? v : 600;
      };
      return {
        enabled: !!(document.getElementById("opt-enabled") as HTMLInputElement)
          ?.checked,
        aruBodyDownloadOptions: {
          ...existingBodyDownloadOptions,
          enabled: !!(
            document.getElementById(
              "opt-aru-body-download-enabled",
            ) as HTMLInputElement
          )?.checked,
        },
        aruIconsOptions: {
          ...existingIconsOptions,
          enabled: !!(
            document.getElementById("opt-aru-icons-enabled") as HTMLInputElement
          )?.checked,
          autoLoad: !!(
            document.getElementById(
              "opt-aru-icons-auto-load",
            ) as HTMLInputElement
          )?.checked,
        },
        allowHttp: !!(
          document.getElementById("opt-allow-http") as HTMLInputElement
        )?.checked,
        strictAllowlist: !!(
          document.getElementById("opt-strict-allowlist") as HTMLInputElement
        )?.checked,
        allowedHosts: parseHostList(
          (document.getElementById("opt-allowed-hosts") as HTMLInputElement)
            ?.value ?? "",
        ),
        ruliwebAiRevealMode: readRevealMode(),
        ruliwebAiRevealAllowKeywords: parseKeywordTextarea(
          (
            document.getElementById(
              "opt-ruliweb-ai-reveal-allow-keywords",
            ) as HTMLInputElement
          )?.value ?? "",
        ),
        ruliwebAiRevealBlockKeywords: parseKeywordTextarea(
          (
            document.getElementById(
              "opt-ruliweb-ai-reveal-block-keywords",
            ) as HTMLInputElement
          )?.value ?? "",
        ),
        pixelTableMode: readPixelTableMode(),
        pixelTableMaxWidth: readPixelMaxWidth(),
        pixelTableMaxHeight: readPixelMaxHeight(),
        pixelTableCellSize: readPixelCellSize(),
      };
    }

    document.addEventListener("DOMContentLoaded", async () => {
      try {
        const opts = await loadOptions();
        applyToForm(opts);
        setStatus("");
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        setStatus(`설정을 불러오지 못했습니다: ${msg}`);
      }

      const form = document.getElementById("options-form");
      if (!form) {
        return;
      }

      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        setStatus("저장 중…");
        try {
          const next = readFromForm();
          const latest = await loadOptions(true);
          next.aruIconsOptions = {
            ...latest.aruIconsOptions,
            enabled: next.aruIconsOptions.enabled,
            autoLoad: next.aruIconsOptions.autoLoad,
          };
          next.aruBodyDownloadOptions = {
            ...latest.aruBodyDownloadOptions,
            enabled: next.aruBodyDownloadOptions.enabled,
          };
          await saveOptions(next);
          setStatus("저장되었습니다.");
        } catch (err) {
          const msg = (err as Error)?.message || String(err);
          setStatus(`저장에 실패했습니다: ${msg}`);
        }
      });
    });
  };
  runInit6();

  return {};
}
