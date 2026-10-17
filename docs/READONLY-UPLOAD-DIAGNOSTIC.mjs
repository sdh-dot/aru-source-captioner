// 로컬 진단·데모를 명시적 호출로만 실행하며 실제 게시 요청을 만들지 않는다.
import { createModuleScope, selectModuleExports } from './source/runtime/module-scope.mjs';

export function inspectUploadState({ environment = globalThis, dependencies = {} } = {}) {
  const { document, location, URL, performance, console } = environment;


const initializeUploadState = () => {
  'use strict';
  const selectors = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
  const editors = [...document.querySelectorAll(selectors)];
  let extension;
  try { extension = JSON.parse(document.documentElement.getAttribute('data-aru-upload-diagnostic') || 'null'); } catch (_) { extension = { error: 'diagnostic-json-invalid' }; }
  // Report timing/order without resource URL, query, request body or headers.
  const timings = performance.getEntriesByType('resource').filter(entry => {
    try { const url = new URL(entry.name); return /(^|\.)ruliweb\.com$/.test(url.hostname) && /upload|attach|image|file/i.test(url.pathname) && ['fetch', 'xmlhttprequest'].includes(entry.initiatorType); } catch (_) { return false; }
  }).slice(-30).map((entry, index) => ({ request: 'request-' + (index + 1), start: Math.round(entry.startTime),
    end: entry.responseEnd ? Math.round(entry.responseEnd) : null, type: entry.initiatorType }));
  const result = {
    diagnostic: 'aru-upload-readonly-v1',
    page: { host: location.hostname, writeOrModify: /\/(write|modify)(?:\/|$)/.test(location.pathname) },
    fileInputs: [...document.querySelectorAll('input[type="file"]')].map(input => ({
      imageAccept: /image|\.jpe?g|\.png|\.gif|\.webp/i.test(input.accept), multiple: input.multiple,
      selectedCount: input.files?.length || 0, disabled: input.disabled,
      nativeLabelCount: input.labels?.length || 0
    })),
    editors: editors.map(editor => {
      const images = [...editor.querySelectorAll('img')];
      return { images: images.length, decoded: images.filter(image => image.complete && image.naturalWidth > 0).length,
        originalNameAttributes: images.filter(image => image.hasAttribute('data-original-name') || image.hasAttribute('data-filename')).length,
        nonemptyAltOrTitle: images.filter(image => image.getAttribute('alt') || image.getAttribute('title')).length,
        captionMarkers: images.filter(image => image.getAttribute('data-aru-source-captioned') === '1').length };
    }),
    extension,
    uploadLikeResourceTimings: timings,
    requestStartOrder: timings.slice().sort((a, b) => a.start - b.start).map(item => item.request),
    responseEndOrder: timings.filter(item => item.end !== null).sort((a, b) => a.end - b.end).map(item => item.request),
    limits: 'Read-only. No files read, requests, cookies, storage, author/comment/editor text, source/media URLs, file names, request bodies or authentication. Resource timings are incomplete and not associated with individual files.'
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
};
return (initializeUploadState)();

  return {};
}
