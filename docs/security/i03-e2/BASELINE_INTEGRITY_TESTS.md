# 기준선 무결성·음성 테스트

2026-10-28 19:49:48 KST

기존 quality-gates.test.mjs와 새 dependency-profile.test.mjs **45개 모두 PASS**, skip/cancel/todo 0이다. 기존 comparator와 baseline.json은 바꾸지 않았다.

| 차단 조건 | 검증 결과 |
|---|---|
| 다른 lock/package/profile hash, reference, 승인 patch 버전 변경, profile ID 누락 | 예외로 거절 |
| baseline 원본 hash를 새 profile hash로 단순 갱신 | BASELINE_CONTRACT_DRIFT |
| reference/candidate dependency profile 불일치 | 실제 CI runner exit 1, BASELINE_DEPENDENCY_DRIFT |
| 승인 밖 전이 의존성 또는 package scripts 변경 | UNAPPROVED_DEPENDENCY_CHANGE |
| reference 파일 변조·누락·추가 또는 빈 inventory | blob 검사 실패 |
| 고정 reference 실제 Git archive를 추출하고 파일 변조 | 실제 CI runner exit 1, BASELINE_SOURCE_DRIFT |
| profile 적용 후 제품 파일 변조 | BASELINE_SOURCE_DRIFT |
| 필수 설치 누락 | INSTALLED_DEPENDENCY_MISSING |
| 실행 중 node_modules 연결이 다른 물리 설치로 변경 | INSTALLED_PROFILE_NOT_SHARED |
| 현재 run의 integrity/raw 증적 누락 또는 stale runId | 실패 |
| 성공 comparison만 쓰고 실행 증적 생략 | runner FAIL |
| 신규 Historical 실패 | 실제 CI runner exit 1, HISTORICAL_FAILURE_DRIFT |
| 기존 실패 제거·동수 다른 실패·identity 누락·skip/cancel/todo·가짜 exit/summary | 기존 테스트 모두 유지·PASS |
| Firefox 오류·새 경고·경고 위치 drift·누락·비정상 exit | 기존 테스트 모두 유지·PASS |

음성 테스트가 의도적으로 발생시킨 runner FAIL/exit 1은 예상된 차단 결과이며 실제 Gate 실패와 구분한다. 양성 Historical Gate의 원본 reference 508개 파일과 candidate 553개 파일을 적용·실행 전후 검증했다. 설치 package 341개와 integrity를 확인했고 platform optional 누락 92개를 기록했다. 두 실행은 같은 물리 node_modules를 공유했다.

Historical 원시 결과는 reference/candidate 모두 exit 1, 기존 실패 94 + legacy-context 실행 불가 2, 신규 실패 0이다. 원래 identity·실패 목록을 그대로 비교했다. source blob·원본/승인 lock·runId·raw log/JSON·설치 tree 증적을 요구하며 자동 hash 수락은 없다. 증적: ci-quality/historical-integrity.json, historical-{reference,candidate}.{json,log}, historical-installed-tree.json, commands/gate-ci-tests-runner-proof.*.
