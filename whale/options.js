// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // docs/source/platform/whale/options.mjs
  function installWhaleOptions({ environment = defaultEnvironment, dependencies: _dependencies = {} } = {}) {
    const { document, chrome, console } = environment;
    const runInit6 = /* @__PURE__ */ __name(function init() {
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
        pixelTableCellSize: 4
      });
      let existingIconsOptions = {};
      let existingBodyDownloadOptions = {};
      function parseKeywordTextarea(value) {
        return String(value || "").split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
      }
      __name(parseKeywordTextarea, "parseKeywordTextarea");
      function formatKeywordTextarea(keywords) {
        return Array.isArray(keywords) ? keywords.join("\n") : "";
      }
      __name(formatKeywordTextarea, "formatKeywordTextarea");
      function parseHostList(text) {
        return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
      }
      __name(parseHostList, "parseHostList");
      function renderHostList(hosts) {
        if (!Array.isArray(hosts)) {
          return "";
        }
        return hosts.join("\n");
      }
      __name(renderHostList, "renderHostList");
      function setStatus(text) {
        const el = document.getElementById("save-status");
        if (el) {
          el.textContent = text;
        }
      }
      __name(setStatus, "setStatus");
      function loadOptions(strict = false) {
        return new Promise((resolve, reject) => {
          chrome.storage.sync.get(null, (items) => {
            if (chrome.runtime.lastError) {
              if (strict) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              console.warn("[Aru Source Captioner] options load failed, using defaults:", chrome.runtime.lastError.message);
              resolve({ ...DEFAULT_OPTIONS });
              return;
            }
            const merged = {
              ...DEFAULT_OPTIONS
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
      __name(loadOptions, "loadOptions");
      function saveOptions(options) {
        return new Promise((resolve, reject) => {
          chrome.storage.sync.set(options, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve();
          });
        });
      }
      __name(saveOptions, "saveOptions");
      function applyToForm(opts) {
        const enabledEl = document.getElementById("opt-enabled");
        const allowHttpEl = document.getElementById("opt-allow-http");
        const strictEl = document.getElementById("opt-strict-allowlist");
        const hostsEl = document.getElementById("opt-allowed-hosts");
        if (enabledEl) {
          enabledEl.checked = !!opts.enabled;
        }
        existingBodyDownloadOptions = opts.aruBodyDownloadOptions && typeof opts.aruBodyDownloadOptions === "object" && !Array.isArray(opts.aruBodyDownloadOptions) ? { ...opts.aruBodyDownloadOptions } : {};
        const downloadEnabledEl = document.getElementById("opt-aru-body-download-enabled");
        if (downloadEnabledEl) {
          downloadEnabledEl.checked = existingBodyDownloadOptions.enabled === true;
        }
        existingIconsOptions = opts.aruIconsOptions && typeof opts.aruIconsOptions === "object" && !Array.isArray(opts.aruIconsOptions) ? { ...opts.aruIconsOptions } : {};
        const iconsEnabledEl = document.getElementById("opt-aru-icons-enabled");
        const iconsAutoLoadEl = document.getElementById("opt-aru-icons-auto-load");
        if (iconsEnabledEl) {
          iconsEnabledEl.checked = existingIconsOptions.enabled === true;
        }
        if (iconsAutoLoadEl) {
          iconsAutoLoadEl.checked = existingIconsOptions.autoLoad !== false;
        }
        if (allowHttpEl) {
          allowHttpEl.checked = !!opts.allowHttp;
        }
        if (strictEl) {
          strictEl.checked = !!opts.strictAllowlist;
        }
        if (hostsEl) {
          hostsEl.value = renderHostList(opts.allowedHosts);
        }
        const revealModeEl = document.getElementById("opt-ruliweb-ai-reveal-mode");
        if (revealModeEl) {
          revealModeEl.value = opts.ruliwebAiRevealMode ?? "off";
        }
        const revealAllowEl = document.getElementById("opt-ruliweb-ai-reveal-allow-keywords");
        if (revealAllowEl) {
          revealAllowEl.value = formatKeywordTextarea(opts.ruliwebAiRevealAllowKeywords);
        }
        const revealBlockEl = document.getElementById("opt-ruliweb-ai-reveal-block-keywords");
        if (revealBlockEl) {
          revealBlockEl.value = formatKeywordTextarea(opts.ruliwebAiRevealBlockKeywords);
        }
        const ptModeEl = document.getElementById("opt-pixel-table-mode");
        if (ptModeEl) {
          ptModeEl.value = opts.pixelTableMode ?? "off";
        }
        const ptMaxWEl = document.getElementById("opt-pixel-table-max-width");
        if (ptMaxWEl) {
          ptMaxWEl.value = String(opts.pixelTableMaxWidth ?? 800);
        }
        const ptMaxHEl = document.getElementById("opt-pixel-table-max-height");
        if (ptMaxHEl) {
          ptMaxHEl.value = String(opts.pixelTableMaxHeight ?? 600);
        }
        const ptCellEl = document.getElementById("opt-pixel-table-cell-size");
        if (ptCellEl) {
          ptCellEl.value = String(opts.pixelTableCellSize ?? 4);
        }
      }
      __name(applyToForm, "applyToForm");
      function readFromForm() {
        const readPixelTableMode = /* @__PURE__ */ __name(function() {
          const el = document.getElementById("opt-pixel-table-mode");
          const v = el ? el.value : "off";
          return ["off", "manual", "auto_android"].includes(v) ? v : "off";
        }, "readPixelTableMode");
        const readPixelCellSize = /* @__PURE__ */ __name(function() {
          const el = document.getElementById("opt-pixel-table-cell-size");
          const v = el ? Number.parseInt(el.value, 10) : 4;
          return Number.isFinite(v) && v >= 1 && v <= 20 ? v : 4;
        }, "readPixelCellSize");
        const readRevealMode = /* @__PURE__ */ __name(function() {
          const el = document.getElementById("opt-ruliweb-ai-reveal-mode");
          const v = el ? el.value : "off";
          return ["off", "click_overlay", "text_fallback"].includes(v) ? v : "off";
        }, "readRevealMode");
        const readPixelMaxWidth = /* @__PURE__ */ __name(function() {
          const el = document.getElementById("opt-pixel-table-max-width");
          const v = el ? Number.parseInt(el.value, 10) : 800;
          return Number.isFinite(v) && v >= 50 && v <= 2e3 ? v : 800;
        }, "readPixelMaxWidth");
        const readPixelMaxHeight = /* @__PURE__ */ __name(function() {
          const el = document.getElementById("opt-pixel-table-max-height");
          const v = el ? Number.parseInt(el.value, 10) : 600;
          return Number.isFinite(v) && v >= 50 && v <= 2e3 ? v : 600;
        }, "readPixelMaxHeight");
        return {
          enabled: !!document.getElementById("opt-enabled")?.checked,
          aruBodyDownloadOptions: {
            ...existingBodyDownloadOptions,
            enabled: !!document.getElementById("opt-aru-body-download-enabled")?.checked
          },
          aruIconsOptions: {
            ...existingIconsOptions,
            enabled: !!document.getElementById("opt-aru-icons-enabled")?.checked,
            autoLoad: !!document.getElementById("opt-aru-icons-auto-load")?.checked
          },
          allowHttp: !!document.getElementById("opt-allow-http")?.checked,
          strictAllowlist: !!document.getElementById("opt-strict-allowlist")?.checked,
          allowedHosts: parseHostList(document.getElementById("opt-allowed-hosts")?.value ?? ""),
          ruliwebAiRevealMode: readRevealMode(),
          ruliwebAiRevealAllowKeywords: parseKeywordTextarea(document.getElementById("opt-ruliweb-ai-reveal-allow-keywords")?.value ?? ""),
          ruliwebAiRevealBlockKeywords: parseKeywordTextarea(document.getElementById("opt-ruliweb-ai-reveal-block-keywords")?.value ?? ""),
          pixelTableMode: readPixelTableMode(),
          pixelTableMaxWidth: readPixelMaxWidth(),
          pixelTableMaxHeight: readPixelMaxHeight(),
          pixelTableCellSize: readPixelCellSize()
        };
      }
      __name(readFromForm, "readFromForm");
      document.addEventListener("DOMContentLoaded", async () => {
        try {
          const opts = await loadOptions();
          applyToForm(opts);
          setStatus("");
        } catch (err) {
          const msg = err?.message || String(err);
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
              autoLoad: next.aruIconsOptions.autoLoad
            };
            next.aruBodyDownloadOptions = {
              ...latest.aruBodyDownloadOptions,
              enabled: next.aruBodyDownloadOptions.enabled
            };
            await saveOptions(next);
            setStatus("저장되었습니다.");
          } catch (err) {
            const msg = err?.message || String(err);
            setStatus(`저장에 실패했습니다: ${msg}`);
          }
        });
      });
    }, "init");
    runInit6();
    return {};
  }
  __name(installWhaleOptions, "installWhaleOptions");

  // docs/source/compat/platform-whale-options.mjs
  var result = installWhaleOptions({ environment: globalThis, dependencies: {} });
})();
