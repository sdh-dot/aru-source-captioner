# 재현 가능한 빌드

Android 개발 브랜치는 `git clone --branch fix/android-firefox-loading-ux https://github.com/sdh-dot/aru-source-captioner.git`로 **새 폴더**에 받는다. 기존 작업 폴더를 덮어쓰지 않는다. Node 24에서 아래 명령을 실행하며 추가 전역 npm 모듈은 기본 검증에 필요하지 않다. 이번 재검증 버전은 Node 24.20.0 / npm 11.19.0이다. [통합 기록](ANDROID-INTEGRATION.md), [모바일 수동 절차](MOBILE-MANUAL-TESTING.md)를 함께 확인한다.

Windows PowerShell, Linux, macOS에서 Node.js 24 / npm을 사용합니다. 검증에 사용한 정확한 버전은 VALIDATION.md에 기록합니다. Python·개인 폴더·이전 버전 ZIP·전역 npm 모듈·API 키가 필요하지 않습니다.

```sh
npm ci --ignore-scripts
npm run build
npm run verify
npm test
npm run lint:firefox
npm run package:firefox
```

`npm run build`는 `docs/source/`의 읽을 수 있는 소스를 순서대로 연결해 두 브라우저의 선택기·태그·통합 JS를 생성합니다. 생성 파일도 Git에 포함하므로 빌드 후 `git diff --exit-code -- firefox whale`로 차이를 확인할 수 있습니다. 두 번 빌드한 파일의 해시가 같아야 합니다. 정적 공개용 PNG를 새로 만들 필요가 있는 경우만 `node tools/create-placeholders.mjs`를 사용합니다.

출처 캡션·브라우저별 background/options·본문 다운로드·읽을 수 있는 MAIN 메타데이터 브리지의 직접 소스는 브라우저 폴더에 보관합니다. 이를 빌드 시 다른 이전 버전에서 가져오지 않습니다. 제3자 exifr UMD의 Chromium 사본은 공식 7.1.3 코드입니다. 기존 Firefox 사본에는 선택적 의존성 로더를 비활성화한 수정이 있어 `tools/build.mjs`에서 재현하며, 원래 라이선스와 수정 내역·무결성 기록을 제공합니다. 수정 라이브러리에 대한 Mozilla 심사 적합성은 별도 확인이 필요합니다.

빌드 출력은 `firefox/`와 `whale/`이며 각각 Manifest가 폴더 최상단에 있습니다. Firefox 패키징 ZIP은 추적하지 않는 `dist/firefox/`에 생성합니다. Chromium 스토어 제출용 ZIP도 `whale/`의 **내용물**만 압축하고 루트의 문서·node_modules·과거 버전을 넣지 않습니다.

## Mozilla 심사용 소스

심사 시 이 저장소의 해당 commit 전체를 소스 패키지로 전달하고 README·이 문서·package-lock.json을 포함합니다. 확장 ZIP은 별도입니다. 빌드 후 Firefox 파일을 제출 ZIP과 비교하세요. 이 공개 후보는 제출 RC3에서 캐릭터 PNG를 대체한 변형이므로 기존 캐릭터 포함 제출 ZIP과는 일치하지 않습니다. 공개용 빌드를 그대로 새 제출할 때에만 동일 소스·패키지 쌍으로 사용할 수 있습니다.

원본 제출본을 재현하려고 권한이 불명확한 그림을 공개 소스에 다시 넣지 마세요. 그 제출본의 심사용 그림 전달 권한과 소스 패키지는 별도 확인이 필요합니다. 서명 키·심사 토큰·로그인 정보는 포함하지 않습니다.

[Mozilla 공식 요구사항](https://extensionworkshop.com/documentation/publish/source-code-submission/)은 심사자가 같은 코드를 재생성할 수 있는 정확한 빌드 절차를 요구합니다. 빌드 성공은 스토어 심사 승인이나 실제 브라우저 기능 검증을 의미하지 않습니다.
