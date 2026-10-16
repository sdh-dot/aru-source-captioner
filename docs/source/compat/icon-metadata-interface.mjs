// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createMetadataInterface } from '../icon-metadata/interface.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const metadata = globalThis.AruMetadata = globalThis.AruMetadata || {};
const result = createMetadataInterface({ environment: globalThis, dependencies: {metadata: {"Selection": () => metadata["Selection"], "FIXED": () => metadata["FIXED"], "normalize": () => metadata["normalize"], "Panel": () => metadata["Panel"], "Browser": () => metadata["Browser"], "Client": () => metadata["Client"]},
icons: {"DesignSystem": () => icons["DesignSystem"]}} });
Object.assign(metadata, result.metadata);
