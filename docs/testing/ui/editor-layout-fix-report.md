# 글쓰기 화면 이미지편집 탭 배치 오류 수정

상태: 원인 확인·최소 수정·자동 회귀·실제 Firefox 검증 완료. **Whale 수정 후 최종 검증은 사용자 재로그인 대기이며 전체 작업 완료가 아니다.**

## 기준과 작업 보호

- 조사일: 2026-10-17, Asia/Seoul.
- 기준: `integration/aru-wxt`, PR #6의 로컬·원격 HEAD `b1c22e71537a0151999d136d8105eb0d0696790f`.
- 독립 작업: `fix/editor-layout`, Worktree `E:/dev/VSCode/personal/aru_archive/browser-extension/editor-layout-fix`.
- `refactor/wxt-code-quality`의 `8db716729d79ebe75ad0ff37817f998cce313351`은 기준보다 4개 커밋 앞서 있으며 보존했다. 타입·주석·문서 개선을 이번 UI 수정에 합치지 않았다.
- 기존 Worktree 10개, 추적·미추적 파일 4,081개, 배포 파일 201개의 기준 상태·해시를 기록했다. 원격 refs와 PR #1~#6의 제목·본문·HEAD·상태도 비교한다.
- 기존 `tests/e2e`의 Python·Selenium·Playwright·드라이버와 테스트 브라우저를 재사용했다. 개인 프로필이나 인증 저장소를 복사하지 않았고 로그인은 사용자가 직접 했다.

## 실제 원인

실제 글쓰기 주소는 `https://bbs.ruliweb.com/community/board/300143/write`이다. Firefox 158.0과 Whale 5.39.412.57(Chromium 150.0.7871.252)의 기준 확장에서 같은 현상을 재현했다. 확장 버전은 각각 1.0.4 / 0.1.3이다.

세로 문구의 실제 `textContent`는 **`이미지 첨부`**였다. 사이트의 원래 `이미지편집` 문구와 별개다.

```text
#editor_v2 > .App > #editor_tab_bar > label[for="imageUploadfromFile"]
  #imageEditor.col                         ← 사이트가 생성, float:left
  span[data-aru-native-label]              ← 확장이 추가, position:absolute; inset:0
    #shadow-root > span.label             ← “이미지 첨부”
```

`src/upload-attribution/ui.ts`의 `UploadUI.discover()`는 이미지 파일 입력의 연결 label을 찾고, `decorate()`가 label에 `data-aru-native-upload`·`aria-label`·Shadow DOM 오버레이를 추가했다. 이때 이미지 편집용 입력 `#imageUploadfromFile`까지 일반 첨부 버튼으로 취급했다.

| 관찰 대상 | Firefox | Whale |
| --- | --- | --- |
| 사이트 label의 display / 실측 폭 | inline / 2px | inline / 2px |
| label의 min-width | 110px, 인라인이라 폭 확보 실패 | 동일 |
| label의 position / overflow | relative / visible | 동일 |
| 오버레이 폭 / 높이 | 0px / 15px | 0px / 14px |
| Shadow 내부 표시의 width / white-space | 20px / normal | 동일 |

원래 label의 자식은 float이고 새 오버레이도 절대 배치라 일반 흐름에서 폭을 확보하지 않는다. 폭 0px인 영역 안에서 텍스트가 한 글자씩 줄바꿈되고 `overflow:visible`로 아이콘 목록 위까지 넘어갔다. `#editor_tab_bar`는 사이트가 지정한 높이 27px의 inline-block이며, 문제 영역은 flex/grid 열 배치가 아니다. z-index나 Picker 모달이 원인이 아니며 중복 버튼도 확인되지 않았다.

스타일은 확장 전용 `data-aru-*` 선택자와 Shadow DOM으로 제한되어 있었다. 전역 `label` CSS가 사이트 전체를 오염시킨 것이 아니라 **꾸밀 대상 label의 잘못된 선정**이 원인이었다.

## 최소 수정과 영향 범위

`UploadUI.decorate()`에서 `control.closest("#editor_tab_bar")`인 요소를 제외한다. 이미지편집 탭의 기존 DOM·이벤트·aria-label·스타일을 그대로 유지하고, `.note-toolbar .icon-camera`의 실제 이미지 첨부 버튼과 탭 밖 일반 첨부 label은 계속 꾸민다.

전역 CSS override, 사이트 DOM 이동, min-width 강제 적용, 아이콘 검색·태그·삽입·출처 파서·매칭·업로드 순서 정책 변경은 없다. MULTI-01 코드, 저장 키, 직렬화, MAIN/ISOLATED 계약, Manifest·권한·확장 ID도 변경하지 않는다.

변경 파일:

- 제품 원본: `src/upload-attribution/ui.ts`.
- 빌드 생성물: `docs/source/upload-attribution/ui.mjs`, `docs/source/upload-attribution/ui.js`, `firefox/features/upload-attribution/ui.js`, `whale/features/upload-attribution/ui.js`.
- 테스트: `tests/typescript/editor-layout.test.ts`, `tests/integration/contracts.test.mjs`.
- 보고서: 이 문서.

Hybrid AST 비교에서는 이번에 의도한 탭 장식 제외 조건 한 개만 명시적인 허용 차이에 추가했다. 동결 Fixture와 다른 알고리즘 비교는 유지하며, 실제 탭 보존·업로드 버튼·기존 클릭 리스너·재탐색·종료 복원·댓글/답글 보존은 새 행동 테스트 6개로 검증한다. JSDOM 테스트는 DOM 동작 검사이며 실제 픽셀 배치는 아래 브라우저 검증으로 구분한다.

새 테스트를 기준 커밋의 UI 구현에도 적용했다. 수정 전에는 탭 보존·재탐색 검사 2개가 실패하고 나머지 4개는 통과했다. 수정 후에는 동일한 6개가 모두 통과했다.

## 실제 브라우저 검증

실제 업로드나 게시글·댓글·답글 등록은 진행하지 않았다. 스크린샷은 테스트 창의 `#editor_v2` 요소만 촬영했다. 전체 화면·인증 화면·사용자 입력값·쿠키·토큰·헤더·요청 본문은 수집하지 않았다.

| 항목 | Firefox | Whale |
| --- | --- | --- |
| 기준 확장, 글쓰기 오류 재현 | 재현 | 재현 |
| 확장 전체 OFF 비교 | 임시 확장 제거 후 재진입, 세로 문구 없음 | 최초 비교 무효: 페이지 이동 중단. 재검증 대기 |
| 아이콘 OFF / 출처 기능 ON | 기준에서 여전히 오류, 원인이 Picker가 아님 확인 | 재검증 대기 |
| 수정 후 아이콘 ON / OFF | 두 상태 모두 탭 보존 | 재로그인 대기 |
| 수정 후 새로고침 / 새 탭 재진입 | 정상, 진입 버튼·메타데이터 버튼·업로드 style 각각 1개 | 재로그인 대기 |
| 창 너비 1280 / 800 / 500px | 세로 문구 없음, 중복 초기화 없음 | 재로그인 대기 |
| 실제 공개 페이지 댓글 입력 UI | 댓글 입력 1개·확장 진입 1개, 업로드 장식 0개 | 대기 |
| 실제 답글 입력 UI | NOT RUN: 조사한 공개 페이지에서 reply_input 0개 | NOT RUN |
| 댓글·답글 DOM 보존 단위 검사 | 6개 신규 테스트에 포함 | 공통 구현 검사 |
| Android 등 모바일 실기기 | NOT RUN | NOT RUN |

좁은 데스크톱 창에서 사이트 고정 폭 때문에 편집기 일부가 잘리는 현상이 남는다. 이 수정은 모바일 반응형 개편을 포함하지 않으며 500px 창 검사를 모바일 실기기 PASS로 대체하지 않는다.

Whale의 최초 확장 OFF 비교는 페이지 이동이 중단되어 기존 DOM이 남았으므로 판정에서 제외한다. 이후 OFF/ON 상태에서는 `chrome.storage.sync unavailable`과 아이콘 UI 누락이 관찰되어 정상 수정 검증으로 인정하지 않았다. 같은 전용 프로필에서 브라우저를 재시작해 확인하며, 재시작으로 사라진 로그인은 사용자에게 다시 요청했다. 이 전용 프로필 재사용은 인증 정보를 다른 프로필로 복사하는 작업이 아니다.

## 자동 검증

수정 전 기준과 수정 후에 같은 검증을 순차 실행했다. 생성 파일을 병렬로 읽고 쓰는 테스트 경합은 피했다.

| 검사 | 수정 후 결과 |
| --- | --- |
| TypeScript·oxlint·oxfmt | 통과 |
| TypeScript 직접 테스트 | 58/58 (기존 52 + 신규 6) |
| ESM 동등성 | 51/51 |
| 통합 계약 | 4/4 |
| 회귀 | 111/111 |
| RC3 | 59/59 |
| Firefox·Chromium·Whale WXT 빌드 및 classic 빌드 | 통과 |
| Manifest·리소스·생성 재현성·TypeScript 생성물 일치 | 통과 |
| 제품 원본 IIFE / 순환 의존 | 0 / 0 |
| Firefox classic Lint | 오류 0, 기존 경고 9; 기준과 로그 동일 |
| Historical | 287개 중 193 통과 / 기존 실패 94, 실패 이름 동일, 신규 실패 없음 |
| UI 선택자 기계 검사 | 변경 파일 지적 없음. 실제 DOM 판정을 대신하지 않음 |

## 별도 결함 후보: artwork_id 타입 예외

이번 UI 수정에서 고치지 않았다. 다음 위치는 외부 JSON의 `artwork_id`를 문자열로 확인하지 않고 `(value || "").trim()`을 호출한다.

- Firefox: `src/platform/firefox/content.ts:360`, `:627`.
- Whale: `src/platform/whale/content.ts:365`, `:609`.

입력 예시:

```json
{"artwork_id": 143805797}
{"artwork_id": {"id": "143805797"}}
```

참인 숫자·객체이면 `TypeError: ...trim is not a function`이 발생할 수 있다. 기존 코드 품질 점검의 PNG payload 함수 독립 검증에서는 문자열 `"143805797"`은 정상 Pixiv URL, 숫자·객체는 예외, null은 출처 없음으로 확인했다. PNG iTXt payload와 가능한 Aru JSON 경로가 영향 후보이며, 여기서는 실제 업로드 전체 경로의 장애나 다른 이미지 출처 오연결까지 재현한 것으로 주장하지 않는다.

권장 정책은 별도 작업에서 생산자 스키마를 먼저 확인하고 결정한다. 문자열만 허용할지, 양의 안전 정수 ID도 명시적으로 검증 후 허용할지 합의하고, 잘못된 타입은 예외로 전체 판독을 중단하지 않도록 실패 결과 또는 다음 후보로 처리한다. 객체를 무조건 `String()`으로 바꾸지 않는다. 양 브라우저의 판독 우선순위·기존 오류 계약·MULTI-01·혼합 업로드 순서 역전 검증을 별도로 수행해야 한다. GitHub Issue 생성이나 외부 개발자 답변은 하지 않았다.

## 증거와 남은 작업

로컬 증거 기준 경로는 `E:/dev/VSCode/personal/tmp/aru-editor-layout-20261017/`이다. 제품 이미지·개인 테스트 프로필은 저장소에 추가하지 않는다.

- `before.json`, `protection-review.json`: 기존 작업·배포·PR 보존 점검.
- `layout-cause.json`: 두 브라우저의 원인 요소 실측과 computed style.
- `site/firefox/`, `site/whale/`: 기준 DOM·콘솔·단계별 결과. 이름에 `error`가 없어도 응답의 `error`와 유효성 판정을 함께 확인해야 한다.
- `site/screenshots/20261017-121816-firefox/baseline-all-editor.png`: Firefox 수정 전.
- `site/screenshots/20261017-121816-whale/baseline-all-editor.png`: Whale 수정 전.
- `site/screenshots/20261017-121816-firefox/fixed-editor-1792207659632.png`: Firefox 수정 후, 아이콘 ON.
- `candidate-site/`: 재시작한 Whale의 검증 증거. 재로그인 완료 전 기록은 PASS가 아니다.
- `baseline-validation/`, `final-validation/`, `validation-summary.json`: 기준/수정 후 명령 결과, Historical 및 Lint 비교.
- `candidate-output-sha256.json`: 브라우저 후보 생성물의 해시.
- `committed-build-equivalence.json`: 수정 커밋과 검증에 사용한 생성물 135개의 일치 확인.
- `new-tests-on-baseline.log`, `editor-layout-tests.log`: 신규 검사에서 수정 전 2개 실패 / 수정 후 6개 통과.

제품·테스트 로컬 커밋: `30d5d71678d8ac06e8dd400ef40680079ca076d6` (`fix: 이미지편집 탭의 업로드 장식 간섭 방지`). 이 커밋은 기존 PR #6에 반영하지 않았다. 보고서의 Whale 대기 상태는 사용자 로그인 후 갱신한다. Push·PR 수정·Merge·배포는 하지 않는다.
