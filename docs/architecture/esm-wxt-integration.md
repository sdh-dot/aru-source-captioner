# TypeScript 원본과 WXT 통합 경계

최신 연결은 이 문서와 [실제 통합 보고서](wxt-unification-report.md)를 따른다. PR #5의 구조를 선택적으로 적용했으며 외부 포크·PR은 변경하지 않았다.

## 관리할 원본

| 모듈 | 공개 API / 책임 |
|---|---|
| `src/icon-metadata/tag-codec.ts` | `PREFIX`, `FIXED`, `normalize`, `encode`, `decode`, `fail`: 저장 태그 계약 |
| `src/icon-metadata/tag-edit-model.ts` | `plan`, `Selection`: 변경 계획·인스턴스별 선택 상태 |
| `src/ruliweb-icons/core.ts` | `normalize`, `queryTokens`, `hasCriteria`, `SearchIndex`, `FoldState`: 검색 전용 정규화·순서·필터 |
| `src/ruliweb-icons/metadata-core.ts` | `createMetadataCore(environment)`: carrier 검증·바이트·digest·v1 fallback |
| `src/ruliweb-icons/metadata.ts` | `createMetadata({environment})`: 위 모델과 HTML/DOM 판독을 조립 |
| `src/ruliweb-icons/browser-adapter.ts` | `createBrowserAdapter(environment)`: Promise/callback API·캐시 메시지 wire |
| `src/ruliweb-icons/site-adapter.ts` | `createSiteAdapter({environment,metadata,attributeTags,isSafeMediaUrl})`: 본문/네이티브 목록·참조 검증 |
| `src/ruliweb-icons/composer-adapter.ts` | `createComposerAdapter({environment,site,getDesignSystem})`: 작성기 세션·동기 이벤트 bridge·Controller |
| `src/icon-metadata/metadata-editor-bridge.ts` | `installMetadataEditorBridge(environment)`: MAIN 작성기 속성 편집·직렬화·undo 연결 |

순수 데이터 함수와 Web API가 필요한 Adapter를 구분한다. `Selection`, `SearchIndex`, `FoldState`는 상태를 가진 인스턴스다. `createMetadataCore`의 digest는 주입된 WebCrypto를 사용하며, SHA-256을 쓸 수 없을 때 원래 `DIGEST_UNAVAILABLE` 경고와 v1 fallback을 유지한다. 모듈 import만으로 namespace 등록·DOM 탐색·이벤트 설치·네트워크 요청을 수행하지 않는다.

## 최소 연결 예시

아래는 모듈 재사용 예시다. 실제 시작 순서는 `entrypoints/`의 기존 7개 content script와 background를 따른다. `runtime/world-state.ts`의 ISOLATED 전용 공개 인스턴스만 재사용하며 MAIN과 상태를 공유하지 않는다. 환경은 `src/runtime/contracts.ts`의 `defaultEnvironment` 또는 파서를 주입한 `createEnvironment`를 넘긴다.

```ts
import { defaultEnvironment } from "../../src/runtime/contracts.ts";
import * as AttributeTags from '../../src/icon-metadata/tag-codec.ts';
import { plan, Selection } from '../../src/icon-metadata/tag-edit-model.ts';
import { SearchIndex, FoldState } from '../../src/ruliweb-icons/core.ts';
import { createMetadata } from '../../src/ruliweb-icons/metadata.ts';
import { createBrowserAdapter } from '../../src/ruliweb-icons/browser-adapter.ts';
import { createSiteAdapter } from '../../src/ruliweb-icons/site-adapter.ts';
import { createComposerAdapter } from '../../src/ruliweb-icons/composer-adapter.ts';

const { Metadata, MetadataError } = createMetadata({ environment: defaultEnvironment });
const browser = createBrowserAdapter(defaultEnvironment);
const site = createSiteAdapter({ environment: defaultEnvironment, metadata: Metadata });
const { ComposerAdapter, ComposerController } = createComposerAdapter({
  environment: defaultEnvironment,
  site,
  getDesignSystem: () => designSystem,
});
```

`designSystem`은 WXT 쪽 기존 UI 의존성으로 제공한다. 사용하지 않는 export는 가져오지 않아도 된다. 같은 실행 영역에서 Metadata를 생성해 SiteAdapter에도 전달하면 기존 `MetadataError` 클래스 식별성을 공유할 수 있다. DOM 생성자와 AbortController/CustomEvent는 해당 content script의 환경을 전달한다. 작성기 Controller를 생성·시작한 주체가 `stop()`을 호출해야 한다.

1. 기존 WXT shared/module 구현과 중복 여부를 먼저 비교한다.
2. 순수 모델을 import하고 기존 UI 소비자에 주입한다. 새 `AruIcons` 전역을 만들 필요가 없다.
3. BrowserAdapter에는 현재 Firefox `browser` 또는 Chromium `chrome` API가 있는 환경을 전달한다. 메시지 `ARU_ICONS_CACHE`, `$aruIconsBytesV1`, 저장 키·옵션 unknown 필드를 보존한다.
4. 작성기 ISOLATED 어댑터와 MAIN bridge를 별도 entry로 유지한다. DOM 이벤트는 기존 이름·문자열 detail·동기 응답을 지켜야 한다. 비동기 응답으로 바꾸면 `BRIDGE_UNAVAILABLE`이 발생한다.
5. MAIN metadata entry에서는 `installMetadataEditorBridge(defaultEnvironment)`를 한 번 호출한다. 이 함수는 공통 태그 ESM을 직접 import하며 import만으로 설치하지 않는다. 기존 중복 설치 flag와 pagehide 정리는 유지한다. metadata UI와 MAIN은 서로 다른 실행 영역이므로 같은 인스턴스를 공유한다고 가정하지 않는다.
6. 댓글 MAIN composer bridge·통합팩 MAIN bridge·UI·업로드·다운로드·브라우저별 초기화도 ESM으로 전환했다. 아래 runtime 조립 함수를 재사용하거나 개별 factory에 의존성을 주입한다. WXT 쪽 소비자를 전환하고 실제 실행을 검증한 뒤에만 대응 compat entry를 제거한다.
7. Firefox/Chromium/Whale의 실제 설치·초기화·검색·삽입·재탐색을 각각 검증한다. 공개 PR #5 기준의 실제 WXT 검증과 이후 개인 포크 변경의 통합 검증은 구분한다.

## 데이터·예외 계약

- 태그: `aru-tags:v1:` + `encodeURIComponent(JSON.stringify(normalizedTags))`. 기존 `data-aru-tags`, `data-aru-id`, 쉼표 legacy 판독, 고정 태그 13개를 유지한다. 저장에는 검색용 NFKC/소문자 변환을 적용하지 않는다.
- 태그 변경: `plan(images,handles,tags,operation,generate)`은 변경 목록만 반환한다. 입력 객체를 수정하지 않으며 태그 내용·순서가 같으면 legacy raw까지 유지한다. ID 생성기는 주입한다.
- 메타데이터: `ruricon:v1`과 `aru-icons:v2`의 carrier 원문·decodedBytes를 유지한다. BUNDLE digest는 JSON 재직렬화가 아니라 실제 v1 원본 바이트 기준이다.
- 오류: 태그 `TAGS_INVALID`, `TAGS_VERSION`, `TAGS_EMPTY`, `OP_INVALID`, `SELECTION_INVALID`, `IMAGE_CHANGED`, `ID_COLLISION`, `ID_INVALID`를 새 코드로 치환하지 않는다. 실제 태그 오류 계약은 `tests/esm/tag-contract.test.mjs`의 동등성 비교를 따른다. 메타데이터 오류의 name/code/message·warning 배열과 브라우저 `API_UNAVAILABLE`, `API_ERROR`, `FEATURE_DISABLED`, `INVALID_REQUEST`, `CACHE_UNAVAILABLE`도 유지한다.
- 작성기: `aru-icons-composer-request-v1`, `aru-icons-composer-response-v1`, `aru-metadata-*-v1`과 session/handle은 기존 계약을 사용한다. 실제 HTML 등록·서버 저장 성공을 로컬 fixture 결과로 대체하지 않는다.

## 기존 배포와 호환 출력

`tools/compile-typescript.mjs`는 `src`를 기존 `docs/source`·`shared/icon-metadata` ESM 경로로 변환한다. 타입 전용 파일은 출력하지 않는다. `docs/source/compat/*.mjs`는 이 생성 ESM을 가져와 기존 namespace·MAIN 설치 계약을 연결한다. 알고리즘은 TypeScript에만 둔다.

`npm run build:legacy`는 `tools/build-esm.mjs`와 기존 `tools/build.mjs`를 통해 호환 출력 52개와 runtime 출력 8개를 생성한다. `npm run build`는 그 뒤 세 WXT 브라우저를 빌드한다. `tools/typescript-modules.json`은 기존 47개 모듈의 출력 매핑이다. WXT는 compat나 생성 JS를 import하지 않는다. 기존 배포 경로·테스트를 대체하기 전에는 호환 출력을 삭제하지 않는다.

## 잔여 기능의 공개 진입점

| 경로 | export | 책임 / 반환 |
|---|---|---|
| `src/runtime/icons.ts` | `createIconReader` | 아이콘 catalog·library·picker·composer·feature를 기존 순서로 조립, 로컬 icons API 반환 |
| 위와 같음 | `createMetadataUi` | `{icons, metadata}` 반환, 기존 `initialIcons.DesignSystem` 재사용 |
| 위와 같음 | `createBundleMain` | `{icons, bundle}` 반환, MAIN bridge 설치, 기존 Metadata 인스턴스 재사용 |
| 위와 같음 | `createBundleUiRuntime` | `{icons, bundle}` 반환, 통합팩 검색·편집·Controller 조립 |
| `src/runtime/downloads.ts` | `installDownloadContent`, `installDownloadBackground` | 공통 Core/API와 본문 extractor 또는 Background 연결, `{downloads}` 반환 |
| `src/ruliweb-icons/*.ts` | `createIconsCatalog`, `createIconsLibrarySearch`, `createIconsLibraryReader`, `createIconsPicker`, `createIconsFeature` 등 | 개별 UI/조회 factory, `{icons: 공개 API}` 반환 |
| `src/bundle-generator/*.ts` | `createBundleCore`, `createBundleSearch`, `createBundleBridge`, `createBundleClient`, `createBundleSearchUi`, `createBundleUi`, `createBundleController` | 개별 통합팩 factory, 공개 bundle API 반환 또는 이벤트 설치 |
| `src/icon-metadata/interface.ts` | `createMetadataInterface` | 태그 Client/Browser·Panel·Controller, `{metadata}` 반환 |
| `src/upload-attribution/{core,ui}.ts` | `createAttributionCore`, `createAttributionUi` | 기존 Registry/Controller 및 UI 연결, 공개 attribution/uploadUI 반환 |
| `src/body-download/*.ts` | `createDownloadCore`, `createDownloadExtractor`, `createDownloadBrowserApi`, `createDownloadEngine`, `createDownloadUi`, `createDownloadContent`, `createDownloadBackground` | 로컬 다운로드 모델·관측 본문 수집·브라우저 실행 경계 |
| `src/platform/{firefox,whale}/{content,options,background}.ts` | `installFirefoxContent/Options/Background`, `installWhaleContent/Options/Background` | 기존 캡션·설정·Native 초기화. 해당 실행 영역에서 한 번 호출 |

개별 factory는 `{environment, dependencies}`를 받으며 `dependencies.icons.Metadata: () => metadata`처럼 공개 함수/인스턴스의 getter를 받는다. 기존 초기화 순서에서 늦게 생성되던 의존성을 조회하기 위한 계약이며, 다른 모듈의 내부 상태를 전달하지 않는다. 소유한 API만 반환한다. 각 factory의 정확한 의존 키와 반환 키는 `esm-completion-entries.json`의 `dependencies`/`exports`를 따른다. 공통 extractor는 runtime이 `error`, `article`, `mediaUrl`, `streamMedia`, `originalFilename`을 주입한다.

프로젝트 루트에 놓인 연결 모듈을 가정한 예시:

```js
import { createIconReader, createMetadataUi } from './src/runtime/icons.ts';
import { installDownloadContent } from './src/runtime/downloads.ts';

const icons = createIconReader({ environment: defaultEnvironment });
const { metadata } = createMetadataUi({ environment: defaultEnvironment, initialIcons: icons });
const { downloads } = installDownloadContent({ environment: defaultEnvironment });
// 각 실행 영역의 소유자가 기존 수명주기에 맞춰 Controller와 feature를 정리한다.
```

WXT에 이미 UI/Controller가 있으면 전체 runtime을 중복 설치하지 않고 필요한 순수 함수나 개별 factory만 import한다. MAIN과 ISOLATED 진입점을 합치지 않는다. Chromium Background는 `installWhaleBackground` → `createIconsBackground` → `installDownloadBackground` 순서로 설치하고, 기존 `ownsDownload` getter를 먼저 주입한다. Firefox는 기존 Manifest가 분리 등록한 파일 순서를 유지한다. 별도 브라우저 API·Native Host 권한·설정은 추가하지 않는다.

ESM 자체는 브라우저 없이 import할 수 있다. registry의 JSON import attribute는 Node 24/현재 esbuild에서 지원하며 브라우저 배포물에는 inline된다. 실제 호출에는 해당 문서의 DOM 생성자·WebCrypto·브라우저 API가 있는 환경이 필요하다. classic 산출물은 기존 ES2022 대상이며 Manifest의 Firefox 데스크톱 140.0·Android 142.0 최소 버전과 기존 Chromium 등록 정책을 유지한다. 현재 WXT 설정·entrypoint·타입·Manifest 비교는 통합 보고서의 공개 PR #5 기준으로 검증했다. 이후 개인 포크의 미공개 변경은 포함하지 않는다.

## 통합 브랜치의 계측과 태그 부분 처리

`src/performance/metrics.ts`의 `createPerformanceMetrics({environment})`는 기본 OFF인 인스턴스를 반환한다. `configure({enabled:true})`를 명시한 경우에만 허용된 수치와 최대 512개 표본을 유지한다. storage·network·파일명·출처 URL을 수집하지 않는다. 검색/reader/업로드 factory와 `createIconReader`의 선택 인자 `metrics`로 주입하며 WXT에서는 전역 등록 없이 사용할 수 있다. 기존 진단의 `AruPerformance` 등록은 compat 경계에서만 수행하고 Manifest 경로를 추가하지 않는다.

NORMAL의 `bodyCounts.tagErrors > 0`는 미디어를 유지하면서 stale/partial로 전파한다. 성공적인 재수집으로 오류가 사라진 경우에만 complete가 된다. 태그가 없는 정상 이미지는 오류로 분류하지 않는다. cache·검색 UI 통합 시 이 상태를 덮어쓰지 않아야 한다. 상세 출처와 검증은 [브랜치 통합 보고서](branch-integration-report.md)를 따른다.

## 타입 경계

브라우저·사이트 API와 기존 resolver namespace에는 `DynamicApi`와 `any`가 남아 있다. 저장 태그·선택·검색·메타데이터 스키마·캐시 원장·PNG·종료 상태는 별도 타입으로 구분했지만 모든 외부 응답이 정적으로 검증된다고 간주하지 않는다. 기존 런타임 유효성 검사를 유지하며, 외부 API 포트의 세부 타입 강화는 후속 작업이다.
