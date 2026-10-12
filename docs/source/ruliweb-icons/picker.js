/* Aru Source Captioner: isolated icon library; unified virtual grid and native insertion. */
(function (global) {
  'use strict';
  const api = global.AruIcons = global.AruIcons || {};
  const MAX_CARDS = 72;
  const UI_SIZES=Object.freeze({small:{row:96,card:88,width:92,media:32,mediaWidth:48},normal:{row:120,card:112,width:108,media:53,mediaWidth:64},large:{row:168,card:160,width:152,media:96,mediaWidth:104}});
  function mouseDoubleClick(event,proof,now){return event.isTrusted===true&&event.type==='dblclick'&&event.button===0&&event.detail===2&&event.sourceCapabilities?.firesTouchEvents!==true&&proof?.trusted===true&&proof.pointerType==='mouse'&&now-proof.time>=0&&now-proof.time<=1200&&now-proof.touchTime>1200;}
  api.isMouseDoubleClick=mouseDoubleClick;
  let nextPickerId = 0;

  // Public image tags and dictionary tag IDs have separate meanings. Search-only
  // keywords (names/aliases/carrier terms) are never presented as image tags.
  function iconTagLabels(icon, dictionary=new Map()) {
    return [...new Set([...(icon.imageMetadata?.tags || []),...(icon.tagIds || []).map(id=>dictionary.get(id)||id)]
      .filter(tag=>typeof tag==='string' && tag.length))];
  }
  api.iconTagLabels=iconTagLabels;

  const stylesheet = `
    :host{all:initial;position:fixed;inset:0;display:block;z-index:2147483200;color:#292a35;font:14px/1.5 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;color-scheme:light}
    *,*::before,*::after{box-sizing:border-box}button,input{font:inherit;color:inherit;touch-action:manipulation}button{cursor:pointer;min-height:44px}button:disabled{opacity:.45;cursor:default}button,input,a{outline-offset:3px}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #b198df}a{color:#7150b6}h1,h2,p{margin:0}[hidden]{display:none!important}
    .backdrop{position:absolute;inset:0;background:#28213366;display:grid;place-items:center;padding:24px}.dialog{position:relative;display:flex;flex-direction:column;background:#f5f4f9;border:1px solid #d7d0e1;border-radius:20px;box-shadow:0 24px 90px #241b4255;width:min(1120px,100%);max-height:calc(var(--aru-available-height,100dvh) - 48px);min-height:340px;overflow:hidden}.header{display:flex;align-items:center;gap:12px;padding:17px 23px;border-bottom:1px solid #e5e3ec;background:white}.brand{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:#7150b6;color:white;font-size:23px;font-weight:800}.header-title{min-width:0;flex:1}.header-title h1{font-size:18px;line-height:1.4;letter-spacing:-.5px}.pack-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:11px;color:#737681}.pack-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:380px}.badge{font-size:10px;background:#eee7fa;color:#7150b6;padding:2px 7px;border-radius:20px}.header-actions{display:flex;gap:6px;flex-shrink:0}.quiet{border:1px solid #e5e3ec;border-radius:9px;background:white;padding:0 12px;font-size:12px}.close{font-size:22px;width:44px;padding:0}.body{min-height:0;overflow:auto;padding:20px}.columns{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:18px;align-items:start}.main,.selection{border:1px solid #e5e3ec;border-radius:15px;background:white;overflow:hidden}.search-area{padding:20px 20px 13px;border-bottom:1px solid #e5e3ec}.search-box{display:flex;align-items:center;border:1px solid #d6cfdf;background:#fbfafe;border-radius:11px;height:49px}.search-box:focus-within{border-color:#7150b6;box-shadow:0 0 0 3px #eee7fa}.search-symbol{font-size:23px;margin:0 12px;color:#998da5}.search-input{background:transparent;border:0;outline:none!important;min-width:0;flex:1;height:100%;font-size:15px}.search-input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}.clear-search{border:0;background:none;width:44px;flex-shrink:0;font-size:22px;color:#867c8e}.chips{display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;padding:3px 2px;margin-top:12px}.tag-button{flex-shrink:0;white-space:nowrap;border:1px solid #e5e3ec;background:white;border-radius:24px;padding:0 15px;font-size:12px}.tag-button[aria-pressed="true"]{background:#7150b6;border-color:#7150b6;color:white;font-weight:700}.help{font-size:11px;color:#737681;margin-top:8px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px;flex-wrap:wrap}.summary{font-size:12px;color:#737681}.summary strong{color:#292a35}.toolbar-actions{display:flex;gap:1px;margin-left:auto}.text-button{border:0;background:none;padding:0 7px;font-size:11px;color:#74677e}.reset{color:#7150b6;font-weight:700}.groups{padding:0 14px 14px}.group{border:1px solid #e5e3ec;border-radius:12px;margin-bottom:11px;overflow:hidden}.group:last-child{margin-bottom:0}.group-heading{font-size:14px}.group-toggle{border:0;background:#faf9fc;display:flex;align-items:center;text-align:left;padding:12px 14px;width:100%;gap:10px;min-height:61px}.group-toggle:hover{background:#f3eff9}.arrow{color:#a097ad;font-size:11px;width:12px;transform:rotate(0deg)}.group-toggle[aria-expanded="true"] .arrow{transform:rotate(90deg)}.avatar{background:#eee7fa;color:#7150b6;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-weight:800;flex-shrink:0}.group-title{min-width:0;overflow-wrap:anywhere;font-weight:800}.aliases{display:block;font-size:10px;font-weight:400;color:#737681}.group-count{margin-left:auto;flex-shrink:0;border:1px solid #e4ddec;border-radius:25px;padding:3px 8px;background:white;font-size:11px;color:#766984}.group-viewport{position:relative;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;overscroll-behavior:contain;height:252px;background:white}.virtual-content{position:relative;width:100%}.icon-card{position:absolute;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;height:112px;border:1px solid transparent;border-radius:11px;background:white;padding:6px;overflow:hidden}.icon-card:hover{background:#f7f3fc;border-color:#e9e0f3}.icon-card[aria-pressed="true"]{background:#eee7fa;border-color:#9b7ccf;box-shadow:inset 0 0 0 1px #b59ddb}.icon-media{height:65px;width:65px;object-fit:contain;display:block;pointer-events:none}.media-placeholder{height:65px;width:65px;display:grid;place-items:center;background:#f3eff8;color:#9a84b4;border-radius:13px;font-size:12px}.media-format{font-size:9px;color:#85728d}.icon-name{font-size:11px;font-weight:700;width:100%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.icon-tags{font-size:9px;color:#8a8096;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.group-foot{font-size:10px;color:#92869d;padding:5px 14px;border-top:1px solid #f0edf4}.empty{text-align:center;padding:50px 15px;color:#737681}.empty h2{font-size:15px;color:#292a35;margin-bottom:7px}.selection{padding:18px;position:sticky;top:0}.selection-label{font-size:11px;color:#737681;display:flex;justify-content:space-between;gap:5px}.selection-art{display:grid;place-items:center;min-height:145px;background:linear-gradient(135deg,#faf5fc,#eeebf8);border-radius:13px;margin:12px 0}.selection-art .icon-media,.selection-art .media-placeholder{width:102px;height:102px;pointer-events:auto}.selection-name{font-size:17px;overflow-wrap:anywhere;margin-bottom:7px}.selection-detail{font-size:11px;color:#737681;overflow-wrap:anywhere}.selection-url{display:block;font-size:10px;color:#867493;overflow-wrap:anywhere;margin-top:8px;max-height:80px;overflow:auto}.selection-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.small-tag{font-size:10px;color:#887098;background:#f3eff8;border-radius:5px;padding:3px 6px}.selection-note{font-size:11px;color:#946e2e;background:#fff7e6;padding:8px;border-radius:8px;margin-top:10px}.primary{border:1px solid #7150b6;background:#7150b6;color:white;border-radius:10px;padding:8px 13px;font-size:12px;font-weight:700}.prepare{width:100%;margin-top:13px}.phase-note{font-size:10px;color:#837b8c;margin-top:10px}.status-panel{background:#fdfcfe;border:1px solid #e5e3ec;border-radius:12px;margin-top:14px;padding:12px 15px}.progress{font-size:12px;color:#5c5366}.load-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.error{font-size:12px;color:#94412d;background:#fff1ed;padding:10px;border-radius:9px;margin-bottom:8px;overflow-wrap:anywhere}.live{font-size:11px;color:#7150b6;min-height:17px;margin-top:8px}.metrics{font-size:10px;color:#8b789c;margin-top:6px}.footer{padding:9px 23px;background:white;border-top:1px solid #e5e3ec;font-size:10px;color:#837b8c}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:750px){.backdrop{padding:0;align-items:end}.dialog{width:100%;max-height:var(--aru-available-height,100dvh);border-radius:16px 16px 0 0;min-height:60dvh}.header{padding:12px;gap:8px}.header-title h1{font-size:16px}.header-actions{gap:4px}.header-actions .quiet{padding:0 8px;font-size:11px}.header-actions .close{padding:0}.brand{width:31px;height:31px;flex-basis:31px;font-size:20px}.pack-title{max-width:200px}.body{padding:12px}.columns{grid-template-columns:minmax(0,1fr);gap:12px}.search-area{padding:15px 13px 12px}.search-input{font-size:14px}.toolbar{padding:6px 10px}.summary{font-size:11px}.groups{padding:0 10px 10px}.group-toggle{padding:11px;gap:8px}.group-title{font-size:13px}.group-count{font-size:10px}.selection{position:static;padding:15px}.selection-art{min-height:110px}.selection-art .icon-media,.selection-art .media-placeholder{width:83px;height:83px}.selection-name{font-size:16px}.footer{padding:9px 12px}.status-panel{padding:11px}.group-viewport{height:252px}.help{font-size:10px}.text-button{font-size:10px;padding:0 5px}}
    @media(forced-colors:active){.tag-button[aria-pressed="true"],.icon-card[aria-pressed="true"]{outline:2px solid Highlight}.group-count,.group{border-color:CanvasText}.arrow{color:CanvasText}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, text) {
    const node = el('button', className, text);
    node.type = 'button';
    if(text)node.title=text;
    return node;
  }
  function formatCount(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Number(value)).toLocaleString('ko-KR') : '?';
  }
  function mediaUrl(value) {
    if (typeof value !== 'string') return null;
    // Published packs pass the metadata URL validator. Data images exist only in local fixtures.
    if (/^data:image\/(?:png|gif|jpeg|webp|svg\+xml);/i.test(value)) {
      return /^(?:127\.0\.0\.1|localhost)$/.test(global.location && global.location.hostname || '') ? value : null;
    }
    if (value.includes('#')) return null;
    if (api.Metadata && typeof api.Metadata.mediaUrl === 'function') {
      try { return api.Metadata.mediaUrl(value); } catch (_) { return null; }
    }
    if (value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value) || !/^https:\/\/i[123]\.ruliweb\.com\//u.test(value)) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ['i1.ruliweb.com', 'i2.ruliweb.com', 'i3.ruliweb.com'].includes(url.hostname) && !url.username && !url.password && !url.port && !url.hash ? value : null;
    } catch (_) { return null; }
  }
  function articleUrl(source) {
    const raw = source && (source.articleUrl || source.url);
    if (typeof raw === 'string' && raw.length <= 2048 && !/[\u0000-\u0020\u007f\\]/u.test(raw) && /^https:\/\/(?:bbs|m)\.ruliweb\.com\/community\/board\/98\/read\/[1-9]\d*\/?(?:\?[^#]*)?$/u.test(raw)) {
      try {
        const url = new URL(raw);
        const match = url.pathname.match(/^\/community\/board\/([1-9]\d*)\/read\/([1-9]\d*)\/?$/u);
        if (match && Number.isSafeInteger(Number(match[2])) && url.protocol === 'https:' && /^(?:bbs|m)\.ruliweb\.com$/.test(url.hostname) && !url.username && !url.password && !url.port && !url.hash) return raw;
      } catch (_) { /* Fall through to a canonical article link. */ }
    }
    const id = source && source.articleId;
    const board=source?.boardId||98;
    return /^[1-9]\d*$/u.test(String(id)) && Number.isSafeInteger(Number(id)) && /^[1-9]\d*$/u.test(String(board)) ? 'https://bbs.ruliweb.com/community/board/'+board+'/read/' + id : null;
  }

  api.createPicker = function createPicker(options = {}) {
    if (!api.SearchIndex || !api.FoldState) throw new Error('아이콘 검색 모듈이 준비되지 않았습니다.');
    const instanceId = 'aru-icons-' + (++nextPickerId);
    const opener = options.anchor || options.opener || document.activeElement;
    const host = el('div');
    host.id = instanceId;
    host.dataset.aruIconsPicker = 'true';
    host.style.cssText = 'all:initial;position:fixed;inset:0;display:block;z-index:2147483200;color:#292a35;font:14px/1.5 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;';
    const root = host.attachShadow({mode: 'open'});
    const style = el('style');
    style.textContent = stylesheet + `
      .selection-tags{max-height:120px;overflow:auto}.small-tag{max-width:100%;overflow-wrap:anywhere}
      .catalog{background:white;border:1px solid #e5e3ec;border-radius:15px;padding:16px;margin-bottom:16px}.catalog h2{font-size:16px;margin-bottom:10px}.catalog-controls,.catalog-direct{display:flex;gap:8px;flex-wrap:wrap}.catalog input,.catalog select,.catalog button{font:inherit}.catalog input,.catalog select{padding:8px;border:1px solid #d6cfdf;border-radius:8px;min-height:44px}.catalog input{flex:1;min-width:140px}.catalog-direct{margin-top:10px}.catalog-direct button{background:#f4effb;border:1px solid #d6cfdf;border-radius:8px;padding:0 12px}.catalog-viewport{height:310px;overflow:auto;margin-top:12px;overscroll-behavior:contain}.catalog-content{position:relative}.catalog-row{position:absolute;left:0;right:0;display:flex;gap:12px;align-items:center;height:70px;width:100%;text-align:left;background:#faf9fc;border:1px solid #e5e3ec;border-radius:10px;padding:8px}.catalog-row[aria-expanded=true]{background:#eee7fa;border-color:#9b7ccf}.catalog-thumbnail{width:48px;height:48px;flex-shrink:0;object-fit:contain;background:#eee7fa;border-radius:8px;display:grid;place-items:center;color:#7150b6}.catalog-detail{flex:1;min-width:0}.catalog-detail strong,.catalog-detail small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.catalog-detail small{font-size:11px;color:#737681}.target-error{font-size:12px;color:#94412d;background:#fff1ed;padding:10px;border-radius:8px;margin-bottom:12px}
    `;
    root.append(style);
    style.textContent += `
      .icon-video-frame{position:relative;width:65px;height:65px;flex-shrink:0;pointer-events:none}
      .icon-video-frame .media-placeholder{position:absolute;inset:0}.icon-video-frame .media-placeholder[data-media-state="loading"]::after{content:'로딩 중';position:absolute;bottom:2px;font-size:9px}
      .preview-status{font-size:11px;color:#737681;margin-top:6px}.media-retry{margin-top:6px}
      .bundle-view{height:min(850px,calc(var(--aru-available-height,100dvh) - 48px));min-height:0}
      .bundle-view .body{flex:1;display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0;padding:14px}
      .bundle-view .columns{flex:1;min-height:0;align-items:stretch;gap:12px}
      .bundle-view .main{display:flex;flex-direction:column;min-height:0}
      .bundle-view .search-area{padding:12px}.bundle-view .help{margin-top:4px}
      .bundle-view .groups{flex:1;min-height:0;padding:0 8px 8px}
      .bundle-view .bundle-viewport{height:100%;min-height:0;overflow:auto;overscroll-behavior:contain}
      .bundle-view .selection{position:static;min-height:0;padding:12px}
      .bundle-view .selection-art{min-height:120px;margin:8px 0}
      .bundle-view .selection-url{max-height:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.bundle-view .selection-tags{max-height:48px}
      .bundle-view .status-panel{margin:0;padding:8px 12px;flex-shrink:0;display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center}
      .bundle-view .status-panel .error{width:100%;margin:0;max-height:64px;overflow:auto}
      .bundle-view .load-actions,.bundle-view .live,.bundle-view .metrics{margin:0}
      .bundle-view .metrics{width:100%}.bundle-view .target-error{margin:0}
      .bundle-view .catalog{display:none}.bundle-view.catalog-open .catalog{display:block;position:absolute;z-index:2;left:14px;right:14px;top:var(--aru-catalog-top,85px);box-shadow:0 8px 24px #241b4233}
      .bundle-view.catalog-open .catalog-viewport{height:190px}
      @media(max-width:750px){
        .bundle-view{height:var(--aru-available-height,100dvh)}.bundle-view .body{padding:8px;gap:6px}
        .bundle-view .columns{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(90px,1fr) auto;gap:6px}
        .bundle-view .selection{display:grid;grid-template-columns:82px minmax(0,1fr) 120px;gap:3px 10px;padding:8px}
        .bundle-view .selection-label{grid-column:1/-1}.bundle-view .selection-art{grid-column:1;grid-row:2/6;min-height:74px;margin:0}
        .bundle-view .selection-art .icon-media,.bundle-view .selection-art .media-placeholder{height:70px;width:70px}
        .bundle-view .selection-name,.bundle-view .selection-detail,.bundle-view .selection-tags,.bundle-view .preview-status{grid-column:2;margin:0}
        .bundle-view .selection-name{font-size:13px}.bundle-view .selection-detail{max-height:30px;overflow:hidden}
        .bundle-view .selection-url,.bundle-view .phase-note,.bundle-view .selection-note{display:none}
        .bundle-view #media-policy-note{display:block;grid-column:2/4;margin:0;font-size:10px}
        .bundle-view .prepare{grid-column:3;grid-row:2/4;margin:0}.bundle-view .media-retry{grid-column:3;grid-row:4/6;margin:0}
        .bundle-view .help,.bundle-view .metrics{display:none}.bundle-view .search-area{padding:8px}
        .bundle-view .chips{margin-top:4px}.bundle-view .search-box{height:44px}.bundle-view .toolbar{padding:0 8px}
        .bundle-view.catalog-open .catalog{left:8px;right:8px}.bundle-view.catalog-open .catalog-viewport{height:150px}
      }
    `;
    const uiCleanup=api.DesignSystem?.attach(root,{fontURL:options.fontURL});
    style.textContent+=`
      .search-modes{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px}.mode-label{font-size:11px;color:var(--aru-muted);display:flex;align-items:center;gap:4px}.mode-label select{min-height:32px;max-width:140px;border:1px solid var(--aru-border);border-radius:7px;background:var(--aru-surface);color:var(--aru-text);font:inherit}
      .library-status{margin-top:4px}.chips{flex-wrap:wrap;overflow:visible;gap:4px}.tag-button{min-height:30px;padding:3px 10px}
      .icon-card{padding:3px;gap:0;justify-content:flex-start}.card-choose{display:flex;align-items:center;flex-direction:column;gap:2px;width:100%;flex:1;min-height:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden}
      .icon-card .icon-media,.icon-card .icon-video-frame,.icon-card .media-placeholder{height:53px;width:64px}.icon-name{font-size:10px}.icon-tags{font-size:10px}.card-preview{min-height:24px;padding:1px 5px;width:100%;font-size:10px;border:0;border-top:1px solid var(--aru-border);background:transparent;color:var(--aru-deep-wine)}
      .icon-card:focus-visible{outline:3px solid var(--aru-deep-wine);outline-offset:-3px}.card-preview:hover{background:var(--aru-soft)}.header-actions{flex-wrap:wrap}
      @media(max-width:500px){.header{flex-wrap:wrap}.header-actions{width:100%;justify-content:flex-end}.chips{gap:3px}.tag-button{padding:2px 7px;min-height:32px}.search-modes{gap:4px}.mode-label select{max-width:106px}.mode-label{font-size:10px}.bundle-view .selection{grid-template-columns:64px minmax(0,1fr) 92px}.bundle-view .selection-art .icon-media{width:58px;height:58px}}
      @media(max-height:600px){.header{padding:6px 12px}.bundle-view .selection-art{min-height:64px}.bundle-view .selection-art .icon-media{height:60px}.help,.library-status,.phase-note,.metrics{display:none}.search-area{padding:6px!important}.selection{padding:6px!important}.footer{padding:4px}}
    `;
    style.textContent+=`
      .compact-height{min-height:0}.compact-height .body{display:block;overflow:auto;overscroll-behavior:contain}
      .compact-height.bundle-view .columns{display:flex;flex-direction:column;gap:8px}
      .compact-height.bundle-view .main{min-height:280px;flex:none}
      .compact-height.bundle-view .groups{height:140px;min-height:140px;flex:none}
      .compact-height.bundle-view .selection{display:block;flex:none}.compact-height.bundle-view .selection-art{min-height:64px}
      .compact-height .footer{max-height:32px;overflow:auto;flex-shrink:0}.compact-height .header{flex-shrink:0}
      .compact-height .phase-note,.compact-height .metrics,.compact-height .selection-url{display:none}
    `;
    style.textContent+=`
      .view-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 18px;border-bottom:1px solid var(--aru-border);background:var(--aru-surface);flex-shrink:0;font-size:12px}
      .view-controls select,.view-controls button{min-height:32px;font:inherit}.view-controls select{border:1px solid var(--aru-border);border-radius:6px;background:var(--aru-surface);color:var(--aru-text)}
      .dialog[data-modal-size="default"]{width:min(1120px,100%)}.dialog[data-modal-size="wide"]{width:min(1440px,100%)}
      .dialog[data-modal-size="max"]{width:100%;height:100%;max-height:100%;min-height:0;border-radius:10px}
      .bundle-view.preview-collapsed .columns{grid-template-columns:minmax(0,1fr)!important}
      .icon-card{height:var(--aru-card-height,112px)}.icon-card .icon-media,.icon-card .icon-video-frame,.icon-card .media-placeholder{height:var(--aru-card-media,53px);width:var(--aru-card-media-width,64px)}
      @media(max-width:750px){.view-controls{padding:4px 10px;gap:4px;font-size:11px}.dialog[data-modal-size]{max-width:100%;min-height:0}.dialog[data-modal-size="max"]{border-radius:0}}
      @media(pointer:coarse){.view-controls select,.view-controls button,.card-preview{min-height:44px}}
    `;
    const backdrop = el('div', 'backdrop');
    const dialog = el('section', 'dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', instanceId + '-title');
    dialog.setAttribute('aria-describedby', instanceId + '-phase');
    dialog.tabIndex = -1;
    backdrop.append(dialog); root.append(backdrop);
    const header = el('header', 'header');
    const flowStyle=el('style');flowStyle.textContent=`
      .catalog-backdrop{position:absolute;z-index:2;inset:var(--aru-catalog-top,85px) 0 0;background:var(--aru-surface,#faf7f2);opacity:.94}
      .bundle-view.catalog-open .catalog{z-index:3;display:flex;flex-direction:column;bottom:14px;max-height:calc(100% - var(--aru-catalog-top,85px) - 14px);margin:0;overflow:auto;background:var(--aru-surface,#fff)}
      .catalog-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0}.catalog-heading h2{margin:0}
      .bundle-view.catalog-open .catalog-viewport{flex:1;min-height:76px;height:auto}.catalog-controls,.catalog-direct,.catalog-load-status{flex-shrink:0}
      .catalog-load-status{font-size:12px;line-height:1.5;margin-top:8px;overflow-wrap:anywhere}.catalog-row{color:inherit}.catalog-row[aria-current=true]{border-color:var(--aru-gold,#C5A268)}
      .pack-toast{position:absolute;z-index:4;bottom:16px;left:18px;right:18px;pointer-events:none;border:1px solid #C5A268;border-radius:10px;background:var(--aru-surface,#fff);color:var(--aru-text,#642940);padding:10px 14px;font-size:12px;line-height:1.5;box-shadow:0 4px 16px #0002}
      .dialog.toast-visible .footer{padding-bottom:65px}
      @media(max-width:600px){.pack-toast{bottom:8px;left:10px;right:10px;padding:8px;font-size:11px}.bundle-view.catalog-open .catalog{padding:10px;bottom:8px}.catalog-controls input{min-width:100px}.catalog-direct input{min-width:90px}.catalog-row{gap:8px}.catalog-thumbnail{width:36px;height:36px}.catalog-heading h2{font-size:14px}}
    `;root.append(flowStyle);
    const headerTitle = el('div', 'header-title');
    const title = el('h1', '', '아루 아이콘'); title.id = instanceId + '-title';
    const packLine = el('div', 'pack-line');
    const packTitle = el('span', 'pack-title', options.insertionMode?'아이콘팩을 선택해 주세요':'아이콘팩을 불러오는 중');
    const packBadge = el('span', 'badge pack-kind', options.catalogMode?'목록':'NORMAL');
    const packLink = el('a', '', '원본 게시글'); packLink.target = '_blank'; packLink.rel = 'noopener noreferrer'; packLink.hidden = true;
    packLine.append(packTitle, packBadge, packLink);
    if(options.insertionMode)packLine.append(el('span','badge','삽입 대상: '+(options.targetLabel||'현재 작성기')));
    headerTitle.append(title, packLine);
    const headerActions = el('div', 'header-actions');
    const closeButton = button('quiet close', '×'); closeButton.id = 'picker-close'; closeButton.setAttribute('aria-label', '아이콘 선택기 닫기'); closeButton.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    headerActions.append(closeButton); header.append(headerTitle, headerActions); dialog.append(header);
    api.DesignSystem?.modalHeader(header,{kind:'select'});
    const catalogDock=button('quiet','아이콘 리스트');catalogDock.id='catalog-dock';catalogDock.hidden=true;
    catalogDock.setAttribute('aria-expanded','false');headerActions.prepend(catalogDock);
    const positionCatalog=()=>dialog.style.setProperty('--aru-catalog-top',(header.getBoundingClientRect().height+8)+'px');
    let catalogOpen=false,catalogReturnFocus=null,toastShown=false,toastTimer=0;
    catalogDock.addEventListener('click',()=>setCatalogOpen(!catalogOpen,'cancel'));
    const viewControls=el('div','view-controls');viewControls.setAttribute('role','group');viewControls.setAttribute('aria-label','아이콘 화면 설정');
    function viewChoice(id,label,choices){const wrapper=el('label','mode-label',label+' '),control=el('select');control.id=id;control.setAttribute('aria-label',label);for(const [value,text]of choices){const o=el('option','',text);o.value=value;control.append(o);}wrapper.append(control);viewControls.append(wrapper);return control;}
    const modalSize=viewChoice('modal-size','창 크기',[['default','기본'],['wide','넓게'],['max','최대화']]);
    const iconSize=viewChoice('icon-size','아이콘 크기',[['small','작게'],['normal','보통'],['large','크게']]);
    const previewToggle=button('quiet','미리보기 접기');previewToggle.id='preview-toggle';previewToggle.setAttribute('aria-expanded','true');viewControls.append(previewToggle);dialog.append(viewControls);
    const body = el('div', 'body');
    const targetError = el('p','target-error');targetError.hidden=true;targetError.setAttribute('role','alert');body.append(targetError);
    let targetValid=options.targetValid!==false;
    let catalogRef=null,catalogPack=null;
    async function chooseCatalog(action) {
      const result=await action();if(destroyed)return result;
      if(result?.ok===true){setCatalogOpen(false,'selected');showPackToast();}
      return result;
    }
    const catalogView=options.catalogMode&&api.CatalogView?new api.CatalogView({container:body,
      onChoose:ref=>chooseCatalog(()=>options.onCatalogSource?.(ref)),onDirect:(value,board)=>chooseCatalog(()=>options.onDirectSource?.(value,board)),onCancel:()=>setCatalogOpen(false,'cancel')}):null;
    let sourceSelect;
    if(!options.catalogMode && options.insertionMode && typeof options.onSource==='function') {
      const sourceBar=el('form','load-actions');
      sourceBar.style.cssText='margin:0 0 14px;padding:10px;border:1px solid #e5e3ec;border-radius:10px;background:white';
      sourceSelect=el('select');sourceSelect.setAttribute('aria-label','기본 선택기의 아이콘팩');sourceSelect.style.cssText='max-width:100%;min-height:44px;font:inherit';
      const sourceInput=el('input');sourceInput.id='pack-source';sourceInput.placeholder='아이콘 글 URL 또는 번호';sourceInput.setAttribute('aria-label','아이콘 게시글 URL 또는 번호');sourceInput.style.cssText='min-width:120px;flex:1;padding:8px;border:1px solid #d6cfdf;border-radius:8px';
      const sourceOpen=button('quiet','팩 열기');sourceOpen.type='submit';sourceOpen.id='pack-open';
      const sourceLabel=el('span','help','삽입 대상: '+(options.targetLabel||'현재 작성기'));
      sourceBar.append(sourceSelect,sourceInput,sourceOpen,sourceLabel);body.append(sourceBar);
      sourceBar.addEventListener('submit',event=>{event.preventDefault();Promise.resolve(options.onSource(sourceInput.value)).catch(error=>setError(error.message));});
      sourceSelect.addEventListener('change',()=>{if(sourceSelect.value)Promise.resolve(options.onSource(sourceSelect.value)).catch(error=>setError(error.message));});
    }
    const columns = el('div', 'columns'); const main = el('main', 'main');
    const searchArea = el('div', 'search-area');
    const label = el('label', 'sr-only', options.librarySearch?'게시글 제목과 아이콘 태그 검색':'카테고리, 별칭, 아이콘 이름, 태그, 키워드 검색'); label.htmlFor = instanceId + '-search';
    const searchBox = el('div', 'search-box'); const searchSymbol = el('span', 'search-symbol', '⌕'); searchSymbol.setAttribute('aria-hidden', 'true'); searchSymbol.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
    const input = el('input', 'search-input'); input.id = instanceId + '-search'; input.dataset.control = 'search-input'; input.type = 'search'; input.autocomplete = 'off'; input.placeholder = '캐릭터·태그 검색'; input.setAttribute('aria-describedby', instanceId + '-help');
    const clearSearch = button('clear-search', '×'); clearSearch.id = 'clear-search'; clearSearch.setAttribute('aria-label', '검색어만 지우기'); clearSearch.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>'; clearSearch.hidden = true;
    searchBox.append(searchSymbol, input, clearSearch);
    const chips = el('div', 'chips'); chips.id = 'tag-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', '고정 태그 필터, 여러 태그 선택 가능');
    const help = el('p', 'help', '여러 검색어는 모두 일치 · 태그 버튼은 검색어와 함께 적용'); help.id = instanceId + '-help';
    const modes=el('div','search-modes');
    function mode(id,label,choices){const wrapper=el('label','mode-label',label+' '),control=el('select');control.id=id;control.setAttribute('aria-label',label);for(const [value,text]of choices){const item=el('option','',text);item.value=value;control.append(item);}wrapper.append(control);modes.append(wrapper);return control;}
    const scope=mode('search-scope','검색 범위',[['current','현재 팩'],['all','전체 팩']]);
    const textMatch=mode('text-match','검색어',[['all','모두 일치'],['any','하나 이상']]);
    const tagMatch=mode('tag-match','태그',[['any','하나 이상'],['all','모두 일치']]);
    const libraryStatus=el('p','help library-status');libraryStatus.setAttribute('role','status');libraryStatus.setAttribute('aria-live','polite');
    modes.hidden=!options.librarySearch;
    searchArea.append(label, searchBox, modes, chips, help,libraryStatus);
    const toolbar = el('div', 'toolbar');
    const summary = el('div', 'summary'); summary.id = 'result-summary'; summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite'); summary.setAttribute('aria-atomic', 'true');
    const toolbarActions = el('div', 'toolbar-actions');
    const expandAll = button('text-button', '모두 펼치기'); expandAll.id = 'expand-all';
    const collapseAll = button('text-button', '모두 접기'); collapseAll.id = 'collapse-all';
    const reset = button('text-button reset', '검색 지우기'); reset.id = 'search-reset';
    toolbarActions.append(expandAll, collapseAll, reset); toolbar.append(summary, toolbarActions);
    const groupsNode = el('div', 'groups'); groupsNode.id = 'groups'; main.append(searchArea, toolbar, groupsNode);
    const selection = el('aside', 'selection'); selection.setAttribute('aria-labelledby', instanceId + '-selection');
    const selectionLabel = el('div', 'selection-label', '선택한 아이콘'); const readBadge = el('span', 'badge', '선택 준비'); selectionLabel.append(readBadge);
    const selectionArt = el('div', 'selection-art');
    const selectionName = el('h2', 'selection-name', '아이콘을 골라주세요'); selectionName.id = instanceId + '-selection';
    const selectionDetail = el('p', 'selection-detail', '선택한 아이콘을 여기서 확인하세요.');
    const selectionSource = el('a', 'selection-url'); selectionSource.target = '_blank'; selectionSource.rel = 'noopener noreferrer'; selectionSource.hidden = true;
    const selectionUrl = el('span', 'selection-url');
    const selectionTags = el('div', 'selection-tags');
    const selectionNote = el('p', 'selection-note', '검색 결과 밖의 아이콘을 선택한 상태입니다.'); selectionNote.hidden = true;
    const prepare = button('primary prepare', options.insertionMode?'삽입':'선택 정보 준비'); prepare.id = 'prepare-selection'; prepare.disabled = true;
    const phaseNote = el('p', 'phase-note', options.insertionMode?'선택 후 삽입하세요. PC에서는 더블클릭으로 삽입할 수 있습니다.':'조회용 화면입니다. 작성기에서 열면 삽입할 수 있습니다.'); phaseNote.id = instanceId + '-phase';
    selection.append(selectionLabel, selectionArt, selectionName, selectionDetail, selectionSource, selectionUrl, selectionTags, selectionNote, prepare, phaseNote);
    const previewStatus=el('p','preview-status');previewStatus.id='preview-status';previewStatus.setAttribute('role','status');
    const mediaRetry=button('quiet media-retry','다시 시도');mediaRetry.id='media-retry';mediaRetry.hidden=true;
    const mediaPolicyNote=el('p','selection-note');mediaPolicyNote.id='media-policy-note';mediaPolicyNote.hidden=true;
    selection.append(previewStatus,mediaRetry,mediaPolicyNote);
    columns.append(main, selection); body.append(columns);if(options.catalogMode&&!options.librarySearch)columns.hidden=true;
    const statusPanel = el('section', 'status-panel'); statusPanel.setAttribute('aria-label', '아이콘 수집 상태');
    const errorNode = el('p', 'error'); errorNode.id = 'load-error'; errorNode.hidden = true; errorNode.setAttribute('role', 'alert');
    const progressNode = el('p', 'progress', '아이콘 리스트에서 팩을 선택하세요.'); progressNode.id = 'load-progress'; progressNode.setAttribute('role', 'status'); progressNode.setAttribute('aria-live', 'polite'); progressNode.setAttribute('aria-atomic', 'true');
    const loadActions = el('div', 'load-actions');
    const stop = button('quiet', '로딩 중지'); stop.id = 'load-stop'; stop.disabled = true;
    const retry = button('quiet', '재시도'); retry.id = 'load-retry'; retry.disabled = true;
    const refresh = button('quiet', '새로고침'); refresh.id = 'load-refresh'; refresh.disabled = typeof options.onRefresh !== 'function';
    loadActions.append(stop, retry, refresh);
    const live = el('p', 'live'); live.id = 'status-message'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    const metrics = el('p', 'metrics'); metrics.id = 'perf-summary';
    statusPanel.append(errorNode, progressNode, loadActions, live, metrics); body.append(statusPanel); dialog.append(body);
    const footer = el('footer', 'footer', '원본 파일과 출처를 그대로 사용합니다.'); dialog.append(footer);
    const catalogBackdrop=el('div','catalog-backdrop');catalogBackdrop.hidden=true;dialog.append(catalogBackdrop);
    const toast=el('p','pack-toast');toast.id='pack-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');dialog.append(toast);
    function setCatalogOpen(open,reason='cancel'){
      if(!catalogView||destroyed)return;
      if(open&&!catalogOpen)catalogReturnFocus=root.activeElement;
      if(!open&&reason==='cancel'){options.onCatalogCancel?.();catalogView.cancelPending();}
      catalogOpen=open;dialog.classList.toggle('catalog-open',open);catalogDock.setAttribute('aria-expanded',String(open));catalogView.node.hidden=!open;catalogBackdrop.hidden=!open;
      for(const node of [viewControls,columns,statusPanel,targetError,footer,packLink]){node.inert=open;if(open)node.setAttribute('inert','');else node.removeAttribute('inert');}
      if(open){positionCatalog();catalogView.input.focus({preventScroll:true});}
      else {const focus=reason==='selected'?input:catalogReturnFocus?.isConnected?catalogReturnFocus:catalogDock;focus.focus({preventScroll:true});}
    }
    function showPackToast(){if(toastShown||destroyed)return;toastShown=true;toast.textContent="아이콘팩을 불러왔어요. 다른 팩은 '아이콘 리스트'에서 선택하세요.";toast.hidden=false;dialog.classList.add('toast-visible');toastTimer=setTimeout(()=>{toastTimer=0;if(!destroyed){toast.hidden=true;dialog.classList.remove('toast-visible');}},3500);}

    document.body.append(host);

    const collapsedInsert=button('primary',prepare.textContent);collapsedInsert.id='collapsed-insert';collapsedInsert.hidden=true;collapsedInsert.disabled=true;loadActions.append(collapsedInsert);
    let rowHeight=120,ui={modalSize:'default',iconSize:'normal',previewVisible:true},uiRevision=0;
    const preferences=options.uiPreferences||api.UiPreferences;let mouseProof=null,lastTouchTime=-Infinity;
    const coarsePointer=global.matchMedia?.('(pointer:coarse)');
    function currentCardSize(){const size=UI_SIZES[ui.iconSize];return coarsePointer?.matches?{...size,row:size.row+32,card:size.card+32}:size;}
    const events = new AbortController();
    const listen = (node, type, handler, other = {}) => node.addEventListener(type, handler, {...other, signal: events.signal});
    const folds = new Map();
    let fold = new api.FoldState();
    let currentPackKey = null;
    let pack = null;
    let index = null;
    let displayTags = new Map();
    let collectionDiagnostics = null;
    let lastMetadataLog = '';
    let result = {groups: [], uniqueCount: 0, membershipCount: 0};
    let contexts = [];
    let visibilityObserver = null;
    let resizeObserver = null;
    let destroyed = false;
    let composing = false;
    let searchTimer = 0;
    let virtualFrame = 0;
    let initialFocusFrame = 0;
    let selectedIconId = null;
    let preparing = false;
    let previewState={iconId:null,status:'none',code:null};
    let previewCleanup=()=>{};
    const mediaFailures=new Map();
    let lastListCriteria='';
    const library=options.librarySearch||null;let basePack=null,libraryResult=null,collectionKey='',libraryFrame=0;const projections=new WeakMap();let currentProgress=null;
    // UI layout only: NORMAL/BUNDLE collection and metadata remain distinct.
    const isGrid=()=>true;
    function syncLayout(){dialog.classList.toggle('bundle-view',isGrid());catalogDock.hidden=!isGrid()||!catalogView;expandAll.hidden=collapseAll.hidden=isGrid();}
    let lastSearchMs = 0;
    let lastRenderMs = 0;
    const mediaBudget=api.MediaBudget?new api.MediaBudget(4):null;
    const mediaCleanups=new WeakMap();
    const state = {query: '', selectedTagIds: [], tagMatch: 'any', categoryFilterIds: [], sourceFilterIds: [], sort: 'source', queryRevision: 0};
    const hasCriteria = () => !!state.query.normalize('NFKC').trim() || state.selectedTagIds.length > 0 || state.categoryFilterIds.length > 0 || state.sourceFilterIds.length > 0;
    const announce = text => { if (!destroyed) live.textContent = text; };
    const byIconId = id => (pack && pack.icons || []).find(icon => icon.id === id);
    const tagsFor = icon => displayTags.get(icon.id) || [];
    const sourceOf = icon => icon.librarySource || (pack && pack.sources || []).find(source => source.sourceId === icon.sourceId || source.id === icon.sourceId);

    function pauseMedia(node) {
      node.querySelectorAll('video').forEach(video => {mediaCleanups.get(video)?.();mediaCleanups.delete(video);try { video.pause();video.removeAttribute('src');video.querySelectorAll('source').forEach(s=>s.removeAttribute('src'));video.load(); } catch (_) { /* Detached media can be ignored. */ } });
    }
    function cancelSearch() { if (searchTimer) { clearTimeout(searchTimer); searchTimer = 0; } }
    function teardownGroups() {
      mediaBudget?.reset();
      if (virtualFrame) { cancelAnimationFrame(virtualFrame); virtualFrame = 0; }
      if (visibilityObserver) { visibilityObserver.disconnect(); visibilityObserver = null; }
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      contexts.forEach(context => { context.viewport.removeEventListener('scroll', context.scrollHandler); pauseMedia(context.content); });
      contexts = [];
    }
    function mediaDiagnostic(icon,stage,code,eventCode=null){
      const exact=mediaUrl(icon.url),url=exact&&new URL(exact);
      const publicQuery=url&&/^(?:\?(?:gif|webp|png|jpg|jpeg|avif))?$/i.test(url.search);
      const row={articleId:icon.origin?.articleId||sourceOf(icon)?.articleId||null,originalIndex:icon.origin?.originalIndex??null,
        iconId:!publicQuery&&String(icon.id).includes('?')?String(icon.id).split('?')[0]+'?[query omitted]':icon.id,
        kind:icon.mediaKind||'unknown',url:url?(publicQuery?exact:url.origin+url.pathname+'?[query omitted]'):null,stage,code,eventCode};
      // Bounded, public-media-only diagnostics; never include editor/session data.
      const key=icon.id+':'+stage;mediaFailures.set(key,row);if(mediaFailures.size>100)mediaFailures.delete(mediaFailures.keys().next().value);
      if(options.debug===true)global.console?.info?.('[Aru Icons] media diagnostics',row);
    }
    function updatePrepare(){
      const icon=byIconId(selectedIconId),native=icon&&options.insertionMode&&api.ComposerAdapter?.selectedMedia(icon);
      const unsupported=native&&!/\.(png|jpe?g|gif|webp|mp4)(?:\?|$)/i.test(native.url||'');
      mediaPolicyNote.hidden=!unsupported;
      mediaPolicyNote.textContent=unsupported?'미리보기는 지원하지만 현재 네이티브 삽입은 PNG·JPG·GIF·WEBP·MP4만 지원합니다.':'';
      prepare.disabled=!icon||preparing||!targetValid||typeof options.onSelect!=='function'||previewState.status==='error'||!!unsupported;
      collapsedInsert.disabled=prepare.disabled;prepare.setAttribute('aria-busy',String(preparing));collapsedInsert.setAttribute('aria-busy',String(preparing));
    }
    function createMedia(icon, preview = false, context = null, position = 0, renderMedia = null) {
      const url = mediaUrl(icon.url);
      if (!url) {mediaDiagnostic(icon,preview?'preview':'thumbnail','UNSAFE_URL');if(preview){previewState={iconId:icon.id,status:'error',code:'UNSAFE_URL'};previewStatus.textContent='원본 주소를 확인할 수 없습니다.';mediaRetry.hidden=false;updatePrepare();}return el('span', 'media-placeholder', '원본 확인');}
      const video = /video|mp4|webm/i.test(String(icon.mediaKind || '')) || /\.(mp4|webm)(?:[?#]|$)/i.test(url);
      const frameThumbnail=video&&!preview;
      const frame=frameThumbnail?el('span','icon-video-frame'):null;
      const cover=frameThumbnail?el('span','media-placeholder',/\.webm(?:[?#]|$)/i.test(url)?'WEBM · 보기':'MP4 · 보기'):null;
      if(cover){cover.dataset.mediaState='loading';cover.setAttribute('aria-label','동영상 썸네일 로딩 중');}
      // The common grid uses the existing BUNDLE visibility/request budget for both kinds.
      // Legacy grouped presentation is retained only as an inactive compatibility branch.
      const capped=!preview&&!isGrid()&&options.catalogMode&&/\.(gif|webp)(?:[?#]|$)/i.test(url);
      if(capped&&renderMedia){if(renderMedia.animatedRemaining<=0)return el('span','media-placeholder','미리보기');renderMedia.animatedRemaining--;}
      const media = el(video ? 'video' : 'img', 'icon-media');
      if(capped)media.dataset.animatedThumb='true';
      if (video) {
        media.preload = 'auto'; media.muted = true; media.playsInline = true;
        media.controls = preview; media.autoplay = false;
        media.setAttribute('aria-label', (icon.name || '원본 아이콘') + ', 동영상');
      } else {
        // The virtual window and budget decide visibility before assigning src.
        // A selected preview must not wait for native lazy-load heuristics.
        media.loading = preview||isGrid()?'eager':'lazy'; media.decoding = 'async'; media.alt = preview ? icon.name || '선택한 아이콘' : '';
      }
      let finished=false,timer=0,frameSeeking=false;
      const clean=()=>{clearTimeout(timer);media.removeEventListener(video?'loadeddata':'load',ready);media.removeEventListener('loadedmetadata',seekFrame);media.removeEventListener('seeked',seekReady);media.removeEventListener('error',failed);};
      const ready=()=>{if(finished||!media.isConnected||destroyed||frameThumbnail&&(frameSeeking||media.readyState<2))return;finished=true;clean();media.dataset.mediaState='ready';cover?.remove();if(frame)frame.dataset.mediaState='ready';if(preview){previewState={iconId:icon.id,status:'ready',code:null};previewStatus.textContent='미리보기 준비됨';mediaRetry.hidden=true;updatePrepare();}};
      const seekReady=()=>{frameSeeking=false;ready();};
      const seekFrame=()=>{if(!frameThumbnail||finished||!media.isConnected)return;try{if(Number.isFinite(media.duration)&&media.duration>0){frameSeeking=true;media.currentTime=Math.min(.01,media.duration/2);}else ready();}catch(_){frameSeeking=false;ready();}};
      const showFailure = (text,code) => {
        if (!media.isConnected || destroyed) return;
        if(finished)return;finished=true;clean();
        mediaDiagnostic(icon,preview?'preview':'thumbnail',code,video?media.error?.code||null:null);
        const placeholder = el('span', 'media-placeholder', text);
        placeholder.dataset.mediaState='error';placeholder.dataset.mediaCode=code;
        if(video&&media.error?.code)placeholder.dataset.mediaEventCode=String(media.error.code);
        placeholder.title = '선택한 아이콘의 미디어 재시도에서 원본을 다시 확인할 수 있습니다.';
        if(frame){frame.replaceChildren(placeholder);frame.dataset.mediaState='error';}else media.replaceWith(placeholder);
        media.removeAttribute('src');if(preview){previewState={iconId:icon.id,status:'error',code};previewStatus.textContent=text+' · 재시도하거나 원문을 확인해 주세요.';mediaRetry.hidden=false;updatePrepare();}
      };
      const failed=()=>showFailure('미디어를 읽지 못했습니다.','MEDIA_ERROR');
      media.dataset.mediaState='loading';media.addEventListener(video?'loadeddata':'load',ready);media.addEventListener('error',failed);
      mediaCleanups.set(media,()=>{finished=true;clean();});
      if(frameThumbnail){media.addEventListener('loadedmetadata',seekFrame);media.addEventListener('seeked',seekReady);frame.append(media,cover);}
      if(preview){previewState={iconId:icon.id,status:'loading',code:null};previewStatus.textContent='미리보기 로딩 중';mediaRetry.hidden=false;previewCleanup=()=>{finished=true;clean();};
        timer=setTimeout(()=>showFailure('미리보기 로딩 시간 초과','MEDIA_TIMEOUT'),15000);media.src=url;
      }else if(mediaBudget)mediaBudget.add(media,url,()=>showFailure('로딩 시간 초과','MEDIA_TIMEOUT'),()=>{
        if(!context||!isGrid()&&!frameThumbnail)return true;
        const top=Math.floor(position/context.columns)*rowHeight;
        return top+rowHeight>context.viewport.scrollTop && top<context.viewport.scrollTop+context.viewport.clientHeight;
      },frameThumbnail?{events:['loadeddata','seeked'],isReady:()=>media.dataset.mediaState==='ready'}:null);
      else media.src=url;
      return frame||media;
    }
    function updateMetrics() {
      metrics.textContent = '전체 데이터 ' + formatCount(pack && pack.icons.length || 0) + '개 · 현재 렌더링 ' + root.querySelectorAll('.icon-card').length + '개 / 최대 ' + MAX_CARDS + '개 · 검색 ' + lastSearchMs.toFixed(2) + 'ms · 그룹 갱신 ' + lastRenderMs.toFixed(2) + 'ms';
    }
    function select(icon) {
      if(catalogOpen)return;
      selectedIconId = icon.id;
      root.querySelectorAll('.icon-card').forEach(card => {card.setAttribute('aria-pressed', String(card.dataset.iconId === selectedIconId));card.querySelector('.card-choose')?.setAttribute('aria-pressed',String(card.dataset.iconId === selectedIconId));});
      renderSelection(); announce((icon.name || '아이콘') + (options.insertionMode?' 선택. 삽입을 누르세요.':' 선택. 선택 정보 준비 버튼으로 확인해 주세요.'));
    }
    function makeCard(icon, position, context, renderMedia) {
      const card = el('div','icon-card');card.tabIndex=0;card.setAttribute('role','group'); card.dataset.iconId = icon.id; card.dataset.groupId = context.group.id; card.dataset.index = String(position);
      const labels = tagsFor(icon).join(' · ');
      card.setAttribute('aria-pressed', String(icon.id === selectedIconId));
      card.setAttribute('aria-label', (icon.name || '아이콘 ' + (position + 1)) + (labels ? ', 태그 ' + labels : '') + ', 선택');
      card.style.top = (Math.floor(position / context.columns) * rowHeight + 4) + 'px';
      card.style.left = 'calc(' + (position % context.columns) * 100 / context.columns + '% + 4px)';
      card.style.width = 'calc(' + 100 / context.columns + '% - 8px)';
      const name = el('span', 'icon-name', icon.name || '아이콘 ' + (position + 1));name.title=[icon.name||'아이콘 '+(position+1),sourceOf(icon)?.title,...(icon.libraryMemberships||[]).map(m=>m.title)].filter(Boolean).join(' · ');
      const tags = el('span', 'icon-tags', labels || '태그 없음');
      if(labels)tags.title=labels;
      const choose=button('card-choose');choose.setAttribute('aria-label',card.getAttribute('aria-label'));choose.setAttribute('aria-pressed',String(icon.id===selectedIconId));choose.append(createMedia(icon,false,context,position,renderMedia),name,tags);card.append(choose);
      choose.title=options.insertionMode?'한 번 클릭하여 선택 · 마우스로 더블클릭하여 삽입':'아이콘 선택';
      let touchStart=null,moved=false;
      card.addEventListener('pointerdown',event=>{moved=false;touchStart=event.pointerType==='touch'?{x:event.clientX,y:event.clientY}:null;if(event.pointerType==='touch'){lastTouchTime=performance.now();mouseProof=null;}else if(event.isTrusted&&event.pointerType==='mouse'&&event.isPrimary!==false&&event.button===0)mouseProof={trusted:true,pointerType:'mouse',time:performance.now(),touchTime:lastTouchTime,iconId:icon.id};});
      card.addEventListener('pointermove',event=>{if(touchStart&&Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>8)moved=true;});
      card.addEventListener('pointercancel',()=>{moved=true;mouseProof=null;});
      card.addEventListener('click', event => {if(moved){event.preventDefault();moved=false;return;}select(icon);});
      const preview=button('card-preview','미리보기');preview.title='아이콘을 선택하고 미리보기 패널에서 확인합니다.';
      preview.dataset.previewFor=icon.id;preview.addEventListener('click',event=>{if(catalogOpen)return;if(moved){event.preventDefault();moved=false;mouseProof=null;return;}if(!ui.previewVisible)applyUi({...ui,previewVisible:true},true);select(icon);selection.scrollIntoView?.({block:'nearest'});});
      // Sibling button avoids nested interactive elements. Same virtual item owns both.
      card.append(preview);preview.addEventListener('click',event=>event.stopPropagation());
      preview.addEventListener('dblclick',event=>event.stopPropagation());
      card.addEventListener('dblclick',event=>{if(catalogOpen||!options.insertionMode||event.target.closest?.('.card-preview')||moved||mouseProof?.iconId!==icon.id||!mouseDoubleClick(event,mouseProof,performance.now()))return;event.preventDefault();event.stopPropagation();select(icon);requestInsertion();});
      card.addEventListener('keydown', event => {
        const offsets = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: context.columns, ArrowUp: -context.columns, PageDown: context.columns * 2, PageUp: -context.columns * 2};
        let next;
        if(event.key==='Enter'||event.key===' '){if(event.target===card){event.preventDefault();select(icon);}return;}
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = context.group.icons.length - 1;
        else if (Object.prototype.hasOwnProperty.call(offsets, event.key)) next = Math.min(context.group.icons.length - 1, Math.max(0, position + offsets[event.key]));
        else return;
        event.preventDefault();
        const top = Math.floor(next / context.columns) * rowHeight;
        if (top < context.viewport.scrollTop) context.viewport.scrollTop = top;
        else if (top + rowHeight > context.viewport.scrollTop + context.viewport.clientHeight) context.viewport.scrollTop = top + rowHeight - context.viewport.clientHeight;
        context.lastWindow = '';
        context.forceIndex = next;
        renderWindows();
        const target = [...context.content.children].find(node => Number(node.dataset.index) === next);
        if (target) target.focus({preventScroll: true});
      });
      return card;
    }
    function queueWindows() {
      if (virtualFrame || destroyed) return;
      virtualFrame = requestAnimationFrame(() => { virtualFrame = 0; if (!destroyed) renderWindows(); });
    }
    function renderWindows() {
      if (destroyed) return;
      let remaining = MAX_CARDS;
      // Count the new virtual windows, including cards built in detached fragments.
      const renderMedia = {animatedRemaining:4};
      // Focused groups get their window first so keyboard navigation cannot lose its item to the DOM budget.
      const active = root.activeElement?.closest('.icon-card')||root.activeElement;
      const ordered = contexts.slice().sort((a, b) => Number(b.content.contains(active)) - Number(a.content.contains(active)));
      ordered.forEach(context => {
        const width = context.viewport.clientWidth;
        const nextColumns=Math.max(2,Math.min(8,Math.floor(width/UI_SIZES[ui.iconSize].width),Math.floor(MAX_CARDS/(Math.ceil((context.viewport.clientHeight||248)/rowHeight)+2))||2));
        let resizedTop=null;
        // Keep the logical first visible item when responsive column count changes.
        if(isGrid()&&context.lastWindow&&(context.columns!==nextColumns||context.rowHeight!==rowHeight)){
          const oldHeight=context.rowHeight||rowHeight,anchor=Math.floor(context.viewport.scrollTop/oldHeight)*context.columns;
          resizedTop=Math.floor(anchor/nextColumns)*rowHeight+(context.viewport.scrollTop%oldHeight)/oldHeight*rowHeight;
          if(context.content.contains(active)&&Number.isInteger(Number(active.dataset.index))){
            const focusedTop=Math.floor(Number(active.dataset.index)/nextColumns)*rowHeight;
            if(focusedTop<resizedTop)resizedTop=focusedTop;
            else if(focusedTop+rowHeight>resizedTop+context.viewport.clientHeight)resizedTop=focusedTop+rowHeight-context.viewport.clientHeight;
          }
        }
        context.columns=nextColumns;context.rowHeight=rowHeight;
        const rows = Math.ceil(context.group.icons.length / context.columns);
        const height = rows * rowHeight + 8;
        context.content.style.height = height + 'px';
        // Set the new content height first: real browsers otherwise clamp the
        // requested position to the old, shorter scroll range.
        if(resizedTop!==null)context.viewport.scrollTop=resizedTop;
        if(!isGrid())context.viewport.style.height = Math.min(height, 248) + 'px';
        if (!context.visible && !context.content.contains(active) && context.forceIndex === null) {
          if (context.content.childElementCount) { pauseMedia(context.content); context.content.replaceChildren(); }
          context.lastWindow = ''; return;
        }
        const firstRow = Math.max(0, Math.floor(context.viewport.scrollTop / rowHeight) - 1);
        // Cover every visible row plus one row on each side, including the final partial row.
        const lastRow = Math.min(rows, Math.ceil((context.viewport.scrollTop + context.viewport.clientHeight) / rowHeight) + 1);
        let first = firstRow * context.columns;
        const windowLimit = isGrid()?MAX_CARDS:context.columns * 5;
        let end = Math.min(lastRow * context.columns, context.group.icons.length, first + windowLimit, first + remaining);
        if (context.forceIndex !== null && (context.forceIndex < first || context.forceIndex >= end) && remaining > 0) {
          first = Math.max(0, Math.floor(context.forceIndex / context.columns) * context.columns);
          end = Math.min(context.group.icons.length, first + windowLimit, first + remaining);
        }
        context.forceIndex = null;
        const key = rowHeight + ':' + context.columns + ':' + first + ':' + end + (!isGrid()&&options.catalogMode?':a:'+renderMedia.animatedRemaining:'');
        const focusedIndex = context.content.contains(active) ? Number(active.dataset.index) : null;
        remaining -= Math.max(0, end - first);
        if (key === context.lastWindow) {if(!isGrid())renderMedia.animatedRemaining=Math.max(0,renderMedia.animatedRemaining-context.content.querySelectorAll('[data-animated-thumb]').length);return;}
        context.lastWindow = key;
        // Keep overlapping cards (and their media requests) alive. Reuse requires
        // the same icon ID, index and column layout; never rebind an old image/tag.
        if(!isGrid()){
          pauseMedia(context.content);const fragment=document.createDocumentFragment();
          for(let position=first;position<end;position++)fragment.append(makeCard(context.group.icons[position],position,context,renderMedia));
          context.content.replaceChildren(fragment);
        }else{
        const old=new Map([...context.content.children].map(card=>[card.dataset.iconId,card]));
        const keep=new Set();
        for(const card of old.values())if(Number(card.dataset.index)<first||Number(card.dataset.index)>=end||(card.dataset.columns!==String(context.columns)||card.dataset.rowHeight!==String(rowHeight))){pauseMedia(card);card.remove();}
        for(let position=first;position<end;position++){
          const icon=context.group.icons[position],existing=old.get(icon.id);
          const card=existing&&Number(existing.dataset.index)===position&&existing.dataset.columns===String(context.columns)&&existing.dataset.rowHeight===String(rowHeight)?existing:makeCard(icon,position,context,renderMedia);
          card.dataset.columns=String(context.columns);card.dataset.rowHeight=String(rowHeight);keep.add(card);
          const at=context.content.children[position-first];if(at!==card)context.content.insertBefore(card,at||null);
        }
        for(const card of old.values())if(!keep.has(card)){pauseMedia(card);card.remove();}
        }
        if (focusedIndex !== null) {
          const replacement = [...context.content.children].find(node => Number(node.dataset.index) === focusedIndex);
          if (replacement) replacement.focus({preventScroll: true});
          else (context.toggle||input).focus({preventScroll: true});
        }
      });
      mediaBudget?.prune();updateMetrics();
    }
    function renderChips(rebuild = false) {
      if (rebuild) {
        chips.replaceChildren();
        const tags = library ? api.libraryFixedTags.map(name=>({id:name,name})) : pack && pack.tags || [];
        chips.hidden = tags.length === 0;
        if (tags.length) [{id: '', name: '전체'}, ...tags].forEach(tag => {
          const chip = button('tag-button', tag.name); chip.dataset.tagId = tag.id;
          chip.addEventListener('click', () => {
            cancelSearch();
            // A chip commits the current input, even if its debounce has not fired yet.
            if (!composing) state.query = input.value;
            if(library){if(!tag.id)state.selectedTagIds=[];else state.selectedTagIds=state.selectedTagIds.includes(tag.id)?state.selectedTagIds.filter(id=>id!==tag.id):[...state.selectedTagIds,tag.id];}else state.selectedTagIds = tag.id && !state.selectedTagIds.includes(tag.id) ? [tag.id] : [];
            applySearch();
          }); chips.append(chip);
        });
      }
      chips.querySelectorAll('button').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.tagId ? state.selectedTagIds.includes(chip.dataset.tagId) : !state.selectedTagIds.length)));
    }
    function renderSelection() {
      const icon = byIconId(selectedIconId);
      updatePrepare();
      selectionTags.replaceChildren();
      const keepPreview=icon&&previewState.iconId===icon.id&&selectionArt.dataset.url===icon.url;
      if(!keepPreview){previewCleanup();pauseMedia(selectionArt); selectionArt.replaceChildren();previewState={iconId:null,status:'none',code:null};previewStatus.textContent='';mediaRetry.hidden=true;selectionArt.dataset.url=icon?.url||'';}
      selectionSource.hidden = true; selectionSource.removeAttribute('href'); selectionUrl.textContent = '';
      selectionNote.hidden = !icon || result.groups.some(group => group.icons.some(item => item.id === icon.id));
      if (!icon) {
        selectionArt.append(el('span', 'media-placeholder', '선택 대기'));
        selectionName.textContent = '아이콘을 골라주세요';
        selectionDetail.textContent = '선택한 아이콘을 여기서 확인하세요.';
        return;
      }
      if(!keepPreview&&ui.previewVisible)selectionArt.append(createMedia(icon, true)); selectionName.textContent = icon.name || '선택한 아이콘';
      const source = sourceOf(icon);
      const categoryNames = (pack.categories || []).filter(category => (icon.categoryIds || []).includes(category.id)).map(category => category.name);
      selectionDetail.textContent = categoryNames.join(' · ') + (categoryNames.length && source ? ' / ' : '') + (source ? source.title || '원본 글 ' + source.articleId : '출처 정보 미확인');
      const sourceLink = articleUrl(source);
      if (sourceLink) { selectionSource.href = sourceLink; selectionSource.textContent = '출처 게시글 열기'; selectionSource.hidden = false; }
      selectionUrl.textContent = '원본 URL: ' + (icon.url || '미확인');
      selectionUrl.title=icon.url||'';
      tagsFor(icon).forEach(tag => selectionTags.append(el('span', 'small-tag', tag)));
      updatePrepare();
    }
    function renderGroups() {
      const started = performance.now();
      const oldActive = root.activeElement;
      const activeGroup = oldActive && oldActive.closest('.group');
      const activeGroupId = activeGroup && activeGroup.dataset.groupId;
      const activeIconId = oldActive && oldActive.dataset.iconId;
      const criteria=JSON.stringify([state.query,state.selectedTagIds,state.categoryFilterIds,state.sourceFilterIds,currentPackKey,scope.value,textMatch.value,tagMatch.value]);
      const previousTop=isGrid()&&criteria===lastListCriteria?contexts[0]?.viewport.scrollTop||0:0;lastListCriteria=criteria;
      teardownGroups(); groupsNode.replaceChildren();
      summary.replaceChildren(el('strong', '', formatCount(result.uniqueCount) + '개'), document.createTextNode(''));
      if (!result.groups.length) {
        const empty = el('div', 'empty');
        empty.append(el('h2', '', index ? '일치하는 아이콘이 없어요' : '아이콘을 불러오면 여기에 표시됩니다'), el('p', '', index ? '검색어를 줄이거나 선택한 태그를 바꿔보세요.' : '사이트가 제공하는 목록과 공개 메타데이터를 읽습니다.'));
        groupsNode.append(empty);
      }
      if(isGrid()&&result.uniqueCount){
        const matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id))),seen=new Set();
        const icons=(library?result.groups.flatMap(group=>group.icons):pack.icons).filter(icon=>matched.has(icon.id)&&!seen.has(icon.id)&&(seen.add(icon.id),true));
        const viewport=el('div','group-viewport bundle-viewport');viewport.dataset.groupId='bundle-list';viewport.tabIndex=0;
        viewport.setAttribute('aria-label','전체 아이콘 목록');const content=el('div','virtual-content');viewport.append(content);groupsNode.append(viewport);
        const context={group:{id:'bundle-list',name:pack.name||pack.title,icons},viewport,content,toggle:null,columns:2,lastWindow:'',visible:true,forceIndex:null,scrollHandler:queueWindows};
        viewport.scrollTop=previousTop;viewport.addEventListener('scroll',queueWindows,{passive:true});contexts.push(context);
      }
      (isGrid()?[]:result.groups).forEach((group, position) => {
        const collapsed = fold.isCollapsed(group.id);
        const section = el('section', 'group'); section.dataset.groupId = group.id;
        const heading = el('h2', 'group-heading');
        const toggle = button('group-toggle'); toggle.dataset.groupId = group.id;
        toggle.id = instanceId + '-toggle-' + position;
        const bodyId = instanceId + '-group-' + position;
        toggle.setAttribute('aria-expanded', String(!collapsed)); toggle.setAttribute('aria-controls', bodyId);
        const arrow = el('span', 'arrow', '▶'); arrow.setAttribute('aria-hidden', 'true');
        const avatar = el('span', 'avatar', (group.name || '원본').slice(0, 1)); avatar.setAttribute('aria-hidden', 'true');
        const name = el('span', 'group-title', group.name || '미분류');
        const aliases = el('span', 'aliases', (group.aliases || []).join(' / ')); if (aliases.textContent) name.append(aliases);
        const count = el('span', 'group-count', formatCount(group.count === undefined ? group.icons.length : group.count) + '개');
        toggle.append(arrow, avatar, name, count); heading.append(toggle); section.append(heading);
        const groupBody = el('div', 'group-body'); groupBody.id = bodyId; groupBody.hidden = collapsed; section.append(groupBody); groupsNode.append(section);
        toggle.addEventListener('click', () => {
          fold.toggle(group.id); renderGroups();
          const replacement = [...root.querySelectorAll('.group-toggle')].find(node => node.dataset.groupId === group.id);
          if (replacement) replacement.focus({preventScroll: true});
        });
        if (!collapsed) {
          const viewport = el('div', 'group-viewport'); viewport.dataset.groupId = group.id;
          viewport.setAttribute('aria-label', (group.name || '미분류') + ' 아이콘, 그룹 안에서 스크롤');
          const content = el('div', 'virtual-content'); viewport.append(content); groupBody.append(viewport);
          const foot = el('div', 'group-foot', group.icons.length > 12 ? '그룹 안에서 스크롤 · 보이는 아이콘만 표시' : '카테고리별 표시 · 같은 그룹 안의 중복 제외'); groupBody.append(foot);
          const context = {group, viewport, content, toggle, columns: 2, lastWindow: '', visible: true, forceIndex: null, scrollHandler: queueWindows};
          viewport.addEventListener('scroll', context.scrollHandler, {passive: true}); contexts.push(context);
        }
      });
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(()=>{if(dialog.classList.contains('catalog-open'))positionCatalog();queueWindows();}); contexts.forEach(context => resizeObserver.observe(context.viewport));
      }
      if (typeof IntersectionObserver === 'function') {
        visibilityObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => { const context = contexts.find(item => item.viewport === entry.target); if (context) context.visible = entry.isIntersecting; }); queueWindows();
        }, {root: body, rootMargin: '160px 0px'});
        contexts.forEach(context => visibilityObserver.observe(context.viewport));
      }
      renderWindows(); clearSearch.hidden = !state.query.length; renderChips(); renderSelection();
      if (activeGroupId) {
        const nextGroup = [...root.querySelectorAll('.group')].find(node => node.dataset.groupId === activeGroupId);
        const nextCard = nextGroup && [...nextGroup.querySelectorAll('.icon-card')].find(node => node.dataset.iconId === activeIconId);
        const replacement = nextCard || nextGroup && nextGroup.querySelector('.group-toggle');
        if (replacement) replacement.focus({preventScroll: true}); else input.focus({preventScroll: true});
      }
      lastRenderMs = performance.now() - started; updateMetrics();
    }
    function project(row){
      const projectionKey=scope.value==='all'?'all':library.state.currentKey;
      const cached=projections.get(row);if(cached?.has(projectionKey))return cached.get(projectionKey);
      const membership=row.memberships.find(m=>scope.value==='all'||m.packKey===library.state.currentKey)||row.memberships[0];
      const memberPack=library.packs.get(membership?.packKey)?.pack,memberIcon=memberPack?.icons[membership?.position]||row.icon;
      const source=(memberPack?.sources||[]).find(s=>s.sourceId===memberIcon.sourceId||String(s.articleId)===String(row.icon.origin?.articleId));
      // Public tags may be fresher in another membership; category IDs belong to
      // the current pack and must never leak from a merged BUNDLE membership.
      const icon={...row.icon,categoryIds:scope.value==='current'?memberIcon.categoryIds:row.icon.categoryIds,
        id:'library:'+row.identity,libraryIdentity:row.identity,libraryMemberships:row.memberships,librarySource:source,
        tagIds:[],imageMetadata:{...row.icon.imageMetadata,tags:row.tagLabels||[]}};
      const cache=cached||new Map();cache.set(projectionKey,icon);projections.set(row,cache);return icon;
    }
    function paintProgress(info={}) {
        if (destroyed) return;
        const status = info.status || (info.busy ? 'loading' : 'partial');
        const loaded = info.loaded === undefined ? info.count : info.loaded;
        const labels = {loading: '불러오는 중', complete: '불러옴', partial: '일부 불러옴', stopped: '중지됨', cached: '저장된 목록', error: '읽기 실패'};
        let text = info.message || labels[status] || '수집 상태';
        if (loaded !== undefined) text += ' · ' + formatCount(loaded) + '개';
        if (info.total !== undefined && info.total !== null) text += ' / 전체 ' + formatCount(info.total) + '개';
        else if (loaded !== undefined && status !== 'complete') text += ' · 전체 수 미확인';
        if (info.declaredCount !== undefined) text += ' · 메타데이터 선언 ' + formatCount(info.declaredCount) + '개';
        if (info.verifiedCount !== undefined) text += ' · 하위 글 확인 ' + formatCount(info.verifiedCount) + '개';
        if (status === 'cached' && info.fetchedAt) {
          const date = new Date(info.fetchedAt); if (Number.isFinite(date.getTime())) text += ' · 취득 ' + date.toLocaleString('ko-KR');
        }
        progressNode.textContent = text;
        const busy = info.busy === undefined ? status === 'loading' : !!info.busy;
        stop.disabled = !busy || typeof options.onStop !== 'function';
        retry.disabled = !['partial', 'stopped', 'error'].includes(status) || typeof options.onRetry !== 'function';
        refresh.disabled = busy || typeof options.onRefresh !== 'function';
    }
    function renderLibrary(){
      libraryResult=library.search();
      if(scope.value==='current'&&library.packs.has(library.state.currentKey))basePack=library.packs.get(library.state.currentKey).pack;
      const rows=library.rows.filter(row=>scope.value==='all'||row.memberships.some(m=>m.packKey===library.state.currentKey));
      const icons=rows.map(project),byIdentity=new Map(icons.map(icon=>[icon.libraryIdentity,icon]));
      pack={...(basePack||{}),icons,kind:scope.value==='all'?'BUNDLE':basePack?.kind||'NORMAL',categories:basePack?.categories||[],tags:basePack?.tags||[]};
      displayTags=new Map(icons.map(icon=>[icon.id,iconTagLabels(icon)]));
      const ordered=libraryResult.items.map(row=>byIdentity.get(row.identity)).filter(Boolean);
      // Keep NORMAL categories while applying ranked order inside each category.
      if(!isGrid()&&pack.categories.length){const groups=pack.categories.map(category=>({...category,icons:ordered.filter(icon=>(icon.categoryIds||[]).includes(category.id))})).filter(group=>group.icons.length);
        const loose=ordered.filter(icon=>!(icon.categoryIds||[]).length);if(loose.length)groups.push({id:'uncategorized',name:'기타 아이콘',icons:loose});result={groups,uniqueCount:ordered.length,membershipCount:groups.reduce((n,g)=>n+g.icons.length,0)};
      }else result={groups:ordered.length?[{id:'library-list',name:basePack?.title||'아이콘 목록',icons:ordered}]:[],uniqueCount:ordered.length,membershipCount:ordered.length};
      syncLayout();
      const progress=libraryResult.progress,loading=progress.status==='loading';
      libraryStatus.textContent=loading?`수집 중 · ${libraryResult.scopedIndexed}/${libraryResult.scopedRegistered}개 팩 검색 가능 · 실패 ${progress.failed}개`:libraryResult.partial?`일부 팩을 아직 읽지 못했어요. 현재 확인된 아이콘을 표시합니다. · ${libraryResult.scopedIndexed}/${libraryResult.scopedRegistered}개 팩`:`${libraryResult.scopedIndexed}개 팩 검색 완료`;
      help.textContent=`${scope.value==='all'?'전체 팩':'현재 팩'} · 검색어 ${textMatch.value==='all'?'모두':'하나 이상'} + 태그 ${tagMatch.value==='all'?'모두':'하나 이상'} 일치`;
      if(scope.value==='current'){if(currentProgress)paintProgress(currentProgress);else if(basePack)paintProgress({status:'complete',loaded:basePack.icons.length});else{progressNode.textContent='아이콘 리스트에서 팩을 선택하세요.';stop.disabled=retry.disabled=refresh.disabled=true;}}
      if(scope.value==='all'){stop.disabled=!loading;retry.disabled=loading||!libraryResult.partial;refresh.disabled=loading||!libraryResult.scopedRegistered;progressNode.textContent=loading?'등록된 팩을 차례로 확인하고 있어요.':libraryResult.partial?'읽지 못한 팩이 있어요. 확인된 아이콘을 먼저 검색할 수 있습니다.':'확인한 전체 팩에서 검색할 수 있습니다.';}
      if(scope.value==='all'){packTitle.textContent='등록된 전체 아이콘팩';packBadge.textContent='전체';packLink.hidden=true;}
      else if(basePack){packTitle.textContent=basePack.title||basePack.name||'현재 팩';packBadge.textContent=basePack.kind||'NORMAL';const url=articleUrl(basePack.representative||{articleId:basePack.mainArticleId||basePack.articleId,boardId:basePack.boardId});packLink.hidden=!url;if(url)packLink.href=url;}
    }
    function libraryCollect(refresh=false){
      if(!library||destroyed)return;
      const work=library.collect({refresh,onProgress:()=>{if(destroyed||libraryFrame)return;libraryFrame=requestAnimationFrame(()=>{libraryFrame=0;if(!destroyed)applySearch(false);});}});applySearch(false);work.catch(error=>{if(!destroyed)setError(error.message);});
    }
    function applySearch(collect=true) {
      if (destroyed) return;
      state.queryRevision++; fold.update(hasCriteria());
      const start = performance.now();
      if(library){
        library.setState({scope:scope.value,query:state.query,textMatch:textMatch.value,tagMatch:tagMatch.value,selectedTags:state.selectedTagIds});
        renderLibrary();
        const key=JSON.stringify([scope.value,state.query,textMatch.value,library.state.currentKey]);
        if(collect&&scope.value==='all'&&key!==collectionKey){collectionKey=key;if(libraryResult.partial)libraryCollect();}
      }else result = index ? index.search(state) : {groups: [], uniqueCount: 0, membershipCount: 0};
      lastSearchMs = performance.now() - start; renderGroups();reportMetadata();
    }
    function metadataSummary() {
      const matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id)));
      return {...(pack?.bodyCounts?.metadata || {}),modelIcons:pack?.icons?.length||0,
        taggedIcons:(pack?.icons||[]).filter(icon=>icon.imageMetadata?.tags?.length).length,
        indexed:library?pack?.icons.length||0:index?.iconCount||0,query:state.query,searchMatched:result.uniqueCount,
        // Virtualization intentionally mounts only a window of the logical result.
        displayedTags:[...matched].filter(id=>displayTags.get(id)?.length).length,
        renderedCards:root.querySelectorAll('.icon-card').length,
        renderedTaggedCards:[...root.querySelectorAll('.icon-tags')].filter(node=>node.textContent!=='태그 없음').length};
    }
    function metadataDetails() {
      const summary=metadataSummary(),matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id)));
      const media=collectionDiagnostics?.mediaDetail || [],byId=new Map(media.filter(row=>row.iconId).map(row=>[row.iconId,row]));
      return {summary,images:media,missing:(pack?.icons||[]).filter(icon=>!matched.has(icon.id)).map(icon=>{
        const source=byId.get(icon.id);
        return {...source,iconId:icon.id,url:icon.url,keywords:[...(icon.keywords||[])],tags:tagsFor(icon),stage:'search',
          reason:source?.reason && source.reason!=='mapped'?source.reason:'query-or-filter-mismatch'};
      })};
    }
    function reportMetadata() {
      if(options.debug!==true || !pack)return;
      const detail=metadataDetails(),key=JSON.stringify(detail);
      if(key===lastMetadataLog)return;lastMetadataLog=key;
      const failures=detail.images.filter(row=>row.reason!=='mapped');
      global.console?.info?.('[Aru Icons] metadata diagnostics',{...detail.summary,unmappedOrUntagged:failures,missing:detail.missing});
    }
    function resetSearch() {
      cancelSearch(); composing = false; input.value = ''; state.query = ''; state.selectedTagIds = []; state.categoryFilterIds = []; state.sourceFilterIds = [];
      fold.update(false); applySearch(); announce('검색을 초기화하고 검색 전 접힘 상태를 복원했습니다.');
    }
    function callAction(name) {
      if (typeof options[name] !== 'function') return;
      try {
        Promise.resolve(options[name]()).catch(error => setError(error && error.message || '요청을 처리하지 못했습니다.'));
      } catch (error) { setError(error && error.message || '요청을 처리하지 못했습니다.'); }
    }
    function setError(message) {
      if (destroyed) return;
      errorNode.textContent = String(message || '아이콘을 읽지 못했습니다.'); errorNode.hidden = false;
      retry.disabled = typeof options.onRetry !== 'function';
    }
    function close(action) {
      if (destroyed) return;
      destroy();
      try { if (typeof options[action] === 'function') options[action](); } catch (_) { /* New UI failures must not stop the existing captioner. */ }
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;clearTimeout(toastTimer); cancelSearch();previewCleanup();library?.cancel();uiCleanup?.();if(libraryFrame)cancelAnimationFrame(libraryFrame);
      if (initialFocusFrame) cancelAnimationFrame(initialFocusFrame);
      events.abort(); teardownGroups(); pauseMedia(root);mediaBudget?.destroy();catalogView?.destroy();
      root.querySelectorAll('img,source').forEach(n=>n.removeAttribute('src'));
      pack=null;index=null;displayTags.clear();collectionDiagnostics=null;catalogRef=null;catalogPack=null;selectedIconId=null;result={groups:[],uniqueCount:0,membershipCount:0};
      folds.forEach(item => item.dispose()); if (!folds.size) fold.dispose();
      folds.clear();root.replaceChildren();
      host.remove();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({preventScroll: true});
    }
    function availableViewport(){
      const height=global.visualViewport?.height||global.innerHeight;
      if(!Number.isFinite(height)||height<=0)return;
      host.style.setProperty('--aru-available-height',height+'px');
      host.style.top=(global.visualViewport?.offsetTop||0)+'px';host.style.bottom='auto';host.style.height=height+'px';
      dialog.classList.toggle('compact-height',height<600);queueWindows();
    }
    function applyUi(value,persist=false){
      const next=api.UiPreferences?.sanitize?api.UiPreferences.sanitize(value):{modalSize:['default','wide','max'].includes(value.modalSize)?value.modalSize:'default',iconSize:['small','normal','large'].includes(value.iconSize)?value.iconSize:'normal',previewVisible:typeof value.previewVisible==='boolean'?value.previewVisible:true};
      ui=next;rowHeight=currentCardSize().row;dialog.dataset.modalSize=ui.modalSize;dialog.classList.toggle('preview-collapsed',!ui.previewVisible);
      selection.hidden=!ui.previewVisible;collapsedInsert.hidden=ui.previewVisible;modalSize.value=ui.modalSize;iconSize.value=ui.iconSize;
      previewToggle.textContent=ui.previewVisible?'미리보기 접기':'미리보기 펼치기';previewToggle.setAttribute('aria-expanded',String(ui.previewVisible));
      const size=currentCardSize();for(const [name,value]of Object.entries({height:size.card,media:size.media,'media-width':size.mediaWidth}))dialog.style.setProperty('--aru-card-'+name,value+'px');
      if(!ui.previewVisible){for(const v of selectionArt.querySelectorAll('video'))try{v.pause();}catch(_){}if(previewState.status==='loading'){previewCleanup();pauseMedia(selectionArt);selectionArt.replaceChildren();previewState={iconId:null,status:'none',code:null};}}
      renderWindows();renderSelection();queueWindows();
      if(persist){uiRevision++;const saved={...ui};Promise.resolve().then(()=>preferences?.write?.(saved)).catch(()=>{if(!destroyed)announce('화면 설정을 저장하지 못했어요. 이번 창에서는 계속 사용할 수 있습니다.');});}
    }
    listen(modalSize,'change',()=>applyUi({...ui,modalSize:modalSize.value},true));listen(iconSize,'change',()=>applyUi({...ui,iconSize:iconSize.value},true));listen(previewToggle,'click',()=>applyUi({...ui,previewVisible:!ui.previewVisible},true));
    applyUi(ui);
    const pointerChanged=()=>applyUi(ui);
    if(coarsePointer?.addEventListener)listen(coarsePointer,'change',pointerChanged);
    else if(coarsePointer?.addListener){coarsePointer.addListener(pointerChanged);events.signal.addEventListener('abort',()=>coarsePointer.removeListener?.(pointerChanged),{once:true});}
    const uiReady=Promise.resolve().then(()=>preferences?.read?.()).then(value=>{if(!destroyed&&uiRevision===0&&value)applyUi(value);}).catch(()=>{if(!destroyed)announce('화면 설정을 복원하지 못했어요. 기본 크기로 열었습니다.');});
    availableViewport();listen(global,'resize',availableViewport);
    if(global.visualViewport){listen(global.visualViewport,'resize',availableViewport);listen(global.visualViewport,'scroll',availableViewport);}
    listen(backdrop,'wheel',event=>{if(event.target===backdrop)event.preventDefault();},{passive:false});
    listen(backdrop,'touchmove',event=>{if(event.target===backdrop)event.preventDefault();},{passive:false});
    listen(input, 'compositionstart' , () => { composing = true; cancelSearch(); });
    listen(input, 'compositionend', () => { composing = false; cancelSearch(); searchTimer = setTimeout(() => { searchTimer = 0; state.query = input.value; applySearch(); }, 150); });
    listen(input, 'input', event => {
      if (composing || event.isComposing) return;
      if(library&&scope.value==='all')library.cancel();
      cancelSearch(); searchTimer = setTimeout(() => { searchTimer = 0; state.query = input.value; applySearch(); }, 150);
    });
    listen(clearSearch, 'click', () => { cancelSearch(); composing = false; input.value = ''; state.query = ''; applySearch(); input.focus(); announce('검색어만 지웠습니다. 태그 필터는 유지됩니다.'); });
    listen(reset, 'click', resetSearch);
    listen(expandAll, 'click', () => { fold.setAll(result.groups.map(group => group.id), false); renderGroups(); announce('현재 표시된 그룹을 모두 펼쳤습니다.'); });
    listen(collapseAll, 'click', () => { fold.setAll(result.groups.map(group => group.id), true); renderGroups(); announce('현재 표시된 그룹을 모두 접었습니다.'); });
    listen(closeButton, 'click', () => close('onClose'));
    listen(scope,'change',()=>{cancelSearch();state.query=input.value;collectionKey='';options.onLibraryScope?.(scope.value);applySearch();});
    listen(textMatch,'change',()=>{cancelSearch();state.query=input.value;applySearch();});
    listen(tagMatch,'change',()=>{cancelSearch();state.query=input.value;applySearch();});
    listen(stop, 'click', () => {if(library&&scope.value==='all'){library.cancel();applySearch(false);announce('전체 팩 수집을 중지했습니다.');}else callAction('onStop');});
    listen(retry, 'click', () => {if(library&&scope.value==='all')libraryCollect();else callAction('onRetry');});
    listen(refresh, 'click', () => {if(library&&scope.value==='all')libraryCollect(true);else callAction('onRefresh');});
    listen(mediaRetry,'click',()=>{
      const icon=byIconId(selectedIconId);if(!icon)return;
      previewCleanup();previewState={iconId:null,status:'none',code:null};
      // Retry only this media, using the exact URL and no query rewriting.
      for(const card of root.querySelectorAll('.icon-card'))if(card.dataset.iconId===icon.id&&card.querySelector('[data-media-state="error"]')){
        card.replaceWith(makeCard(icon,Number(card.dataset.index),contexts.find(c=>c.content===card.parentNode),{}));
      }
      renderSelection();mediaBudget?.prune();
    });
    async function requestInsertion(){
      const icon = byIconId(selectedIconId); if (catalogOpen || destroyed || !icon || prepare.disabled || preparing || !targetValid || previewState.status==='error' || typeof options.onSelect !== 'function') return;
      preparing = true; updatePrepare();
      try {
        const prepared = await options.onSelect(icon);
        if (!destroyed) announce(typeof prepared === 'string' ? prepared : prepared && prepared.message || '선택 정보를 준비했습니다. 실제 삽입·게시·전송은 실행하지 않았습니다.');
      } catch (error) {mediaDiagnostic(icon,'insertion',error?.code||'INSERT_FAILED');setError((error?.code?'['+error.code+'] ':'')+(error?.message||'선택 정보를 준비하지 못했습니다.')); }
      finally { preparing = false; if (!destroyed) renderSelection(); }
    }
    listen(prepare,'click',requestInsertion);listen(collapsedInsert,'click',requestInsertion);
    listen(root, 'keydown', event => {
      // Keep picker keystrokes out of the site's editor shortcuts while preserving input behavior.
      event.stopPropagation();
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if(catalogOpen)setCatalogOpen(false,'cancel');else close('onClose'); return; }
      if (event.key !== 'Tab') return;
      const scopeRoot=catalogOpen?catalogView.node:root;
      const focusable = [...scopeRoot.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(node => !node.hidden && !node.closest('[inert],[hidden]') && node.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (root.activeElement === first || root.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    ['click', 'pointerdown', 'mousedown', 'keyup', 'keypress'].forEach(type => listen(root, type, event => event.stopPropagation()));
    if(library)renderChips(true);renderGroups();syncLayout();if(catalogView&&options.openCatalogInitially===true)setCatalogOpen(true); initialFocusFrame = requestAnimationFrame(() => {
      initialFocusFrame = 0;
      // Do not steal a click/keyboard focus established before the first frame,
      // or try to focus a catalog that a cached BUNDLE has already hidden.
      if (!destroyed && !root.activeElement) (catalogOpen?catalogView.input:input).focus({preventScroll: true});
    });

    const apiPicker = {
      setCurrentSource(key){if(!library)return;library.setState({currentKey:key});collectionKey='';},
      completeCatalogSelection(){setCatalogOpen(false,'selected');showPackToast();},
      openCatalog(){setCatalogOpen(true);},
      closeCatalog(){setCatalogOpen(false,'cancel');},
      refreshLibrary(){if(library){if(scope.value==='all')libraryCollect();applySearch(false);}},
      setMetadataDiagnostics(value){collectionDiagnostics=options.debug===true?value:null;reportMetadata();},
      getMetadataDiagnostics(){return options.debug===true?metadataDetails():null;},
      setCatalog(entries,message){catalogView?.setEntries(entries,message,library?.packs);},
      setCatalogPack(ref,next){catalogRef=ref;catalogPack=next;catalogView?.setPack(ref,next);},
      setQuery(value){cancelSearch();input.value=String(value||'');state.query=input.value;applySearch();},
      setTargetState(valid,error){targetValid=valid;targetError.hidden=valid;targetError.textContent=valid?'':'['+(error?.code||'SESSION_UNAVAILABLE')+'] '+(error?.message||'삽입 대상 세션이 없습니다. 작성기에서 다시 열어 주세요.');renderSelection();},
      clearPack(){if(library&&scope.value==='all'){applySearch(false);return;}if(library)library.setState({currentKey:null});basePack=null;teardownGroups();pack=null;syncLayout();index=null;displayTags.clear();collectionDiagnostics=null;lastMetadataLog='';catalogRef=null;catalogPack=null;selectedIconId=null;result={groups:[],uniqueCount:0,membershipCount:0};columns.hidden=!!options.catalogMode&&!library;packTitle.textContent='아이콘팩과 즐겨찾기';packBadge.textContent='목록';packLink.hidden=true;renderGroups();renderSelection();},
      setSources(choices=[]) {
        if(!sourceSelect || destroyed)return;
        const selected=sourceSelect.value;
        sourceSelect.replaceChildren();
        const placeholder=el('option','','기본 목록에서 팩 선택');placeholder.value='';sourceSelect.append(placeholder);
        for(const item of choices){const option=el('option','',item.title);option.value=String(item.articleId);sourceSelect.append(option);}
        sourceSelect.value=selected;
      },
      uiReady,
      element: host,
      shadowRoot: root,
      setPack(nextPack) {
        columns.hidden=false;
        if (destroyed) return;
        if (!nextPack || !Array.isArray(nextPack.icons)) throw new Error('아이콘팩 데이터가 올바르지 않습니다.');
        const key = String(nextPack.packId || nextPack.id || nextPack.mainArticleId || nextPack.articleId || nextPack.title || 'current-pack');
        if (currentPackKey !== key) {
          selectedIconId=null;previewCleanup();previewState={iconId:null,status:'idle',code:null};
          if (!folds.has(key)) {
            const nextFold = new api.FoldState();
            const initiallyCollapsed = Object.entries(options.initialCollapsed || {}).filter(([, value]) => value).map(([id]) => id);
            if (initiallyCollapsed.length) nextFold.setAll(initiallyCollapsed, true);
            folds.set(key, nextFold);
          }
          fold = folds.get(key); currentPackKey = key;
        }
        basePack=nextPack;currentPackKey=key;pack = nextPack;syncLayout(); index = new api.SearchIndex(pack);collectionDiagnostics=null;
        const tagDictionary=new Map((pack.tags||[]).map(tag=>[tag.id,tag.name]));
        displayTags=new Map(pack.icons.map(icon=>[icon.id,iconTagLabels(icon,tagDictionary)]));
        packTitle.textContent = pack.title || pack.name || '아이콘팩 ' + (pack.mainArticleId || pack.articleId || '');
        packBadge.textContent = pack.kind || pack.packKind || 'NORMAL';
        const primarySource = pack.representative || {articleId: pack.mainArticleId || pack.articleId, boardId:pack.boardId, articleUrl: pack.articleUrl};
        const link = articleUrl(primarySource); packLink.hidden = !link; if (link) packLink.href = link; else packLink.removeAttribute('href');
        renderChips(true); applySearch();
      },
      setProgress(info = {}) {currentProgress={...info};if(!library||scope.value!=='all')paintProgress(info);},
      setError,
      clearError() { errorNode.hidden = true; errorNode.textContent = ''; },
      resetSearch,
      destroy,
      getSnapshot() {
        return {destroyed, targetValid, catalog:catalogView?{...catalogView.snapshot(),open:catalogOpen,toastShown}:null, media:mediaBudget?.snapshot(), library:libraryResult?{scope:scope.value,textMatch:textMatch.value,tagMatch:tagMatch.value,partial:libraryResult.partial,registered:libraryResult.registered,indexed:libraryResult.indexed,progress:libraryResult.progress}:null,ui:{...ui,rowHeight,columns:contexts[0]?.columns||0,preparing},displayMode:'icon-list',viewportCount:contexts.length,preview:{...previewState},mediaFailures:options.debug===true?[...mediaFailures.values()]:[], packId: currentPackKey, query: state.query, selectedTagIds: state.selectedTagIds.slice(), selectedIconId, uniqueCount: result.uniqueCount, membershipCount: result.membershipCount, groups: result.groups.map(group => ({id: group.id, count: group.count === undefined ? group.icons.length : group.count, collapsed: fold.isCollapsed(group.id)})), renderedCards: root.querySelectorAll('.icon-card').length, maxCards: MAX_CARDS, searchMs: lastSearchMs, renderMs: lastRenderMs,metadata:metadataSummary()};
      }
    };
    return apiPicker;
  };
})(globalThis);
