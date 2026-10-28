# 보안 패치 회귀 검증 결과

2026-10-28 19:49:48 KST / 환경 Node v24.15.0, npm 11.12.1, Windows. 실제 GitHub Actions는 **NOT RUN**.

## R04 전체 20 Gate

| Gate | 상태 | 테스트 수 |
|---|---|---:|
| install | PASS | — |
| prepare-wxt | PASS | — |
| typecheck | PASS | — |
| lint | PASS | — |
| format | PASS | — |
| ci-tests | PASS | 45 |
| typescript | PASS | 399 |
| esm | PASS | 51 |
| integration | PASS | 4 |
| regression | PASS | 111 |
| rc3 | PASS | 59 |
| build | PASS | — |
| verify | PASS | — |
| verify-wxt | PASS | — |
| verify-typescript | PASS | — |
| verify-esm | PASS | — |
| audit-esm | PASS | — |
| generated | PASS | — |
| historical | KNOWN_FAILURES | — |
| firefox-lint | KNOWN_WARNINGS | — |

집계 PASS는 18개 PASS 및 Historical KNOWN_FAILURES·Firefox KNOWN_WARNINGS를 포함한 **로컬 정책 통과**다. Historical raw 전체 PASS가 아니다. 기존 실패 94 + 실행 불가 2, 신규 0이며 Firefox 경고 9, 신규 0이다. 실행 누락은 없다.

## 결합 회귀·빌드·제품 계약

A01/A02/F01/R01/R02/R03/I02에 대응하는 source-input-validation, comment-source-selection, pixiv-filename, settings-read, document-lifecycle, context-effect-gate, picker-cleanup, png-realm-boundary, integration-stabilization 9개 파일을 직렬 실행해 **321/321 PASS**, skip/cancel/todo 0을 확인했다. 각 원래 테스트 기대값은 유지했다.

Chrome·Firefox·Whale 빌드는 모두 성공했고 각각 45/45/45개 파일을 기록했다. I03-E 로컬 산출물 hash 비교의 변경 파일 수는 Chrome 0, Firefox 0, Whale 0다. 이 비교는 이전 로컬 산출물과의 비교이며 실제 원격/배포 ZIP/XPI 검증은 아니다.

제품 src/entrypoints/runtime/config, 출처 파싱·Registry·Context Gate·BFCache·Picker, 기존 Fixture·기대값·저장/이벤트/메시지 계약, Manifest/권한/World 원본을 변경하지 않았다. classic/WXT Manifest·리소스·World, TS/ESM 생성물 및 tracked/untracked 생성물 drift Gate가 통과했다. baseline.json과 model.mjs도 byte 그대로다. 원본 549개 파일 중 허용된 package/CI 파일 외 변경은 0개다.

## 잔여·미검증

- npm audit는 deepmerge 관련 low 2그룹/1 GHSA가 남아 exit 1이다. 승인한 세 패키지와 moderate/high는 제거됐다.
- 실제 GitHub Actions, Linux 원격 runner, Native Host, Android 실기기, 실제 브라우저 E2E·업그레이드·로그인/작성기 게시·업로드는 NOT RUN.
- 실제 공격 재현과 잔여 deepmerge의 소비 입력 도달성은 NOT RUN/미검증.
- node_modules의 모든 소스 바이트를 재해시하지는 않았으며 npm ci registry integrity와 package version/hidden lock integrity에 의존한다.
- 로컬 검증 후 중단한다. Push·PR 수정·main 병합·태그/Release·실제 배포는 수행하지 않는다.
