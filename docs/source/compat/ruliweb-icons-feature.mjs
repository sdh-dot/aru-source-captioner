// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsFeature } from '../ruliweb-icons/feature.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsFeature({ environment: globalThis, dependencies: {icons: {"SiteAdapter": () => icons["SiteAdapter"], "BrowserAdapter": () => icons["BrowserAdapter"], "createPicker": () => icons["createPicker"], "ComposerController": () => icons["ComposerController"], "ComposerAdapter": () => icons["ComposerAdapter"], "CatalogSources": () => icons["CatalogSources"], "LibrarySearchEngine": () => icons["LibrarySearchEngine"], "LibraryPackReader": () => icons["LibraryPackReader"], "Metadata": () => icons["Metadata"], "IconFeature": () => icons["IconFeature"], "feature": () => icons["feature"]}} });
Object.assign(icons, result.icons);
