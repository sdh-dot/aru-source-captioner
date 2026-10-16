// 기존 전역 소비자만을 위한 경계이며 WXT는 runtime factory를 직접 import한다.
import { createMetadataUi } from '../runtime/icons.mjs';
const result=createMetadataUi({environment:globalThis,initialIcons:globalThis.AruIcons,initialMetadata:globalThis.AruMetadata});
Object.assign(globalThis.AruIcons=globalThis.AruIcons||{},result.icons);
Object.assign(globalThis.AruMetadata=globalThis.AruMetadata||{},result.metadata);
