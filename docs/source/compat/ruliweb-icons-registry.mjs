// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsRegistry } from '../ruliweb-icons/registry.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsRegistry({ environment: globalThis, dependencies: {icons: {"packRegistry": () => icons["packRegistry"]}} });
Object.assign(icons, result.icons);
