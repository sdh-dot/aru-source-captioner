import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
// 확장 UI의 Shadow DOM에만 스타일을 설치하고 사이트 본문의 스타일은 바꾸지 않는다.
import {
  createModuleScope,
  selectModuleExports,
} from "../runtime/module-scope.ts";

export function createIconsDesignSystem({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  let icons = createModuleScope(
    dependencies.icons,
    ["DesignSystem"],
    ["DesignSystem"],
  );
  /* Phase 2B-3 design foundation. No DOM, storage or font requests until attach(). */
  const initializeIconsDesignSystem = function (g: RuntimeEnvironment) {
    "use strict";
    const A = (icons = icons || {});
    const LIGHT = Object.freeze({
      background: "#FAF7F2",
      surface: "#FFFFFF",
      soft: "#F4EDE7",
      text: "#30252B",
      muted: "#69535D",
      wine: "#923F61",
      deepWine: "#642940",
      gold: "#C5A268",
      softGold: "#E5CFA7",
      border: "#B9A8AE",
      primary: "#923F61",
      primaryText: "#FFFFFF",
      accentText: "#FFFFFF",
      selected: "#F5E9D4",
      selectedText: "#642940",
      danger: "#8C2929",
      dangerBackground: "#FFF0E9",
    });
    const DARK = Object.freeze({
      background: "#21181E",
      surface: "#2E232A",
      soft: "#3B2C34",
      text: "#F7EEE9",
      muted: "#D2BDC6",
      wine: "#E59AB6",
      deepWine: "#F2B7CF",
      gold: "#D9B77F",
      softGold: "#E5CFA7",
      border: "#947E89",
      primary: "#C5A268",
      primaryText: "#21181E",
      accentText: "#2B1721",
      selected: "#4D392C",
      selectedText: "#F7E3BE",
      danger: "#FFC1B1",
      dangerBackground: "#482A2A",
    });
    const variables = (
      palette:
        | { [s: string]: unknown }
        | ArrayLike<unknown>
        | Readonly<{
            background: "#FAF7F2";
            surface: "#FFFFFF";
            soft: "#F4EDE7";
            text: "#30252B";
            muted: "#69535D";
            wine: "#923F61";
            deepWine: "#642940";
            gold: "#C5A268";
            softGold: "#E5CFA7";
            border: "#B9A8AE";
            primary: "#923F61";
            primaryText: "#FFFFFF";
            accentText: "#FFFFFF";
            selected: "#F5E9D4";
            selectedText: "#642940";
            danger: "#8C2929";
            dangerBackground: "#FFF0E9";
          }>
        | Readonly<{
            background: "#21181E";
            surface: "#2E232A";
            soft: "#3B2C34";
            text: "#F7EEE9";
            muted: "#D2BDC6";
            wine: "#E59AB6";
            deepWine: "#F2B7CF";
            gold: "#D9B77F";
            softGold: "#E5CFA7";
            border: "#947E89";
            primary: "#C5A268";
            primaryText: "#21181E";
            accentText: "#2B1721";
            selected: "#4D392C";
            selectedText: "#F7E3BE";
            danger: "#FFC1B1";
            dangerBackground: "#482A2A";
          }>,
    ) =>
      Object.entries(palette)
        .map(
          ([name, value]) =>
            "--aru-" +
            name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) +
            ":" +
            value +
            ";",
        )
        .join("");
    const css = `:host{${variables(LIGHT)}font-family:"Aru Pretendard",Pretendard,system-ui,-apple-system,"Malgun Gothic",sans-serif!important;color:var(--aru-text)!important;color-scheme:light}
  @media(prefers-color-scheme:dark){:host{${variables(DARK)}color-scheme:dark}}
  :host([data-aru-theme="light"]){${variables(LIGHT)}color-scheme:light}
  :host([data-aru-theme="dark"]){${variables(DARK)}color-scheme:dark}
  button,input,select,textarea{color:var(--aru-text);background:var(--aru-surface);border-color:var(--aru-border)}
  header,footer,.row,.preview,.viewport,.status{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
  .hint,.note,.info,.change-count,.drag{color:var(--aru-muted)}
  .fixed button[aria-pressed="true"],.chips button[aria-pressed="true"]{background:var(--aru-wine);color:var(--aru-accent-text);border-color:var(--aru-wine)}
  .apply{background:var(--aru-primary);color:var(--aru-primary-text);font-weight:800}
  .dialog,.body{background:var(--aru-background);color:var(--aru-text)}
  .header,.footer,.main,.selection,.group-viewport,.icon-card,.quiet,.tag-button,.group-count{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
  .header,.footer,.main,.selection,.group,.search-area,.search-box,.status-panel{border-color:var(--aru-border)}
  .search-box,.group-toggle,.status-panel,.selection-art,.media-placeholder,.catalog-row,.badge,.avatar,.small-tag{background:var(--aru-soft);color:var(--aru-deep-wine)}
  .primary,.brand,.tag-button[aria-pressed="true"]{background:var(--aru-wine);border-color:var(--aru-wine);color:var(--aru-accent-text)}
  .icon-card[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border:2px solid var(--aru-gold);box-shadow:inset 0 0 0 1px var(--aru-soft-gold)}
  .icon-card[aria-pressed="true"]::after{content:"✓";position:absolute;right:4px;top:2px;color:var(--aru-selected-text);font-size:13px;font-weight:800}
  .icon-card:hover:not([aria-pressed="true"]),.group-toggle:hover{background:var(--aru-soft)}
  a,.live,.reset{color:var(--aru-deep-wine)}
  .help,.summary,.icon-tags,.selection-label,.selection-detail,.selection-url,.phase-note,.metrics,.progress,.footer,.aliases,.group-foot,.pack-line,.icon-name,.text-button,.preview-status,.media-format{color:var(--aru-muted)}
  .summary strong{color:var(--aru-text)}.error{background:var(--aru-danger-background);color:var(--aru-danger)}
  input::placeholder{color:var(--aru-muted);opacity:1}
  button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid var(--aru-deep-wine)}
  .selection-note{color:var(--aru-selected-text);background:var(--aru-selected)}
  .selection-art{background:var(--aru-soft)}.catalog{background:var(--aru-surface);border-color:var(--aru-border)}
  .catalog input,.catalog select{background:var(--aru-surface);border-color:var(--aru-border);color:var(--aru-text)}
  .catalog-direct button,.catalog-thumbnail,.catalog-row[aria-expanded="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-color:var(--aru-gold)}
  .catalog-detail small{color:var(--aru-muted)}.target-error{background:var(--aru-danger-background);color:var(--aru-danger)}
  .search-input{color:var(--aru-text)}.search-box:focus-within{border-color:var(--aru-deep-wine);box-shadow:0 0 0 2px var(--aru-soft-gold)}
  .clear-search,.search-symbol,.arrow{color:var(--aru-muted)}
  @media(forced-colors:active){.icon-card[aria-pressed="true"]{outline:2px solid Highlight}}
  `;

    const entryCss = `:host{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;max-width:100%;vertical-align:middle;margin:3px;font-size:13px;line-height:1.4}
  .aru-entry-button{all:unset;box-sizing:border-box;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;min-height:34px;max-width:100%;padding:6px 10px;border:1px solid var(--aru-border);border-radius:7px;background:var(--aru-surface);color:var(--aru-deep-wine);cursor:pointer;touch-action:manipulation;white-space:normal}
  .aru-entry-button[data-priority="primary"],.primary{background:var(--aru-primary);color:var(--aru-primary-text);border-color:var(--aru-primary);font-weight:800}
  .aru-entry-button{gap:6px}.aru-entry-icon{display:block;flex:0 0 20px;width:20px;height:20px;object-fit:contain;pointer-events:none}
  .aru-entry-button:hover:enabled{box-shadow:inset 0 0 0 2px var(--aru-soft-gold)}
  .aru-entry-button:active:enabled{transform:translateY(1px)}
  .aru-entry-button:focus-visible{outline:3px solid var(--aru-deep-wine);outline-offset:2px}
  .aru-entry-button:disabled{opacity:.55;cursor:default;transform:none}
  .aru-entry-button[aria-busy="true"]::after{content:' · 준비 중';font-size:11px}
  .aru-media-count{font-size:11px;color:var(--aru-muted);padding:3px 5px;overflow-wrap:anywhere;cursor:default}.aru-media-count.warn{color:var(--aru-danger)}
  @media(pointer:coarse){.aru-entry-button{min-height:44px}}
  `;
    const polish = `/* RC1 presentation only. Virtual card dimensions remain owned by picker.js. */
:host{--aru-space-1:4px;--aru-space-2:8px;--aru-space-3:12px;--aru-space-4:16px;--aru-space-5:24px;--aru-radius:8px;--aru-divider:color-mix(in srgb,var(--aru-border) 48%,var(--aru-surface));--aru-shadow:0 20px 64px #170e1938;font-size:14px;line-height:1.5}
*{scrollbar-color:var(--aru-border) var(--aru-surface);scrollbar-width:thin}
::selection{background:var(--aru-selected);color:var(--aru-selected-text)}
input,textarea{caret-color:var(--aru-deep-wine)}
button,input,select,textarea{font-family:inherit;border-radius:var(--aru-radius)}
a{color:var(--aru-deep-wine);text-underline-offset:3px}
button{font-weight:600;transition:background-color 150ms ease-out,color 150ms ease-out}
button:disabled{opacity:.55;cursor:default}
button:hover:enabled{background:var(--aru-soft)}
button.primary:hover:enabled,button.apply:hover:enabled,.aru-entry-button[data-priority="primary"]:hover:enabled{background:var(--aru-deep-wine);color:var(--aru-surface)}
:host([data-aru-theme="dark"]) button.primary:hover:enabled,:host([data-aru-theme="dark"]) button.apply:hover:enabled,:host([data-aru-theme="dark"]) .aru-entry-button[data-priority="primary"]:hover:enabled{background:var(--aru-soft-gold);color:var(--aru-primary-text)}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible,[tabindex="0"]:focus-visible{outline:2px solid var(--aru-deep-wine);outline-offset:2px}
.search-box:focus-within{outline:2px solid var(--aru-deep-wine);outline-offset:2px;box-shadow:none}
.dialog,.dialog[data-modal-size="max"]{border:0;border-radius:16px;box-shadow:var(--aru-shadow)}
.dialog .header,.dialog header{padding:16px 20px;border-color:var(--aru-divider);background:var(--aru-surface)}
.dialog h1,.dialog h2,.dialog header strong{font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.dialog .header-title h1,.dialog .header h2,.dialog header strong{font-size:18px}
.dialog .brand{width:32px;height:32px;flex-basis:32px;border-radius:8px;font-size:21px}
.dialog .pack-line{font-size:12px;gap:8px}
.dialog .badge{font-size:12px;padding:0;background:transparent;color:var(--aru-muted);border-radius:0}
.dialog .pack-kind,.dialog .selection-label .badge,.dialog .metrics{display:none}
.dialog .view-controls{padding:6px 20px;border-color:var(--aru-divider);gap:12px}
.dialog .mode-label{font-size:12px;gap:6px}
.dialog .quiet,.dialog .view-controls select,.dialog .mode-label select{border-color:var(--aru-divider);border-radius:8px}
.dialog .view-controls button,.dialog .view-controls select,.dialog .mode-label select{min-height:34px}
.dialog .bundle-view .body,.dialog.bundle-view .body{gap:8px;padding:12px 16px}
.dialog .main{border:0;border-radius:0;background:var(--aru-surface)}
.dialog .selection{border:0;border-left:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface)}
.dialog .selection-label{font-size:12px;color:var(--aru-muted)}
.dialog .selection-art{background:var(--aru-soft);border-radius:12px}
.dialog .selection-detail,.dialog .selection-url,.dialog .phase-note,.dialog .selection-note,.dialog .preview-status{font-size:12px;line-height:1.5}
.dialog .selection-name{font-size:16px;font-weight:700}
.dialog .selection-tags .small-tag{font-size:12px;background:transparent;padding:0;color:var(--aru-muted)}
.dialog .primary,.dialog .apply{border:0;border-radius:8px;min-height:40px;font-size:14px;font-weight:700}
.dialog .search-area{border-color:var(--aru-divider)}
.dialog .search-box{background:var(--aru-surface);border-color:var(--aru-border);border-radius:8px;height:44px}
.dialog .search-input{font-size:14px}
.dialog .search-symbol{display:flex;width:18px;height:18px;margin:0 12px;font-size:0;flex-shrink:0}
.dialog .close,.dialog .clear-search{display:inline-flex;align-items:center;justify-content:center;background:var(--aru-surface);color:var(--aru-text)}
.dialog svg.aru-ui-icon{width:18px;height:18px;flex-shrink:0;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;fill:none;pointer-events:none}
.dialog .tag-button{border:1px solid transparent;background:var(--aru-soft);color:var(--aru-muted);font-size:12px;font-weight:500;border-radius:6px;min-height:30px;padding:3px 9px}
.dialog .tag-button[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-color:var(--aru-gold);font-weight:700}
.dialog .chips{gap:4px}
.dialog .help,.dialog .summary,.dialog .note,.dialog .hint,.dialog .info,.dialog .change-count{font-size:12px;line-height:1.5;color:var(--aru-muted)}
.dialog .help{margin-top:6px}
.dialog .library-status:empty,.dialog .live:empty,.dialog .status:empty{display:none}
.dialog .toolbar{padding:6px 12px}
.dialog .text-button{font-size:12px;min-height:32px}
.dialog .icon-card{border:1px solid transparent;border-radius:8px;background:var(--aru-surface)}
.dialog .icon-card:hover:not([aria-pressed="true"]){border-color:transparent;background:var(--aru-soft)}
.dialog .icon-card[aria-pressed="true"]{border:2px solid var(--aru-gold);background:var(--aru-selected);box-shadow:none}
.dialog .icon-card[aria-pressed="true"]::after{content:"";width:5px;height:9px;border:solid var(--aru-selected-text);border-width:0 2px 2px 0;transform:rotate(45deg);right:7px;top:5px}
.dialog .icon-name,.dialog .icon-tags{font-size:11px;line-height:14px}
.dialog .card-preview{font-size:11px;line-height:16px;border:0;background:transparent;color:var(--aru-deep-wine);border-radius:4px}
.dialog[data-icon-size="small"] .icon-name,.dialog[data-icon-size="small"] .icon-tags{font-size:10.5px;line-height:12px}
.dialog .status-panel{border:0;border-top:1px solid var(--aru-divider);border-radius:0;background:transparent;padding:8px 0}
.dialog .progress,.dialog .live{font-size:12px;line-height:1.5}
.dialog .footer,.dialog footer{font-size:12px;border-color:var(--aru-divider);background:var(--aru-surface);padding:10px 20px}
.dialog .catalog{border:0;border-radius:12px;box-shadow:none;padding:16px 20px;background:var(--aru-surface)}
.dialog .catalog-row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface)}
.dialog .catalog-row[aria-current="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-radius:8px}
.dialog .catalog-row[aria-current="true"]::after{content:"";width:7px;height:12px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg);margin:0 8px}
.dialog .catalog-detail strong{font-size:14px;font-weight:600}
.dialog .catalog-detail small{font-size:12px}
.dialog .catalog-row>span:last-child{font-size:12px;color:var(--aru-muted)}
.dialog .catalog-thumbnail{background:var(--aru-soft);color:var(--aru-muted);font-size:12px;border-radius:8px}
.dialog .catalog-direct{border-top:1px solid var(--aru-divider);padding-top:12px}
.dialog .catalog-load-status{color:var(--aru-muted);font-size:12px}
.dialog .pack-toast{border:0;border-radius:8px;box-shadow:0 4px 16px #170e1924;font-size:12px}
/* Tag editor and bundle generator share the same controls and flat lists. */
.dialog .viewport{border:0;border-radius:0;background:var(--aru-surface)}
.dialog .card{background:var(--aru-surface);border:1px solid transparent;border-radius:8px}
.dialog .card[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);box-shadow:none;border:2px solid var(--aru-gold)}
.dialog .card .check{width:16px;height:16px;border:1px solid var(--aru-muted);font-size:0!important;background:var(--aru-surface)!important}
.dialog .card[aria-pressed="true"] .check{border-color:var(--aru-gold);background:var(--aru-selected)!important}
.dialog .card[aria-pressed="true"] .check::after{content:"";position:absolute;width:5px;height:9px;left:4px;top:1px;border:solid var(--aru-selected-text);border-width:0 2px 2px 0;transform:rotate(45deg)}
.dialog .fixed button,.dialog .chips button{border-color:var(--aru-divider);background:var(--aru-soft);color:var(--aru-text);font-weight:500}
.dialog .fixed button[aria-pressed="true"],.dialog .chips button[aria-pressed="true"]{background:var(--aru-selected);border-color:var(--aru-gold);color:var(--aru-selected-text);font-weight:700}
.dialog .row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface);margin:0;padding:12px 0}
.dialog .row.drag-over{outline:2px solid var(--aru-deep-wine);outline-offset:-2px}
.dialog .row-head strong{font-size:14px;font-weight:600}
.dialog .actions{flex-wrap:wrap}
.dialog .preview{border:0;border-top:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface);padding:16px 0}
.dialog .status{background:transparent;padding:8px 0;border-radius:0;color:var(--aru-muted);font-size:12px}
.dialog .status.error,.dialog .target-error,.dialog .error{background:var(--aru-danger-background);color:var(--aru-danger);padding:10px 12px;border-radius:8px;font-size:13px}
.dialog .article-search{border:0;border-top:1px solid var(--aru-divider);border-bottom:1px solid var(--aru-divider);border-radius:0;padding:16px 0;margin:20px 0}
.dialog .article-search h3{font-size:14px;font-weight:700;margin:0 0 8px}
.dialog .search-row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;margin:0;background:var(--aru-surface);padding:10px 8px}
.dialog .search-row.selected{background:var(--aru-selected);color:var(--aru-selected-text);border-radius:8px}
.dialog .search-row .thumbnail{background:var(--aru-soft)}
.dialog .search-row small,.dialog .apply-reason{font-size:12px;color:var(--aru-muted)}
.dialog .search-row input{accent-color:var(--aru-deep-wine)}
.dialog .search-row:focus-visible{outline-color:var(--aru-deep-wine)}
.dialog input:not([type="checkbox"]),.dialog textarea,.dialog select{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
.dialog input:not([type="checkbox"]){min-height:40px}
.dialog .search-input{min-height:0!important}
.aru-entry-button{border-radius:6px;min-height:34px;font-size:13px;box-shadow:none}
.aru-entry-button:hover:enabled{box-shadow:none;background:var(--aru-soft)}
@media(max-width:750px){.dialog .selection{border-left:0;border-top:1px solid var(--aru-divider)}.dialog .mode-label{font-size:11px}.dialog .header,.dialog header{padding:10px 12px}.dialog .view-controls{padding:4px 12px;gap:6px}.dialog .footer,.dialog footer{padding:8px 12px}.dialog .catalog{padding:12px}.dialog .bundle-view .body,.dialog.bundle-view .body{padding:8px}.dialog .help{font-size:11px}.dialog .search-box{height:44px}}
@media(max-width:500px){.dialog .header-actions{justify-content:flex-start}.dialog .header-title{flex-basis:calc(100% - 52px)}.dialog .catalog-detail strong{font-size:13px}.dialog .catalog-detail small{font-size:11px}.dialog .catalog-row{gap:8px}.dialog .catalog-row>span:last-child{font-size:11px}.dialog .selection-detail,.dialog .preview-status{font-size:11px}.dialog .lookup button{flex:1}.dialog .actions{gap:4px}.dialog .actions button{min-height:34px}.dialog .search-toolbar input{min-width:100px}.dialog .primary,.dialog .apply{font-size:13px}}
@media(max-height:600px){.dialog .header,.dialog header{padding:6px 12px}.dialog .view-controls{padding:4px 12px}.dialog .phase-note,.dialog .metrics{display:none}}
@media(pointer:coarse){.dialog button:not(.card-choose),.dialog select,.aru-entry-button{min-height:44px}.dialog .close,.dialog .clear-search{min-width:44px}.dialog .card-preview{min-height:44px}.dialog .tag-button{padding:4px 10px}.dialog .card-choose{touch-action:pan-y}}
@media(prefers-reduced-motion:reduce){button{transition:none}.aru-entry-button:active:enabled{transform:none}}
@media(forced-colors:active){.dialog .icon-card[aria-pressed="true"],.dialog .card[aria-pressed="true"],.dialog .catalog-row[aria-current="true"],.dialog .tag-button[aria-pressed="true"]{outline:2px solid Highlight;outline-offset:-2px}.dialog svg{forced-color-adjust:auto}}
`;
    const fonts = new WeakMap(),
      themes = new WeakMap();
    function observeTheme(shadow: ShadowRoot) {
      const doc = shadow.host.ownerDocument;
      let watch = themes.get(doc);
      if (!watch) {
        const hosts: Set<HTMLElement> = new Set(),
          mq = g.matchMedia?.("(prefers-color-scheme: dark)");
        const detect = () => {
          // Read the site's actual painted background; no assumed theme class names.
          for (const node of [doc.body, doc.documentElement]) {
            const c = node && g.getComputedStyle(node).backgroundColor,
              values = c?.match(/[\d.]+/g)?.map(Number);
            if (
              values &&
              values.length >= 3 &&
              (values!.length < 4 || values![3] >= 0.95)
            ) {
              return 0.2126 * values![0] +
                0.7152 * values![1] +
                0.0722 * values![2] <
                128
                ? "dark"
                : "light";
            }
          }
          return mq?.matches ? "dark" : "light";
        };
        const update = () => {
          const theme = detect();
          for (const host of hosts) {
            host.dataset.aruTheme = theme;
          }
        };
        const observer = g.MutationObserver
          ? new g.MutationObserver(update)
          : null;
        for (const node of [doc.documentElement, doc.body]) {
          if (node) {
            observer?.observe(node, {
              attributes: true,
              attributeFilter: [
                "class",
                "style",
                "data-theme",
                "data-color-scheme",
              ],
            });
          }
        }
        mq?.addEventListener?.("change", update);
        watch = { hosts, update, observer, mq };
        themes.set(doc, watch);
      }
      watch.hosts.add(shadow.host);
      watch.update();
      return () => {
        watch.hosts.delete(shadow.host);
        if (!watch.hosts.size) {
          watch.observer?.disconnect();
          watch.mq?.removeEventListener?.("change", watch.update);
          themes.delete(doc);
        }
      };
    }
    function entry(
      shadow: ShadowRoot,
      {
        label,
        tooltip,
        priority = "secondary",
        fontURL,
      }: {
        label?: string;
        tooltip?: string;
        priority?: string;
        fontURL?: string;
      } = {},
    ) {
      const cleanup = attach(shadow, { fontURL });
      const style = shadow.host.ownerDocument.createElement("style");
      style.textContent = entryCss;
      shadow.append(style);
      const button = shadow.querySelector("button")!;
      button.classList.add("aru-entry-button");
      button.dataset.priority = priority;
      button.textContent = label!;
      button.title = tooltip!;
      const iconName = (
        {
          "아이콘 선택": "editor-select",
          "아이콘 통합": "editor-bundle",
          "아이콘 태그": "editor-tags",
          "이미지 첨부": "editor-upload",
        } as Record<string, string>
      )[label!];
      const icon =
        iconName &&
        assetImage(
          shadow.host.ownerDocument,
          "assets/icons/" + iconName + "-20.png",
          iconName,
          "aru-entry-icon",
        );
      if (icon) {
        button.prepend(icon);
      }
      return cleanup;
    }
    function fallbackIcon(doc: Document, kind: any, className: any) {
      const ns = "http://www.w3.org/2000/svg",
        svg = doc.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("class", className);
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.6");
      const path = doc.createElementNS(ns, "path");
      path.setAttribute(
        "d",
        String(kind).includes("tags")
          ? "M3 3h8l10 10-8 8L3 11Z M7 7h.01"
          : "M4 5h16v14H4Z M4 15l5-5 5 5 3-3 3 3",
      );
      svg.append(path);
      return svg;
    }
    function assetURL(file: string) {
      try {
        return (
          g.browser?.runtime?.getURL?.(file) ||
          g.chrome?.runtime?.getURL?.(file) ||
          null
        );
      } catch (_) {
        return null;
      }
    }
    function assetImage(
      doc: Document,
      file: string,
      kind: any,
      className: string,
      onFallback?: { (fallback: any): void; (arg0: any): void } | undefined,
    ) {
      const url = file.startsWith("assets/icons/")
        ? assetURL("assets/icons/" + file.slice("assets/icons/".length))
        : assetURL(file);
      if (!url) {
        return fallbackIcon(doc, kind, className);
      }
      const image = doc.createElement("img");
      image.className = className;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.width = 20;
      image.height = 20;
      image.draggable = false;
      image.addEventListener(
        "error",
        () => {
          const fallback = fallbackIcon(doc, kind, className);
          image.replaceWith(fallback);
          onFallback?.(fallback);
        },
        { once: true },
      );
      image.src = url;
      return image;
    }
    // Shared decorative header only; no editor, picker or metadata state is touched.
    const modalHeaderCss = `
    .dialog .aru-modal-header{--aru-header-art:128px;display:grid;grid-template-columns:minmax(0,1fr) var(--aru-header-art) auto;align-items:center;gap:16px;padding:12px 20px;flex-shrink:0;box-sizing:border-box}
    .dialog .aru-modal-heading{min-width:0;flex-basis:auto;overflow-wrap:anywhere}
    .dialog .aru-modal-heading h1,.dialog .aru-modal-heading h2{margin:0}
    .dialog .aru-modal-description{font-size:12px;line-height:1.5;color:var(--aru-muted);margin:4px 0 0}
    .dialog .aru-modal-character{display:block;width:var(--aru-header-art);height:var(--aru-header-art);max-width:none;max-height:none;object-fit:contain;aspect-ratio:1;margin-block:-8px;pointer-events:none;user-select:none}
    .dialog .aru-modal-header .header-actions{display:flex;width:auto;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:nowrap}
    .dialog .aru-modal-header .close,.dialog .aru-modal-header [data-action="close"]{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;flex-shrink:0}
    .dialog .aru-modal-header.aru-modal-no-art{grid-template-columns:minmax(0,1fr) auto}
    .dialog .aru-modal-no-art .aru-modal-heading{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;column-gap:8px}
    .dialog .aru-modal-no-art .aru-modal-character{width:24px;height:24px;margin:0;grid-row:1}
    .dialog .aru-modal-no-art .aru-modal-heading>:not(.aru-modal-character){grid-column:2}
    @media(max-width:750px){.dialog .aru-modal-header{--aru-header-art:56px;gap:8px;padding:10px 12px}.dialog .aru-modal-character{margin-block:-4px}}
    @media(max-height:600px){.dialog .aru-modal-header{--aru-header-art:32px;gap:6px;padding:6px 10px}.dialog .aru-modal-character{margin:0}}
    @media(max-width:500px){.dialog .aru-modal-header .header-actions{flex-direction:column;align-items:flex-end;gap:4px}.dialog .aru-modal-header #catalog-dock{font-size:11px;padding:4px 6px}.dialog .aru-modal-description{font-size:11px}}
  `;
    function modalHeader(
      header: HTMLElement,
      { kind, description }: { kind?: string; description?: string } = {},
    ) {
      const file = (
        {
          select: "modal-select",
          bundle: "modal-bundle",
          tags: "modal-tags",
        } as Record<string, string>
      )[kind!];
      if (!header || !file || header.classList.contains("aru-modal-header")) {
        return;
      }
      const doc = header.ownerDocument,
        shadow = header.getRootNode() as ShadowRoot;
      let heading = header.querySelector(".header-title,h1,h2,strong");
      if (!heading) {
        return;
      }
      if (!heading.classList.contains("header-title")) {
        const wrapper = doc.createElement("div");
        header.insertBefore(wrapper, heading);
        wrapper.append(heading);
        heading = wrapper;
      }
      heading.classList.add("aru-modal-heading");
      header.classList.add("aru-modal-header");
      if (description) {
        const note = doc.createElement("p");
        note.className = "aru-modal-description";
        note.textContent = description;
        heading.append(note);
      }
      if (!shadow.querySelector("[data-aru-modal-header-style]")) {
        const style = doc.createElement("style");
        style.dataset.aruModalHeaderStyle = "";
        style.textContent = modalHeaderCss;
        shadow.append(style);
      }
      const compactFallback = (fallback: any) => {
        header.classList.add("aru-modal-no-art");
        heading.prepend(fallback);
      };
      const image = assetImage(
        doc,
        "assets/icons/" + file + "-256.png",
        kind,
        "aru-modal-character",
        compactFallback,
      );
      image.setAttribute("width", "128");
      image.setAttribute("height", "128");
      if (image.tagName.toLowerCase() === "svg") {
        compactFallback(image);
      } else {
        heading.after(image);
      }
    }
    function attach(
      shadow: ShadowRoot,
      { fontURL }: { fontURL?: string } = {},
    ) {
      if (!shadow || shadow.querySelector("[data-aru-design-tokens]")) {
        return () => {};
      }
      const doc = shadow.host.ownerDocument,
        style = doc.createElement("style");
      style.dataset.aruDesignTokens = "";
      style.textContent =
        css +
        polish +
        " .primary{background:var(--aru-primary);border-color:var(--aru-primary);color:var(--aru-primary-text)}";
      shadow.append(style);
      if (!fonts.has(doc) && g.FontFace && doc.fonts) {
        const url =
          fontURL || assetURL("assets/fonts/PretendardVariable.woff2");
        if (url) {
          try {
            const face = new g.FontFace(
              "Aru Pretendard",
              'url("' + url + '")',
              { weight: "45 920", display: "swap" },
            );
            doc.fonts.add(face);
            fonts.set(
              doc,
              face
                .load()
                .then(() => true)
                .catch(() => false),
            );
          } catch (_) {
            fonts.set(doc, Promise.resolve(false));
          }
        }
      }
      return observeTheme(shadow);
    }
    function contrast(foreground: any, background: any) {
      const luminance = (hex: {
        slice: (arg0: number) => {
          (): any;
          new (): any;
          match: { (arg0: RegExp): any[]; new (): any };
        };
      }) => {
        const rgb = hex
          .slice(1)
          .match(/../g)
          .map((n) => parseInt(n, 16) / 255)
          .map((n) =>
            n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const a = luminance(foreground),
        b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
    A.DesignSystem = Object.freeze({
      LIGHT,
      DARK,
      css: css + entryCss + polish,
      attach,
      entry,
      observeTheme,
      contrast,
      assetURL,
      assetImage,
      modalHeader,
    });
  };
  initializeIconsDesignSystem(environment);

  return { icons: selectModuleExports(icons, ["DesignSystem"]) };
}
