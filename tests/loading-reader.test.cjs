'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,plain}=require('../docs/tests/tag-display/harness.cjs');
const fs=require('node:fs'),path=require('node:path');
function setup(){const h=harness();if(process.env.ARU_LOADING_SOURCE_ROOT)for(const file of ['site-adapter','feature'])h.w.eval(fs.readFileSync(path.join(process.env.ARU_LOADING_SOURCE_ROOT,'docs/source/ruliweb-icons',file+'.js'),'utf8'));return h;}
async function fixture(h,duplicate=false){const urls=Array.from({length:8},(_,i)=>'https://i1.ruliweb.com/ori/test-'+i+(i===7?'.mp4?gif':'.webp'));const value={version:1,name:'합성 통합팩',boardId:98,mainArticleId:5044,slaves:[{page:1,articleId:5039,images:urls},...(duplicate?[{page:2,articleId:5039,images:urls}]:[])]};const carrier=Buffer.from(JSON.stringify(value)).toString('base64url');return {urls,carrier,parsed:await h.A.Metadata.parseCarriers({v1:[carrier]},{articleId:5044,boardId:98})};}
function source(h,urls){const doc=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"></div>','text/html');for(const [i,url]of urls.entries()){const node=doc.createElement(i===7?'video':'img');node.src=url;node.setAttribute('data-aru-id','test-'+i);node.setAttribute('data-aru-tags',h.encode(['아루','미소']));doc.querySelector('.view_content').append(node);}return doc;}
test('reference progress counts processed metadata separately from verified URLs and preserves MP4 tags',async()=>{
 const h=setup();try{const f=await fixture(h),progress=[];const result=await h.A.SiteAdapter.verifyReferences(f.parsed,{intervalMs:0,readDocument:async()=>source(h,f.urls.slice(0,7)),onProgress:p=>progress.push(plain(p))});assert.equal(result.status,'partial');assert.equal(result.processedCount,8);assert.equal(result.verifiedCount,7);assert.equal(result.states[0].missingCount,1);assert.equal(result.states[0].missing[0].index,7);assert.ok(!result.states[0].missing[0].url.includes('?'));assert.ok(progress.some(p=>p.phase==='tags'&&p.processed===0));assert.equal(progress.at(-1).processed,8);assert.equal(progress.at(-1).total,8);assert.equal(f.parsed.pack.icons[7].url,f.urls[7]);
 const full=await fixture(h);await h.A.SiteAdapter.verifyReferences(full.parsed,{intervalMs:0,readDocument:async()=>source(h,full.urls)});assert.equal(full.parsed.pack.icons[7].mediaKind,'video');assert.deepEqual(plain(full.parsed.pack.icons[7].imageMetadata.tags),['아루','미소']);
 }finally{h.destroy();}
});
test('repeated source pages read and decode one observed document while preserving both memberships',async()=>{
 const h=setup();try{const f=await fixture(h,true);let reads=0;const result=await h.A.SiteAdapter.verifyReferences(f.parsed,{intervalMs:0,readDocument:async()=>{reads++;return source(h,f.urls);}});assert.equal(reads,1);assert.equal(result.verifiedCount,16);assert.equal(f.parsed.pack.icons.length,16);assert.equal(f.parsed.pack.icons[8].ref.page,2);assert.ok(f.parsed.pack.icons.every(icon=>icon.imageMetadata.tags.includes('아루')));}finally{h.destroy();}
});
test('successful URL verification with failed tag decoding remains partial and untagged sources are valid',async()=>{
 const h=setup();try{const bad=await fixture(h),doc=source(h,bad.urls);doc.querySelector('img').setAttribute('data-aru-tags','aru-tags:v1:%broken');
 const checked=await h.A.SiteAdapter.verifyReferences(bad.parsed,{intervalMs:0,readDocument:async()=>doc});assert.equal(checked.verifiedCount,8);assert.equal(checked.states[0].status,'verified');assert.equal(checked.status,'partial');assert.equal(checked.states[0].metadataStatus,'partial');assert.equal(checked.states[0].tagErrors,1);assert.equal(bad.parsed.pack.icons[0].imageMetadata.tags.length,0);
 const clean=await fixture(h),legacy=source(h,clean.urls);for(const node of legacy.querySelectorAll('img,video'))node.removeAttribute('data-aru-tags');const state=await h.A.SiteAdapter.verifyReferences(clean.parsed,{intervalMs:0,readDocument:async()=>legacy});assert.equal(state.status,'complete');assert.equal(state.states[0].metadataStatus,'none');
 }finally{h.destroy();}
});
test('aborted reference read never enriches or publishes stale response',async()=>{
 const h=setup();try{const f=await fixture(h),controller=new h.w.AbortController();await assert.rejects(h.A.SiteAdapter.verifyReferences(f.parsed,{intervalMs:0,signal:controller.signal,readDocument:async()=>{controller.abort();return source(h,f.urls);}}),error=>error.code==='ABORTED');assert.ok(f.parsed.pack.icons.every(icon=>!icon.imageMetadata));}finally{h.destroy();}
});
test('old cache marked URL-complete but containing tag failures is stale without deleting any cache or setting',async()=>{
 const h=setup();try{h.w.eval(fs.readFileSync(path.join(__dirname,'../docs/source/ruliweb-icons/library-reader.js'),'utf8'));const f=await fixture(h),actions=[];f.parsed.pack.attributeReaderVersion=2;f.parsed.pack.mediaReaderVersion=1;
 const reader=new h.A.LibraryPackReader({isActive:()=>true,browser:{requestCache:async(action)=>{actions.push(action);return {snapshot:{pack:f.parsed.pack,sourceCheck:{status:'complete',states:[{status:'verified',tagErrors:1}]}},acquiredAt:100};}}});
 const cache=await reader.getCached({boardId:'98',articleId:5044,source:'direct'});assert.equal(cache.stale,true);assert.equal(cache.pack,f.parsed.pack);assert.deepEqual(actions,['get']);
 }finally{h.destroy();}
});
test('same pack taps join one read, switching cancels old response and failed selection preserves the old pack',async()=>{
 const h=setup();try{const reads=[],packs=[],progress=[];let release;const picker={element:h.w.document.createElement('div'),destroy(){},setCatalog(){},clearError(){},setError(){},setPack:p=>packs.push(p),setProgress:p=>progress.push(p),completeCatalogSelection(){}};
 const site={...h.A.SiteAdapter,getPublicDocument:async id=>{reads.push(id);if(id===5039)await new Promise(resolve=>release=resolve);if(id===9999)throw Object.assign(new Error('denied'),{code:'ACCESS_DENIED'});return source(h,['https://i1.ruliweb.com/ori/'+id+'.png']);}};
 const feature=new h.A.IconFeature({document:h.w.document,site,createPicker:()=>picker,browser:{requestCache:async()=>null}});feature.enabled=true;feature.options={autoLoad:false};await feature.open({articleId:null,boardId:'98',catalogMode:true});
 const old=feature.chooseArticle('5039'),same=feature.chooseArticle('5039');assert.equal(old,same);await h.wait(5);const next=feature.chooseArticle('5040');await next;release();await old;assert.deepEqual(reads,[5039,5040]);assert.equal(packs.at(-1).mainArticleId,5040);assert.ok(!packs.some(p=>p.mainArticleId===5039));
 const prior=packs.at(-1);const denied=await feature.chooseArticle('9999');assert.equal(denied.ok,false);assert.equal(packs.at(-1),prior);assert.equal(feature.current.articleId,5040);assert.equal(progress.at(-1).busy,false);feature.destroy();
 }finally{h.destroy();}
});
test('close aborts real fetch signal and no closed picker receives late source data',async()=>{
 const h=setup();try{let signal,release,published=0;const picker={element:h.w.document.createElement('div'),destroy(){},setCatalog(){},setPack(){published++;},setProgress(){},clearError(){},setError(){}};const site={...h.A.SiteAdapter,getPublicDocument:async(id,opts)=>{signal=opts.signal;await new Promise(r=>release=r);return source(h,['https://i1.ruliweb.com/ori/a.png']);}};
 const feature=new h.A.IconFeature({document:h.w.document,site,createPicker:()=>picker,browser:{requestCache:async()=>null}});feature.enabled=true;await feature.open({articleId:null,boardId:'98',catalogMode:true});const task=feature.chooseArticle('5039');await h.wait(5);feature.stopSession(true);assert.equal(signal.aborted,true);release();await task;assert.equal(published,0);
 }finally{h.destroy();}
});
test('NORMAL tag decode failure remains partial after storage and retains usable media',async()=>{
 const h=setup();try{const progress=[],writes=[],packs=[];
 const doc=source(h,['https://i1.ruliweb.com/ori/normal.webp']);doc.querySelector('img').setAttribute('data-aru-tags','aru-tags:v1:%broken');
 const picker={element:h.w.document.createElement('div'),destroy(){},setCatalog(){},setPack:p=>packs.push(p),setProgress:p=>progress.push(p),clearError(){},setError(){},completeCatalogSelection(){}};
 const feature=new h.A.IconFeature({document:h.w.document,site:{...h.A.SiteAdapter,getPublicDocument:async()=>doc},createPicker:()=>picker,browser:{requestCache:async(action,data)=>{if(action==='put')writes.push(data);return null;}}});
 feature.enabled=true;await feature.open({articleId:null,boardId:'98',catalogMode:true});const result=await feature.chooseArticle('3867');
 assert.equal(result.ok,true);assert.equal(packs.at(-1).icons.length,1);assert.equal(writes.at(-1).snapshot.pack.bodyCounts.tagErrors,1);
 assert.equal(progress.at(-1).busy,false);assert.equal(progress.at(-1).status,'partial');feature.destroy();
 }finally{h.destroy();}
});
test('library retries cached NORMAL tag errors without invalidating unrelated storage',async()=>{
 const h=setup();try{h.w.eval(fs.readFileSync(path.join(__dirname,'../docs/source/ruliweb-icons/library-reader.js'),'utf8'));
 const doc=source(h,['https://i1.ruliweb.com/ori/normal.webp']);doc.querySelector('img').setAttribute('data-aru-tags','aru-tags:v1:%broken');
 const pack=h.A.SiteAdapter.readArticlePack(doc,3867).pack,actions=[];
 const reader=new h.A.LibraryPackReader({isActive:()=>true,browser:{requestCache:async(action)=>{actions.push(action);return {snapshot:{pack},acquiredAt:100};}}});
 const cached=await reader.getCached({boardId:'98',articleId:3867,source:'direct'});assert.equal(cached.stale,true);assert.equal(cached.pack,pack);assert.deepEqual(actions,['get']);
 }finally{h.destroy();}
});
test('article 3867 uses the same identity on desktop/mobile and never guesses a different media URL',async()=>{
 const h=setup();try{
 for(const origin of ['https://bbs.ruliweb.com','https://m.ruliweb.com'])assert.equal(h.A.SiteAdapter.readPath('3867',origin),origin+'/community/board/98/read/3867');
 const f=await fixture(h);f.parsed.v1Slaves[0].articleId=3867;for(const icon of f.parsed.pack.icons)icon.origin.articleId=3867;
 const before=f.parsed.pack.icons.map(i=>i.url),reads=[];
 const result=await h.A.SiteAdapter.verifyReferences(f.parsed,{intervalMs:0,readDocument:async id=>{reads.push(id);return source(h,f.urls.map(url=>url.replace('/ori/','/thumb/')));}});
 assert.deepEqual(reads,[3867]);assert.equal(result.status,'partial');assert.equal(result.verifiedCount,0);assert.equal(result.states[0].missingCount,8);assert.equal(result.states[0].missing.length,5);
 assert.deepEqual(plain(f.parsed.pack.icons.map(i=>i.url)),plain(before));
 }finally{h.destroy();}
});
test('public reader rejects redirects and board lists instead of treating them as the requested article',async()=>{
 const h=setup();try{const origin='https://m.ruliweb.com',url=origin+'/community/board/98/read/3867';
 await assert.rejects(h.A.SiteAdapter.getPublicDocument(3867,{origin,forceRead:true,fetchFn:async()=>({ok:true,redirected:true,url:url.replace('3867','5039')})}),e=>e.code==='READ_REDIRECT');
 await assert.rejects(h.A.SiteAdapter.getPublicDocument(3867,{origin,forceRead:true,fetchFn:async()=>({ok:true,url,headers:{get:()=>null},text:async()=>'<main>게시판 목록</main>'})}),e=>e.code==='READ_UNAVAILABLE');
 }finally{h.destroy();}
});
test('library search keeps newly read tag failures partial and becomes complete after a successful retry',async()=>{
 const h=setup();try{for(const name of ['library-search','library-reader'])h.w.eval(fs.readFileSync(path.join(__dirname,'../docs/source/ruliweb-icons',name+'.js'),'utf8'));
 const doc=source(h,['https://i1.ruliweb.com/ori/normal.webp']);doc.querySelector('img').setAttribute('data-aru-tags','aru-tags:v1:%broken');let reads=0;
 const reader=new h.A.LibraryPackReader({isActive:()=>true,site:{...h.A.SiteAdapter,getPublicDocument:async()=>{reads++;return doc;}},browser:{requestCache:async()=>null}});
 const engine=new h.A.LibrarySearchEngine({reader});engine.setEntries([{boardId:'98',articleId:3867,source:'direct'}]);engine.setState({scope:'all'});
 const partial=await engine.collect();assert.equal(partial.count,1);assert.equal(partial.partial,true);assert.equal(partial.progress.status,'partial');
 doc.querySelector('img').setAttribute('data-aru-tags',h.encode(['미소']));const complete=await engine.collect();assert.equal(reads,2);assert.equal(complete.partial,false);assert.equal(complete.progress.status,'complete');engine.destroy();
 }finally{h.destroy();}
});
