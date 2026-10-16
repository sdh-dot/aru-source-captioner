// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import { createComposerAdapter } from '../ruliweb-icons/composer-adapter.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
Object.assign(icons, createComposerAdapter({ environment: globalThis, site: icons.SiteAdapter, getDesignSystem: () => icons.DesignSystem }));
