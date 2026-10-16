> 보존 기록: `chore/repository-cleanup`의 `282ff66f13d16ee7238d6070cb1983f58655e969`에서 선택적으로 가져왔다. 아래 수량·경로·미실행 사항은 당시 기준이며, 현재 TypeScript/WXT 구현과 검증은 [통합 보고서](../architecture/wxt-unification-report.md)를 따른다.

# 협업 소스 품질 개선 계획

2026-10-16. [소스 검토](source-quality-review.md)의 관찰에 기반한 후속 계획이다. 이번 정리 브랜치에서는 제품 소스를 수정하지 않았다. 아래 범위는 실행 완료나 WXT 통합 승인을 의미하지 않는다. 기존 기능·데이터·이벤트 계약과 외부 개발자의 작업이 우선이다.

## 우선순위와 시행 순서

P0은 다음 변경의 정합성 수락 조건, P1은 흐름 추적, P2는 중복·추상화, P3은 주석·표현 개선이다. 확인된 신규 P0 결함은 없다. 테스트 실패를 숨기거나 기존 기대값을 새 구현에 맞추는 방식은 사용하지 않는다.

권장 순서는 **경계/수락 조건 확인 → 주석 정정 → 작은 순수 로직 후보 → Runtime 주입 → UI 수명 → 브라우저 파싱/MAIN 검토**다. 우선순위가 높더라도 큰 파일 전체를 먼저 옮기지 않는다.

## 항목별 변경 계약

| ID·우선순위 | 대상 파일·함수 | 문제·개선 이유 | 구체적인 방법·예상 변경 파일 | 기존 기능 영향·테스트 | WXT 충돌 |
| --- | --- | --- | --- | --- | --- |
| Q0 · P0 | `shared/icon-metadata/tag-edit-model.mjs:plan`; `icon-metadata/metadata-editor-bridge.mjs:apply`; `bundle-generator/bridge.mjs:apply` | 데이터·history 보존을 리팩터링 중 훼손할 위험 | 코드 변경 전에 현재 예외·no-op 원문·미선택 ID·unknown 필드·실패 복원·이벤트 순서를 기존 테스트와 대조. 빠진 실제 위험 사례만 해당 테스트에 추가 | API·오류·직렬화 결과가 같아야 함. ESM 51·통합 계약·MAIN fixture E2E·수동 undo/저장 HTML 확인. 불일치 시 추출 중단 | 중간~높음. MAIN과 content entry는 WXT 담당자와 경계 합의 필요 |
| Q1 · P3 | `platform/{firefox,whale}/content.mjs:15,22`; `library-reader.mjs`; `bundle-generator/core.mjs` 주석 | 의미 없는 단계 표기, 누락된 정책 문서 경로, 중요한 영어 제약 설명 | 제품 알고리즘을 건드리지 않고 주석만 목적·보존 규칙·외부 의존성 중심 한국어로 정정. 정책 출처가 불명확한 문구는 추정 링크 대신 미확인으로 기록. 해당 4개 원본과 빌드 결과만 검토 | 주석 외 AST가 같아야 함. build/verify:esm·ESM 동등성·회귀·audit. 주석 편집이어도 생성물 재현성 확인 | content 파일은 높음. 담당자 diff가 닿으면 해당 파일 보류, reader/core만 독립 적용 |
| Q2 · P2 | `ruliweb-icons/library-search.mjs:libraryFixedTags`; `shared/icon-metadata/tag-codec.mjs:FIXED` | 같은 13개 고정 태그의 별도 목록 | 문자열·순서·freeze·identity/legacy export 관찰 후 직접 import 또는 명시적 파생 상수로 원본 통합 검토. 두 파일과 해당 contract 테스트, 생성물 | 저장 normalize와 검색 normalize는 분리 유지. 태그 목록·검색 순서·독립 인스턴스·기존 공개 API 비교 | 낮음~중간. 공통 모듈 import 경로만 담당자와 공유, WXT entry 미수정 |
| Q3 · P2 | `ruliweb-icons/browser-adapter.mjs:carrierBytes`; `background.mjs:carrierBytes` | 바이트 carrier 재귀 검증이 양쪽에 있어 수정 누락 위험 | 두 함수의 허용 형식·깊이·예외를 먼저 표로 비교. 동일한 순수 부분이 확인될 때만 같은 디렉터리의 작은 ESM으로 추출. caller의 발신자 검증/메시지 수명은 유지 | ArrayBuffer/view·중첩·예약 marker·잘못된 입력·round-trip·callback/Promise의 같은 결과/오류. bytes/messaging 기존 ESM·실제 Chromium/Firefox 메시지 검증 | 중간. WXT의 브라우저 API 선택과 transport가 바뀌면 먼저 합의. 완전 동일성 미검증이라 즉시 추출 금지 |
| Q4 · P1 | `runtime/icons.mjs:createIconReader/createBundleUiRuntime`; `runtime/module-scope.mjs`; 기능 factory의 `initialize*` | 문자열 resolver·own 목록·임시 part·내부 initializer를 함께 추적해야 함 | 한 기능만 골라 필요한 공개 의존성/반환값/부작용을 표로 고정. 함수 매개변수로 즉시 주입 가능한 것과 늦게 조회할 것을 구분하고 작은 범위로 개선. 연관 runtime·factory·contract 테스트만 변경 | MetadataError 클래스 identity, factory 간 독립성, 초기화 한 번·설정 on/off·옵션 갱신·destroy 유지. ESM/회귀, 세 브라우저 로드·재초기화 E2E | 높음. PR #5가 runtime 조립을 대체할 수 있음. 담당자 브랜치 준비 후 소유 범위 합의 전 보류 |
| Q5 · P1 | `ruliweb-icons/picker.mjs:createPicker/createMedia/renderWindows/renderGroups/teardownGroups` | UI·검색·미디어·종료의 수명이 한 클로저에 결합 | 먼저 종료 책임 목록과 이벤트/타이머 계약 작성. DOM·선택 상태는 현 위치에 두고 부작용 없는 행 계산 또는 명확한 media 수명 단위 하나만 추출. picker와 해당 새 파일/테스트, 생성물 | UI 변경을 별도 변경으로 분리. focus·IME·터치/더블클릭·가상 목록·미디어 pause/해제·다중 모달·재오픈 E2E. MOCK과 실 사이트 구분 | 높음. WXT 신규 컴포넌트 소유 영역과 직접 중첩 가능, 합의 전 구현 보류 |
| Q6 · P1 | `platform/{firefox,whale}/content.mjs:parseAruArchivePngItxt/parseItxtChunk/extractSourceFromAruArchivePayload/parseSourceFromFile` | 유사 파싱과 브라우저별 정책이 큰 bootstrap 안에 혼재 | 파일명/PNG 후보 파싱의 입력·실패·우선순위를 비교. 동일성이 확인된 최소 순수 부분만 공통 ESM으로 이동하고 옵션·DOM·File 선택·픽시브 strict/loose·pixel table은 어댑터에 유지. 두 원본+새 파서+전용 테스트+생성물 | 한글/잘못된 iTXt·PNG·EXIF 우선순위·동명 다른 파일·metadata 누락·모바일 정책을 원본과 비교. 업로드 회귀·세 브라우저, Android/실제 업로드는 별도 사용자 테스트 | 매우 높음. content entry 개편과 겹침. WXT 담당자와 공동 기준 확정 전 보류 |
| Q7 · P1 | `upload-attribution/core.mjs:Controller`; `body-download/engine.mjs:DownloadRunner`; MAIN bridge | 취소·복원·진행 상태가 복잡해 표면적 단순화가 기능을 바꿀 위험 | 현재 상태 전이·해제 책임을 먼저 문서화. queue/observer/history를 통합하거나 generic controller를 도입하지 않음. 새로운 결함이 재현될 때만 좁은 수정 범위를 정함 | 2슬롯·동일 File 진행 중 공유·종료 후 늦은 결과·작은 download 완료 순서·접근 거절 재시도 제한·실패 복원을 기존 테스트와 비교. MV3 중단은 따로 모의/실제 구분 | 높음. 서비스 워커/World 구조 변경과 함께 검증 필요. 현재 안정 코드 유지 |
| Q8 · P2/P3 | `firefox/features/ruliweb-icons/README.md`, Whale 사본; 과거 검증 문서 | 동일 문서와 현재/역사 설명이 여러 위치에 있음 | 역사 원문은 보존. 추후 공통 안내 한 곳과 기존 경로의 짧은 연결 문서로 통합 검토. 테스트·외부 PR 링크 확인 후 문서만 수정 | 두 원본의 hash·원격 링크·상대 경로·패키징 포함 파일을 확인. Markdown 링크 검사와 build/verify로 제품 영향 배제 | 중간. 브라우저 경로가 WXT에서 이동할 수 있으므로 이번에는 CONSOLIDATE 후보만 기록 |

`icon-metadata/` 등은 `docs/source/` 기준이다. 각 항목은 독립 변경 단위로 검토·검증·커밋하며 한 번에 묶지 않는다. 새 파일 이름과 공개 API는 실제 추출이 결정된 뒤 기존 명명 관례에 맞춰 확정한다. 계획에 아직 없는 추상 계층을 미리 만들지 않는다.

## P0 보존 체크

다음은 코드량 감소보다 우선하는 종료 조건이다.

- `aru-tags:v1`, `data-aru-tags`, `data-aru-id`, `ruricon:v1`, 기존 저장 키·ID·이벤트 type/action·응답 형식을 유지한다.
- 순서·no-op 원문·unknown 필드·예외의 code/name/message·기존 인스턴스 identity를 비교한다.
- MAIN의 초기화·동기 이벤트·적용 전/후 DOM·history·저장 HTML 검증과 실패 복원을 유지한다.
- 업로드 이미지의 대응 근거가 없으면 자동 추측하지 않는다. 기존 캡션·사용자 본문·기존 업로드 버튼·리스너를 보존한다.
- `destroy`·취소·설정 OFF 이후 늦은 결과가 새 화면에 반영되지 않아야 한다. 실제 파서/서버 작업의 취소 여부와 UI 종료를 구별한다.

## WXT 협업 절차

1. 현재 통합 기준 `183784c`와 PR #5의 기준 `refactor/esm-core-transition`을 구분한다. PR #1 NORMAL 수정·Hybrid 최적화의 누락 여부를 별도 비교해야 한다.
2. 이번 정리 브랜치의 변경은 `.gitignore`, 루트 README, `docs/maintenance/`에 한정한다. WXT 설정·Manifest·엔트리포인트·새 컴포넌트는 수정하지 않는다.
3. Q4~Q7은 변경 파일 소유 범위와 실행 World를 합의한 후 진행한다. ESM 원본을 우선하며 생성 IIFE를 직접 수정하거나 기존 IIFE 알고리즘을 재도입하지 않는다.
4. 공통 모듈부터 한 기능씩 통합하고 factory 호출의 부작용·중복 설치·브라우저 옵션·MV3 재시작을 검증한다. 한국어 주석은 목적·보존 규칙·외부 제약에 한정한다.
5. 통합 후 Firefox·Chromium·Whale 확장 로드와 MAIN/ISOLATED E2E를 별도 프로필에서 확인한다. 실제 로그인 업로드/게시·Android·Native Host는 허용 범위와 실환경을 확인해 별도 수행한다.

## 실행할 검사와 중단 기준

기본 검사는 `npm run build`, `npm run verify`, `npm run test:esm`, `npm run test:integration`, `npm test`, `npm run verify:esm`, `npm run audit:esm`이다. ESM 테스트의 기존 `--test-concurrency=1`을 유지하고 공유 생성물을 읽고 쓰는 검사를 병렬 실행하지 않는다. Historical과 Firefox Lint는 기존 실패/경고의 이름·코드 차이를 비교한다.

동일 결과 테스트만으로 사이트 연동을 증명하지 않는다. 메시지·DOM·작성기 또는 초기화가 달라지면 실제 브라우저 검증을 추가한다. 신규 실패가 발생하면 해당 변경을 공개하거나 다른 기능으로 확장하지 않고 원인과 영향을 먼저 분리한다. 기존 사용자 변경을 초기화하는 복구는 하지 않는다.

불필요한 wrapper/복사/unused 삭제는 호출자·반환값·환경 주입을 확인한 뒤 결정한다. AST와 문자열 검색만으로 동작 보존이나 미사용을 확정하지 않는다. 포맷터·TypeScript·새 프레임워크·WXT 빌드 개편은 이 계획의 선행 조건이 아니다.

## 이번 단계에서 보류한 것

Q0~Q8의 제품 소스·생성물 수정, 브라우저 실행 경로 통합, 과거 문서 이동·삭제, WXT 코드 검토/통합, 릴리스·배포는 하지 않았다. 확인된 새 결함을 근거 없이 만들거나 테스트 기대값을 수정하지 않았다. 한국어 PR 원칙의 프로젝트 설치와 Governance 정식 적용도 별도 범위이므로 수행하지 않았다.
