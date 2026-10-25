import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { formatSourceLinkText } from "../../src/source-caption/link-display.ts";

for (const url of [
  "https://www.pixiv.net/artworks/149381974",
  "https://pixiv.net/artworks/149381974",
  "https://www.pixiv.net/artworks/149381974/?utm_source=test#fragment",
  "http://www.pixiv.net/artworks/149381974",
]) {
  test("Pixiv 링크의 작가명 없는 표기: " + url, () => {
    assert.equal(formatSourceLinkText(url), "Pixiv - /artworks/149381974");
  });
}
for (const url of [
  "https://example.com/artworks/149381974",
  "https://www.pixiv.net.evil.example/artworks/149381974",
  "https://evil.example/?url=https://www.pixiv.net/artworks/149381974",
  "https://www.pixiv.net/users/149381974",
  "https://www.pixiv.net/artworks/not-an-id",
  "https://www.pixiv.net/artworks/12345",
  "https://www.pixiv.net/artworks/1234567890123",
  "https://www.pixiv.net/artworks/149381974/extra",
  "https://user:password@www.pixiv.net/artworks/149381974",
  "https://www.pixiv.net:444/artworks/149381974",
  "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "", "bad url",
]) {
  test("작품으로 확인할 수 없는 URL은 표시를 축약하지 않는다: " + url, () => {
    assert.equal(formatSourceLinkText(url), url);
  });
}

const source = (path: string) => fs.readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 10));
const pixiv = (id: number) => "https://www.pixiv.net/artworks/" + id;

async function fixture(browser: string, options: {read?: boolean; config?: object; metadata?: (file: File) => unknown} = {}) {
  const html = options.read
    ? '<form class="border_box after_clear"><textarea class="comment_input">기존 댓글</textarea><button type="button" class="common_img_button">첨부</button><input type="file" class="common_img_input"></form><form class="border_box after_clear"><textarea class="reply_input">기존 답글</textarea><button type="button" class="common_img_button">첨부</button><input type="file" class="common_img_input"></form>'
    : '<div id="editor_v2"><div class="seditor"><input id="files" type="file" accept="image/*" multiple><div class="note-editable" contenteditable="true"><p id="draft">보존할 본문</p></div></div></div>';
  const dom = new JSDOM(html, { url: "https://bbs.ruliweb.com/community/board/300143/" + (options.read ? "read/6000" : "write"), runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  const warnings: string[] = [];
  w.console = {log(){}, info(){}, debug(){}, warn(...args: unknown[]){warnings.push(args.map(String).join(" "));}, error(){}} as Console;
  w.chrome = {runtime: {id: "source-display-test-extension"}, storage: {sync: {get(_keys: unknown, callback: (items: object) => void){callback({enabled: true, ...options.config});}}}};
  w.TextDecoder = TextDecoder;
  w.TextEncoder = TextEncoder;
  w.exifr = {parse: async (file: File) => options.metadata?.(file) ?? {}};
  w.eval(source("docs/source/upload-attribution/core.js"));
  w.eval(source(browser + "/content.js"));
  await tick();
  assert.equal(warnings.some(text => text.includes("init failed")), false, warnings.join("\n"));
  const editor = w.document.querySelector<HTMLElement>(".note-editable");
  function select(files: object[], input = w.document.querySelector<HTMLInputElement>("#files")!) {
    Object.defineProperty(input, "files", {configurable: true, value: files});
    input.dispatchEvent(new w.Event("change", {bubbles: true}));
  }
  function image(name: string) {
    const p = w.document.createElement("p"), img = w.document.createElement("img");
    img.alt = name;
    img.src = "https://i1.ruliweb.com/mock-upload.jpg";
    Object.defineProperties(img, {complete: {value: true}, naturalWidth: {value: 64}});
    p.append(img); editor!.append(p);
    return img;
  }
  function file(name: string) {return new w.File([new Uint8Array([255, 216, 255, 217])], name, {type: "image/jpeg"});}
  return {dom, w, editor, warnings, select, image, file, close(){w.dispatchEvent(new w.Event("pagehide")); w.close();}};
}

for (const browser of ["firefox", "whale"]) {
  test(browser + " 실제 캡션 경로는 href·rel·기존 wrapper를 보존하고 표시만 바꾼다", async () => {
    const h = await fixture(browser);
    try {
      const name = "149381974_p0 (1).jpg";
      h.select([h.file(name)]);
      await tick();
      const image = h.image(name);
      let clicks = 0; image.addEventListener("click", () => clicks++);
      await tick();
      const caption = image.parentElement!.nextElementSibling!;
      const a = caption.querySelector("a")!;
      assert.equal(a.textContent, "Pixiv - /artworks/149381974");
      assert.equal(a.href, pixiv(149381974));
      assert.equal(a.target, "_blank"); assert.equal(a.rel, "noopener noreferrer");
      assert.equal(caption.textContent, "출처: Pixiv - /artworks/149381974");
      assert.equal(image.closest("a"), null); image.click(); assert.equal(clicks, 1);
      assert.equal(h.w.document.querySelector("#draft")!.textContent, "보존할 본문");
      image.setAttribute("title", name); await tick();
      assert.equal(h.editor!.querySelectorAll("[data-aru-source-caption]").length, 1);
      const saved = new h.w.DOMParser().parseFromString(h.editor!.innerHTML, "text/html");
      assert.equal(saved.querySelector("a")!.href, a.href, "MOCK HTML 직렬화 왕복이며 사이트 저장 검증은 아니다");
    } finally {h.close();}
  });

  test(browser + " 기존 표시·사용자 캡션은 변환하지 않고 새 캡션도 중복 생성하지 않는다", async () => {
    const h = await fixture(browser);
    try {
      const old = h.w.document.createElement("p");
      old.dataset.aruSourceCaption = "1";
      const link = h.w.document.createElement("a"); link.href = pixiv(1111111); link.textContent = pixiv(1111111);
      old.append("출처: ", link); h.editor!.append(old);
      const name = "149381974_p0.jpg";
      h.select([h.file(name)]); await tick();
      const img = h.image(name);
      const user = old.cloneNode(true) as HTMLElement;
      delete user.dataset.aruSourceCaption;
      user.append(" 사용자 설명"); img.parentElement!.after(user);
      await tick();
      assert.equal(old.querySelector("a")!.textContent, pixiv(1111111));
      assert.equal(img.parentElement!.nextElementSibling, user);
      assert.equal(h.editor!.querySelectorAll("p").length, 4);
      assert.equal(user.textContent, "출처: " + pixiv(1111111) + " 사용자 설명");
    } finally {h.close();}
  });

  test(browser + " 완료 순서 역전·재선택에도 파일별 URL과 캡션 하나를 유지한다", async () => {
    const resolve = new Map<string, (value: object) => void>();
    const h = await fixture(browser, {metadata: file => new Promise(done => resolve.set(file.name, done))});
    try {
      h.select([h.file("first.jpg"), h.file("second.jpg")]);
      const b = h.image("second.jpg"), a = h.image("first.jpg"); await tick();
      resolve.get("second.jpg")!({Source: pixiv(2222222)}); await tick();
      assert.equal(b.parentElement!.nextElementSibling!.querySelector("a")!.href, pixiv(2222222));
      assert.equal(a.parentElement!.nextElementSibling?.matches("[data-aru-source-caption]") ?? false, false);
      resolve.get("first.jpg")!({Source: pixiv(1111111)}); await tick();
      assert.equal(a.parentElement!.nextElementSibling!.querySelector("a")!.textContent, "Pixiv - /artworks/1111111");
      h.select([h.file("first.jpg")]); await tick();
      resolve.get("first.jpg")!({Source: pixiv(1111111)}); await tick();
      const again = h.image("first.jpg"); await tick();
      assert.equal(again.parentElement!.nextElementSibling!.querySelector("a")!.href, pixiv(1111111));
      assert.equal(h.editor!.querySelectorAll("[data-aru-source-caption]").length, 3);
    } finally {h.close();}
  });

  test(browser + " 작가 필드와 HTML 특수문자를 추측해 사용하지 않고 일반 URL은 보존한다", async () => {
    const generic = "https://example.com/source?x=%3Cscript%3E&name=artist";
    const h = await fixture(browser, {metadata: file => ({Source: file.name === "pixiv.jpg" ? pixiv(149381974) : generic, Artist: '<img src=x onerror="alert(1)">', creator: {name: "다른 작품의 작가"}})});
    try {
      h.select([h.file("pixiv.jpg"), h.file("generic.jpg")]); await tick();
      const p = h.image("pixiv.jpg"), g = h.image("generic.jpg"); await tick();
      assert.equal(p.parentElement!.nextElementSibling!.querySelector("a")!.textContent, "Pixiv - /artworks/149381974");
      const a = g.parentElement!.nextElementSibling!.querySelector("a")!;
      assert.equal(a.href, generic); assert.equal(a.textContent, generic);
      assert.equal(h.editor!.querySelectorAll("script,[onerror]").length, 0);
    } finally {h.close();}
  });

  test(browser + " 기존 sanitizer가 위험 URL과 비허용 HTTP를 캡션 전에 거부한다", async () => {
    for (const value of ["javascript:alert(1)", "data:text/html,<img src=x>", "http://www.pixiv.net/artworks/149381974"]) {
      const h = await fixture(browser, {metadata: () => ({Source: value})});
      try {h.select([h.file("plain.jpg")]); await tick(); h.image("plain.jpg"); await tick(); assert.equal(h.editor!.querySelectorAll("[data-aru-source-caption]").length, 0);}
      finally {h.close();}
    }
  });

  test(browser + " 댓글·답글 textarea의 URL·본문·중복 방지 계약을 보존한다", async () => {
    const h = await fixture(browser, {read: true});
    try {
      const inputs = h.w.document.querySelectorAll<HTMLInputElement>("input[type=file]");
      assert.equal(inputs.length, 2);
      for (const input of inputs) h.select([h.file("149381974_p0.jpg")], input);
      await tick();
      const text = [...h.w.document.querySelectorAll("textarea")].map(t => t.value);
      assert.ok(text.every(t => t.includes(pixiv(149381974)) && !t.includes("Pixiv -") && !t.includes("<a")));
      assert.ok(text[0].includes("기존 댓글")); assert.ok(text[1].includes("기존 답글"));
      for (const input of inputs) h.select([h.file("149381974_p0.jpg")], input);
      await tick();
      assert.deepEqual([...h.w.document.querySelectorAll("textarea")].map(t => t.value), text);
    } finally {h.close();}
  });
}
