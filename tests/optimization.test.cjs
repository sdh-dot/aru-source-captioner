'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const {readBaseline}=require('./integration/baseline.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'docs/source',f),'utf8'),tick=()=>new Promise(r=>setImmediate(r));
const url=n=>'https://www.pixiv.net/artworks/'+(1000000+n);
function fixture({parse=async f=>({status:'ok',url:url(f.index||0)}),now}={}){
 const dom=new JSDOM('<div id="outside"></div><div class="seditor"><input type="file" accept="image/*"><div class="note-editable" contenteditable="true"><p>user text</p></div></div>',{url:'https://m.ruliweb.com/community/board/300143/write',runScripts:'outside-only'}),w=dom.window;
 w.eval(read('performance/metrics.js'));w.AruPerformance.configure({enabled:true});w.eval(read('upload-attribution/core.js'));
 let editor=w.document.querySelector('[contenteditable]');const input=w.document.querySelector('input'),controller=new w.AruSourceAttribution.Controller({document:w.document,parse,now,sanitize:u=>u,existing:()=>false,anchor:i=>i,caption:u=>{const e=w.document.createElement('span');e.dataset.caption=u;return e;}});
 const image=(name,index=0,target=editor)=>{const e=w.document.createElement('img');e.alt=name;e.src='https://i1.ruliweb.com/synthetic-'+index+'.webp';Object.defineProperty(e,'complete',{get:()=>true});Object.defineProperty(e,'naturalWidth',{get:()=>32});target.append(e);return e;};
 return {w,controller,input,get editor(){return editor;},set editor(v){editor=v;},image,close(){controller.destroy();w.close();}};
}
test('unrelated body mutations do not rescan editors/status; attributes and root replacement remain observable',async()=>{
 const h=fixture();try{
  const initial=h.w.AruPerformance.snapshot().metrics['upload.discover'].calls;for(let i=0;i<5;i++){h.w.document.querySelector('#outside').innerHTML='<div><span>unrelated</span></div>';await tick();}
  assert.equal(h.w.AruPerformance.snapshot().metrics['upload.discover'].calls,initial);
  await h.controller.select([{name:'a',index:1}],h.input);const img=h.image('wrong');await tick();assert.equal(h.controller.inserted,0);img.alt='a';await tick();assert.equal(h.controller.inserted,1);
  const old=h.editor,next=old.cloneNode(false);old.replaceWith(next);h.editor=next;await tick();assert.equal(h.controller.roots.size,1);assert.equal(h.controller.roots.has(old),false);assert.equal(h.controller.rootObservers.size,1);
  await h.controller.select([{name:'b',index:2}],h.input);h.image('b');await tick();assert.equal(h.controller.inserted,2);assert.equal(h.controller.registry.records[0].root,old);
  h.controller.destroy();assert.equal(h.controller.rootObservers.size,0);next.append(h.w.document.createElement('img'));await tick();assert.equal(h.controller.inserted,2);
 }finally{h.close();}
});
test('late generic editor discovery, subtree media, detached candidates and UI control removal/recreation',async()=>{
 const h=fixture();try{
  h.editor.remove();await tick();assert.equal(h.controller.roots.size,0);const replacement=h.w.document.createElement('div');replacement.setAttribute('contenteditable','true');h.w.document.querySelector('.seditor').append(replacement);h.editor=replacement;await tick();
  await h.controller.select([{name:'a'}],h.input);const block=h.w.document.createElement('p'),img=h.image('a',0,block);replacement.append(block);await tick();assert.equal(h.controller.inserted,1);
  const loose=h.image('unidentified');await tick();loose.remove();await tick();assert.equal(h.controller.candidates.size,0);
  h.w.__aruUploadNoAutoStart=true;h.w.eval(read('ruliweb-icons/design-system.js'));h.w.eval(read('upload-attribution/ui.js'));const ui=new h.w.AruUploadUI(h.w.document);
  const label=h.w.document.createElement('label');label.htmlFor='files';h.input.id='files';h.input.before(label);await tick();assert.ok(label.querySelector('[data-aru-native-label]'));
  const before=h.w.AruPerformance.snapshot().metrics['uploadUI.discover'].calls;h.w.document.documentElement.dataset.aruUploadDiagnostic='{}';await tick();assert.equal(h.w.AruPerformance.snapshot().metrics['uploadUI.discover'].calls,before);
  label.remove();await tick();assert.equal(ui.records.size,0);h.input.before(label);await tick();assert.equal(ui.records.size,1);ui.destroy();
 }finally{h.close();}
});
test('indexed Registry is equivalent to the original for seeded mixed roots, histories, capacity and exact TTL edges',()=>{
 const a=new JSDOM('',{runScripts:'outside-only'}),b=new JSDOM('',{runScripts:'outside-only'});
 try{a.window.eval(readBaseline('docs/source/upload-attribution/core.js'));b.window.eval(read('upload-attribution/core.js'));let now=0,seed=835,operations=0;
  const ra=new a.window.AruSourceAttribution.Registry({now:()=>now,ttl:17,limit:512}),rb=new b.window.AruSourceAttribution.Registry({now:()=>now,ttl:17,limit:512}),roots=[{},{}],random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  const plain=m=>({status:m.status,url:m.url,evidence:m.evidence,index:m.record?ra.records.indexOf(m.record):-1});
  for(let i=0;i<1700;i++){
   const op=random(7),editor=roots[random(2)],names=['name'+random(11),'name'+random(11)];
   if(op<2){const files=Array.from({length:1+random(3)},()=>({name:'name'+random(11)}));ra.begin(files,editor);rb.begin(files,editor);}
   else if(op===2&&ra.records.length){const index=random(ra.records.length),info=random(4)?{status:'ok',url:url(random(3))}:{status:'missing'};ra.ready(ra.records[index],info);rb.ready(rb.records[index],info);}
   else if(op===3)now+=random(5);
   const x=ra.match(names,editor),y=rb.match(names,editor);assert.deepEqual({...plain(x),ids:x.possibleIds?Array.from(x.possibleIds,id=>ra.records.findIndex(r=>r.id===id)):undefined},{...plain(y),index:y.record?rb.records.indexOf(y.record):-1,ids:y.possibleIds?Array.from(y.possibleIds,id=>rb.records.findIndex(r=>r.id===id)):undefined});
   if(op===4){ra.commit(x);rb.commit(y);}operations++;
  }
  assert.equal(operations,1700);assert.equal(ra.full,rb.full);assert.equal(JSON.stringify(ra.records.map(r=>[r.state,r.consumed])),JSON.stringify(rb.records.map(r=>[r.state,r.consumed])));
  // Separate exact boundary and multiple-name ordering checks, before quarantine dominates.
  now=0;const r=new b.window.AruSourceAttribution.Registry({now:()=>now,ttl:10});const rows=r.begin([{name:'z'},{name:'a'}],roots[0]);rows.forEach(x=>r.ready(x,{status:'ok',url:url(1)}));assert.equal(r.match(['a','z'],roots[0]).record,rows[0]);now=10;assert.equal(r.match(['z'],roots[0]).status,'matched');now=11;assert.equal(r.match(['z'],roots[0]).status,'expired');r.clear();assert.equal(r.byRoot.size,0);assert.equal(r.known.size,0);
 }finally{a.window.close();b.window.close();}
});
test('library results, memberships, title scores, tags, duplicate dictionaries and refresh match the original exactly',()=>{
 const {harness,ref,pack}=require('../docs/tests/phase2b3/harness.cjs'),h=harness();
 try{const Optimized=h.A.LibrarySearchEngine;h.w.eval(readBaseline('docs/source/ruliweb-icons/library-search.js'));const Original=h.A.LibrarySearchEngine;
  const x=new Original(),y=new Optimized(),refs=Array.from({length:6},(_,i)=>ref(5000+i,'아루 무츠키 '+i,i%2?'favorite':'developer'));
  const states=[{query:''},{query:'아루'},{query:'미소 분노',textMatch:'any'},{query:'무츠키 아루',textMatch:'all'},{query:'쉼표,포함',selectedTags:['미소']},{query:'',selectedTags:['미소','분노'],tagMatch:'any'},{query:'',tagMatch:'all'}];
  const compare=()=>{for(const scope of ['current','all'])for(const state of states){const s={scope,currentKey:'98:5005',selectedTags:[],textMatch:'all',tagMatch:'any',...state};assert.equal(JSON.stringify(x.setState(s)),JSON.stringify(y.setState(s)));}};
  x.setEntries(refs);y.setEntries(refs);
  for(let i=0;i<6;i++){const p=pack(5000+i,100,['아루','쉼표,포함',i%2?'미소':'분노']);p.tags=[{id:'same',name:'처음'},{id:'same',name:'마지막'}];p.icons.forEach(icon=>icon.tagIds=['same']);if(i===5){p.kind='BUNDLE';p.icons=p.icons.concat(pack(5000,5).icons.reverse());}x.remember(refs[i],p,{acquiredAt:i+1});y.remember(refs[i],p,{acquiredAt:i+1});compare();}
  const updated=pack(5000,100,['변경 태그']);x.remember(refs[0],updated,{acquiredAt:100});y.remember(refs[0],updated,{acquiredAt:100});compare();x.setEntries(refs.slice().reverse());y.setEntries(refs.slice().reverse());compare();
  assert.ok(y.setState({scope:'all',query:'변경 태그',selectedTags:[]}).count>=100);x.destroy();y.destroy();assert.equal(y.rows.length,0);assert.equal(y.cache.size,0);
 }finally{h.destroy();}
});
test('overlapping batches share two parser slots, only identical in-flight File objects coalesce; failures retry',async()=>{
 let active=0,peak=0,calls=0;const release=[];const h=fixture({parse:f=>{calls++;peak=Math.max(peak,++active);return new Promise((resolve,reject)=>release.push(()=>{active--;f.fail?reject(Error('synthetic')):resolve({status:'ok',url:url(f.index||1)});}));}});
 try{
  const a=new h.w.File(['a'],'same.png'),b=new h.w.File(['b'],'same.png');a.index=1;b.index=2;
  const first=h.controller.select([a,a,b],h.input),second=h.controller.select([b,new h.w.File(['c'],'c.png')],h.input);await tick();assert.equal(peak,2);assert.equal(calls,2);
  release.shift()();release.shift()();await tick();assert.equal(calls,3);release.shift()();await Promise.all([first,second]);assert.equal(h.controller.registry.records.length,5);assert.equal(h.controller.readyCount,5);
  const repeat=h.controller.select([a],h.input);await tick();assert.equal(calls,4);release.shift()();await repeat;
  const failure=new h.w.File(['x'],'retry.png');failure.fail=true;const fail=h.controller.select([failure],h.input);await tick();release.shift()();await fail;failure.fail=false;
  const retry=h.controller.select([failure],h.input);await tick();release.shift()();await retry;assert.equal(calls,6);assert.equal(peak,2);
  assert.equal(h.controller.registry.match(['same.png'],h.editor).status,'ambiguous');
 }finally{h.close();}
});
test('all six DOM orders and both active parser completion orders preserve 3 one-to-one sources and existing content',async()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(const first of [0,1]){
  const release=new Map(),h=fixture({parse:f=>new Promise(r=>release.set(f.index,()=>r({status:'ok',url:url(f.index)})))});
  try{const files=[0,1,2].map(index=>({name:'f'+index,index})),task=h.controller.select(files,h.input),images=order.map(index=>h.image(files[index].name,index));await tick();assert.equal(h.controller.inserted,0);release.get(first)();await tick();release.get(2)();release.get(1-first)();await task;await tick();
   images.forEach((image,i)=>assert.equal(image.nextElementSibling.dataset.caption,url(order[i])));assert.equal(h.controller.inserted,3);assert.equal(h.editor.querySelector('p').textContent,'user text');
   // Reordering existing nodes and load events cannot duplicate a caption.
   for(const image of images.slice().reverse()){const caption=image.nextElementSibling;h.editor.append(image,caption);image.dispatchEvent(new h.w.Event('load'));}await tick();assert.equal(h.controller.inserted,3);
  }finally{h.close();}
 }
});
test('cancellation releases waiting callers, suppresses late captions and destroys observers/identity indexes',async()=>{
 const release=[],h=fixture({parse:()=>new Promise(r=>release.push(r))});try{
  const task=h.controller.select(Array.from({length:10},(_,index)=>({name:'f'+index,index})),h.input);await tick();assert.equal(release.length,2);
  const image=h.image('f0');await tick();h.controller.destroy();await task;assert.equal(h.controller.pending.length,0);assert.equal(h.controller.parseQueue.length,0);assert.equal(h.controller.activeJobs.size,0);assert.equal(h.controller.registry.byRoot.size,0);assert.equal(h.controller.roots.size,0);
  release.forEach(r=>r({status:'ok',url:url(1)}));await tick();assert.equal(h.controller.inserted,0);assert.equal(image.dataset.aruSourceCaptioned,undefined);assert.equal(h.controller.parseActive,0);
  await h.controller.select([{name:'after-close'}],h.input);assert.equal(h.controller.registry.records.length,0);assert.equal(h.controller.rootObservers.size,0);
 }finally{h.close();}
});
test('failed metadata retry and timed-out same-name uploads stay blocked rather than borrowing another source',async()=>{
 let fail=true,now=0;const h=fixture({parse:async()=>fail?{status:'missing'}:{status:'ok',url:url(2)},now:()=>now});try{
  await h.controller.select([{name:'retry'}],h.input);const first=h.image('retry');await tick();assert.equal(h.controller.inserted,0);fail=false;
  await h.controller.select([{name:'retry'}],h.input);h.image('retry');await tick();assert.equal(h.controller.inserted,0);assert.equal(h.controller.registry.match(['retry'],h.editor).status,'source-missing');
  await h.controller.select([{name:'late'}],h.input);now=300001;h.image('late');await tick();assert.equal(h.controller.registry.match(['late'],h.editor).status,'expired');assert.equal(h.controller.inserted,0);assert.equal(first.dataset.aruSourceCaptioned,undefined);
 }finally{h.close();}
});
test('root replacement during parsing cannot attach an earlier root source to a new editor',async()=>{
 let resolve;const h=fixture({parse:()=>new Promise(r=>resolve=r)});try{
  const task=h.controller.select([{name:'same'}],h.input);await tick();const next=h.editor.cloneNode(false);h.editor.replaceWith(next);h.editor=next;await tick();h.image('same');resolve({status:'ok',url:url(9)});await task;await tick();assert.equal(h.controller.inserted,0);assert.equal(h.controller.candidates.size,0);
 }finally{h.close();}
});
test('100 create/select/destroy cycles leave no live controller roots, observers, queued files or retained registry indexes',async()=>{
 const h=fixture();h.controller.destroy();try{
  for(let cycle=0;cycle<100;cycle++){const c=new h.w.AruSourceAttribution.Controller({document:h.w.document,parse:async()=>({status:'missing'})});await c.select([{name:'synthetic'}],h.input);c.destroy();assert.equal(c.roots.size,0);assert.equal(c.rootObservers.size,0);assert.equal(c.candidates.size,0);assert.equal(c.registry.byRoot.size,0);assert.equal(c.registry.known.size,0);assert.equal(c.pending.length,0);assert.equal(c.parseQueue.length,0);assert.equal(c.activeJobs.size,0);}
 }finally{h.close();}
});
