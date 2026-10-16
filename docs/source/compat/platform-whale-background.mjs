// Chrome worker는 기존 등록 순서대로 정적 import의 설치 함수를 호출한다.
import { installWhaleBackground } from '../platform/whale/background.mjs';
import { createIconsBackground } from '../ruliweb-icons/background.mjs';
import { installDownloadBackground } from '../runtime/downloads.mjs';
const downloads=globalThis.AruBodyDownload=globalThis.AruBodyDownload||{};
installWhaleBackground({environment:globalThis,dependencies:{downloads:{"ownsDownload":()=>downloads["ownsDownload"]}}});
createIconsBackground({environment:globalThis});
Object.assign(downloads,installDownloadBackground({environment:globalThis,initial:downloads}).downloads);
