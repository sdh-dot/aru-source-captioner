// 전환 전 소비자만을 위한 명시적 호환 경계다. WXT는 해당 ESM을 직접 import한다.
import { createSiteAdapter } from '../ruliweb-icons/site-adapter.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
icons.SiteAdapter = createSiteAdapter({ environment: globalThis, metadata: icons.Metadata });
