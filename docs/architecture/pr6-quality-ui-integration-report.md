# PR #6 코드 품질 개선·작성기 UI 수정 통합

2026-10-17, Asia/Seoul. 대상은 `integration/aru-wxt`, Draft PR #6이다. 이 보고서는 원본 두 브랜치의 시점별 보고서를 보존하면서 통합 후 검증을 별도로 기록한다.

## 통합 형상

- 시작 로컬·원격 HEAD: `b1c22e71537a0151999d136d8105eb0d0696790f`. 시작 Worktree는 clean이었다.
- 코드 품질 브랜치 `8db716729d79ebe75ad0ff37817f998cce313351`까지 fast-forward한 뒤, UI 수정 브랜치 `9befbea1e7c6daf26d2a2ab799e674049cfaf4f5`를 통합했다.
- 통합 커밋: `8e5231f80a8cc5da907c48abc900c1f053ee0719`. 부모는 위 두 브랜치의 HEAD이다.
- 코드 품질 커밋 `c1f4f58`, `175019a`, `bf97554`, `8db7167`과 UI 커밋 `30d5d71`, `c0808db`, `9befbea`의 원래 SHA와 이력을 모두 보존했다.
- 두 브랜치의 공통 조상은 `b1c22e7`이고 변경 파일은 서로 겹치지 않았다. 품질 변경 16개·UI 변경 8개 파일의 Git blob이 각각 원본 브랜치와 같다. 충돌 해결이나 알고리즘 재작성은 없었다.
- MULTI-01의 `206e4bb`, `2d534d4`, `b1c22e7`도 그대로 조상에 포함된다. 원본 파일명·DOM 매칭 키·출처 우선순위·Firefox `chunked:false`·저장 및 이벤트 계약을 유지한다.

## 적용 범위

Runtime/Picker의 resolver·factory·선택 export 타입 계약, 출처 판독 결과 union·DOM 입력 타입, 목적과 보존 규칙을 설명하는 한국어 주석 및 관련 테스트·문서를 반영했다. 대규모 Picker 분리나 브라우저별 파싱 정책 통합을 새로 구현하지 않았다.

작성기의 이미지편집 탭 `#editor_tab_bar`는 업로드 장식 대상에서 제외한다. float 자식을 감싼 inline label에 절대 배치 오버레이를 덧씌워 폭 0px에 “이미지 첨부”가 세로로 표시되던 문제의 최소 수정이다. 사이트 DOM·전역 CSS·검색·태그·삽입 알고리즘은 바꾸지 않는다.

WXT 세 브라우저 생성물 135개의 SHA-256이 앞서 실제 화면 검증을 수행한 UI 수정본과 모두 같았다. 통합 과정에서 새 제품 수정이나 테스트 기대값 변경은 하지 않았다.

관련 근거:

- [코드 품질 감사](code-quality-audit.md), [설계](refactoring-design.md), [개선 결과](refactoring-results.md).
- [작성기 UI 원인·수정·실제 검증](../testing/ui/editor-layout-fix-report.md).
- [MULTI-01 실제 업로드 검증](../testing/user-acceptance/multi-01-fix-report.md).

## 통합 자동 검증

공유 생성물 경합을 피하도록 기존 명령을 순차 실행했다.

| 검사 | 통합 결과 |
| --- | --- |
| TypeScript·oxlint·oxfmt | 통과 |
| TypeScript 직접 테스트 | 60/60: 기존 52 + 품질 2 + UI 6 |
| ESM 동등성 | 51/51 |
| 통합 계약 | 4/4 |
| 회귀 | 111/111 |
| RC3 | 59/59 |
| classic 및 WXT Firefox·Chromium·Whale 빌드 | 통과 |
| Manifest·권한·World·리소스·TypeScript/ESM/classic 생성 일치 | 통과 |
| 관리 원본 IIFE / 순환 의존 | 0 / 0 |
| Firefox classic Lint | 오류 0·기존 경고 9, 기준과 전체 로그 동일 |
| Historical | 193 통과·기존 실패 94, 신규 실패 없음 |

Historical 비교는 타이밍과 두 Worktree의 절대 경로 접두사만 정규화했다. 같은 상대 파일 경로·테스트명·실패 건수를 유지한다. Historical 명령의 기존 종료 코드 1을 성공으로 바꾸지 않았다. 테스트 assertion이나 동결 Fixture를 고쳐 실패를 숨기지 않았다.

## 통합본 실제 작성기 확인

새 전용 Firefox·Whale 프로필에 위 통합 커밋을 빌드해 로드했다. 기존 E2E의 Python·Selenium·Playwright·브라우저·드라이버를 재사용했고 사용자 직접 로그인 후 2026-10-17 15:52~15:54 KST에 실제 루리웹 글쓰기 화면을 확인했다. MOCK 결과로 대체하지 않았다.

| 항목 | Firefox 158.0 / 확장 1.0.4 | Whale 5.39.412.57 / 확장 0.1.3 |
| --- | --- | --- |
| 실제 작성기 접근·초기화 | PASS: 작성기 1개 | PASS: 작성기 1개 |
| 아이콘 선택·태그 UI | 각각 1개, 중복 없음 | 각각 1개, 중복 없음 |
| 이미지편집 탭·세로 문구 | 탭 장식 0개, 세로 문구 없음 | 탭 장식 0개, 세로 문구 없음 |
| 기존 탭 새로고침 | PASS, 각 진입·업로드 style 1개 | PASS, 실제 navigation 변경 및 각 UI 1개 확인 |

Whale 새로고침은 빈 작성기임을 확인하고 기존 탭에 브라우저 CDP `Page.reload`를 사용했다. 사이트 DOM이나 제품 코드를 바꾸지 않았다. 이 결과를 자동 새 탭의 API 누락이 해결됐다는 근거로 사용하지 않는다. 이번 통합 검증에서는 기존 탭 UI·새로고침만 다시 확인했으며, 이전 UI 수정 브랜치의 창 너비·ON/OFF·게시판 왕복·댓글 UI 검증은 별도 보고서의 당시 결과로 유지한다.

이번 검증은 UI 확인이며 이미지 업로드·게시글 최종 등록·수정·댓글 등록을 하지 않는다. 개인 프로필·쿠키·인증 저장소를 복사하지 않는다. 캡처는 테스트 작성기 영역으로 제한한다.

## 남은 항목

- `artwork_id` 숫자·객체 입력의 `.trim()` 예외는 기존 별도 결함이며 이번 타입 계약 개선으로 해결되지 않았다.
- Whale 자동 새 탭과 확장 재활성화 이후 저장소 API 누락의 원인·기준 코드 대조는 미해결이다. 기존 탭의 실제 UI 결과와 자동 새 탭 결과를 섞지 않는다.
- 실제 답글 입력 UI·Android 실기기·Native Host·장시간 MV3 재시작·실제 업로드 실패 재시도·서명 확장 업데이트 및 데이터 이전은 미검증이다.
- 이번 통합에서 실제 업로드를 반복하지 않는다. 기존 MULTI-01 검증 자료는 과거 실행 근거로 유지한다.

## 작업 보호와 실행 근거

통합 Worktree 외 기존 10개 Worktree의 HEAD·추적/미추적 파일, 원본 배포 ZIP/XPI 201개와 PR #1~#5·main·외부 포크를 보호한다. 기존 dirty 상태를 초기화하거나 숨기지 않았다. 외부 댓글·리뷰·질문에 답변하지 않는다.

로컬 근거는 `E:/dev/VSCode/personal/tmp/aru-pr6-quality-ui-integration-20261017/`에 있다. `before.json`, `branch-equivalence.json`, `validation/`, `validation-summary.json`, `ui-build-equivalence.json`, `pre-push-protection.json`에 형상·자동 검증·원본 브랜치와 생성물 동일성·보존 검사를 기록했다. `ui-validation-summary.json`, `firefox-integrated-dom.json`, `whale-integrated-dom.json`, `firefox-refresh-dom.json`, `whale-integrated-reload.json`이 이번 통합본의 실제 확인 근거다. 인증 자료·테스트 프로필·원본 이미지·스크린샷은 Git에 추가하지 않는다.

실제 화면은 `site/screenshots/20261017-154323-firefox/`와 `site/screenshots/20261017-154323-whale/`의 `fixed-editor.png`, `integrated-editor-tabs.png`에 보존했다. 테스트 전용 브라우저만 종료한다.

공개는 실제 작성기 검증이 끝난 뒤 통합 브랜치에만 일반 Push하고 PR #6 본문만 한국어로 보강한다. Draft 상태를 유지하며 GitHub CI는 새 HEAD의 결과를 별도로 확인한다. main 병합·Force Push·외부 브랜치 수정·스토어 배포는 하지 않는다.
