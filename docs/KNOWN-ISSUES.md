# Android 개발본 미해결 항목

| 항목 | 현재 증거 / 원인 | 다음 작업 |
|---|---|---|
| 3867 원본 URL 불일치 | 정확한 URL 대조에서 경고. 실제 본문을 확보하지 못해 데이터 차이·저장 속성·CDN 변형 중 어느 원인인지 미확정 | Android의 실제 원본 NORMAL 글과 5044에서 읽기 전용 진단을 각각 수집해 비교. URL 임의 교체 금지 |
| Android 태그 누락 | BUNDLE과 NORMAL의 태그 실패 완료 처리/캐시를 수정. 사용자의 실기기 증상과 동일 원인인지는 미확정 | 원본에 data-aru-tags 존재 → 디코딩 → 정확 URL 소유자 → 캐시 → 검색 색인 순으로 대조 |
| Mozilla 경고 9개 | 모두 UNSAFE_VAR_ASSIGNMENT, 동적 innerHTML 대입. 일반 lint 오류 0, strict lint 실패 | HTML 읽기/편집기 복원/미리보기 생성 흐름을 각각 검토하는 별도 PR. 경고를 비활성화하거나 삽입 코드를 일괄 치환하지 않음 |
| 역사적 테스트 96개 실패 | 이전 자료/경로와 과거 UI 가정 의존. main과 동일 집계 | 필요한 fixture를 재배포할 수 있는지 확인하고 별도 테스트 정비 PR. 기대값만 바꾸지 않음 |
| Android MV3·실기기 UX | 현재 Manifest/최소 버전 유지, 새 권한 없음. 합성 화면만 검증 | 실제 Firefox 버전의 API/권한 허용·키보드·회전·태그·취소·삽입 확인 |
| 기존 삽입/Native Host | 구현 보존, 설치 확장 실환경 검증 없음 | PC Firefox/Whale의 빈 댓글·답글·Summernote에서 삽입/undo/대상 보존 테스트. 등록 금지 |
| a6087a7 원본 객체 | ZIP에는 Git 연결 파일만 있고 원격에서도 객체를 찾지 못함 | 원본 PC에서 Git bundle/객체를 확보할 수 있으면 복구 스냅샷과 대조. 현재 이력 재작성 금지 |

Mozilla 경고 위치(이번 빌드): bundle-generator bridge 3개, icon-metadata bridge 1개, icon-metadata content 1개, ruliweb-icons composer-bridge 1개, bundle-generator content 3개. 경고는 실제 취약점이 확인됐다는 판정과 다르지만 안전성이 입증됐다는 뜻도 아니다. 동적 콘텐츠의 출처와 허용 HTML을 확인하고 댓글/답글/Summernote의 undo·기존 내용 보존을 검증한 뒤 수정한다.

완료된 태그 상태 수정과 자동 검증 결과는 [통합 기록](ANDROID-INTEGRATION.md)에 있다. 큰 HTML 처리 변경은 이 모바일 UX PR에 섞지 않는다.
