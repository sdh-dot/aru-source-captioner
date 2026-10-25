import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 사용자 옵션과 작성기 수명에 맞춰 통합팩 UI를 설치·정리한다.
import {
  createModuleScope,
  selectModuleExports,
} from "../runtime/module-scope.ts";
import { contextEffectGate } from "../runtime/context-effect-gate.ts";
import { sessionDrafts } from "../runtime/session-resources.ts";
import type { DynamicApi } from "../runtime/contracts.ts";

export function createBundleController({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const effectGate = contextEffectGate(environment);
  let bundle = createModuleScope(
    dependencies.bundle,
    ["Browser", "Client", "Panel"],
    ["Controller"],
  );
  let icons = createModuleScope(dependencies.icons, ["DesignSystem"], []);
  const initializeBundleController = function (g: RuntimeEnvironment) {
    "use strict";
    const B = bundle;
    class Controller {
      declare doc: Document;

      declare browser: any;

      declare client: any;

      declare entries: Map<any, any>;

      declare active: boolean;

      declare disposed: boolean;

      declare generation: number;

      declare unsubscribe: any;

      declare observer: any;

      declare timer: number | undefined;

      declare panel: any;
      constructor({ document = g.document, browser = B.Browser } = {}) {
        this.doc = document;
        this.browser = browser;
        this.client = new B.Client(document);
        this.entries = new Map();
        this.active = false;
        this.disposed = false;
        this.generation = 0;
      }
      async start() {
        this.unsubscribe = this.browser.subscribe(() => this.options());
        await this.options();
      }
      async options() {
        const n = ++this.generation,
          active = await this.browser.active();
        if (this.disposed || n !== this.generation || active === this.active) {
          return;
        }
        this.active = active;
        if (active) {
          this.enable();
        } else {
          this.disable();
        }
      }
      enable() {
        this.observer = new g.MutationObserver((records) => {
          if (
            records.some((r) =>
              [...r.addedNodes, ...r.removedNodes].some(
                (n) =>
                  n.nodeType === 1 &&
                  ((n as Element).matches(
                    "#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite",
                  ) ||
                    (n as Element).querySelector(
                      "#editor_v2,.seditor,.note-editor,.note-toolbar,#ReactSummernoteLite",
                    )),
              ),
            )
          ) {
            g.clearTimeout(this.timer);
            this.timer = g.setTimeout(() => this.discover(), 160);
          }
        });
        this.observer.observe(this.doc.body, {
          childList: true,
          subtree: true,
        });
        this.discover();
      }
      discover() {
        if (!this.active) {
          return;
        }
        for (const [root, r] of this.entries) {
          if (
            !root.isConnected ||
            root.querySelector(".note-editable") !== r.input ||
            root.querySelector(".note-toolbar") !== r.toolbar ||
            root.querySelector("#ReactSummernoteLite") !== r.source ||
            !r.host.isConnected
          ) {
            this.remove(root);
          }
        }
        for (const root of this.doc.querySelectorAll("#editor_v2 .seditor")) {
          if (this.entries.has(root)) {
            continue;
          }
          const input = root.querySelector(
              '.note-editable[contenteditable="true"]',
            ),
            source = root.querySelector("#ReactSummernoteLite"),
            toolbar = root.querySelector(".note-toolbar"),
            camera = toolbar?.querySelector(".icon-camera")?.closest("button");
          if (!input || !source || !camera) {
            continue;
          }
          const token = g.crypto.randomUUID().replaceAll("-", "");
          (root as HTMLElement).dataset.aruBundleTarget = token;
          const host = this.doc.createElement("span");
          host.dataset.aruBundleEntry = "";
          const shadow = host.attachShadow({ mode: "open" });
          shadow.innerHTML =
            '<style>:host{display:inline-block;margin:3px;vertical-align:middle}button{font:12px system-ui;padding:6px;border:1px solid #bea3df;border-radius:5px;background:#f3ebff;color:#52337b;cursor:pointer}button:focus-visible{outline:3px solid #b58ee6}</style><button type="button">아이콘 통합</button>';
          const uiCleanup = icons?.DesignSystem?.entry(shadow, {
            label: "아이콘 통합",
            tooltip: "여러 아이콘 공유 게시글을 하나의 통합팩으로 구성합니다.",
          });
          camera.after(host);
          const rec = {
            root,
            input,
            source,
            toolbar,
            token,
            host,
            uiCleanup,
            button: shadow.querySelector("button"),
          };
          this.entries.set(root, rec);
          rec.button!.onclick = () => this.open(rec);
        }
      }
      open(rec: {
        root: any;
        input?: any;
        source?: any;
        toolbar?: any;
        token: any;
        host?: any;
        uiCleanup?: any;
        button: any;
      }) {
        if (!this.active) {
          return;
        }
        if (this.panel) {
          this.panel.q(".name").focus();
          return;
        }
        if (
          this.doc.querySelector(
            "[data-aru-metadata-panel],[data-aru-icons-picker]",
          )
        ) {
          rec.button.title =
            "다른 아루 편집 창을 닫고 통합팩 생성기를 열어 주세요.";
          return;
        }
        this.panel = new B.Panel({
          document: this.doc,
          client: this.client,
          token: rec.token,
          browser: this.browser,
          restoredDraft: sessionDrafts(g, "bundle")?.get(rec.root),
          onClose: () => {
            this.panel = null;
            if (effectGate.allows()) {
              sessionDrafts(g, "bundle")?.delete(rec.root);
            }
            if (rec.root.isConnected && effectGate.allows()) {
              rec.button.focus();
            }
          },
        });
      }
      remove(root: HTMLElement) {
        const r = this.entries.get(root);
        if (!r) {
          return;
        }
        if (this.panel?.token === r.token) {
          this.panel.close();
        }
        r.uiCleanup?.();
        r.host.remove();
        if ((root as HTMLElement).dataset.aruBundleTarget === r.token) {
          delete (root as HTMLElement).dataset.aruBundleTarget;
        }
        this.entries.delete(root);
      }
      disable() {
        this.observer?.disconnect();
        g.clearTimeout(this.timer);
        this.panel?.close();
        // oxlint-disable-next-line unicorn/no-useless-spread -- 정리·외부 콜백의 재진입이 순회 대상을 바꾸더라도 이번 작업의 대상은 보존한다.
        for (const root of [...this.entries.keys()]) {
          this.remove(root);
        }
      }
      suspend() {
        const panel = this.panel;
        const rec = Array.from(this.entries.values()).find(
          (entry: DynamicApi) => entry.token === panel?.token,
        ) as DynamicApi | undefined;
        if (panel && rec) {
          sessionDrafts(g, "bundle")?.set(rec.root, {
            draft: panel.draft.snapshot(),
            url: panel.q(".url").value,
          });
        }
        if (effectGate.documentGate?.allows()) {
          this.destroy();
        } else {
          this.disposed = true;
          this.active = false;
          ++this.generation;
          this.unsubscribe?.();
          this.observer?.disconnect();
          this.client.destroy();
          if (panel) {
            panel.closed = true;
            panel.reader.destroy();
            panel.search.destroy();
          }
        }
      }
      destroy() {
        this.disposed = true;
        this.active = false;
        ++this.generation;
        this.unsubscribe?.();
        this.disable();
        this.client.destroy();
      }
    }
    Object.assign(B, { Controller });
    if (
      !g.__aruBundleNoAutoStart &&
      g.document &&
      /^https:\/\/(bbs|m)\.ruliweb\.com\/community\/board\/98\/(write|modify)(?:\/|\?|$)/.test(
        g.location.href,
      ) &&
      !g.__aruBundleController
    ) {
      g.__aruBundleController = new Controller();
      g.__aruBundleController.start();
      g.addEventListener("pagehide", () => g.__aruBundleController?.destroy(), {
        once: true,
      });
    }
  };
  initializeBundleController(environment);

  return { bundle: selectModuleExports(bundle, ["Controller"]) };
}
