// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createDownloadEngine } from '../body-download/engine.mjs';
const downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
const result = createDownloadEngine({ environment: globalThis, dependencies: {downloads: {"error": () => downloads["error"], "mediaUrl": () => downloads["mediaUrl"], "inspect": () => downloads["inspect"], "api": () => downloads["api"], "call": () => downloads["call"], "writeJob": () => downloads["writeJob"], "options": () => downloads["options"], "numbered": () => downloads["numbered"], "actualName": () => downloads["actualName"], "localManifest": () => downloads["localManifest"]}} });
Object.assign(downloads, result.downloads);
