// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { getLegacyPerformanceMetrics } from './performance-api.mjs';
import { createIconsLibraryReader } from '../ruliweb-icons/library-reader.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsLibraryReader({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: {icons: {"SiteAdapter": () => icons["SiteAdapter"], "BrowserAdapter": () => icons["BrowserAdapter"], "feature": () => icons["feature"], "Metadata": () => icons["Metadata"], "LibraryPackReader": () => icons["LibraryPackReader"]}} });
Object.assign(icons, result.icons);
