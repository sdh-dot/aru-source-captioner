> 보존 기록: `chore/repository-cleanup`의 `282ff66f13d16ee7238d6070cb1983f58655e969`에서 선택적으로 가져왔다. 아래 수량·경로·미실행 사항은 당시 기준이며, 현재 TypeScript/WXT 구현과 검증은 [통합 보고서](../architecture/wxt-unification-report.md)를 따른다.

# 저장소 정리 보고서

2026-10-16. 정리 브랜치 `chore/repository-cleanup`, 별도 Worktree `repository-cleanup`. [소스 품질 검토](source-quality-review.md)와 [후속 계획](refactoring-plan.md)을 함께 제공한다. 코드는 변경하지 않고 문서 탐색·ignore 범위를 개선했다.

## 1. 기준과 작업 보호

- 기존 통합 Worktree: `integration/aru-unified`, `323a3fd471b82bc86cea3b252e2fec610370d244`, clean. 기존 작업 트리는 갱신하지 않았다.
- 조사 당시 최신 원격 통합: `183784c52be8916bc764626c6bbcbec104816eba`. 차이는 README 6줄의 최신 개발 브랜치 안내뿐이다. 이 커밋에서 별도 정리 브랜치를 생성했다. 자동 Merge/Cherry-pick은 하지 않았다.
- main: `1164afc3745d6af47e4e3fc750540963226f8355`. PR #1~#4와 외부 WXT PR [#5](https://github.com/sdh-dot/aru-source-captioner/pull/5)는 읽기 전용으로 확인했다. #5 HEAD는 `a8177040b90ea5e134a151d025cdc132b94c3eb0`, Base는 `refactor/esm-core-transition`이다.
- 원본 5개 Worktree의 HEAD·상태·파일별 해시와 기존 배포 ZIP/XPI 201개를 작업 전 기록했다. Hybrid·Android 미커밋 변경도 보존한다. 새 Worktree는 동일 lockfile의 기존 node_modules를 ignored junction으로 재사용하며 설치/업데이트하지 않는다.
- 기존 원격 ref·PR 상태를 종료 시 다시 대조한다. 이번 브랜치는 로컬 커밋만 허용되며 Push·PR 생성·Merge·배포는 하지 않는다.
- 프로젝트/상위 경로에 AGENTS.md·CODING_STANDARDS.md·GIT_COLLABORATION.md가 없다. 전역 AGENTS는 비어 있다. CONTRIBUTING·빌드/CI·PR 템플릿과 사용자의 한국어/최소 변경 원칙을 확인했다. 별도 SoT 초안은 pending 참조이며 정식 적용하지 않는다.

## 2. 수량과 실제 변경

| 구분 | 전 | 후 | 설명 |
| --- | ---: | ---: | --- |
| 추적 파일/커밋 대상 | 370 | 373 | 요청된 maintenance 문서 3개 추가 |
| docs 아래 추적 파일 | 208 | 211 | docs/source 124개 그대로 |
| Markdown | 30 | 33 | 새 보고서 포함 |
| 기존 파일 삭제·이동 | 0 | 0 | 안전성이 입증된 DELETE 없음 |
| 실제 문서 본문 통합 | 0 | 0 | 후보는 보존한 채 검토 목록만 작성 |
| 새 Worktree 시작 시 미추적 파일 | 0 | 0 | node_modules·검사 결과 등 ignored 실행 자료 제외 |

기존 추적 파일 수정은 README.md의 보고서 연결과 .gitignore의 범위/주석뿐이다. 제품 소스·생성 JS·Manifest·빌드/CI·테스트/Fixture·배포 파일은 바이트 그대로 유지한다. 단순히 파일 수를 줄이려고 문서를 삭제하지 않았다. 원본 통합 Worktree의 ignored docs/results에는 823개 파일(94,208,701 bytes)이 있으며 검증 근거·스크린샷·후보 패키지가 섞여 있어 읽기 전용으로만 조사했다. 새 Worktree에 복사하거나 원본에서 삭제하지 않았다.

삭제·이동 목록은 **없음**이다. 삭제 복구 작업도 필요하지 않다. 문서/ignore 변경은 이 로컬 커밋의 부모 revision에서 파일 내용을 확인해 해당 변경만 되돌릴 수 있다. 사용자 작업 트리를 reset/clean하거나 이력을 재작성하지 않는다.

## 3. docs 전체 구조와 용도

아래 수치는 정리 전 추적 파일이며 ignored 결과·의존성은 별도다. docs/results는 시작 시 새 Worktree에 없으며 검사가 만든 자료는 ignore한다.

| 디렉터리 | 파일 수 | 역할 |
| --- | ---: | --- |
| `docs` | 20 | 운영·검증 문서와 진단 ESM/출력 |
| `docs/architecture` | 9 | 전환·통합 설계 및 검증 근거 |
| `docs/demo` | 7 | 합성 UI 검증 입력 |
| `docs/demo/media` | 5 | 합성 UI 검증 입력 |
| `docs/evidence` | 3 | 합성/최소 공개 사실 Fixture |
| `docs/screenshots` | 3 | 추적된 문서용 검증 화면 |
| `docs/source/body-download` | 7 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/bundle-generator` | 14 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/compat` | 49 | 기존 공개 API·실행 World의 호환 경계 |
| `docs/source/icon-metadata` | 5 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/performance` | 2 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/platform/firefox` | 3 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/platform/whale` | 3 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/ruliweb-icons` | 34 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/runtime` | 3 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/source/upload-attribution` | 4 | 제품 ESM·정적 원본 및 빌드 중간 출력 |
| `docs/tests/bundle-generator` | 6 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/design-polish-rc1` | 2 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/generator-r2` | 5 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/icon-assets` | 2 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/metadata-reader` | 6 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/modal-headers` | 2 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/phase2b3` | 4 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/phase2b3-r2` | 1 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/phase2b3-r3` | 1 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/phase2b3-r4` | 1 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/picker-r3` | 1 | 역사적/현재 회귀 테스트·harness |
| `docs/tests/tag-display` | 5 | 역사적/현재 회귀 테스트·harness |
| `docs/tools` | 1 | 기존 결합 빌드의 실제 import 대상 |

## 4. 분류 기준과 7가지 확인

분류는 KEEP 357개, CONSOLIDATE 2개, ARCHIVE 11개, DELETE 0개다. ARCHIVE는 **현 위치에 보존하는 역사 분류**이며 이동 완료를 뜻하지 않는다. CONSOLIDATE도 후보일 뿐 현재 삭제/축약하지 않았다. 세 신규 maintenance 문서는 KEEP이다.

확인 항목: ① 소스/빌드 참조 ② 테스트/Fixture ③ README·PR·Issue 링크 ④ 유일한 결정 근거 ⑤ 재생성 ⑥ 협업 필요 ⑦ CI/빌드/배포 영향. 다음 표의 역할 코드가 아래 파일별 판단 근거다.

| 코드 | 역할·판정 근거 | ①②③ 참조·사용 | ④⑤ 근거·재생성 | ⑥⑦ 협업·삭제 영향 |
| --- | --- | --- | --- | --- |
| S1 | 제품 ESM·JSON·CSS·공통 API | import/빌드·테스트의 원본. docs/source는 정리 제외 | 관리 원본이며 재생성 가능한 쓰레기가 아님 | WXT import·기존 기능 필수, 삭제 금지 |
| G1 | 호환 JS·최종 브라우저 생성 JS | build-esm/결합 빌드·Manifest·harness 소비 | 재생성 가능하지만 현재 배포/중간 입력 계약 | 생성이라는 이유만으로 삭제하면 기존 경로 파손 |
| T1 | 테스트·harness | 기본 suite/Historical/직접 검증, 동적 glob 포함 | 기존 assertion·과거 실패 기준의 유일성 부정 못함 | 신규 회귀 구분에 필요, 삭제하면 검사 누락 |
| T2 | 동결·합성 Fixture | ESM baseline/계약 및 shallow checkout 검증 입력 | 원본 비교 바이트·SHA는 새 출력으로 대체 불가 | 재현에 필요, 삭제하면 테스트 실패 |
| E1 | docs/evidence 최소 근거 | tests/demo·문서에서 사용하는 합성/공개 사실 | 임의 수집으로 재생성하거나 실데이터로 교체 금지 | Fixture/공개 범위 근거, 보존 |
| E2 | 과거 Phase·공개/검증 기록 | Markdown/원격 링크 여부와 무관하게 당시 결정 기록 | 현재 결과와 중복으로 간주 못함; 당시 환경 재생성 보장 없음 | 역사적 실패·승인 범위 추적, 현 경로 보존 |
| C1 | 동일한 두 브라우저 아이콘 README | 두 플랫폼 경로에 중복 문서, 루트/빌드/검증 링크 | byte 동일; 역사 설명은 보존 필요 | 단일 안내+기존 경로 연결로 추후 통합 가능. 패키징/WXT 경로 영향 전 확인 |
| A1 | Manifest·HTML·CSS·에셋 | Manifest/HTML/CSS·다운로드 관리 탭 참조 | 추적 배포 입력, 자동 생성 여부 혼합 추정 금지 | 확장 ID/권한/화면·버전 보존, 삭제 금지 |
| A2 | 문서용 추적 screenshot | README·UI 검증 문서 참조 | 현재 환경 재촬영은 과거 화면 대체 증거 아님 | ignored E2E 일시 출력과 구분, 보존 |
| L1 | 라이선스·vendor·폰트 고지 | 확장 로드·무결성 검사·고지 | 제3자 원본과 변경 근거 | 중복 사본도 배포별 필요, 삭제 금지 |
| U1 | 빌드·검사·진단·패키징 도구 | package/CI/직접 실행/동적 import | 실제 재생성 절차이며 출력과 다름 | docs/tools 포함 필수 도구, 불확실한 도구도 보존 |
| D1 | 현재 운영·통합·권리 문서 | README/CONTRIBUTING·외부 PR 링크/개발자 참조 | 문서를 재생성 가능한 임시 출력으로 간주하지 않음 | 환경·배포·공개 범위 이해에 필요, 보존 |
| D2 | 합성 demo·미디어·진단 | jsdom/브라우저·수동 UI 검증 | 재현 입력/시각 비교 근거 | 테스트/개발 재현에 필요, 보존 |
| O1 | 루트 설정·잠금·GitHub 협업/CI | npm/CI·이슈·PR 템플릿·Git | 설정/lockfile은 검사 출력이 아님 | 환경 재현·협업 필수, 보존 |

①②는 정적 import·Manifest·출력 목록·테스트 실행 목록을 읽고 동적 경로 조립도 확인했다. 아래 로컬 참조 수는 Markdown 링크와 전체 경로 문자열의 **후보 파일 수**이며 0이 미사용 증명은 아니다. 원격은 조사 시 접근 가능한 GitHub issue/PR 5개 본문, issue 댓글 0개, inline review 댓글 0개에서 경로 문자열을 검색했다. 외부 포크 전체·비공개 채팅·과거 수정 전 PR 본문은 조사하지 않았다. 이런 한계가 있어 외부 참조 불명확 파일은 삭제하지 않는다.

## 5. gitignore 실제 개선

- docs/results는 기존에도 ignored였다. 테스트·모바일/통합 벤치마크·E2E가 실제 사용하는 경로이며 root anchored `/docs/results/`로 의도를 명시했다. 별도 screenshot 전체 ignore를 추가하지 않았다.
- 루트 dist/coverage/test-results와 profiles/browser-profiles/cache/tmp/temp를 root anchored로 한정했다. 기존 `cache/`·`tmp/`는 가상의 `docs/source/cache/model.mjs`·`docs/source/tmp/module.mjs`까지 숨기는 것을 check-ignore로 확인했다. 좁힌 규칙은 해당 제품 경로를 숨기지 않는다.
- 기존 로그/TAP·배포 압축 파일·비밀 파일·의존성 규칙은 유지했다. ZIP/XPI는 추적/삭제/수정하지 않는다. 새 임시 디렉터리나 미사용 도구를 만들기 위한 광범위한 추가 패턴도 없다.
- 이미 추적된 파일 중 ignore 대상은 정리 전 0개다. 인덱스 제거는 하지 않았다. 추적 Fixture·스크린샷·출력 JS·제품 원본이 새 규칙에 숨지 않는지 검사한다.

## 6. 링크·보존·중복 판정

정리 전 Markdown 30개의 로컬 inline/image 링크 57개는 모두 존재했다. README가 새 문서 3개를 연결하고 세 보고서는 상호 연결한다. 기존 문서 이동/URL 변경은 없다. GitHub blob/PR/Issue 등 외부 URL의 HTTP 유효성이나 모든 heading anchor를 로컬 파일 존재 검사만으로 증명하지 않는다. 소스 주석의 누락 경로는 [소스 검토](source-quality-review.md)에 별도로 기록했다.

바이트 동일 파일군은 40개다. JS compat/브라우저 사본·에셋·고지가 대부분이며 삭제 대상이 아니다. 두 아이콘 README는 CONSOLIDATE 후보로만 표시했다. docs/PUBLIC-FILES.md의 202개 목록은 최초 공개 스냅샷 기록으로 ARCHIVE 분류했으며 현 파일 수로 덮어쓰지 않았다. PUBLICATION·VALIDATION·모바일/업로드 결과·IIFE 전환 보고서와 JSON도 당시의 근거이므로 현 위치에 남겼다.

## 7. 검증 결과

검증 완료 후 실행 결과를 아래에 기록한다. 로그는 새 Worktree의 ignored docs/results/maintenance/에만 저장한다. 기존 결과를 덮어쓰지 않는다.

| 검사 | 실제 결과 |
| --- | --- |
| Markdown 로컬 링크 | 33개 Markdown, 로컬 링크 70개 모두 존재. 외부 HTTP/heading은 별도 미검증 |
| gitignore | 18개 허용/제외 사례 통과. 기존/신규 커밋 대상 373개 중 숨겨지는 파일 0개 |
| build | 통과. 호환 생성물 52개 변경 없음 |
| verify / Manifest | 통과, manifestReferences true, issues 없음 |
| test:esm | 51/51 통과 |
| test:integration | 4/4 통과 |
| npm test | 111/111 통과 |
| verify:esm | 통과, 생성물 변경 없음 |
| audit:esm | 제품 원본 IIFE 0개·ESM 50개·순환 0개·실패 없음 |
| Historical | 종료 코드 1: 기존과 동일한 193 통과/94 실패(287개). Worktree 경로·소요 시간을 정규화한 실패 이름 목록 동일, 신규 실패 없음 |
| Firefox Lint | 종료 코드 0: 오류 0·기존 경고 9. UNSAFE_VAR_ASSIGNMENT 코드 목록 동일 |
| 기존 파일 보호 | README·.gitignore 외 기존 368개 파일 SHA-256 동일 |
| 협업 보호 | 기존 Worktree 5개·파일 1394개, 배포 ZIP/XPI 201개 동일. 원격 ref·PR #1~#4 메타데이터 동일. PR #5는 updatedAt만 외부 갱신 관찰, HEAD/Base/상태 동일 |
| 브라우저 E2E·실 사이트 | 이번 문서/ignore 정리에서는 미실행. 이전 결과를 이번 실행으로 주장하지 않음 |

환경은 Windows, Node 24.15.0 / npm 11.12.1이다. 검사는 생성물을 공유하므로 순차 실행했다. 전체 빌드 후 원본/출력 해시가 그대로인 점과 verify:esm을 함께 확인했다. 삭제/이동이 없고 신규 실패도 없어 복구할 변경은 없다.

기존 370개 파일에 대한 분류·SHA와 GitHub 참조 조사 원문, 링크/ignore 검사 요약, Historical/Lint 비교, 보호 대조는 작업 전 생성한 로컬 임시 검토 폴더에 있다. 상세 테스트 로그는 ignored docs/results/maintenance/에 있으며 공개 커밋에는 간결한 결과와 재현 명령만 포함한다.

PR #5의 updatedAt은 조사 중 11:27:17Z → 11:41:45Z로 바뀌었다. 변경 원인은 이 작업에서 확인하지 않았으며 PR 수정 API는 호출하지 않았다. HEAD·Base·상태와 원격 ref는 동일했다. 시각까지 불변이었다고 보고하지 않는다.

## 8. 보류 및 다음 단계

- 실제 삭제·이동·문서 본문 통합: 근거 부족 또는 기존 링크/역사적 증거 보존 때문에 보류. 재생성 가능하다는 이유만으로 보존 필요성을 부정하지 않는다.
- 제품 소스/주석 수정: [우선순위·검증·WXT 충돌 계획](refactoring-plan.md)으로 먼저 정리했다. 신규 P0 결함은 확인하지 못했다.
- WXT: PR #5와 자동 통합하지 않았고 설정·엔트리포인트·Manifest·UI·검색/업로드 실행 경로를 수정하지 않았다. Runtime·content·picker 개선은 담당자와 범위를 합의한 뒤 별도로 진행한다.
- 원격 반영: 이 브랜치의 로컬 문서 커밋을 검토한 뒤 별도 승인 범위에서 판단한다. 현재 PR #1~#5 수정·원격 Push·PR 생성·Merge·배포는 하지 않는다.
- 다음 단계는 주석의 누락 출처 정정(Q1), 고정 태그 목록과 바이트 carrier의 동등성 조사(Q2/Q3), WXT 담당자와 실행 경계 합의다. 큰 파일 통째 이동·포맷팅·추상 계층 추가는 선행하지 않는다.

## 부록: 기존 추적 파일 전체 분류

파일 경로는 저장소 루트 기준이다. 각 행의 역할 코드는 위 7가지 확인 근거를 따른다. 원격 링크 수는 접근 가능한 본문에서 정확한 경로 문자열이 나타난 개수다. generated 경로도 추적 상태를 유지한다.

| 파일 | 분류 | 근거 코드 | 로컬 참조 후보 | 원격 경로 참조 |
| --- | --- | --- | ---: | ---: |
| `.gitattributes` | KEEP | O1 | 1 | 0 |
| `.github/CODEOWNERS` | KEEP | O1 | 1 | 0 |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | KEEP | O1 | 1 | 0 |
| `.github/ISSUE_TEMPLATE/config.yml` | KEEP | O1 | 1 | 0 |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | KEEP | O1 | 1 | 0 |
| `.github/PULL_REQUEST_TEMPLATE.md` | KEEP | D1 | 1 | 0 |
| `.github/workflows/ci.yml` | KEEP | O1 | 1 | 0 |
| `.gitignore` | KEEP | O1 | 1 | 0 |
| `CHANGELOG.md` | KEEP | D1 | 3 | 0 |
| `CONTRIBUTING.md` | KEEP | D1 | 6 | 0 |
| `LICENSE` | KEEP | L1 | 10 | 0 |
| `README.md` | KEEP | D1 | 5 | 0 |
| `SECURITY.md` | KEEP | D1 | 4 | 0 |
| `THIRD_PARTY_NOTICES.md` | KEEP | L1 | 8 | 0 |
| `docs/BUILD.md` | KEEP | D1 | 7 | 0 |
| `docs/CHARACTER-ASSET-PROVENANCE.json` | KEEP | D1 | 2 | 0 |
| `docs/CHARACTER-ASSETS-NOTICE.md` | KEEP | D1 | 3 | 0 |
| `docs/KNOWN-ISSUES.md` | KEEP | D1 | 1 | 1 |
| `docs/MANUAL-TESTING.md` | KEEP | D1 | 4 | 0 |
| `docs/MOBILE-MANUAL-TESTING.md` | KEEP | D1 | 2 | 1 |
| `docs/MOBILE-RESULTS.md` | ARCHIVE | E2 | 1 | 0 |
| `docs/MOBILE-TAGS-READONLY.js` | KEEP | G1 | 9 | 0 |
| `docs/MOBILE-TAGS-READONLY.mjs` | KEEP | D1 | 4 | 0 |
| `docs/MOBILE-TAGS.md` | KEEP | D1 | 1 | 0 |
| `docs/MOBILE-UI-REVIEW.md` | ARCHIVE | E2 | 0 | 0 |
| `docs/PUBLIC-FILES.md` | ARCHIVE | E2 | 0 | 0 |
| `docs/PUBLICATION.md` | ARCHIVE | E2 | 1 | 0 |
| `docs/READONLY-UPLOAD-DIAGNOSTIC.js` | KEEP | G1 | 7 | 0 |
| `docs/READONLY-UPLOAD-DIAGNOSTIC.mjs` | KEEP | D1 | 4 | 0 |
| `docs/UPLOAD-ATTRIBUTION-RESULTS.md` | ARCHIVE | E2 | 3 | 1 |
| `docs/UPLOAD-HISTORICAL-TESTS.md` | ARCHIVE | E2 | 1 | 0 |
| `docs/UPLOAD-MANUAL-TESTING.md` | KEEP | D1 | 1 | 1 |
| `docs/VALIDATION.md` | ARCHIVE | E2 | 4 | 0 |
| `docs/architecture/branch-integration-report.md` | KEEP | D1 | 5 | 1 |
| `docs/architecture/branch-integration-sources.json` | KEEP | D1 | 2 | 0 |
| `docs/architecture/branch-integration-validation.json` | KEEP | D1 | 1 | 0 |
| `docs/architecture/esm-completion-validation.json` | ARCHIVE | E2 | 2 | 1 |
| `docs/architecture/esm-iife-inventory.json` | KEEP | D1 | 5 | 0 |
| `docs/architecture/esm-validation.json` | ARCHIVE | E2 | 1 | 0 |
| `docs/architecture/esm-wxt-integration.md` | KEEP | D1 | 8 | 2 |
| `docs/architecture/iife-esm-completion-report.md` | ARCHIVE | E2 | 2 | 1 |
| `docs/architecture/iife-esm-transition-report.md` | ARCHIVE | E2 | 2 | 0 |
| `docs/demo/index.html` | KEEP | D2 | 5 | 0 |
| `docs/demo/media/sample-0.png` | KEEP | D2 | 1 | 0 |
| `docs/demo/media/sample-1.png` | KEEP | D2 | 1 | 0 |
| `docs/demo/media/sample-2.png` | KEEP | D2 | 1 | 0 |
| `docs/demo/media/sample-3.png` | KEEP | D2 | 1 | 0 |
| `docs/demo/media/sample-4.png` | KEEP | D2 | 1 | 0 |
| `docs/demo/mobile-preview.html` | KEEP | D2 | 0 | 0 |
| `docs/demo/upload-review.html` | KEEP | D2 | 0 | 0 |
| `docs/demo/upload-surfaces.css` | KEEP | D2 | 0 | 0 |
| `docs/demo/upload-surfaces.html` | KEEP | D2 | 0 | 0 |
| `docs/demo/upload-surfaces.js` | KEEP | G1 | 5 | 0 |
| `docs/demo/upload-surfaces.mjs` | KEEP | D2 | 6 | 0 |
| `docs/evidence/README.md` | KEEP | E1 | 1 | 0 |
| `docs/evidence/bundle-4998-state.json` | KEEP | E1 | 3 | 0 |
| `docs/evidence/search-98-user-summary.json` | KEEP | E1 | 2 | 0 |
| `docs/screenshots/icon-picker.jpg` | KEEP | A2 | 2 | 0 |
| `docs/screenshots/mobile-before-after.jpg` | KEEP | A2 | 1 | 0 |
| `docs/screenshots/upload-ui-review.png` | KEEP | A2 | 1 | 0 |
| `docs/source/body-download/background.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/body-download/browser-api.mjs` | KEEP | S1 | 10 | 0 |
| `docs/source/body-download/content.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/body-download/core.mjs` | KEEP | S1 | 11 | 0 |
| `docs/source/body-download/engine.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/body-download/extractor.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/body-download/ui.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/bundle-generator/bridge.js` | KEEP | G1 | 6 | 0 |
| `docs/source/bundle-generator/bridge.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/bundle-generator/client.js` | KEEP | G1 | 7 | 0 |
| `docs/source/bundle-generator/client.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/bundle-generator/controller.js` | KEEP | G1 | 6 | 0 |
| `docs/source/bundle-generator/controller.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/bundle-generator/core.js` | KEEP | G1 | 8 | 0 |
| `docs/source/bundle-generator/core.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/bundle-generator/search-ui.js` | KEEP | G1 | 6 | 0 |
| `docs/source/bundle-generator/search-ui.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/bundle-generator/search.js` | KEEP | G1 | 8 | 0 |
| `docs/source/bundle-generator/search.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/bundle-generator/ui.js` | KEEP | G1 | 6 | 0 |
| `docs/source/bundle-generator/ui.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/compat/attribute-tags.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/body-download-background.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/body-download-browser-api.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/body-download-content.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/body-download-core.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/body-download-engine.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/body-download-ui.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/browser-adapter.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/bundle-generator-bridge.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-client.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-controller.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-core.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-search-ui.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-search.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/bundle-generator-ui.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/composer-adapter.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/core.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/docs-MOBILE-TAGS-READONLY.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/docs-READONLY-UPLOAD-DIAGNOSTIC.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/docs-demo-upload-surfaces.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/icon-metadata-interface.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/metadata-editor-bridge.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/metadata-writer.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/compat/metadata.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/performance-api.mjs` | KEEP | S1 | 13 | 0 |
| `docs/source/compat/performance-metrics.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-firefox-background.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-firefox-content.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-firefox-options.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-whale-background.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-whale-content.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/platform-whale-options.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-background.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/compat/ruliweb-icons-catalog.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-composer-bridge.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/compat/ruliweb-icons-design-system.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-feature.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-library-reader.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/ruliweb-icons-library-search.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/ruliweb-icons-picker.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-registry.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/ruliweb-icons-ui-preferences.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/compat/runtime-bundle-main.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/runtime-bundle-ui.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/runtime-metadata-ui.mjs` | KEEP | S1 | 5 | 0 |
| `docs/source/compat/runtime-reader.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/compat/site-adapter.mjs` | KEEP | S1 | 3 | 0 |
| `docs/source/compat/upload-attribution-core.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/compat/upload-attribution-ui.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/icon-metadata/core.js` | KEEP | G1 | 8 | 0 |
| `docs/source/icon-metadata/editor-bridge.js` | KEEP | G1 | 4 | 0 |
| `docs/source/icon-metadata/interface.js` | KEEP | G1 | 6 | 0 |
| `docs/source/icon-metadata/interface.mjs` | KEEP | S1 | 8 | 0 |
| `docs/source/icon-metadata/metadata-editor-bridge.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/performance/metrics.js` | KEEP | G1 | 6 | 0 |
| `docs/source/performance/metrics.mjs` | KEEP | S1 | 17 | 0 |
| `docs/source/platform/firefox/background.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/platform/firefox/content.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/platform/firefox/options.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/platform/whale/background.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/platform/whale/content.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/platform/whale/options.mjs` | KEEP | S1 | 4 | 0 |
| `docs/source/ruliweb-icons/attribute-tags.js` | KEEP | G1 | 5 | 0 |
| `docs/source/ruliweb-icons/background.js` | KEEP | G1 | 6 | 0 |
| `docs/source/ruliweb-icons/background.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/ruliweb-icons/browser-adapter.js` | KEEP | G1 | 5 | 0 |
| `docs/source/ruliweb-icons/browser-adapter.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/ruliweb-icons/catalog.js` | KEEP | G1 | 6 | 0 |
| `docs/source/ruliweb-icons/catalog.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/ruliweb-icons/composer-adapter.js` | KEEP | G1 | 8 | 0 |
| `docs/source/ruliweb-icons/composer-adapter.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/ruliweb-icons/composer-bridge.js` | KEEP | G1 | 7 | 0 |
| `docs/source/ruliweb-icons/composer-bridge.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/ruliweb-icons/core.js` | KEEP | G1 | 8 | 0 |
| `docs/source/ruliweb-icons/core.mjs` | KEEP | S1 | 12 | 1 |
| `docs/source/ruliweb-icons/design-system.js` | KEEP | G1 | 15 | 0 |
| `docs/source/ruliweb-icons/design-system.mjs` | KEEP | S1 | 12 | 0 |
| `docs/source/ruliweb-icons/feature.js` | KEEP | G1 | 7 | 0 |
| `docs/source/ruliweb-icons/feature.mjs` | KEEP | S1 | 7 | 0 |
| `docs/source/ruliweb-icons/library-reader.js` | KEEP | G1 | 10 | 0 |
| `docs/source/ruliweb-icons/library-reader.mjs` | KEEP | S1 | 8 | 0 |
| `docs/source/ruliweb-icons/library-search.js` | KEEP | G1 | 12 | 0 |
| `docs/source/ruliweb-icons/library-search.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/ruliweb-icons/metadata-core.mjs` | KEEP | S1 | 14 | 0 |
| `docs/source/ruliweb-icons/metadata.js` | KEEP | G1 | 8 | 0 |
| `docs/source/ruliweb-icons/metadata.mjs` | KEEP | S1 | 16 | 0 |
| `docs/source/ruliweb-icons/pack-registry.json` | KEEP | S1 | 5 | 0 |
| `docs/source/ruliweb-icons/picker.js` | KEEP | G1 | 12 | 0 |
| `docs/source/ruliweb-icons/picker.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/ruliweb-icons/polish.css` | KEEP | S1 | 4 | 0 |
| `docs/source/ruliweb-icons/registry.js` | KEEP | G1 | 6 | 0 |
| `docs/source/ruliweb-icons/registry.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/ruliweb-icons/site-adapter.js` | KEEP | G1 | 6 | 0 |
| `docs/source/ruliweb-icons/site-adapter.mjs` | KEEP | S1 | 12 | 0 |
| `docs/source/ruliweb-icons/ui-preferences.js` | KEEP | G1 | 6 | 0 |
| `docs/source/ruliweb-icons/ui-preferences.mjs` | KEEP | S1 | 6 | 0 |
| `docs/source/runtime/downloads.mjs` | KEEP | S1 | 9 | 1 |
| `docs/source/runtime/icons.mjs` | KEEP | S1 | 14 | 1 |
| `docs/source/runtime/module-scope.mjs` | KEEP | S1 | 52 | 0 |
| `docs/source/upload-attribution/core.js` | KEEP | G1 | 13 | 0 |
| `docs/source/upload-attribution/core.mjs` | KEEP | S1 | 9 | 0 |
| `docs/source/upload-attribution/ui.js` | KEEP | G1 | 12 | 0 |
| `docs/source/upload-attribution/ui.mjs` | KEEP | S1 | 9 | 0 |
| `docs/tests/bundle-generator/diagnostic.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/bundle-generator/editor.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/bundle-generator/harness.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/bundle-generator/model.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/bundle-generator/source.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/bundle-generator/ui.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/design-polish-rc1/polish.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/design-polish-rc1/surfaces.js` | KEEP | T1 | 2 | 0 |
| `docs/tests/generator-r2/apply.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/generator-r2/harness.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/generator-r2/search-ui.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/generator-r2/search.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/generator-r2/tag-regression.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/icon-assets/assets.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/icon-assets/surfaces.js` | KEEP | T1 | 2 | 0 |
| `docs/tests/metadata-reader/cache-bundle.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/metadata-reader/harness.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/metadata-reader/integration.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/metadata-reader/performance.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/metadata-reader/preservation.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/metadata-reader/reader.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/modal-headers/headers.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/modal-headers/surfaces.js` | KEEP | T1 | 2 | 0 |
| `docs/tests/phase2b3-r2/ui.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/phase2b3-r3/ui.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/phase2b3-r4/flow.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/phase2b3/engine.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/phase2b3/harness.cjs` | KEEP | T1 | 4 | 0 |
| `docs/tests/phase2b3/media-design.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/phase2b3/reader.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/picker-r3/picker.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/tag-display/accuracy-ui.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/tag-display/cache.test.cjs` | KEEP | T1 | 2 | 0 |
| `docs/tests/tag-display/diagnostic.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/tag-display/harness.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tests/tag-display/native-integration.test.cjs` | KEEP | T1 | 3 | 0 |
| `docs/tools/build-generator.mjs` | KEEP | U1 | 10 | 0 |
| `docs/vendor-integrity.json` | KEEP | D1 | 4 | 0 |
| `firefox/assets/fonts/OFL.txt` | KEEP | L1 | 1 | 0 |
| `firefox/assets/fonts/PretendardVariable.woff2` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/aru-main-128.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/aru-main-16.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/aru-main-32.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/aru-main-48.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/aru-main-64.png` | KEEP | A1 | 2 | 0 |
| `firefox/assets/icons/editor-bundle-16.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-bundle-20.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-bundle-24.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-select-16.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-select-20.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-select-24.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-tags-16.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-tags-20.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-tags-24.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/editor-upload-16.png` | KEEP | A1 | 0 | 0 |
| `firefox/assets/icons/editor-upload-20.png` | KEEP | A1 | 0 | 0 |
| `firefox/assets/icons/editor-upload-24.png` | KEEP | A1 | 0 | 0 |
| `firefox/assets/icons/modal-bundle-256.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/modal-select-256.png` | KEEP | A1 | 1 | 0 |
| `firefox/assets/icons/modal-tags-256.png` | KEEP | A1 | 1 | 0 |
| `firefox/background.js` | KEEP | G1 | 7 | 0 |
| `firefox/content.js` | KEEP | G1 | 7 | 0 |
| `firefox/features/body-download/background.bundle.js` | KEEP | G1 | 5 | 0 |
| `firefox/features/body-download/browser-api.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/body-download/content.bundle.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/body-download/core.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/body-download/download.css` | KEEP | A1 | 1 | 0 |
| `firefox/features/body-download/download.html` | KEEP | A1 | 1 | 0 |
| `firefox/features/body-download/engine.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/body-download/ui.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/bundle-generator/bridge.bundle.js` | KEEP | G1 | 5 | 0 |
| `firefox/features/bundle-generator/content.bundle.js` | KEEP | G1 | 7 | 0 |
| `firefox/features/icon-metadata/bridge.bundle.js` | KEEP | G1 | 6 | 0 |
| `firefox/features/icon-metadata/content.bundle.js` | KEEP | G1 | 7 | 0 |
| `firefox/features/ruliweb-icons/README.md` | CONSOLIDATE | C1 | 1 | 0 |
| `firefox/features/ruliweb-icons/background.bundle.js` | KEEP | G1 | 3 | 0 |
| `firefox/features/ruliweb-icons/composer-bridge.js` | KEEP | G1 | 3 | 0 |
| `firefox/features/ruliweb-icons/content.bundle.js` | KEEP | G1 | 9 | 0 |
| `firefox/features/upload-attribution/core.js` | KEEP | G1 | 4 | 0 |
| `firefox/features/upload-attribution/ui.js` | KEEP | G1 | 4 | 0 |
| `firefox/icons/icon128.png` | KEEP | A1 | 1 | 0 |
| `firefox/icons/icon16.png` | KEEP | A1 | 1 | 0 |
| `firefox/icons/icon32.png` | KEEP | A1 | 1 | 0 |
| `firefox/icons/icon48.png` | KEEP | A1 | 1 | 0 |
| `firefox/lib/README.md` | KEEP | L1 | 1 | 0 |
| `firefox/lib/exifr.LICENSE` | KEEP | L1 | 1 | 0 |
| `firefox/lib/exifr.full.umd.js` | KEEP | L1 | 3 | 0 |
| `firefox/manifest.json` | KEEP | A1 | 9 | 0 |
| `firefox/options.css` | KEEP | A1 | 2 | 0 |
| `firefox/options.html` | KEEP | A1 | 2 | 0 |
| `firefox/options.js` | KEEP | G1 | 8 | 0 |
| `firefox/styles.css` | KEEP | A1 | 1 | 0 |
| `package-lock.json` | KEEP | O1 | 8 | 0 |
| `package.json` | KEEP | O1 | 8 | 0 |
| `shared/icon-metadata/README.md` | KEEP | S1 | 2 | 0 |
| `shared/icon-metadata/legacy-adapter.mjs` | KEEP | S1 | 6 | 0 |
| `shared/icon-metadata/tag-codec.mjs` | KEEP | S1 | 28 | 1 |
| `shared/icon-metadata/tag-edit-model.mjs` | KEEP | S1 | 16 | 1 |
| `tests/esm/build.test.mjs` | KEEP | T1 | 3 | 0 |
| `tests/esm/completion.test.mjs` | KEEP | T1 | 3 | 0 |
| `tests/esm/fixtures/completion-baseline.json` | KEEP | T2 | 1 | 0 |
| `tests/esm/fixtures/editor-check.js` | KEEP | T2 | 2 | 0 |
| `tests/esm/fixtures/editor.html` | KEEP | T2 | 1 | 0 |
| `tests/esm/fixtures/legacy.json` | KEEP | T2 | 1 | 0 |
| `tests/esm/fixtures/tag-cases.json` | KEEP | T2 | 1 | 0 |
| `tests/esm/modules.test.mjs` | KEEP | T1 | 3 | 0 |
| `tests/esm/tag-contract.test.mjs` | KEEP | T1 | 4 | 0 |
| `tests/filename.test.cjs` | KEEP | T1 | 3 | 0 |
| `tests/integration/baseline.cjs` | KEEP | T1 | 2 | 0 |
| `tests/integration/contracts.test.mjs` | KEEP | T1 | 3 | 0 |
| `tests/integration/fixtures/hybrid-source.json` | KEEP | T2 | 1 | 0 |
| `tests/integration/fixtures/original-baseline.json` | KEEP | T2 | 1 | 0 |
| `tests/loading-reader.test.cjs` | KEEP | T1 | 6 | 0 |
| `tests/mobile-tags.test.cjs` | KEEP | T1 | 4 | 0 |
| `tests/mobile-ui.test.cjs` | KEEP | T1 | 3 | 0 |
| `tests/optimization.test.cjs` | KEEP | T1 | 4 | 0 |
| `tests/performance.test.cjs` | KEEP | T1 | 4 | 0 |
| `tests/publication.test.cjs` | KEEP | T1 | 4 | 0 |
| `tests/upload-attribution.test.cjs` | KEEP | T1 | 3 | 0 |
| `tools/audit-esm.mjs` | KEEP | U1 | 6 | 0 |
| `tools/benchmark-integration.mjs` | KEEP | U1 | 4 | 0 |
| `tools/benchmark-mobile.mjs` | KEEP | U1 | 2 | 0 |
| `tools/build-esm.mjs` | KEEP | U1 | 77 | 0 |
| `tools/build.mjs` | KEEP | U1 | 13 | 0 |
| `tools/create-placeholders.mjs` | KEEP | U1 | 4 | 0 |
| `tools/esm-completion-entries.json` | KEEP | U1 | 6 | 1 |
| `tools/esm-runtime-entries.json` | KEEP | U1 | 4 | 1 |
| `tools/package.mjs` | KEEP | U1 | 3 | 0 |
| `tools/test-esm-browser.py` | KEEP | U1 | 4 | 0 |
| `tools/test-historical.mjs` | KEEP | U1 | 3 | 0 |
| `tools/test.mjs` | KEEP | U1 | 6 | 0 |
| `tools/verify.mjs` | KEEP | U1 | 5 | 0 |
| `whale/assets/fonts/OFL.txt` | KEEP | L1 | 2 | 0 |
| `whale/assets/fonts/PretendardVariable.woff2` | KEEP | A1 | 3 | 0 |
| `whale/assets/icons/aru-main-128.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/aru-main-16.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/aru-main-32.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/aru-main-48.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/aru-main-64.png` | KEEP | A1 | 2 | 0 |
| `whale/assets/icons/editor-bundle-16.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-bundle-20.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-bundle-24.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-select-16.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-select-20.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-select-24.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-tags-16.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-tags-20.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-tags-24.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/editor-upload-16.png` | KEEP | A1 | 0 | 0 |
| `whale/assets/icons/editor-upload-20.png` | KEEP | A1 | 0 | 0 |
| `whale/assets/icons/editor-upload-24.png` | KEEP | A1 | 0 | 0 |
| `whale/assets/icons/modal-bundle-256.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/modal-select-256.png` | KEEP | A1 | 1 | 0 |
| `whale/assets/icons/modal-tags-256.png` | KEEP | A1 | 1 | 0 |
| `whale/background.js` | KEEP | G1 | 6 | 0 |
| `whale/content.js` | KEEP | G1 | 8 | 0 |
| `whale/features/body-download/background.bundle.js` | KEEP | G1 | 5 | 0 |
| `whale/features/body-download/browser-api.js` | KEEP | G1 | 6 | 0 |
| `whale/features/body-download/content.bundle.js` | KEEP | G1 | 5 | 0 |
| `whale/features/body-download/core.js` | KEEP | G1 | 6 | 0 |
| `whale/features/body-download/download.css` | KEEP | A1 | 1 | 0 |
| `whale/features/body-download/download.html` | KEEP | A1 | 1 | 0 |
| `whale/features/body-download/engine.js` | KEEP | G1 | 6 | 0 |
| `whale/features/body-download/ui.js` | KEEP | G1 | 6 | 0 |
| `whale/features/bundle-generator/bridge.bundle.js` | KEEP | G1 | 6 | 0 |
| `whale/features/bundle-generator/content.bundle.js` | KEEP | G1 | 15 | 0 |
| `whale/features/icon-metadata/bridge.bundle.js` | KEEP | G1 | 4 | 0 |
| `whale/features/icon-metadata/content.bundle.js` | KEEP | G1 | 14 | 0 |
| `whale/features/ruliweb-icons/README.md` | CONSOLIDATE | C1 | 1 | 0 |
| `whale/features/ruliweb-icons/background.bundle.js` | KEEP | G1 | 3 | 0 |
| `whale/features/ruliweb-icons/composer-bridge.js` | KEEP | G1 | 4 | 0 |
| `whale/features/ruliweb-icons/content.bundle.js` | KEEP | G1 | 8 | 0 |
| `whale/features/upload-attribution/core.js` | KEEP | G1 | 4 | 0 |
| `whale/features/upload-attribution/ui.js` | KEEP | G1 | 4 | 0 |
| `whale/icons/icon128.png` | KEEP | A1 | 1 | 0 |
| `whale/icons/icon16.png` | KEEP | A1 | 1 | 0 |
| `whale/icons/icon32.png` | KEEP | A1 | 1 | 0 |
| `whale/icons/icon48.png` | KEEP | A1 | 1 | 0 |
| `whale/lib/README.md` | KEEP | L1 | 1 | 0 |
| `whale/lib/exifr.LICENSE` | KEEP | L1 | 2 | 0 |
| `whale/lib/exifr.full.umd.js` | KEEP | L1 | 4 | 0 |
| `whale/manifest.json` | KEEP | A1 | 6 | 0 |
| `whale/options.css` | KEEP | A1 | 2 | 0 |
| `whale/options.html` | KEEP | A1 | 4 | 0 |
| `whale/options.js` | KEEP | G1 | 7 | 0 |
| `whale/styles.css` | KEEP | A1 | 1 | 0 |
