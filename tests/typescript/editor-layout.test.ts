import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createAttributionUi } from "../../src/upload-attribution/ui.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

function setup() {
  const dom = new JSDOM(`<!doctype html>
    <div id="editor_v2"><div id="editor_tab_bar" style="height:27px;display:inline-block">
      <label for="imageUploadfromFile"><div id="imageEditor" style="float:left">이미지편집</div></label>
    </div><input id="imageUploadfromFile" type="file" accept=".jpg,.png,.webp,.jpeg">
    <div class="note-toolbar"><button type="button" aria-label="사진"><i class="icon-camera"></i></button></div></div>
    <label id="standalone" for="photo">사진 선택</label><input id="photo" type="file" accept="image/*">
    <div class="common_write_wrapper"><textarea class="comment_input"></textarea><label for="comment-photo">댓글 사진</label><input id="comment-photo" type="file" accept="image/*"></div>
    <div class="common_write_wrapper"><textarea class="reply_input"></textarea><label for="reply-photo">답글 사진</label><input id="reply-photo" type="file" accept="image/*"></div>`, {
    url: "https://bbs.ruliweb.com/community/board/300143/write",
  });
  const w = dom.window;
  Object.assign(w, { __aruUploadNoAutoStart: true });
  const D = { attach: () => () => {}, assetImage: () => null };
  const { uploadUI: UploadUI } = createAttributionUi({
    environment: w as unknown as RuntimeEnvironment,
    dependencies: { icons: { DesignSystem: () => D } },
  });
  const original = w.document.querySelector("#editor_tab_bar")!.outerHTML;
  const ui = new UploadUI(w.document);
  return { doc: w.document, ui, original, close() { ui.destroy(); w.close(); } };
}

test("float 자식이 있는 이미지편집 탭의 DOM·이름·스타일을 보존한다", () => {
  const f = setup();
  try {
    assert.equal(f.doc.querySelector("#editor_tab_bar")!.outerHTML, f.original);
    assert.equal(f.doc.querySelector("#editor_tab_bar [data-aru-native-upload]"), null);
    assert.equal(f.doc.querySelector("#imageUploadfromFile")!.getAttribute("data-aru-native-file"), null);
  } finally { f.close(); }
});

test("실제 Summernote 첨부 버튼의 장식과 기존 클릭 리스너는 유지한다", () => {
  const f = setup();
  try {
    const button = f.doc.querySelector<HTMLButtonElement>(".note-toolbar button")!;
    let clicks = 0;
    button.addEventListener("click", () => clicks++);
    assert.equal(button.getAttribute("aria-label"), "이미지 첨부");
    assert.equal(button.querySelectorAll("[data-aru-native-label]").length, 1);
    button.click();
    assert.equal(clicks, 1);
  } finally { f.close(); }
});

test("탭 외부의 일반 이미지 첨부 label은 계속 장식한다", () => {
  const f = setup();
  try {
    const label = f.doc.querySelector("#standalone")!;
    assert.ok(label.hasAttribute("data-aru-native-upload"));
    assert.equal(label.querySelector("[data-aru-native-label]")!.shadowRoot!.querySelector(".label")!.textContent, "이미지 첨부");
  } finally { f.close(); }
});

test("재탐색과 DOM 재진입에도 탭은 보존하고 장식을 중복 생성하지 않는다", () => {
  const f = setup();
  try {
    f.ui.discover(); f.ui.discover();
    assert.equal(f.doc.querySelectorAll(".note-toolbar [data-aru-native-label]").length, 1);
    const tab = f.doc.querySelector("#editor_tab_bar")!;
    const replacement = tab.cloneNode(true);
    tab.replaceWith(replacement);
    f.ui.discover();
    assert.equal((replacement as Element).outerHTML, f.original);
  } finally { f.close(); }
});

test("종료 시 기존 aria-label과 원본 자식을 복원한다", () => {
  const f = setup();
  try {
    const button = f.doc.querySelector(".note-toolbar button")!;
    f.ui.destroy();
    assert.equal(button.getAttribute("aria-label"), "사진");
    assert.equal(button.children.length, 1);
    assert.equal(f.doc.querySelector("#editor_tab_bar")!.outerHTML, f.original);
    assert.equal(f.doc.querySelectorAll("[data-aru-native-label]").length, 0);
  } finally { f.close(); }
});

test("댓글·답글용 common_write_wrapper의 첨부 label은 변경하지 않는다", () => {
  const f = setup();
  try {
    const labels = [...f.doc.querySelectorAll(".common_write_wrapper label")];
    assert.deepEqual(labels.map(label => label.textContent), ["댓글 사진", "답글 사진"]);
    for (const label of labels) {
      assert.equal(label.children.length, 0);
      assert.equal(label.hasAttribute("data-aru-native-upload"), false);
    }
  } finally { f.close(); }
});
