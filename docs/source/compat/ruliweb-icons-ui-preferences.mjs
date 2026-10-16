// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsUiPreferences } from '../ruliweb-icons/ui-preferences.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsUiPreferences({ environment: globalThis, dependencies: {icons: {"createUiPreferences": () => icons["createUiPreferences"], "UiPreferences": () => icons["UiPreferences"]}} });
Object.assign(icons, result.icons);
