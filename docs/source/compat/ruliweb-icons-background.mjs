// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsBackground } from '../ruliweb-icons/background.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsBackground({ environment: globalThis, dependencies: {icons: {"CacheProtocol": () => icons["CacheProtocol"]}} });
Object.assign(icons, result.icons);
