'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness,url,plain,encode,read,feature}=require('./harness.cjs');
for(const stage of ['first','old-empty','old-no-tags','add','change','remove'])test('NORMAL collection rereads source and caches actual tags: '+stage,async()=>{
 const h=harness();try{let tags=stage==='change'?['감사']:stage==='remove'?[]:['인사'];const doc=h.doc('<img src="'+url()+'">');doc.querySelector('img').setAttribute('data-aru-tags',encode(tags));let cache=null;
 if(stage!=='first'){const old={kind:'NORMAL',icons:stage==='old-empty'?[]:[{id:'old',url:url(),keywords:['old']}],attributeReaderVersion:stage==='old-no-tags'?undefined:1};cache={snapshot:{pack:old},acquiredAt:Date.now()};}
 const env=feature(h,{document:doc,cache});await env.open();const pack=env.seen.packs.at(-1);assert.deepEqual(plain(pack.icons[0].keywords),tags);assert.equal(env.seen.reads,1);assert.equal(env.seen.requests.at(-1)[0],'put');assert.deepEqual(env.seen.requests.at(-1)[1].snapshot.pack.icons[0].keywords,tags);env.f.destroy();}finally{h.destroy();}
});
test('same session tag additions/changes/removal via refresh use forceRead and invalidate only selected source keys',async()=>{
 const h=harness();try{let tags=['인사'];const options=[];const env=feature(h,{read:async(id,opts)=>{options.push(opts);const doc=h.doc('<img src="'+url()+'">');doc.querySelector('img').setAttribute('data-aru-tags',encode(tags));return doc;}});
 await env.open();for(const next of [['인사','감사'],['미소'],[]]){tags=next;await env.f.collect(true);assert.deepEqual(plain(env.seen.packs.at(-1).icons[0].keywords),next);}
 assert.equal(options.length,4);assert.ok(options.slice(1).every(x=>x.forceRead));const invalid=env.seen.requests.filter(x=>x[0]==='invalidate');assert.equal(invalid.length,6);assert.ok(invalid.every(x=>x[1].articleId==='6000'&&!x[1].all&&x[1].readerVersion===2&&x[1].catalogSource==='favorite'));env.f.destroy();}finally{h.destroy();}
});
function bundle(h){const state=JSON.parse(read('tests/ruliweb-icons/fixtures/bundle-4998-state.json'));return {state,encoded:Buffer.from(JSON.stringify(state)).toString('base64url'),parse:()=>h.A.Metadata.parseCarriers({v1:[Buffer.from(JSON.stringify(state)).toString('base64url')]},{articleId:4998,boardId:98})};}
test('one ordinary anchor/image occurrence is not ambiguous when enriching BUNDLE tags',async()=>{
 const h=harness();try{const result={pack:{icons:[{url:url(),keywords:[],ref:{page:1,index:0},origin:{articleId:6000}}],sources:[]},v1Slaves:[{articleId:6000,page:1,images:[url()]}]},doc=h.doc('<a href="'+url()+'"><img src="'+url()+'" data-aru-tags="'+encode(['인사'])+'"></a>');
 const r=await h.A.SiteAdapter.verifyReferences(result,{intervalMs:0,readDocument:async()=>doc});assert.equal(r.status,'complete');assert.equal(r.states[0].ambiguousMetadata,0);assert.equal(r.states[0].tagged,1);assert.deepEqual(plain(result.pack.icons[0].keywords),['인사']);}finally{h.destroy();}
});
test('4998 fresh referenced metadata enriches tags without changing all 1548 refs/URLs/order/groups/carrier',async()=>{
 const h=harness();try{const b=bundle(h),parsed=await b.parse(),before=plain(parsed.pack.icons.map(i=>({id:i.id,url:i.url,ref:i.ref,origin:i.origin}))),raw=plain(parsed.rawMetadata);
 const check=await h.A.SiteAdapter.verifyReferences(parsed,{intervalMs:0,readDocument:async id=>{const slave=b.state.slaves.find(s=>s.articleId===id),doc=h.doc(slave.images.map(src=>'<img src="'+src+'">').join(''));doc.querySelector('img').setAttribute('data-aru-id','public-id');doc.querySelector('img').setAttribute('data-aru-tags',encode(['인사','아루,무츠키']));return doc;}});
 assert.equal(check.status,'complete');assert.equal(check.verifiedCount,1548);assert.deepEqual(plain(parsed.pack.icons.map(i=>({id:i.id,url:i.url,ref:i.ref,origin:i.origin}))),before);assert.deepEqual(plain(parsed.rawMetadata),raw);
 const index=new h.A.SearchIndex(parsed.pack);assert.equal(index.search({}).uniqueCount,1548);assert.equal(index.search({}).groups.length,17);assert.ok(index.search({query:'인사'}).uniqueCount>0);assert.equal(check.states.reduce((s,x)=>s+x.tagged,0),index.search({query:'인사'}).uniqueCount);}finally{h.destroy();}
});
test('BUNDLE duplicate URL metadata is skipped, malformed tag does not block reference checks or carrier keywords',async()=>{
 const h=harness();try{const result={pack:{icons:[{url:url(),keywords:['carrier'],ref:{page:1,index:0},origin:{articleId:6000},tagIds:['original'],categoryIds:['group']}],sources:[]},v1Slaves:[{articleId:6000,page:1,images:[url()]}]},doc=h.doc('<img src="'+url()+'"><img src="'+url()+'">');
 doc.querySelectorAll('img').forEach((n,i)=>n.setAttribute('data-aru-tags',i?encode(['感謝']):'aru-tags:v1:%XX'));
 const r=await h.A.SiteAdapter.verifyReferences(result,{intervalMs:0,readDocument:async()=>doc});assert.equal(r.status,'complete');assert.equal(r.states[0].ambiguousMetadata,1);assert.equal(r.states[0].tagErrors,1);assert.deepEqual(result.pack.icons[0].keywords,['carrier']);assert.deepEqual(result.pack.icons[0].tagIds,['original']);assert.deepEqual(result.pack.icons[0].categoryIds,['group']);}finally{h.destroy();}
});
test('old catalog BUNDLE cache rereads; r2 enriched BUNDLE reuse and explicit refresh remain supported',async()=>{
 const h=harness();try{const b=bundle(h),parsed=await b.parse(),doc=h.doc('<div data-meta="ruricon:v1"><span data-meta="ruricon-state">'+b.encoded+'</span></div>');let refReads=0;
 const env=feature(h,{cache:{snapshot:{pack:parsed.pack},acquiredAt:Date.now()},read:async id=>{if(id===4998)return doc;refReads++;const slave=b.state.slaves.find(s=>s.articleId===id);return h.doc(slave.images.map(src=>'<img src="'+src+'">').join(''));}});env.context.articleId=4998;env.context.catalogRef.articleId=4998;
 await env.open();assert.equal(refReads,b.state.slaves.length);const stored=env.seen.requests.at(-1)[1];assert.equal(stored.snapshot.pack.attributeReaderVersion,1);
 const cached=feature(h,{document:doc,cache:{snapshot:{pack:stored.snapshot.pack},acquiredAt:Date.now()}});cached.context.articleId=4998;await cached.open();assert.equal(cached.seen.reads,0);assert.equal(cached.seen.progress.at(-1).status,'cached');cached.f.destroy();env.f.destroy();}finally{h.destroy();}
});
for(const promiseApi of [false,true])test('tagged cache roundtrip in '+(promiseApi?'Firefox Promise':'Chromium JSON callback')+' transport preserves private/settings records',async()=>{
 const {harness:storage}=require('../policy/storage-harness.cjs'),db=storage({adapter:true,promiseApi,jsonTransport:!promiseApi,privateData:{key:'owned',notes:'keep'}}),h=harness();
 try{const doc=h.doc('<img src="'+url()+'">');doc.querySelector('img').setAttribute('data-aru-tags',encode(['인사','자유,태그']));const pack=plain(h.A.SiteAdapter.readArticlePack(doc,6000).pack),payload={articleId:6000,boardId:98,catalogSource:'favorite',packKind:'NORMAL',readerVersion:2};
 await db.context.AruIcons.BrowserAdapter.requestCache('put',{...payload,snapshot:{pack}});const back=await db.context.AruIcons.BrowserAdapter.requestCache('get',payload);assert.deepEqual(back.snapshot.pack.icons[0].keywords,['인사','자유,태그']);assert.equal(db.indexedDB.database.version,1);
 await db.rpc('put',{articleId:4998,boardId:98,snapshot:{title:'other',icons:[]}});await db.context.AruIcons.BrowserAdapter.requestCache('invalidate',payload);assert.ok(db.indexedDB.database.stores.get('packSnapshots').has('98:4998'));assert.equal(db.indexedDB.database.stores.get('privateOverrides').get('owned').notes,'keep');assert.equal(db.writes,0);}finally{h.destroy();}
});
