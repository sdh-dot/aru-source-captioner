// 기존 전역 소비자만을 위한 경계이며 WXT는 runtime factory를 직접 import한다.
import { createIconReader } from '../runtime/icons.mjs';
const result={icons:createIconReader({environment:globalThis})};
Object.assign(globalThis.AruIcons=globalThis.AruIcons||{},result.icons);
