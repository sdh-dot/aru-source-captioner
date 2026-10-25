import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import exifr from "exifr";
import { JSDOM } from "jsdom";
import { installFirefoxContent } from "../../src/platform/firefox/content.ts";
import { installWhaleContent } from "../../src/platform/whale/content.ts";
import { createAttributionCore } from "../../src/upload-attribution/core.ts";
import { createIconReader } from "../../src/runtime/icons.ts";
import { documentLifecycle, type EffectSession } from "../../src/runtime/document-lifecycle.ts";
import { contextEffectGate } from "../../src/runtime/context-effect-gate.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

const A = "https://www.pixiv.net/artworks/143805797";
const B = "https://www.pixiv.net/artworks/66778899";
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 25));
async function until(check: () => boolean) {
  const deadline = Date.now() + 3000;
  while (!check() && Date.now() < deadline) await tick();
  assert.equal(check(), true, "실제 모듈의 비동기 결과가 제한 시간 안에 도착해야 한다");
}

// DOM·브라우저 API만 통제한다. Content, JSON/PNG/exifr 파서, Registry, Gate와 수명 소유자는 제품 모듈이다.
function host(read = true, enabled = true) {
  const html = read
    ? '<form class="border_box after_clear"><textarea class="comment_input">댓글 본문</textarea><input class="common_img_input" type="file"><button class="common_img_button">첨부</button></form><form class="border_box after_clear"><textarea class="reply_input">답글 본문</textarea><input class="common_img_input" type="file"><button class="common_img_button">첨부</button></form>'
    : '<div class="seditor"><input type="file" multiple><div class="note-toolbar"><button>첨부</button></div><div class="note-editable" contenteditable="true"><p id="draft">보존 본문</p><p id="existing" data-aru-source-caption>사용자 기존 캡션</p></div></div>';
  const dom = new JSDOM(html, {url: "https://bbs.ruliweb.com/community/board/98/" + (read ? "read/6000" : "write"), pretendToBeVisual: true});
  const w = dom.window as unknown as RuntimeEnvironment;
  const logs: unknown[][] = [], events = new Map<string, Set<EventListener>>();
  const storageListeners = new Set<(changes: object, area: string) => void>();
  const values = {enabled, aruIconsOptions: {enabled: false}};
  w.chrome = {runtime: {id: "integration-stabilization-extension", getURL: (p: string) => "https://extension.invalid/" + p}, storage: {
    sync: {get(_keys: unknown, callback: (value: object) => void) {callback({...values});}},
    onChanged: {addListener(fn: (changes: object, area: string) => void) {storageListeners.add(fn);}, removeListener(fn: (changes: object, area: string) => void) {storageListeners.delete(fn);}},
  }};
  w.console = Object.fromEntries(["log", "debug", "info", "warn", "error"].map(level => [level, (...args: unknown[]) => logs.push(args)]));
  w.TextDecoder = TextDecoder; w.TextEncoder = TextEncoder;
  w.exifr = {parse: async (file: File, options: object) => exifr.parse(Buffer.from(await file.arrayBuffer()), options)};
  const root = new Proxy(w, {get(target, key) {
    if (key === "addEventListener") return (type: string, fn: EventListener, options?: object) => {let set = events.get(type); if (!set) events.set(type, set = new Set()); set.add(fn); target.addEventListener(type, fn, options);};
    if (key === "removeEventListener") return (type: string, fn: EventListener, options?: object) => {events.get(type)?.delete(fn); target.removeEventListener(type, fn, options);};
    const value = Reflect.get(target, key, target);
    return ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle", "matchMedia", "atob", "btoa"].includes(key as string) && typeof value === "function" ? value.bind(target) : value;
  }});
  const globals = ["HTMLInputElement", "HTMLTextAreaElement", "FileReader", "Node", "Element", "HTMLElement", "CustomEvent"];
  const saved = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  globals.forEach(key => Object.defineProperty(globalThis, key, {configurable: true, value: w[key]}));
  const owner = documentLifecycle(root), sessions: EffectSession[] = [], controllers: any[] = [];
  const inputs = () => Array.from(w.document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const textareas = () => Array.from(w.document.querySelectorAll<HTMLTextAreaElement>("textarea"));
  const select = (files: File[], index = 0) => {const input = inputs()[index]; Object.defineProperty(input, "files", {configurable: true, value: files}); input.dispatchEvent(new w.Event("change", {bubbles: true}));};
  const file = (fixture: string, name = fixture, pending = false) => {
    const bytes = fs.readFileSync(new URL("fixtures/" + fixture, import.meta.url));
    const data = () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    let started = 0, resolve!: (buffer: ArrayBuffer) => void;
    const deferred = pending ? new Promise<ArrayBuffer>(done => {resolve = done;}) : undefined;
    const input = new w.File([bytes], name, {type: fixture.endsWith("png") ? "image/png" : "image/jpeg"}) as File;
    Object.defineProperty(input, "arrayBuffer", {value: () => {started++; return deferred ?? Promise.resolve(data());}});
    return {input, get started() {return started;}, release: () => resolve(data())};
  };
  const fire = (type: "pagehide" | "pageshow") => {
    // 페이지 이벤트 주입 모델이며 native BFCache HIT 증거로 사용하지 않는다.
    for (const fn of Array.from(events.get(type) ?? [])) fn({type, persisted: true, isTrusted: true} as PageTransitionEvent);
  };
  const start = (browser: "firefox" | "whale") => owner.register("content", session => {
    sessions.push(session);
    const {attribution} = createAttributionCore({environment: session.environment});
    class Controller extends attribution.Controller {constructor(options: object) {super(options); controllers.push(this);}}
    (browser === "firefox" ? installFirefoxContent : installWhaleContent)({environment: session.environment, dependencies: {attribution: {Controller: () => Controller}}});
  });
  return {dom, w, root, logs, events, storageListeners, owner, sessions, controllers, inputs, textareas, select, file, fire, start,
    close() {try {contextEffectGate(root).dispose(); dom.window.close();} finally {globals.forEach((key, i) => saved[i] ? Object.defineProperty(globalThis, key, saved[i]!) : Reflect.deleteProperty(globalThis, key));}}};
}

for (const browser of ["firefox", "whale"] as const) {
  test(`${browser} A01+R01: 잘못된 B 선택은 늦은 A를 거절하고 다음 정상 C만 반영한다`, async () => {
    const h = host();
    try {
      h.start(browser); await until(() => h.inputs().every(input => input.dataset.aruSourceFileBound === "1"));
      const old = h.file("input-string-id.png", "old.png", true);
      h.select([old.input]); await until(() => old.started === 1);
      h.select([h.file("input-all-invalid.png").input]);
      await until(() => h.logs.some(args => args[0] === "[Aru Source Captioner] file: no Aru source metadata found in image"));
      old.release(); await tick(); assert.equal(h.textareas()[0].value, "댓글 본문");
      h.select([h.file("input-bad-url-valid-source.png").input]); await until(() => h.textareas()[0].value.includes(B));
      assert.ok(!h.textareas()[0].value.includes(A)); assert.equal(h.textareas()[1].value, "답글 본문");
    } finally {h.close();}
  });
  test(`${browser} A02+R01: 현재 File identity와 wrapper는 완료 순서가 역전돼도 독립적이다`, async () => {
    const h = host();
    try {
      h.start(browser); await until(() => h.inputs().every(input => input.dataset.aruSourceFileBound === "1"));
      const old = h.file("input-string-id.png", "same.png", true), current = h.file("input-bad-url-valid-source.png", "same.png");
      assert.notEqual(old.input, current.input);
      h.select([old.input]); await until(() => old.started === 1);
      h.select([current.input]); h.select([h.file("input-string-id.png").input], 1);
      await until(() => h.textareas()[0].value.includes(B) && h.textareas()[1].value.includes(A));
      old.release(); await tick();
      assert.equal(h.textareas()[0].value, `댓글 본문\n\n출처: ${B}\n`);
      assert.equal(h.textareas()[1].value, `답글 본문\n\n출처: ${A}\n`);
    } finally {h.close();}
  });
  for (const enabled of [true, false]) test(`${browser} A02+R01: 설정 ${enabled ? "ON" : "OFF"}의 실제 초기화와 파일 반영`, async () => {
    const h = host(true, enabled);
    try {
      h.start(browser); await until(() => h.owner.snapshot().state === (enabled ? "running" : "inactive"));
      if (enabled) await until(() => h.inputs()[0].dataset.aruSourceFileBound === "1");
      const image = h.file("input-string-id.png"); h.select([image.input]);
      if (enabled) await until(() => h.textareas()[0].value.includes(A));
      else {await tick(); assert.equal(image.started, 0); assert.equal(h.sessions.length, 0); assert.equal(h.textareas()[0].value, "댓글 본문");}
    } finally {h.close();}
  });
  test(`${browser} A02+R01: native 무효화 후 늦은 파싱과 다음 선택은 효과를 재개하지 않는다`, async () => {
    const h = host();
    try {
      h.start(browser); await until(() => h.inputs()[0].dataset.aruSourceFileBound === "1");
      const old = h.file("input-string-id.png", "old.png", true);
      h.select([old.input]); await until(() => old.started === 1);
      h.w.chrome.runtime.id = ""; assert.equal(contextEffectGate(h.root).allows(), false);
      old.release(); await tick();
      const next = h.file("input-bad-url-valid-source.png"); h.select([next.input]); await tick();
      assert.equal(next.started, 0); assert.equal(h.textareas()[0].value, "댓글 본문");
      assert.equal(h.owner.snapshot().native, "invalidated");
    } finally {h.close();}
  });
  test(`${browser} A02+R01: BFCache 새 session은 이전 파싱 결과와 선택 권한을 받지 않는다`, async () => {
    const h = host();
    try {
      h.start(browser); await until(() => h.inputs()[0].dataset.aruSourceFileBound === "1");
      const old = h.file("input-string-id.png", "old.png", true);
      h.select([old.input]); await until(() => old.started === 1);
      const first = h.sessions[0]; h.fire("pagehide");
      assert.equal(first.gate.allows(), false); assert.equal(h.inputs()[0].dataset.aruSourceFileBound, undefined);
      h.fire("pageshow"); await until(() => h.sessions.length === 2 && h.inputs()[0].dataset.aruSourceFileBound === "1");
      h.select([h.file("input-bad-url-valid-source.png").input]); await until(() => h.textareas()[0].value.includes(B));
      const before = h.textareas()[0].value; old.release(); await tick();
      assert.equal(h.textareas()[0].value, before); assert.ok(!before.includes(A)); assert.notEqual(h.sessions[0], h.sessions[1]);
    } finally {h.close();}
  });
  test(`${browser} A01+F01-A: 실제 PNG·EXIF JSON에서 검증된 출처만 정확한 이미지 링크로 표시한다`, async () => {
    const h = host(false);
    try {
      h.start(browser); await until(() => h.controllers.length === 1);
      const expected = [
        ["input-string-id.png", A], ["input-bad-url-valid-source.png", B], ["input-all-invalid.png", null],
        ["input-valid-url-bad-id.jpg", "https://www.pixiv.net/artworks/55667788"], ["input-bad-url-valid-source.jpg", B], ["input-all-invalid.jpg", null],
      ] as const;
      const files = expected.map(([name]) => h.file(name).input); h.select(files);
      await until(() => h.controllers[0].readyCount === files.length);
      const editor = h.w.document.querySelector(".note-editable")!;
      const nodes = [...expected].reverse().map(([name, url]) => {
        const p = h.w.document.createElement("p"), image = h.w.document.createElement("img"); image.alt = name; image.src = "https://i1.ruliweb.com/fixture.jpg";
        Object.defineProperties(image, {complete: {value: true}, naturalWidth: {value: 64}}); p.append(image); editor.append(p); return {p, name, url};
      });
      await until(() => editor.querySelectorAll("[data-aru-source-caption]").length === 5);
      for (const {p, name, url} of nodes) {
        const caption = p.nextElementSibling?.matches("[data-aru-source-caption]") ? p.nextElementSibling : null;
        const record = h.controllers[0].registry.records.find((row: {name: string}) => row.name === name);
        if (url) {const a = caption?.querySelector("a")!; assert.equal(a.href, url); assert.equal(a.textContent, "Pixiv - /artworks/" + url.split("/").at(-1)); assert.equal(record.info.url, url); assert.equal(record.consumed, true);}
        else {assert.equal(caption, null); assert.notEqual(record.info.status, "ok"); assert.equal(record.consumed, false);}
      }
      h.controllers[0].reconcile(); h.controllers[0].reconcile(); await tick();
      assert.equal(editor.querySelectorAll("[data-aru-source-caption]").length, 5);
      assert.equal(h.w.document.querySelector("#draft")!.textContent, "보존 본문");
      assert.equal(h.w.document.querySelector("#existing")!.textContent, "사용자 기존 캡션");
    } finally {h.close();}
  });
}

test("A02+R03: 실제 session Picker의 cleanup 예외와 10회 suspend/resume은 자원 소유권을 보존한다", async () => {
  const h = host(false), pickers: any[] = [], thrown: unknown[] = [];
  const first = Object.assign(Error("SYNTHETIC_PRIVATE_SESSION_CLEANUP"), {cause: "SYNTHETIC_PRIVATE_SESSION_CLEANUP"});
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {h.logs.push(args);};
  let shouldThrow = true;
  try {
    h.owner.register("picker", session => {
      h.sessions.push(session);
      const icons = createIconReader({environment: session.environment});
      const attach = icons.DesignSystem.attach;
      icons.DesignSystem = {...icons.DesignSystem, attach(...args: unknown[]) {const release = attach(...args); return () => {release?.(); if (shouldThrow) throw first;};}};
      const subscribe = session.gate.onStop.bind(session.gate);
      // 감지/정책을 대체하지 않고 실제 종료 callback의 throw identity만 관찰한다.
      session.gate.onStop = callback => subscribe(() => {try {callback();} catch (error) {thrown.push(error); throw error;}});
      pickers.push(icons.createPicker({catalogMode: false, uiPreferences: {read: async () => null}}));
    });
    await until(() => pickers.length === 1); await tick(); await tick();
    const originalResources = h.owner.snapshot().resources;
    for (let i = 0; i < 10; i++) {
      const old = pickers.at(-1); h.fire("pagehide");
      assert.equal(h.owner.snapshot().state, "suspended"); assert.equal(old.element.isConnected, false); assert.equal(old.getSnapshot().destroyed, true);
      assert.notEqual(h.w.document.body.style.overflow, "hidden"); assert.equal(h.w.document.querySelectorAll("[data-aru-icons-picker]").length, 0);
      if (i === 0) {assert.equal(thrown[0], first); shouldThrow = false;}
      assert.doesNotThrow(() => old.destroy());
      h.fire("pageshow"); h.fire("pageshow"); await until(() => pickers.length === i + 2); await tick(); await tick();
      assert.equal(h.w.document.querySelectorAll("[data-aru-icons-picker]").length, 1); assert.equal(h.w.document.body.style.overflow, "hidden");
      assert.equal(pickers.at(-1).getSnapshot().destroyed, false); assert.deepEqual(h.owner.snapshot().resources, originalResources);
      assert.equal(h.events.get("pagehide")!.size, 1); assert.equal(h.events.get("pageshow")!.size, 1);
    }
    assert.equal(thrown.length, 1); assert.equal(h.sessions.length, 11);
    assert.ok(!JSON.stringify(h.logs).includes("SYNTHETIC_PRIVATE_SESSION_CLEANUP"));
    assert.equal(h.w.document.querySelector("#draft")!.textContent, "보존 본문");
  } finally {try {h.close();} finally {console.warn = warn;}}
});
