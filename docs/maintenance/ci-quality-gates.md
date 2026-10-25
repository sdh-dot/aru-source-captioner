# PR 품질 Gate와 기준선 정책

R04는 PR #6의 `50a64edae5a73fe6269367545b178656fbfdf5ee`를 기준으로 CI 누락을 보완한다.
제품/기존 테스트/Fixture는 변경하지 않는다. A01/A02/F01/R01/R02/R03은 별도 미병합 작업이다.

## 필수 실행

`.github/workflows/ci.yml`의 기존 `build-and-test` job을 유지한다. `main` push와
`pull_request`에서 아래 명령을 직렬 실행한다.

1. `npm ci --ignore-scripts`, `npm run prepare:wxt`
2. 타입·Lint·포맷 및 `tools/ci/quality-gates.test.mjs`
3. `test:typescript`, `test:esm`, `test:integration`, `npm test`, RC3 5개 suite
4. `npm run build` 한 번으로 classic·Firefox·Chromium·Whale 생성
5. `verify`, `verify:wxt`, `verify:typescript`, `verify:esm`, `audit:esm`
6. tracked 변경과 untracked 출력에 대한 생성물 drift 검사
7. Historical 고정 기준선 비교와 Firefox Lint 경고 비교

ESM suite 내부 재생성 검사는 기존 assertion의 일부이므로 제거하지 않는다. 별도 WXT
browser matrix로 같은 빌드를 중복 실행하지 않는다. 직접 TypeScript 테스트는 현재
60개이며 미병합 작업의 테스트가 이미 실행됐다고 간주하지 않는다. 향후 통합된
`tests/typescript/*.test.ts`는 기존 명령이 자동 수집한다.

## 실패·미실행

`tools/ci/run-command.mjs`는 명령 exit와 테스트 summary를 확인한다. 단순 exit 0이나
0개 테스트로 통과시키지 않는다. 결과는 `docs/results/ci-quality/steps/`에 기록한다.
install 때 새 run ID를 만들며 이전 실행의 결과를 재사용하지 않는다.

`report.mjs`는 `always()`에서 미실행을 `NOT RUN`으로 표시한다. 필수 단계 실패·누락·
불완전 결과는 집계 exit 1이다. `continue-on-error`는 사용하지 않는다.

## Historical: raw FAIL과 비교 Gate 구분

`npm run test:historical`과 원래 assertion/Fixture는 그대로 실행한다. Node reporter는
테스트 identity와 summary를 수집하며 원래 exit 1을 성공으로 바꾸지 않는다.

로컬의 과거 외부 비교 자료가 있는 환경은 193 PASS / 94 FAIL이다. 공개 checkout만
있으면 다음 자료가 없어 191 PASS / 96 FAIL이다. 추가 두 실패는 다음 검사다.

- `new icon styling is scoped, noninteractive and never overrides grid dimensions or palette`
- `old r2 BUNDLE reader marker re-reads VIDEO tags; version 2 cache reuse preserves 4998 17 groups and 1548 icons`

CI는 비공개 외부 파일을 복사하거나 Fixture를 바꾸지 않는다. 고정 기준 커밋과 현재
tracked 파일을 각각 독립 public-only 경로에 준비하고, 동일 lockfile/Node/의존성으로
실행한다. `baseline.json`에는 기준의 287개 identity와 96개 실패를 동결했다.

기준 실행 자체가 카탈로그와 달라지면 실패한다. 후보에 새로운 실패·같은 개수의
다른 실패·기존 실패 제거·기존 검사 누락·skip/cancel/todo가 있어도 검토 전 통과하지
않는다. 기존 검사를 보존한 새 정상 검사는 허용한다.

비교가 맞아도 Historical suite는 **FAIL**이며 단계는 **KNOWN_FAILURES**다.
기존 94건과 환경 제약 2건, raw exit 1을 요약·artifact에 구분해 남긴다. 비교 Gate의
통과를 Historical 테스트 통과로 해석하지 않는다.

## Firefox Lint

기존 addons-linter의 JSON 출력만 사용한다. Lint 규칙/심각도는 변경하지 않는다.
오류 0개와 기존 경고 9개의 code/message/file/line/column 다중집합을 비교한다.
경고 수가 같아도 identity가 바뀌면 실패한다. 단순 줄 이동도 보수적으로 baseline
drift로 중단하므로, 후속 코드 통합에서 원인을 확인하고 기준선을 별도 검토해야 한다.
일치 결과는 **KNOWN_WARNINGS**이며 경고 없음이라는 뜻이 아니다.

## 기준선 갱신

자동 승인/갱신 옵션은 제공하지 않는다. 실패가 해결됐거나 의존성/Node/경고 위치가
바뀐 경우 새 reference의 원인과 결과를 검토하고 다음 항목을 함께 갱신한다.

- `baseline-gates.mjs`의 reference commit과 `baseline.json`의 commit/lockfile/identity
- public-only 환경의 실패 분류, 경고 위치, 관련 비교 테스트와 요약 문구
- 기존 raw 결과·신규 결과·변경 이유의 증적

신규 실패를 기준선에 추가해 CI를 녹색으로 만드는 용도로 사용하지 않는다. 테스트
파일·기대값·Fixture를 바꾸는 작업은 별도 기능 승인/검증 범위다.

## 권한·증적·실행 계층

Actions 권한은 `contents: read`만 유지하고 checkout credential을 남기지 않는다.
action SHA를 고정하며 `pull_request_target`·secrets·로그인·업로드·개인 프로필은 사용하지
않는다. 로그·JSON·Markdown 요약만 artifact로 7일 보존한다. 임시 baseline·node_modules·
프로필은 artifact 경로 밖에 두고 공유 의존성 링크를 분리한 뒤 직접 만든 temp만 정리한다.

브라우저 MOCK E2E는 별도 opt-in/정기/릴리스 전 계층을 권장한다. 실제 로그인 작성기·
SITE·Android·Native Host는 사용자 승인 검증이다. 이번 일반 PR CI에는 추가하지 않았다.

Workflow만으로 GitHub branch protection이 설정되지는 않는다. 원격 승인 후
`build-and-test` required check, Ubuntu 결과, fork PR 권한, cache, artifact/summary와
실패 전파를 확인해야 한다. 로컬 재현 성공을 실제 Actions 성공으로 보고하지 않는다.
