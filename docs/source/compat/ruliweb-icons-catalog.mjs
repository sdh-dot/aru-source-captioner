// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsCatalog } from '../ruliweb-icons/catalog.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsCatalog({ environment: globalThis, dependencies: {icons: {"packRegistry": () => icons["packRegistry"], "SiteAdapter": () => icons["SiteAdapter"], "SearchIndex": () => icons["SearchIndex"], "DesignSystem": () => icons["DesignSystem"], "Catalog": () => icons["Catalog"], "CatalogView": () => icons["CatalogView"], "MediaBudget": () => icons["MediaBudget"], "CatalogSources": () => icons["CatalogSources"]}} });
Object.assign(icons, result.icons);
