'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const url=id=>'https://www.pixiv.net/artworks/'+id;
function fixture({mobile=false,parse=async f=>({status:'ok',url:url(f.sourceId||1000000)})}={}){
  const dom=new JSDOM('<div id="editor_v2"><div class="seditor"><div class="note-toolbar"><button type="button" title="native"><i class="icon-camera"></i></button></div><input id="photos" type="file" accept="image/*" multiple><div class="note-editable" contenteditable="true"><p id="kept">작성 중인 본문</p></div></div></div><div class="common_write_wrapper"><textarea>댓글 보존</textarea><label><input type="file" accept="image/*"></label></div>',{url:(mobile?'https://m':'https://bbs')+'.ruliweb.com/community/board/300143/write',runScripts:'outside-only'});
  const w=dom.window;w.console={log(){},debug(){},info(){},warn(){},error(){}};
  if(mobile){w.innerWidth=360;Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 Android Firefox/143'});}
  w.matchMedia=()=>({matches:mobile,addEventListener(){},removeEventListener(){}});
  w.eval(source('docs/source/upload-attribution/core.js'));
  const editor=w.document.querySelector('.note-editable'),input=w.document.querySelector('#photos');
  const controller=new w.AruSourceAttribution.Controller({document:w.document,parse,sanitize:u=>u?.startsWith('https://www.pixiv.net/artworks/')?u:null,
    caption:u=>{const p=w.document.createElement('p');p.dataset.aruSourceCaption='1';p.textContent='출처: '+u;return p;},
    anchor:image=>image.closest('p')||image,existing:image=>image.closest('p')?.nextElementSibling?.dataset.aruSourceCaption==='1'});
  function image(name,{decoded=true,src='https://i1.ruliweb.com/img/synthetic.webp',parent=null}={}){
    const p=parent||w.document.createElement('p'),img=w.document.createElement('img');img.alt=name;img.src=src;
    Object.defineProperty(img,'complete',{configurable:true,get:()=>decoded});Object.defineProperty(img,'naturalWidth',{configurable:true,get:()=>decoded?64:0});
    p.append(img);if(!parent)editor.append(p);return img;
  }
  return {dom,w,editor,input,controller,image,close(){controller.destroy();w.close();}};
}
test('all six completion/DOM permutations keep each unique image source and original user text',async()=>{
  for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
    const h=fixture();try{
      const files=[0,1,2].map(i=>({name:'image-'+i+'.jpg',sourceId:1000000+i}));
      await h.controller.select(files,h.input);const images=order.map(i=>h.image(files[i].name));await tick();
      for(let n=0;n<images.length;n++)assert.equal(images[n].closest('p').nextElementSibling.textContent,'출처: '+url(1000000+order[n]));
      assert.equal(h.editor.querySelector('#kept').textContent,'작성 중인 본문');assert.equal(h.w.document.querySelector('textarea').value,'댓글 보존');
      assert.deepEqual(Array.from(h.controller.snapshot().editorOrder,x=>x.selectionIndex),order);
      assert.equal(h.controller.snapshot().captionsInserted,3);
    }finally{h.close();}
  }
});
test('images arriving before asynchronous metadata are reconsidered without a second DOM insertion',async()=>{
  const resolve={};const h=fixture({parse:f=>new Promise(r=>resolve[f.name]=r)});try{
    const task=h.controller.select([{name:'first.jpg'},{name:'second.jpg'}],h.input);
    const b=h.image('second.jpg'),a=h.image('first.jpg');await tick();assert.equal(h.editor.querySelectorAll('[data-aru-source-caption]').length,0);
    resolve['second.jpg']({status:'ok',url:url(2222222)});await tick();assert.equal(b.closest('p').nextElementSibling.textContent,'출처: '+url(2222222));
    resolve['first.jpg']({status:'ok',url:url(1111111)});await task;await tick();assert.equal(a.closest('p').nextElementSibling.textContent,'출처: '+url(1111111));
  }finally{h.close();}
});
test('same filename/size/time with different sources is ambiguous, never FIFO or deduplicated by file properties',async()=>{
  const h=fixture();try{
    const files=[{name:'same.jpg',size:10,lastModified:2,sourceId:1111111},{name:'same.jpg',size:10,lastModified:2,sourceId:2222222}];
    await h.controller.select(files,h.input);h.image('same.jpg');h.image('same.jpg');await tick();
    assert.equal(h.controller.registry.records.length,2);assert.notEqual(h.controller.registry.records[0].id,h.controller.registry.records[1].id);
    assert.equal(h.controller.snapshot().captionsInserted,0);assert.equal(h.controller.snapshot().blocked.ambiguous,2);
  }finally{h.close();}
});
test('duplicate identical sources can be captioned without claiming a duplicate file order',async()=>{
  const h=fixture();try{
    await h.controller.select([{name:'same.jpg',sourceId:1111111},{name:'same.jpg',sourceId:1111111}],h.input);h.image('same.jpg');h.image('same.jpg');await tick();
    assert.equal(h.controller.snapshot().captionsInserted,2);assert.ok(h.controller.snapshot().editorOrder.every(x=>x.selectionIndex===null&&x.evidence==='source-equivalent'));
  }finally{h.close();}
});
test('duplicate with missing metadata, conflicting alt/title and absent identity remain uncaptioned',async()=>{
  const h=fixture({parse:f=>f.missing?{status:'missing'}:{status:'ok',url:url(f.sourceId)}});try{
    await h.controller.select([{name:'same.jpg',sourceId:1111111},{name:'same.jpg',missing:true},{name:'a.jpg',sourceId:1111111},{name:'b.jpg',sourceId:2222222}],h.input);
    h.image('same.jpg');const conflict=h.image('a.jpg');conflict.title='b.jpg';h.image('');await tick();
    assert.equal(h.controller.snapshot().captionsInserted,0);assert.equal(h.controller.snapshot().blocked['source-missing'],1);assert.equal(h.controller.snapshot().blocked.ambiguous,1);assert.equal(h.controller.snapshot().blocked.unidentified,1);
  }finally{h.close();}
});
test('existing images and mixed paragraphs never borrow a newly selected source',async()=>{
  const h=fixture();try{
    const old=h.image('same.jpg');await tick();await h.controller.select([{name:'same.jpg',sourceId:1111111},{name:'mixed.jpg',sourceId:2222222}],h.input);
    const mixed=h.w.document.createElement('p');mixed.textContent='기존 설명';h.editor.append(mixed);h.image('mixed.jpg',{parent:mixed});await tick();
    assert.equal(old.dataset.aruSourceCaptioned,undefined);assert.equal(h.controller.snapshot().captionsInserted,0);assert.equal(h.controller.snapshot().blocked['mixed-anchor'],1);assert.equal(mixed.textContent,'기존 설명');
  }finally{h.close();}
});
test('blob previews and undecoded uploads wait; load failure never consumes a record; successful retry inserts once',async()=>{
  const h=fixture();try{
    await h.controller.select([{name:'a.jpg',sourceId:1111111}],h.input);const img=h.image('a.jpg',{decoded:false,src:'blob:synthetic-preview'});await tick();assert.equal(h.controller.snapshot().captionsInserted,0);
    img.src='https://i1.ruliweb.com/img/uploaded.webp';img.dispatchEvent(new h.w.Event('error'));await tick();assert.equal(h.controller.snapshot().blocked['media-error'],1);assert.equal(h.controller.registry.records[0].consumed,false);
    Object.defineProperty(img,'complete',{get:()=>true});Object.defineProperty(img,'naturalWidth',{get:()=>64});img.dispatchEvent(new h.w.Event('load'));await tick();assert.equal(h.controller.snapshot().captionsInserted,1);
    img.dispatchEvent(new h.w.Event('load'));h.editor.append(img.closest('p'));await tick();assert.equal(h.controller.snapshot().captionsInserted,1);
  }finally{h.close();}
});
test('expired identity and consumed earlier same-name/different-source uploads are quarantined',()=>{
  const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;w.eval(source('docs/source/upload-attribution/core.js'));
  try{let now=0;const r=new w.AruSourceAttribution.Registry({now:()=>now,ttl:10}),editor={};
    const [first]=r.begin([{name:'same.jpg'}],editor);r.ready(first,{status:'ok',url:url(1111111)});r.commit(r.match(['same.jpg'],editor));
    const [next]=r.begin([{name:'same.jpg'}],editor);r.ready(next,{status:'ok',url:url(2222222)});assert.equal(r.match(['same.jpg'],editor).status,'ambiguous');
    now=20;assert.equal(r.match(['same.jpg'],editor).status,'expired');const [retry]=r.begin([{name:'same.jpg'}],editor);r.ready(retry,{status:'ok',url:url(1111111)});assert.equal(r.match(['same.jpg'],editor).status,'expired');
  }finally{w.close();}
});
for(const browser of ['firefox','whale'])test(browser+' actual content adapter preserves native events and matches reversed uploads',async()=>{
  const h=fixture({mobile:browser==='firefox'});h.controller.destroy();try{
    h.w.chrome={storage:{sync:{get:(_,cb)=>cb({enabled:true})}},runtime:{getURL:p=>'https://extension.invalid/'+p}};
    h.w.exifr={parse:async file=>({ImageDescription:url(file.name==='first.jpg'?1111111:2222222)})};
    h.w.eval(source(browser+'/content.js'));await tick();
    let nativeCalls=0;h.input.addEventListener('change',()=>nativeCalls++);
    const files=[new h.w.File(['one'],'first.jpg',{type:'image/jpeg'}),new h.w.File(['two'],'second.jpg',{type:'image/jpeg'})];
    Object.defineProperty(h.input,'files',{value:files,configurable:true});h.input.dispatchEvent(new h.w.Event('change',{bubbles:true}));
    const second=h.image('second.jpg'),first=h.image('first.jpg');await tick();await tick();
    assert.equal(nativeCalls,1);assert.equal(h.input.files,files);
    assert.equal(first.closest('p').nextElementSibling.textContent,'출처: Pixiv - /artworks/1111111');assert.equal(second.closest('p').nextElementSibling.textContent,'출처: Pixiv - /artworks/2222222');
    assert.equal(first.closest('p').nextElementSibling.querySelector('a').href,url(1111111));assert.equal(second.closest('p').nextElementSibling.querySelector('a').href,url(2222222));
    const diagnostic=JSON.parse(h.w.document.documentElement.dataset.aruUploadDiagnostic);assert.equal(diagnostic.captionsInserted,2);
    assert.ok(!JSON.stringify(diagnostic).includes('first.jpg'));assert.ok(!JSON.stringify(diagnostic).includes(url(1111111)));
  }finally{h.w.dispatchEvent(new h.w.Event('pagehide'));h.close();}
});
test('native upload button keeps listeners, icon-camera discovery, disabled state and file input',async()=>{
  const h=fixture();try{
    h.w.chrome={runtime:{getURL:p=>'https://extension.invalid/'+p}};h.w.__aruUploadNoAutoStart=true;
    h.w.eval(source('docs/source/ruliweb-icons/design-system.js'));h.w.eval(source('docs/source/upload-attribution/ui.js'));
    const button=h.w.document.querySelector('.note-toolbar button'),nativeIcon=button.querySelector('.icon-camera');let calls=0;button.onclick=()=>calls++;
    const ui=new h.w.AruUploadUI(h.w.document);button.click();assert.equal(calls,1);assert.equal(button.querySelector('.icon-camera'),nativeIcon);assert.equal(button.title,'native');assert.equal(h.w.document.querySelector('#photos'),h.input);
    assert.equal(button.getAttribute('aria-label'),'이미지 첨부');assert.equal(button.querySelector('[data-aru-native-label]').shadowRoot.querySelector('.label').textContent,'이미지 첨부');
    button.disabled=true;button.click();assert.equal(calls,1);assert.equal(button.disabled,true);
    assert.equal(h.w.document.querySelector('.common_write_wrapper [data-aru-native-upload]'),null);
    ui.destroy();assert.equal(button.querySelector('[data-aru-native-label]'),null);assert.equal(button.getAttribute('aria-label'),null);
  }finally{h.close();}
});
test('all three modal/entry images use the same asset resolver and have decorative SVG error fallbacks',()=>{
  const h=fixture();try{
    h.w.browser={};h.w.chrome={runtime:{getURL:p=>'https://extension.invalid/'+p}};h.w.eval(source('docs/source/ruliweb-icons/design-system.js'));
    const D=h.w.AruIcons.DesignSystem;
    for(const kind of ['select','bundle','tags']){const host=h.w.document.createElement('div');h.w.document.body.append(host);const shadow=host.attachShadow({mode:'open'});shadow.innerHTML='<section class="dialog"><header><h2>시험</h2><button>닫기</button></header></section>';
      D.modalHeader(shadow.querySelector('header'),{kind});const image=shadow.querySelector('img');assert.ok(image.src.endsWith('modal-'+kind+'-256.png'));image.dispatchEvent(new h.w.Event('error'));const svg=shadow.querySelector('svg');assert.equal(svg.getAttribute('aria-hidden'),'true');assert.ok(svg.classList.contains('aru-modal-character'));}
  }finally{h.close();}
});
test('read-only upload diagnostic changes no editor/file/control state and contains no filenames or source URLs',async()=>{
  const h=fixture();try{
    await h.controller.select([{name:'private-test.jpg',sourceId:1111111}],h.input);h.image('private-test.jpg');await tick();
    h.w.document.documentElement.dataset.aruUploadDiagnostic=JSON.stringify(h.controller.snapshot());
    h.w.performance.getEntriesByType=()=>[{name:'https://m.ruliweb.com/upload/image?token=DO-NOT-COLLECT',initiatorType:'fetch',startTime:10,responseEnd:40}];
    const before=h.w.document.documentElement.outerHTML;
    const diagnostic=h.w.eval(source('docs/READONLY-UPLOAD-DIAGNOSTIC.js'));
    assert.equal(h.w.document.documentElement.outerHTML,before);
    const encoded=JSON.stringify(diagnostic);for(const secret of ['private-test.jpg',url(1111111),'DO-NOT-COLLECT','작성 중인 본문','댓글 보존'])assert.equal(encoded.includes(secret),false);
    assert.equal(diagnostic.uploadLikeResourceTimings.length,1);
  }finally{h.close();}
});
test('disabled extension leaves native upload UI untouched and existing settings can restore it',()=>{
  const h=fixture();try{
    let changed;h.w.chrome={runtime:{getURL:p=>'https://extension.invalid/'+p},storage:{sync:{get:(_,cb)=>cb({enabled:false})},onChanged:{addListener:listener=>changed=listener,removeListener(){}}}};
    h.w.eval(source('docs/source/ruliweb-icons/design-system.js'));h.w.eval(source('docs/source/upload-attribution/ui.js'));
    assert.equal(h.w.document.querySelector('[data-aru-native-upload]'),null);changed({enabled:{newValue:true}},'sync');assert.ok(h.w.document.querySelector('[data-aru-native-upload]'));
    changed({enabled:{newValue:false}},'sync');assert.equal(h.w.document.querySelector('[data-aru-native-upload]'),null);assert.equal(h.w.document.querySelector('[data-aru-native-upload-style]'),null);
  }finally{h.w.dispatchEvent(new h.w.Event('pagehide'));h.close();}
});
test('session capacity refuses attribution and displays a reason without changing native upload behavior',async()=>{
  const h=fixture();try{
    h.controller.registry.limit=1;await h.controller.select([{name:'a.jpg',sourceId:1111111},{name:'b.jpg',sourceId:2222222}],h.input);
    assert.equal(h.controller.snapshot().state,'capacity');assert.equal(h.controller.registry.records.length,0);
    h.image('a.jpg');await tick();assert.equal(h.controller.snapshot().captionsInserted,0);
    h.w.chrome={runtime:{getURL:p=>'https://extension.invalid/'+p}};h.w.__aruUploadNoAutoStart=true;
    h.w.eval(source('docs/source/ruliweb-icons/design-system.js'));h.w.eval(source('docs/source/upload-attribution/ui.js'));
    h.w.document.documentElement.dataset.aruUploadDiagnostic=JSON.stringify(h.controller.snapshot());
    const ui=new h.w.AruUploadUI(h.w.document);assert.equal(ui.status.hidden,false);assert.match(ui.statusLabel.textContent,/한도/);assert.equal(h.input.disabled,false);ui.destroy();
  }finally{h.close();}
});
