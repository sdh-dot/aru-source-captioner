// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import { createMetadata } from '../ruliweb-icons/metadata.mjs';
Object.assign(globalThis.AruIcons = globalThis.AruIcons || {}, createMetadata({ environment: globalThis }));
