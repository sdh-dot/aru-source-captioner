import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import util from "node:util";
import ts from "typescript";
import { JSDOM } from "jsdom";
import exifr from "exifr";
import { parsePixivFilenameUrl } from "../../src/source-caption/pixiv-filename.ts";
import * as png from "../../src/source-caption/png-chunks.ts";
import { installFirefoxBackground } from "../../src/platform/firefox/background.ts";
import { installWhaleBackground } from "../../src/platform/whale/background.ts";
import { createDownloadBackground } from "../../src/body-download/background.ts";
import { createIconsComposerBridge } from "../../src/ruliweb-icons/composer-bridge.ts";
import { contextEffectGate } from "../../src/runtime/context-effect-gate.ts";
import { sessionResources } from "../../src/runtime/session-resources.ts";
import { readSettings, type SettingsReadResult } from "../../src/runtime/settings-read.ts";

const secret = "SYNTHETIC_PRIVATE_R02";
const sourceUrl = "https://www.pixiv.net/artworks/88442211";
const sensitiveError = () => Object.assign(new Error(secret + " message"), {
  stack: secret + " stack", cause: { token: secret }, code: secret,
});
function recorder() {
  const calls: unknown[][] = [];
  const console = Object.fromEntries(["log", "debug", "info", "warn", "error"].map(level => [level, (...args: unknown[]) => calls.push(args)]));
  return { calls, console, safe() {
    const serialized = JSON.stringify(calls);
    const inspected = util.inspect(calls, { depth: null });
    for (const text of [serialized, inspected]) {
      for (const forbidden of [secret, "88442211", "55667788", "https://", "C:\\private"])
        assert.ok(!text.includes(forbidden), "제품 콘솔에 원문이 남았다: " + forbidden);
    }
    const check = (value: unknown): void => {
      assert.ok(!(value instanceof Error), "Error 객체를 인자로 전달하면 안 된다");
      if (value && typeof value === "object") {
        assert.ok(Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]");
        Object.values(value).forEach(check);
      }
    };
    calls.forEach(args => args.forEach(check));
  } };
}

// 배포 생성물이 아닌 실제 TS 함수 본문을 실행하며, parser/DOM 경계만 합성한다.
function functions(browser: string, names: string[], constants: string[], globals: object) {
  const text = fs.readFileSync(new URL(`../../src/platform/${browser}/content.ts`, import.meta.url), "utf8");
  const sf = ts.createSourceFile("content.ts", text, ts.ScriptTarget.Latest, true);
  const pieces: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text || "")) pieces.push(node.getText(sf));
    if (ts.isVariableDeclaration(node) && constants.includes(node.name.getText(sf))) pieces.push("const " + node.getText(sf) + ";");
    ts.forEachChild(node, visit);
  }
  visit(sf);
  const code = ts.transpileModule(pieces.join("\n") + ";globalThis.subject={" + names.join(",") + "};", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code + ";subject", { ...globals });
}
const parserNames = ["isPngFile", "decodeAruPayloadFromItxtText", "parseAruArchivePngItxt", "extractSourceFromAruArchivePayload", "parseSourceFromFile", "isPixivUserUrl", "extractSourceUrl", "collectFromPossibleAruJson", "collectUrlCandidates", "walkStringFields", "safeJsonParse", "uniqueOrdered"];
const parserConstants = ["ARU_ITXT_KEYWORD", "ARU_PAYLOAD_URL_KEYS", "TEXT_FIELDS_FOR_JSON", "WALK_MAX_DEPTH", "URL_PATTERN"];
function parser(browser: string, log: ReturnType<typeof recorder>, parse: (...args: unknown[]) => unknown) {
  return functions(browser, parserNames, parserConstants, { ...png, parsePixivFilenameUrl, TextDecoder, TextEncoder, URL, Uint8Array, DataView, console: log.console, exifr: { parse } });
}

for (const browser of ["firefox", "whale"]) {
  test(browser + " 정상 EXIF 파일의 출처 결과를 보존하고 파일명·URL을 출력하지 않는다", async () => {
    const log = recorder();
    const p = parser(browser, log, async (file: unknown, options: unknown) => exifr.parse(Buffer.from(await (file as File).arrayBuffer()), options));
    const bytes = fs.readFileSync(new URL("fixtures/source-exif.jpg", import.meta.url));
    const result = await p.parseSourceFromFile(new File([bytes], secret + ".jpg", { type: "image/jpeg" }));
    assert.equal(result.status, "ok");
    assert.equal(result.url, "https://www.pixiv.net/artworks/55667788");
    log.safe();
  });
  test(browser + " 출처 없음·잘못된 메타데이터의 결과와 고정 실패 코드를 유지한다", async () => {
    const log = recorder();
    const p = parser(browser, log, async () => { throw sensitiveError(); });
    const result = await p.parseSourceFromFile(new File(["bad"], secret + ".webp", { type: "image/webp" }));
    assert.notEqual(result.status, "ok");
    assert.equal(result.url, null);
    assert.match(JSON.stringify(log.calls), /METADATA_PARSE_FAILED/);
    assert.equal(p.safeJsonParse('{"token":"' + secret), null);
    assert.match(JSON.stringify(log.calls), /JSON_PARSE_FAILED/);
    log.safe();
  });
  test(browser + " 정상적인 출처 부재는 오류나 원문 출력 없이 기존 missing 결과를 유지한다", async () => {
    const log = recorder();
    const p = parser(browser, log, async () => null);
    const result = await p.parseSourceFromFile(new File(["empty metadata"], secret + ".jpg", { type: "image/jpeg" }));
    assert.equal(result.status, "missing");
    assert.equal(result.url, null);
    assert.ok(!JSON.stringify(log.calls).includes("METADATA_PARSE_FAILED"));
    log.safe();
  });
  test(browser + " 파일명 fallback에서도 URL·작품 ID와 오류 getter를 출력하지 않는다", async () => {
    const log = recorder(); let reads = 0;
    const error = Object.defineProperties({}, Object.fromEntries(["message", "stack", "cause", "code"].map(key => [key, { get() { reads++; throw Error(secret); } }])));
    const p = parser(browser, log, async () => { throw error; });
    const result = await p.parseSourceFromFile(new File(["bad"], "88442211_p0 (1).jpg", { type: "image/jpeg" }));
    assert.equal(result.url, sourceUrl);
    assert.equal(reads, 0, "진단을 위해 오류 필드를 평가하지 않는다");
    log.safe();
  });
  test(browser + " Storage 실패·취소·무효화는 Fail-Closed이며 오류 원문을 출력하지 않는다", async () => {
    for (const failure of ["callback", "throw", "missing", "getter", "invalidated", "cancelled"]) {
      const log = recorder();
      const controller = new AbortController();
      if (failure === "cancelled") controller.abort();
      const chrome = { runtime: { id: "storage-policy-test-extension", lastError: failure === "invalidated" ? Error("Extension context invalidated. " + secret) : sensitiveError() }, storage: failure === "missing" ? undefined : { sync: { get(_keys: unknown, callback: (items: object) => void) { if (failure === "throw") throw sensitiveError(); callback({}); } } } };
      if (failure === "getter") Object.defineProperty(chrome, "storage", { get() { throw sensitiveError(); } });
      const environment = {chrome, console: log.console};
      let observed: SettingsReadResult | undefined;
      const p = functions(browser, ["loadConfig"], ["DEFAULT_OPTIONS"], {
        environment, console: log.console,
        readSettings: async (root: Parameters<typeof readSettings>[0], keys: null) => (observed = await readSettings(root, keys, {signal: controller.signal})),
      });
      await assert.rejects(p.loadConfig(), error => observed?.state !== "success" && error === observed?.error);
      assert.equal(observed?.state, failure === "invalidated" ? "invalidated" : failure === "cancelled" ? "cancelled" : "failed");
      assert.equal(observed?.attempts, ["invalidated", "cancelled"].includes(failure) ? 1 : 3);
      assert.equal(log.calls.length, 0, "조회 경계는 외부 오류를 콘솔에 넘기지 않는다");
      log.safe();
    }
    for (const [values, enabled] of [[{}, true], [{enabled: true}, true], [{enabled: false}, false]] as const) {
      const log = recorder();
      const environment = {chrome: {runtime: {id: "storage-success-test-extension"}, storage: {sync: {get(_keys: unknown, callback: (items: object) => void) {callback(values);}}}}, console: log.console};
      const p = functions(browser, ["loadConfig"], ["DEFAULT_OPTIONS"], {environment, readSettings, console: log.console});
      assert.equal((await p.loadConfig()).enabled, enabled, "정상 키 부재/ON/OFF는 기존 기본값·저장값을 보존한다");
      log.safe();
    }
  });
  for (const kind of ["comment_input", "reply_input"]) {
    test(browser + " " + kind + " 파일 선택·정상 삽입·재선택·예외의 본문과 진단을 보존한다", async () => {
      const dom = new JSDOM(`<div class="common_write_wrapper"><textarea class="${kind}"></textarea><input type="file"></div>`, { url: "https://bbs.ruliweb.com/community/board/98/read/1" });
      try {
        const w = dom.window, log = recorder(), wrapper = w.document.querySelector("div")!, input = w.document.querySelector("input")!, textarea = w.document.querySelector("textarea")!;
        textarea.value = secret + " 초안";
        let outcome: unknown = { status: "ok", url: sourceUrl };
        const chrome = {runtime: {id: "diagnostic-log-test-extension"}};
        const environment = {window: w, chrome, console: log.console};
        const effectGate = contextEffectGate(environment);
        const resources = sessionResources(environment as never, effectGate);
        const names = ["hookCommentFileInput", "buildCommentSourceText", "insertSourceIntoCommentTextarea", "buildMergedTextareaValue", "checkInsertSkipReason", "focusTextareaSafe", "logCommentInsertSkip", "applyTextareaValue"];
        const p = functions(browser, names, ["COMMENT_FILE_INPUT_SELECTOR", "COMMENT_TEXTAREA_SELECTOR", "COMMENT_FILE_BOUND_DATASET_KEY", "COMMENT_SOURCE_PREFIX", "wrapperSourceMap", "commentFileSelections"], {
          chrome, environment, effectGate, resources,
          document: w.document, HTMLElement: w.HTMLElement, HTMLInputElement: w.HTMLInputElement, HTMLTextAreaElement: w.HTMLTextAreaElement, Event: w.Event, console: log.console,
          parseSourceFromFile: async () => { if (outcome instanceof Error) throw outcome; return outcome; }, sanitizeSourceUrl: (value: string) => value,
        });
        assert.equal(p.hookCommentFileInput(wrapper, {}), true);
        const select = async (files: File[]) => { Object.defineProperty(input, "files", { configurable: true, value: files }); input.dispatchEvent(new w.Event("change")); await new Promise(resolve => setTimeout(resolve, 0)); };
        await select([new File(["x"], secret + ".jpg", { type: "image/jpeg" })]);
        assert.equal(textarea.value, secret + " 초안\n\n출처: " + sourceUrl + "\n");
        const prior = textarea.value;
        await select([new File(["x"], secret + ".jpg", { type: "image/jpeg" })]);
        assert.equal(textarea.value, prior, "같은 출처를 중복 삽입하지 않는다");
        outcome = { status: "missing", reason: secret }; await select([new File(["x"], secret + ".webp", { type: "image/webp" })]);
        outcome = sensitiveError(); await select([new File(["x"], secret + ".jpg", { type: "image/jpeg" })]);
        await select([]); await select([new File(["x"], secret + ".txt", { type: "text/plain" })]);
        assert.equal(textarea.value, prior);
        assert.match(JSON.stringify(log.calls), /COMMENT_METADATA_FAILED/);
        log.safe();
      } finally { dom.window.close(); }
    });
  }
}

for (const [browser, install] of [["firefox", installFirefoxBackground], ["whale", installWhaleBackground]] as const) {
  test(browser + " Background Storage·Native 실패와 성공 응답을 원문 없이 진단한다", () => {
    const log = recorder(); let installed = () => {}, changed = (_delta: object) => {}, response: unknown = { success: true, data: { message: secret } };
    const chrome = { runtime: { lastError: null as unknown, onInstalled: { addListener(fn: () => void) { installed = fn; } }, sendNativeMessage(_host: string, payload: unknown, callback: (value: unknown) => void) { assert.match(JSON.stringify(payload), /88442211/); callback(response); } }, storage: { sync: { get(_key: unknown, callback: (items: object) => void) { callback({}); }, set(_items: unknown, callback: () => void) { callback(); } } }, downloads: { onChanged: { addListener(fn: typeof changed) { changed = fn; } }, search(_id: object, callback: (items: object[]) => void) { callback([{ filename: "C:\\private\\88442211_p0.jpg", url: sourceUrl + "/88442211_p0.jpg" }]); } } };
    install({ environment: { chrome, console: log.console } as never, dependencies: { downloads: { ownsDownload: () => () => false } } });
    installed();
    chrome.runtime.lastError = sensitiveError(); installed(); changed({ state: { current: "complete" }, id: 1 });
    chrome.runtime.lastError = null; changed({ state: { current: "complete" }, id: 1 });
    response = { success: false, error: sensitiveError() }; changed({ state: { current: "complete" }, id: 1 });
    assert.match(JSON.stringify(log.calls), /STORAGE_READ_FAILED/);
    assert.match(JSON.stringify(log.calls), /NATIVE_MESSAGE_FAILED/);
    assert.match(JSON.stringify(log.calls), /NATIVE_EMBED_FAILED/);
    assert.match(JSON.stringify(log.calls), /NATIVE_EMBED_COMPLETE/);
    log.safe();
  });
}

test("다운로드 실패의 원장·사용자 메시지를 유지하고 콘솔에는 단계 코드만 남긴다", async () => {
  const log = recorder(); const listeners: Record<string, (...args: unknown[]) => unknown> = {}, saved: Record<string, unknown>[] = [];
  const event = (key: string) => ({ addListener(fn: (...args: unknown[]) => unknown) { listeners[key] = fn; } });
  const api = { contextMenus: { onClicked: event("clicked") }, runtime: { onInstalled: event("installed"), onStartup: event("startup"), getManifest: () => ({ host_permissions: [] }), getURL: () => "extension://manager" }, storage: { local: {}, onChanged: event("storage") }, tabs: {} };
  const call = async (_target: object, method: string, ...args: unknown[]) => { if (method === "set") { saved.push(args[0] as Record<string, unknown>); return; } throw sensitiveError(); };
  const D = { api, call, options: async () => true };
  const dependencies = { downloads: Object.fromEntries(Object.entries(D).map(([key, value]) => [key, () => value])) };
  createDownloadBackground({ environment: { console: log.console, TextEncoder, crypto } as never, dependencies });
  await new Promise(resolve => setTimeout(resolve, 0));
  listeners.clicked({ menuItemId: "aru-body-download-v1" }, { id: 1 });
  listeners.installed(); listeners.startup(); listeners.storage({ enabled: {} }, "sync");
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(saved.some(row => JSON.stringify(row).includes(secret)), "사용자 오류 원장 계약을 바꾸지 않는다");
  assert.match(JSON.stringify(log.calls), /DOWNLOAD_REQUEST_FAILED/);
  assert.match(JSON.stringify(log.calls), /DOWNLOAD_ERROR_UI_FAILED/);
  log.safe();
});

test("MAIN 작성기 요청 실패는 기존 응답을 유지하고 임의 작업명은 콘솔에 전달하지 않는다", () => {
  const dom = new JSDOM("<!doctype html>", { url: "https://bbs.ruliweb.com/community/board/98/read/1" });
  try {
    const w = dom.window, log = recorder(); let result = "";
    createIconsComposerBridge({ environment: Object.assign(w, { console: log.console }) as never });
    w.document.addEventListener("aru-icons-composer-response-v1", event => { result = (event as CustomEvent).detail; });
    w.document.dispatchEvent(new w.CustomEvent("aru-icons-composer-request-v1", { detail: JSON.stringify({ requestId: "synthetic_request_0001", op: secret, debug: true }) }));
    assert.equal(JSON.parse(result).error.code, "OP_INVALID");
    assert.match(JSON.stringify(log.calls), /COMPOSER_FAILED/);
    log.safe();
  } finally { dom.window.close(); }
});

// 모든 제품 sink를 실행해 객체 직렬화·optional console·오류 필드의 우회 노출도 검사한다.
function sourceFiles(directory: string): string[] { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(path.join(directory, entry.name)) : entry.name.endsWith(".ts") ? [path.join(directory, entry.name)] : []); }
for (const file of ["src", "entrypoints", "runtime", "config"].flatMap(directory => sourceFiles(new URL("../../" + directory, import.meta.url).pathname.replace(/^\/(\w:)/, "$1")))) {
  const text = fs.readFileSync(file, "utf8"), sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const sinks: ts.CallExpression[] = [];
  function visit(node: ts.Node) { if (ts.isCallExpression(node) && node.expression.getText(sf).includes("console")) sinks.push(node); ts.forEachChild(node, visit); }
  visit(sf);
  if (!sinks.length) continue;
  test("제품 콘솔 인자 전수 검사: " + file.split("/").slice(-2).join("/"), () => {
    for (const sink of sinks) {
      const log = recorder();
      let owner: ts.Node | undefined = sink.parent;
      while (owner && !ts.isFunctionLike(owner)) owner = owner.parent;
      const ownerName = owner && "name" in owner ? (owner.name as ts.Node)?.getText(sf) : "";
      const context = { console: log.console, global: { console: log.console }, kind: secret, file: { name: secret }, imageFile: { name: secret }, sourceInfo: { url: sourceUrl, reason: secret }, config: { strictAllowlist: secret, allowHttp: secret }, err: sensitiveError(), error: sensitiveError(), callbackErr: sensitiveError(), openError: sensitiveError(), response: { error: sensitiveError(), data: { message: secret } }, chrome: { runtime: { lastError: sensitiveError() } }, fields: { status: secret, message: secret, code: secret }, data: { kind: secret, icons: secret }, stage: secret, code: secret, row: { url: sourceUrl, articleId: "88442211" }, detail: { summary: { query: secret }, missing: [], images: [] }, failures: [], pack: { icons: [] }, context: { articleId: "88442211" }, reason: secret, textarea: { value: secret, maxLength: -1 }, existing: secret, newValue: secret, document: { contains: () => true, querySelector: () => null }, isRuliwebReadPage: () => true, hasRuliwebAiBlind: () => false, _findBoardMainView: () => null, isMobileAutoInsertEnvironment: () => false, exifr: {}, textareas: [], result: ownerName === "findCommentInputWrappers" ? [] : "ok", hookedFileInputs: 0, injected: 0, updates: {}, allowed: false, blocked: false, shouldOpen: false, maxLen: 0, cx: 0, cy: 0, hasAiBlind: false, imgCount: 0, textLength: 0, tableWidth: 1, tableHeight: 1, sourceUrl, root: { isConnected: true }, location: { href: sourceUrl }, navigator: { userAgent: secret } };
      Object.assign(context.root, {console: log.console});
      Object.assign(context, {environment: {console: log.console}});
      const js = ts.transpileModule(sink.getText(sf), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
      vm.runInNewContext(js, context);
      assert.equal(log.calls.length, 1, file + ":" + (sf.getLineAndCharacterOfPosition(sink.getStart(sf)).line + 1));
      log.safe();
    }
  });
}
