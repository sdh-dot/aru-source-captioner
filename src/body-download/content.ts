import { contextEffectGate } from "../runtime/context-effect-gate.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 같은 확장에서 온 수집 요청만 허용하고 탐색으로 바뀐 게시글은 수집하지 않는다.
import { createModuleScope } from "../runtime/module-scope.ts";

export function createDownloadContent({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const effectGate = contextEffectGate(environment);
  let downloads = createModuleScope(
    dependencies.downloads,
    ["api", "error", "options", "article", "extract"],
    [],
  );

  const initializeDownloadContent = function (root: RuntimeEnvironment) {
    "use strict";
    const D = downloads;
    if (!D.api?.runtime?.onMessage) {
      return;
    }
    D.api.runtime.onMessage.addListener(
      (
        message: { type: string; url: any },
        sender: { id: any },
        reply: (arg0: {
          ok: boolean;
          result?: any;
          error?: { code: any; message: any };
        }) => any,
      ) => {
        if (message?.type !== "aru-body-download:collect") {
          return;
        }
        const collectBodyImages = async () => {
          effectGate.assert();
          if (sender.id !== D.api.runtime.id) {
            throw D.error("SENDER", "확장 내부 요청만 허용합니다.");
          }
          if (!(await D.options())) {
            throw D.error(
              "DISABLED",
              "전체 확장과 게시글 다운로드 옵션을 켜 주세요.",
            );
          }
          effectGate.assert();
          const current = D.article(root.location.href);
          if (current.url !== message.url) {
            throw D.error(
              "NAVIGATED",
              "게시글이 변경되었습니다. 다시 실행해 주세요.",
            );
          }
          return D.extract(root.document, root.location.href);
        };
        collectBodyImages().then(
          (result) => {
            if (effectGate.allows()) {
              reply({ ok: true, result });
            }
          },
          (err) =>
            effectGate.allows() &&
            reply({
              ok: false,
              error: { code: err.code || "COLLECT", message: err.message },
            }),
        );
        return true;
      },
    );
  };
  initializeDownloadContent(environment);

  return {};
}
