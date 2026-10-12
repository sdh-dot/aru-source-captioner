'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,pack,ref}=require('../docs/tests/phase2b3/harness.cjs');
function setup(mobile=true,catalog=false){
 const h=harness(),w=h.w;w.matchMedia=query=>({matches:mobile&&(/pointer.*coarse|hover.*none/.test(query)),addEventListener(){},removeEventListener(){}});
 Object.defineProperty(w,'innerWidth',{configurable:true,value:mobile?360:1280});
 const viewport=new w.EventTarget();Object.assign(viewport,{width:mobile?360:1280,height:mobile?740:900,offsetTop:0,offsetLeft:0});Object.defineProperty(w,'visualViewport',{configurable:true,value:viewport});
 const engine=new h.A.LibrarySearchEngine(),value=pack(5039,100,['아루','미소']),entry=ref(5039);engine.setEntries([entry]);engine.remember(entry,value);engine.setState({currentKey:'98:5039'});
 const opener=w.document.createElement('button');w.document.body.append(opener);let calls=0;
 const p=h.A.createPicker({librarySearch:engine,catalogMode:catalog,openCatalogInitially:catalog,opener,insertionMode:true,targetValid:true,onStop(){calls++;},onSelect:async()=>({message:'fixture callback'}),uiPreferences:{read:async()=>null,write:async()=>{}}});
 p.setPack(value);p.setCatalog([entry]);const q=s=>p.shadowRoot.querySelector(s);
 return {...h,p,q,engine,viewport,opener,calls:()=>calls,close(){p.destroy();engine.destroy();h.destroy();}};
}
test('mobile open, catalog open/select/cancel and reopen never focus an editable search field',async()=>{
 for(const catalog of [false,true]){const h=setup(true,catalog);try{
  await h.wait(30);assert.ok(!h.p.shadowRoot.activeElement.matches('input,textarea'));
  assert.equal(h.q('#search-options').open,false);
  if(catalog){h.p.openCatalog();assert.equal(h.p.shadowRoot.activeElement,h.q('.catalog'));
   h.p.completeCatalogSelection();assert.equal(h.p.shadowRoot.activeElement,h.q('.dialog'));h.p.openCatalog();h.p.closeCatalog();assert.ok(!h.p.shadowRoot.activeElement.matches('input,textarea'));}
  h.q('.search-input').focus();assert.equal(h.p.shadowRoot.activeElement,h.q('.search-input'));h.p.destroy();assert.equal(h.w.document.activeElement,h.opener);
 }finally{h.close();}}
});
test('desktop keeps search focus, open options and catalog search keyboard entry',async()=>{
 const h=setup(false,true);try{await h.wait(25);assert.equal(h.p.shadowRoot.activeElement,h.q('.catalog input[type="search"]')||h.q('.catalog input'));assert.equal(h.q('#search-options').open,true);h.p.completeCatalogSelection();assert.equal(h.p.shadowRoot.activeElement,h.q('.search-input'));}finally{h.close();}
});
test('visual viewport resize/rotation retains query, selected icon, filtered grid and closes no controls',async()=>{
 const h=setup();try{h.p.setQuery('아루');h.q('[data-tag-id="미소"]').click();h.q('.icon-card').click();const selected=h.p.getSnapshot().selectedIconId;
 Object.assign(h.viewport,{width:740,height:320,offsetTop:12,offsetLeft:4});h.viewport.dispatchEvent(new h.w.Event('resize'));await h.wait(30);
 assert.equal(h.p.element.style.height,'320px');assert.equal(h.p.element.style.width,'740px');assert.equal(h.p.element.style.top,'12px');assert.equal(h.p.element.style.left,'4px');assert.equal(h.p.getSnapshot().selectedIconId,selected);assert.equal(h.p.getSnapshot().query,'아루');assert.equal(h.p.getSnapshot().uniqueCount,100);assert.ok(h.p.getSnapshot().renderedCards<=72);
 h.q('#search-options').open=true;h.q('#preview-toggle').click();assert.equal(h.q('#collapsed-insert').hidden,false);
 }finally{h.close();}
});
test('loading uses real processed count, indeterminate unknown total, keeps cards and supports actual stop callback',()=>{
 const h=setup();try{const first=h.q('.icon-card');h.p.setProgress({status:'loading',phase:'article',processed:null,total:null,message:'게시글 확인',busy:true});
 assert.equal(h.q('#pack-loading').hidden,false);assert.equal(h.q('#pack-loading progress').hasAttribute('value'),false);assert.equal(h.q('.loading-count').textContent,'');assert.equal(h.q('#groups').inert,true);
 h.p.setProgress({status:'loading',phase:'references',processed:420,total:1548,message:'원본 확인',busy:true});assert.equal(h.q('#pack-loading progress').value,420);assert.equal(h.q('#pack-loading progress').max,1548);assert.equal(h.q('.loading-count').textContent,'420 / 1,548개 처리');assert.equal(h.q('.icon-card'),first);
 h.q('#grid-load-stop').click();assert.equal(h.calls(),1);h.p.setProgress({status:'loading',phase:'storage',busy:true});assert.equal(h.q('#grid-load-stop').disabled,true);assert.equal(h.q('#load-stop').disabled,true);h.p.setProgress({status:'stopped',busy:false});assert.equal(h.q('#pack-loading').hidden,true);assert.equal(h.q('#groups').inert,false);
 h.p.setProgress({status:'complete',processed:100,total:100,busy:false});assert.equal(h.q('.icon-card'),first);
 }finally{h.close();}
});
test('catalog progress is real, cancel clears it and a late result cannot close a new selection',async()=>{
 const h=setup(true,true);try{let finish;const view=new h.A.CatalogView({container:h.w.document.body,onChoose:()=>new Promise(resolve=>finish=resolve),onDirect(){}});view.setEntries([ref(5039)]);const task=view.run(()=>new Promise(resolve=>finish=resolve),ref(5039));
 view.setProgress({status:'loading',phase:'tags',processed:10,total:100,message:'태그 확인',busy:true});assert.equal(view.progress.value,10);assert.ok(view.loadStatus.textContent.includes('10 / 100'));view.cancelPending();assert.equal(view.progress.hidden,true);finish({ok:true});await task;assert.equal(view.busy,false);view.destroy();
 }finally{h.close();}
});
test('page scroll lock restores existing inline values and releases only after last picker closes',()=>{
 const h=harness();try{h.w.document.body.style.setProperty('overflow','scroll','important');const a=h.A.createPicker(),b=h.A.createPicker();assert.equal(h.w.document.body.style.overflow,'hidden');a.destroy();assert.equal(h.w.document.body.style.overflow,'hidden');b.destroy();assert.equal(h.w.document.body.style.overflow,'scroll');assert.equal(h.w.document.body.style.getPropertyPriority('overflow'),'important');}finally{h.destroy();}
});
test('loading animation honors reduced motion and mobile layout keeps a single virtual viewport',()=>{
 const h=setup();try{const css=h.q('[data-aru-mobile-ux]').textContent;assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes('animation:none'));assert.ok(css.includes('env(safe-area-inset-bottom)'));assert.ok(css.includes('flex-wrap:nowrap;overflow-x:auto'));assert.equal(h.p.shadowRoot.querySelectorAll('.bundle-viewport').length,1);assert.equal(h.q('.dialog').classList.contains('mobile-layout'),true);}finally{h.close();}
});
