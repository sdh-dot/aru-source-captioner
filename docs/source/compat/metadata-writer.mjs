// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import { PREFIX, FIXED, fail, normalize, decode, encode } from '../../../shared/icon-metadata/tag-codec.mjs';
import { plan, Selection } from '../../../shared/icon-metadata/tag-edit-model.mjs';
Object.assign(globalThis.AruMetadata = globalThis.AruMetadata || {}, { PREFIX, FIXED, fail, normalize, decode, encode, plan, Selection });
