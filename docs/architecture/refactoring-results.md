# 코드 품질 점검 및 안전한 개선 결과

2026-10-17, Asia/Seoul. 기준 `b1c22e71537a0151999d136d8105eb0d0696790f`, 별도 로컬 브랜치 `refactor/wxt-code-quality`, Worktree `wxt-code-quality`. [감사](code-quality-audit.md)와 [개선 설계](refactoring-design.md)의 **적용한 부분만** 기록한다. 원격 Push·PR 수정·Merge는 수행하지 않는다.

## 1. 실제 적용과 전후 비교

| 단계 | 변경 전 | 변경 후 | 유지한 실행 계약 |
| --- | --- | --- | --- |
| 1 · Runtime/Picker 연결 | getter 결과가 any, 선택 export가 열린 문자열 레코드, Picker 연결 이름도 제한 없음 | generic ResolverMap/FactoryOptions, typed Pick export, readonly 이름 배열, Picker 유한 의존성 키·부분 주입 타입 및 Runtime 전체 연결 검사 | own 값 선행 조회, late getter, 클래스 identity·독립 scope·초기화 순서 |
| 2 · Content 입력/판독 결과 | status string과 선택적 URL을 공유, byte/선택 수/DOM helper의 any | 판독 전용 `ParsedSourceResult` union과 명시적 Promise 반환, Uint8Array·number·HTMLImageElement/Paragraph 타입 | Core의 cancelled는 기존 SourceResult로 유지. 파일명·exifr 우선순위·Firefox 전체 읽기·예외 및 sanitizer 그대로 |
| 3 · 목적 중심 주석 | Phase 2A/2B/2C 표기, 동작 반복/영어 catch 설명 | 출처 대응 보존, 설정 조회·갱신 수명, 미디어·보조 UI 실패 격리 설명 | 로그·이벤트 식별자와 실행문 그대로 |
| 문서 | 과거 ESM 분석 및 58개라는 이전 source 안내 | 현 TS/WXT 감사·설계·검증 보고, 실제 59개와 공통 파일명 모듈 안내 | 과거 보고서·Fixture·사용자 자료 보존 |

명시적 any는 AST 기준 555→546개, DynamicApi 참조는 95개 그대로다. 키 계약은 강화했지만 DynamicApi 값·환경 index·사이트/브라우저 포트 전체를 타입화한 것은 아니다. Picker 함수/DOM/상태를 다른 객체로 옮기거나 Content의 파싱 알고리즘을 합치지 않았다. 제품 원본은 전후 모두 59개 TS 파일이다.

## 2. 변경 파일과 커밋

1. `c1f4f583f04f50d260319c675fe62526e013f222` — `refactor: Runtime과 Picker 의존성 타입 계약 명시`
   - `src/runtime/contracts.ts`, `module-scope.ts`, `icons.ts`
   - `src/ruliweb-icons/picker-model.ts`, `picker.ts`
   - 신규 `tests/typescript/runtime-contracts.test.ts`
2. `175019a27fc0ed35e56496d0d615940b2d01aa2b` — `refactor: 출처 판독 결과와 DOM 입력 타입 명시`
   - `src/platform/{firefox,whale}/content.ts`, `src/upload-attribution/models.ts`
   - 위 타입 계약 테스트의 음성 사례 보강
3. `bf975540736f6b62342f1759489567c216081465` — `style: 과거 Phase 주석을 현재 보존 규칙으로 정리`
   - 두 Content·Picker 주석과 도구가 재생성한 대응 `docs/source/**/*.mjs` 3개
4. 이 문서 3개와 `src/README.md`는 별도 `docs:` 로컬 커밋. 최종 SHA는 Git log와 완료 보고에 기록한다.

알고리즘/저장 형식/설정/Manifest/World/엔트리포인트/Native Host·다운로드 원장은 수정하지 않았다. 기존 테스트 assertion·동결 Fixture·배포 ZIP/XPI도 수정하지 않았다.

## 3. 단계별 자동 검증

기준 환경과 **각 구현 단계 종료마다** 다음 표의 명령을 실행했다. Node 24.15.0 / npm 11.12.1, Windows. 공유 생성물 경합을 막는 기존 ESM 직렬 실행을 유지했다.

| 검사 | 기준 | 단계 1 | 단계 2 | 단계 3 |
| --- | --- | --- | --- | --- |
| typecheck·format:check·lint | PASS | PASS | PASS | PASS |
| TypeScript 직접 테스트 | 52/0 | 54/0 | 54/0 | 54/0 |
| ESM `test:esm` | 51/0 | 51/0 | 51/0 | 51/0 |
| 통합 `test:integration` | 4/0 | 4/0 | 4/0 | 4/0 |
| 회귀 `npm test` | 111/0 | 111/0 | 111/0 | 111/0 |
| RC3 공통 5파일 | 59/0 | 59/0 | 59/0 | 59/0 |
| build: classic + Firefox/Chrome/Whale WXT | PASS | PASS | PASS | PASS |
| verify·verify:wxt·verify:typescript·verify:esm | PASS | PASS | PASS | PASS |
| audit:esm: 관리 원본 IIFE/순환 | 0/0 | 0/0 | 0/0 | 0/0 |
| Historical: 통과/기존 실패 | 193/94 | 193/94 | 193/94 | 193/94 |
| Firefox classic Lint: 오류/기존 경고 | 0/9 | 0/9 | 0/9 | 0/9 |

`n/0`은 통과/실패다. Historical 명령의 종료 코드는 기존 실패 때문에 1이며 성공으로 바꾸지 않았다. 94개 실패 이름 집합과 Firefox 9개 경고 블록을 기준과 비교해 새 항목이 없음을 확인했다.

RC3 명령은 `node --test tests/publication.test.cjs tests/filename.test.cjs docs/tests/phase2b3/engine.test.cjs docs/tests/generator-r2/search.test.cjs docs/tests/bundle-generator/model.test.cjs`다. 별도 Hybrid 개인 작업 트리의 106개 suite는 이번에 실행하지 않았으며 해당 최적화/업로드 범위를 포함하는 현재 통합 회귀 111개를 검증했다.

신규 테스트 2개는 (1) eager/late 조회·클래스 identity·scope 독립·export 조회 시점, (2) 실제 프로젝트 compiler로 resolver 값/이름·선택 export·factory 공개 이름·판독 결과 모순을 거절하는지 확인한다. TypeScript의 `@ts-expect-error`가 실제 오류 없이 통과하면 테스트가 실패한다. 단순 transpile 성공을 타입 검사로 대신하지 않았다.

## 4. 실행 동등성과 E2E 범위

- 타입 단계 1·2는 `docs/source`, `shared`, `firefox`, `whale`의 추적 생성물이 기준과 동일했다. 새 로직이나 import 부작용은 없다.
- 주석 단계 3은 생성 ESM 3개만 주석이 달라졌다. 모든 변경 생성 파일을 기준과 Acorn AST로 비교해 위치·raw 표기 이외 실행 구문이 같음을 확인했다. 문장 순서·조건·상수·호출을 무시하는 정규화는 하지 않았다. classic Firefox/Whale 추적 출력은 바이트 동일하다.
- 각 단계의 **WXT 세 브라우저 출력 135개 전부가 기준 빌드와 SHA-256 동일**했다. Manifest·권한·ID·World·자원도 기존 검사를 통과했다.
- 따라서 이번 구현은 실행 동작에 영향을 주는 변경에 해당하지 않아 Firefox·Whale 실제 로그인·업로드 E2E를 **NOT RUN**으로 남겼다. 로그인을 요청하거나 승인 파일을 추가 업로드하지 않았다. MOCK 브라우저 E2E도 새로 실행한 것으로 표시하지 않는다.
- 기존 [MULTI-01 실제 업로드 보고서](../testing/user-acceptance/multi-01-fix-report.md)의 14개 파일·역전 완료·중복 방지 검증은 보존 근거다. 해당 결과를 이번 새 실제 사이트 PASS로 재분류하지 않았다. 기존 파일명/메타데이터 우선순위·버퍼 경계 테스트 44개는 TypeScript 54개에 포함해 모두 재실행했다.

## 5. 미해결 위험과 후속 작업

1. **P1: artwork_id 비문자열 예외.** 양쪽 PNG 후보 함수에서 숫자/객체의 `.trim()` TypeError를 재현했다. 신규 회귀가 아닌 기준 코드의 외부 입력 처리 문제다. 숫자 허용/거절 정책을 정한 뒤 D01의 검증을 수행해야 한다. 이번 타입 강화가 런타임 payload 검증을 해결한 것은 아니다.
2. **P1: Picker·installer 수명.** Picker 자원 해제의 예외 격리, Content 반복 설치·문서 복원·전체 disposer는 설계만 했다. 실제 장애 재현과 API/이벤트 검증 없이 재작성하지 않았다.
3. **P2: 동적 포트·파싱 중복.** Runtime의 다른 namespace와 resolver 값, byte carrier, Registry snapshot, 다운로드·Native 포트 타입이 남는다. 동일 함수 본문만으로 closure·브라우저 정책까지 공통화하지 않는다.
4. 대용량 exifr 전체 읽기·Android·Native Host·장시간 MV3 중단/재시작·실제 실패 재시도·classic 전체 실제 업로드는 미검증이다. 기존 Whale storage fallback 원인도 이번에 해결하지 않았다.
5. 이번 브랜치는 외부 WXT 개발자의 이후 변경과 병합 검증하지 않았다. Runtime/Picker/Content를 동시에 크게 옮기는 변경은 피하고 [설계의 우선순위](refactoring-design.md)대로 독립 적용한다.

## 6. 근거 보존과 Git 보호

로컬 실행 근거는 작업공간 `tmp/aru-code-quality-20261017/`의 `baseline/`, `stage1/`, `stage2/`, `stage3/` 로그·gate JSON, `inventory*.json`, `content-comparison.json`, `baseline-outputs.json`에 있다. 로그/인벤토리의 수량만으로 제품 기능을 증명하지 않으며 재현한 입력과 검사 범위를 위에 구분했다. 인증·업로드 본문·사용자 이미지 사본은 수집하거나 커밋하지 않았다.

보호 검사에서 새 분석 브랜치를 제외한 기존 9개 Worktree의 HEAD·상태·추적/미추적 파일 3,576개 해시, 기존 ZIP/XPI 201개, 원격 ref·PR #1~#6의 메타데이터가 시작 스냅샷과 같았다. 기존 dirty 작업을 초기화하거나 숨기지 않았다. 결과는 `protection-final.json`에 보존한다. 새 브랜치의 검증된 변경만 로컬 커밋하며 원격 Push·PR 생성/수정·댓글·리뷰·외부 메시지·Merge·배포는 하지 않는다.
