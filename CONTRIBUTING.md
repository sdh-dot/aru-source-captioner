# 기여 가이드

누구나 Fork와 Pull Request로 기여할 수 있습니다. 원본 저장소의 쓰기 권한은 자동으로 부여되지 않습니다.

1. 저장소를 Fork하고 자신의 Fork를 clone합니다.
2. `git switch -c fix/short-description`으로 작업 브랜치를 만듭니다.
3. `npm ci --ignore-scripts` 후 수정합니다. 아이콘·태그·통합 UI와 다운로드의 원본은 `docs/source/`의 `.mjs`입니다. 브라우저별 출처 캡션·옵션·Background 원본은 `docs/source/platform/{firefox,whale}/`에 있습니다. 브라우저 폴더의 JavaScript는 생성물입니다.
4. `npm run build`, `npm run verify`, `npm test`, `npm run lint:firefox`를 실행합니다. `npm run test:historical`의 기존 실패와 신규 실패도 구분해 기록합니다.
5. 실제 기능 변경이면 별도 프로필에서 [수동 검증](docs/MANUAL-TESTING.md)을 합니다. 게시글·댓글을 자동 등록하지 않습니다.
6. 의도한 소스와 생성된 파일만 commit하고 Fork의 브랜치에 push합니다.
7. 원본 `main`을 대상으로 PR을 열어 변경 목적·테스트 결과·미검증 사항을 적습니다.
8. 리뷰에 따라 보완하면 소유자 또는 승인된 유지보수자가 반영합니다.

ESM 전환 범위는 [통합 안내](docs/architecture/esm-wxt-integration.md)를 따릅니다. 해당 `.mjs`와 `docs/source/compat`만 수정하고 자동 생성 안내가 있는 `.js`와 브라우저 번들은 `npm run build`로 갱신합니다. `npm run test:esm`, `npm run verify:esm`, `npm run audit:esm`으로 데이터 동등성·생성물 일치·전환 모듈의 순환 의존성을 확인합니다.

테스트의 기대값만 바꾸거나 실패를 숨기지 마세요. 새 브라우저 권한과 메타데이터 규격 변경은 이유와 호환성 검토를 포함해야 합니다. 기존 ID·사용자 설정·캐시·Native Host 연결을 보존하세요.

허락이 확인되지 않은 캐릭터 그림·원본 아이콘팩·실제 사용자 자료는 commit하지 않습니다. 새 의존성에는 버전 고정·라이선스 고지가 필요합니다. 취약점은 공개 PR/Issue보다 SECURITY.md의 비공개 경로를 우선합니다.
