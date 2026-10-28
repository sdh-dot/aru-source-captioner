# Historical A안 — 승인 의존성 profile 분리

## 목적과 불변 기준

referenceCommit `50a64edae5a73fe6269367545b178656fbfdf5ee`와 해당 Git tree `37a825fbe0b8ec0ca3d2422c4658909abc989a56`를 유지한다. 기존 `tools/ci/baseline.json`은 변경하지 않는다. 원본 lock SHA256 `b0b629db704d55d77fc3b1dd0bacf0d861939e533eee33882c1f4c5b96001635`, Historical identity·96개 실패(기존 94 + legacy-context 실행 불가 2), Firefox 경고 identity 9개를 그대로 사용한다.

기존 guard는 reference/current lock이 직접 같은 것을 요구했다. 패치 후에는 원본 reference의 lock과 제품 소스를 먼저 검증하고, 별도 `dependency-profile.json`에 명시한 승인 lock/package hash를 reference와 candidate에 동일 적용한다. 원본 형상 검증과 실행 의존성 검증을 각각 유지하므로 단순 baseline hash 갱신과 다르다.

## 정확한 실행 순서

1. `assertBaselineContract`가 고정 reference, 기존 baseline 원본 lock hash, 명시 profile 및 candidate package/lock hash를 검사한다. 승인 patch 목록은 Vite 8.1.5→8.1.6, fast-uri 3.1.8→3.1.9, undici 7.30.0→7.30.1로 제한한다.
2. 고정 commit의 tree ID와 `git ls-tree` blob inventory를 조회한다. `git archive`로 추출한 reference의 모든 파일을 실제 Git blob hash와 대조하고 누락·변조·추가 파일을 거절한다. 원본 lock hash도 기존 baseline과 같아야 한다.
3. `assertApprovedDependencyDelta`가 원본과 승인 package/lock의 의미상 diff를 검사한다. Vite root pin과 세 node entry의 version/resolved/integrity 외에는 변화를 허용하지 않는다. 새 패키지·override·다른 전이 변경·package scripts 변경은 실패한다.
4. 임시 reference에 승인된 package.json/package-lock.json만 적용한다. 제품·테스트 파일은 원본 blob을 유지한다. candidate는 현재 추적 파일을 복사한다. 양쪽 package/lock 바이트 hash가 동일한 명시 profile이어야 한다.
5. 실제 설치의 모든 존재 package version과 hidden lock integrity를 승인 lock에 대조한다. 필수 package 누락은 실패하고, platform optional 누락은 명시 기록한다. `npm ls --all --json`도 성공해야 한다.
6. reference/candidate의 node_modules를 동일한 검증된 물리 설치 경로에 연결한다. 양쪽에서 원래 Historical suite와 reporter를 실행한다. 원시 exit·모든 test identity·summary·실패 목록을 저장한다.
7. 실행 후에도 제품 소스·profile·설치 version/integrity 및 hidden lock hash를 다시 확인한다. 허용된 실행 출력은 node_modules 연결과 docs/results뿐이다. 현재 runId, reference tree, 원본/실행 lock, 설치 inventory를 `historical-integrity.json`에 기록한다.
8. 기존 `compareHistorical`을 그대로 사용한다. reference가 기존 기대값과 다르거나 candidate에 신규 실패·identity 누락·skip/cancel/todo가 있으면 실패한다. runner도 현재 run의 raw 결과·log·설치 tree·integrity 증적을 요구하고 comparison을 재검산한다. 성공 comparison 파일 하나만으로 통과하지 않는다.

## 보안 보장 비교

| 항목 | 이전 | A안 |
|---|---|---|
| reference 고정 | commit 고정 | 동일 commit + tree + 전 파일 blob 검증 |
| 의존성 동일성 | 원본 reference와 candidate lock hash 동일 | 원본 lock 검증 후 양쪽 명시 승인 profile hash 동일 |
| 변경 허용 범위 | lock 변경 불가 | 승인 세 patch 필드만 허용 |
| 실제 설치 검증 | 공유 node_modules 연결 | package version·hidden lock integrity·npm tree + 동일 물리 경로 |
| 제품/테스트 원본 | archive로 추출 | 적용 전후 및 실행 후 blob 재검증 |
| 실패·identity 비교 | 기존 comparator | comparator 그대로 유지 |
| 증적 누락 | comparison status 확인 | raw log/JSON·설치 tree·integrity·현재 runId 및 comparison 재검산 |

hash는 실행 중 자동 생성·수락하지 않는다. profile 변경에는 별도의 코드 리뷰와 승인 변경이 필요하다. Git 객체 및 CI 코드 자체를 악의적으로 함께 변경하는 경우의 최종 신뢰 경계는 저장소 리뷰·브랜치 보호다. 이 구현은 node_modules의 모든 소스 바이트를 다시 해시하는 공급망 검증기가 아니며, npm ci의 registry integrity와 설치 metadata를 기반으로 한다.

## 음성 테스트 및 검증 계획

`dependency-profile.test.mjs`에서 다른 lock/package hash, reference 또는 patch 버전 변경, baseline hash 단순 갱신, profile 누락, 승인 밖 dependency/제품 package 변경, reference 파일 변조·누락·추가, 설치 누락, stale/missing 실행 증적, comparison-only 위장, 신규 Historical 실패의 실제 runner exit 실패를 확인한다. 기존 `quality-gates.test.mjs`의 모든 실패·identity·누락 검사를 유지한다.

R04 20 Gate를 직렬 실행하고, 변경 전후 audit identity·실제 dependency tree·Node24·3종 빌드·TypeScript/ESM/통합/전체/RC3 및 A01/A02/F01/R01/R02/R03/I02 결합 회귀를 확인한다. Historical은 raw FAIL 96, Firefox는 경고 9를 숨기지 않는다. 실제 GitHub Actions와 사이트 로그인·게시·업로드·브라우저 E2E는 NOT RUN이다.

## 변경 경계

제품 기능·Registry·Context Gate·BFCache·Picker·저장/이벤트/메시지 계약·Manifest/권한·Fixture·기존 기대값을 변경하지 않는다. 정책 구현은 CI helper/profile/음성 테스트와 이를 호출하는 workflow만 바꾼다. 기준선 또는 제품 결함이 발견되면 기대값을 완화하지 않고 중단한다.
