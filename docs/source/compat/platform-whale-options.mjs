// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { installWhaleOptions } from '../platform/whale/options.mjs';

const result = installWhaleOptions({ environment: globalThis, dependencies: {} });
