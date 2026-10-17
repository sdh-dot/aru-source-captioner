// 자동 생성: src/body-download/content.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 같은 확장에서 온 수집 요청만 허용하고 탐색으로 바뀐 게시글은 수집하지 않는다.
import { createModuleScope } from "../runtime/module-scope.mjs";
export function createDownloadContent({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    let downloads = createModuleScope(dependencies.downloads, ["api", "error", "options", "article", "extract"], []);
    const initializeDownloadContent = function (root) {
        "use strict";
        const D = downloads;
        if (!D.api?.runtime?.onMessage) {
            return;
        }
        D.api.runtime.onMessage.addListener((message, sender, reply) => {
            if (message?.type !== "aru-body-download:collect") {
                return;
            }
            const collectBodyImages = async () => {
                if (sender.id !== D.api.runtime.id) {
                    throw D.error("SENDER", "확장 내부 요청만 허용합니다.");
                }
                if (!(await D.options())) {
                    throw D.error("DISABLED", "전체 확장과 게시글 다운로드 옵션을 켜 주세요.");
                }
                const current = D.article(root.location.href);
                if (current.url !== message.url) {
                    throw D.error("NAVIGATED", "게시글이 변경되었습니다. 다시 실행해 주세요.");
                }
                return D.extract(root.document, root.location.href);
            };
            collectBodyImages().then((result) => reply({ ok: true, result }), (err) => reply({
                ok: false,
                error: { code: err.code || "COLLECT", message: err.message },
            }));
            return true;
        });
    };
    initializeDownloadContent(environment);
    return {};
}
