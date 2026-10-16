# 잔여 IIFE 제거 및 ESM 브랜치 완료 보고

2026-10-16, Asia/Seoul. 직접 관리하는 제품 원본의 IIFE를 **45개 → 0개**로 전환했다. 요청된 `docs/source` 범위는 **20개 파일의 24개 → 0개**다. 기존 Firefox·Whale classic 배포 경로는 ESM에서 생성한다. 외부 WXT 포크 통합, 원격 Push·PR·Merge·스토어 배포는 수행하지 않았다.

## 1. 형상과 보호 범위

- 프로젝트 루트: `E:/dev/VSCode/personal/aru_archive/browser-extension`.
- 기존 격리 작업 트리: 위 루트의 `esm-core-transition`, 브랜치 `refactor/esm-core-transition`.
- 시작 HEAD 및 요청 기준 커밋: `2f755c3db89b628256586cfd314337b496f36421`. 존재와 현재 브랜치를 확인했고 시작 시 작업 트리는 clean이었다.
- 공개 main은 원격 조회 결과 `1164afc3745d6af47e4e3fc750540963226f8355`이며 이전 Phase 1 기준과 같다. 이번 커밋은 기존 ESM 브랜치에만 추가한다.
- WXT 작업본은 다른 개발자의 개인 포크에서 진행 중이고 제공되지 않았다. 이 브랜치에는 Captioner WXT 설정/entrypoint가 없다. 별도 Icon Manager 프로젝트를 통합 대상으로 사용하지 않았다.
- 시작 파일 해시: `E:/dev/VSCode/personal/tmp/esm-completion-SB3F6j/before.json`. 이 작업 트리의 기존 271개 파일과 협업 작업 트리의 기준 파일을 기록했다.
- Hybrid의 254개, 모바일 작업 트리의 213개, 공개 main 작업 트리의 202개, 합계 **669개 파일**은 종료 대조 시 변경·삭제·신규 파일이 없고 HEAD도 같다. Hybrid의 기존 미커밋 수정과 모바일 Manifest 수정은 그대로다.

상세 해시 대조, 변경 파일 전체 목록, 기준 IIFE 파일·행 목록, 브라우저 결과는 [검증 근거](esm-completion-validation.json)에 기록했다. 새 커밋의 SHA는 `git log -1 --format=%H refactor/esm-core-transition`으로 조회한다. 이 문서 자체가 해당 커밋에 포함되므로 자기 커밋 SHA를 문서 안에 넣지 않는다.

## 2. IIFE 조사와 전환 전 목록

함수 표현식·화살표의 즉시 호출 및 `.call/.apply` 호출을 AST로 조사한다. Git 추적/미추적 대상의 JS/CJS/MJS와 테스트를 제외한 HTML 인라인 실행 코드까지 확인한다. 생성물은 실제 빌드 출력 목록으로 분류하고 `verify:esm`으로 다시 생성한 내용과 비교한다. 단순 확장자 변경이나 주석 표기로 생성물로 간주하지 않는다.

기준 커밋의 전체 목록을 아래에 기록한다. 행 번호는 전환 전 파일 기준이다. 같은 태그/메타데이터 알고리즘의 기존 ESM은 재사용했다.

| 기준 파일 | 분류 | IIFE 시작 행 | 수 |
|---|---|---|---:|
| `docs/MOBILE-TAGS-READONLY.js` | 기타 도구·원본 | 2 | 1 |
| `docs/READONLY-UPLOAD-DIAGNOSTIC.js` | 기타 도구·원본 | 1 | 1 |
| `docs/demo/upload-surfaces.js` | 기타 도구·원본 | 2 | 1 |
| `docs/source/bundle-generator/bridge.js` | 작성기 연동 | 2 | 1 |
| `docs/source/bundle-generator/client.js` | 작성기 연동 | 1 | 1 |
| `docs/source/bundle-generator/controller.js` | UI 초기화 | 1 | 1 |
| `docs/source/bundle-generator/core.js` | 순수 데이터 처리 로직 | 2, 98 | 2 |
| `docs/source/bundle-generator/search-ui.js` | UI 초기화 | 1 | 1 |
| `docs/source/bundle-generator/search.js` | 검색 및 인덱싱 | 2, 65 | 2 |
| `docs/source/bundle-generator/ui.js` | UI 초기화 | 1 | 1 |
| `docs/source/icon-metadata/interface.js` | UI 초기화 | 2, 44, 177 | 3 |
| `docs/source/ruliweb-icons/background.js` | Background Script | 2 | 1 |
| `docs/source/ruliweb-icons/catalog.js` | 검색 및 인덱싱 | 2 | 1 |
| `docs/source/ruliweb-icons/composer-bridge.js` | 작성기 연동 | 2 | 1 |
| `docs/source/ruliweb-icons/design-system.js` | UI 초기화 | 2 | 1 |
| `docs/source/ruliweb-icons/feature.js` | UI 초기화 | 2 | 1 |
| `docs/source/ruliweb-icons/library-reader.js` | 검색 및 인덱싱 | 2 | 1 |
| `docs/source/ruliweb-icons/library-search.js` | 검색 및 인덱싱 | 2 | 1 |
| `docs/source/ruliweb-icons/picker.js` | UI 초기화 | 2 | 1 |
| `docs/source/ruliweb-icons/registry.js` | 검색 및 인덱싱 | 2 | 1 |
| `docs/source/ruliweb-icons/ui-preferences.js` | UI 초기화 | 2 | 1 |
| `docs/source/upload-attribution/core.js` | 순수 데이터 처리 로직 | 2 | 1 |
| `docs/source/upload-attribution/ui.js` | UI 초기화 | 2 | 1 |
| `firefox/content.js` | Content Script | 20 | 1 |
| `firefox/features/body-download/browser-api.js` | 브라우저 API 연동 | 1 | 1 |
| `firefox/features/body-download/core.js` | UI 초기화 | 2 | 1 |
| `firefox/features/body-download/engine.js` | UI 초기화 | 1 | 1 |
| `firefox/features/body-download/ui.js` | UI 초기화 | 1 | 1 |
| `firefox/options.js` | 브라우저 API 연동 | 9, 131 | 2 |
| `whale/content.js` | Content Script | 20 | 1 |
| `whale/features/body-download/browser-api.js` | 브라우저 API 연동 | 1 | 1 |
| `whale/features/body-download/core.js` | UI 초기화 | 2 | 1 |
| `whale/features/body-download/engine.js` | UI 초기화 | 1 | 1 |
| `whale/features/body-download/ui.js` | UI 초기화 | 1 | 1 |
| `whale/options.js` | 브라우저 API 연동 | 9, 143, 154, 159, 164, 169 | 6 |


여기에 포함되지 않았던 `body-download/content.bundle.js`의 내장 extractor도 독립 ESM으로 추출했다. 이 코드는 이전 조사에서 생성 번들의 일부였으나 실제 본문 수집에 필요하므로 runtime 조립에서 빠지지 않도록 추가 동등성 검증을 했다. Background의 IIFE가 없던 초기화 코드도 같은 ESM 소유 구조로 옮겼다.

## 3. 전환한 기능과 모듈 구조

| 원본 위치 | 책임과 주요 API |
|---|---|
| `shared/icon-metadata/{tag-codec,tag-edit-model}.mjs` | 기존 ESM 재사용. 태그 normalize/encode/decode, plan, Selection |
| `docs/source/ruliweb-icons/*.mjs` | 기존 순수 검색·metadata·browser/site/composer adapter에 catalog·registry·library reader/search·picker·설정·feature·MAIN composer·cache Background factory 추가 |
| `docs/source/icon-metadata/interface.mjs` | `createMetadataInterface`: Client/Browser, Panel, Controller. 3개 폐쇄 범위와 기존 초기화 순서 보존 |
| `docs/source/bundle-generator/*.mjs` | core Draft/직렬화/검증, BoardSearch/SearchSelection, Client, SearchPanel, Panel, Controller, MAIN bridge |
| `docs/source/upload-attribution/{core,ui}.mjs` | `createAttributionCore/Ui`: Registry/Controller와 기존 작성기 연결. 출처 판정 알고리즘 유지 |
| `docs/source/body-download/*.mjs` | 공통 Core·Browser API·본문 extractor·Engine·UI·Content·Background. 동일하던 Firefox/Whale 구현은 한 원본으로 통합 |
| `docs/source/platform/{firefox,whale}/*.mjs` | `install*Content/Options/Background`: 브라우저별 기존 캡션·설정·Native 초기화. 브라우저별 차이는 유지 |
| `docs/source/runtime/{icons,downloads}.mjs` | static import로 각 실행 영역의 의존성과 초기화 순서를 조립 |
| `docs/source/runtime/module-scope.mjs` | 모듈이 소유한 공개 API와 주입된 지연 의존성만 구분. 암묵적인 namespace 조회 없음 |
| `docs/{MOBILE-TAGS-READONLY,READONLY-UPLOAD-DIAGNOSTIC}.mjs`, `docs/demo/upload-surfaces.mjs` | 진단/데모도 명시적 호출 함수로 전환. 기존 진단 스크립트의 평가 반환값 보존 |

새 기능별 factory는 환경과 공개 의존성을 인자로 받고 소유한 API만 반환한다. ESM import 자체는 DOM·브라우저 API·namespace 등록·네트워크 요청을 실행하지 않는다. 기존 IIFE의 지역 변수·조기 반환·비동기 lexical this는 명명한 내부 초기화/처리 함수에 보존하고 내부 알고리즘의 불필요한 변경을 피했다. 기존 함수·데이터 이름은 유지했다.

전체 reader·metadata UI·bundle MAIN/UI는 하나의 import 그래프로 묶는다. 같은 실행 영역에 이미 있는 Metadata·DesignSystem 인스턴스는 이전 guard에 맞춰 재사용한다. 늦게 준비되는 공개 의존성은 getter로 연결해 feature·composer 설치 순서와 문서별 상태를 보존한다. 타이머 등 환경 함수는 호출 시 환경의 함수를 조회해 기존 호출 문맥과 테스트/브라우저 hook의 동작을 유지한다.

등록 목록은 `pack-registry.json`을 ESM에서 import해 단일 원본으로 사용하며 factory 호출마다 독립된 객체를 제공한다. 공통 다운로드 코드는 두 브라우저의 기준 구현이 바이트 단위로 같음을 먼저 확인하고 합쳤다.

## 4. 기존 배포와 공개 API 호환

`docs/source/compat/*.mjs`는 기존 namespace 등록과 설치 함수 호출만 담당한다. 알고리즘 원본은 `.mjs`다. `.js` 경로, Manifest 등록·순서, 옵션 HTML, Content/MAIN/Background 실행 영역은 보존했다.

`npm run build`는 다음 순서로 실행한다.

1. Phase 1 출력과 잔여 전환 출력, metadata MAIN을 포함한 호환 파일 51개 생성.
2. 변경하지 않은 기존 `tools/build.mjs`와 `docs/tools/build-generator.mjs` 실행.
3. 두 브라우저의 reader·metadata UI·bundle MAIN/UI 출력 8개를 각각 단일 ESM 그래프로 생성.

`tools/esm-completion-entries.json`은 기존 경로 → 모듈/진입점/의존 키/공개 키의 대응이다. `tools/esm-runtime-entries.json`은 최종 runtime 출력 목록이다. 모든 생성 JavaScript에 자동 생성 안내를 붙였고 검사 모드로 내용 일치를 확인했다. 개발자는 이 출력물을 직접 수정하지 않는다. WXT 빌드 도구·설정은 추가하지 않았다.

Chromium worker는 기존 importScripts 대신 정적 import한 설치 함수를 기본 Background → 아이콘 캐시 → 다운로드 Background 순서로 호출한다. `ownsDownload`는 먼저 지연 주입해 Native 다운로드 구분을 유지한다. Firefox는 기존 Manifest의 분리 등록 순서를 사용한다. 진단용 JavaScript는 기존 eval 호출의 반환값까지 유지한다.

태그·HTML 계약 `aru-tags:v1`, `data-aru-tags`, `data-aru-id`, `ruricon:v1`, 기존 v2 carrier, 저장 키·옵션 unknown 필드·확장 ID·요청/응답 이벤트 이름을 유지했다. 기존 `tag-codec.mjs`와 `tag-edit-model.mjs`, 두 Manifest, 기존 빌드 도구, lockfile은 시작 해시와 같다.

## 5. 검증 결과

| 검증 | 결과 |
|---|---|
| ESM 단위·동등성 | **51/51 통과**. 기준 Phase 1의 41개와 신규 10개 |
| 격리 브랜치 회귀 | **94/94 통과** |
| 공개 RC3 | **59/59 통과**. 공개 작업 트리 읽기 전용 실행 |
| Hybrid | **106/106 통과**. 기존 미커밋 최적화 포함 현지 상태에서 읽기 전용 실행 |
| 전체 과거 테스트 | 기준 커밋과 현재 모두 **287개 중 193 통과·94 실패**, 새 실패 이름 없음 |
| 빌드·재현성 | 통과. 반복 빌드한 전체 Firefox/Whale 산출물 동일, 호환 파일과 runtime 출력 일치 |
| Manifest·JS 구문·vendor hash·공통 출력 | `npm run verify` 통과. Manifest 바이트 변경 없음 |
| IIFE·의존성 감사 | 제품 원본 **0**, ESM **49개**, 순환 **0**, namespace 위반 **0**, HTML 인라인 IIFE **0** |
| Firefox linter | 오류 **0**, 경고 **9**. 기존 경고 수와 동일. warnings-as-errors를 통과했다고 주장하지 않음 |

신규 동등성 검증은 기준 커밋의 41개 소스를 SHA와 함께 동결해 원본 IIFE 실행 결과와 비교한다. 모든 신규 모듈의 무부작용 import, 여러 팩의 이미지 dedup/membership/한글 필터·순서, 통합팩 unknown 필드/슬롯/직렬화/URL 예외, 다중 선택, UI/Metadata 재사용, 실제 생성 CSS·토큰, 다운로드 경로/미디어/예외/수집 응답을 검증한다. 본문 중복 이미지·댓글 제외와 발신자/비활성화/탐색 변경 거절도 비교한다.

기존 태그 테스트는 한글·특수문자·공백·중복·순서·legacy/v1·빈 태그·ADD/REMOVE/REPLACE·no-op 원문·ID 충돌/생성·예외 name/code/message·Selection을 비교한다. 기존 검색·metadata 테스트는 결과 순서·캐시·carrier raw bytes·digest·파싱과 예외를 비교한다.

과거 테스트의 기존 실패는 누락된 옛 외부 harness/진단 파일, 옛 배포 버전의 byte-exact release ledger, 이전 UI 설계 기대값 등을 포함한다. 기준 커밋을 별도 임시 폴더로 추출하고 같은 의존성·과거 baseline 폴더를 연결해 다시 실행했다. 새 구조의 source 검사 한 곳은 **기대값·assertion은 그대로** 두고 `design-system.js` 대신 관리 원본 `design-system.mjs`를 읽도록 바꿨다. 생성물 포맷 변경을 기능 회귀로 오인하지 않도록 했으며 runtime CSS/토큰 동일성을 별도로 추가 검증했다. 전체 과거 테스트가 모두 통과한 상태라는 의미는 아니다.

## 6. 브라우저별 실제 E2E

기존 독립 `tests/e2e`의 Python 환경과 workflow를 `tools/test-esm-browser.py`로 재사용했다. 기존 배포 ZIP 대신 이 작업 트리의 Firefox/Whale 생성물을 새 테스트 프로필에 설치했다. 기존 사용자 프로필·인증은 사용하지 않았다. 서버 변경 요청은 차단했고 실제 게시·업로드를 하지 않았다.

| 브라우저 | 실제 엔진 | 확장/옵션 실행 | 실제 확장 + 통제 DOM/API fixture | 공개 사이트 읽기 |
|---|---|---:|---:|---|
| Firefox | 158.0 | 4 PASS | 7 PASS | 4 PASS / 4 BLOCKED |
| Chromium | 156.0.8078.4 | 4 PASS | 7 PASS | 5 PASS / 4 BLOCKED |
| Whale | Chromium 150.0.7871.252 | 4 PASS | 7 PASS | 5 PASS / 4 BLOCKED |

세 브라우저 모두 확장 로드·실제 옵션 저장·Content Script 초기화, 100개 이미지 태그, 아이콘 검색/필터/초기화, 선택·네이티브 삽입 브리지, 동적 작성기·페이지 이동 재초기화가 통과했다. MAIN 태그 ADD/REMOVE/REPLACE·빈 교체·no-op 원문·ID·비대상 보존·serializer·IMAGE_CHANGED도 통과했다. Background 및 fixture 오류 배열은 모두 비었다.

실제 익명 공개 게시판과 공개 글의 본문/이미지는 읽었다. 과거 5039 본문 부재, 익명 페이지의 숨겨진 작성기/아이콘 진입점, 관측 글의 저장 태그 부재, 로그인 작성기 부재는 BLOCKED로 기록했다. 통제 fixture 결과를 실제 서버 저장/게시 성공으로 간주하지 않는다. Firefox에서는 Chromium과 같은 상세 script 관찰 항목이 없으므로 공개 페이지의 전체 script 목록 검증을 별도로 통과했다고 쓰지 않았다.

원본 로그·화면은 ignored `docs/results/esm-e2e/`에 보관한다. 최종 보고서는 `reports/20261016-190012-{firefox,chromium,whale}.json`이며 핵심 항목은 tracked 검증 JSON에도 남겼다. 실행 예시:

```powershell
& '../tests/e2e/.venv/Scripts/python.exe' tools/test-esm-browser.py --harness '../tests/e2e' --browser firefox
# chromium, whale도 각각 같은 방식으로 실행
```

## 7. 남은 IIFE와 WXT 통합 범위

제품 원본에는 남은 IIFE가 없다. 전체 저장소에는 생성 출력의 wrapper 67개, 기존 테스트 harness/fixture의 IIFE 5개, 제3자 라이브러리의 IIFE 30개가 남는다. 제품 원본과 구분해 inventory에 명시했다. 제3자 exifr와 기존 Firefox optional loader 패치는 그대로다. 생성 wrapper는 classic 등록 경로가 필요한 동안 유지하고 WXT 전환 후 해당 경로의 소비자를 모두 검증한 뒤 제거한다.

ESM 공개 API·경로·입출력·데이터/예외·브라우저 차이와 최소 연결 예시는 [WXT 통합 안내](esm-wxt-integration.md)에 정리했다. 외부 개발자는 필요한 순수 모듈 또는 runtime factory를 기존 WXT entry에서 import하고 자신의 환경/공개 의존성을 전달하면 된다. 이미 구현한 UI/Controller가 있으면 전체 runtime을 중복 설치하지 않는다. MAIN/ISOLATED 분리, Metadata 클래스 인스턴스, 기존 storage/events/settings 계약은 유지해야 한다.

WXT 설정·entrypoint·Manifest 생성 정책·신규 컴포넌트는 건드리지 않았다. 따라서 예상 통합 범위는 상대 브랜치의 import 연결·환경/의존성 주입·중복 compat 제거와 브라우저 검증이다. 파일 이동이나 WXT 초기화를 요구하지 않는다. 실제 포크와 충돌 여부는 해당 브랜치가 준비된 뒤 3-way 비교해야 하며 무충돌 병합을 단정하지 않는다.

## 8. 변경 파일과 후속 검증

전체 변경 경로는 [changedFiles](esm-completion-validation.json)에 기록했다. 주요 묶음은 36개 신규 기능 ESM, runtime 3개, compat 진입점, 기존 경로의 생성 JavaScript, 빌드 래퍼/출력 매핑, AST 감사, 동등성 테스트·기준 소스 fixture, 기존 스타일 source 검사 경로 한 곳, 통합/기여/완료 문서다. 기존 순수 Codec·검색/metadata 알고리즘을 다시 구현하지 않았다.

출력 크기는 경계별로 달라졌다. Firefox reader는 380,195 → 335,089 bytes, bundle UI는 183,091 → 184,486 bytes다. Whale Background는 기존 분리 importScripts 내용을 포함하므로 4,249 → 51,691 bytes가 됐고 Firefox Background는 4,036 → 5,107 bytes다. 단순히 전체 크기가 줄었다거나 브라우저 성능이 개선됐다고 주장하지 않는다.

후속 작업은 외부 WXT 포크의 실제 통합·빌드, 로그인 작성기의 서버 저장을 포함한 수동 검증, 실제 Native Host/다운로드 파일 생성, Manifest 최소 지원 버전과 모바일 실기기 E2E다. 과거 release ledger/harness의 현대화는 기능 전환과 별도 작업으로 진행한다. 실제 업로드·게시 기능을 바꾸거나 실행하지 않고 기존 API/이벤트·출처 매칭 처리만 보존했다.
