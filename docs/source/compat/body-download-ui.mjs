// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createDownloadUi } from '../body-download/ui.mjs';
const downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
const result = createDownloadUi({ environment: globalThis, dependencies: {downloads: {"readJob": () => downloads["readJob"], "error": () => downloads["error"], "DownloadRunner": () => downloads["DownloadRunner"], "options": () => downloads["options"], "call": () => downloads["call"], "api": () => downloads["api"], "article": () => downloads["article"], "writeJob": () => downloads["writeJob"]}} });
