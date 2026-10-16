// 기존 실행 경로와 namespace만 유지하는 호환 entry다.
import { installDownloadContent } from '../runtime/downloads.mjs';
const result=installDownloadContent({environment:globalThis,initial:globalThis.AruBodyDownload});
globalThis.AruBodyDownload=Object.assign(globalThis.AruBodyDownload||{},result.downloads);
