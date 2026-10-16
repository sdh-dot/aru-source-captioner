# IIFE 단계적 제거 · ESM 전환 결과

기준일: 2026-10-16, Asia/Seoul. 구현·로컬 검증 범위이며 WXT 개인 포크 통합·원격 Push·PR·Merge·배포는 수행하지 않았다.

## 1. 형상과 협업 보호

- 요청 루트: `E:/dev/VSCode/personal/aru_archive/browser-extension`.
- 구현 작업 트리: 위 루트의 `esm-core-transition`, 브랜치 `refactor/esm-core-transition`.
- 공개 GitHub main: `1164afc3745d6af47e4e3fc750540963226f8355`. 원격 `ls-remote`와 [공개 저장소](https://github.com/sdh-dot/aru-source-captioner)를 다시 확인했다. 로컬 공개 main도 같은 SHA이며 clean이다.
- 구현 기준: Hybrid의 커밋된 `4d871f702fb633722c09e0074e6fa0d9429c17f6`. 공개 main보다 업로드 출처 매칭·모바일 로딩 개선이 포함된 기반이다. Hybrid의 **미커밋 최적화 20개 tracked 변경과 17개 untracked 파일을 이식하거나 수정하지 않았다**.
- 별도 모바일 작업 트리의 `a6087a7c740db200f1aba6c3941ec9c8338501f4`와 기존 Manifest 수정도 보존했다. main으로 checkout/reset/merge하지 않았다.
- Captioner WXT 작업본은 개인 포크의 미커밋 상태로 미제공이다. 별도 `aru-icon-manager`의 WXT 프로젝트를 Captioner 포크로 취급하지 않았다.

초기 기록은 `E:/dev/VSCode/personal/tmp/esm-transition-OgiJvZ/before.json`, 종료 대조는 [esm-validation.json](esm-validation.json)이다. 기존 작업 트리·상위 저장소 기준 **677개 파일과 루트 공통 소스/도구 14개가 모두 같은 해시**였다. 각 저장소 HEAD도 같다. 기존 미커밋 변경을 stage하거나 되돌리지 않았다. 독립 E2E 실행으로 루트의 테스트 보고·스크린샷은 추가/갱신되며 기능 소스와 구분한다.

## 2. IIFE 조사 결과

[전체 파일·행 목록](esm-iife-inventory.json)은 `npm run audit:esm`으로 재검사할 수 있다. 현재 작업 트리의 Git 대상 JS/CJS/MJS **143개 파일, IIFE 186개**를 조사했다. 테스트·도구·생성물까지 포함한 수치이며 이전 RC3의 런타임 JS만 조사한 통계와 직접 비교하지 않는다. 함수 표현식/화살표의 즉시 호출과 `.call/.apply` 호출을 센다.

| 분류 | 파일 | IIFE |
|---|---:|---:|
| 순수 데이터 처리 | 11 | 3 |
| 검색·인덱싱 | 5 | 6 |
| 브라우저 API | 6 | 10 |
| 루리웹 DOM | 3 | 0 |
| 작성기 | 7 | 3 |
| Background | 3 | 1 |
| Content Script | 2 | 2 |
| UI 초기화 | 18 | 17 |
| 기타 도구·진단 원본 | 10 | 3 |
| 생성 번들·복사본 | 30 | 106 |
| 검증 코드 | 46 | 5 |
| 제3자 라이브러리 | 2 | 30 |

제3자 exifr IIFE는 수정하지 않았다. 기존 Firefox용 optional loader 패치를 재현하는 빌드도 그대로다. 전환 대상 ESM **10개에는 IIFE와 암묵적인 Aru namespace 참조가 없으며 순환 의존은 0개**다. 명시적으로 target을 받는 `installLegacyTagApis`와 classic 소비자를 위한 `compat` 등록은 허용 경계로 구분한다.

## 3. 실제 전환 범위

| 기능 | 관리할 원본 | 보존한 규칙 |
|---|---|---|
| 태그 코덱 | `shared/icon-metadata/tag-codec.mjs` | v1/legacy·공백·중복·첫 순서·대소문자·오류 |
| 변경 계획·선택 | `shared/icon-metadata/tag-edit-model.mjs` | no-op raw·미선택 ID·충돌 회피·anchor·Set 순서 |
| 검색·접기 | `docs/source/ruliweb-icons/core.mjs` | NFKC 검색·any/all·정렬 tie·32개 캐시·접기 복원 |
| metadata carrier | `docs/source/ruliweb-icons/metadata-core.mjs` | raw bytes·digest·v1 fallback·warning/code |
| metadata DOM | `docs/source/ruliweb-icons/metadata.mjs` | 본문 범위·carrier 중복·HTML 파싱 |
| 브라우저 | `docs/source/ruliweb-icons/browser-adapter.mjs` | Firefox Promise/Chromium callback·lastError·byte wire |
| 사이트 | `docs/source/ruliweb-icons/site-adapter.mjs` | 본문 미디어 순서·URL·태그 오류 격리·참조 검증 |
| 작성기 ISOLATED | `docs/source/ruliweb-icons/composer-adapter.mjs` | 동기 문자열 응답·session·Controller stop |
| metadata MAIN | `docs/source/icon-metadata/metadata-editor-bridge.mjs` | 공통 Codec 직접 import·속성만 편집·serializer·undo·중복 설치 guard |

Phase 1의 기존 태그 ESM을 복사해 이 격리 Git 브랜치에 포함했으며 알고리즘을 다시 작성하지 않았다. 원래 루트의 모듈은 수정하지 않았다. `legacy-adapter.mjs`를 포함한 공개 API와 사용 예시는 [WXT 통합 안내](esm-wxt-integration.md), [공통 태그 안내](../../shared/icon-metadata/README.md)에 있다.

기존 hand-authored IIFE 7개(태그 writer/reader, 검색, metadata reader, browser/site/composer adapter)와 두 브라우저에 중복 내장되던 metadata MAIN의 논리적 IIFE 1개를 ESM 원본으로 대체했다. 옛 `.js` 경로 자체를 삭제하지 않고 **생성 파일로 전환**했다. 생성물 안의 IIFE는 classic script 호환용 출력이며 직접 관리하는 알고리즘 원본이 아니다.

## 4. 기존 실행 경로와 변경 파일

`npm run build`가 `tools/build-esm.mjs`를 통해 esbuild로 `.js` 8개와 metadata MAIN 번들 2개를 생성한 후, 기존 `tools/build.mjs`를 실행한다. `docs/source/compat/*.mjs` 8개는 import한 API를 기존 namespace에 등록하거나 MAIN 설치 함수를 호출한다. 나머지 소비자의 파일 순서와 초기화 시점을 유지한다.

변경·신규 파일은 [검증 근거의 changedFiles](esm-validation.json)에 모두 기록한다. 주요 묶음은 다음과 같다.

- 신규 원본: 위 ESM, `shared/icon-metadata/legacy-adapter.mjs`, `docs/source/compat/*.mjs`.
- 생성 파일: 기존 `docs/source/ruliweb-icons/{core,metadata,attribute-tags,browser-adapter,site-adapter,composer-adapter}.js`, `docs/source/icon-metadata/{core,editor-bridge}.js`, 두 브라우저의 icon reader·writer·bundle generator 번들.
- 빌드·검사: `tools/build-esm.mjs`, `tools/audit-esm.mjs`, `tools/test-esm-browser.py`, `package.json`, `package-lock.json`.
- 검증: `tests/esm/{tag-contract,modules,build}.test.mjs`, 출처 해시를 동결한 `fixtures/legacy.json`과 태그 기대값, 작성기 HTML/API fixture.
- 안내: 이 보고서, inventory/validation JSON, WXT 가이드, 공통 태그 README, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`.

esbuild 0.28.2와 Acorn 8.19.0은 정확한 버전의 개발 의존성으로만 추가했다. 기존 formatter/linter/TypeScript/WXT 설정을 새로 만들지 않았다. `tools/build.mjs`, `docs/tools/build-generator.mjs`, 두 Manifest, options/background, 업로드 출처 매칭 원본은 HEAD 대비 바이트가 같다. 확장 ID/권한/matches/world/저장 키/이벤트/기존 사용자 설정 계약을 변경하지 않았다. Chromium unpacked 테스트의 ID는 테스트 경로에서 파생되며 스토어 ID 검증을 대신하지 않는다.

## 5. 데이터 동등성

`aru-tags:v1`, `data-aru-tags`, `data-aru-id`, `ruricon:v1`, `aru-icons:v2`를 그대로 사용한다. 검색 정규화를 저장 태그에 합치지 않는다. add/remove/replace는 입력을 수정하지 않고 같은 내용·순서면 legacy raw까지 유지한다. 원본 이미지 ID와 선택하지 않은 이미지의 태그가 바뀌지 않는다.

동결한 공개/Hybrid 구현 18개 소스의 SHA-256을 먼저 확인하고 실제 ESM과 입출력·name/code/message·ID 생성 횟수·입력 불변성을 비교한다. v2 digest는 원래 v1 bytes를 기준으로 검증하며 WebCrypto 누락·digest 불일치 때 기존 warning/v1 fallback이 같다. MAIN 설치 함수 본문은 의존성 선언과 ESM strict 처리 외에는 기존 AST와 같은지 별도 검사한다.

## 6. 테스트·빌드

| 검사 | 결과 | 범위 |
|---|---|---|
| 공개 RC3 기존 suite | **59/59** | 공개 main 읽기 전용 실행 |
| Hybrid 현재 suite | **106/106** | 미커밋 최적화 포함, 해당 파일 미수정 |
| 격리 브랜치 기존 suite | **94/94** | 커밋된 Hybrid 기반의 실제 생성물 |
| ESM 계약·회귀·재현성 | **41/41** | 실패/skip 0, 태그 25개 포함 |
| 기존 Firefox/Chromium build | 통과 | 전체 산출물 재생성 |
| 생성 재현성 | 통과 | 두 번의 전체 build 뒤 모든 브라우저 파일 SHA-256 동일 |
| `verify` | 통과 | Manifest 경로·모든 배포 JS 구문·vendor hash·양 브라우저 공통 코드 |
| `verify:esm`, `audit:esm` | 통과 | 생성 파일 일치·10개 ESM·cycle 0 |
| Firefox addons-linter | 오류 **0**, 경고 **9** | 기준 HEAD도 오류 0/경고 9; strict warning-free 아님 |
| historical suite | **193 통과 / 94 실패 / 287개** | 아래 기준 비교 필요 |
| WXT build | **미검증** | Captioner 개인 포크 미제공 |

이 숫자는 서로 겹치는 suite이므로 더해 고유 테스트 수로 표시하지 않는다. historical은 동일 HEAD를 별도 임시 폴더에 추출해 비교했다. 기준 **189 통과 / 98 실패**, 신규 실패 이름은 0개다. 94개 실패는 누락된 과거 harness/자료·옛 UI/배포 가정을 포함하며 기대값 수정으로 감추지 않았다. 통과가 늘어난 4개를 이번 기능 수정 성과로 주장하지 않는다. 원시 로그는 `docs/results/{head-historical,esm-historical,esm-contract,esm-regression,esm-firefox-lint}.log`에 있다.

## 7. 브라우저 E2E

기존 `tests/e2e/run.ps1 -Browser all`을 그대로 실행해 기존 배포 ZIP/서명 XPI의 Firefox·Chromium·Whale 로드와 MOCK 흐름을 재확인했다. 해당 명령의 패키지를 새 빌드로 바꿔치기하지 않았다. 별도 `tools/test-esm-browser.py`는 같은 독립 환경·workflow를 재사용하면서 **이 작업 트리의 생성물**을 fresh profile에 설치한다. 테스트용 ZIP은 ignored 결과 폴더에만 만들고 기존 배포 ZIP은 변경하지 않는다.

| 브라우저 | 새 빌드 로드·옵션 | MOCK 기능 | 실제 공개 페이지 |
|---|---|---|---|
| Firefox 158.0 | 통과 | **7개 통과** | 마지막 실행에서 공개 페이지 이동 40초 timeout, 전체 runner exit 1 |
| Chromium 156.0.8078.4 | 통과 | **7개 통과** | 본문·content script 관측; 로그인 작성기/태그 글 미검증 |
| Whale 150.0.7871.252 | 통과 | **7개 통과** | 본문·content script 관측; 로그인 작성기/태그 글 미검증 |

MOCK 검증은 실제 Manifest 주입·100개 미디어(97 IMG/3 VIDEO)·한글 검색·태그 필터·삽입·본문 보존·동적 작성기 추가/삭제·페이지 이동·재초기화와 metadata MAIN 편집을 포함한다. 마지막 편집 시험은 fixture Summernote 계약으로 add/remove/replace/빈 교체/no-op/ID·비대상 보존/serializer/`IMAGE_CHANGED`를 검사한다. 실제 사이트 Summernote·서버 저장·로그인·업로드·게시 성공을 뜻하지 않는다.

Firefox의 앞선 실행 1회에서는 기존 workflow가 다시 렌더링된 요소를 참조해 `StaleElementReferenceException`이 발생했다. 실패 보고를 남긴 채 재실행했고 마지막 실행에서 모든 MOCK 관측이 통과했다. 뒤이은 실제 사이트 navigation timeout도 성공으로 바꾸지 않는다. Chromium 추가 fixture 최초 시험은 필요한 toolbar가 빠져 실패했으며 fixture를 실제 탐색 계약에 맞춰 수정했다. 제품 코드를 우회하거나 자동 재시도로 통과시키지 않았다.

재실행 예시(이 작업 트리에서):

```powershell
& '../tests/e2e/.venv/Scripts/python.exe' tools/test-esm-browser.py --harness '../tests/e2e' --browser chromium
& '../tests/e2e/.venv/Scripts/python.exe' tools/test-esm-browser.py --harness '../tests/e2e' --browser firefox
& '../tests/e2e/.venv/Scripts/python.exe' tools/test-esm-browser.py --harness '../tests/e2e' --browser whale
```

실행별 기록·스크린샷·콘솔과 마지막 파일 SHA는 `docs/results/esm-e2e` 및 `esm-validation.json`을 확인한다. 기존 환경이 없는 clone에서는 먼저 외부 독립 E2E 환경을 준비해야 한다. 비로그인 공개 페이지의 기존 `5039` 본문 부재, 실제 저장 태그 부재, 로그인 작성기 부재는 BLOCKED/미검증으로 남긴다. 실제 업로드·게시 요청은 실행하지 않는다.

## 8. 남은 IIFE와 보류 이유

`docs/source`의 직접 관리 원본 **20개 파일에 24개 IIFE**가 남는다. 다른 직접 관리 스크립트·진단까지 포함하면 45개다. 위치/행은 inventory에 모두 남겼다.

- `library-search.js`, `library-reader.js`: Hybrid 동시 최적화 소유 파일. 현재 브랜치에서 추가 개편하지 않았다.
- `feature`, `picker`, `registry`, `catalog`, `ui-preferences`, `design-system`: 전환 모듈을 소비하는 남은 UI/초기화 경계. 기존 globals는 compat로 유지하며 개인 포크 entry 수령 후 이관한다.
- icon metadata `interface.js`, bundle generator의 core/search/client/bridge/UI/controller: 별도 UI·MAIN 계약 검증과 타입/entry 협의가 필요하다.
- 댓글 MAIN `composer-bridge.js`: 기존 네이티브 삽입 계약과 분리된 후속 단위다. ISOLATED ComposerAdapter와 혼동하지 않는다.
- background/content/options/body-download/upload-attribution: 브라우저 초기화·수명주기·저장소·출처 연결 검증이 필요한 독립 단위다. 이번에 통째로 래퍼를 제거하지 않았다.
- 제3자·테스트·생성 IIFE: 제품 원본 이관과 구분한다. 생성물에서 IIFE를 찾아 직접 지우지 않는다.

전체 IIFE 제거 완료 또는 WXT 이전 완료로 보고하지 않는다. 이번에 전환한 관리 ESM의 알고리즘에는 IIFE와 Aru namespace 의존이 없다.

## 9. WXT 담당자의 최소 작업과 위험

[통합 안내](esm-wxt-integration.md)의 import·공개 함수·입출력·예외·world 예시를 사용한다. 개인 포크의 기존 ESM과 먼저 비교하고 공통 소스만 선택적으로 가져간다. **이 브랜치의 생성 번들을 Hybrid/WXT에 일괄 덮어쓰면 안 된다.** 동일 경로의 Hybrid 최적화와 통합 충돌 가능성이 있다. entry/Manifest/TS/formatter 설정은 담당자의 구조를 우선한다. TypeScript 포크에서 JS 선언이 필요하면 해당 설정에 맞춰 타입 경계를 추가해야 한다.

classic 파일별 독립 로드를 보존해 의존 ESM이 여러 출력에 중복 포함된다. 예를 들어 Whale reader는 **274,728 → 380,195 bytes**, bundle generator content는 **144,798 → 183,091 bytes**다. 관리 알고리즘은 단일 원본이지만 출력 크기가 늘었다. 현재 build-generator를 협업 최적화와 합치지 않기 위한 경계이며 WXT의 하나의 entry import 그래프로 합치는 것을 다음 단계로 권한다. 설치 성능이 동일하다는 결론은 내리지 않는다.

## 10. Git 기록과 다음 단계

이 보고서와 검증된 범위만 `refactor/esm-core-transition`에 로컬 커밋한다. 이 보고서를 포함하는 커밋은 `git log -1 --oneline`과 최종 응답의 SHA로 식별한다. 기준 부모는 `4d871f7`이다. 원격 Push·PR·Merge·배포는 수행하지 않는다.

다음 순서는 (1) 개인 WXT 소스 수령·중복 모듈 대조, (2) SearchIndex를 소비하는 library reader/search의 명시적 import 전환, (3) feature/UI entry 조립과 생성 중복 제거, (4) 댓글 MAIN bridge·bundle MAIN·background를 각각 분리 검증, (5) 실제 로그인 작성기·태그 저장/재조회 검증이다. 각 단계에서 데이터 계약·브라우저 초기화·기존 사용자 변경을 다시 확인한다.
