# 제품 원본 구조

직접 관리하는 제품 실행 코드는 TypeScript다. 설정과 데이터는 기존 JSON/CSS/HTML 형식을 유지한다. import는 초기화·네트워크·전역 namespace 등록을 시작하지 않는다.

| 위치                           | 책임                                                |
| ------------------------------ | --------------------------------------------------- |
| `icon-metadata/`               | 태그 저장 코덱, 변경 계획·선택, 편집 UI·MAIN bridge |
| `ruliweb-icons/`               | 검색·팩 목록·캐시·사이트·작성기·Picker              |
| `source-caption/png-chunks.ts` | Firefox·Whale에 공통인 PNG 청크 판독                |
| `platform/`                    | 브라우저별 정책·출처 판독·Native·옵션               |
| `upload-attribution/`          | 파일별 출처 대응·2슬롯 파싱·DOM 관찰과 종료         |
| `body-download/`               | 사용자가 승인한 다운로드·취소·원장 복구             |
| `runtime/`                     | 의존성 조립·늦은 getter와 공개 API 경계             |
| `performance/`                 | 사용자가 켠 수치 계측                               |

WXT는 [entrypoints](../entrypoints/)에서 직접 import한다. 코드 규격과 초기화 순서는 [통합 안내](../docs/architecture/esm-wxt-integration.md)를 따른다. Picker는 DOM과 검색 상태를 인스턴스 클로저에 두고 종료의 선행 확정·재진입 방지는 PickerLifecycle이 소유한다. 파싱 큐·다운로드·MAIN history를 일반 controller로 합치지 않는다.

58개 TS 파일을 strict 타입 검사한다. 저장 태그·선택/변경 계획·검색 모델·메타데이터 스키마·캐시 원장·PNG·수명 관리의 타입을 분리했다. 사이트 jQuery/Summernote·브라우저 callback/Promise·기존 resolver namespace에는 동적 타입이 남는다. 외부 응답을 모두 정적으로 검증된 값으로 간주하지 않으며 기존 런타임 검사를 유지한다. 이 경계의 세부 공개 API 타입 강화는 후속 작업이다.

기존 47개 모듈의 호환 출력 대응은 [매핑 파일](../tools/typescript-modules.json)에서 관리한다. 생성된 docs/source와 shared 코덱을 직접 수정하지 않는다. [검증 명령](../package.json)으로 타입·Lint·포맷·동등성·계약·회귀와 생성물 일치를 확인한다.
