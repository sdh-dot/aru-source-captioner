import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { buildSync } from "esbuild";
import { parse } from "acorn";
import exifr from "exifr";
import { parsePixivFilenameUrl } from "../../src/source-caption/pixiv-filename.ts";
import * as png from "../../src/source-caption/png-chunks.ts";

const url = "https://www.pixiv.net/artworks/143805797";
for (const name of [
  "143805797_p0_master1200.jpg", "143805797_p0_master1200 (1).jpg",
  "143805797_p0_master1200 (2).jpg", "143805797_p0_master1200 (123).jpg",
  "143805797_p1(3).PNG", "pixiv_143805797 (1).jpg", "illust-143805797_p0 (2).webp",
  "C:\\Downloads\\143805797_p0_master1200 (1).jpg",
  "143805797%5Fp0_master1200%20(1).jpg",
]) {
  test("Pixiv 표식과 다운로드 번호를 판독한다: " + name, () => {
    assert.equal(parsePixivFilenameUrl(name), url);
  });
}
for (const name of [
  null, undefined, 143805797, "", "normal (1).jpg", "143805797.jpg",
  "143805797 (1).jpg", "screenshot_143805797.jpg", "143805797_master1200.jpg",
  "143805797_p0_master1200 (x).jpg", "143805797_p0 (0).jpg",
  "143805797_p0 (-1).jpg", "143805797_p0 (01).jpg", "143805797_p0 (1) (2).jpg",
  "143805797_p0.jpg.exe", "143805797_p0foo.jpg", "143805797_p-1.jpg",
  "12345_p0.jpg", "1234567890123_p0.jpg", "143805797_p0.txt", "1a1420fd7bc3a28af.webp",
]) {
  test("일반 파일명·불완전 표식·확장자 위장을 거부한다: " + String(name), () => {
    assert.equal(parsePixivFilenameUrl(name), null);
  });
}

function sourceParser(browser: string) {
  const source = fs.readFileSync(new URL(`../../docs/source/platform/${browser}/content.mjs`, import.meta.url), "utf8");
  const names = new Set(["isPngFile", "decodeAruPayloadFromItxtText", "parseAruArchivePngItxt", "extractSourceFromAruArchivePayload", "parseSourceFromFile", "isPixivUserUrl", "extractSourceUrl", "collectFromPossibleAruJson", "collectUrlCandidates", "walkStringFields", "safeJsonParse", "uniqueOrdered"]);
  const constants = new Set(["ARU_ITXT_KEYWORD", "ARU_PAYLOAD_URL_KEYS", "TEXT_FIELDS_FOR_JSON", "WALK_MAX_DEPTH", "URL_PATTERN"]);
  const declarations: string[] = [];
  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as {type?: string; id?: {name?: string}; start?: number; end?: number};
    if (n.type === "FunctionDeclaration" && names.has(n.id?.name || "")) declarations.push(source.slice(n.start, n.end));
    if (n.type === "VariableDeclarator" && constants.has(n.id?.name || "")) declarations.push("const " + source.slice(n.start, n.end) + ";");
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(parse(source, { ecmaVersion: "latest", sourceType: "module" }));
  const calls: {file: File; options: object}[] = [];
  const api = vm.runInNewContext(declarations.join("\n") + ";({parseSourceFromFile})", {
    ...png, parsePixivFilenameUrl, TextDecoder, TextEncoder, URL, Uint8Array, DataView,
    console: {info(){},warn(){},debug(){}},
    exifr: {parse: async (file: File, options: object) => {
      calls.push({file, options});
      return exifr.parse(Buffer.from(await file.arrayBuffer()), options);
    }},
  }) as {parseSourceFromFile(file: File): Promise<{status: string; url: string | null; reason: string}>};
  return { ...api, calls };
}

for (const browser of ["firefox", "whale"]) {
  test(browser + " 실제 파서가 괄호 파일명과 숫자 전용 거부 정책을 사용한다", async () => {
    const parser = sourceParser(browser);
    const jpeg = fs.readFileSync(new URL("fixtures/source-exif.jpg", import.meta.url));
    for (const name of ["143805797_p0_master1200 (1).jpg", "143805797_p0.jpg"]) {
      const file = new File([jpeg], name, {type: "image/jpeg"});
      const result = await parser.parseSourceFromFile(file);
      if (browser === "firefox") assert.equal(result.url, url);
      else assert.equal(result.url, "https://www.pixiv.net/artworks/55667788", "Whale의 메타데이터 우선 정책을 보존한다");
      assert.equal(file.name, name);
    }
    // 표식 없는 이름은 파일명 추정 대신 실제 메타데이터 결과에만 의존한다.
    const plainJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const result = await parser.parseSourceFromFile(new File([plainJpeg], "143805797.jpg", {type: "image/jpeg"}));
    assert.equal(result.url, null);
  });
  for (const [filename, id] of [["source-exif.jpg", "55667788"], ["source-xmp.jpg", "66778899"], ["source-iptc.jpg", "77889900"]]) {
    test(browser + " 파일명 fallback 없이 " + filename + "의 메타데이터를 판독한다", async () => {
      const parser = sourceParser(browser);
      const file = new File([fs.readFileSync(new URL("fixtures/" + filename, import.meta.url))], filename, {type: "image/jpeg"});
      const result = await parser.parseSourceFromFile(file);
      assert.equal(result.status, "ok");
      assert.equal(result.url, "https://www.pixiv.net/artworks/" + id);
      assert.equal(parser.calls.length, 1);
      assert.equal(parser.calls[0].file, file, "원본 File과 이름을 유지한다");
      assert.equal((parser.calls[0].options as {chunked?: boolean}).chunked, browser === "firefox" ? false : undefined);
    });
  }
}

const moduleCode = buildSync({stdin:{contents:"export {parse} from 'exifr';",resolveDir:process.cwd()},bundle:true,platform:"browser",format:"iife",globalName:"moduleParser",write:false}).outputFiles[0].text;
const classicCode = fs.readFileSync(new URL("../../firefox/lib/exifr.full.umd.js", import.meta.url), "utf8");
for (const [mode, code, property] of [["classic", classicCode, "exifr"], ["WXT ESM", moduleCode, "moduleParser"]]) {
  for (const [name, id] of [["source-exif.jpg", "55667788"], ["source-xmp.jpg", "66778899"], ["source-iptc.jpg", "77889900"]]) {
    test(mode + "는 다른 realm의 FileReader 버퍼를 전체 읽기로 안전하게 처리한다: " + name, async () => {
      // FileReader 브리지가 다른 realm의 ArrayBuffer를 돌려주는 Firefox 조건을 재현한다.
      class Reader {
        result: ArrayBuffer | null = null;
        onloadend?: () => void;
        onerror?: (error: unknown) => void;
        readAsArrayBuffer(blob: Blob) {blob.arrayBuffer().then(value => {this.result=value;this.onloadend?.();}, error => this.onerror?.(error));}
      }
      const context = vm.createContext({navigator:{userAgent:"Firefox regression test"},Blob,FileReader:Reader,HTMLImageElement:class {},console});
      context.self = context;
      vm.runInContext(code, context);
      const parser = context[property] as {parse(input: Blob, options: object): Promise<{Source?: string; source?: string; ImageDescription?: string}>};
      const file = new Blob([fs.readFileSync(new URL("fixtures/" + name, import.meta.url))]);
      const options = {xmp:true,exif:true,iptc:true,userComment:true};
      await assert.rejects(parser.parse(file, options), /BufferView\.set\(\): Invalid data argument/);
      const value = await parser.parse(file, {...options,chunked:false});
      assert.equal(value.Source || value.source || value.ImageDescription, "https://www.pixiv.net/artworks/" + id);
    });
  }
}
