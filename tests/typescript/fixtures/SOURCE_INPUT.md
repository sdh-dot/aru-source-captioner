# 외부 JSON 입력 경계 Fixture

`source-input-cases.json`은 숫자·객체·배열·빈 값과 정상 후보의 순서를 명시한다. 숫자 ID는 문자열로 변환하지 않는다. URL도 문자열만 인정한다.

`input-*.png`는 직접 생성한 1×1 PNG이며 실제 CRC·IDAT와 AruArchive iTXt JSON을 포함한다. `input-*.jpg`는 기존 합성 단색 `source-exif.jpg`의 이미지 데이터에 EXIF ImageDescription JSON을 기록했다. 사용자 파일이나 외부 작품을 포함하지 않으며 URL에 접속하지 않는다.

| 파일 | 기대 출처 |
| --- | --- |
| input-string-id.png | artworks/143805797 |
| input-bad-url-valid-source.png, input-bad-url-valid-source.jpg | artworks/66778899 |
| input-valid-url-bad-id.jpg | artworks/55667788 |
| input-all-invalid.png, input-all-invalid.jpg | 없음; 거절한 객체·배열 안의 URL도 fallback하지 않음 |

재생성: `node tests/helpers/create-source-input-fixtures.mjs`. 테스트는 실제 TS 함수 본문을 실행하며 File→PNG 판독 또는 실제 exifr→후보 수집을 구분해 검증한다. exifr에 Node Buffer를 전달하는 테스트 adapter는 실제 Firefox FileReader realm을 재현하지 않는다. 그 경계는 기존 MULTI-01 classic/WXT 버퍼 테스트가 별도로 검사한다.
