// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { installWhaleContent } from '../platform/whale/content.mjs';
const attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
const result = installWhaleContent({ environment: globalThis, dependencies: {attribution: {"Controller": () => attribution["Controller"]}} });
