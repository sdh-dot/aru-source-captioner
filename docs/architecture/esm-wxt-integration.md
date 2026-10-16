# ESM 원본과 WXT 통합 경계

## 관리할 원본

| 모듈 | 공개 API / 책임 |
|---|---|
| `shared/icon-metadata/tag-codec.mjs` | `PREFIX`, `FIXED`, `normalize`, `encode`, `decode`, `fail`: 저장 태그 계약 |
| `shared/icon-metadata/tag-edit-model.mjs` | `plan`, `Selection`: 변경 계획·인스턴스별 선택 상태 |
| `docs/source/ruliweb-icons/core.mjs` | `normalize`, `queryTokens`, `hasCriteria`, `SearchIndex`, `FoldState`: 검색 전용 정규화·순서·필터 |
| `docs/source/ruliweb-icons/metadata-core.mjs` | `createMetadataCore(environment)`: carrier 검증·바이트·digest·v1 fallback |
| `docs/source/ruliweb-icons/metadata.mjs` | `createMetadata({environment})`: 위 모델과 HTML/DOM 판독을 조립 |
| `docs/source/ruliweb-icons/browser-adapter.mjs` | `createBrowserAdapter(environment)`: Promise/callback API·캐시 메시지 wire |
| `docs/source/ruliweb-icons/site-adapter.mjs` | `createSiteAdapter({environment,metadata,attributeTags,isSafeMediaUrl})`: 본문/네이티브 목록·참조 검증 |
| `docs/source/ruliweb-icons/composer-adapter.mjs` | `createComposerAdapter({environment,site,getDesignSystem})`: 작성기 세션·동기 이벤트 bridge·Controller |
| `docs/source/icon-metadata/metadata-editor-bridge.mjs` | `installMetadataEditorBridge(environment)`: MAIN 작성기 속성 편집·직렬화·undo 연결 |

순수 데이터 함수와 Web API가 필요한 Adapter를 구분한다. `Selection`, `SearchIndex`, `FoldState`는 상태를 가진 인스턴스다. `createMetadataCore`의 digest는 주입된 WebCrypto를 사용하며, SHA-256을 쓸 수 없을 때 원래 `DIGEST_UNAVAILABLE` 경고와 v1 fallback을 유지한다. 모듈 import만으로 namespace 등록·DOM 탐색·이벤트 설치·네트워크 요청을 수행하지 않는다.

## 최소 연결 예시

아래는 이 저장소 루트를 기준으로 한 import다. 외부 WXT 포크의 실제 경로·entrypoint는 아직 제공받지 않았으므로 파일 이동이나 WXT 설정 변경을 적용하지 않았다.

```js
import * as AttributeTags from '../../shared/icon-metadata/tag-codec.mjs';
import { plan, Selection } from '../../shared/icon-metadata/tag-edit-model.mjs';
import { SearchIndex, FoldState } from '../../docs/source/ruliweb-icons/core.mjs';
import { createMetadata } from '../../docs/source/ruliweb-icons/metadata.mjs';
import { createBrowserAdapter } from '../../docs/source/ruliweb-icons/browser-adapter.mjs';
import { createSiteAdapter } from '../../docs/source/ruliweb-icons/site-adapter.mjs';
import { createComposerAdapter } from '../../docs/source/ruliweb-icons/composer-adapter.mjs';

const { Metadata, MetadataError } = createMetadata({ environment: globalThis });
const browser = createBrowserAdapter(globalThis);
const site = createSiteAdapter({ environment: globalThis, metadata: Metadata });
const { ComposerAdapter, ComposerController } = createComposerAdapter({
  environment: globalThis,
  site,
  getDesignSystem: () => designSystem,
});
```

`designSystem`은 WXT 쪽 기존 UI 의존성으로 제공한다. 사용하지 않는 export는 가져오지 않아도 된다. 같은 실행 영역에서 Metadata를 생성해 SiteAdapter에도 전달하면 기존 `MetadataError` 클래스 식별성을 공유할 수 있다. DOM 생성자와 AbortController/CustomEvent는 해당 content script의 환경을 전달한다. 작성기 Controller를 생성·시작한 주체가 `stop()`을 호출해야 한다.

1. 기존 WXT shared/module 구현과 중복 여부를 먼저 비교한다.
2. 순수 모델을 import하고 기존 UI 소비자에 주입한다. 새 `AruIcons` 전역을 만들 필요가 없다.
3. BrowserAdapter에는 현재 Firefox `browser` 또는 Chromium `chrome` API가 있는 환경을 전달한다. 메시지 `ARU_ICONS_CACHE`, `$aruIconsBytesV1`, 저장 키·옵션 unknown 필드를 보존한다.
4. 작성기 ISOLATED 어댑터와 MAIN bridge를 별도 entry로 유지한다. DOM 이벤트는 기존 이름·문자열 detail·동기 응답을 지켜야 한다. 비동기 응답으로 바꾸면 `BRIDGE_UNAVAILABLE`이 발생한다.
5. MAIN metadata entry에서는 `installMetadataEditorBridge(globalThis)`를 한 번 호출한다. 이 함수는 공통 태그 ESM을 직접 import하며 import만으로 설치하지 않는다. 기존 중복 설치 flag와 pagehide 정리는 유지한다. metadata UI와 MAIN은 서로 다른 실행 영역이므로 같은 인스턴스를 공유한다고 가정하지 않는다.
6. 기존 feature/UI의 namespace 소비자를 import/주입으로 옮긴 다음에만 대응 compat entry를 제거한다. 댓글 MAIN composer bridge·통합팩 MAIN bridge와 전체 UI/업로드 초기화는 이번에 ESM화하지 않았다.
7. Firefox/Chromium/Whale의 실제 설치·초기화·검색·삽입·재탐색을 각각 검증한다. 최신 개인 포크와 연결한 WXT build는 별도 필수 단계다.

## 데이터·예외 계약

- 태그: `aru-tags:v1:` + `encodeURIComponent(JSON.stringify(normalizedTags))`. 기존 `data-aru-tags`, `data-aru-id`, 쉼표 legacy 판독, 고정 태그 13개를 유지한다. 저장에는 검색용 NFKC/소문자 변환을 적용하지 않는다.
- 태그 변경: `plan(images,handles,tags,operation,generate)`은 변경 목록만 반환한다. 입력 객체를 수정하지 않으며 태그 내용·순서가 같으면 legacy raw까지 유지한다. ID 생성기는 주입한다.
- 메타데이터: `ruricon:v1`과 `aru-icons:v2`의 carrier 원문·decodedBytes를 유지한다. BUNDLE digest는 JSON 재직렬화가 아니라 실제 v1 원본 바이트 기준이다.
- 오류: 태그 `TAGS_INVALID`, `TAGS_VERSION`, `TAGS_EMPTY`, `OP_INVALID`, `SELECTION_INVALID`, `IMAGE_CHANGED`, `ID_COLLISION`, `ID_INVALID`를 새 코드로 치환하지 않는다. 실제 태그 오류 계약은 `tests/esm/tag-contract.test.mjs`의 동등성 비교를 따른다. 메타데이터 오류의 name/code/message·warning 배열과 브라우저 `API_UNAVAILABLE`, `API_ERROR`, `FEATURE_DISABLED`, `INVALID_REQUEST`, `CACHE_UNAVAILABLE`도 유지한다.
- 작성기: `aru-icons-composer-request-v1`, `aru-icons-composer-response-v1`, `aru-metadata-*-v1`과 session/handle은 기존 계약을 사용한다. 실제 HTML 등록·서버 저장 성공을 로컬 fixture 결과로 대체하지 않는다.

## 기존 배포와 호환 출력

`docs/source/compat/*.mjs` 8개가 기존 namespace 등록과 MAIN bridge 설치를 연결한다. 알고리즘은 import한 ESM에만 둔다. `shared/icon-metadata/legacy-adapter.mjs`는 명시적으로 호출할 수 있는 추가 호환 API이며 production compat entry에서 자동 호출하지 않는다.

`npm run build`는 esbuild로 `.js` 위치 8개와 MAIN metadata bridge 2개를 생성한 뒤, 기존 `tools/build.mjs`를 실행한다. `.js` 첫 줄의 자동 생성 안내를 따른다. `docs/source/icon-metadata/editor-bridge.js`도 생성물이다. MAIN entry는 writer 호환 등록과 설치 함수를 함께 import해 코덱을 한 번만 포함한다. WXT에서는 생성된 `.js`나 `compat`가 아닌 ESM을 직접 import한다.

지금은 기존 여러 classic 스크립트의 독립 로드를 유지하므로 의존 ESM이 각 생성물에 반복 포함될 수 있다. 관리 원본의 알고리즘 중복은 없지만 출력 크기는 증가했다. WXT에서 하나의 entry 그래프로 묶으면 번들러가 같은 import를 합칠 수 있다. 이를 이유로 현재 미제공 WXT 빌드 구조를 선제적으로 수정하지 않는다.
