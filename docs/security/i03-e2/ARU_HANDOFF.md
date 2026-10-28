# 아루 기술 인계 — I03-E2

**로컬 구현·검증·커밋 완료. 다음 작업은 아루의 기술 수락 및 별도 승인 대기.**

작업 브랜치: security/i03-e2-minimal-patches

작업 checkout: C:\Users\seodh\Documents\Codex\2026-10-26\task\i03e2-worktree

보존 기준: integration/aru-stabilization-verified / ce9260883ab82bbe5525609d28ca80f75951278a

## 결과

- Vite 8.1.6, fast-uri 3.1.9, undici 7.30.1만 적용. 추가 전이 버전/패키지/override 0.
- 의존성 커밋 7597be2cb2035afada42cb4e0ef6de298eda1cb3
- CI 커밋 9c5aedb891d848c40ae6eda6e6880e8135007808
- 보고서 커밋은 자기 SHA 순환을 피하기 위해 최종 외부 인계 영수증에 기록한다.
- 현재 audit 5그룹(중간1·높음2·낮음2) → 낮음2그룹. 대상 세 패키지의 GHSA 17개 제거, 새 GHSA 0. 잔여는 deepmerge 1 GHSA이며 audit 0이 아니다.
- R04 20 Gate: 18 PASS + Historical KNOWN_FAILURES + Firefox KNOWN_WARNINGS. TypeScript399/ESM51/통합4/전체111/RC3 59, 결합321, CI 자체·음성 테스트45 모두 PASS.
- Historical 기존94 실패 + legacy-context 실행 불가2의 identity 유지, 신규0. Firefox 경고9의 identity 유지, 신규0.
- Chrome/Firefox/Whale 빌드 및 생성물·Manifest·권한·World 계약 검증 통과. 제품 source/Fixture/기존 기대값 변경 없음.

## A안 수락 포인트

기존 referenceCommit·원본 baseline.json·실패 identity를 유지하고, 명시된 승인 dependency profile을 양쪽에 적용했다. 고정 Git tree와 전 파일 blob을 적용 전후/실행 후 대조하고, package/lock diff를 승인 세 patch로 한정했다. 실제 설치 tree/version/integrity와 같은 물리 node_modules 연결을 검증한다. 서로 다른 profile·고정 archive 변조·신규 Historical 실패는 실제 runner exit 1로 차단했고, 증적 누락·stale run·comparison-only 위장도 실패시킨다. guard 삭제나 hash 자동 수락은 없다.

## 다음 결정

1. 아루가 BASELINE_POLICY_DESIGN.md와 핵심 CI diff 및 위 차단 증적을 기술 수락할지 판단한다.
2. low 잔여 GHSA-gcqx-w48m-w2h4의 별도 조사/처리 범위를 결정한다. 고정된 새 패치 버전은 공식 권고에 없으며, 임의 downgrade나 broad update는 하지 않았다.
3. 실제 원격 CI 실행을 위해 보안 브랜치를 Push할지는 사용자 별도 승인이 필요하다. 승인 전 Push/PR 수정/main 병합/Release/사이트 게시·업로드 및 후속 Phase를 진행하지 않는다.

Windows 로컬 외의 실제 GitHub Actions와 Linux·브라우저/실기기 환경, 실제 공격 성공·잔여 도달성은 미검증이다. 외부 인계 ZIP에는 핵심 diff·보고서·정제 원본 audit·명령/시간/exit code·raw Historical/Firefox 및 무결성 증적을 포함하며 node_modules/cache/배포 ZIP/XPI는 넣지 않는다.
