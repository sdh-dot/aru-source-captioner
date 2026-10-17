# 출처 메타데이터 회귀 Fixture

이 폴더의 JPG 3개는 테스트용으로 생성한 96×64 단색 이미지다. 실제 업로드용 사용자 이미지나 외부 작품을 포함하지 않는다. 파일명에 Pixiv 표식이 없으므로 메타데이터 판독 실패를 파일명 fallback이 가릴 수 없다.

| 파일 | 메타데이터 필드 | 기대값 |
| --- | --- | --- |
| `source-exif.jpg` | EXIF `ImageDescription` | `https://www.pixiv.net/artworks/55667788` |
| `source-xmp.jpg` | XMP `dc:source` | `https://www.pixiv.net/artworks/66778899` |
| `source-iptc.jpg` | IPTC `Source` | `https://www.pixiv.net/artworks/77889900` |

URL은 파서의 정확한 출력 비교를 위한 문자열이다. 테스트는 작품 페이지에 접근하거나 해당 작품의 이미지를 사용하지 않는다. `pixiv-filename.test.ts`가 실제 제품 파서와 classic UMD·브라우저 ESM의 다른 realm 읽기를 검증한다.
