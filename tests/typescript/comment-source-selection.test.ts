import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { JSDOM } from "jsdom";

type Source = { status: string; url?: string; reason?: string };
const A = "https://www.pixiv.net/artworks/123456789";
const B = "https://www.pixiv.net/artworks/987654321";
const missing: Source = { status: "missing", reason: "no_metadata" };

// 실제 함수 본문을 검증하고 파서의 완료 순서만 테스트에서 제어한다.
function fixture(browser: string) {
  const file = new URL(`../../src/platform/${browser}/content.ts`, import.meta.url);
  const input = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file.pathname, input, ts.ScriptTarget.Latest, true);
  const functions = new Set([
    "hookCommentFileInput", "buildCommentSourceText", "logCommentInsertSkip",
    "focusTextareaSafe", "checkInsertSkipReason", "buildMergedTextareaValue",
    "applyTextareaValue", "insertSourceIntoCommentTextarea",
  ]);
  const variables = new Set(["wrapperSourceMap", "commentFileSelections"]);
  const chunks: string[] = [];
  function collect(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && functions.has(node.name.text)) {
      chunks.push(node.getText(ast));
    }
    if (ts.isVariableDeclaration(node) && variables.has(node.name.getText(ast))) {
      chunks.push(`const ${node.getText(ast)};`);
    }
    ts.forEachChild(node, collect);
  }
  collect(ast);
  const dom = new JSDOM('<!doctype html><div class="common_write_wrapper"><input type="file" class="common_img_input"><textarea class="comment_input"></textarea></div>', { url: "https://bbs.ruliweb.com/community/board/300143/read/1" });
  const w = dom.window;
  const jobs: { file: File; resolve(value: Source): void; reject(error: Error): void }[] = [];
  const noop = () => {};
  const api = { runtime: { id: "r01-test-extension" } };
  const sandbox = vm.createContext({
    document: w.document, window: w, environment: { window: w, chrome: api }, chrome: api,
    HTMLElement: w.HTMLElement, HTMLInputElement: w.HTMLInputElement,
    HTMLTextAreaElement: w.HTMLTextAreaElement, Event: w.Event,
    console: { log: noop, debug: noop, info: noop, warn: noop },
    COMMENT_FILE_INPUT_SELECTOR: "input.common_img_input, input[type='file']",
    COMMENT_TEXTAREA_SELECTOR: "textarea.comment_input, textarea.reply_input",
    COMMENT_FILE_BOUND_DATASET_KEY: "aruSourceFileBound", COMMENT_SOURCE_PREFIX: "출처:",
    parseSourceFromFile: (file: File) => new Promise<Source>((resolve, reject) => jobs.push({ file, resolve, reject })),
    sanitizeSourceUrl: (url: string) => /^https:\/\/www\.pixiv\.net\/artworks\/\d+$/.test(url) ? url : null,
  });
  vm.runInContext(ts.transpileModule(chunks.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, sandbox);
  const state = vm.runInContext("commentFileSelections", sandbox) as WeakMap<HTMLInputElement, { revision: number; listener: (event: { target: HTMLInputElement }) => Promise<void> }>;
  const map = vm.runInContext("wrapperSourceMap", sandbox) as WeakMap<HTMLElement, string>;
  const wrapper = w.document.querySelector<HTMLElement>(".common_write_wrapper")!;
  const bind = (root = wrapper) => vm.runInContext("hookCommentFileInput", sandbox)(root, {});
  const fileInput = (root = wrapper) => root.querySelector<HTMLInputElement>("input")!;
  const textarea = (root = wrapper) => root.querySelector<HTMLTextAreaElement>("textarea")!;
  const image = (name = "sample.webp", type = "image/webp") => new w.File(["synthetic"], name, { type }) as unknown as File;
  function select(files: File[], root = wrapper) {
    const input = fileInput(root);
    Object.defineProperty(input, "files", { configurable: true, value: files });
    return state.get(input)!.listener({ target: input });
  }
  bind();
  return { w, jobs, state, map, wrapper, bind, fileInput, textarea, image, select, api, close: () => w.close() };
}

for (const browser of ["firefox", "whale"]) {
  test(`${browser}: 정상 단일 선택은 textarea와 map에 같은 출처를 반영한다`, async () => {
    const f = fixture(browser);
    try {
      const task = f.select([f.image()]); f.jobs[0].resolve({ status: "ok", url: A }); await task;
      assert.equal(f.textarea().value, `출처: ${A}\n`); assert.equal(f.map.get(f.wrapper), A);
    } finally { f.close(); }
  });
  for (const kind of ["missing", "non-image", "empty"]) test(`${browser}: A 대기 중 B ${kind} 선택은 이전 결과와 map을 폐기한다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image("A.webp")]);
      const next = f.select(kind === "empty" ? [] : [f.image("B", kind === "non-image" ? "text/plain" : "image/webp")]);
      if (kind === "missing") f.jobs[1].resolve(missing);
      await next; assert.equal(f.map.has(f.wrapper), false);
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
    } finally { f.close(); }
  });
  test(`${browser}: B 완료 뒤 늦은 A는 B의 textarea와 map을 덮지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image("A.webp")]), next = f.select([f.image("B.webp")]);
      f.jobs[1].resolve({ status: "ok", url: B }); await next;
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea().value, `출처: ${B}\n`); assert.equal(f.map.get(f.wrapper), B);
    } finally { f.close(); }
  });
  test(`${browser}: B 파싱 중 A가 먼저 끝나도 신규 선택을 승인하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image("A.webp")]), next = f.select([f.image("B.webp")]);
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
      f.jobs[1].resolve({ status: "ok", url: B }); await next; assert.equal(f.map.get(f.wrapper), B);
    } finally { f.close(); }
  });
  test(`${browser}: 동일 File 재선택도 별도 revision이며 현재 결과만 1회 반영한다`, async () => {
    const f = fixture(browser);
    try {
      const file = f.image(), old = f.select([file]), next = f.select([file]);
      f.jobs[0].resolve({ status: "ok", url: A }); await old; assert.equal(f.textarea().value, "");
      f.jobs[1].resolve({ status: "ok", url: A }); await next;
      assert.equal(f.textarea().value, `출처: ${A}\n`); assert.equal(f.map.get(f.wrapper), A);
    } finally { f.close(); }
  });
  test(`${browser}: 서로 다른 댓글·답글 wrapper는 선택 상태를 공유하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const reply = f.wrapper.cloneNode(true) as HTMLElement; reply.querySelector("textarea")!.className = "reply_input";
      f.w.document.body.append(reply); f.bind(reply);
      const first = f.select([f.image("A.webp")]), second = f.select([f.image("B.webp")], reply);
      f.jobs[1].resolve({ status: "ok", url: B }); await second; f.jobs[0].resolve({ status: "ok", url: A }); await first;
      assert.equal(f.textarea().value, `출처: ${A}\n`); assert.equal(f.map.get(f.wrapper), A);
      assert.equal(f.textarea(reply).value, `출처: ${B}\n`); assert.equal(f.map.get(reply), B);
    } finally { f.close(); }
  });
  for (const kind of ["input", "wrapper", "textarea"]) test(`${browser}: ${kind} DOM 교체는 이전 대상의 반영을 거절한다`, async () => {
    const f = fixture(browser);
    try {
      const oldTextarea = f.textarea(), old = f.select([f.image("A.webp")]);
      let current = f.wrapper;
      if (kind === "wrapper") { current = f.wrapper.cloneNode(true) as HTMLElement; f.wrapper.replaceWith(current); }
      else if (kind === "input") f.fileInput().replaceWith(f.fileInput().cloneNode(true));
      else oldTextarea.replaceWith(oldTextarea.cloneNode(true));
      if (kind !== "textarea") f.bind(current);
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(oldTextarea.value, ""); assert.equal(f.textarea(current).value, ""); assert.equal(f.map.has(f.wrapper), false);
      if (kind !== "textarea") {
        const task = f.select([f.image("B.webp")], current); f.jobs[1].resolve({ status: "ok", url: B }); await task;
        assert.equal(f.map.get(current), B); assert.equal(f.textarea(current).value, `출처: ${B}\n`);
      }
    } finally { f.close(); }
  });
  test(`${browser}: 같은 input이 새 wrapper로 이동하면 이전 listener와 결과를 넘기지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const input = f.fileInput(), previous = f.state.get(input)!, old = f.select([f.image("A.webp")]);
      const fresh = f.wrapper.cloneNode(true) as HTMLElement; fresh.querySelector("input")!.replaceWith(input); f.wrapper.replaceWith(fresh); f.bind(fresh);
      assert.notEqual(f.state.get(input), previous);
      const current = f.select([f.image("B.webp")], fresh); f.jobs[1].resolve({ status: "ok", url: B }); await current;
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea(fresh).value, `출처: ${B}\n`); assert.equal(f.map.has(f.wrapper), false); assert.equal(f.map.get(fresh), B);
    } finally { f.close(); }
  });
  test(`${browser}: change 없이 FileList만 달라져도 이름이 같은 다른 File 결과를 거절한다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image("same.webp")]); Object.defineProperty(f.fileInput(), "files", { configurable: true, value: [f.image("same.webp")] });
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
    } finally { f.close(); }
  });
  test(`${browser}: 반복 hook은 listener를 추가하거나 진행 중 revision을 초기화하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image()]), state = f.state.get(f.fileInput())!;
      assert.equal(f.bind(), false); assert.equal(f.state.get(f.fileInput()), state); assert.equal(state.revision, 1);
      f.jobs[0].resolve({ status: "ok", url: A }); await old; assert.equal(f.map.get(f.wrapper), A);
    } finally { f.close(); }
  });
  test(`${browser}: 이전 map은 새 선택 즉시 지우되 기존 본문·출처는 삭제하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      f.textarea().value = "사용자 본문"; const first = f.select([f.image()]); f.jobs[0].resolve({ status: "ok", url: A }); await first;
      const before = f.textarea().value; const next = f.select([f.image("B.webp")]);
      assert.equal(f.map.has(f.wrapper), false); assert.equal(f.textarea().value, before);
      f.jobs[1].resolve(missing); await next; assert.equal(f.textarea().value, before); assert.equal(f.map.has(f.wrapper), false);
    } finally { f.close(); }
  });
  test(`${browser}: 기존 출처가 있어도 현재 map은 B이며 기존 문구는 바꾸지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const before = `사용자 본문\n출처: ${A}\n`; f.textarea().value = before;
      const task = f.select([f.image()]); f.jobs[0].resolve({ status: "ok", url: B }); await task;
      assert.equal(f.textarea().value, before); assert.equal(f.map.get(f.wrapper), B);
    } finally { f.close(); }
  });
  test(`${browser}: 취소로 기존 선택이 그대로이면 현재 작업은 유효하다`, async () => {
    const f = fixture(browser);
    try {
      const task = f.select([f.image()]); f.fileInput().dispatchEvent(new f.w.Event("cancel"));
      assert.equal(f.state.get(f.fileInput())!.revision, 1);
      f.jobs[0].resolve({ status: "ok", url: A }); await task; assert.equal(f.map.get(f.wrapper), A);
    } finally { f.close(); }
  });
  test(`${browser}: parser 실패·위험 URL 뒤에도 다음 정상 선택은 독립 처리한다`, async () => {
    const f = fixture(browser);
    try {
      const failed = f.select([f.image()]); f.jobs[0].reject(Error("fixture parser failure")); await failed;
      const unsafe = f.select([f.image()]); f.jobs[1].resolve({ status: "ok", url: "javascript:alert(1)" }); await unsafe;
      assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
      const good = f.select([f.image()]); f.jobs[2].resolve({ status: "ok", url: B }); await good;
      assert.equal(f.textarea().value, `출처: ${B}\n`); assert.equal(f.map.get(f.wrapper), B);
    } finally { f.close(); }
  });
  for (const kind of ["missing", "changed", "getter"]) test(`${browser}: native ID ${kind} 뒤의 결과는 textarea와 map에 반영하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const old = f.select([f.image()]);
      if (kind === "getter") Object.defineProperty(f.api.runtime, "id", { configurable: true, get() { throw Error("Extension context invalidated."); } });
      else f.api.runtime.id = kind === "missing" ? "" : "replacement-extension";
      f.jobs[0].resolve({ status: "ok", url: A }); await old;
      assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
      Object.defineProperty(f.api.runtime, "id", { configurable: true, writable: true, value: "r01-test-extension" });
      await f.select([f.image("new.webp")]);
      assert.equal(f.jobs.length, 1); assert.equal(f.map.has(f.wrapper), false);
    } finally { f.close(); }
  });
  test(`${browser}: native 컨텍스트가 없으면 파싱을 시작하지 않는다`, async () => {
    const f = fixture(browser);
    try {
      f.api.runtime.id = ""; await f.select([f.image()]);
      assert.equal(f.jobs.length, 0); assert.equal(f.textarea().value, ""); assert.equal(f.map.has(f.wrapper), false);
    } finally { f.close(); }
  });
  test(`${browser}: 실제 DOM change 전달에서도 반복 hook·재결합은 파서를 한 번만 호출한다`, async () => {
    const f = fixture(browser);
    try {
      const input = f.fileInput(), next = f.wrapper.cloneNode(true) as HTMLElement;
      next.querySelector("input")!.replaceWith(input); f.wrapper.replaceWith(next); f.bind(next); assert.equal(f.bind(next), false);
      Object.defineProperty(input, "files", { configurable: true, value: [f.image()] });
      input.dispatchEvent(new f.w.Event("change", { bubbles: true })); assert.equal(f.jobs.length, 1);
      f.jobs[0].resolve({ status: "ok", url: B });
      for (let i = 0; i < 8; i++) await Promise.resolve();
      assert.equal(f.map.get(next), B); assert.equal(f.textarea(next).value, `출처: ${B}\n`);
    } finally { f.close(); }
  });
  test(`${browser}: 교체된 옛 input 이벤트는 새 input의 출처 map을 지우지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const oldInput = f.fileInput(), oldState = f.state.get(oldInput)!;
      oldInput.replaceWith(oldInput.cloneNode(true)); f.bind();
      const current = f.select([f.image()]); f.jobs[0].resolve({ status: "ok", url: B }); await current;
      await oldState.listener({ target: oldInput });
      assert.equal(f.map.get(f.wrapper), B); assert.equal(f.textarea().value, `출처: ${B}\n`);
    } finally { f.close(); }
  });
  test(`${browser}: 옛 input 재결합이 이전 wrapper의 새로운 선택 map을 지우지 않는다`, async () => {
    const f = fixture(browser);
    try {
      const oldInput = f.fileInput(); oldInput.remove();
      const replacement = f.w.document.createElement("input"); replacement.type = "file"; replacement.className = "common_img_input";
      f.wrapper.prepend(replacement); f.bind(); const current = f.select([f.image()]);
      f.jobs[0].resolve({ status: "ok", url: B }); await current;
      const other = f.wrapper.cloneNode(true) as HTMLElement; other.querySelector("input")!.replaceWith(oldInput); f.w.document.body.append(other); f.bind(other);
      assert.equal(f.map.get(f.wrapper), B); assert.equal(f.map.has(other), false);
    } finally { f.close(); }
  });
}
