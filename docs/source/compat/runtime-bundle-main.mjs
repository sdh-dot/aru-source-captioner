// 기존 전역 소비자만을 위한 경계이며 WXT는 runtime factory를 직접 import한다.
import { createBundleMain } from '../runtime/icons.mjs';
const result=createBundleMain({environment:globalThis,initialIcons:globalThis.AruIcons,initialBundle:globalThis.AruBundle});
Object.assign(globalThis.AruIcons=globalThis.AruIcons||{},result.icons);
Object.assign(globalThis.AruBundle=globalThis.AruBundle||{},result.bundle);
