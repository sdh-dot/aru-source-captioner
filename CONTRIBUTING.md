# 기여 가이드

이 저장소의 최신 통합 개발 기준은 [`integration/aru-wxt`](https://github.com/sdh-dot/aru-source-captioner/tree/integration/aru-wxt)이며, 검토 중인 변경은 [Draft PR #6](https://github.com/sdh-dot/aru-source-captioner/pull/6)입니다. `main`은 기존 공개 기준으로 유지합니다. PR #4·#5는 통합 출처이며 아직 별도로 열려 있습니다.

## 개발 절차

1. 작업 목적에 맞는 기준 브랜치를 확인하고 Fork 또는 별도 작업 브랜치를 생성합니다.
2. Node.js 24 이상에서 `npm ci --ignore-scripts`와 `npm run prepare:wxt`를 실행합니다.
3. **직접 관리하는 제품 원본은 `src/**/*.ts`**이며 WXT 진입점은 `entrypoints/`, Manifest 구성은 `config/`와 `wxt.config.ts`에 있습니다. `docs/source/**/*.mjs`, `shared/` 호환 출력, `firefox/`·`whale/` classic JavaScript, `.output/` 생성물은 직접 수정하지 않습니다.
4. 필요한 기능을 수정하고 아래 검증을 실행합니다. 생성물 변경이 필요하면 빌드 도구로 갱신합니다.
5. Firefox·Chromium·Whale을 별도 테스트 프로필에서 검증하고, 실제 사이트·MOCK·미검증 항목을 구분합니다.
6. 의도한 소스와 필수 생성물만 커밋하고 자신의 브랜치에 Push합니다. 외부 개발자의 브랜치·PR을 임의로 수정하지 않습니다.
7. PR에는 변경 목적·주요 내용·검증 결과·미검증 사항을 적습니다. **커밋과 PR 제목·본문은 한국어를 기본**으로 하되 `feat:`, `fix:`, `refactor:` 등의 접두어와 코드 식별자·기술 용어는 영어로 유지할 수 있습니다. 별도 언어 요청이 있으면 해당 요청을 따릅니다.

## 주요 검증

```sh
npm run typecheck
npm run format:check
npm run lint
npm run test:typescript
npm run test:esm
npm run test:integration
npm test
npm run build
npm run verify:wxt
npm run verify:esm
npm run audit:esm
```

`npm run build`는 기존 classic 호환 출력과 WXT Firefox·Chromium·Whale 빌드를 함께 생성합니다. 개발용 WXT 출력은 `.output/firefox-mv3/`, `.output/chrome-mv3/`, `.output/whale-mv3/`입니다. Firefox는 `about:debugging#/runtime/this-firefox`에서 해당 Manifest를 임시 로드하며, Chromium 계열은 확장 관리 화면에서 빌드 디렉터리를 로드합니다.

기존 Historical 테스트 실패 94건과 Firefox classic Lint 경고 9건은 별도로 추적합니다. 기존 실패를 숨기거나 테스트 기대값을 기능 검증 없이 변경하지 마세요. 기존 사용자 설치 업그레이드, Android 실기기, Native Host, 로그인 작성기 업로드는 아직 검증되지 않았습니다.

## 호환성과 협업

`aru-tags:v1`, `ruricon:v1`, 저장 키·옵션·확장 ID, MAIN/ISOLATED World 이벤트 계약 및 브라우저별 Manifest 권한을 보존합니다. 외부 입력은 TypeScript 타입 단언만으로 신뢰하지 않고 런타임 검증을 유지합니다.

[제품 원본 구조](src/README.md), [WXT 통합 기록](docs/architecture/wxt-unification-report.md), [공개 API·연결 안내](docs/architecture/esm-wxt-integration.md), [수동 검증 안내](docs/MANUAL-TESTING.md)를 참고하세요. 이전 개발 형상의 결정과 테스트 근거는 삭제하지 않고 기록으로 보존합니다.

허락되지 않은 캐릭터 그림·원본 아이콘팩·사용자 데이터는 커밋하지 않습니다. 신규 의존성은 라이선스와 고지를 확인하고, 취약점은 [SECURITY.md](SECURITY.md)의 비공개 제보 경로를 사용합니다. 외부 PR의 리뷰 답변과 대외 소통은 저장소 소유자가 직접 담당합니다.
