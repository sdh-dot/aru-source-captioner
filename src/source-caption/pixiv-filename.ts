// 파일명에서 출처를 판독할 뿐 원본 이름이나 업로드 대응 키는 정규화하지 않는다.
// 숫자 전용 임시 파일명을 작품 ID로 오인하지 않도록 명시적인 Pixiv 표식을 요구한다.
export function parsePixivFilenameUrl(filename: unknown): string | null {
  if (typeof filename !== "string") {
    return null;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    decoded = filename;
  }
  const basename = decoded.split(/[\\/]/).pop() || "";
  const match = basename.match(
    /^(pixiv[_\- ]?|illust[_\- ]?)?(\d{6,12})(_p\d+)?(?:_[a-z0-9]+)*(?: ?\([1-9]\d*\))?\.(?:jpg|jpeg|png|webp|gif)$/i,
  );
  if (!match || (!match[1] && !match[3])) {
    return null;
  }
  return `https://www.pixiv.net/artworks/${match[2]}`;
}
