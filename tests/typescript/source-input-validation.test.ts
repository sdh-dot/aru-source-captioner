import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { sourceInputParser } from "../helpers/source-input-parser.ts";
import { createAttributionCore } from "../../src/upload-attribution/core.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

const cases = JSON.parse(fs.readFileSync(new URL("fixtures/source-input-cases.json", import.meta.url), "utf8")) as {name: string; payload: object; urls: string[]; pngUrls?: string[]}[];
const fixture = (name: string) => fs.readFileSync(new URL("fixtures/" + name, import.meta.url));
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
for (const browser of ["firefox", "whale"]) {
  const parser = sourceInputParser(browser);
  for (const item of cases) {
    test(browser + " 외부 JSON 필드 검증·후속 후보 보존: " + item.name, () => {
      const raw = JSON.stringify(item.payload);
      const metadata = {UserComment: raw};
      const candidates: string[] = [];
      parser.collectFromPossibleAruJson(metadata, candidates);
      assert.deepEqual(candidates, item.urls);
      assert.equal(metadata.UserComment, raw, "외부 메타데이터를 직접 고치지 않는다");
      const png = parser.extractSourceFromAruArchivePayload(item.payload);
      assert.equal(png.url, (item.pngUrls ?? item.urls)[0] ?? null);
      const result = plain(parser.extractSourceUrl(metadata)) as string[];
      assert.equal(result[0] ?? null, item.urls[0] ?? null);
      assert.equal(result.some(url => url.includes("99999999") || url.includes("88888888")), false, "거절한 비문자열 필드가 텍스트 fallback으로 되살아나지 않는다");
    });
  }
  test(browser + " JSON 필드가 잘못되어도 독립 XMP·일반 텍스트 후보를 계속 읽는다", () => {
    assert.equal(parser.extractSourceUrl({UserComment: JSON.stringify({artwork_id: 143805797}), Source: "https://www.pixiv.net/artworks/66778899"})[0], "https://www.pixiv.net/artworks/66778899");
    assert.equal(parser.extractSourceUrl({UserComment: JSON.stringify({artwork_id: [], note: "출처 https://www.pixiv.net/artworks/77889900"})})[0], "https://www.pixiv.net/artworks/77889900");
    const ordered = parser.extractSourceUrl({UserComment: JSON.stringify({artwork_id: null}), ImageDescription: JSON.stringify({artwork_url: "https://www.pixiv.net/artworks/55667788"}), Source: "https://www.pixiv.net/artworks/66778899"});
    assert.deepEqual(plain(ordered).slice(0, 2), ["https://www.pixiv.net/artworks/55667788", "https://www.pixiv.net/artworks/66778899"]);
  });
  for (const [name, expected] of [
    ["input-string-id.png", "https://www.pixiv.net/artworks/143805797"],
    ["input-bad-url-valid-source.png", "https://www.pixiv.net/artworks/66778899"],
    ["input-all-invalid.png", null],
    ["input-valid-url-bad-id.jpg", "https://www.pixiv.net/artworks/55667788"],
    ["input-bad-url-valid-source.jpg", "https://www.pixiv.net/artworks/66778899"],
    ["input-all-invalid.jpg", null],
  ] as const) {
    test(browser + " 실제 파일 바이트·exifr 경로: " + name, async () => {
      const input = new File([fixture(name)], name, {type: name.endsWith(".png") ? "image/png" : "image/jpeg"});
      const result = await parser.parseSourceFromFile(input);
      assert.equal(result.url, expected);
      assert.equal(result.status, expected ? "ok" : "missing");
      assert.equal(input.name, name);
    });
  }
  test(browser + " 파일명/메타데이터 우선순위·Firefox 전체 읽기를 유지한다", async () => {
    const name = "143805797_p0_master1200 (1).jpg";
    const input = new File([fixture("input-valid-url-bad-id.jpg")], name, {type:"image/jpeg"});
    const local = sourceInputParser(browser);
    assert.equal((await local.parseSourceFromFile(input)).url, browser === "firefox" ? "https://www.pixiv.net/artworks/143805797" : "https://www.pixiv.net/artworks/55667788");
    if (browser === "whale") assert.equal(local.calls.length, 1);
    else assert.equal(local.calls.length, 0, "Firefox는 명시적인 파일명 출처를 먼저 반환한다");
    await local.parseSourceFromFile(new File([fixture("input-valid-url-bad-id.jpg")], "plain.jpg", {type:"image/jpeg"}));
    assert.equal((local.calls.at(-1)!.options as {chunked?: boolean}).chunked, browser === "firefox" ? false : undefined);
  });
  test(browser + " 잘못된 파일 이후 큐의 정상 파일은 올바른 이미지에만 기입된다", async () => {
    const dom = new JSDOM('<div class="seditor"><input type="file"><div class="note-editable" contenteditable="true"><p id="kept">기존 본문</p></div></div>', {url:"https://bbs.ruliweb.com/community/board/98/write",pretendToBeVisual:true});
    const w = dom.window;
    const {attribution} = createAttributionCore({environment:w as unknown as RuntimeEnvironment});
    const controller = new attribution.Controller({document:w.document,parse:(file:File)=>parser.parseSourceFromFile(file),sanitize:(url:string)=>url.startsWith("https://www.pixiv.net/artworks/")?url:null,caption:(url:string)=>{const p=w.document.createElement("p");p.dataset.caption=url;return p;},anchor:(image:HTMLImageElement)=>image.closest("p"),existing:(image:HTMLImageElement)=>image.closest("p")?.nextElementSibling?.hasAttribute("data-caption")});
    try {
      const files = ["input-all-invalid.jpg", "input-valid-url-bad-id.jpg"].map(name=>new File([fixture(name)],name,{type:"image/jpeg"}));
      await controller.select(files, w.document.querySelector("input"));
      const editor = w.document.querySelector(".note-editable")!;
      for (const file of files.slice().reverse()) {
        const p=w.document.createElement("p"),image=w.document.createElement("img");image.alt=file.name;image.src="https://i1.ruliweb.com/test.png";
        Object.defineProperty(image,"complete",{value:true});Object.defineProperty(image,"naturalWidth",{value:64});p.append(image);editor.append(p);
      }
      await new Promise(resolve=>setImmediate(resolve));
      assert.equal(editor.querySelectorAll("[data-caption]").length,1);
      const caption=editor.querySelector<HTMLElement>("[data-caption]")!;
      assert.equal(caption.dataset.caption,"https://www.pixiv.net/artworks/55667788");
      assert.equal(caption.previousElementSibling?.querySelector("img")?.alt,"input-valid-url-bad-id.jpg");
      assert.equal(w.document.querySelector("#kept")!.textContent,"기존 본문");
      assert.equal(controller.registry.records.find((row:{name:string})=>row.name==="input-all-invalid.jpg").consumed,false);
    } finally {controller.destroy();w.close();}
  });
}
