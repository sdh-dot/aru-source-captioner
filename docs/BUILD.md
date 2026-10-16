# 재현 가능한 빌드

Windows PowerShell, Linux, macOS에서 Node.js 24 / npm을 사용합니다. 이번 Firefox 1.0.4 / Whale 0.1.3 개발본의 검증 환경은 Node.js **24.15.0**, npm **11.12.1**입니다. [현재 결과](UPLOAD-ATTRIBUTION-RESULTS.md)와 최초 공개 후보의 VALIDATION.md를 구분합니다. Python·개인 폴더·이전 버전 ZIP·전역 npm 모듈·API 키가 필요하지 않습니다.

```sh
npm ci --ignore-scripts
npm run build
npm run verify
npm test
npm run lint:firefox
npm run package:firefox
npm run package:chromium
```

`npm run build`는 `docs/source/`의 읽을 수 있는 소스를 순서대로 연결해 두 브라우저의 선택기·태그·통합 JS를 생성하고 공통 업로드·출처 모듈을 복사합니다. 생성 파일도 Git에 포함하므로 빌드 후 `git diff --exit-code -- firefox whale`로 차이를 확인할 수 있습니다. 두 번 빌드한 파일의 해시가 같아야 합니다. 현재 캐릭터 에셋은 그대로 포함되며 플레이스홀더 생성기는 정상 빌드에 실행하지 않습니다.

출처 캡션·브라우저별 background/options·본문 다운로드·읽을 수 있는 MAIN 메타데이터 브리지의 직접 소스는 브라우저 폴더에 보관합니다. 이를 빌드 시 다른 이전 버전에서 가져오지 않습니다. 제3자 exifr UMD의 Chromium 사본은 공식 7.1.3 코드입니다. 기존 Firefox 사본에는 선택적 의존성 로더를 비활성화한 수정이 있어 `tools/build.mjs`에서 재현하며, 원래 라이선스와 수정 내역·무결성 기록을 제공합니다. 수정 라이브러리에 대한 Mozilla 심사 적합성은 별도 확인이 필요합니다.

빌드 출력은 `firefox/`와 `whale/`이며 각각 Manifest가 폴더 최상단에 있습니다. Firefox 패키징 ZIP은 추적하지 않는 `dist/firefox/`에 생성합니다. Chromium 스토어 제출용 ZIP도 `whale/`의 **내용물**만 압축하고 루트의 문서·node_modules·과거 버전을 넣지 않습니다.

## Mozilla 심사용 소스

README·이 문서·package-lock.json·빌드 소스가 포함된 정확한 제출 버전의 소스를 준비합니다. 확장 ZIP은 별도입니다. 빌드 후 Firefox 파일을 제출 ZIP과 비교하세요. 버전만 다른 기존 제출본이나 스토어 서명본이 현재 개발 ZIP과 같다고 가정하지 않습니다.

현재 캐릭터 공개 재배포 권한은 소유자가 확인했으며 MIT와 구분합니다. exifr 7.1.3 UMD는 제3자 배포 코드이고 Firefox의 선택적 로더 수정은 이 빌드에서 재현합니다. 심사자가 제3자 라이브러리의 압축 전 원본과 그 빌드 자료를 요구하는 경우 이를 별도 포함해야 합니다. 이 저장소의 빌드 일치 검사만으로 AMO의 모든 원본 소스 요구가 충족되거나 심사가 승인됐다고 주장하지 않습니다. 기존에 준비한 0.1.3 심사 패키지를 1.0.3 또는 1.0.4용으로 재사용하지 않습니다. 서명 키·심사 토큰·로그인 정보는 포함하지 않습니다.

[Mozilla 공식 요구사항](https://extensionworkshop.com/documentation/publish/source-code-submission/)은 심사자가 같은 코드를 재생성할 수 있는 정확한 빌드 절차를 요구합니다. 빌드 성공은 스토어 심사 승인이나 실제 브라우저 기능 검증을 의미하지 않습니다.
