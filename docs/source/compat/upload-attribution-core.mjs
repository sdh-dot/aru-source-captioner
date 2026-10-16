// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { getLegacyPerformanceMetrics } from './performance-api.mjs';
import { createAttributionCore } from '../upload-attribution/core.mjs';
const attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
const result = createAttributionCore({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: {attribution: {}} });
Object.assign(attribution, result.attribution);
