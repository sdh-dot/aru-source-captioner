import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { JSDOM } from "jsdom";
import { PickerLifecycle } from "../../src/ruliweb-icons/picker-lifecycle.ts";
import { contextEffectGate, createEffectSessionGate } from "../../src/runtime/context-effect-gate.ts";

const source = fs.readFileSync(new URL("../../src/ruliweb-icons/picker.ts", import.meta.url), "utf8");
function declarations(names: string[], constants: string[] = []) {
  const sf = ts.createSourceFile("picker.ts", source, ts.ScriptTarget.Latest, true), pieces: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text || "")) pieces.push(node.getText(sf));
    if (ts.isVariableDeclaration(node) && constants.includes(node.name.getText(sf))) pieces.push("const " + node.getText(sf) + ";");
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return ts.transpileModule(pieces.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const marker = "SYNTHETIC_PRIVATE_CLEANUP";
function setup(failing: string[] = [], extra: { reenter?: string; consoleThrows?: boolean } = {}) {
  const dom = new JSDOM('<!doctype html><body style="overflow:auto"><button id="opener">open</button><textarea>기존 사용자 본문</textarea></body>', { url: "https://bbs.ruliweb.com/community/board/98/read/1" });
  const doc = dom.window.document, host = doc.createElement("div"); host.dataset.aruIconsPicker = "true";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = '<div id="group"><video src="synthetic:1"><source src="synthetic:source"></video></div><video src="synthetic:2"></video><img src="synthetic:image1"><img src="synthetic:image2">';
  doc.body.append(host);
  const seen: string[] = [], logs: unknown[][] = [], errors = new Map(failing.map(stage => [stage, Object.assign(new Error(marker), { cause: marker, stack: marker })]));
  let context: vm.Context;
  const record = (stage: string) => {
    seen.push(stage);
    if (context?.lifecycle) assert.equal(context.lifecycle.isClosed, true);
    if (extra.reenter === stage) context.destroy();
    if (errors.has(stage)) throw errors.get(stage);
  };
  const videos = [...root.querySelectorAll("video")];
  videos.forEach((video, i) => {
    video.pause = () => record("pause" + i); video.load = () => record("load" + i);
    const remove = video.removeAttribute.bind(video);
    video.removeAttribute = name => { record("videoSource" + i); remove(name); };
  });
  const images = [...root.querySelectorAll("img")];
  images.forEach((image, i) => { const remove = image.removeAttribute.bind(image); image.removeAttribute = name => { record("imageSource" + i); remove(name); }; });
  const mediaCleanups = new WeakMap(videos.map((video, i) => [video, () => record("mediaListener" + i)]));
  const group = root.querySelector("#group")!;
  let scrollCalls = 0;
  const scrollHandler = () => scrollCalls++;
  group.addEventListener("scroll", scrollHandler);
  const removeListener = group.removeEventListener.bind(group);
  group.removeEventListener = (...args) => { record("groupListener"); removeListener(...args); };
  const replace = root.replaceChildren.bind(root), removeHost = host.remove.bind(host);
  root.replaceChildren = (...nodes) => { record("shadow"); replace(...nodes); };
  host.remove = () => { record("host"); removeHost(); };
  const opener = doc.querySelector<HTMLButtonElement>("#opener")!;
  opener.focus = () => record("focus");
  const fold = { dispose: () => record("foldFallback") };
  const folds = new Map([["a", { dispose: () => record("foldA") }], ["b", { dispose: () => record("foldB") }]]);
  const console = { warn(...args: unknown[]) { if (extra.consoleThrows) throw Error("console failure"); logs.push(args); } };
  const documentGate = contextEffectGate({ window: dom.window });
  const effectGate = createEffectSessionGate(documentGate);
  const guardEvent = (event: Event) => { if (!effectGate.allows()) { event.preventDefault(); event.stopImmediatePropagation(); } };
  for (const type of ["click", "input", "change", "keydown", "submit", "pointerdown", "dblclick"]) root.addEventListener(type, guardEvent, true);
  let detachGate: (() => void) | undefined;
  context = vm.createContext({ document: doc, global: { console }, root, host, opener, mediaCleanups,
    guardEvent, detachGate: () => detachGate?.(),
    toastTimer: 1, searchTimer: 2, libraryFrame: 3, initialFocusFrame: 4, virtualFrame: 5,
    clearTimeout: (id: number) => record(id === 1 ? "toast" : "search"), cancelAnimationFrame: (id: number) => record("frame" + id),
    previewCleanup: () => record("preview"), library: { cancel: () => record("library") }, uiCleanup: () => record("ui"),
    events: { abort: () => record("events") }, visibilityObserver: { disconnect: () => record("visibility") }, resizeObserver: { disconnect: () => record("resize") },
    contexts: [{ viewport: group, content: group, scrollHandler }], mediaBudget: { reset: () => record("budgetReset"), destroy: () => record("budgetDestroy") }, catalogView: { destroy: () => record("catalog") },
    pack: {}, index: {}, displayTags: { clear: () => record("tags") }, collectionDiagnostics: {}, selectedIconId: "old", result: { old: true }, folds, fold, mobileInput: () => false,
    PickerLifecycle,
  });
  vm.runInContext(declarations(["lockPage", "pauseMedia", "cancelSearch", "teardownGroups", "disposePicker"], ["scrollLocks"]) + `
    const release = lockPage(document);
    const unlockPage = () => { recordUnlock(); release(); };
    const lifecycle = new PickerLifecycle(disposePicker);
    function destroy() { lifecycle.destroy(); }
    globalThis.lifecycle = lifecycle;
    globalThis.destroy = destroy;
    globalThis.locks = scrollLocks;
  `, Object.assign(context, { recordUnlock: () => record("unlock") }));
  detachGate = effectGate.onStop(() => context.destroy());
  return { dom, doc, host, root, videos, images, opener, seen, logs, errors, context, destroy: () => context.destroy(), scrollCalls: () => scrollCalls, close: () => { documentGate.dispose(); dom.window.close(); } };
}

test("정상 종료는 기존 정리 순서·본문·상태 초기화를 보존한다", () => {
  const h = setup(); try {
    h.destroy();
    assert.deepEqual(h.seen.slice(0, 9), ["toast", "search", "preview", "library", "ui", "frame3", "frame4", "events", "budgetReset"]);
    assert.deepEqual(h.seen.slice(-7), ["tags", "foldA", "foldB", "shadow", "host", "unlock", "focus"]);
    assert.equal(h.host.isConnected, false); assert.equal(h.doc.body.style.overflow, "auto");
    assert.equal(h.doc.querySelector("textarea")!.value, "기존 사용자 본문");
    assert.equal(h.context.pack, null); assert.equal(h.context.selectedIconId, null); assert.equal(h.context.contexts.length, 0);
    assert.equal(h.logs.length, 0);
    const before = [...h.seen]; h.destroy(); assert.deepEqual(h.seen, before);
  } finally { h.close(); }
});

for (const stage of ["toast", "search", "preview", "library", "ui", "frame3", "frame4", "events", "budgetReset", "frame5", "visibility", "resize", "groupListener", "mediaListener0", "pause0", "videoSource0", "load0", "mediaListener1", "pause1", "videoSource1", "load1", "budgetDestroy", "catalog", "imageSource0", "tags", "foldA", "shadow", "host", "focus"]) {
  test(stage + " 실패 후에도 독립 후속 정리·잠금 반납과 최초 오류 동일성을 보장한다", () => {
    const h = setup([stage]); try {
      assert.throws(h.destroy, error => error === h.errors.get(stage));
      assert.equal(h.context.lifecycle.isClosed, true);
      assert.equal(h.host.isConnected, false);
      assert.equal(h.doc.body.style.overflow, "auto");
      assert.ok(h.seen.includes("unlock")); assert.ok(h.seen.includes("focus"));
      if (stage === "foldA") assert.ok(h.seen.includes("foldB"));
      if (stage === "visibility") assert.ok(h.seen.includes("resize"));
      if (stage === "pause0") assert.ok(h.seen.includes("load0"));
      if (stage === "imageSource0") assert.ok(h.seen.includes("imageSource1"));
      assert.equal(h.logs.length, 1); assert.match(JSON.stringify(h.logs), /PICKER_CLEANUP_FAILED/);
      assert.ok(!JSON.stringify(h.logs).includes(marker));
      const count = h.seen.length; assert.doesNotThrow(h.destroy); assert.equal(h.seen.length, count);
    } finally { h.close(); }
  });
}

test("복수 실패와 콘솔 장애도 최초 예외를 덮어쓰지 않는다", () => {
  for (const consoleThrows of [false, true]) {
    const h = setup(["preview", "ui", "visibility", "foldA", "host", "focus"], { consoleThrows });
    try {
      assert.throws(h.destroy, error => error === h.errors.get("preview"));
      assert.equal(h.host.isConnected, false); assert.equal(h.doc.body.style.overflow, "auto");
      assert.ok(h.seen.includes("foldB"));
      if (!consoleThrows) assert.equal((h.logs[0][1] as { count: number }).count, 6);
    } finally { h.close(); }
  }
});

test("정리 중 재진입은 callback·lock을 중복 해제하지 않는다", () => {
  const h = setup([], { reenter: "preview" }); try {
    h.destroy(); assert.equal(h.seen.filter(x => x === "preview").length, 1); assert.equal(h.seen.filter(x => x === "unlock").length, 1);
  } finally { h.close(); }
});

test("현재 Picker의 observer·scroll listener와 미디어 정리가 실제 실행된다", () => {
  const h = setup(); try {
    const group = h.root.querySelector("#group")!;
    group.dispatchEvent(new h.dom.window.Event("scroll")); assert.equal(h.scrollCalls(), 1);
    h.destroy(); group.dispatchEvent(new h.dom.window.Event("scroll")); assert.equal(h.scrollCalls(), 1);
    assert.ok(h.seen.includes("visibility") && h.seen.includes("resize"));
    assert.ok(h.videos.every(video => !video.hasAttribute("src")));
    assert.ok(h.images.every(image => !image.hasAttribute("src")));
  } finally { h.close(); }
});

function locks() {
  const dom = new JSDOM('<!doctype html><body style="overflow:scroll!important"></body>');
  dom.window.document.documentElement.style.setProperty("overflow", "auto", "important");
  const ctx = vm.createContext({}); vm.runInContext(declarations(["lockPage"], ["scrollLocks"]) + ";globalThis.lockPage=lockPage;globalThis.locks=scrollLocks", ctx);
  return { dom, doc: dom.window.document, ctx };
}
test("복수 Picker는 마지막 소유자만 overflow 값과 priority를 복원한다", () => {
  const h = locks(); try {
    const a = h.ctx.lockPage(h.doc), b = h.ctx.lockPage(h.doc); a(); a();
    assert.equal(h.doc.body.style.overflow, "hidden"); assert.equal(h.ctx.locks.get(h.doc).count, 1);
    b(); b(); assert.equal(h.doc.body.style.overflow, "scroll"); assert.equal(h.doc.body.style.getPropertyPriority("overflow"), "important");
    assert.equal(h.doc.documentElement.style.overflow, "auto"); assert.equal(h.ctx.locks.has(h.doc), false);
  } finally { h.dom.window.close(); }
});
test("한 overflow 복원 실패도 다음 노드 복원과 lock 소유권 해제를 막지 않는다", () => {
  const h = locks(); try {
    const release = h.ctx.lockPage(h.doc), failure = Error("restore failed");
    const original = h.doc.documentElement.style.setProperty.bind(h.doc.documentElement.style);
    h.doc.documentElement.style.setProperty = () => { throw failure; };
    assert.throws(release, error => error === failure);
    assert.equal(h.doc.body.style.overflow, "scroll"); assert.equal(h.ctx.locks.has(h.doc), false);
    assert.doesNotThrow(release); h.doc.documentElement.style.setProperty = original;
    const fresh = h.ctx.lockPage(h.doc); fresh(); assert.equal(h.doc.body.style.overflow, "scroll");
  } finally { h.dom.window.close(); }
});
test("복원 도중 새 Picker의 잠금은 이전 release가 해제하지 않는다", () => {
  const h = locks(); try {
    const release = h.ctx.lockPage(h.doc); let next: (() => void) | null = null;
    const original = h.doc.documentElement.style.setProperty.bind(h.doc.documentElement.style);
    h.doc.documentElement.style.setProperty = (...args) => { original(...args); h.doc.documentElement.style.setProperty = original; next = h.ctx.lockPage(h.doc); };
    release(); assert.equal(h.doc.body.style.overflow, "hidden"); assert.equal(h.doc.documentElement.style.overflow, "hidden");
    assert.equal(h.ctx.locks.get(h.doc).count, 1); next!(); assert.equal(h.doc.body.style.overflow, "scroll");
  } finally { h.dom.window.close(); }
});

const require = createRequire(import.meta.url);
const { harness } = require("../../docs/tests/tag-display/harness.cjs");
test("실제 Picker 생성·검색·선택과 실패 뒤 재열기가 기존 본문을 보존한다", async () => {
  const h = harness(); try {
    h.images(3); const pack = h.collect().pack;
    let throwCleanup = true;
    const original = h.A.DesignSystem?.attach;
    h.A.DesignSystem = { ...h.A.DesignSystem, modalHeader() {}, attach() { return () => { if (throwCleanup) throw Error("ui cleanup"); }; } };
    const p = h.A.createPicker({ catalogMode: false, uiPreferences: { read: async () => null } }); p.setPack(pack); p.setQuery("아루");
    assert.equal(p.getSnapshot().uniqueCount, 3); p.shadowRoot.querySelector(".icon-card").click();
    assert.ok(p.getSnapshot().selectedIconId);
    assert.throws(() => p.destroy(), /ui cleanup/); assert.equal(p.element.isConnected, false); assert.equal(p.getSnapshot().destroyed, true);
    throwCleanup = false; const next = h.A.createPicker({ catalogMode: false }); next.setPack(pack); next.setQuery("아루");
    assert.equal(next.getSnapshot().uniqueCount, 3); next.destroy(); assert.equal(next.element.isConnected, false);
    h.A.DesignSystem.attach = original;
  } finally { h.destroy(); }
});
test("늦은 UI 설정 응답과 insertion Promise는 종료된 Picker나 새 Picker를 바꾸지 않는다", async () => {
  const h = harness(); try {
    h.images(1); const pack = h.collect().pack; let resolveUi!: (value: object) => void, resolveInsert!: (value: string) => void;
    const ui = new Promise(resolve => { resolveUi = resolve; });
    const insertion = new Promise(resolve => { resolveInsert = resolve; });
    const p = h.A.createPicker({ catalogMode: false, targetValid: true, uiPreferences: { read: () => ui }, onSelect: () => insertion }); p.setPack(pack);
    p.shadowRoot.querySelector(".icon-card").click(); p.shadowRoot.querySelector(".selection-art img").dispatchEvent(new h.w.Event("load"));
    p.shadowRoot.querySelector(".primary").click(); p.destroy();
    const next = h.A.createPicker({ catalogMode: false }); next.setPack(pack); const before = next.shadowRoot.innerHTML;
    resolveUi({ modalSize: "wide", previewVisible: false }); resolveInsert("late response"); await h.wait(20);
    assert.equal(p.getSnapshot().destroyed, true); assert.equal(p.element.isConnected, false);
    assert.equal(next.shadowRoot.innerHTML, before); assert.equal(next.element.isConnected, true); next.destroy();
  } finally { h.destroy(); }
});
test("이전 Picker 종료는 다른 Picker의 잠금·focus를 빼앗지 않는다", async () => {
  const h = harness(); try {
    const opener = h.w.document.createElement("button"); h.w.document.body.append(opener); let restored = 0; opener.focus = () => restored++;
    const a = h.A.createPicker({ opener, catalogMode: false }); const b = h.A.createPicker({ catalogMode: false });
    b.shadowRoot.querySelector("button").focus(); a.destroy();
    assert.equal(h.w.document.body.style.overflow, "hidden"); assert.equal(h.w.document.activeElement, b.element); assert.equal(restored, 0);
    b.destroy(); assert.notEqual(h.w.document.body.style.overflow, "hidden");
  } finally { h.destroy(); }
});
test("실제 scroll 복원 예외 뒤에도 focus와 나머지 노드 복원을 시도한다", () => {
  const h = setup(); try {
    const failure = Error("scroll restore");
    h.doc.documentElement.style.removeProperty = () => { throw failure; };
    assert.throws(h.destroy, error => error === failure);
    assert.equal(h.host.isConnected, false); assert.equal(h.doc.body.style.overflow, "auto");
    assert.equal(h.context.locks.has(h.doc), false); assert.ok(h.seen.includes("focus"));
    assert.deepEqual(Array.from((h.logs[0][1] as { stages: string[] }).stages), ["SCROLL_LOCK"]);
  } finally { h.close(); }
});
test("폴백 fold와 예외 값 undefined도 최초 전파 계약을 유지한다", () => {
  const h = setup(["preview", "foldFallback"]); try {
    h.context.folds.clear(); h.errors.set("preview", undefined as unknown as Error);
    let caught = false;
    try { h.destroy(); } catch (error) { caught = true; assert.equal(error, undefined); }
    assert.equal(caught, true); assert.ok(h.seen.includes("foldFallback")); assert.equal(h.host.isConnected, false);
  } finally { h.close(); }
});
test("종료 중 생성한 새 Picker의 host·scroll lock은 이전 정리가 유지한다", () => {
  const h = harness(); try {
    let next: ReturnType<typeof h.A.createPicker> | null = null, createDuringCleanup = true;
    h.A.DesignSystem = { modalHeader() {}, attach() { return () => { if (createDuringCleanup) { createDuringCleanup = false; next = h.A.createPicker({ catalogMode: false }); } }; } };
    const prior = h.A.createPicker({ catalogMode: false }); prior.destroy();
    assert.equal(prior.element.isConnected, false); assert.ok(next!.element.isConnected);
    assert.equal(h.w.document.body.style.overflow, "hidden"); next!.destroy();
    assert.notEqual(h.w.document.body.style.overflow, "hidden");
  } finally { h.destroy(); }
});
test("위 Picker를 닫으면 아래 Picker의 opener에만 focus를 복원한다", () => {
  const h = harness(); try {
    const a = h.A.createPicker({ catalogMode: false }); const opener = a.shadowRoot.querySelector("button");
    const b = h.A.createPicker({ catalogMode: false, opener }); b.destroy();
    assert.equal(h.w.document.activeElement, a.element); assert.equal(a.shadowRoot.activeElement, opener);
    assert.equal(h.w.document.body.style.overflow, "hidden"); a.destroy();
  } finally { h.destroy(); }
});
test("모바일 편집 입력에는 기존처럼 focus를 되돌리지 않는다", () => {
  const h = setup(); try {
    h.context.mobileInput = () => true; h.opener.matches = () => true;
    h.destroy(); assert.ok(!h.seen.includes("focus")); assert.equal(h.host.isConnected, false);
  } finally { h.close(); }
});
