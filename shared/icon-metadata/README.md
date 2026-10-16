# 공통 태그 ESM

`tag-codec.mjs`는 기존 속성 저장 규격, `tag-edit-model.mjs`는 데이터 변경 계획과 선택 상태를 담당한다. DOM·저장소·사이트 요청 없이 import할 수 있다.

```js
import { normalize, encode, decode } from './tag-codec.mjs';
import { plan, Selection } from './tag-edit-model.mjs';
```

기존 이미지 `{handle,id,rawTags}`와 편집 대상 handle 배열을 `plan`에 전달한다. operation은 `add`/`remove`/`replace`이며 `{changes,selected,changed,ids,tagChanges}`를 반환한다. 변경 목록은 `{handle,id,rawTags}` 형식이다. 같은 태그이면 원문 raw를 다시 쓰지 않는다. 선택 상태는 `new Selection()`별로 독립적이다.

기존 namespace가 필요한 외부 소비자는 `installLegacyTagApis(target)`를 명시적으로 호출할 수 있다. 이 저장소의 배포 경로는 `docs/source/compat`의 reader/writer entry를 빌드해 연결한다. 두 방식 모두 같은 ESM을 사용하며 알고리즘을 복사하지 않는다.

검증: `npm run test:esm`, `npm run verify:esm`, `npm run audit:esm`. 전체 API·데이터 계약·WXT 연결 예시는 [통합 안내](../../docs/architecture/esm-wxt-integration.md)를 따른다.
