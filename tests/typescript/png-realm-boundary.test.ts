import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { crc32 } from "node:zlib";
import {
  hasPngSignature,
  parsePngItxtChunks,
  parseItxtChunk,
} from "../../src/source-caption/png-chunks.ts";
import { sourceInputParser } from "../helpers/source-input-parser.ts";

const fixture = (name: string) =>
  fs.readFileSync(new URL("fixtures/" + name, import.meta.url));
const base = fixture("input-string-id.png");
const ownBuffer = (bytes: Uint8Array) => Uint8Array.from(bytes).buffer;
const firstChunk = (bytes = base) => {
  const chunk = [...parsePngItxtChunks(ownBuffer(bytes))][0];
  assert.ok(chunk, "양성 대조 PNG에는 AruArchive iTXt가 있어야 한다");
  return chunk;
};
const json = (view: Uint8Array) => JSON.parse(new TextDecoder().decode(view));

// 파일 검증에는 기존 1×1 PNG의 이미지 청크를 재사용하고 iTXt와 CRC만 메모리에서 바꾼다.
// 고정 Fixture를 덮어쓰지 않으며 PNG 이미지/청크 파서를 테스트 안에 다시 구현하지 않는다.
function replaceItxt(data?: Uint8Array) {
  const chunk = firstChunk();
  const start = chunk.byteOffset - 8;
  const end = chunk.byteOffset + chunk.length + 4;
  if (!data) return Buffer.concat([base.subarray(0, start), base.subarray(end)]);
  const type = Buffer.from("iTXt"), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([base.subarray(0, start), length, type, data, crc, base.subarray(end)]);
}

test("PNG constructor 접근이 거절돼 subarray가 실패해도 실제 iTXt 파서는 생성자를 읽지 않는다", () => {
  const data = firstChunk();
  const before = Array.from(data);
  let reads = 0;
  Object.defineProperty(data, "constructor", {
    get() { reads++; throw Error("SYNTHETIC_PNG_CONSTRUCTOR_DENIED"); },
  });
  assert.throws(() => data.subarray(0, 10), /SYNTHETIC_PNG_CONSTRUCTOR_DENIED/);
  assert.equal(reads, 1, "실패 모델에서 native subarray가 constructor를 실제로 읽는다");
  const parsed = parseItxtChunk(data)!;
  assert.ok(parsed);
  assert.equal(parsed.keyword, "AruArchive");
  assert.equal(parsed.compressionFlag, 0);
  assert.equal(parsed.compressionMethod, 0);
  assert.deepEqual(json(parsed.textBytes), { artwork_id: " 143805797 " });
  assert.equal(reads, 1, "제품 파서는 입력 view의 constructor 접근을 추가하지 않는다");
  assert.deepEqual(Array.from(data), before);
});

test("PNG Species 생성이 거절돼 subarray가 실패해도 실제 iTXt 파서는 바이트를 보존한다", () => {
  let reads = 0;
  class SpeciesDenied extends Uint8Array {
    static get [Symbol.species]() {
      reads++;
      throw Error("SYNTHETIC_PNG_SPECIES_DENIED");
    }
  }
  const data = new SpeciesDenied(firstChunk());
  assert.throws(() => data.subarray(0), /SYNTHETIC_PNG_SPECIES_DENIED/);
  const parsed = parseItxtChunk(data)!;
  assert.ok(parsed);
  assert.equal(parsed.keyword, "AruArchive");
  assert.equal(parsed.compressionFlag, 0);
  assert.equal(parsed.compressionMethod, 0);
  assert.deepEqual(json(parsed.textBytes), { artwork_id: " 143805797 " });
  assert.equal(reads, 1);
});

test("PNG iTXt의 nonzero byteOffset과 언어·번역 키워드는 JSON 범위에 섞이지 않는다", () => {
  const bytes = new TextEncoder().encode('AruArchive\0\0\0ko\0번역 키워드\0{"artwork_id":"149381974"}');
  const backing = new Uint8Array(bytes.length + 31).fill(0x7f);
  backing.set(bytes, 13);
  const data = new Uint8Array(backing.buffer, 13, bytes.length);
  const parsed = parseItxtChunk(data)!;
  assert.ok(parsed);
  assert.equal(parsed.keyword, "AruArchive");
  assert.equal(parsed.compressionFlag, 0);
  assert.equal(parsed.compressionMethod, 0);
  assert.equal(parsed.textBytes.buffer, backing.buffer);
  assert.equal(parsed.textBytes.byteOffset, data.byteOffset + bytes.indexOf(0x7b));
  assert.deepEqual(json(parsed.textBytes), { artwork_id: "149381974" });
  assert.equal(parsed.textBytes.at(-1), 0x7d, "뒤쪽 padding을 JSON에 포함하지 않는다");
});

test("PNG signature의 불일치는 청크 판독 전 거절한다", () => {
  assert.equal(hasPngSignature(ownBuffer(base)), true);
  assert.equal(hasPngSignature(null), false);
  assert.equal(hasPngSignature(new ArrayBuffer(7)), false);
  const damaged = Uint8Array.from(base);
  damaged[0] = 0;
  assert.equal(hasPngSignature(damaged.buffer), false);
});

for (const damage of ["truncated-data", "truncated-crc", "oversized-length"] as const) {
  test("PNG 손상 청크는 범위 밖 판독과 가짜 iTXt를 만들지 않는다: " + damage, () => {
    const chunk = firstChunk();
    let bytes = Uint8Array.from(base);
    if (damage === "truncated-data") bytes = bytes.slice(0, chunk.byteOffset + chunk.length - 1);
    if (damage === "truncated-crc") bytes = bytes.slice(0, chunk.byteOffset + chunk.length + 3);
    if (damage === "oversized-length") new DataView(bytes.buffer).setUint32(chunk.byteOffset - 8, 0x80000000, false);
    assert.doesNotThrow(() => [...parsePngItxtChunks(bytes.buffer)]);
    assert.deepEqual([...parsePngItxtChunks(bytes.buffer)], []);
  });
}

test("PNG iTXt 구분자가 없는 입력은 기존 null 정책을 유지한다", () => {
  for (const value of [null, undefined, new Uint8Array(), new TextEncoder().encode("AruArchive"), new TextEncoder().encode("AruArchive\0\0\0ko"), new TextEncoder().encode("AruArchive\0\0\0ko\0translation")]) {
    assert.equal(parseItxtChunk(value), null);
  }
});

const secondString = replaceItxt(new TextEncoder().encode('AruArchive\0\0\0\0\0{"artwork_id":"149381974"}'));
const compressedData = Uint8Array.from(firstChunk());
compressedData["AruArchive".length + 1] = 1;
const damaged = Buffer.from(base);
damaged.writeUInt32BE(0x80000000, firstChunk().byteOffset - 8);

// 아래 파일 정책 시험은 기존 Node/VM helper다. 위 실제 공통 파서의 Species 경계와 별개이며,
// Firefox ISOLATED File/realm 검증을 대신하지 않는다. native WXT 재현은 별도 증적으로 남긴다.
for (const browser of ["firefox", "whale"]) {
  const parser = sourceInputParser(browser);
  for (const [name, bytes, expected] of [
    ["정상 문자열 ID 143805797", base, "https://www.pixiv.net/artworks/143805797"],
    ["정상 문자열 ID 149381974", secondString, "https://www.pixiv.net/artworks/149381974"],
    ["잘못된 URL 뒤 정상 source URL", fixture("input-bad-url-valid-source.png"), "https://www.pixiv.net/artworks/66778899"],
    ["모든 후보가 잘못된 PNG", fixture("input-all-invalid.png"), null],
    ["출처 iTXt가 없는 PNG", replaceItxt(), null],
    ["손상된 iTXt 길이", damaged, null],
    ["지원하지 않는 압축 iTXt", replaceItxt(compressedData), null],
  ] as const) {
    test(browser + " PNG 파일 입력 정책 유지: " + name, async () => {
      const input = new File([bytes], "plain.png", { type: "image/png" });
      const result = await parser.parseSourceFromFile(input);
      assert.equal(result.url, expected);
      assert.equal(result.status, expected ? "ok" : "missing");
      assert.equal(input.name, "plain.png", "파일명 fallback을 위한 이름을 변경하지 않는다");
    });
  }
}
