// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsLibrarySearch } from '../ruliweb-icons/library-search.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsLibrarySearch({ environment: globalThis, dependencies: {icons: {"normalize": () => icons["normalize"], "CatalogSources": () => icons["CatalogSources"], "queryTokens": () => icons["queryTokens"], "LibrarySearchEngine": () => icons["LibrarySearchEngine"], "libraryIconIdentity": () => icons["libraryIconIdentity"], "libraryFixedTags": () => icons["libraryFixedTags"]}} });
Object.assign(icons, result.icons);
