# 코드 품질 개선 설계와 적용 경계

2026-10-17. [감사 근거](code-quality-audit.md)의 기준 커밋은 `b1c22e7`이며 이번 실제 적용 결과는 [결과 보고](refactoring-results.md)에 있다. **이 설계 전체가 구현됐다는 뜻은 아니다.** 안전성이 확인된 타입·주석만 적용하고, 동작 변경·DOM 책임 이동·저장 규격 변경은 보류했다.

## 공통 수락 조건

- WXT entry는 환경·초기화·실행 영역 연결에 집중한다. 타입만으로 외부 JSON·DOM·브라우저 응답을 신뢰하지 않는다.
- `aru-tags:v1`, `data-aru-tags`, `data-aru-id`, `ruricon:v1`, 옵션·cache·다운로드 원장 키, Native Host·확장 ID·Manifest 권한을 유지한다.
- Firefox 파일명 우선 및 `exifr chunked:false`, Whale 메타데이터 우선 및 기존 읽기 옵션, MULTI-01 다운로드 번호/숫자 전용 이름 정책을 유지한다.
- 정확한 이미지별 출처 대응, 역전 완료·동명 파일·모호한 대응 거절, 태그 no-op 원문·미선택 ID·unknown 필드를 보존한다.
- 지연 resolver를 조기 값으로 바꾸거나, UI 종료를 실제 parser/서버 작업의 취소와 동일시하지 않는다. MAIN/ISOLATED 요청·응답·history 계약을 유지한다.
- 타입 단계는 생성 JavaScript·WXT 바이트 동일성을, 주석 단계는 동일 실행 AST·WXT 바이트 동일성을 검사한다. 실행 구문이 달라지면 실제 브라우저 검증 여부를 다시 결정한다.

## D01 · P1 — 외부 출처 JSON 입력 검증: 보류

- **문제·필요성:** FF `content.ts:360,627`, WH `:365,609`에서 truthy artwork_id에 문자열 메서드를 사용한다. PNG fallback 함수에 숫자/객체를 넣으면 TypeError가 재현된다. 잘못된 입력을 예상한 결과로 분류할 경계가 필요하다.
- **대상·방법·책임:** 두 `extractSourceFromAruArchivePayload`·`collectFromPossibleAruJson`. 먼저 desktop/Native metadata 스키마에서 숫자 ID 허용 여부를 확정한다. 문자열 ID를 검증하는 작은 순수 함수와 외부 payload 검증을 분리한다. 무조건 `String(value)`로 객체까지 허용하지 않는다. 예상 파일은 두 Content·확정한 공통 후보 모듈·회귀 테스트다.
- **API·기능·WXT 영향:** 공개 함수 이름·저장 형식은 유지할 수 있으나 기존 예외가 missing 또는 정상 URL로 바뀌므로 **실행 동작 변경**이다. 브라우저별 우선순위·sanitizer를 유지하고 WXT entry는 그대로 둔다.
- **검증·난이도·협업:** 문자열/숫자/객체/null/초대형 ID, 잘못된 PNG·JSON, exifr fallback, 파일명과 metadata 충돌의 동등성·차이 명세가 필요하다. 두 브라우저 실제 작성기와 승인된 파일로 재검증한다. 난이도 중, 충돌 중~높음(Content 공동 수정). 이번에는 정책을 임의 결정하지 않았다.

## D02 · P1 — Runtime 의존성 계약: 부분 적용

- **문제·필요성:** `runtime/contracts.ts`의 `ResolverMap`과 `module-scope.ts` 반환은 문자열·any여서 오타/선택하지 않은 export를 추적하기 어렵다. `runtime/icons.ts:51`에는 늦게 설치하는 순서 의존성도 있다.
- **대상·방법·책임:** 적용한 파일은 contracts·module-scope·runtime/icons·picker-model·picker다. `ResolverMap<Contract>`, `FactoryOptions<Dependencies>`, `Pick<Scope,Name>`와 읽기 전용 이름 배열을 사용한다. Picker factory는 알려진 키의 **부분 주입을 계속 허용**하고 실제 Runtime의 전체 연결은 `satisfies`로 검사한다. resolver 값은 아직 unknown/동적 경계로 남겨 허위로 구체 타입을 단언하지 않는다.
- **API·기능·WXT 영향:** JS 공개 API·조회 시점·기본값·초기화 순서 불변. TS에서는 오타/선택하지 않은 공개 이름을 거절한다. 다른 factory의 기본 generic은 기존 동적 계약과 호환된다. WXT entry·World 상태를 수정하지 않는다.
- **검증·난이도·협업:** 실제 compiler의 성공/실패 fixture, eager/late 값·클래스 identity·scope 독립성, 전체 회귀·빌드·바이트 비교. 적용분 난이도 낮음, 충돌 중. 후속으로 Download/Site/Picker 포트의 실제 메서드 계약을 하나씩 작성하고 각 조립부에 적용한다. 모든 DynamicApi를 한 번에 없애지 않는다.

## D03 · P1 — Picker 책임 분리: 설계 완료, 실행 책임 이동 보류

- **문제·필요성:** `picker.ts:302`의 createPicker 안에 DOM·가상 목록·선택·검색·미디어·종료가 결합한다. `createMedia:1199`, `renderWindows:1679`, `renderGroups:2020`, `disposePicker:2728`을 함께 추적해야 한다.
- **대상·방법·책임:** 우선 현재 public setter/getSnapshot/element 계약을 타입으로 고정한다. 다음 단계는 입력/출력이 명확한 가상 행 계산의 순수 함수, 이후 미디어별 등록/해제 세션 순이다. DOM·선택·포커스·scroll lock은 Picker에 남기고 Lifecycle은 종료 선행 확정만 소유한다. 예상 파일은 Picker·picker-model·검증된 계산/미디어 경계 모듈·전용 테스트다. 작은 el/button을 각각 파일로 나누지 않는다.
- **API·기능·WXT 영향:** handle·snapshot 필드와 기존 UI/CSS·삽입 동작을 유지한다. 자원 해제 중 예외를 격리하는 안은 에러 전파·정리 순서를 바꾸므로 별도 변경이다. WXT entry는 그대로지만 실제 레이아웃·이벤트·미디어 수명에 영향이 있다.
- **검증·난이도·협업:** 검색/필터 순서·72카드 상한·IME·키보드 focus·신뢰된 double click·터치·미리보기 재시도·다중 Picker 잠금·닫기/재오픈·늦은 Promise·부분 cleanup 실패를 검증한다. Firefox·Whale MOCK와 실제 공개/작성기 검증을 구분한다. 난이도 높음, UI 개발과 충돌 높음. 이번 적용은 D02의 의존성 이름 타입까지다.

## D04 · P1 — 브라우저 Content 전체 수명: 보류

- **문제·필요성:** FF/WH installer가 `{}`를 반환하고 document change·댓글 감시·polling과 업로드 Controller의 종료 책임이 분산돼 있다. pagehide가 Controller를 닫는 것만으로 재설치/문서 복원 계약이 확정되지는 않는다. 실제 BFCache 장애는 아직 재현하지 않았다.
- **대상·방법·책임:** 두 installer·startEditorObserver·댓글 observer와 WXT 수명 연결을 한 단위로 설계한다. disposer의 반복 호출·동시 init·진행 중 설정 조회 후 종료를 정의하고 환경별 해제를 모은다. 전역 once 플래그만 추가해 정상 재초기화까지 차단하지 않는다. 예상 파일은 Content 두 개·필요 시 설치 handle 타입·entry 연결·테스트다.
- **API·기능·WXT 영향:** installer 반환/수명 계약의 확대이며 리스너·옵션 갱신·페이지 복원에 실행 영향이 있다. 설정 기본값·키·페이지별 댓글/작성기 분기는 보존한다. 외부 WXT 개발자의 entry 변경과 협의가 필요하다.
- **검증·난이도·협업:** 중복 install, 초기화 도중 종료, pagehide/복원, 옵션 OFF/ON, 늦은 댓글 DOM, 새 작성기, 파일 change 한 번당 parser 횟수. 승인 파일만 실제 업로드하고 출처 오연결 시 중단한다. 난이도 높음, 충돌 높음.

## D05 · P2 — 공통 출처 후보 파싱: 보류

- **문제·필요성:** 동일 본문 함수 51개 중 일부는 순수 후보 추출이지만 다수는 config·URL 생성자·DOM·비동기 상태를 캡처한다. 내용 일치만으로 이동하면 브라우저 정책이 달라질 수 있다.
- **대상·방법·책임:** `extractSourceUrl`, `collectFromPossibleAruJson`, `walkStringFields`, `isPixivUserUrl`, `uniqueOrdered`의 입력·오류·상한·호출 환경을 먼저 표로 고정한다. 동일한 무상태 후보 처리만 모듈화하고 파일 I/O·exifr 옵션·우선순위·DOM은 어댑터에 둔다. Pixiv 파일명·PNG 바이트 모듈은 재사용한다. 예상 변경은 두 Content·공통 후보 모듈·tests다.
- **API·기능·WXT 영향:** 후보 순서·중복 제거·최대 깊이·작가 URL 거절·unsafe URL 필터를 보존한다. `ParsedSourceResult` 타입과 URL sanitizer 역할은 구분한다. import 경로가 추가되며 World/Manifest 변경은 필요 없다.
- **검증·난이도·협업:** EXIF/XMP/IPTC·Aru PNG·손상/순환/깊은 metadata·유효 출처 없는 WEBP·충돌 우선순위·오류 code/reason 비교, MULTI-01 14개·혼합·완료 역전 실제 업로드. 난이도 중~높음, Content 충돌 높음. 이번에는 판독 결과·DOM 입력 타입만 강화했고 함수를 옮기지 않았다.

## D06 · P2 — Registry·비동기 큐 캡슐화: 보류

- **문제·필요성:** `upload-attribution/core.ts`의 record/state·parseJobs·roots 등은 타입/공개 경계가 느슨하다. destroy가 Promise 대기자를 해제해도 File 파서 자체는 계속될 수 있다.
- **대상·방법·책임:** Registry는 대응 증거·소모 상태, Controller는 DOM·2슬롯 작업·관찰자, parser는 File→결과를 소유한다. public snapshot/진단 DTO와 내부 mutable 상태를 구분한 뒤 공개 호출부를 확인하고 캡슐화를 진행한다. 예상 파일은 core·models·upload 테스트다. 범용 queue/controller로 통합하지 않는다.
- **API·기능·WXT 영향:** 데이터 키·root별 exact-name·불명확 대응 거절·같은 File 진행 중 공유·capacity/expiry/consumed 정책 불변. private 전환으로 legacy 진단/테스트를 깨지 않게 먼저 호출부를 고정한다. 새 parser 취소를 도입하면 별도 계약 변경이다.
- **검증·난이도·협업:** 동명 다른 내용·동일 File 재선택·역전 완료·root 교체·종료 후 late resolve·용량·만료·중복 캡션·진단 필드. 실제 Firefox·Whale 업로드 필요. 난이도 높음, 업로드 작업과 충돌 높음. 기존 Core는 이번에 변경하지 않았다.

## D07 · P2 — 바이트 carrier와 브라우저 포트: 보류

- **문제·필요성:** BrowserAdapter와 Background에 carrier 재귀가 중복되고 API의 any 경계가 크다. 그러나 송수신 양쪽의 검증과 오류 분류는 각각 필요하다.
- **대상·방법·책임:** `browser-adapter.ts:carrierBytes`, `ruliweb-icons/background.ts:carrierBytes`의 허용 형식·깊이·노드/바이트 상한·예약 marker·오류를 비교한다. 동일한 변환 부분만 공유하고 발신자/권한/메시지 수명·IDB generation 검증은 Background에 둔다. 예상 파일은 두 모듈·검증된 carrier 함수·tests다.
- **API·기능·WXT 영향:** 메시지 type/action, JSON marker, callback/Promise·lastError·불완전 API fallback을 유지한다. 새로운 범용 storage 클래스로 옵션·캐시·원장을 합치지 않는다. 권한·IDB 스키마 변경은 불필요하다.
- **검증·난이도·협업:** Uint8Array/ArrayBuffer/view·다른 realm·예약 marker·중첩/순환/대형 입력·복원·IDB 중단/사용 중지 generation. 세 브라우저 실제 메시지 통신이 필요하다. 난이도 중, WXT API 선택부 충돌 중.

## D08 · P2 — 다운로드·Native 포트 타입: 보류

- **문제·필요성:** `runtime/downloads.ts`, `body-download/browser-api.ts`, `engine.ts`, 플랫폼 Background가 원장·브라우저 API를 동적 값으로 연결한다. 이를 단순 wrapper로 지우면 빠른 완료·취소·Native 소유권 처리가 바뀐다.
- **대상·방법·책임:** 실제 사용하는 downloads/storage/runtime 메서드와 이벤트 listener 포트를 최소 인터페이스로 고정한다. Runtime은 순서·late ownsDownload 연결, Core는 경로/미디어 규칙, Engine은 작업/원장, 플랫폼은 Native 정책을 유지한다. 예상 파일은 해당 Runtime·포트 모델·각 어댑터·tests다.
- **API·기능·WXT 영향:** Native Host ID·기존 job 키·Blob 소유권·준비 상태에서 사용자 시작·자동 재개 금지·원본 바이트 유지. public method/저장 형식 불변을 목표로 하며 signature 변경은 별도 검토한다.
- **검증·난이도·협업:** download 응답 전 완료, cancel/search 실패, listener/Blob finally 해제, 원장 재실행, Native 미설치/실패, MV3 재시작을 MOCK·실기기로 구분한다. 난이도 중~높음, Background/관리 UI 개발과 충돌 중~높음. 실제 다운로드·Native 실행은 이번에 하지 않았다.

## D09 · P3 — 타입·주석·안내 정합성: 적용

- **문제·필요성:** 파서 성공/출처 없음과 큐 cancelled가 느슨한 모델에 섞여 있었고 DOM 이미지 인자·상태 숫자에 any가 남았다. 과거 Phase 헤더와 영어 catch 주석은 현재 제약을 설명하기 어렵다.
- **대상·방법·책임:** `upload-attribution/models.ts`에 판독 전용 union을 추가하고 두 Content의 PNG/File 반환·텍스트 바이트·DOM 이미지·선택 개수를 타입화했다. Picker·Content 주석을 현재 수명/정책 중심으로 정리하고 `src/README.md`의 실제 파일 수·공통 모듈 안내를 갱신한다.
- **API·기능·WXT 영향:** runtime 검증·정책·예외는 그대로다. 전체 SourceResult의 cancelled를 제거하지 않고 판독 전용 타입만 분리했다. Uint8Array의 기존 ArrayBufferLike 범위를 부당하게 좁히지 않는다. entry·설정·World는 바꾸지 않는다.
- **검증·난이도·협업:** compile 성공/음성 사례, MULTI-01 기존 테스트, 모든 지정 suite, 생성 JS/AST·WXT 바이트 비교. 난이도 낮음, Content 파일의 줄 위치 충돌은 중간이나 동작 충돌은 낮음. 세 구현 단계와 문서는 별도 커밋이다.

## 후속 실행 순서

입력 정책 D01 확정 → Runtime 포트 D02 한 기능 → D03의 순수 계산 경계 → D04 수명 → D05 공통 파싱 순으로 권장한다. D06~D08은 현재 구현을 기능별 기준으로 유지하면서 독립 검증 단위로 진행한다. UI·업로드·Native 변경을 한 PR/커밋으로 묶지 않는다. 외부 개발자에게 필요한 합의는 사용자가 전달하며 이번 작업에서는 댓글·리뷰·메시지를 보내지 않는다.
