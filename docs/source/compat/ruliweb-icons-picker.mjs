// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsPicker } from '../ruliweb-icons/picker.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const result = createIconsPicker({ environment: globalThis, dependencies: {icons: {"isMouseDoubleClick": () => icons["isMouseDoubleClick"], "iconTagLabels": () => icons["iconTagLabels"], "Metadata": () => icons["Metadata"], "createPicker": () => icons["createPicker"], "SearchIndex": () => icons["SearchIndex"], "FoldState": () => icons["FoldState"], "DesignSystem": () => icons["DesignSystem"], "CatalogView": () => icons["CatalogView"], "UiPreferences": () => icons["UiPreferences"], "MediaBudget": () => icons["MediaBudget"], "ComposerAdapter": () => icons["ComposerAdapter"], "libraryFixedTags": () => icons["libraryFixedTags"]}} });
Object.assign(icons, result.icons);
