# PR #4·#5 통합 실행 기록

2026-10-16. 작업 브랜치는 `integration/aru-wxt`이며 기존 브랜치·PR·외부 포크는 수정하지 않는다. 원격 Push·PR 등록·Merge·댓글/리뷰/메시지 전송·실제 게시/업로드·배포는 수행하지 않는다.

현재 제품 원본은 `src/**/*.ts`다. 아래 Step 1의 `.mjs` 연결·바이트 재현 설명은 첫 커밋 당시의 기록이며, 최종 구조와 검증은 Step 2 이후를 따른다. [공개 API·연결 안내](esm-wxt-integration.md), [원본 구조](../../src/README.md), [한국어 PR 초안](aru-wxt-pr-draft.md)을 함께 제공한다.

## 기준과 출처

- PR #4: `183784c52be8916bc764626c6bbcbec104816eba` (`integration/aru-unified`). 최신 NORMAL 태그 오류 처리·Hybrid 검색/DOM/파싱 큐/색인을 보존한다.
- PR #5: `a8177040b90ea5e134a151d025cdc132b94c3eb0` (`craftingmod:wxt`, Base `refactor/esm-core-transition`). 초기 main에서 시작한 WXT 실험안이므로 일괄 Merge하지 않았다.
- 정리 브랜치: `282ff66f13d16ee7238d6070cb1983f58655e969`. 파일 분류와 Q0~Q8 계획을 읽고 재사용한다. 현재 Runtime 의존성·초기화 순서를 먼저 확인했다. 해당 브랜치를 Merge/Cherry-pick하지 않았다.

## Step 1 — WXT 구조

PR #5의 WXT 0.21.3·Vite 8.1.5·TypeScript 5.9.3·oxfmt 0.72.0·oxlint 1.87.0과 entrypoint 이름/World 구분·정렬 hook을 참고했다. 기존 npm lockfile에 버전을 고정했으며 jquery/jsdom은 PR #4의 버전을 유지했다. 개인 Chrome 실행 경로·프로필·디버그 포트·counter/TypeScript/WXT 예제 에셋·오래된 IIFE 코드는 가져오지 않았다.

`config/manifests.ts`는 브라우저별 기존 Manifest에서 권한·버전·ID·호스트·리소스·모바일 범위를 가져온다. WXT가 등록 파일명과 Background를 생성한다. Firefox는 기존 MV3 scripts 방식을, Chromium/Whale은 service worker를 유지한다. 옵션 HTML은 기존 브라우저별 내용을 사용하며 다운로드 관리 탭의 `features/body-download/download.html` 경로도 유지한다. 공통 공개 에셋은 PR #4의 현재 에셋을 사용하고 폰트/exifr 고지를 포함한다.

엔트리포인트는 `.mjs` 관리 원본을 직접 import한다. Compat 생성 JS를 WXT에 import하지 않는다. 기존 classic 빌드와 동등성 검증용 출력은 당분간 보존한다. WXT의 strict 타입 설정이 classic 출력의 strict 경계를 변경하지 않도록 기존 esbuild 출력 옵션을 명시했다. 제품 알고리즘은 바꾸지 않았으며 기존 생성 JS는 이전 바이트로 재현된다. metrics 인자 세 곳의 JSDoc은 TypeScript가 기본값 null만으로 인자 타입을 제한하지 않도록 보완했다.

### 초기화와 실행 영역

- Background: Native/옵션 installer → icon cache Background → download Background. Native 설치 시 주입한 `ownsDownload` getter는 다운로드 API가 준비된 뒤 조회한다.
- reader ISOLATED: exifr 7.1.3을 환경에 주입 → Attribution Core → 브라우저 content → icon Runtime → Attribution UI 순서다. DOM 함수의 receiver는 실제 Window로 유지한다.
- metadata UI와 bundle UI는 ISOLATED World의 private Symbol 경계를 통해 공개 인스턴스만 재사용하고 의존성을 factory에 명시적으로 넘긴다. 모든 기능을 Aru 전역 namespace로 연결하지 않는다. 별도 MAIN World와 인스턴스를 공유하지 않는다.
- MAIN composer·태그 편집·통합팩 bridge는 별도 content entry다. token/session/requestId·문자열 detail·동기 응답·history/serializer 검증을 유지한다. 옵션 UI·관리 탭은 별도 HTML entry다.

### Step 1 검증

- TypeScript(새 WXT 코드), oxlint, oxfmt 검사 통과.
- WXT Firefox·Chromium·Whale 빌드, 권한/ID/버전/URL/7개 script World·순서·공개 리소스 비교 통과.
- 기존 ESM 51개·통합 계약 4개·회귀 111개 통과. 기존 Manifest 검사·생성 재현성·원본 IIFE 0개·순환 0개 확인.
- 기존 독립 E2E의 새 프로필에 **WXT 출력**을 설치했다. Firefox·Chromium·Whale의 로드·실제 옵션/저장, MOCK 100개 수집·검색·필터·삽입·재초기화·MAIN 태그 편집/직렬화가 통과했다. 결과는 ignored `docs/results/wxt-e2e/reports/20261016-210046-firefox.json`, `20261016-210133-chromium.json`, `20261016-210154-whale.json`이다.
- 공개 게시판/본문은 읽기 전용으로 접근했다. 로그인 작성기·실제 게시/업로드·Android·Native Host는 미검증이다. 익명 페이지의 비가시 작성기·태그 없는 본문·5039와 기존 파일명 기반 CDP script 휴리스틱은 BLOCKED로 보존한다. MOCK 성공을 실제 서버 동작 성공으로 간주하지 않는다.

## 정리 결과 적용 계획

Step 2에서 브라우저별 파싱 중복과 picker의 상태/종료 책임을 포함해 검토한다. 데이터 계약과 네이티브 DOM/브리지 수명은 Q0의 보존 조건을 따른다. Step 3에서 정리 브랜치의 `.gitignore` 범위 및 파일별 보존 분류를 재사용하고, 생성물·Fixture·역사 기록은 용도 확인 없이 삭제하지 않는다. TypeScript 전환과 문서 정리는 각각 별도 로컬 커밋으로 구분한다.

## 외부 개발자에게 확인할 사항

PR #5의 공개 본문은 WXT 구조 제안을 검토해 달라는 내용이며 리뷰/리뷰 코멘트는 조회 시 없었다. 댓글 1개는 사용자의 검토 응답이었다. 이 세션에서는 답변하지 않는다. 사용자에게 전달할 확인 사항은 최신 PR #4 기능과 모바일 범위 반영, MAIN/ISOLATED에서 공유할 인스턴스 범위, 다운로드 관리 탭 경로, Firefox MV3/Android 최소 버전과 Native Host 실환경 검증이다.

기술 근거는 설치된 WXT 0.21.3의 타입/구현 및 [entrypoints](https://wxt.dev/guide/essentials/entrypoints.html), [Manifest](https://wxt.dev/guide/essentials/config/manifest.html) 공식 문서를 확인했다. 웹 문서는 현재 버전일 수 있어 실제 동작은 고정 의존성으로 빌드·브라우저 검증했다.

## Step 2 — TypeScript 원본과 캡슐화

기존 47개 관리 모듈을 `src`로 옮기고 모델·환경 계약·공통 파서·Picker 수명을 포함해 **58개 TypeScript 파일**을 검사한다. WXT 엔트리포인트는 이 원본을 직접 import한다. `strict` 타입 검사와 oxfmt·oxlint를 적용했다. 저장 코덱·태그 변경/선택·검색 인덱스·메타데이터 스키마·캐시 원장·파일 출처 기록을 명시적인 모델로 구분한다.

- Firefox·Whale에 동일했던 `hasPngSignature`, `parsePngItxtChunks`, `parseItxtChunk`만 공통 모듈로 추출했다. URL 정책·파일명 strict/loose·EXIF 우선순위·pixel table은 브라우저 어댑터에 남겼다. 두 동결 구현과 정상·잘린 입력을 직접 비교한다.
- Picker의 DOM·검색 상태는 인스턴스 클로저에 유지한다. `PickerLifecycle`의 private 상태가 종료를 먼저 확정하고 정리 재진입·중복 호출을 차단한다. 기존 이벤트·타이머·미디어·목록·포커스 해제 순서는 보존했다. 늦은 완료·재진입·정리 예외 검증을 추가했다.
- 업로드의 2슬롯 큐·동일 File 진행 중 공유·root/name 대응·TTL·취소, 다운로드 원장·완료 리스너 선설치, MAIN history/serializer 복원 알고리즘을 일반 controller로 합치지 않았다.
- `tools/compile-typescript.mjs`가 기존 ESM 경로를 생성하고 기존 Compat 빌드가 classic 출력을 만든다. 생성물 첫 줄에 TS 원본 경로를 표시한다. 타입 전용 8개 파일은 불필요한 빈 JS를 만들지 않는다. `tools/typescript-modules.json`은 기존 경로 매핑이다.

완전히 정적인 API로 바뀐 것은 아니다. 브라우저 callback/Promise, jQuery/Summernote, 여러 버전의 공개 응답 및 문자열 resolver 경계에는 `DynamicApi`·`any`가 남는다. 함수·레코드의 내부 상태를 모두 class private으로 바꾸지도 않았다. 핵심 모델과 수명 경계를 먼저 구분했으며 이 동적 포트의 세부 타입 강화는 후속 과제다. 타입 단언을 외부 데이터 검증의 대체물로 취급하지 않는다.

### 검증 코드의 필요한 조정

oxlint의 중괄호 규칙은 실행 순서를 바꾸지 않지만 기존 AST의 블록 모양을 바꾼다. 두 AST 검사는 **양쪽의 단일 제어문 블록만** 정규화한다. 조건·문장 순서·변수 선언의 범위는 계속 비교하며, 조건·선언 변경을 거절하는 부정 검증도 추가했다. 동결 Fixture·기대 데이터·예외 코드는 변경하지 않았다.

Historical의 팔레트 검사는 처음에 줄바꿈·따옴표 차이로 새 실패 1건이 발생했다. 색상값을 바꾸거나 실패를 제외하지 않고, 기존 `LIGHT`/`DARK`의 `Object.freeze` 초기화 AST 전체를 비교하도록 소스 표현 검사만 조정했다. 결과는 기존 **193 통과·94 실패**, 새 실패 이름 0개다. 이 테스트 변경은 두 번째 커밋에 명시되어 있다.

## Step 3 — 정리 결과의 선택적 반영

정리 브랜치의 KEEP 357·CONSOLIDATE 2·ARCHIVE 11·DELETE 0 분류를 재사용했다. maintenance 문서 3개는 당시 수량·경로를 보존한 기록임을 표시하고 현재 보고서로 연결했다. 같은 분석을 반복하거나 브랜치를 Merge/Cherry-pick하지 않았다.

- `.gitignore`: 정리 브랜치의 출력 폴더 루트 한정과 PR #5에서 검토한 `.output`·`.wxt`·개인 실행 설정을 결합했다. 제품·Fixture·CI 입력은 제외하지 않는다. 원본을 가정한 `src/cache`·`docs/source/cache` 등 11개 양성/음성 사례를 검사한다.
- 참조가 없는 내부 함수 6개(`pushIfString`/`pushIfStringOrArray`의 브라우저 사본, Firefox의 이전 버튼 주입·클릭 처리), 상수 5개, 읽지 않는 상태 3개와 해당 단순 대입을 제거했다. 공개 API·입력 이벤트·활성 파일 입력 경로는 유지했다. 같은 이름이라도 Whale에서 사용되는 댓글 상수 2개와 클릭 함수는 최종 타입 게이트에서 검출하여 복원했다. 동결된 Whale 구현과 비교해 출처 버튼·늦게 생성된 답글·네이티브 첨부 이벤트·본문 보존을 확인하는 검증 1개를 추가했다.
- 코드와 일치하지 않던 Phase 정책 문서 참조 및 중복 JSDoc을 제거·정정했다. 영어 제약 설명을 한국어로 바꾸고 기계적 헤더·번호를 정리했다. 경계·원문 보존·브라우저 제약 설명은 유지했다.
- 파일 자체의 삭제·이동·문서 본문 병합은 **0개**다. `docs/source`·Fixture·기존 근거·배포 파일과 52개 Compat entry는 현재 검증/호환 빌드에서 참조하므로 보존했다. 불필요한 PR #5 예제·개인 설정은 처음부터 가져오지 않았다.
- 라이선스 사본의 잘못된 상대 링크는 해당 문서가 존재하는 공개 PR #4 커밋의 고정 URL로 수정했다. 원본 권리 고지는 바꾸지 않았다.

Step 2 종료 487개에서 Step 3 종료 492개로 늘어난다. 추가 5개는 보존 maintenance 3개·`src/README.md`·PR 초안이다. 정리는 파일 수 감소가 아니라 원본/출력 구분과 실제 미사용 코드 제거에 한정했다. 변경 파일은 `git show --stat` 및 `git diff 183784c..HEAD --name-status`로 모두 확인할 수 있다.

## 최종 검증

| 검증 | 결과 |
| --- | --- |
| 타입·oxfmt·oxlint | 통과, oxlint 오류·경고 0 |
| 기존 ESM 동등성 | 51 통과 |
| 통합 계약 | 4 통과 |
| 새 TypeScript 직접 검증 | 8 통과 |
| 통합 회귀 | 111 통과 |
| RC3 공통 5파일 | 현재 통합 형상에서 59 통과 |
| Hybrid | PR #4가 보존한 106개 검증의 최적화/업로드 범위를 통합 111개로 재검증. 별도 원본 Worktree의 suite는 이번에 실행하지 않음 |
| Historical | 193 통과·기존 94 실패, 새 실패 이름 0 |
| Firefox classic Lint | 오류 0·기존 경고 9. WXT의 AMO 승인·서명 성공을 뜻하지 않음 |
| 빌드·Manifest | Firefox·Chromium·Whale WXT 빌드 및 기존 권한·ID·버전·World·순서·리소스 비교 통과 |
| 재현·IIFE·의존성 | TS/ESM/classic 생성 일치, 관리 원본 IIFE 0·순환 0 |
| 보호 검사 | 기존 6개 Worktree의 HEAD·상태·1,767개 파일과 배포 ZIP/XPI 201개 동일. 원격 ref·PR #1~#5 상태 동일 |

타입·회귀·build 로그는 ignored 실행 자료로 보존한다. 기존 Historical 실패와 Firefox 경고를 0으로 표시하거나 검사에서 제외하지 않았다. WXT 빌드·classic 빌드는 별개 출력이며 `.output/{firefox,chrome,whale}-mv3`가 새 로드 대상이다.

### 실제 브라우저와 사이트

최종 WXT 출력으로 새 프로필에서 Firefox·Chromium·Whale을 각각 실제 실행했다. 확장 로드·실제 옵션/저장, 합성 페이지의 100개 수집·검색·필터·삽입·재초기화·MAIN 태그 ADD/REMOVE/REPLACE·no-op 원문·ID·미선택 보존/직렬화 검사가 통과했다. 최종 보고 파일은 ignored `docs/results/wxt-e2e/reports/20261016-220551-firefox.json`, `20261016-220425-chromium.json`, `20261016-220446-whale.json`이다.

실제 공개 게시판·본문·작성기 진입점은 읽기 전용으로 확인했다. 공개 본문에 저장 태그가 없던 경우의 태그 필터, 익명 작성기 삽입·5039는 BLOCKED다. Chromium/Whale의 옛 파일명 기준 script 검사는 BLOCKED로 그대로 남겼으며 관측된 WXT 스크립트 이름을 보존했다. 합성 검사의 성공을 실제 게시 성공으로 표시하지 않는다.

중간 Firefox 실행에는 공개 사이트 탐색 40초 시간 초과 1회와 자동화 중 요소 교체 오류(StaleElementReferenceException) 1회가 있었다. 요소 교체 오류 실행의 스크립트·Manifest·에셋은 앞서 성공한 실행과 해시가 같았으며 재실행은 정상 완료했다. 실패한 `20261016-214446-firefox.json`, `20261016-220400-firefox.json`도 보존했다. 간헐 자동화 오류의 안정화는 후속 과제다. 실제 로그인 작성기 게시·업로드·Android 기기·Native Host·서명 패키지·장시간 MV3 재시작은 미검증이다.

Firefox의 명시적 확장 ID와 기존 Manifest 필드는 보존했다. Chromium/Whale unpacked 개발 ID는 로드 경로에 따라 달라질 수 있으므로 새 프로필 E2E를 기존 설치의 ID·저장 데이터 업그레이드 검증으로 해석하지 않는다. 기존 서명·스토어 설치를 이용한 업데이트 검증은 후속 작업이며 이 작업은 개인 프로필을 열거나 데이터를 이전하지 않았다.

## 커밋과 협업 인계

1. `e5fac65e1cbce84cd862690bbc4d4098098a3445` — `refactor: WXT 기반 빌드 구조 통합`
2. `2c5863914325c7004876d14194120af080c1b4ab` — `refactor: 주요 기능 TypeScript 전환 및 구조 정리`
3. 이 보고서·한국어 PR 초안·정리 결과를 담은 `chore: 중복 소스 및 개발 문서 정리` 로컬 커밋. 최종 SHA는 작업 종료 보고와 브랜치 Git log에서 확인한다.

남은 확인은 실제 로그인 작성기의 history/Undo·저장 HTML, Android Firefox의 파일 선택/Native Host, 장시간 서비스 워커 종료·재시작, 외부 WXT 담당자의 이후 변경과의 비교다. 캐시 wire 재귀와 고정 태그 목록의 추가 단일 원본화, 동적 API 포트 타입 강화는 별도 동등성 단위로 진행한다. 임의 generic factory나 전체 Picker 재작성은 하지 않았다.

외부 개발자에게는 위 초기화 순서·MAIN/ISOLATED 인스턴스 경계·현재 PR #4 기능·모바일/권한·다운로드 탭 경로·Native 검증 조건을 사용자가 확인해 주면 된다. 댓글·리뷰·메시지·PR 편집은 수행하지 않았다. PR 제목과 본문은 **로컬 초안만** 제공하며 Push·PR 등록·Merge는 사용자 검토 이후 별도 작업이다.
