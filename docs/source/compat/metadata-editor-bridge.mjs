// 기존 MAIN 공개 API를 유지하고 같은 ESM 코덱으로 작성기 bridge를 설치한다.
import './metadata-writer.mjs';
import { installMetadataEditorBridge } from '../icon-metadata/metadata-editor-bridge.mjs';
installMetadataEditorBridge(globalThis);
