// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleBridge } from '../bundle-generator/bridge.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleBridge({ environment: globalThis, dependencies: {bundle: {"fail": () => bundle["fail"], "existing": () => bundle["existing"], "validate": () => bundle["validate"], "preserveUnknown": () => bundle["preserveUnknown"]},
icons: {"Metadata": () => icons["Metadata"]}} });
