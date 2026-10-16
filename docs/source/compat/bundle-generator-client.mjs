// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createBundleClient } from '../bundle-generator/client.mjs';
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const result = createBundleClient({ environment: globalThis, dependencies: {bundle: {"fail": () => bundle["fail"], "Draft": () => bundle["Draft"]}} });
Object.assign(bundle, result.bundle);
