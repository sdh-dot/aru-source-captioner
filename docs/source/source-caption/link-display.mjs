// 자동 생성: src/source-caption/link-display.ts. tools/compile-typescript.mjs로 갱신한다.
// 검증된 URL의 표시만 바꾸며 출처 선택이나 링크 목적지에는 관여하지 않는다.
export function formatSourceLinkText(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return url;
    }
    if (!["https:", "http:"].includes(parsed.protocol) ||
        !["www.pixiv.net", "pixiv.net"].includes(parsed.hostname) ||
        parsed.username ||
        parsed.password ||
        parsed.port) {
        return url;
    }
    const artwork = parsed.pathname.match(/^\/artworks\/(\d{6,12})\/?$/);
    // 현재 판독 결과에는 작품과 대응하는 작가명이 없으므로 이름을 추측하지 않는다.
    return artwork ? `Pixiv - /artworks/${artwork[1]}` : url;
}
