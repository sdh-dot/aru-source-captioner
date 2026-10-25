import { readSettings, subscribeSettings } from "../runtime/settings-read.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 업로드 출처 매칭 결과를 작성기 수명에 맞춰 연결하며 기존 이벤트 계약을 보존한다.
import { createModuleScope } from "../runtime/module-scope.ts";

const activeUi = new WeakMap<Document, () => void>();

export function createAttributionUi({
  environment = defaultEnvironment,
  dependencies = {},
  metrics = null,
}: FactoryOptions = {}) {
  let icons = createModuleScope(dependencies.icons, ["DesignSystem"], []);
  let uploadUI = createModuleScope(dependencies.uploadUI, [], []);
  /* 확인된 네이티브 업로드 제어만 꾸미며 기존 리스너나 요청을 교체하지 않는다. */
  const initializeAttributionUi = function (g: RuntimeEnvironment) {
    "use strict";
    const D = icons?.DesignSystem;
    class UploadUI {
      declare doc: Document;

      declare records: Map<any, any>;

      declare style: HTMLStyleElement;

      declare status: HTMLDivElement;

      declare statusLabel: HTMLSpanElement;

      declare statusCleanup: any;

      declare observer: any;
      constructor(doc = g.document) {
        this.doc = doc;
        this.records = new Map();
        const style = doc.createElement("style");
        style.dataset.aruNativeUploadStyle = "";
        style.textContent = `[data-aru-native-upload]{position:relative!important;box-sizing:border-box!important;min-height:44px!important;min-width:110px!important;border:1px solid #C5A268!important;border-radius:7px!important;touch-action:manipulation}
      [data-aru-native-upload]:focus-visible{outline:3px solid #923F61!important;outline-offset:2px}
      [data-aru-native-upload]:disabled{opacity:.55}
      [data-aru-native-upload]>[data-aru-native-label]{position:absolute;inset:0;display:flex;border-radius:inherit;pointer-events:none}
      input[data-aru-native-file]{max-width:100%;min-height:44px;font:inherit}
      input[data-aru-native-file]::file-selector-button{min-height:44px;border:1px solid #C5A268;border-radius:7px;padding:8px 12px;font:inherit;background:#fff9f0;color:#642940}
      [data-aru-upload-status]{display:block;margin:6px 0;overflow-wrap:anywhere}
      [data-aru-upload-status][hidden]{display:none}
      @media(prefers-color-scheme:dark){input[data-aru-native-file]::file-selector-button{background:#261d24;color:#E5CFA7}}
      @media(forced-colors:active){[data-aru-native-upload]{border-color:ButtonText!important}[data-aru-native-upload]:focus-visible{outline-color:Highlight!important}}
      `;
        (doc.head || doc.documentElement).append(style);
        this.style = style;
        this.status = doc.createElement("div");
        this.status.dataset.aruUploadStatus = "";
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");
        this.status.hidden = true;
        const statusShadow = this.status.attachShadow({ mode: "open" });
        this.statusLabel = doc.createElement("span");
        statusShadow.append(this.statusLabel);
        this.statusCleanup = D?.attach(statusShadow);
        const statusStyle = doc.createElement("style");
        statusStyle.textContent =
          ':host{color:var(--aru-deep-wine);font:13px/1.5 "Aru Pretendard",system-ui,sans-serif}';
        statusShadow.append(statusStyle);
        this.observer = new g.MutationObserver((mutations) => {
          metrics?.count("uploadUI.observer");
          // 진단 문구 갱신은 네이티브 업로드 제어를 다시 찾을 필요가 없다.
          const controlsChanged = mutations.some(
            (mutation) =>
              mutation.type === "childList" &&
              [...mutation.addedNodes, ...mutation.removedNodes].some((node) =>
                this.controlChanged(node),
              ),
          );
          if (controlsChanged) {
            this.discover();
          }
          if (
            controlsChanged ||
            mutations.some((m) => m.type === "attributes")
          ) {
            this.report();
          }
        });
        this.observer.observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-aru-upload-diagnostic"],
        });
        this.discover();
        this.report();
      }
      controlChanged(node: Node) {
        if (node.nodeType !== 1) {
          return false;
        }
        if (
          (node as HTMLInputElement).tagName === "LABEL" ||
          ((node as HTMLInputElement).tagName === "INPUT" &&
            (node as HTMLInputElement).type === "file") ||
          (node as HTMLInputElement).classList.contains("note-toolbar") ||
          (node as HTMLInputElement).classList.contains("icon-camera") ||
          (node as HTMLInputElement).getAttribute("contenteditable") === "true"
        ) {
          return true;
        }
        if (
          (node as HTMLInputElement).childElementCount > 0 &&
          (node as HTMLInputElement).querySelector(
            '.note-toolbar,.icon-camera,input[type="file"],label,[contenteditable="true"]',
          )
        ) {
          return true;
        }
        for (const [control, record] of this.records) {
          if (
            node === control ||
            node === record.host ||
            ((node as HTMLInputElement).childElementCount > 0 &&
              (node.contains(control) || node.contains(record.host)))
          ) {
            return true;
          }
        }
        return false;
      }
      decorate(control: HTMLElement) {
        // 이미지편집 탭은 float 자식을 감싼 인라인 label이므로 업로드 장식을 덧씌우지 않는다.
        if (
          this.records.has(control) ||
          !D ||
          control.closest("#editor_tab_bar")
        ) {
          return;
        }
        const previous = control.getAttribute("aria-label");
        control.dataset.aruNativeUpload = "";
        control.setAttribute("aria-label", "이미지 첨부");
        const host = this.doc.createElement("span");
        host.dataset.aruNativeLabel = "";
        host.setAttribute("aria-hidden", "true");
        const shadow = host.attachShadow({ mode: "open" });
        const label = this.doc.createElement("span");
        label.className = "label";
        label.textContent = "이미지 첨부";
        const image = D.assetImage(
          this.doc,
          "assets/icons/editor-upload-20.png",
          "upload",
          "aru-entry-icon",
        );
        if (image) {
          label.prepend(image);
        }
        shadow.append(label);
        const cleanup = D.attach(shadow);
        const style = this.doc.createElement("style");
        style.textContent =
          ':host{width:100%;height:100%;pointer-events:none}.label{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:100%;padding:6px 10px;border-radius:7px;background:var(--aru-surface);color:var(--aru-deep-wine);font:700 13px/1.4 "Aru Pretendard",system-ui,sans-serif}.aru-entry-icon{width:20px;height:20px;object-fit:contain;flex-shrink:0}svg{fill:none;stroke:currentColor;stroke-width:1.6}';
        shadow.append(style);
        control.append(host);
        this.records.set(control, { host, cleanup, previous });
      }
      discover() {
        const finish = metrics?.start("uploadUI.discover");
        try {
          for (const [control, record] of this.records) {
            if (!control.isConnected || !record.host.isConnected) {
              record.cleanup?.();
              record.host.remove();
              delete control.dataset.aruNativeUpload;
              if (record.previous === null) {
                control.removeAttribute("aria-label");
              } else {
                control.setAttribute("aria-label", record.previous);
              }
              this.records.delete(control);
            }
          }
          for (const icon of this.doc.querySelectorAll(
            ".note-toolbar .icon-camera",
          )) {
            const button = icon.closest("button");
            if (button) {
              this.decorate(button);
            }
          }
          for (const input of this.doc.querySelectorAll<HTMLInputElement>(
            'input[type="file"]',
          )) {
            if (input.closest(".common_write_wrapper")) {
              continue;
            }
            // accept가 이미지 선택기임을 나타내는 경우에만 장식을 적용한다.
            // 일반 첨부와 관련 없는 작성기 컨트롤은 그대로 둔다.
            if (!/image|\.jpe?g|\.png|\.gif|\.webp/i.test(input.accept)) {
              continue;
            }
            const labels = [...(input.labels || [])];
            if (labels.length) {
              labels.forEach((label) => this.decorate(label));
            } else if (input.getClientRects().length) {
              input.dataset.aruNativeFile = ""; // 운영체제 파일 선택기의 라벨과 기본 동작을 유지한다.
            }
          }
          const toolbar =
            this.doc.querySelector(".note-toolbar") ||
            [...this.records.keys()][0]?.parentElement ||
            this.doc.querySelector('input[type="file"]') ||
            this.doc.querySelector('[contenteditable="true"]');
          if (toolbar && !this.status.isConnected) {
            if (toolbar === this.doc.body) {
              toolbar.append(this.status);
            } else {
              toolbar.after(this.status);
            }
          }
        } finally {
          finish?.();
        }
      }
      report() {
        let data;
        try {
          data = JSON.parse(
            this.doc.documentElement.dataset.aruUploadDiagnostic || "{}",
          );
        } catch (_) {
          return;
        }
        const blocked = Object.entries(data.blocked || {})
          .filter(
            ([state]) =>
              !["waiting", "upload-pending", "media-loading"].includes(state),
          )
          .reduce((sum, [, n]) => sum + (n as number), 0);
        const text =
          data.state === "editor-unavailable"
            ? "이 작성기에서는 이미지와 출처의 대응을 확인할 수 없습니다. 출처를 직접 기재해 주세요."
            : data.state === "capacity"
              ? "이번 작성 세션의 출처 확인 한도에 도달했습니다. 이후 이미지의 출처는 직접 기재해 주세요."
              : blocked
                ? `이미지 ${blocked}개의 출처 대응을 확인하지 못해 자동 기재하지 않았습니다. 출처를 확인해 직접 기재해 주세요.`
                : "";
        if (this.statusLabel.textContent !== text) {
          this.statusLabel.textContent = text;
        }
        this.status.hidden = !text;
      }
      destroy() {
        this.observer.disconnect();
        this.style.remove();
        this.statusCleanup?.();
        this.status.remove();
        for (const [control, record] of this.records) {
          record.cleanup?.();
          record.host.remove();
          delete control.dataset.aruNativeUpload;
          if (record.previous === null) {
            control.removeAttribute("aria-label");
          } else {
            control.setAttribute("aria-label", record.previous);
          }
        }
        this.records.clear();
        for (const input of this.doc.querySelectorAll<HTMLElement>(
          "[data-aru-native-file]",
        )) {
          delete input.dataset.aruNativeFile;
        }
      }
    }
    uploadUI = UploadUI;
    if (
      !g.__aruUploadNoAutoStart &&
      g.document &&
      /^\/community\/board\/[^/]+\/(write|modify)(?:\/|$)/.test(
        g.location.pathname,
      )
    ) {
      activeUi.get(g.document)?.();
      let ui: UploadUI | undefined;
      let revision = 0;
      let disposed = false;
      let request: AbortController | undefined;
      let unsubscribe: (() => void) | undefined;
      const pause = () => {
        ui?.destroy();
        ui = undefined;
      };
      const changed = (changes: Record<string, unknown>, area: string) => {
        if (area === "sync" && changes.enabled) {
          void refresh();
        }
      };
      const refresh = async () => {
        const current = ++revision;
        request?.abort();
        request = new g.AbortController();
        // 설정이 확인될 때까지 장식만 해제한다. 본문·파일·캡션은 수정하지 않는다.
        pause();
        unsubscribe ??= subscribeSettings(g, changed);
        const result = await readSettings(g, ["enabled"], {
          signal: request.signal,
        });
        if (disposed || current !== revision || result.state !== "success") {
          return;
        }
        unsubscribe ??= subscribeSettings(g, changed);
        if (result.values.enabled !== false) {
          ui = new UploadUI();
        }
      };
      const dispose = () => {
        disposed = true;
        ++revision;
        request?.abort();
        pause();
        unsubscribe?.();
        g.removeEventListener("pagehide", dispose);
        if (activeUi.get(g.document) === dispose) {
          activeUi.delete(g.document);
        }
      };
      activeUi.set(g.document, dispose);
      g.addEventListener("pagehide", dispose, { once: true });
      void refresh();
    }
  };
  initializeAttributionUi(environment);

  return { uploadUI: uploadUI };
}
