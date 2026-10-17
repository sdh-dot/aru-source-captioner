// 자동 생성: src/icon-metadata/tag-codec.ts. tools/compile-typescript.mjs로 갱신한다.
// 기존 게시글의 쉼표 태그와 aru-tags:v1 속성을 같은 규칙으로 읽고 쓴다.
// 검색용 NFKC·소문자 변환은 저장 태그에 적용하지 않는다.
export const PREFIX = "aru-tags:v1:";
export const FIXED = Object.freeze([
    "인사",
    "사과",
    "축하",
    "응원",
    "감사",
    "미소",
    "도발",
    "조토피아",
    "매도",
    "분노",
    "슬픔",
    "당황",
    "놀람",
]);
export function fail(code, message) {
    throw Object.assign(new Error(message), { code });
}
// 첫 등장 순서와 대소문자를 보존해 일괄 편집의 원문 비교 기준을 유지한다.
export function normalize(values) {
    if (!Array.isArray(values) || values.length > 1000) {
        fail("TAGS_INVALID", "태그 목록이 올바르지 않거나 1,000개를 넘었습니다.");
    }
    const result = [];
    const seen = new Set();
    for (const value of values) {
        if (typeof value !== "string") {
            fail("TAGS_INVALID", "태그는 문자열이어야 합니다.");
        }
        const tag = value.replace(/\s+/gu, " ").trim();
        if (tag.length > 512 ||
            /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(tag)) {
            fail("TAGS_INVALID", "태그 길이 또는 제어 문자를 확인해 주세요.");
        }
        if (tag && !seen.has(tag)) {
            seen.add(tag);
            result.push(tag);
        }
    }
    return result;
}
// 알 수 없는 버전을 쉼표 목록으로 오인하면 기존 속성을 손상시킬 수 있다.
export function decode(raw) {
    if (raw == null || raw === "") {
        return [];
    }
    if (raw.length > 65536) {
        fail("TAGS_INVALID", "기존 태그 속성이 너무 큽니다. 원본은 변경하지 않았습니다.");
    }
    if (raw.startsWith(PREFIX)) {
        try {
            return normalize(JSON.parse(decodeURIComponent(raw.slice(PREFIX.length))));
        }
        catch (_) {
            fail("TAGS_INVALID", "인코딩된 기존 태그를 읽을 수 없습니다. 원본을 확인해 주세요.");
        }
    }
    if (raw.startsWith("aru-tags:")) {
        fail("TAGS_VERSION", "지원하지 않는 태그 규격입니다. 기존 속성은 보존합니다.");
    }
    return normalize(raw.split(","));
}
// JSON·URI 인코딩과 길이 제한은 기존 속성의 바이트 표현 및 오류 계약을 따른다.
export function encode(values) {
    let raw;
    try {
        raw = PREFIX + encodeURIComponent(JSON.stringify(normalize(values)));
    }
    catch (error) {
        if (error.code) {
            throw error;
        }
        fail("TAGS_INVALID", "태그에 올바르지 않은 유니코드 문자가 있습니다.");
    }
    if (raw.length > 65536) {
        fail("TAGS_INVALID", "인코딩된 태그가 64KB를 넘었습니다. 태그를 줄여 주세요.");
    }
    return raw;
}
