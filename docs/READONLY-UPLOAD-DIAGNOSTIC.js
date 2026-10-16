// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // docs/source/compat/docs-READONLY-UPLOAD-DIAGNOSTIC.mjs
  var docs_READONLY_UPLOAD_DIAGNOSTIC_exports = {};
  __export(docs_READONLY_UPLOAD_DIAGNOSTIC_exports, {
    result: () => result
  });

  // docs/READONLY-UPLOAD-DIAGNOSTIC.mjs
  function inspectUploadState({ environment = globalThis, dependencies = {} } = {}) {
    const { document, location, URL, performance, console } = environment;
    const initializeUploadState = /* @__PURE__ */ __name(() => {
      "use strict";
      const selectors = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
      const editors = [...document.querySelectorAll(selectors)];
      let extension;
      try {
        extension = JSON.parse(document.documentElement.getAttribute("data-aru-upload-diagnostic") || "null");
      } catch (_) {
        extension = { error: "diagnostic-json-invalid" };
      }
      const timings = performance.getEntriesByType("resource").filter((entry) => {
        try {
          const url = new URL(entry.name);
          return /(^|\.)ruliweb\.com$/.test(url.hostname) && /upload|attach|image|file/i.test(url.pathname) && ["fetch", "xmlhttprequest"].includes(entry.initiatorType);
        } catch (_) {
          return false;
        }
      }).slice(-30).map((entry, index) => ({
        request: "request-" + (index + 1),
        start: Math.round(entry.startTime),
        end: entry.responseEnd ? Math.round(entry.responseEnd) : null,
        type: entry.initiatorType
      }));
      const result2 = {
        diagnostic: "aru-upload-readonly-v1",
        page: { host: location.hostname, writeOrModify: /\/(write|modify)(?:\/|$)/.test(location.pathname) },
        fileInputs: [...document.querySelectorAll('input[type="file"]')].map((input) => ({
          imageAccept: /image|\.jpe?g|\.png|\.gif|\.webp/i.test(input.accept),
          multiple: input.multiple,
          selectedCount: input.files?.length || 0,
          disabled: input.disabled,
          nativeLabelCount: input.labels?.length || 0
        })),
        editors: editors.map((editor) => {
          const images = [...editor.querySelectorAll("img")];
          return {
            images: images.length,
            decoded: images.filter((image) => image.complete && image.naturalWidth > 0).length,
            originalNameAttributes: images.filter((image) => image.hasAttribute("data-original-name") || image.hasAttribute("data-filename")).length,
            nonemptyAltOrTitle: images.filter((image) => image.getAttribute("alt") || image.getAttribute("title")).length,
            captionMarkers: images.filter((image) => image.getAttribute("data-aru-source-captioned") === "1").length
          };
        }),
        extension,
        uploadLikeResourceTimings: timings,
        requestStartOrder: timings.slice().sort((a, b) => a.start - b.start).map((item) => item.request),
        responseEndOrder: timings.filter((item) => item.end !== null).sort((a, b) => a.end - b.end).map((item) => item.request),
        limits: "Read-only. No files read, requests, cookies, storage, author/comment/editor text, source/media URLs, file names, request bodies or authentication. Resource timings are incomplete and not associated with individual files."
      };
      console.log(JSON.stringify(result2, null, 2));
      return result2;
    }, "initializeUploadState");
    return initializeUploadState();
    return {};
  }
  __name(inspectUploadState, "inspectUploadState");

  // docs/source/compat/docs-READONLY-UPLOAD-DIAGNOSTIC.mjs
  var result = inspectUploadState({ environment: globalThis, dependencies: {} });
  return __toCommonJS(docs_READONLY_UPLOAD_DIAGNOSTIC_exports);
})().result;
