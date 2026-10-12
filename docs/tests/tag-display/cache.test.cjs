'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,plain,project,url}=require('./harness.cjs');
test('100 item UI with stale cache: refresh force-reads changed tags, rebuilds search/display, invalidates only selected article',async()=>{
 const h=harness();try{h.images();let fresh=h.w.document,calls=[];const cache=new Map([['other',{keep:true}]]);
 const site={...h.A.SiteAdapter,getPublicDocument:async(id,options)=>{calls.push(['read',id,options]);return fresh;}};
 const browser={requestCache:async(action,data)=>{calls.push([action,plain(data)]);if(action==='get')return {snapshot:{pack:{kind:'NORMAL',attributeReaderVersion:1,icons:[{id:'stale',keywords:['old']}]}}};if(action==='put')cache.set('selected',plain(data));}};
 const f=new h.A.IconFeature({document:h.w.document,site,browser});f.enabled=true;f.options={autoLoad:false,debug:true};
 await f.open({articleId:5039,boardId:'98',catalogRef:{source:'direct',key:'direct:98:5039',articleId:5039,boardId:'98'}});
 f.picker.setQuery('아루');assert.equal(f.picker.getSnapshot().uniqueCount,100);assert.equal(f.picker.getSnapshot().metadata.displayedTags,100);
 fresh=new h.w.DOMParser().parseFromString(h.body.outerHTML,'text/html');fresh.querySelectorAll('img').forEach(image=>image.setAttribute('data-aru-tags',h.encode(['무츠키','인사'])));
 await f.collect(true);assert.equal(f.picker.getSnapshot().uniqueCount,0);f.picker.setQuery('무츠키');assert.equal(f.picker.getSnapshot().uniqueCount,100);assert.equal(f.picker.getSnapshot().metadata.displayedTags,100);assert.ok([...f.picker.shadowRoot.querySelectorAll('.icon-tags')].every(node=>node.textContent==='무츠키 · 인사'));
 const reads=calls.filter(row=>row[0]==='read');assert.equal(reads.length,2);assert.equal(reads[1][2].forceRead,true);
 const invalid=calls.filter(row=>row[0]==='invalidate');assert.equal(invalid.length,2);assert.ok(invalid.every(row=>row[1].articleId==='5039'&&row[1].catalogSource==='direct'&&row[1].readerVersion===2));assert.deepEqual(cache.get('other'),{keep:true});assert.equal(cache.get('selected').snapshot.pack.attributeReaderVersion,2);f.destroy();
 }finally{h.destroy();}
});
test('old r2 BUNDLE reader marker re-reads VIDEO tags; version 2 cache reuse preserves 4998 17 groups and 1548 icons',async()=>{
 const h=harness();try{
 const root=process.env.ARU_LEGACY_TEST_ROOT||path.join(project,'aru-icons-phase2b-1-development/aru-icons-phase2b-1');
 const state=JSON.parse(fs.readFileSync(path.join(root,'tests/ruliweb-icons/fixtures/bundle-4998-state.json'),'utf8')),encoded=Buffer.from(JSON.stringify(state)).toString('base64url');
 const parsed=await h.A.Metadata.parseCarriers({v1:[encoded]},{articleId:4998,boardId:98});let cache={snapshot:{pack:{...parsed.pack,attributeReaderVersion:1}},acquiredAt:Date.now()},reads=0,stored;
 const read=async id=>{reads++;if(id===4998)return new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><div data-meta="ruricon:v1"><div data-meta="ruricon-state">'+encoded+'</div></div></div>','text/html');
 const slave=state.slaves.find(s=>s.articleId===id),doc=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"></div>','text/html'),body=doc.querySelector('.view_content');
 slave.images.forEach((src,index)=>{const node=doc.createElement(index===0?'video':'img');node.src=src;if(index===0){node.setAttribute('data-aru-id','video-'+id);node.setAttribute('data-aru-tags',h.encode(['아루']));}body.append(node);});return doc;};
 const f=new h.A.IconFeature({document:h.w.document,site:{...h.A.SiteAdapter,getPublicDocument:read},browser:{requestCache:async(action,data)=>{if(action==='get')return cache;if(action==='put')stored=plain(data);}}});
 f.enabled=true;f.options={autoLoad:false};const context={articleId:4998,boardId:'98',catalogRef:{source:'developer',key:'developer:98:4998',articleId:4998,boardId:'98'}};
 await f.open(context);assert.equal(reads,state.slaves.length+1);assert.equal(f.picker.getSnapshot().uniqueCount,1548);assert.equal(f.picker.getSnapshot().groups.length,17);assert.equal(stored.snapshot.pack.attributeReaderVersion,2);
 assert.equal(stored.snapshot.pack.icons.filter(icon=>icon.imageMetadata?.tags?.includes('아루')).length,state.slaves.length);
 assert.deepEqual(stored.snapshot.pack.icons.map(icon=>[icon.id,icon.url,icon.ref]),plain(parsed.pack.icons.map(icon=>[icon.id,icon.url,icon.ref])));
 cache={snapshot:stored.snapshot,acquiredAt:Date.now()};await f.open(context);assert.equal(reads,state.slaves.length+1);assert.equal(f.picker.getSnapshot().uniqueCount,1548);assert.equal(f.picker.getSnapshot().groups.length,17);f.destroy();
 }finally{h.destroy();}
});
test('VIDEO malformed metadata remains isolated and is not borrowed from SOURCE or surrounding wrapper',()=>{
 const h=harness();try{h.images(0);h.body.innerHTML='<a href="#none" data-aru-tags="'+h.encode(['borrowed'])+'"><div><video src="'+url('clip.mp4')+'" data-aru-tags="aru-tags:v1:%XX"></video></div></a>';const r=h.collect();assert.equal(r.pack.icons.length,1);assert.equal(r.pack.icons[0].keywords.length,0);assert.equal(r.metadataDiagnostics.mediaDetail[0].decodeError,'TAGS_INVALID');assert.equal(r.metadataDiagnostics.mediaDetail[0].reason,'decode-failed');}finally{h.destroy();}
});
