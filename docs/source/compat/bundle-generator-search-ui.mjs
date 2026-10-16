// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleSearchUi } from '../bundle-generator/search-ui.mjs';
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleSearchUi({ environment: globalThis, dependencies: {bundle: {"BoardSearch": () => bundle["BoardSearch"], "SearchSelection": () => bundle["SearchSelection"], "fail": () => bundle["fail"]}} });
Object.assign(bundle, result.bundle);
