// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleUi } from '../bundle-generator/ui.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleUi({ environment: globalThis, dependencies: {bundle: {"Browser": () => bundle["Browser"], "SourceReader": () => bundle["SourceReader"], "Draft": () => bundle["Draft"], "SearchPanel": () => bundle["SearchPanel"], "articleUrl": () => bundle["articleUrl"], "fail": () => bundle["fail"], "encode": () => bundle["encode"], "clone": () => bundle["clone"]},
icons: {"DesignSystem": () => icons["DesignSystem"], "Metadata": () => icons["Metadata"]}} });
Object.assign(bundle, result.bundle);
