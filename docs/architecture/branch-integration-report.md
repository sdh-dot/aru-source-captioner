# 분산 개발 브랜치 통합 보고서

2026-10-16, Asia/Seoul. 기능별 누락을 검토해 `integration/aru-unified`를 구성했다. 기준은 검증된 ESM `402cf68823d7856325906c08a3af3e8f0c2b95d2`이며, 기존 브랜치의 일괄 Merge/Cherry-pick을 하지 않았다. 이 작업은 로컬 통합이며 원격 Push·PR 생성·main 병합·배포는 하지 않았다.

## 1. 형상 조사와 별도 Worktree

작업 트리는 `E:/dev/VSCode/personal/aru_archive/browser-extension/aru-unified`, 브랜치는 `integration/aru-unified`다. 기존 `esm-core-transition`, Hybrid, Android Firefox, 공개 main 작업 트리는 그대로 유지했다. 새 Worktree의 의존성은 기존 동일 lockfile의 node_modules를 junction으로 재사용했으며 원본에 설치/업데이트하지 않았다.

| 대상 | 확인한 HEAD | 상태와 차이 |
|---|---|---|
| GitHub main / 공개 로컬 | `1164afc3745d6af47e4e3fc750540963226f8355` | RC3 기준, 로컬 clean |
| PR #1 | `fee0aeb7e221b787cf1cf3fd5c7518c1c0cacdb8` | NORMAL 오류의 partial/stale 전파, 5개 회귀와 수동 검증 문서가 추가됨 |
| PR #1 복구 커밋 | `724fce1f60b52ebc50cb65fdaafc0786578d9cfb` | 로컬 `a6087a7`과 tree `97d1e63429df26f1cb796c4b50642e16b9c778bc`가 같음. 모바일/로딩 개선은 ESM에 이미 포함 |
| PR #2 | `4d871f702fb633722c09e0074e6fa0d9429c17f6` | 출처 매칭·모바일 안전 처리·업로드 UI는 ESM 기준의 조상에 포함 |
| PR #3 / ESM 로컬 | `402cf68823d7856325906c08a3af3e8f0c2b95d2` | 원본 IIFE 제거와 테스트 직렬화, clean. 통합 기준 |
| Hybrid 로컬 | `4d871f702fb633722c09e0074e6fa0d9429c17f6` | `perf/hybrid-phase1-to-phase5`. tracked 수정 20개·untracked 17개. 검색/reader/업로드·계측·검증 도구와 문서 포함 |
| Android Firefox 로컬 | `a6087a7c740db200f1aba6c3941ec9c8338501f4` | Manifest의 개발 버전만 0.1.2 → 0.1.3 미커밋 수정. 최신 ESM의 1.0.4를 낮추지 않음 |
| 로컬 `fix/android-upload-attribution` | `4d871f7` | 위 PR #2와 같은 커밋, 중복 적용하지 않음 |
| 상위 `aru_archive` 저장소 | `3e40f6c5b8b55816cd8936dbc8041eadce9904b2` | 별도 GitHub 저장소. 옛 Captioner 8개 미커밋 파일의 icon 옵션/캐시 등록은 이미 현 ESM에 포함 |

상위 저장소의 `feat/source-captioner-auto-insert`(`109c81f`), `chore/source-captioner-store-manifests`(`6bdb12c`), `chore/remove-legacy-firefox-manifest`(`c40bbc5`)도 읽기 전용으로 비교했다. 현 main의 조상은 아니지만, Captioner 경로의 차이는 오래된 옵션/패키징과 본문 끝 자동 삽입 대안 등을 포함한다. 커밋 순서만으로 최신 기능이라고 판단하지 않았다. 옛 Firefox ID/버전/패키징을 가져오거나 PR #2가 제거한 FIFO·본문 끝 삽입을 재도입하지 않았다. 별도 Native 동작 비교 없이는 이 대안을 선택하지 않는다.

외부 WXT 개인 포크는 제공되지 않아 통합 대상으로 가정하지 않았다. 별도 프로젝트를 해당 포크로 취급하지 않았다. PR 최신 HEAD는 읽기 전용으로 확인하고 필요한 PR #1 객체만 기존 ref를 바꾸지 않고 가져왔다.

파일별 변경 상태·출처 해시·로컬 경로·수동 이식 관계는 [source 목록](branch-integration-sources.json), 실행 결과와 보호 대조는 [검증 근거](branch-integration-validation.json)에 있다. 통합 커밋 자체의 SHA는 이 보고서를 포함하는 `git log -1 --format=%H integration/aru-unified`로 확인한다.

## 2. 기능별 통합 매트릭스

P0은 데이터/상태/호환 우선, P1은 기능·성능 개선, P2는 중복 제외 또는 지원 도구다.

| 기능 | 최초 구현 | 최신 수정 | ESM 반영 | 남은 누락/검증 | 충돌 처리 | 우선순위 | 검증 |
|---|---|---|---|---|---|---|---|
| 아이콘 검색·필터 | main 1164afc / a6087a7 | Hybrid 4d871f7 + 미커밋 | 기존 검색 ESM 유지, 최신 사전·정규화 재사용 반영 | 없음 | fee0aeb와 같은 파일, 처리 상태 규칙을 합성 | P1 | 검색 동등성·H 최적화·E2E |
| NORMAL 태그 부분 처리 | PR #1 fee0aeb | PR #1 fee0aeb | feature/reader/search 6조건 이식 | 없음 | Hybrid 성능 코드와 조건을 수동 결합 | P0 | PR1 5회귀·직접 ESM partial 재시도 |
| 통합팩 검색·구성 | main 1164afc | a6087a7 / ESM b134023 | 기준 ESM에 이미 포함 | 없음 | 중복 재적용하지 않음 | P2 | 기존 model/search·ESM 직렬화·E2E |
| 태그 등록·수정·제거 | main / Phase 1 | ESM 2f755c3·b134023 | 기존 codec·plan·Selection 재사용 | 없음 | 저장 normalize와 검색 normalize 분리 | P0 | 기존 ESM 51·MAIN 태그 E2E |
| 이미지 출처 매칭 | PR #2 4d871f7 | Hybrid 미커밋 | root/name 인덱스·TTL·순서·동명 이력 보존 | 실제 서버 파일 대응 증명 | 오래된 FIFO/본문 끝 삽입은 재도입 보류 | P0 | 1700 seeded 비교·순열·기존 content adapter |
| Firefox Android 업로드 | 레거시 / PR #2 | PR #2 + Hybrid 종료 안정화 | 정확 대응 유지, 공유 큐·취소·root 교체 정리 반영 | Android 실기기·Native 결과 | 옛 자동 삽입 대안은 기존 안전 규칙과 충돌 | P0 | 기존 업로드 회귀·취소/12순열·실기기 후속 |
| DOM 감시 최적화 | PR #2 Controller | Hybrid 미커밋 | 전역 root 발견 + root별 이미지 감시·UI 필터 | 없음 | 기존 MutationObserver API·microtask 유지 | P1 | 관련/무관 변경·root 교체·100회 종료·별도 측정 |
| 캐시·인덱싱 | main / a6087a7 | fee0aeb + Hybrid | partial 유지·root/name·팩 사전 재사용 반영 | 증분 인덱스·IDB batching은 원래 미구현 | 캐시 키·32개 검색 캐시·512레코드 유지 | P1 | 캐시/태그 재시도·TTL·결과 순서 동등성 |
| 아이콘 삽입·작성기 | main | PR #2 / ESM b134023 | MAIN/ISOLATED·composer·serializer 기존 구현 유지 | 로그인 게시·저장·Native Host | 브리지/이벤트 재설계 보류 | P0 | 세 브라우저 삽입·MAIN 편집·재초기화 |
| 브라우저별 호환·설정 | main / 상위 레거시 | PR #2 / ESM 402cf68 | 기존 Manifest·ID·옵션 보존 | 최소 버전·Android 기기 | 구형 버전/패키징 변경은 제외 | P0 | 두 Manifest hash·기존 설정·실제 세 브라우저 |
| 개발 수치 계측 | Hybrid 미커밋 | Hybrid 미커밋 → 통합 ESM | OFF 기본값·허용 키·512표본, 명시적 metrics 주입 | 없음 | Manifest prelude 대신 기존 ESM 경계에 연결 | P2 | 동결 원본 oracle·전역 금지·동일 API·계측 OFF 검사 |


## 3. 실제 이식한 변경

### PR #1의 NORMAL 부분 처리

`feature.mjs`, `library-reader.mjs`, `library-search.mjs`에 여섯 조건을 수동 이식했다. 태그 디코딩 오류가 있어도 유효한 미디어는 유지하고 partial/stale을 캐시·전체 팩 검색으로 전달한다. 다음 수집에서 다시 읽으며 정상 태그를 확인한 뒤에만 complete로 바뀐다. 원래 태그가 없는 정상 이미지는 오류가 아니다. 원본 URL을 추측해 바꾸지 않고 다른 저장 키를 무효화하지 않는다.

PR #1의 회귀 5개를 기존 `tests/loading-reader.test.cjs`에 추가했다. 기존 assertion과 현재 ESM의 harness 설정을 보존했다. 3867 PC/mobile 식별자·정확 URL·리다이렉트/본문 없음 거부와 모바일 수동 절차도 반영했다. 원래 PR의 84개/다른 환경 Historical 96개라는 과거 집계를 현재 결과로 복사하지 않았다. 원본 복구 객체가 없다는 과거 제약도 이번 tree 대조로 해소됐음을 구분했다.

### Hybrid 검색·캐시·인덱스

검색 결과와 순서는 유지하면서 재구성 안에서 팩별 태그 사전·제목·source 조회·문자열 정규화를 재사용한다. 중복 tag ID에서 검색 사전의 마지막 값/표시 사전의 첫 값이라는 기존 차이도 보존한다. 갱신 시 임시 사전을 새로 만들어 이전 팩의 태그를 섞지 않는다. 결과 캐시 32개, 기존 dedup/membership·정렬·무효화 계약은 그대로다.

Registry는 root/name 인덱스와 known Set, expiry gate를 사용한다. 가능한 이름이 여러 개여도 실제 선택 순서를 유지하며 동명 이력·소비된 이력·만료 격리를 유지한다. 인덱스 때문에 모호한 후보를 FIFO로 연결하지 않는다.

### Hybrid DOM·업로드 안정화

전역 observer는 작성기 root의 생성/제거/교체를 발견하고, 실제 미디어 속성과 추가/삭제는 root별 observer가 처리한다. 무관한 본문 leaf 변경이나 UI 진단 갱신마다 네이티브 제어를 다시 찾지 않는다. 기존 네이티브 노드/리스너를 교체하지 않으며 microtask 응답 방식을 보존했다.

파싱은 배치 전체가 두 슬롯을 공유한다. 동일한 불변 File 객체의 진행 중 작업만 공유하며 이름·크기·수정 시각만 같은 다른 파일은 합치지 않는다. 완료/실패 결과는 캐시하지 않는다. 선택 레코드는 각각 유지하고, 취소/종료 시 대기 호출자를 해제하며 늦은 파싱 결과가 캡션이나 새 root에 반영되지 않게 한다. 원래 파서 자체에 취소 API는 없어 이미 시작한 최대 두 작업은 끝날 수 있다. 이는 사이트 업로드를 취소/완료했다는 뜻이 아니다.

### 계측의 ESM 연결

`docs/source/performance/metrics.mjs`의 `createPerformanceMetrics({environment})`를 추가했다. 기본 OFF이며 명시적으로 켜야 허용된 수치만 집계한다. 지표별 완료 표본 512개, 개인 값/저장소/네트워크 미사용이라는 원본 계약을 보존했다.

검색/reader/업로드 factory 및 `createIconReader`에 선택적 `metrics`를 주입한다. product ESM은 `AruPerformance` 전역을 읽지 않는다. 기존 진단 API의 단일 인스턴스 등록은 `compat/performance-api.mjs`에서만 수행하고 기존 실행 entry에 연결했다. Hybrid의 IIFE prelude나 Manifest 스크립트 추가를 복사하지 않았으므로 두 Manifest는 기준과 바이트 동일하다. 기본 기능·계측 양쪽을 검증했다.

## 4. 동등성 근거와 중복 제외

- 네 Hybrid 모듈의 최적화 알고리즘을 동결한 작업본과 AST로 비교한다. namespace를 명시적 주입으로 바꾼 경계와 위 PR #1 조건 외에는 같음을 검증했다. 원본은 `4d871f7` 이후 **미커밋 작업본**이며 커밋된 성과로 잘못 표시하지 않는다. 파일별 SHA와 frozen source를 보관했다.
- Hybrid의 테스트 12개에서 assertion/기대값은 유지했다. 옛 Git 객체를 `git show`로 읽던 harness만 동일 바이트·SHA의 fixture로 바꿨다. Git이 PATH에 없는 환경에서도 12개가 통과하므로 shallow checkout의 객체 누락에 의존하지 않는다.
- 모바일 최초 초점·반응형 UI·IME/태그 필터·실수집 로딩, 통합팩 검색/구성, 태그 codec/plan/Selection, 메타데이터·작성기·출처 매칭의 기존 기능은 ESM 기준에 이미 있어 다시 적용하지 않았다.
- PR #1의 복구 tree와 로컬 a6087a7이 같으므로 복구 커밋을 통째로 적용하지 않았다. PR #2도 이미 기준의 조상이므로 중복 적용하지 않았다.
- Android 로컬의 옛 버전 증가와 레거시 캐시/옵션 추가는 최신 구조와 중복/구버전이므로 제외했다.
- Hybrid가 생성한 JavaScript·브라우저 복사본·Manifest·빌드 도구를 덮어쓰지 않았다. ESM 원본을 이식한 뒤 이 브랜치의 빌드로 생성했다. 측정용 빌드/검증 역할은 기존 ESM 파이프라인으로 흡수했다. 옛 패키징/ZIP 생성 도구는 통합 검증에 실행하지 않았다.
- `tools/benchmark-integration.mjs`는 같은 합성 비교 도구를 ESM·명명한 main 함수로 정리하고 기준을 402cf68로 고정했다. 과거 측정치를 새 형상의 성능이라고 복사하지 않았다.

## 5. 충돌 해결과 보류

PR #1과 Hybrid는 library-reader/search의 같은 파일을 고친다. 두 버전 중 하나를 선택하지 않고 **처리 상태**와 **최적화/계측** 변경을 함께 이식했다. AST 허용 차이·부분 처리 재시도·결과 순서 동등성으로 결합을 검증했다.

브라우저 로드 방식은 기존 ESM runtime을 우선해 Manifest를 보존했다. MAIN/ISOLATED, 초기화 순서, codec/HTML, 기존 ID·설정 키·unknown 필드·이벤트 이름/응답 동기성은 변경하지 않았다. 여러 기능을 연결하는 현재 class/API를 다시 작성하거나 파일 이동하지 않았다. 주석은 목적·보존 규칙 중심 한국어로 정리했다.

상위 저장소의 구형 모바일 자동 삽입·ID/패키징 대안, 새 Native callback/서버 File ID 연동, 실제 사이트 동작을 바꾸는 추정 수정은 보류했다. 기존 안전 대응을 덮어쓸 근거가 부족하기 때문이다. 증분 인덱싱·IDB batching·공유 영구 파일 캐시 등은 원본 Hybrid에서도 구현되지 않은 제안이므로 완료 성과로 취급하지 않았다.

## 6. 검증 결과

환경: Node 24.15.0 / npm 11.12.1, Windows. 실행 로그는 ignored `docs/results/integration/`, 요약과 SHA는 tracked 검증 JSON에 있다.

| 항목 | 기준 / 통합 결과 |
|---|---|
| ESM 단위·동등성 | 기준 51 / 통합 **51 통과**, 실패 0 |
| 통합 직접 계약 | **4 통과**: AST·계측 oracle·전역 없는 주입·NORMAL 재시도 |
| 격리 회귀 | 기준 94 / 통합 **111 통과**, 실패 0. 기존 94 + PR #1 5 + Hybrid 12 |
| RC3 공통 5파일 suite | 원래 공개 작업 트리 **59 통과**, 통합 형상에서도 **59 통과** |
| Hybrid suite | 기존 미커밋 작업 트리 **106 통과**. 이 중 12개 최적화 검증을 통합 111개에 포함 |
| Historical | 전후 동일 **193 통과 / 94 실패**, 새 실패 이름 없음 |
| 빌드·생성 재현성 | 통과. 전체 브라우저 파일 반복 빌드 hash 동일 |
| Manifest·JS·vendor·공통 출력 | 통과. 두 Manifest·브라우저 버전·ID·권한 보존 |
| Firefox Lint | 오류 **0**, 기존 경고 **9**. strict 경고 통과라고 주장하지 않음 |
| IIFE·의존성 | 제품 원본 IIFE **0**, ESM **50**, 순환 **0**, namespace 위반 **0** |
| Git 없는 fixture 검증 | **12 통과**, assertion/기준 바이트 동일 |

`npm run test:esm`은 공유 생성물 경합을 막는 기존 직렬 실행 옵션을 유지한다. `npm test`는 확장된 회귀, `npm run test:integration`은 새 통합 계약이다. 제품 원본/HTML 인라인 감사는 `npm run audit:esm`, 생성본 일치는 `npm run verify:esm`이다. 생성 wrapper 68개, 기존 테스트 fixture/harness IIFE 5개와 제3자 30개는 제품 원본과 구분한다. 기존 Historical 실패를 숨기거나 기대값을 바꾸지 않았다.

### 독립 성능 비교

402cf68의 실제 생성 코드와 통합 생성 코드를 같은 Node/jsdom 합성 워크로드로 비교했다. warm-up 후 30표본이며 계측 OFF다. 브라우저 layout·미디어 decode·네트워크·Android 실기기·전체 heap 측정이 아니다.

| 합성 항목 | 기준 | 통합 |
|---|---:|---:|
| 에디터 밖 25개 leaf 교체 × 30회의 discover/reconcile/snapshot/UI discover | 각각 30회 | 각각 0회 |
| 동일 File 10개를 두 배치가 선택할 때 파싱 호출 / peak | 20 / 4 | 10 / 2 |
| 500개 레코드 matching 평균 | 45.122ms | 0.887ms |
| 17그룹 1,548아이콘 전체 구성 평균 | 412.357ms | 54.245ms |

실제 observer 콜백 자체를 없앴다고 주장하지 않는다. 모의 캐시 요청 수 180과 적중률 50%는 그대로며 I/O 감소를 주장하지 않는다. 인덱스가 참조를 추가하므로 메모리 절감률도 제시하지 않는다. 측정 요약과 범위는 검증 JSON에 남겼다. 재현 명령은 `npm run benchmark:integration -- baseline`, `npm run benchmark:integration -- current`이며 baseline 측정에는 402cf68 Git 객체가 필요하다.

## 7. 실제 브라우저 E2E와 사이트 관찰

기존 독립 harness를 `tools/test-esm-browser.py`로 재사용해 **통합 Worktree의 생성 확장**을 새 테스트 프로필에 설치했다. 원본 배포 ZIP이나 과거 PR 후보를 테스트한 것이 아니다. 개인 프로필·인증을 쓰지 않고 서버 변경 요청을 차단했다.

| 브라우저 | 엔진 | 실제 확장·옵션 | 통제 DOM/API fixture | 실제 익명 사이트 |
|---|---|---:|---:|---|
| firefox | 158.0 | 4 PASS | 7 PASS | 4 PASS / 4 BLOCKED |
| chromium | 156.0.8078.4 | 4 PASS | 7 PASS | 5 PASS / 4 BLOCKED |
| whale | 150.0.7871.252 | 4 PASS | 7 PASS | 5 PASS / 4 BLOCKED |

확장 로드·실제 옵션 저장·Content 초기화, 태그 수집/검색/필터/초기화, 아이콘 삽입 브리지, 동적 작성기·페이지 이동 재초기화, MAIN 태그 ADD/REMOVE/REPLACE·no-op·ID·비대상·serializer·IMAGE_CHANGED가 통과했다. 업로드 순서/파싱/취소는 별도 합성 Controller 및 두 기존 content adapter 테스트이며 실제 서버 업로드 성공을 의미하지 않는다.

익명 실제 공개 게시판과 공개 게시글의 본문/이미지를 읽었다. 과거 5039 본문 부재, 익명 작성기 진입점, 관측 글의 저장 태그 부재, 로그인 작성기 부재는 BLOCKED로 기록했다. Firefox에서 Chromium과 같은 상세 script 목록 관찰을 수행했다고 표시하지 않았다. 각 raw report·브라우저 버전·PASS/BLOCKED 항목은 검증 JSON에 있다. 실제 사이트 결과를 MOCK 성공으로 대체하지 않았다.

## 8. 보호와 남은 미통합 검증

네 원본 작업 트리의 **1,024개 파일**과 HEAD·미커밋 상태가 시작 해시와 같다. 추가 조사한 상위 레거시의 8개 수정 파일도 종전 보호 snapshot과 같다. 기존 배포 **ZIP/XPI 201개**는 같은 해시다. 기존 모든 로컬 ref와 원격 branch/tag/PR ref를 보존했고, 추가한 것은 로컬 `integration/aru-unified`뿐이다. GitHub PR/리뷰/CI 설정을 변경하지 않았다. 기존 작업을 reset·checkout·stage·commit하지 않았다.

실제 Android의 선택 File → 서버 미디어 → 저장 HTML 대응, 로그인 작성기/undo/서버 게시·저장, Native Host·다운로드 파일 생성, 최소 지원 버전, 장시간 실제 heap은 미검증이다. 외부 WXT 개인 포크도 미제공이다. 이 남은 항목 때문에 통합 로컬 형상을 스토어 배포 준비 완료라고 부르지 않는다.

WXT에서는 기존 entry에 필요한 ESM과 선택적 metrics 인스턴스를 import/주입한다. 이미 있는 UI/Controller를 중복 설치하지 않고 MAIN/ISOLATED·문자열 이벤트·동기 응답·클래스 인스턴스·브라우저 API 차이를 보존해야 한다. 기존 `wxt.config.ts`, TypeScript·Manifest 생성·컴포넌트·formatter를 초기화하거나 이동하지 않는다. 상세 API는 [WXT 안내](esm-wxt-integration.md)를 따른다.

## 9. GitHub 반영 권장 순서

1. 이 통합 브랜치의 매트릭스·수동 이식 출처와 diff를 먼저 검토한다. PR #1은 기능적으로 반영했지만 Git 조상으로 Merge한 것이 아니므로 Git 이력만 보고 다시 적용하지 않는다.
2. PR #2 기반과 PR #3 ESM은 이미 포함됐음을 확인한다. 옛 PR들을 main에 순서대로 Merge해 같은 기능을 중복 적용하지 않는다. 기존 PR의 정리/대체 여부는 저장소 담당자가 판단한다.
3. WXT 실제 포크를 받은 뒤 이 공통 ESM과 중복 기능/entry를 비교하고 별도 통합한다. 두 개발 형상의 충돌을 확인하지 않고 무충돌이라고 단정하지 않는다.
4. 향후 별도 승인 시 통합 브랜치를 공개하고 새 검토 단위에서 기본 회귀뿐 아니라 ESM·통합 계약·브라우저 검증과 CI를 수행한다. **이번에는 Push·PR 생성·원격 CI를 실행하지 않았다.**
5. Android/Native/로그인 작성기 등의 남은 검증 후 저장소 담당자가 하나의 통합 형상을 main에 반영한다. 실제 Merge·릴리스·스토어 배포는 이 작업 범위가 아니다.
