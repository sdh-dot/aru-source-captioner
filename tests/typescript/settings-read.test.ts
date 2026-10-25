import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";
import { JSDOM } from "jsdom";
import { readSettings, type SettingsClock, type SettingsEnvironment } from "../../src/runtime/settings-read.ts";
import { createBrowserAdapter } from "../../src/ruliweb-icons/browser-adapter.ts";
import { createIconsFeature } from "../../src/ruliweb-icons/feature.ts";
import { createAttributionUi } from "../../src/upload-attribution/ui.ts";
import { installFirefoxContent } from "../../src/platform/firefox/content.ts";
import { installWhaleContent } from "../../src/platform/whale/content.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
class Clock implements SettingsClock {
  now = 0;
  next = 0;
  jobs = new Map<number, { at: number; callback: () => void }>();
  delays: number[] = [];
  setTimeout(callback: () => void, delay: number) {
    this.delays.push(delay);
    const id = ++this.next;
    this.jobs.set(id, { at: this.now + delay, callback });
    return id;
  }
  clearTimeout(id: unknown) { this.jobs.delete(id as number); }
  async tick(ms: number) {
    const end = this.now + ms;
    await flush();
    while (true) {
      const job = [...this.jobs].sort((a, b) => a[1].at - b[1].at)[0];
      if (!job || job[1].at > end) break;
      this.now = job[1].at;
      this.jobs.delete(job[0]);
      job[1].callback();
      await flush();
    }
    this.now = end;
  }
}
type Listener = (changes: Record<string, unknown>, area: string) => void;
function storage(mode: "callback" | "promise" = "callback") {
  const listeners = new Set<Listener>();
  const callbacks: ((value: unknown) => void)[] = [];
  let data: unknown = { enabled: true };
  let calls = 0;
  let writes = 0;
  let implementation = (_keys: unknown, cb?: (value: unknown) => void): unknown => {
    if (mode === "promise") return Promise.resolve(data);
    cb!(data);
  };
  const api = { runtime: {} as { lastError?: { message: string } }, storage: {
    sync: { get(...args: unknown[]) { calls++; return implementation(args[0], args[1] as typeof callbacks[number]); },
      set() { writes++; } },
    onChanged: { addListener(fn: Listener) { listeners.add(fn); }, removeListener(fn: Listener) { listeners.delete(fn); } },
  } };
  const root = { [mode === "promise" ? "browser" : "chrome"]: api } as SettingsEnvironment;
  return { root, api, listeners, callbacks, get calls() { return calls; }, get writes() { return writes; },
    data(value: unknown) { data = value; },
    use(fn: typeof implementation) { implementation = fn; },
    defer() { implementation = (_, cb) => { if (cb) callbacks.push(cb); else return new Promise(resolve => callbacks.push(resolve)); }; },
    change(value: unknown, area = "sync") { for (const listener of [...listeners]) listener({ enabled: { newValue: value } }, area); },
  };
}

for (const mode of ["callback", "promise"] as const) {
  for (const [name, values] of [["ON", { enabled: true }], ["OFF", { enabled: false }], ["키 부재", {}]] as const) {
    test(`${mode}: 정상 ${name}과 성공 상태를 보존한다`, async () => {
      const h = storage(mode); h.data(values);
      assert.deepEqual(await readSettings(h.root, ["enabled"]), { state: "success", attempts: 1, values });
      assert.equal(h.calls, 1); assert.equal(h.writes, 0); assert.equal(h.listeners.size, 0);
    });
  }
  test(`${mode}: 오류 후 200ms·500ms만 재시도하며 저장하지 않는다`, async () => {
    const h = storage(mode), clock = new Clock();
    h.use(() => { throw Error("read failed"); });
    const pending = readSettings(h.root, null, { clock });
    await clock.tick(199); assert.equal(h.calls, 1);
    await clock.tick(1); assert.equal(h.calls, 2);
    await clock.tick(499); assert.equal(h.calls, 2);
    await clock.tick(1); const result = await pending;
    assert.equal(result.state, "failed"); assert.equal(result.attempts, 3);
    assert.deepEqual(clock.delays, [1000, 200, 1000, 500, 1000]);
    assert.equal(h.writes, 0); assert.equal(h.listeners.size, 0); assert.equal(clock.jobs.size, 0);
  });
  test(`${mode}: 컨텍스트 무효화는 재시도하지 않는다`, async () => {
    const h = storage(mode), clock = new Clock();
    h.use(() => mode === "promise" ? Promise.reject(Error("Extension context invalidated.")) : (() => { throw Error("Extension context invalidated."); })());
    const result = await readSettings(h.root, null, { clock });
    assert.equal(result.state, "invalidated"); assert.equal(h.calls, 1); assert.equal(clock.jobs.size, 0);
  });
  test(`${mode}: 1초 응답 상한과 늦은 ON 거부`, async () => {
    const h = storage(mode), clock = new Clock(); h.defer();
    const pending = readSettings(h.root, null, { clock });
    await clock.tick(1000); h.callbacks[0]({ enabled: true }); await flush();
    await clock.tick(200); h.callbacks[1]({ enabled: false });
    const result = await pending;
    assert.deepEqual(result, { state: "success", values: { enabled: false }, attempts: 2 });
    h.callbacks[0]({ enabled: true }); await flush();
    assert.equal(h.listeners.size, 0); assert.equal(clock.jobs.size, 0);
  });
  test(`${mode}: 무응답은 3.7초에서 끝나고 늦은 응답으로 되살아나지 않는다`, async () => {
    const h = storage(mode), clock = new Clock(); h.defer();
    const pending = readSettings(h.root, null, { clock });
    await clock.tick(3700); const result = await pending;
    assert.equal(result.state, "failed"); assert.equal(result.attempts, 3);
    if (result.state !== "success") assert.equal(result.error.code, "SETTINGS_TIMEOUT");
    h.callbacks.forEach(cb => cb({ enabled: true })); await flush();
    assert.equal(h.calls, 3); assert.equal(clock.jobs.size, 0);
  });
  test(`${mode}: 조회 중 OFF 변경은 이전 ON 응답을 취소하며 새 조회에서 OFF를 읽는다`, async () => {
    const h = storage(mode); h.defer();
    const pending = readSettings(h.root, ["enabled"]);
    h.change(false); h.callbacks[0]({ enabled: true });
    assert.equal((await pending).state, "cancelled");
    h.data({ enabled: false }); h.use((_, cb) => mode === "promise" ? Promise.resolve({ enabled: false }) : cb!({ enabled: false }));
    assert.deepEqual(await readSettings(h.root, ["enabled"]), { state: "success", values: { enabled: false }, attempts: 1 });
  });
}

test("API 없음·getter 예외·callback lastError·Promise reject·잘못된 응답은 빈 설정 성공이 아니다", async () => {
  const fixtures: [string, SettingsEnvironment, string][] = [
    ["API 없음", {}, "API_UNAVAILABLE"],
    ["getter 예외", { get chrome() { throw Error("getter failed"); } }, "getter failed"],
  ];
  const callback = storage(); callback.api.runtime.lastError = { message: "callback failed" };
  fixtures.push(["lastError", callback.root, "callback failed"]);
  const promise = storage("promise"); promise.use(() => Promise.reject(Error("promise failed")));
  fixtures.push(["reject", promise.root, "promise failed"]);
  for (const value of [undefined, null, [], true]) {
    const h = storage(); h.data(value); fixtures.push([String(value), h.root, "SETTINGS_INVALID_RESPONSE"]);
  }
  for (const [name, root, expected] of fixtures) {
    const clock = new Clock(), pending = readSettings(root, null, { clock });
    await clock.tick(3700); const result = await pending;
    assert.equal(result.state, "failed", name); assert.equal(result.attempts, 3, name);
    if (result.state !== "success") assert.ok(result.error.code === expected || result.error.message === expected, name);
  }
});
test("callback과 반환 Promise가 함께 있어도 한 번 호출하고 최초 완료만 사용한다", async () => {
  const h = storage(); h.use((_, cb) => { cb!({ enabled: false }); return Promise.resolve({ enabled: true }); });
  assert.deepEqual(await readSettings(h.root, null), { state: "success", values: { enabled: false }, attempts: 1 });
  assert.equal(h.calls, 1);
});
test("동기 ON 응답 직후 같은 tick의 OFF 변경도 이전 승인을 취소한다", async () => {
  const h = storage();
  const pending = readSettings(h.root, null); h.change(false);
  assert.equal((await pending).state, "cancelled");
});
test("callback lastError의 컨텍스트 무효화도 재시도하지 않는다", async () => {
  const h = storage(); h.api.runtime.lastError = { message: "Extension context invalidated." };
  assert.equal((await readSettings(h.root, null)).state, "invalidated"); assert.equal(h.calls, 1);
});
test("재시도 대기 중 취소하면 다음 호출이나 타이머가 남지 않는다", async () => {
  const h = storage(), clock = new Clock(), controller = new AbortController();
  h.use(() => { throw Error("temporary"); });
  const pending = readSettings(h.root, null, { clock, signal: controller.signal });
  await clock.tick(100); controller.abort(); await clock.tick(1000);
  assert.equal((await pending).state, "cancelled"); assert.equal(h.calls, 1); assert.equal(clock.jobs.size, 0);
});
test("일시 실패 후 복구·외부 취소·무관한 local 변경을 구분한다", async () => {
  const h = storage(), clock = new Clock(); h.use(() => { throw Error("temporary"); });
  const pending = readSettings(h.root, ["enabled"], { clock }); await clock.tick(199);
  h.use((_, cb) => cb!({ enabled: false })); await clock.tick(1);
  assert.equal((await pending).state, "success");
  h.defer(); const controller = new AbortController();
  const stopped = readSettings(h.root, null, { signal: controller.signal, clock });
  controller.abort(); assert.equal((await stopped).state, "cancelled");
  const local = readSettings(h.root, ["enabled"]); h.change(false, "local"); h.callbacks.at(-1)!({});
  assert.equal((await local).state, "success"); assert.equal(h.listeners.size, 0);
});

function uiHarness(mode: "callback" | "promise" = "callback") {
  const dom = new JSDOM('<div class="seditor"><div class="note-toolbar"><button type="button">첨부</button></div><input type="file" accept="image/*"><div contenteditable="true"><p>기존 본문</p><span data-aru-source-caption>기존 출처</span></div></div>', { url: "https://bbs.ruliweb.com/community/board/300143/write" });
  const w = dom.window as unknown as RuntimeEnvironment;
  const h = storage(mode); Object.assign(w, h.root);
  const start = () => createAttributionUi({ environment: w, dependencies: { icons: { DesignSystem: () => ({ attach: () => () => {} }) } } });
  const count = () => w.document.querySelectorAll("[data-aru-native-upload-style]").length;
  return { ...h, w, start, count, close() { w.dispatchEvent(new w.Event("pagehide")); dom.window.close(); } };
}
for (const values of [{ enabled: true }, { enabled: false }, {}]) test("공통 UI Promise API의 ON·OFF·키 부재: " + JSON.stringify(values), async () => {
  const h = uiHarness("promise"); h.data(values);
  try { h.start(); await flush(); assert.equal(h.count(), values.enabled === false ? 0 : 1); }
  finally { h.close(); }
});
for (const [name, values, expected] of [["ON", { enabled: true }, 1], ["OFF", { enabled: false }, 0], ["키 부재", {}, 1]] as const) {
  test(`공통 UI: ${name} 정상 기본값·반복 초기화·해제`, async () => {
    const h = uiHarness(); h.data(values);
    try {
      h.start(); await flush(); assert.equal(h.count(), expected);
      h.start(); await flush(); assert.equal(h.count(), expected); assert.equal(h.listeners.size, 1);
      assert.equal(h.w.document.querySelector('[contenteditable]')?.textContent, "기존 본문기존 출처");
      h.w.dispatchEvent(new h.w.Event("pagehide")); assert.equal(h.count(), 0); assert.equal(h.listeners.size, 0);
    } finally { h.close(); }
  });
}
test("공통 UI: 대기·일시 조회 실패는 활성화하지 않으며 재조회 후 복구한다", async () => {
  const h = uiHarness(); h.defer();
  try {
    h.start(); assert.equal(h.count(), 0);
    h.callbacks[0]({ enabled: true }); await flush(); assert.equal(h.count(), 1);
    h.use(() => { throw Error("temporary storage read failure"); }); h.change(true);
    assert.equal(h.count(), 0); await flush(); assert.equal(h.count(), 0);
    h.use((_, cb) => cb!({ enabled: true })); h.change(true); await flush(); assert.equal(h.count(), 1);
  } finally { h.close(); }
});
test("공통 UI: 늦은 ON·OFF 재조회·pagehide 후 응답은 UI를 재생성하지 않는다", async () => {
  const h = uiHarness(); h.defer();
  try {
    h.start(); h.change(false); h.callbacks[0]({ enabled: true }); await flush(); assert.equal(h.count(), 0);
    h.callbacks[1]({ enabled: false }); await flush(); assert.equal(h.count(), 0);
    h.change(true); h.w.dispatchEvent(new h.w.Event("pagehide"));
    h.callbacks[2]({ enabled: true }); await flush(); assert.equal(h.count(), 0); assert.equal(h.listeners.size, 0);
  } finally { h.close(); }
});

test("Feature revision: 새 조회 대기 즉시 이전 ON을 중지하고 더 오래된 ON을 무시한다", async () => {
  const dom = new JSDOM('', { url: "https://example.invalid" });
  const w = dom.window as unknown as RuntimeEnvironment;
  const pending: ((value: unknown) => void)[] = [];
  let change: (value: any) => void = () => {};
  let pause = () => {};
  let listeners = 0;
  const adapter = { readOptions: () => new Promise(resolve => pending.push(resolve)),
    onChanged(cb: typeof change, onPending: typeof pause) { change = cb; pause = onPending; listeners++; return () => listeners--; } };
  const { icons } = createIconsFeature({ environment: w });
  const feature = new icons.IconFeature({ document: w.document, browser: adapter });
  const on = { active: true, aruIconsOptions: { enabled: true } }, off = { active: false, aruIconsOptions: { enabled: false } };
  try {
    const first = feature.start(); feature.start(); assert.equal(listeners, 1); assert.equal(feature.enabled, false);
    pending[0](on); await first; assert.equal(feature.enabled, true);
    const old = feature.applyOptions(); assert.equal(feature.enabled, false);
    pause(); pending[1](on); await old; assert.equal(feature.enabled, false);
    change(off); await flush(); assert.equal(feature.enabled, false);
    pause(); change(on); await flush(); assert.equal(feature.enabled, true);
    const failing = feature.applyOptions(); assert.equal(feature.enabled, false);
    feature.destroy(); pending[2](on); await failing; assert.equal(feature.enabled, false); assert.equal(listeners, 0);
  } finally { feature.destroy(); dom.window.close(); }
});

test("Adapter: 저장 변경 대기를 먼저 통지하고 정상 OFF 확인 결과만 전달한다", async () => {
  const h = storage(); h.defer();
  const adapter = createBrowserAdapter(h.root as RuntimeEnvironment);
  const seen: unknown[] = [];
  const stop = adapter.onChanged(value => seen.push(value.active), () => seen.push("pending"));
  h.change(false); assert.deepEqual(seen, ["pending"]);
  h.callbacks[0]({ enabled: false, aruIconsOptions: { enabled: true } }); await flush();
  assert.deepEqual(seen, ["pending", false]); stop(); assert.equal(h.listeners.size, 0);
});

for (const browser of ["firefox", "whale"]) {
  test(`${browser} 전체 Content: 초기 조회 무효화 시 파일 감지·캡션 효과를 설치하지 않는다`, async () => {
    const dom = new JSDOM('<input type="file" accept="image/*"><div class="note-editable" contenteditable="true">본문</div>', { url: "https://bbs.ruliweb.com/community/board/300143/write" });
    const w = dom.window as unknown as RuntimeEnvironment;
    let listeners = 0;
    const input = w.document.querySelector('input')!;
    const original = input.addEventListener.bind(input);
    input.addEventListener = ((...args: Parameters<typeof input.addEventListener>) => { listeners++; original(...args); }) as typeof input.addEventListener;
    const h = storage(); h.use(() => { throw Error("Extension context invalidated."); });
    w.chrome = h.api; w.console = { info() {}, warn() {}, log() {} };
    try {
      (browser === "firefox" ? installFirefoxContent : installWhaleContent)({ environment: w });
      await flush(); assert.equal(listeners, 0); assert.equal(h.calls, 1); assert.equal(h.writes, 0);
      assert.equal(w.document.querySelector('.note-editable')!.textContent, "본문");
    } finally { dom.window.close(); }
  });
  test(`${browser} 실제 Content loadConfig: 성공만 기본값 병합하고 실패는 중단한다`, async () => {
    const source = fs.readFileSync(new URL(`../../docs/source/platform/${browser}/content.mjs`, import.meta.url), "utf8");
    const ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
    let declaration = "";
    function walk(node: any) { if (!node || typeof node !== "object") return; if (node.type === "FunctionDeclaration" && node.id.name === "loadConfig") declaration = source.slice(node.start, node.end); for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") walk(value); }
    walk(ast); assert.ok(declaration);
    const defaults = { enabled: true, allowHttp: false };
    for (const values of [{}, { enabled: false }, { enabled: true, foreign: 1 }]) {
      const h = storage(); h.data(values);
      const run = vm.runInNewContext(declaration + ';loadConfig', { readSettings, environment: h.root, DEFAULT_OPTIONS: defaults });
      const output = await run(); assert.equal(output.enabled, values.enabled ?? true); assert.equal(output.foreign, undefined);
    }
    const h = storage(); h.use(() => { throw Error("Extension context invalidated."); });
    const run = vm.runInNewContext(declaration + ';loadConfig', { readSettings, environment: h.root, DEFAULT_OPTIONS: defaults });
    await assert.rejects(run(), /Extension context invalidated/);
  });
}
