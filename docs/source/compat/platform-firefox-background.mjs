// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { installFirefoxBackground } from '../platform/firefox/background.mjs';
const downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
const result = installFirefoxBackground({ environment: globalThis, dependencies: {downloads: {"ownsDownload": () => downloads["ownsDownload"]}} });
