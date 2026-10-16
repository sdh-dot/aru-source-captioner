# PR #4·#5 통합 실행 기록

2026-10-16. 작업 브랜치는 `integration/aru-wxt`이며 기존 브랜치·PR·외부 포크는 수정하지 않는다. 원격 Push·PR 등록·Merge·댓글/리뷰/메시지 전송·실제 게시/업로드·배포는 수행하지 않는다.

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
