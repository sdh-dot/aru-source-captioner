# MULTI-01 수정 및 Firefox·Whale 실제 업로드 재검증

2026-10-17, Asia/Seoul. `fix/firefox-multi-01`에서 수정했다. PR #6의 공개 HEAD `3acbd7f27581e997d90080ba451b532620273264`를 기준으로 별도 Worktree를 생성했다. 기존 로컬 WXT `f80ce8d`와의 차이는 README·CONTRIBUTING뿐이며 제품 원본 차이는 없다. 기존 브랜치·PR은 수정하지 않았다.

**결과:** Firefox·Whale 각각 지정된 JPG 11개·WEBP 3개가 실제 루리웹 작성기에서 기대 출처와 일치했다. 혼합·선택 순서 변경·실제 요청 완료 순서 역전·동일 파일 재선택도 통과했다. 각 브라우저 22회, 총 44회 업로드 HTTP 200. 오연결·중복 캡션 0건이다. `exifr` 오류는 파일명과 독립적으로 재현하고 메타데이터 경로를 검증했다.

## 1. 원인과 수정 범위

### 파일명 판독

Firefox의 우선 파일명 정규식은 확장자 앞 `(1)` 등의 다운로드 번호를 허용하지 않았다. Whale은 더 느슨한 `_pN` 접두 패턴과 숫자 전용 파일명 추정을 별도로 사용했다. 공통 함수 `src/source-caption/pixiv-filename.ts`의 `parsePixivFilenameUrl(filename: unknown): string | null`로 판독 규칙을 합쳤다.

- `_pN` 또는 명시적인 `pixiv`·`illust` 접두 표식을 요구한다. 표식 없는 `143805797.jpg`, `143805797 (1).jpg`는 사용자 결정에 따라 두 브라우저 모두 **파일명 출처 추정에서 제외**한다. 실제 메타데이터의 유효한 출처까지 차단하지는 않는다.
- 기존 6~12자리 ID, 허용 이미지 확장자, URI 디코딩·경로 basename 판독을 유지하며 확장자 바로 앞의 양수 다운로드 번호를 허용한다. `(0)`, `(01)`, 음수·문자·중복 괄호, 잘못된 `_pN`, 이중 확장자는 거절한다.
- `File.name`을 변경하거나 복제하지 않는다. Registry의 DOM 매칭 키·업로드 순서·출처 대응 정책은 수정하지 않았다.
- Firefox의 파일명 우선, Whale의 메타데이터 우선 순서는 유지했다. 같은 파일에 서로 다른 파일명/메타데이터 출처가 있는 경우에도 기존 브라우저별 우선순위를 직접 테스트한다.

### `BufferView.set(): Invalid data argument.`

별도 Firefox 158.0 테스트 프로필에서 localhost의 실제 파일 입력으로 재현했다. 서버 업로드·로그인은 없다. 기존 classic UMD와 WXT가 사용하는 브라우저 ESM 빌드 모두 같은 오류가 발생했다. WXT만의 회귀로 판단하지 않는다.

`exifr@7.1.3`의 `BlobReader._readChunk()`가 `FileReader` 결과를 `BufferView.set()`으로 복사한다. Firefox content 영역에서 그 결과는 `[object ArrayBuffer]`이지만 로컬 `instanceof ArrayBuffer`가 false였으며 이 타입 분기에서 실패했다. `file.arrayBuffer()`와 `Uint8Array`로 바꾸는 시도도 다른 realm 판별 때문에 대안이 되지 못했다.

Firefox에만 공식 옵션 `chunked: false`를 추가했다. 원래 File을 그대로 `exifr.parse()`에 전달하고 EXIF·XMP·IPTC·UserComment 옵션도 유지한다. `BlobReader.readWhole()`의 `_swapArrayBuffer()` 경로는 해당 청크 복사를 거치지 않는다. vendor·보안 래퍼·전역 생성자·의존성 버전은 변경하지 않았고 Whale의 청크 읽기도 유지했다.

| Firefox 실제 native File 입력 | 기존 classic UMD | 브라우저 ESM |
| --- | --- | --- |
| 기본 청크 읽기: 일반 JPG 및 EXIF/XMP/IPTC Fixture | 같은 BufferView 오류 재현 | 같은 BufferView 오류 재현 |
| 전체 읽기: 출처 없는 실제 JPG | 정상, 출처 없음 | 정상, 출처 없음 |
| 전체 읽기: `source-exif.jpg` | 작품 `55667788` | 작품 `55667788` |
| 전체 읽기: `source-xmp.jpg` | 작품 `66778899` | 작품 `66778899` |
| 전체 읽기: `source-iptc.jpg` | 작품 `77889900` | 작품 `77889900` |

메타데이터 Fixture에는 Pixiv 파일명 표식이 없다. 따라서 이 결과는 파일명 fallback으로 오류를 가린 결과가 아니다. 실제 Firefox 관측과 함께 Node의 다른 realm FileReader 회귀 테스트도 추가했다. classic 생성 파서의 14개 파일 오프라인 결과도 ESM과 일치했다. **classic 확장 전체를 실제 로그인 작성기에 설치하여 업로드하는 테스트는 실행하지 않았다.**

전체 읽기는 큰 파일에서 메모리를 더 사용한다. 기존 공통 업로드 Controller는 파싱 작업을 동시에 2개까지 실행하지만, 다른 출처 버튼 경로까지 메모리 상한을 보장하는 것은 아니다. 대용량 파일·Android 메모리 검증은 후속 작업이다.

## 2. 변경 파일

| 구분 | 파일 |
| --- | --- |
| 공통 원본 | `src/source-caption/pixiv-filename.ts` 신규 |
| 호출부·Firefox 읽기 옵션 | `src/platform/firefox/content.ts`, `src/platform/whale/content.ts` |
| 도구로 재생성 | `docs/source/source-caption/pixiv-filename.mjs`, `docs/source/platform/{firefox,whale}/content.mjs`, `firefox/content.js`, `whale/content.js` |
| 테스트 | `tests/typescript/pixiv-filename.test.ts`, `tests/typescript/fixtures/source-{exif,xmp,iptc}.jpg` |
| 문서·검증 요약 | 이 보고서, `multi-01-fix-evidence.json`, `tests/typescript/fixtures/README.md` |

Manifest·WXT 설정·엔트리포인트·업로드 Core·태그 Codec·저장 규격·이벤트 계약은 변경하지 않았다. 과거 `tests/filename.test.cjs`의 동결된 파서/기대값도 수정하지 않았다. 숫자 전용 파일명의 새 정책은 실제 제품 파서를 호출하는 신규 테스트로 검증한다.

## 3. 오프라인 대상 파일과 실제 사이트 결과

원본 14개의 SHA-256·크기·파서 결과는 [검증 JSON](multi-01-fix-evidence.json)에 있다. 기존 목록·해시와 재비교했으며 원본은 변경하지 않았다. JPG 11개 모두 출처 메타데이터가 없고 파일명으로 기대 URL을 결정했다. WEBP 3개는 출처 메타데이터·EXIF/XMP 청크가 없고 음성 사례로 유지했다. 기존 중복 이미지 조사 결과도 재사용했다.

| 파일 | 기대 Pixiv 작품 ID / 출처 | Firefox 실제 | Whale 실제 |
| --- | --- | --- | --- |
| `139017213_p0_master1200 (1).jpg` | `139017213` | PASS | PASS |
| `143805797_p0_master1200.jpg` | `143805797` | PASS | PASS |
| `144648326_p0_master1200 (2).jpg` | `144648326` | PASS | PASS |
| `145632893_p0_master1200.jpg` | `145632893` | PASS | PASS |
| `146557008_p0_master1200 (2).jpg` | `146557008` | PASS | PASS |
| `148161896_p0_master1200 (3).jpg` | `148161896` | PASS | PASS |
| `149405647_p0_master1200 (1).jpg` | `149405647` | PASS | PASS |
| `149440438_p0_master1200 (1).jpg` | `149440438` | PASS | PASS |
| `149856375_p0_master1200.jpg` | `149856375` | PASS | PASS |
| `150523094_p0_master1200 (1).jpg` | `150523094` | PASS | PASS |
| `150930959_p0_master1200.jpg` | `150930959` | PASS | PASS |
| `1a12fe68d09538348.webp` | 출처 없음 | PASS | PASS |
| `1a134fc7ba817e8d8.webp` | 출처 없음 | PASS | PASS |
| `1a1420fd7bc3a28af.webp` | 출처 없음 | PASS | PASS |

Pixiv 기대 URL은 `https://www.pixiv.net/artworks/{작품 ID}`다. 파일별 실제 URL과 이미지·캡션의 문단 위치는 JSON에 기록했다. 오프라인 비교는 Node에서 실제 File/메타데이터로 생성 ESM과 classic의 파서 함수를 실행한 결과이며 브라우저 실제 업로드와 구분한다.

## 4. 실제 사이트 실행과 순서 검증

기존 `tests/e2e`의 Selenium·Playwright·캐시를 재사용했다. 새로운 자동화 환경을 설치하지 않았다. 새 독립 테스트 프로필에서 확장 옵션을 저장하고 사용자가 직접 로그인한 후 같은 세션의 실제 `input#img_upload_btn`으로 파일을 선택했다. 파일·DOM·성공 응답을 위조하거나 업로드 요청을 MOCK 처리하지 않았다. 최종 글 등록 경로는 방지하고 한 번도 실행하지 않았다.

- 기준 제품·테스트 커밋: `2d534d48454a4937de46e1323f298a44edbe9272`.
- Firefox 158.0 / 확장 1.0.4: 10:45:41~10:48:40.
- Whale 5.39.412.57 / Chromium 150.0.7871.252 / 확장 0.1.3: 10:45:51~10:48:37.
- 실제 API `POST https://api.ruliweb.com/upload/BImg`: 두 브라우저 각각 22회 HTTP 200.

| 배치·관측 | 선택 수 | Firefox | Whale |
| --- | --- | --- | --- |
| B01 JPG 2개 | 2 | PASS, 캡션 2 | PASS, 캡션 2 |
| B02 같은 작성기에 WEBP 추가 | 1 | PASS, 전체 이미지 3·캡션 2 | 동일 |
| B03 JPG·WEBP 혼합 | 4 | PASS, 캡션 2 | 동일 |
| B04 나머지 JPG | 9 | PASS, 캡션 9 | 동일 |
| B05 혼합 목록의 선택 순서 반전 | 4 | PASS, 캡션 2 | 동일 |
| B06 같은 JPG 최초 선택 | 1 | PASS, 캡션 1 | 동일 |
| B07 같은 입력에서 동일 JPG 재선택 | 1 | PASS, 이미지 2·캡션 각각 1 | 동일 |
| 추가 업로드 없이 지연 재관측 | 0 | PASS, 중복 없음 | 동일 |
| 새 작성기 문서 진입·빈 상태 재관측 | 0 | PASS, 이전 이미지·출처 없음 | 동일 |

실제 완료 순서 역전도 **두 브라우저 모두** 관측했다. B03의 시작 `u4,u5,u6,u7` → 완료 `u5,u4,u6,u7`, B05의 시작 `u17,u18,u19,u20` → 완료 `u17,u19,u18,u20`였다. 사이트가 생성한 최종 이미지 순서는 각 배치의 선택 순서와 같았고 이미지별 출처도 정확했다. 요청 ID는 네트워크 순서만 식별한다. 인증 헤더·업로드 본문을 읽지 않았으므로 특정 `uN`이 어떤 파일인지까지 대응시켰다고 주장하지 않는다.

순서·파일별 판정은 업로드 직후 저장한 **개별 `Bxx-…-evaluation.json`**을 기준으로 했다. 보조 runner의 누적 `batch-results.json`은 Python 가변 목록을 공유해 B01/B06의 선택 목록이 다음 선택 때 늘어나는 기록 문제가 있었다. 개별 파일은 그 이전에 직렬화되어 정확한 목록을 유지한다. 누적 목록을 판정 근거로 쓰거나 원본 기록을 수정하지 않았다. 판정 대상 제품에는 영향을 주지 않으며 runner의 목록 복사는 후속 개선 대상이다.

Firefox의 BufferView 오류는 실제 업로드 콘솔에서 0건이었다. 다만 이번 11개 JPG는 파일명으로 출처를 찾으므로 메타데이터 오류 해결의 독립 근거는 앞 절의 EXIF/XMP/IPTC native File 검사다.

## 5. 자동 검증과 기존 문제 구분

| 검증 | 결과 |
| --- | --- |
| TypeScript·oxfmt·oxlint | 통과, oxlint 오류·경고 0 |
| TypeScript 직접 테스트 | 52 통과: 기존 8 + 신규 44 |
| ESM 동등성 | 51 통과 |
| 통합 계약 | 4 통과 |
| 현 통합 회귀 `npm test` | 111 통과 |
| RC3 공통 5파일 | 59 통과 |
| Firefox·Chromium·Whale WXT 및 classic 빌드 | 통과 |
| Manifest·리소스·권한·World·ID | 검사 통과, 세 WXT Manifest는 기존 빌드와 바이트 동일 |
| TS/ESM/classic 생성본 일치 | `verify`, `verify:wxt`, `verify:typescript`, `verify:esm` 통과 |
| 원본 IIFE·의존성 | 원본 IIFE 0, 순환 0 |
| Historical | 기존과 같은 193 통과·94 실패, 신규 실패 이름 0 |
| Firefox classic Lint | 오류 0·기존 경고 9, 경고 블록도 기존과 동일 |

Node 24.15.0 / npm 11.12.1. 별도 Hybrid 개인 작업 트리의 106개 suite는 이번에 실행하지 않았다. 해당 최적화·업로드 범위가 포함된 현재 통합 회귀 111개를 재검증했다. 기존 실패를 제외하거나 assertion을 수정하지 않았다.

WEBP의 `Unknown file format` 경고는 브라우저별 5회이며 기대했던 출처 없음으로 처리됐다. Firefox 광고 SDK 경고와 Whale 광고 차단·Mixed Content 오류도 로컬 원본 로그에 보존했다. Whale은 마지막 새 작성기 진입 구간에 `chrome.storage.sync unavailable — using default options` 경고 1회가 있었다. 이전 수정 전 실행에도 5회 관측됐던 별도 현상이다. 실제 업로드 22회와 옵션 저장은 통과했지만 원인은 해결하지 않았으며 후속 조사로 남긴다.

## 6. 증거·재현 방법·미검증

- 커밋 가능한 요약: [multi-01-fix-evidence.json](multi-01-fix-evidence.json). 실제 사용자 이미지·인증 자료는 포함하지 않는다.
- 로컬 전체 증거: 작업공간의 `tmp/aru-multi01-fix/real-upload/`. `reports/`, 브라우저별 `Bxx-…-evaluation.json`, `*-dom.json`, `upload-network-events.json`, `console.json`과 `screenshots/{run}/`을 보존했다. 스크린샷은 로그인 이후 작성기 요소만 촬영했다.
- 독립 메타데이터 진단: `tmp/aru-multi01-fix/exifr-browser-diagnosis.json`, `run-probe.py`, `exifr-probe.mjs`. 자동 검증 로그와 14개 파일 분석도 같은 로컬 폴더에 있다.
- 실제 사이트 재현 runner: 같은 폴더의 `multi-upload-runner.py`, `complete-sequences.py`, `expectations.json`. 기존 `tests/e2e/.venv`로 실행하며 새 테스트 프로필·사용자 직접 로그인·14개 allowlist 및 SHA 검사를 유지해야 한다. 예전 Firefox 누락을 허용하는 판정 예외는 사용하지 않았다.
- 이전 실패 보고서는 별도 `pr6-user-acceptance` Worktree의 `real-upload-firefox-whale.md`, `multi-upload-firefox-whale.md`에 그대로 보존했다. 과거 FAIL을 소급 변경하거나 열려 있던 Excel을 수정하지 않았다.

| 남은 검증 | 상태·이유 |
| --- | --- |
| 실제 업로드 실패·재시도 | NOT RUN, 서버 요청을 임의 차단하지 않음 |
| 동일 파일명·다른 내용 | NOT RUN, 지정 14개에 해당 사례 없음 |
| 같은 문서 강제 재초기화·리스너 개수 | NOT RUN, 이번에는 지연 관측·새 문서 진입만 확인 |
| classic 확장 전체 실제 업로드 | NOT RUN, 파서·라이브러리 비교와 WXT 실제 업로드를 구분 |
| 대용량·Android·Native Host·장시간 부하 | NOT RUN |
| 게시글 최종 등록·수정 | 금지, 실행하지 않음 |

**미등록 업로드 파일도 사이트 서버에 남을 수 있다.** 파일 삭제 API를 호출하거나 게시글을 등록하지 않았다. 테스트 브라우저만 종료했고 사용자 프로필·인증 정보를 복사하거나 변경하지 않았다.

## 7. 로컬 커밋과 보호 확인

1. 제품·호환 생성물: `206e4bb` — `fix: Pixiv 중복 다운로드 파일명과 Firefox 메타데이터 판독 수정`
2. 테스트·합성 Fixture: `2d534d48454a4937de46e1323f298a44edbe9272` — `test: 파일명 오탐과 Firefox 버퍼 경계 회귀 검증 추가`
3. 이 보고서·검증 요약·Fixture 설명: 별도 `docs:` 로컬 커밋. 최종 SHA는 이 브랜치 Git log와 완료 보고에 기록한다.

보호 검사에서 기존 8개 Worktree의 HEAD·상태·3,066개 파일, ZIP/XPI 201개, 원격 ref와 PR 메타데이터가 같았다. 실제 14개 이미지 해시도 동일하다. Push·PR 생성·Merge·리뷰/댓글·외부 메시지·배포는 수행하지 않았다. WXT 개인 포크와 기존 PR #1~#6을 수정하지 않았다.
