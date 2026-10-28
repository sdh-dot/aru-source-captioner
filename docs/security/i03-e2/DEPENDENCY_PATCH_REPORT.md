# I03-E2 의존성 보안 패치 보고서

2026-10-28 19:49:48 KST / 로컬 구현·검증 완료. 원격 GitHub Actions와 Push는 NOT RUN.

## 실제 변경

| 패키지 | 이전 → 이후 | 방식·호환성 |
|---|---|---|
| Vite | 8.1.5 → 8.1.6 | 직접 dev exact pin 및 lock. WXT 0.21.3 peer 범위 충족 |
| fast-uri | 3.1.8 → 3.1.9 | Ajv 8.20.0의 ^3.0.1 안에서 lock resolution만 변경 |
| undici | 7.30.0 → 7.30.1 | Cheerio 1.2.0의 ^7.19.0 안에서 lock resolution만 변경 |

루트 package.json의 devDependencies.vite와 package-lock.json의 root pin 및 세 node entry version/resolved/integrity만 변경했다. npm view의 정확한 공개 registry metadata로 최소 필드를 갱신하고 npm ci --ignore-scripts 및 실제 설치 tree로 검증했다. install 후 lock hash도 불변이다. 세 패키지의 dependency/peer/optional/engine/bin 선언은 이전과 같았다. 추가 전이 버전 변경·신규 패키지·override는 0개다. Node v24.15.0, npm 11.12.1, Windows에서 검증했다.

## audit와 잔여 위험

| 시점 | low | moderate | high | critical | 패키지 그룹 | 고유 GHSA |
|---|---:|---:|---:|---:|---:|---:|
| 변경 전 2026-10-28 | 2 | 1 | 2 | 0 | 5 | 18 |
| 변경 후 | 2 | 0 | 0 | 0 | 2 | 1 |

승인 대상 세 패키지의 현재 GHSA 17개가 모두 사라졌다. I03-E의 원래 12개 외에 추가된 undici 권고 5개도 같은 승인 패치로 해결됐다. 변경 후 새로 생긴 GHSA는 0개다. 원본 JSON과 정확한 identity 차이는 증적의 audit-identity-comparison.json에 있다. 전후 audit exit는 모두 1이며, 후자는 잔여 low 때문에 0이 아니다.

잔여 2그룹은 deepmerge 4.3.1 및 이를 소비하는 addons-linter의 metapackage이며 **고유 권고는 1개**([GHSA-gcqx-w48m-w2h4 / CVE-2026-93753](https://github.com/advisories/GHSA-gcqx-w48m-w2h4))다. 공식 권고는 반환 객체의 prototype poisoning이며 수정 버전을 제시하지 않는다. 이 항목은 변경 전부터 있었고 이번 세 패치로 추가된 것이 아니다. audit가 제안하는 addons-linter 1.15.1로의 breaking downgrade는 수행하지 않았다. 실제 소비 입력의 도달성·배포 영향은 이번 범위에서 추가 조사하지 않았으며 안전하다고 단정하지 않는다. 별도 조사·처리 승인이 필요하다.

## 커밋과 파일

- 의존성 커밋: 7597be2cb2035afada42cb4e0ef6de298eda1cb3 — fix: 승인된 세 의존성 보안 패치 적용
- CI 커밋: 9c5aedb891d848c40ae6eda6e6880e8135007808 — fix: 승인 의존성 프로필로 Historical 기준선 무결성 보존
- 의존성 파일: package.json, package-lock.json
- CI 파일: .github/workflows/ci.yml, tools/ci/baseline-gates.mjs, tools/ci/run-command.mjs, tools/ci/dependency-profile.json, tools/ci/dependency-profile.mjs, tools/ci/dependency-profile.test.mjs
- 설계: docs/security/i03-e2/BASELINE_POLICY_DESIGN.md

제품 기능·Fixture·기존 기대값·Manifest/권한은 변경하지 않았다. root profile lock SHA256은 bc95eed29ffd39d481903a44fac86c05aea0fad63dc4ca6bf2719c865fdd67bf이다. 검증 상세는 SECURITY_REGRESSION_RESULTS.md, BASELINE_INTEGRITY_TESTS.md를 따른다.
