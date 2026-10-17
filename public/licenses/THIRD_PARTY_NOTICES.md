# 라이선스와 에셋 고지

## 자체 소스와 공개용 그래픽

소유자의 2026-10-12 승인에 따라 자체 확장 JavaScript·HTML·CSS·문서·빌드 스크립트와 직접 생성한 기하학 PNG에 MIT를 적용합니다. 제3자 라이브러리·폰트·외부 미디어·캐릭터 에셋에는 자체 LICENSE를 적용하지 않습니다. 이 문서는 저작권 이전이나 제3자 그림의 사용 허락을 의미하지 않습니다.

기하학 PNG 생성기는 `tools/create-placeholders.mjs`에 남겨 두었습니다. 이번 버전은 소유자가 2026-10-15 공개 재배포 권한을 확인한 기존 캐릭터 PNG를 사용합니다. 고지는 [캐릭터 에셋 안내](https://github.com/sdh-dot/aru-source-captioner/blob/183784c52be8916bc764626c6bbcbec104816eba/docs/CHARACTER-ASSETS-NOTICE.md), 파일별 출처·해시는 `docs/CHARACTER-ASSET-PROVENANCE.json`을 확인하세요. 캐릭터 PNG에는 MIT를 적용하지 않습니다. 원본 시트·설명 패널·아이콘 공유 게시글의 실제 이미지·동영상·과거 실사용 스크린샷은 포함하지 않습니다. 팩 목록에 존재하는 공개 게시글 URL은 참조이며 원본 미디어의 소유권이나 재배포 허락을 주장하지 않습니다.

## 배포에 포함된 라이브러리

| 구성 요소 | 출처 | 라이선스 | 고지 파일 |
|---|---|---|---|
| exifr 7.1.3 full UMD | [공식 저장소](https://github.com/MikeKovarik/exifr/tree/v7.1.3) | MIT | 각 브라우저 `lib/exifr.LICENSE` |
| Pretendard Variable | [공식 저장소](https://github.com/orioncactus/pretendard) | SIL OFL 1.1 | 각 브라우저 `assets/fonts/OFL.txt` |

exifr의 원래 저작권 고지와 Pretendard의 고지·Reserved Font Names를 그대로 유지합니다. Pretendard 파일을 수정하거나 다른 라이선스로 재허락하지 않습니다. 공식 버전과 파일 해시는 `docs/vendor-integrity.json`에 기록합니다. Chromium exifr는 공식 파일에 마지막 줄바꿈만 추가된 사본입니다. **기존 Firefox 제출본의 exifr에는 선택적 Node/webpack 의존성 로더를 비활성화한 수정과 BOM이 있습니다.** 이를 변경 없는 공식 배포본이라고 표시하지 않습니다. `tools/build.mjs`는 같은 수정본을 재생성합니다. MIT 고지는 그대로 유지하며 Mozilla의 수정 라이브러리 심사 적합성은 별도 확인이 필요합니다. MIT 자체 소스와 각 라이브러리의 별도 조건을 구분합니다.

## 개발 전용 의존성

jsdom 26.1.0, jQuery 3.7.1, addons-linter 10.14.0은 npm에서 버전을 고정해 설치합니다. `node_modules`는 Git 및 확장 배포에 포함하지 않습니다. 각 패키지와 전이 의존성의 라이선스 파일은 설치본에 유지되며, 재배포가 필요하면 해당 고지를 검토해야 합니다. package-lock.json의 URL·무결성 값으로 설치 입력을 고정합니다.

ESM 호환 스크립트 생성에는 esbuild 0.28.2(MIT, Copyright © 2020 Evan Wallace), 구문·의존성 조사에는 Acorn 8.19.0(MIT, Copyright © 2012–2022 various contributors)을 사용합니다. 두 도구와 플랫폼별 esbuild 실행 파일은 개발 의존성이며 확장에 포함하지 않습니다. 설치본의 `esbuild/LICENSE.md`, `acorn/LICENSE` 및 `acorn/AUTHORS`를 유지합니다. 출처는 [esbuild](https://github.com/evanw/esbuild), [Acorn](https://github.com/acornjs/acorn)입니다.

ArU Archive Native Host와 ExifTool 등 데스크톱 실행 파일은 이 저장소의 배포 대상이 아닙니다. 해당 구성 요소의 라이선스나 사용 허락을 이 저장소의 MIT로 확장하지 않습니다.
