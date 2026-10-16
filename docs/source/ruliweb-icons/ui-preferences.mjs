// 자동 생성: src/ruliweb-icons/ui-preferences.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// UI 선택 상태를 독립적으로 저장하고 기존 설정의 알 수 없는 필드를 보존한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createIconsUiPreferences({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    let icons = createModuleScope(dependencies.icons, ["createUiPreferences", "UiPreferences"], ["createUiPreferences", "UiPreferences"]);
    // Picker 표시 설정만 다루며 캐시·동기화 설정·즐겨찾기·메타데이터는 수정하지 않는다.
    const initializeIconsUiPreferences = function (g) {
        "use strict";
        const A = (icons = icons || {}), key = "aruIconsPickerUiV1";
        const defaults = Object.freeze({
            modalSize: "default",
            iconSize: "normal",
            previewVisible: true,
        });
        function sanitize(value) {
            const v = value && typeof value === "object" ? value : {};
            return {
                modalSize: ["default", "wide", "max"].includes(v.modalSize)
                    ? v.modalSize
                    : "default",
                iconSize: ["small", "normal", "large"].includes(v.iconSize)
                    ? v.iconSize
                    : "normal",
                previewVisible: typeof v.previewVisible === "boolean" ? v.previewVisible : true,
            };
        }
        function create({ api = g.browser || g.chrome, promiseApi = !!g.browser, } = {}) {
            let writes = Promise.resolve();
            function invoke(method, args) {
                const storage = api?.storage?.local;
                if (typeof storage?.[method] !== "function") {
                    return Promise.reject(Error("Local storage unavailable"));
                }
                if (promiseApi) {
                    try {
                        return Promise.resolve(storage[method](...args));
                    }
                    catch (error) {
                        return Promise.reject(error);
                    }
                }
                return new Promise((resolve, reject) => {
                    try {
                        storage[method](...args, (result) => {
                            const error = api.runtime?.lastError;
                            if (error) {
                                reject(Error(error.message || "Storage failed"));
                            }
                            else {
                                resolve(result);
                            }
                        });
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            }
            return Object.freeze({
                key,
                defaults,
                sanitize,
                read: async () => sanitize((await invoke("get", [[key]]))?.[key]),
                write: (value) => {
                    const next = { schemaVersion: 1, ...sanitize(value) };
                    const pending = writes
                        .catch(() => { })
                        .then(() => invoke("set", [{ [key]: next }]));
                    writes = pending;
                    return pending;
                },
            });
        }
        A.createUiPreferences = create;
        A.UiPreferences = create();
    };
    initializeIconsUiPreferences(environment);
    return {
        icons: selectModuleExports(icons, ["createUiPreferences", "UiPreferences"]),
    };
}
