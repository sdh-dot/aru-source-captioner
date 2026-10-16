// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleSearch } from '../bundle-generator/search.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleSearch({ environment: globalThis, dependencies: {bundle: {"fail": () => bundle["fail"], "articleUrl": () => bundle["articleUrl"], "clone": () => bundle["clone"]},
icons: {"Metadata": () => icons["Metadata"]}} });
Object.assign(bundle, result.bundle);
