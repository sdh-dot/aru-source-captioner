// Unit test for parsePixivFilenameUrl — run with: node test_parse_filename.js

function parsePixivFilenameUrl(filename) {
  if (typeof filename !== "string") return null;
  let clean;
  try { clean = decodeURIComponent(filename); } catch { clean = filename; }
  const base = clean.split(/[\\/]/).pop() || "";
  const m = base.match(
    /^(?:pixiv[_\-\s]?|illust[_\-\s]?)?(\d{6,12})(?:_p\d+)?(?:_[a-z0-9]+)*\.(?:jpg|jpeg|png|webp|gif)$/i
  );
  if (m) return `https://www.pixiv.net/artworks/${m[1]}`;
  return null;
}

const CASES = [
  // Pixiv _master1200 / _square1200 / _custom1200 suffix (실기기 확인 케이스)
  ["112278708_p0_master1200.jpg",          "https://www.pixiv.net/artworks/112278708"],
  ["112278708_p1_master1200.jpg",          "https://www.pixiv.net/artworks/112278708"],
  ["112278708_p0_square1200.jpg",          "https://www.pixiv.net/artworks/112278708"],
  ["112278708_p0_custom1200.jpg",          "https://www.pixiv.net/artworks/112278708"],
  // Standard Pixiv (suffix 없음)
  ["112278708_p0.jpg",                     "https://www.pixiv.net/artworks/112278708"],
  ["112278708.jpg",                        "https://www.pixiv.net/artworks/112278708"],
  ["123456789_p0.jpg",                     "https://www.pixiv.net/artworks/123456789"],
  ["123456789_p0_master1200.jpg",          "https://www.pixiv.net/artworks/123456789"],
  ["88908024_p0_master1200.jpg",           "https://www.pixiv.net/artworks/88908024"],
  // pixiv_ prefix
  ["pixiv_112278708_p0_master1200.jpg",    "https://www.pixiv.net/artworks/112278708"],
  ["pixiv_123456789_p0.jpg",              "https://www.pixiv.net/artworks/123456789"],
  ["pixiv123456789_p0.jpg",               "https://www.pixiv.net/artworks/123456789"],
  ["pixiv-123456789_p0.jpg",              "https://www.pixiv.net/artworks/123456789"],
  // illust_ prefix
  ["illust_112278708_p0_master1200.png",   "https://www.pixiv.net/artworks/112278708"],
  ["illust-123456789_p0.jpg",             "https://www.pixiv.net/artworks/123456789"],
  // Windows 경로 포함
  ["C:\\Downloads\\112278708_p0_master1200.jpg", "https://www.pixiv.net/artworks/112278708"],
  ["C:\\Users\\user\\Downloads\\123456789_p0.jpg", "https://www.pixiv.net/artworks/123456789"],
  // URL 인코딩
  ["123456789%5Fp0.jpg",                  "https://www.pixiv.net/artworks/123456789"],
  // 확장자 다양성
  ["123456789_p0.png",                    "https://www.pixiv.net/artworks/123456789"],
  ["123456789_p0.webp",                   "https://www.pixiv.net/artworks/123456789"],
  ["123456789_p0.gif",                    "https://www.pixiv.net/artworks/123456789"],
  // Non-Pixiv — must return null
  ["normal_file.jpg",                     null],
  ["screenshot_20240101.png",             null],
  ["abc.jpg",                             null],
  ["12345.jpg",                           null],  // too short (< 6 digits)
  [null,                                  null],
  [undefined,                             null],
];

let pass = 0;
let fail = 0;
for (const [input, expected] of CASES) {
  const result = parsePixivFilenameUrl(input);
  if (result === expected) {
    console.log(`  PASS: ${String(input).padEnd(50)} → ${result}`);
    pass++;
  } else {
    console.error(`  FAIL: ${String(input).padEnd(50)} expected=${expected}, got=${result}`);
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
