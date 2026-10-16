// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleCore } from '../bundle-generator/core.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleCore({ environment: globalThis, dependencies: {bundle: {},
icons: {"Metadata": () => icons["Metadata"], "SiteAdapter": () => icons["SiteAdapter"]}} });
Object.assign(bundle, result.bundle);
