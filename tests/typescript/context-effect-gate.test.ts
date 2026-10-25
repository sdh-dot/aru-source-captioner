import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import ts from "typescript";
import { contextEffectGate, bindContextEffectGate } from "../../src/runtime/context-effect-gate.ts";
import { createBrowserAdapter } from "../../src/ruliweb-icons/browser-adapter.ts";
import { createIconsFeature } from "../../src/ruliweb-icons/feature.ts";
import { createAttributionCore } from "../../src/upload-attribution/core.ts";
import { createAttributionUi } from "../../src/upload-attribution/ui.ts";
import { createDownloadBrowserApi } from "../../src/body-download/browser-api.ts";
import { createComposerAdapter } from "../../src/ruliweb-icons/composer-adapter.ts";
import { createMetadataInterface } from "../../src/icon-metadata/interface.ts";
import { createIconReader } from "../../src/runtime/icons.ts";
import { installFirefoxContent } from "../../src/platform/firefox/content.ts";
import { installWhaleContent } from "../../src/platform/whale/content.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
function host(mode: "callback" | "promise" = "callback", enabled = true) {
  const dom = new JSDOM('<div class="seditor"><div class="note-toolbar"><button>첨부</button></div><input type="file" accept="image/*"><div class="note-editable" contenteditable="true"><p>사용자 본문</p><p data-aru-source-caption>기존 캡션</p></div></div>', { url: "https://bbs.ruliweb.com/community/board/300143/write", pretendToBeVisual: true });
  const w = dom.window as unknown as RuntimeEnvironment;
  const listeners = new Set<(...args: any[]) => void>();
  let reads = 0, messages = 0, writes = 0;
  const runtime = { id: "native-test-extension" as string | undefined, lastError: undefined as any,
    getURL: (p: string) => "https://extension.invalid/" + p,
    sendMessage(_request: unknown, cb?: (v: unknown) => void) { messages++; if (mode === "promise") return Promise.resolve({ ok: true, result: {} }); cb!({ ok: true, result: {} }); },
  };
  const api = { runtime, storage: { sync: { get(_keys: unknown, cb?: (v: unknown) => void) {
    reads++; const v = { enabled, aruIconsOptions: { enabled: true } };
    if (mode === "promise") return Promise.resolve(v); cb!(v);
  }, set() { writes++; } }, onChanged: { addListener(fn: (...args: any[]) => void) { listeners.add(fn); }, removeListener(fn: (...args: any[]) => void) { listeners.delete(fn); } } } };
  w[mode === "promise" ? "browser" : "chrome"] = api;
  w.console = { log() {}, warn() {}, debug() {}, info() {} };
  return { dom, w, api, runtime, listeners, get reads() { return reads; }, get messages() { return messages; }, get writes() { return writes; },
    close() { w.dispatchEvent(new w.Event("pagehide")); dom.window.close(); } };
}
test("ID 소실·복구는 이전 gate를 되살리지 않으며 새 컨텍스트는 초기화할 수 있다", () => {
  const h = host(), next = host();
  try {
    const gate = contextEffectGate(h.w), proxy = new Proxy(h.w, {});
    assert.equal(contextEffectGate(proxy), gate); assert.equal(gate.state, "active");
    for (let i = 0; i < 100; i++) assert.equal(gate.allows(), true);
    assert.equal(h.reads, 0); assert.equal(h.messages, 0);
    h.runtime.id = undefined; assert.equal(gate.allows(), false); assert.equal(gate.state, "invalidated");
    h.runtime.id = "native-test-extension"; assert.equal(gate.allows(), false);
    assert.equal(contextEffectGate(next.w).allows(), true);
  } finally { h.close(); next.close(); }
});
test("독립 번들의 WeakMap이 달라도 같은 ISOLATED Window의 무효화는 공유한다", async () => {
  const h = host();
  try {
    const source = fs.readFileSync(new URL('../../src/runtime/context-effect-gate.ts', import.meta.url), 'utf8');
    const text = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const separate = await import('data:text/javascript;base64,' + Buffer.from(text + '\n// independent bundle').toString('base64'));
    const first = contextEffectGate(h.w), second = separate.contextEffectGate(h.w);
    assert.equal(first, second); second.observeError(Error('Extension context invalidated.'));
    assert.equal(first.allows(), false);
  } finally { h.close(); }
});
test("ID 변경·네이티브 오류·pagehide는 terminal이며 정리는 한 번만 실행된다", () => {
  for (const kind of ["id-change", "error", "pagehide"] as const) {
    const h = host(); try {
      const gate = contextEffectGate(h.w); let closed = 0;
      gate.onStop(() => { assert.equal(gate.allows(), false); closed++; });
      if (kind === "id-change") { h.runtime.id = "different"; gate.allows(); }
      if (kind === "error") gate.observeError(Error("Extension context invalidated."));
      if (kind === "pagehide") h.w.dispatchEvent(new h.w.Event("pagehide"));
      gate.invalidate(); gate.dispose(); assert.equal(closed, 1); assert.equal(gate.allows(), false);
      assert.equal(h.w.document.querySelector('.note-editable')!.textContent, "사용자 본문기존 캡션");
    } finally { h.close(); }
  }
});
test("getter 접근 실패는 새 효과를 보류하고 WXT의 명시적 무효화는 복구하지 않는다", () => {
  let fail = true, hook = () => {};
  const root = { get chrome() { if (fail) throw Error("temporary getter"); return { runtime: { id: "live" } }; } };
  const gate = contextEffectGate(root); assert.equal(gate.state, "suspended"); assert.equal(gate.allows(), false);
  fail = false; assert.equal(gate.allows(), true);
  bindContextEffectGate(root, { isInvalid: false, onInvalidated(fn) { hook = fn; } }); hook();
  assert.equal(gate.allows(), false); assert.equal(gate.state, "invalidated");
});
test("WXT의 이미 무효인 컨텍스트와 이미 해제된 컨텍스트는 효과를 허용하지 않는다", () => {
  const root = {};
  const gate = bindContextEffectGate(root, { isInvalid: true, onInvalidated() {} });
  assert.throws(() => gate.assert(), { code: "CONTEXT_INVALIDATED" });
  const disposed = contextEffectGate({}); disposed.dispose(); assert.equal(disposed.state, "disposed");
});
for (const mode of ["callback", "promise"] as const) {
  test(`${mode}: 메타데이터 설정 포트의 native invalidation도 같은 gate에 전달한다`, async () => {
    const h = host(mode); const { metadata } = createMetadataInterface({ environment: h.w });
    try {
      if (mode === "promise") {
        h.api.storage.sync.get = (() => Promise.reject(Error("Extension context invalidated."))) as typeof h.api.storage.sync.get;
        await assert.rejects(metadata.Browser.active(), /Extension context invalidated/);
      } else {
        h.runtime.lastError = { message: "Extension context invalidated." };
        assert.equal(await metadata.Browser.active(), false);
      }
      assert.equal(contextEffectGate(h.w).state, "invalidated");
    } finally { h.close(); }
  });
  test(`${mode}: 무효화 이후 옵션 ON·캐시 메시지·다운로드 API를 실행하지 않는다`, async () => {
    const h = host(mode); try {
      const adapter = createBrowserAdapter(h.w);
      assert.equal((await adapter.readOptions()).active, true);
      const { downloads } = createDownloadBrowserApi({ environment: h.w, dependencies: { downloads: { error: () => (code: string, message: string) => Object.assign(Error(message), { code }) } } });
      h.runtime.id = undefined;
      await assert.rejects(adapter.requestCache("get", {}), { code: "CONTEXT_INVALIDATED" });
      let calls = 0;
      await assert.rejects(downloads.call({ download() { calls++; } }, "download", {}), { code: "CONTEXT_INVALIDATED" });
      assert.equal(calls, 0); assert.equal(h.messages, 0); assert.equal(h.writes, 0);
    } finally { h.close(); }
  });
  test(`${mode}: 전송 후 늦은 메시지 결과를 소비하지 않는다`, async () => {
    const h = host(mode); let done: (v: unknown) => void = () => {};
    h.api.runtime.sendMessage = ((_request: unknown, cb?: (v: unknown) => void) => mode === "promise" ? new Promise(resolve => { done = resolve; }) : (done = cb!)) as typeof h.api.runtime.sendMessage;
    try {
      const adapter = createBrowserAdapter(h.w), pending = adapter.requestCache("info", {});
      await flush(); h.runtime.id = undefined; done({ ok: true, result: { stale: false } });
      await assert.rejects(pending, { code: "CONTEXT_INVALIDATED" });
    } finally { h.close(); }
  });
}
test("Feature의 늦은 ON·재활성화·반복 start는 종료 후 새 Picker를 만들지 않는다", async () => {
  const h = host(); h.dom.reconfigure({ url: "https://example.invalid" });
  let done: (v: unknown) => void = () => {}, subscriptions = 0, pickers = 0;
  const browser = { readOptions: () => new Promise(resolve => { done = resolve; }), onChanged() { subscriptions++; return () => subscriptions--; } };
  const { icons } = createIconsFeature({ environment: h.w });
  const feature = new icons.IconFeature({ document: h.w.document, browser, createPicker() { pickers++; } });
  try {
    const pending = feature.start(); feature.start(); assert.equal(subscriptions, 1); assert.equal(feature.enabled, false);
    h.runtime.id = undefined; done({ active: true, aruIconsOptions: { enabled: true } }); await pending;
    assert.equal(feature.enabled, false); assert.equal(feature.destroyed, true); assert.equal(subscriptions, 0);
    await feature.applyOptions({ active: true, aruIconsOptions: { enabled: true } }); await feature.open({});
    assert.equal(feature.enabled, false); assert.equal(pickers, 0);
  } finally { feature.destroy(); h.close(); }
});
test("성공 ON 직후 ID가 소실되면 다음 Picker 열기에서 중지하고 새 DOM을 만들지 않는다", async () => {
  const h = host(); h.dom.reconfigure({ url: "https://example.invalid" });
  let pickers = 0;
  const browser = { readOptions: async () => ({ active: true, aruIconsOptions: { enabled: true } }), onChanged: () => () => {} };
  const { icons } = createIconsFeature({ environment: h.w });
  const feature = new icons.IconFeature({ document: h.w.document, browser, createPicker() { pickers++; } });
  try {
    await feature.start(); assert.equal(feature.enabled, true);
    h.runtime.id = undefined; await feature.open({});
    assert.equal(feature.enabled, false); assert.equal(feature.destroyed, true); assert.equal(pickers, 0);
  } finally { feature.destroy(); h.close(); }
});
test("공통 UI: 확인된 무효화 뒤 저장 ON 이벤트로 UI를 복원하지 않는다", async () => {
  const h = host(); const start = () => createAttributionUi({ environment: h.w });
  try {
    start(); await flush(); assert.equal(h.w.document.querySelectorAll('[data-aru-native-upload-style]').length, 1);
    contextEffectGate(h.w).invalidate();
    for (const fn of [...h.listeners]) fn({ enabled: { newValue: true } }, "sync");
    start(); await flush(); assert.equal(h.w.document.querySelectorAll('[data-aru-native-upload-style]').length, 0);
    assert.equal(h.listeners.size, 0); assert.equal(h.w.document.querySelector('.note-editable')!.textContent, "사용자 본문기존 캡션");
  } finally { h.close(); }
});
test("Composer·메타데이터 bridge는 무효화 후 MAIN에 변경 요청을 보내지 않는다", async () => {
  const h = host(); let events = 0;
  const composer = createComposerAdapter({ environment: h.w, site: {} }).ComposerAdapter;
  const { metadata } = createMetadataInterface({ environment: h.w });
  const client = new metadata.Client(h.w.document);
  h.w.document.addEventListener("aru-icons-composer-request-v1", () => events++);
  h.w.document.addEventListener("aru-metadata-request-v1", () => events++);
  try {
    contextEffectGate(h.w).invalidate();
    await assert.rejects(composer.request(h.w.document, "insert", {}), { code: "CONTEXT_INVALIDATED" });
    await assert.rejects(client.request("apply", {})); assert.equal(events, 0);
  } finally { client.destroy(); h.close(); }
});
test("Picker의 검색 이벤트는 ID 소실을 확인하면 기존 수명 경로로 종료한다", async () => {
  const h = host(); h.dom.reconfigure({ url: "https://example.invalid" });
  const icons = createIconReader({ environment: h.w });
  try {
    const picker = icons.createPicker({}); h.w.document.body.append(picker.element);
    const root = picker.element.shadowRoot, search = root.querySelector('input[type="search"]');
    assert.ok(search);
    h.runtime.id = undefined; search.value = "무효화 이후 검색";
    search.dispatchEvent(new h.w.Event('input', { bubbles: true, composed: true }));
    await tick(); assert.equal(picker.element.isConnected, false);
    assert.equal(contextEffectGate(h.w).state, "invalidated"); picker.destroy();
  } finally { icons.feature?.destroy(); h.close(); }
});
test("메타데이터의 대기 응답은 무효화 후 재개되지 않고 본문·태그를 남긴다", async () => {
  const h = host(); const { metadata } = createMetadataInterface({ environment: h.w });
  const client = new metadata.Client(h.w.document); let request: any;
  h.w.document.addEventListener('aru-metadata-request-v1', ((event: CustomEvent<string>) => { request = JSON.parse(event.detail); }) as EventListener);
  try {
    const pending = client.request('preview', {}); const rejected = assert.rejects(pending);
    contextEffectGate(h.w).invalidate(); await rejected;
    h.w.document.dispatchEvent(new h.w.CustomEvent('aru-metadata-response-v1', { detail: JSON.stringify({ requestId: request.requestId, ok: true, result: { changed: true } }) }));
    assert.equal(client.pending.size, 0); assert.equal(client.closed, true);
    assert.equal(h.w.document.querySelector('.note-editable')!.textContent, "사용자 본문기존 캡션");
  } finally { client.destroy(); h.close(); }
});

for (const browser of ["firefox", "whale"] as const) {
  for (const timing of ["during-parse", "before-completion", "before-caption"] as const) {
    test(`${browser}: ${timing} 무효화 뒤 Registry 결과와 DOM 캡션을 반영하지 않는다`, async () => {
      const h = host(); let parseCalls = 0, controller: any;
      const globals = ["HTMLInputElement", "HTMLTextAreaElement", "FileReader", "Node", "Element", "HTMLElement", "CustomEvent"];
      const saved = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
      globals.forEach(key => Object.defineProperty(globalThis, key, { configurable: true, value: h.w[key] }));
      const completions: ((value: unknown) => void)[] = [];
      h.w.exifr = { parse() { parseCalls++; return new Promise(resolve => completions.push(resolve)); } };
      const { attribution } = createAttributionCore({ environment: h.w });
      class Controller extends attribution.Controller { constructor(options: object) { super(options); controller = this; } }
      try {
        (browser === "firefox" ? installFirefoxContent : installWhaleContent)({ environment: h.w, dependencies: { attribution: { Controller: () => Controller } } });
        await flush(); assert.ok(controller);
        const input = h.w.document.querySelector('input')!;
        const file = new h.w.File(['jpeg'], 'no-marker.jpg', { type: 'image/jpeg' });
        Object.defineProperty(input, 'files', { value: [file] }); input.dispatchEvent(new h.w.Event('change', { bubbles: true }));
        await tick(); assert.equal(parseCalls, 1);
        if (timing === "during-parse") contextEffectGate(h.w).invalidate();
        if (timing === "before-completion") h.runtime.id = undefined;
        completions[0]({ ImageDescription: "https://www.pixiv.net/artworks/1234567" }); await tick();
        if (timing === "before-caption") { assert.equal(controller.readyCount, 1); h.runtime.id = undefined; }
        const p = h.w.document.createElement('p'), img = h.w.document.createElement('img');
        img.alt = 'no-marker.jpg'; img.src = 'https://i1.ruliweb.com/test.jpg';
        Object.defineProperties(img, { complete: { value: true }, naturalWidth: { value: 64 } }); p.append(img); h.w.document.querySelector('.note-editable')!.append(p);
        await tick(); controller.reconcile();
        assert.equal(h.w.document.querySelectorAll('[data-aru-source-caption]').length, 1);
        assert.equal(img.dataset.aruSourceCaptioned, undefined); assert.equal(controller.closed, true);
        assert.equal(h.w.document.querySelector('.note-editable')!.textContent, "사용자 본문기존 캡션");
      } finally {
        controller?.destroy(); h.close();
        globals.forEach((key, i) => { if (saved[i]) Object.defineProperty(globalThis, key, saved[i]!); else Reflect.deleteProperty(globalThis, key); });
      }
    });
  }
  test(`${browser}: 정상 ON/OFF·동일 document 반복 설치·새 context 초기화`, async () => {
    for (const enabled of [true, false]) {
      const h = host("callback", enabled); let created = 0;
      const { attribution } = createAttributionCore({ environment: h.w });
      class Controller extends attribution.Controller { constructor(options: object) { super(options); created++; } }
      const install = () => (browser === "firefox" ? installFirefoxContent : installWhaleContent)({ environment: h.w, dependencies: { attribution: { Controller: () => Controller } } });
      try { install(); install(); await flush(); assert.equal(created, enabled ? 1 : 0); assert.equal(h.reads, 1); }
      finally { h.close(); }
    }
  });
}
