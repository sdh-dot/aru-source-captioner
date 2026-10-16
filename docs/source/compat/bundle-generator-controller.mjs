// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleController } from '../bundle-generator/controller.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleController({ environment: globalThis, dependencies: {bundle: {"Browser": () => bundle["Browser"], "Client": () => bundle["Client"], "Panel": () => bundle["Panel"]},
icons: {"DesignSystem": () => icons["DesignSystem"]}} });
Object.assign(bundle, result.bundle);
