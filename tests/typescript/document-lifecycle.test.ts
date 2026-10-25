import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { documentLifecycle, type EffectSession } from "../../src/runtime/document-lifecycle.ts";
import { contextEffectGate } from "../../src/runtime/context-effect-gate.ts";
import { createBrowserAdapter } from "../../src/ruliweb-icons/browser-adapter.ts";
import { createAttributionCore } from "../../src/upload-attribution/core.ts";
import { installFirefoxContent } from "../../src/platform/firefox/content.ts";
import { installWhaleContent } from "../../src/platform/whale/content.ts";
import { createIconReader, createMetadataUi } from "../../src/runtime/icons.ts";
import { createAttributionUi } from "../../src/upload-attribution/ui.ts";
import { installMetadataEditorBridge } from "../../src/icon-metadata/metadata-editor-bridge.ts";
import { createDownloadContent } from "../../src/body-download/content.ts";
import type { RuntimeEnvironment } from "../../src/runtime/contracts.ts";

const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
async function until(check: () => boolean, limit = 6000) {
  const deadline = Date.now() + limit;
  while (!check() && Date.now() < deadline) await tick();
  assert.equal(check(), true);
}
function host(mode: "callback" | "promise" = "callback", initial: Record<string, unknown> = {enabled: true}) {
  const dom = new JSDOM('<div id="editor_v2"><div class="seditor"><input type="file" accept="image/*"><div class="note-toolbar"><button>첨부</button></div><div class="note-editable" contenteditable="true"><p id="draft">본문과 태그 보존</p><p data-aru-source-caption>기존 캡션</p></div></div></div>', {url: "https://bbs.ruliweb.com/community/board/300143/write", pretendToBeVisual: true});
  const w = dom.window as unknown as RuntimeEnvironment;
  const events = new Map<string, Set<EventListener>>();
  const storageListeners = new Set<(...args: any[]) => void>();
  let values = {...initial}, reads = 0, messages = 0;
  let get: (keys: unknown, callback?: (value: unknown) => void) => unknown = (_keys, callback) => mode === "promise" ? Promise.resolve({...values}) : callback!({...values});
  const runtime = {id: "same-extension-id" as string | undefined, lastError: undefined as any, getURL: (p: string) => "https://extension.invalid/" + p,
    sendMessage(_data: unknown, callback?: (data: unknown) => void) { messages++; return mode === "promise" ? Promise.resolve({ok: true, result: {}}) : callback!({ok: true, result: {}}); }};
  const api = {runtime, storage: {sync: {get(keys: unknown, callback?: (value: unknown) => void) { reads++; return get(keys, callback); }}, onChanged: {addListener(fn: (...args: any[]) => void){storageListeners.add(fn);}, removeListener(fn: (...args: any[]) => void){storageListeners.delete(fn);}}}};
  w[mode === "promise" ? "browser" : "chrome"] = api;
  w.console = {log(){},warn(){},info(){},debug(){}};
  const root = new Proxy(w, {get(target, key) {
    if (key === "addEventListener") return (type: string, fn: EventListener, options?: object) => { let set = events.get(type); if (!set) events.set(type, set = new Set()); set.add(fn); target.addEventListener(type, fn, options); };
    if (key === "removeEventListener") return (type: string, fn: EventListener, options?: object) => { events.get(type)?.delete(fn); target.removeEventListener(type, fn, options); };
    const value = Reflect.get(target, key, target);
    return ["setTimeout","clearTimeout","setInterval","clearInterval","requestAnimationFrame","cancelAnimationFrame","getComputedStyle","matchMedia","atob","btoa"].includes(key as string) && typeof value === "function" ? value.bind(target) : value;
  }});
  const owner = documentLifecycle(root);
  const fire = (type: "pagehide" | "pageshow", persisted: boolean, trusted = true) => {
    // 진짜 BFCache 증거가 아닌 주입된 lifecycle 모델이다.
    for (const fn of Array.from(events.get(type) ?? [])) fn({type, persisted, isTrusted: trusted} as PageTransitionEvent);
  };
  return {w,root,dom,owner,runtime,api,events,storageListeners,fire,
    get reads(){return reads;},get messages(){return messages;},
    setReader(fn: typeof get){get=fn;},
    change(next: Record<string, unknown>){values={...values,...next};for(const listener of Array.from(storageListeners))listener(Object.fromEntries(Object.entries(next).map(([k,v])=>[k,{newValue:v}])),'sync');},
    close(){contextEffectGate(root).dispose();dom.window.close();}};
}

for (const mode of ["callback", "promise"] as const) {
  for (const [name, values, expected] of [["ON",{enabled:true},1],["OFF",{enabled:false},0],["키 부재",{},1]] as const) {
    test(`${mode}: ${name} 최초 설정과 BFCache 복귀`, async () => {
      const h=host(mode,values),sessions:EffectSession[]=[];
      try {h.owner.register("test",s=>sessions.push(s));await flush();assert.equal(sessions.length,expected);
        h.fire("pagehide",true);assert.equal(h.owner.snapshot().native,"alive");assert.equal(h.owner.snapshot().state,"suspended");
        const old=sessions[0];if(old)assert.equal(old.gate.allows(),false);
        h.fire("pageshow",true);h.fire("pageshow",true);await flush();assert.equal(sessions.length,expected*2);
        if(old){assert.notEqual(sessions[1],old);assert.equal(old.gate.allows(),false);assert.equal(sessions[1].isCurrent(),true);}
      }finally{h.close();}
    });
  }
  test(`${mode}: pending·늦은 ON·복귀 중 OFF는 새 효과를 승인하지 않는다`,async()=>{
    const h=host(mode),sessions:EffectSession[]=[];
    try {h.owner.register("test",s=>sessions.push(s));await flush();h.fire('pagehide',true);
      let done:(v:unknown)=>void=()=>{};
      h.setReader((_keys,cb)=>mode==='promise'?new Promise(resolve=>done=resolve):(done=cb!));
      h.fire('pageshow',true);await flush();assert.equal(h.owner.snapshot().state,'verifying');
      const oldDone=done;
      h.change({enabled:false});await flush();done({enabled:false});await flush();oldDone({enabled:true});await flush();
      assert.equal(sessions.length,1);assert.equal(h.owner.snapshot().state,'inactive');
    }finally{h.close();}
  });
  test(`${mode}: 복귀 중 native 무효화와 늦은 결과는 terminal을 되돌리지 않는다`,async()=>{
    const h=host(mode),sessions:EffectSession[]=[];let hook=()=>{};let invalid=false;
    const ctx={get isInvalid(){return invalid;},onInvalidated(fn:()=>void){hook=fn;}};
    try{h.owner.register('test',s=>sessions.push(s),ctx);await flush();h.fire('pagehide',true);
      let done:(v:unknown)=>void=()=>{};
      h.setReader((_keys,cb)=>mode==='promise'?new Promise(resolve=>done=resolve):(done=cb!));
      h.fire('pageshow',true);await flush();invalid=true;hook();done({enabled:true});await flush();
      h.fire('pageshow',true);assert.equal(sessions.length,1);assert.equal(h.owner.snapshot().native,'invalidated');
    }finally{h.close();}
  });
}

test('일반 이탈은 terminal이고 pageshow false·합성 이벤트는 세션을 부활시키지 않는다',async()=>{
  const h=host();let starts=0;
  try{h.owner.register('test',()=>starts++);await flush();h.fire('pagehide',true,false);h.fire('pageshow',true,false);assert.equal(starts,1);
    h.fire('pageshow',false);assert.equal(starts,1);h.fire('pagehide',false);assert.equal(h.owner.snapshot().native,'disposed');
    h.fire('pageshow',true);h.change({enabled:true});await flush();assert.equal(starts,1);
  }finally{h.close();}
});

test('동일 Window 공유·반복 등록과 10회 왕복은 한 listener·세션만 유지한다',async()=>{
  const h=host(),sessions:EffectSession[]=[];let cleanups=0;
  try{assert.equal(documentLifecycle(h.root),h.owner);
    const start=(s:EffectSession)=>{sessions.push(s);s.onCleanup(()=>cleanups++);s.environment.setInterval(()=>{},500);};
    h.owner.register('test',start);h.owner.register('test',start);await flush();
    for(let i=0;i<10;i++){
      const old=sessions.at(-1)!;h.fire('pagehide',true);assert.equal(old.gate.allows(),false);assert.equal(h.owner.snapshot().activeFactories,0);
      h.fire('pageshow',true);h.fire('pageshow',true);await flush();assert.equal(h.owner.snapshot().activeFactories,1);
      assert.equal(h.events.get('pagehide')!.size,1);assert.equal(h.events.get('pageshow')!.size,1);
      assert.equal(h.owner.snapshot().resources.timers,1);
    }
    assert.equal(sessions.length,11);assert.equal(cleanups,10);assert.equal(h.storageListeners.size,1);
  }finally{h.close();}
});

test('이전 세션의 메시지 완료·cleanup은 새 세션에 영향이 없다',async()=>{
  const h=host('promise'),sessions:EffectSession[]=[];let done:(v:unknown)=>void=()=>{};
  h.api.runtime.sendMessage=((_data:unknown)=>new Promise(resolve=>done=resolve)) as typeof h.api.runtime.sendMessage;
  try{h.owner.register('test',s=>sessions.push(s));await flush();
    const old=sessions[0],adapter=createBrowserAdapter(old.environment),pending=adapter.requestCache('info',{});
    const rejected=assert.rejects(pending,{code:'CONTEXT_INVALIDATED'});
    h.fire('pagehide',true);h.fire('pageshow',true);await flush();const fresh=sessions[1];
    old.gate.dispose();done({ok:true,result:{stale:true}});await rejected;assert.equal(fresh.isCurrent(),true);
    const count=h.messages;await assert.rejects(adapter.requestCache('info',{}));assert.equal(h.messages,count);
  }finally{h.close();}
});

test('조회 실패는 유한 재시도 후 보류하고 다음 정상 복귀에서 새로 확인한다',async()=>{
  const h=host('promise');let starts=0;
  try{h.owner.register('test',()=>starts++);await flush();h.fire('pagehide',true);
    const before=h.reads;h.setReader(()=>Promise.reject(Error('temporary read failure')));h.fire('pageshow',true);
    await until(()=>h.owner.snapshot().state==='inactive');await flush();assert.equal(h.reads-before,3);assert.equal(starts,1);assert.equal(h.owner.snapshot().state,'inactive');
    h.setReader(()=>Promise.resolve({enabled:true}));h.fire('pagehide',true);h.fire('pageshow',true);await flush();assert.equal(starts,2);
  }finally{h.close();}
});

for(const browser of ['firefox','whale'] as const){
  for(const timing of ['pending','ready'] as const){
    test(`${browser}: ${timing} 파싱의 epoch 폐기·새 Registry·본문 보존`,async()=>{
      const h=host(),controllers:any[]=[],completions:((v:unknown)=>void)[]=[];
      const globals=['HTMLInputElement','HTMLTextAreaElement','FileReader','Node','Element','HTMLElement','CustomEvent'];
      const saved=globals.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
      globals.forEach(k=>Object.defineProperty(globalThis,k,{configurable:true,value:h.w[k]}));
      h.w.exifr={parse:()=>new Promise(resolve=>completions.push(resolve))};
      const install=browser==='firefox'?installFirefoxContent:installWhaleContent;
      try{
        h.owner.register('content',session=>{
          const {attribution}=createAttributionCore({environment:session.environment});
          class Controller extends attribution.Controller{constructor(options:object){super(options);controllers.push(this);}}
          install({environment:session.environment,dependencies:{attribution:{Controller:()=>Controller}}});
          install({environment:session.environment,dependencies:{attribution:{Controller:()=>Controller}}});
        });await flush();assert.equal(controllers.length,1);
        const input=h.w.document.querySelector('input')!;
        const select=(name:string)=>{Object.defineProperty(input,'files',{configurable:true,value:[new h.w.File(['jpeg'],name,{type:'image/jpeg'})]});input.dispatchEvent(new h.w.Event('change',{bubbles:true}));};
        const image=(name:string)=>{const p=h.w.document.createElement('p'),img=h.w.document.createElement('img');img.alt=name;img.src='https://i1.ruliweb.com/mock.jpg';Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:64}});p.append(img);h.w.document.querySelector('.note-editable')!.append(p);return img;};
        select('old.jpg');await tick();assert.equal(completions.length,1);
        if(timing==='ready'){completions[0]({ImageDescription:'https://www.pixiv.net/artworks/1111111'});await tick();}
        h.fire('pagehide',true);assert.equal(controllers[0].closed,true);assert.equal(controllers[0].registry.records.length,0);
        h.fire('pageshow',true);await tick();assert.equal(controllers.length,2);assert.notEqual(controllers[0].registry,controllers[1].registry);
        completions[0]({ImageDescription:'https://www.pixiv.net/artworks/1111111'});image('old.jpg');await tick();
        assert.equal(h.w.document.querySelectorAll('[data-aru-source-caption]').length,1);
        select('fresh.jpg');await tick();assert.equal(completions.length,2);completions[1]({ImageDescription:'https://www.pixiv.net/artworks/2222222'});await tick();const fresh=image('fresh.jpg');await tick();
        assert.equal(fresh.parentElement!.nextElementSibling!.querySelector('a')!.href,'https://www.pixiv.net/artworks/2222222');
        assert.equal(h.w.document.querySelector('#draft')!.textContent,'본문과 태그 보존');
        assert.equal(h.owner.snapshot().resources.owned?.['upload-controller'],1);
      }finally{h.close();globals.forEach((k,i)=>saved[i]?Object.defineProperty(globalThis,k,saved[i]!):Reflect.deleteProperty(globalThis,k));}
    });
  }
}

test('Feature·UploadUI는 새 인스턴스로 재개하고 OFF 복귀에는 장식하지 않는다',async()=>{
  const h=host('promise',{enabled:true,aruIconsOptions:{enabled:true}}),features:any[]=[];
  try{h.owner.register('ui',session=>{const icons=createIconReader({environment:session.environment});features.push(icons.feature);createAttributionUi({environment:session.environment,dependencies:{icons:{DesignSystem:()=>icons.DesignSystem}}});});await tick();
    assert.equal(features[0].enabled,true);assert.equal(h.w.document.querySelectorAll('[data-aru-native-upload-style]').length,1);
    h.fire('pagehide',true);assert.equal(features[0].destroyed,true);assert.equal(h.w.document.querySelectorAll('[data-aru-native-upload-style]').length,0);
    h.fire('pageshow',true);await tick();assert.equal(features.length,2);assert.notEqual(features[0],features[1]);assert.equal(features[1].enabled,true);
    h.fire('pagehide',true);h.change({enabled:false});h.fire('pageshow',true);await tick();assert.equal(features.length,2);assert.equal(h.owner.snapshot().state,'inactive');assert.equal(h.w.document.querySelectorAll('[data-aru-native-upload-style]').length,0);
  }finally{h.close();}
});

test('조회 타임아웃 3회 이후 늦은 ON은 세션을 만들지 않는다',async()=>{
  const h=host(),callbacks:((v:unknown)=>void)[]=[];let starts=0;
  h.setReader((_keys,callback)=>{callbacks.push(callback!);});
  try{h.owner.register('test',()=>starts++);await until(()=>h.owner.snapshot().state==='inactive');await flush();
    assert.equal(callbacks.length,3);assert.equal(starts,0);assert.equal(h.owner.snapshot().state,'inactive');
    callbacks.forEach(done=>done({enabled:true}));await flush();assert.equal(starts,0);
  }finally{h.close();}
});

test('복귀 검증 중 다시 이탈하면 이전 barrier의 ON은 새 epoch에 반영되지 않는다',async()=>{
  const h=host(),sessions:EffectSession[]=[],callbacks:((v:unknown)=>void)[]=[];
  try{h.owner.register('test',s=>sessions.push(s));await flush();
    h.setReader((_keys,callback)=>{callbacks.push(callback!);});
    h.fire('pagehide',true);h.fire('pageshow',true);await flush();
    h.fire('pagehide',true);h.fire('pageshow',true);await flush();
    callbacks[0]({enabled:true});await flush();assert.equal(sessions.length,1);
    callbacks[1]({enabled:true});await flush();assert.equal(sessions.length,2);assert.equal(sessions[0].gate.allows(),false);
  }finally{h.close();}
});

for(const browser of ['firefox','whale'] as const){
  test(browser+' 댓글 dispatcher·bound marker·관찰자는 반복 suspend에서 중복되지 않는다',async()=>{
    const h=host();h.dom.reconfigure({url:'https://bbs.ruliweb.com/community/board/98/read/6000'});
    h.w.document.body.innerHTML='<form class="border_box after_clear"><textarea class="comment_input">댓글 보존</textarea><input type="file" class="common_img_input"><button type="button" class="common_img_button">기존 첨부</button></form>';
    const globals=['HTMLInputElement','HTMLTextAreaElement','FileReader','Node','Element','HTMLElement','CustomEvent'];
    const saved=globals.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));globals.forEach(k=>Object.defineProperty(globalThis,k,{configurable:true,value:h.w[k]}));
    try{h.owner.register('content',s=>(browser==='firefox'?installFirefoxContent:installWhaleContent)({environment:s.environment}));await tick();
      const before=h.owner.snapshot().resources;
      for(let i=0;i<10;i++){h.fire('pagehide',true);assert.equal((h.w.document.querySelector('input') as HTMLInputElement).dataset.aruSourceFileBound,undefined);assert.equal(h.w.document.querySelectorAll('.aru-source-caption-comment-button').length,0);
        h.fire('pageshow',true);await tick();assert.deepEqual(h.owner.snapshot().resources,before);assert.equal(h.w.document.querySelector('textarea')!.value,'댓글 보존');
        if(browser==='whale')assert.equal(h.w.document.querySelectorAll('.aru-source-caption-comment-button').length,1);
      }
    }finally{h.close();globals.forEach((k,i)=>saved[i]?Object.defineProperty(globalThis,k,saved[i]!):Reflect.deleteProperty(globalThis,k));}
  });
}

test('태그 패널 draft는 보존하고 이전 MAIN handle 선택은 새 패널로 넘기지 않는다',async()=>{
  const h=host('promise',{enabled:true,aruIconsOptions:{enabled:true}});h.w.TextEncoder=TextEncoder;h.w.TextDecoder=TextDecoder;
  h.w.document.querySelector('.note-toolbar button')!.innerHTML='<i class="icon-camera"></i>';
  const source=h.w.document.createElement('textarea');source.id='ReactSummernoteLite';h.w.document.querySelector('.seditor')!.append(source);
  const editable=h.w.document.querySelector('.note-editable')!;
  const image=h.w.document.createElement('img');image.src='https://i1.ruliweb.com/tag-fixture.jpg';image.dataset.aruId='kept-image-id';editable.append(image);
  h.w.jQuery=()=>({data:()=>({modules:{editor:{editable,history:{stack:[],stackOffset:-1,recordUndo(){}},beforeCommand(){}}},triggerEvent(){}})});
  h.w.seditor={getHtml:()=>editable.innerHTML};
  const sessions:EffectSession[]=[];
  installMetadataEditorBridge(h.root);
  try{h.owner.register('metadata',s=>{sessions.push(s);createMetadataUi({environment:s.environment});});await tick();
    let controller=sessions[0].environment.__aruMetadataController;
    assert.ok(controller);let rec=Array.from(controller.entries.values())[0] as any;assert.ok(rec);
    controller.open(rec);await tick();const panel=controller.panel;assert.ok(panel);
    panel.tags=['보존할 태그'];panel.q('.free').value='작성 중 자유 태그';panel.q('.search').value='검색 초안';panel.q('.operation').value='replace';
    assert.equal(panel.images.length,1);const oldSession=panel.session;
    panel.selection.values.add(panel.images[0].handle);
    h.fire('pagehide',true);assert.equal(panel.closed,true);assert.equal(h.w.document.querySelectorAll('[data-aru-metadata-panel]').length,0);
    h.fire('pageshow',true);await tick();controller=sessions[1].environment.__aruMetadataController;rec=Array.from(controller.entries.values())[0] as any;
    controller.open(rec);await tick();const fresh=controller.panel;assert.notEqual(fresh,panel);
    assert.equal(fresh.images.length,1);assert.notEqual(fresh.session,oldSession);
    assert.deepEqual(fresh.tags,['보존할 태그']);assert.equal(fresh.q('.free').value,'작성 중 자유 태그');assert.equal(fresh.q('.operation').value,'replace');assert.equal(fresh.q('.search').value,'검색 초안');assert.equal(fresh.selection.values.size,0);
    assert.equal(h.w.document.querySelector('#draft')!.textContent,'본문과 태그 보존');
  }finally{h.close();}
});

test('Resize·Intersection observer는 종료 때 해제되고 늦은 통지를 차단한다',async()=>{
  const h=host();let active=0,callbacks=0;const objects:any[]=[];
  class Observer {
    callback:(...args:any[])=>void;
    constructor(callback:(...args:any[])=>void){this.callback=callback;objects.push(this);}
    observe(){active++;} disconnect(){active--;}
    fire(){this.callback([],this);}
  }
  h.w.ResizeObserver=Observer as unknown as typeof ResizeObserver;
  h.w.IntersectionObserver=Observer as unknown as typeof IntersectionObserver;
  try{h.owner.register('observers',s=>{
    new s.environment.ResizeObserver(()=>callbacks++).observe(h.w.document.body);
    new s.environment.IntersectionObserver(()=>callbacks++).observe(h.w.document.body);
  });await flush();assert.equal(active,2);objects[0].fire();assert.equal(callbacks,1);
    h.fire('pagehide',true);assert.equal(active,0);objects[0].fire();assert.equal(callbacks,1);
    h.fire('pageshow',true);await flush();assert.equal(active,2);objects[0].fire();assert.equal(callbacks,1);objects[2].fire();assert.equal(callbacks,2);
  }finally{h.close();}
});

test('종료된 세션에서 뒤늦게 확인한 native 무효화도 문서 전체를 종료한다',async()=>{
  const h=host(),sessions:EffectSession[]=[];
  try{h.owner.register('test',s=>sessions.push(s));await flush();h.fire('pagehide',true);h.fire('pageshow',true);await flush();
    sessions[0].gate.observeError(Error('cancelled old work'));assert.equal(sessions[1].isCurrent(),true);
    sessions[0].gate.observeError(Error('Extension context invalidated.'));
    assert.equal(h.owner.snapshot().native,'invalidated');assert.equal(sessions[1].gate.allows(),false);
  }finally{h.close();}
});

test('다운로드 수신 포트도 세션마다 교체하며 10회 복귀에 listener 하나만 유지한다',async()=>{
  const h=host(),listeners=new Set<(...args:any[])=>unknown>();
  const api={runtime:{id:'same-extension-id',onMessage:{addListener(fn:(...args:any[])=>unknown){listeners.add(fn);},removeListener(fn:(...args:any[])=>unknown){listeners.delete(fn);}}}};
  let extracted=0;
  try{h.owner.register('download',s=>createDownloadContent({environment:s.environment,dependencies:{downloads:{api:()=>api,error:()=>(code:string,message:string)=>Object.assign(Error(message),{code}),options:()=>async()=>true,article:()=>(url:string)=>({url}),extract:()=>()=>{extracted++;return {};}}}}));await flush();
    for(let i=0;i<10;i++){assert.equal(listeners.size,1);const old=Array.from(listeners)[0];h.fire('pagehide',true);assert.equal(listeners.size,0);h.fire('pageshow',true);await flush();assert.equal(listeners.size,1);
      old({type:'aru-body-download:collect',url:h.w.location.href},{id:api.runtime.id},()=>{});await flush();assert.equal(extracted,0);
    }
  }finally{h.close();}
});
