// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import { PREFIX, FIXED, normalize, decode, encode } from '../../../shared/icon-metadata/tag-codec.mjs';
(globalThis.AruIcons = globalThis.AruIcons || {}).AttributeTags = Object.freeze({ PREFIX, FIXED, normalize, decode, encode });
