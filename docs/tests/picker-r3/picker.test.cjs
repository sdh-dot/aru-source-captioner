'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,plain,version,read}=require('../tag-display/harness.cjs');
const fixtures=[];
test('BUNDLE cache migration rereads source media once, reuses enriched cache and refreshes latest tags without other-key invalidation',async()=>{
 const h=harness();try{
  const carrier={version:1,name:'cache migration',boardId:98,mainArticleId:5044,slaves:[{page:1,articleId:5039,images:['https://i2.ruliweb.com/ori/cache.mp4?gif']}]};
  const parsed=await h.A.Metadata.parseCarriers({v1:[Buffer.from(JSON.stringify(carrier)).toString('base64url')]},{articleId:5044,boardId:98});
  const old=plain(parsed.pack);old.attributeReaderVersion=2;old.icons[0].mediaKind='image';
  const main=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><div data-meta="ruricon:v1"><span data-meta="ruricon-state">'+Buffer.from(JSON.stringify(carrier)).toString('base64url')+'</span></div></div>','text/html');
  let cache={snapshot:{pack:old},acquiredAt:Date.now()},tags=['아루'],reads=[];const requests=[],packs=[],progress=[];
  const fakePicker={element:h.w.document.createElement('div'),destroy(){},clearError(){},setError(){},setPack:p=>packs.push(p),setCatalogPack(){},setProgress:p=>progress.push(p),getSnapshot(){return {};}};
  const site={...h.A.SiteAdapter,getPublicDocument:async(id,options)=>{reads.push({id,forceRead:options.forceRead===true});if(id===5044)return main;
   const doc=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><video src="'+carrier.slaves[0].images[0]+'"></video></div>','text/html');doc.querySelector('video').setAttribute('data-aru-tags',h.encode(tags));return doc;}};
  const feature=new h.A.IconFeature({document:h.w.document,site,createPicker:()=>fakePicker,browser:{requestCache:async(action,payload)=>{requests.push([action,plain(payload)]);if(action==='get')return cache;if(action==='put')cache={snapshot:plain(payload.snapshot),acquiredAt:Date.now()};}}});
  feature.enabled=true;feature.options={autoLoad:false};const context={articleId:5044,boardId:'98',title:'cache migration',catalogRef:{boardId:'98',articleId:5044,source:'direct',key:'direct:98:5044'}};
  await feature.open(context);assert.deepEqual(reads.map(x=>x.id),[5044,5039]);assert.equal(cache.snapshot.pack.icons[0].mediaKind,'video');assert.deepEqual(cache.snapshot.pack.icons[0].imageMetadata.tags,['아루']);
  reads=[];await feature.open(context);assert.equal(reads.length,0);assert.equal(progress.at(-1).status,'cached');
  tags=['무츠키'];await feature.collect(true);assert.deepEqual(reads.map(x=>x.id),[5044,5039]);assert.ok(reads.every(x=>x.forceRead));assert.deepEqual(plain(packs.at(-1).icons[0].imageMetadata.tags),['무츠키']);
  const invalid=requests.filter(x=>x[0]==='invalidate');assert.equal(invalid.length,2);assert.ok(invalid.every(x=>x[1].articleId==='5044'&&!x[1].all&&x[1].catalogSource==='direct'));feature.destroy();
 }finally{h.destroy();}
});
async function bundle(h,sizes,ext='webp'){
  const value={version:1,name:'통합 테스트',boardId:98,mainArticleId:5044,slaves:sizes.map((count,s)=>({page:s+1,articleId:5039+s,images:Array.from({length:count},(_,i)=>`https://i1.ruliweb.com/ori/source-${s}-${i}.${ext}`)}))};
  const parsed=await h.A.Metadata.parseCarriers({v1:[Buffer.from(JSON.stringify(value)).toString('base64url')]},{articleId:5044,boardId:98});
  parsed.pack.icons.forEach((icon,i)=>{icon.imageMetadata={id:'public-'+i,tags:[i%2?'무츠키':'아루','기쁨']};icon.keywords=[...icon.imageMetadata.tags];});return parsed;
}
function mount(h,pack,opts={}){
  const p=h.A.createPicker({catalogMode:true,insertionMode:true,targetValid:true,onSelect:()=>({message:'test native adapter'}),...opts});p.setPack(pack);return p;
}
const cards=p=>[...p.shadowRoot.querySelectorAll('.icon-card')];
function flushImages(h,p){for(const img of p.shadowRoot.querySelectorAll('.icon-card img[src]'))img.dispatchEvent(new h.w.Event('load'));}
test('one, six/608 and seventeen/1548 source BUNDLEs keep metadata/internal groups but mount only one list',async()=>{
 for(const sizes of [[12],[100,100,100,100,100,108],Array.from({length:17},(_,i)=>i===16?108:90)]){
  const h=harness();try{const r=await bundle(h,sizes),original=JSON.stringify(r.pack),p=mount(h,r.pack),s=p.getSnapshot();
   assert.equal(s.uniqueCount,sizes.reduce((a,b)=>a+b,0));assert.equal(s.groups.length,sizes.length);assert.equal(s.displayMode,'bundle-list');assert.equal(s.viewportCount,1);
   assert.equal(p.shadowRoot.querySelectorAll('.group-toggle').length,0);assert.equal(p.shadowRoot.querySelectorAll('.group-viewport').length,1);
   assert.equal(p.shadowRoot.querySelector('#expand-all').hidden,true);assert.equal(JSON.stringify(r.pack),original);assert.ok(cards(p).length<=72);
   fixtures.push({sources:sizes.length,icons:s.uniqueCount,cards:cards(p).length,scrolls:s.viewportCount,searchMs:s.searchMs,renderMs:s.renderMs});p.destroy();
  }finally{h.destroy();}
 }
 fs.writeFileSync(path.join(version,'docs/results/picker-r3-performance.json'),JSON.stringify({environment:'Node/jsdom; simulated 648x248 viewport; no browser/network decode',fixtures},null,2));
});
test('608 and 1548 list first/middle/end navigation preserves exact carrier order, provenance and tag ownership',async()=>{
 for(const sizes of [[100,100,100,100,100,108],Array.from({length:17},(_,i)=>i===16?108:90)]){
 const h=harness();try{const r=await bundle(h,sizes),p=mount(h,r.pack),v=p.shadowRoot.querySelector('.bundle-viewport'),seen=new Map();
  for(let top=0;top<Math.ceil(r.pack.icons.length/6)*120;top+=240){v.scrollTop=top;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(18);
   assert.ok(cards(p).length<=72);for(const card of cards(p)){const i=Number(card.dataset.index),icon=r.pack.icons[i];assert.equal(card.dataset.iconId,icon.id);assert.equal(card.querySelector('.icon-tags').textContent,icon.imageMetadata.tags.join(' · '));seen.set(i,card.dataset.iconId);}
  }
  assert.equal(seen.size,r.pack.icons.length);assert.equal(seen.get(0),r.pack.icons[0].id);assert.equal(seen.get(r.pack.icons.length-1),r.pack.icons.at(-1).id);
  assert.ok(cards(p).some(card=>card.dataset.iconId===r.pack.icons.at(-1).id));p.destroy();
 }finally{h.destroy();}}
});
test('search filters the single list in source order, resets scroll and preserves selection without insertion',async()=>{
 const h=harness();let inserted=0;try{const r=await bundle(h,[100,100,100,100,100,108]),p=mount(h,r.pack,{onSelect:()=>{inserted++;}}),v=p.shadowRoot.querySelector('.bundle-viewport');
 cards(p)[0].click();const chosen=p.getSnapshot().selectedIconId,preview=p.shadowRoot.querySelector('.selection-art img');v.scrollTop=2400;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);
 p.setQuery('무츠키');assert.equal(p.getSnapshot().uniqueCount,304);assert.equal(p.shadowRoot.querySelector('.bundle-viewport').scrollTop,0);
 assert.deepEqual(cards(p).map(c=>c.dataset.iconId),plain(r.pack.icons.filter(i=>i.keywords.includes('무츠키')).slice(0,cards(p).length).map(i=>i.id)));
 assert.equal(p.getSnapshot().selectedIconId,chosen);assert.equal(p.shadowRoot.querySelector('.selection-art img'),preview);assert.equal(inserted,0);
 p.setQuery('아루 기쁨');assert.equal(p.getSnapshot().uniqueCount,304);p.resetSearch();assert.equal(p.getSnapshot().uniqueCount,608);p.destroy();
 }finally{h.destroy();}
});
test('overlapping virtual cards retain nodes while leaving cards detach, with no stale tags/media on return',async()=>{
 const h=harness();try{const r=await bundle(h,[100]),p=mount(h,r.pack),v=p.shadowRoot.querySelector('.bundle-viewport'),overlap=cards(p).find(c=>Number(c.dataset.index)===6),first=cards(p)[0];
 v.scrollTop=240;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);assert.equal(cards(p).find(c=>c.dataset.index==='6'),overlap);assert.equal(first.isConnected,false);
 v.scrollTop=0;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);assert.equal(cards(p)[0].dataset.iconId,r.pack.icons[0].id);assert.notEqual(cards(p)[0],first);assert.equal(cards(p)[0].querySelector('.icon-tags').textContent,'아루 · 기쁨');p.destroy();
 }finally{h.destroy();}
});
test('visible WEBP thumbnails all get media elements; four is a concurrent request limit, not a lifetime thumbnail cap',async()=>{
 const h=harness();try{const r=await bundle(h,[100]),p=mount(h,r.pack);assert.ok(cards(p).every(c=>c.querySelector('img')));assert.ok(cards(p).every(c=>!c.textContent.includes('확대 보기')));
 await h.wait(20);assert.equal(p.getSnapshot().media.active,4);for(let i=0;i<8;i++)flushImages(h,p);
 assert.ok(p.getSnapshot().media.started>4);assert.ok(p.getSnapshot().media.peak<=4);
 const overscan=cards(p).find(c=>Number(c.dataset.index)>=18);assert.equal(overscan.querySelector('img').hasAttribute('src'),false);
 const v=p.shadowRoot.querySelector('.bundle-viewport');v.scrollTop=360;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);for(let i=0;i<10;i++)flushImages(h,p);
 assert.ok(cards(p).find(c=>c.dataset.index==='18').querySelector('img').hasAttribute('src'));p.destroy();
 }finally{h.destroy();}
});
for(const ext of ['png','jpg','jpeg','gif','webp','avif','mp4','webm'])test(ext+' selected preview uses correct eager media and preserves the exact URL',async()=>{
 const h=harness();try{const r=await bundle(h,[1],ext),p=mount(h,r.pack);cards(p)[0].click();const media=p.shadowRoot.querySelector('.selection-art img,.selection-art video');
 assert.equal(media.tagName,['mp4','webm'].includes(ext)?'VIDEO':'IMG');assert.equal(media.getAttribute('src'),r.pack.icons[0].url);
 if(media.tagName==='IMG')assert.equal(media.loading,'eager');else{assert.equal(media.preload,'auto');assert.equal(media.autoplay,false);assert.equal(media.controls,true);}
 media.dispatchEvent(new h.w.Event(media.tagName==='VIDEO'?'loadeddata':'load'));assert.equal(p.getSnapshot().preview.status,'ready');p.destroy();
 }finally{h.destroy();}
});
test('MP4 query-gif stays VIDEO and exact URL; source metadata/media enrichment never rewrites the carrier',async()=>{
 const h=harness();try{const url='https://i2.ruliweb.com/ori/26/10/11/1a126b3039a13dd43.mp4?gif',r=await bundle(h,[1]);r.v1Slaves[0].images=[url];r.pack.icons[0].url=url;
 const d=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><video src="'+url+'" data-aru-id="actual" data-aru-tags="'+h.encode(['아루'])+'"></video></div>','text/html');
 const result=await h.A.SiteAdapter.verifyReferences(r,{intervalMs:0,readDocument:async()=>d});assert.equal(result.verifiedCount,1);assert.equal(r.pack.icons[0].mediaKind,'video');assert.equal(r.pack.icons[0].format,'mp4');assert.equal(r.pack.icons[0].url,url);
 const p=mount(h,r.pack);cards(p)[0].click();assert.equal(p.shadowRoot.querySelector('.selection-art video').src,url);assert.equal(cards(p)[0].querySelector('.media-placeholder').textContent,'MP4 · 보기');p.destroy();
 }finally{h.destroy();}
});
test('relative source URL/data-src verification uses the same collector, and unmatched URLs are never guessed',async()=>{
 const h=harness();try{const r=await bundle(h,[2],'png'),url=r.pack.icons[0].url;
 const d=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><img data-src="//i1.ruliweb.com/ori/source-0-0.png"></div>','text/html');
 const state=await h.A.SiteAdapter.verifyReferences(r,{intervalMs:0,readDocument:async()=>d});assert.equal(state.verifiedCount,1);assert.equal(state.status,'partial');assert.equal(r.pack.icons[0].url,url);assert.equal(r.pack.icons[1].url,'https://i1.ruliweb.com/ori/source-0-1.png');
 }finally{h.destroy();}
});
test('preview error disables insertion, records public provenance in debug, and explicit retry keeps exact URL',async()=>{
 const h=harness();let inserted=0;try{const r=await bundle(h,[1]),p=mount(h,r.pack,{debug:true,onSelect:()=>{inserted++;}});cards(p)[0].click();const old=p.shadowRoot.querySelector('.selection-art img');old.dispatchEvent(new h.w.Event('error'));
 assert.equal(p.getSnapshot().preview.status,'error');assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,true);p.shadowRoot.querySelector('#prepare-selection').click();assert.equal(inserted,0);
 const row=p.getSnapshot().mediaFailures.find(r=>r.stage==='preview');assert.equal(row.articleId,5039);assert.equal(row.originalIndex,0);assert.equal(row.url,r.pack.icons[0].url);assert.equal(row.code,'MEDIA_ERROR');
 p.shadowRoot.querySelector('#media-retry').click();const fresh=p.shadowRoot.querySelector('.selection-art img');assert.notEqual(fresh,old);assert.equal(fresh.src,r.pack.icons[0].url);fresh.dispatchEvent(new h.w.Event('load'));
 assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,false);p.shadowRoot.querySelector('#prepare-selection').click();await h.wait(0);assert.equal(inserted,1);p.destroy();
 }finally{h.destroy();}
});
test('thumbnail failure has a clear fallback and can be selected/retried without declaring preview success',async()=>{
 const h=harness();try{const r=await bundle(h,[1]),p=mount(h,r.pack);await h.wait(20);cards(p)[0].querySelector('img').dispatchEvent(new h.w.Event('error'));
 assert.ok(cards(p)[0].textContent.includes('미디어를 읽지 못했습니다.'));cards(p)[0].click();assert.equal(p.getSnapshot().preview.status,'loading');assert.equal(p.getSnapshot().mediaFailures.length,0);
 p.shadowRoot.querySelector('#media-retry').click();assert.ok(cards(p)[0].querySelector('img'));p.destroy();assert.equal(h.logs.length,0);
 }finally{h.destroy();}
});
test('unsafe media stays selectable for diagnosis but cannot confirm or send it to native adapter',async()=>{
 const h=harness();let inserted=0;try{const r=await bundle(h,[1]);r.pack.icons[0].url='https://example.com/private?token=secret';const p=mount(h,r.pack,{debug:true,onSelect:()=>{inserted++;}});cards(p)[0].click();assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,true);assert.equal(p.getSnapshot().preview.code,'UNSAFE_URL');assert.equal(p.getSnapshot().mediaFailures[0].url,null);assert.ok(!JSON.stringify(h.logs).includes('secret'));assert.equal(inserted,0);p.destroy();
 }finally{h.destroy();}
});
test('native insertion failure keeps picker and preview, with no automatic retry or post submission',async()=>{
 const h=harness();let calls=0;try{const r=await bundle(h,[1]),p=mount(h,r.pack,{debug:true,onSelect:()=>{calls++;throw Object.assign(new Error('verified native format only'),{code:'MEDIA_UNSUPPORTED'});}});
 cards(p)[0].click();const media=p.shadowRoot.querySelector('.selection-art img');media.dispatchEvent(new h.w.Event('load'));p.shadowRoot.querySelector('#prepare-selection').click();await h.wait(0);
 assert.equal(calls,1);assert.equal(p.element.isConnected,true);assert.equal(p.shadowRoot.querySelector('.selection-art img'),media);assert.ok(p.shadowRoot.querySelector('#load-error').textContent.includes('MEDIA_UNSUPPORTED'));assert.equal(p.getSnapshot().mediaFailures.find(r=>r.stage==='insertion').code,'MEDIA_UNSUPPORTED');p.destroy();
 }finally{h.destroy();}
});
test('NORMAL keeps grouped folds and catalog is reachable when entering/leaving a BUNDLE',async()=>{
 const h=harness();try{h.images(100);const normal=h.collect().pack,p=mount(h,normal);assert.equal(p.getSnapshot().displayMode,'groups');assert.ok(p.shadowRoot.querySelector('.group-toggle'));assert.equal(p.shadowRoot.querySelector('#expand-all').hidden,false);
 p.shadowRoot.querySelector('.group-toggle').click();assert.equal(p.getSnapshot().groups[0].collapsed,true);p.setPack((await bundle(h,[4])).pack);
 const dock=p.shadowRoot.querySelector('#catalog-dock');assert.equal(dock.hidden,false);dock.click();assert.equal(dock.getAttribute('aria-expanded'),'true');assert.ok(p.shadowRoot.querySelector('.dialog').classList.contains('catalog-open'));p.setPack(normal);assert.equal(dock.hidden,true);assert.equal(p.getSnapshot().groups[0].collapsed,true);p.clearPack();assert.equal(p.shadowRoot.querySelector('.dialog').classList.contains('bundle-view'),false);p.destroy();
 }finally{h.destroy();}
});
test('MediaBudget handles video readiness and waits for eligibility without starting offscreen requests',async()=>{
 const h=harness();try{const budget=new h.A.MediaBudget(1),video=h.w.document.createElement('video'),img=h.w.document.createElement('img');h.body.append(video,img);let eligible=false;
 budget.add(img,'https://i1.ruliweb.com/ori/pending.png',null,()=>eligible);budget.add(video,'https://i1.ruliweb.com/ori/video.mp4');await h.wait(20);assert.equal(img.hasAttribute('src'),false);assert.equal(budget.snapshot().active,1);video.dispatchEvent(new h.w.Event('loadedmetadata'));assert.equal(budget.snapshot().active,0);
 eligible=true;budget.prune();assert.equal(img.hasAttribute('src'),true);assert.equal(budget.snapshot().peak,1);budget.destroy();assert.equal(budget.snapshot().active,0);assert.equal(budget.snapshot().queued,0);
 }finally{h.destroy();}
});
test('large viewport remains bounded by 72 cards and column resize preserves selected ID and end keyboard navigation',async()=>{
 const h=harness();try{Object.defineProperty(h.w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return 650;}});let width=648;
 Object.defineProperty(h.w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return width;}});const r=await bundle(h,[100,100,100,100,100,108]),p=mount(h,r.pack),v=p.shadowRoot.querySelector('.bundle-viewport');
 cards(p)[0].click();const chosen=p.getSnapshot().selectedIconId;assert.ok(cards(p).length<=72);assert.ok(cards(p).length>24);
 cards(p)[0].dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(p.shadowRoot.activeElement.dataset.iconId,r.pack.icons.at(-1).id);assert.equal(p.getSnapshot().selectedIconId,chosen);
 width=260;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);assert.ok(cards(p).length<=72);assert.equal(p.getSnapshot().selectedIconId,chosen);assert.equal(cards(p).at(-1).dataset.iconId,r.pack.icons.at(-1).id);p.destroy();
 }finally{h.destroy();}
});
test('legacy AVIF/WEBM insertion restriction remains explicit while selected media can be previewed',async()=>{
 const h=harness();try{h.w.eval(read('composer-adapter'));for(const ext of ['avif','webm']){const p=mount(h,(await bundle(h,[1],ext)).pack);cards(p)[0].click();assert.ok(p.shadowRoot.querySelector('.selection-art img,.selection-art video'));assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,true);assert.equal(p.shadowRoot.querySelector('#media-policy-note').hidden,false);p.destroy();}}finally{h.destroy();}
});
test('responsive anchoring expands scroll range before assigning scrollTop in browsers that clamp writes',async()=>{
 const h=harness();try{let width=648;Object.defineProperty(h.w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return width;}});
 const r=await bundle(h,[100,100,100,100,100,108]),p=mount(h,r.pack),v=p.shadowRoot.querySelector('.bundle-viewport');let top=0;
 Object.defineProperty(v,'scrollTop',{get(){return top;},set(value){top=Math.min(Math.max(0,value),parseFloat(v.firstChild.style.height)-v.clientHeight);}});
 v.scrollTop=12000;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);assert.equal(cards(p).at(-1).dataset.iconId,r.pack.icons.at(-1).id);
 width=324;v.dispatchEvent(new h.w.Event('scroll'));await h.wait(20);assert.ok(v.scrollTop>23000);assert.equal(cards(p).at(-1).dataset.iconId,r.pack.icons.at(-1).id);p.destroy();
 }finally{h.destroy();}
});
test('media debug rows omit arbitrary query tokens but preserve known mp4?gif and public provenance',async()=>{
 const h=harness();try{const r=await bundle(h,[1]);r.pack.icons[0].url+='?token=DO_NOT_LOG';r.pack.icons[0].id+='?token=DO_NOT_LOG';const p=mount(h,r.pack,{debug:true});cards(p)[0].click();p.shadowRoot.querySelector('.selection-art img').dispatchEvent(new h.w.Event('error'));
 assert.ok(!JSON.stringify(p.getSnapshot().mediaFailures).includes('DO_NOT_LOG'));assert.ok(!JSON.stringify(h.logs.filter(r=>r[0]==='[Aru Icons] media diagnostics')).includes('DO_NOT_LOG'));p.destroy();
 }finally{h.destroy();}
});
test('read-only media diagnostic reads actual media/geometry without DOM, storage, network or private draft access',async()=>{
 const h=harness();try{h.images(1);const input=h.w.document.createElement('textarea');input.value='PRIVATE_DRAFT';h.body.after(input);const p=mount(h,(await bundle(h,[4])).pack);cards(p)[0].click();const before=h.w.document.documentElement.outerHTML;
 h.w.fetch=()=>assert.fail('diagnostic must not request');const observer=new h.w.MutationObserver(()=>{});observer.observe(h.w.document,{subtree:true,attributes:true,childList:true,characterData:true});
 const output=h.w.eval(fs.readFileSync(path.join(version,'docs/11-READONLY-MEDIA-DIAGNOSTIC.js'),'utf8'));
 assert.equal(output.diagnostic,'aru-bundle-r3-media-readonly-v1');assert.equal(output.pickers[0].viewports.length,1);assert.equal(output.pickers[0].cards.length,4);assert.equal(output.bodyMedia.length,1);assert.equal(h.w.document.documentElement.outerHTML,before);assert.equal(observer.takeRecords().length,0);assert.ok(!JSON.stringify(output).includes('PRIVATE_DRAFT'));observer.disconnect();p.destroy();
 }finally{h.destroy();}
});
