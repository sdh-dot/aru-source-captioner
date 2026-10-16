// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { installUploadDemo } from '../../demo/upload-surfaces.mjs';
const icons = globalThis.AruIcons = globalThis.AruIcons || {};
const metadata = globalThis.AruMetadata = globalThis.AruMetadata || {};
const bundle = globalThis.AruBundle = globalThis.AruBundle || {};
const uploadUI = globalThis.AruUploadUI = globalThis.AruUploadUI || {};
const result = installUploadDemo({ environment: globalThis, dependencies: {icons: {"ComposerController": () => icons["ComposerController"], "Metadata": () => icons["Metadata"], "LibrarySearchEngine": () => icons["LibrarySearchEngine"], "createPicker": () => icons["createPicker"]},
metadata: {"Controller": () => metadata["Controller"], "Panel": () => metadata["Panel"]},
bundle: {"Controller": () => bundle["Controller"], "Panel": () => bundle["Panel"], "Draft": () => bundle["Draft"]},
uploadUI: {}} });
Object.assign(icons, result.icons);
