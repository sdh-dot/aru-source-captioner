// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createAttributionUi } from '../upload-attribution/ui.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const uploadUI = globalThis.AruUploadUI = globalThis.AruUploadUI || {};
const result = createAttributionUi({ environment: globalThis, dependencies: {icons: {"DesignSystem": () => icons["DesignSystem"]},
uploadUI: {}} });
globalThis.AruUploadUI = result.uploadUI;
