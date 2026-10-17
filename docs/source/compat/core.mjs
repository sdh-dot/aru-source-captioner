// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import * as core from '../ruliweb-icons/core.mjs';
Object.assign(globalThis.AruIcons = globalThis.AruIcons || {}, core);
