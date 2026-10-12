'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,plain,version,read,url}=require('./harness.cjs');
const evidence=JSON.parse(fs.readFileSync(path.join(version,'docs/evidence/5039-user-diagnostic-summary.json'),'utf8'));
function mixed(h){
 const images=h.images();for(const row of evidence.videos){const video=h.w.document.createElement('video');video.src=row.url;video.setAttribute('data-aru-id',row.id);video.setAttribute('data-aru-tags',row.rawTags);
   const a=h.w.document.createElement('a'),div=h.w.document.createElement('div');a.href='#none';a.append(div);div.append(video);images[row.position-1].replaceWith(a);}
 return h.collect();
}
async function allCards(h,p){const seen=new Map();for(let top=0;top<4000;top+=360){const viewport=p.shadowRoot.querySelector('.group-viewport');viewport.scrollTop=top;viewport.dispatchEvent(new h.w.Event('scroll'));await h.wait(22);
 for(const card of p.shadowRoot.querySelectorAll('.icon-card'))seen.set(card.dataset.iconId,card.querySelector('.icon-tags').textContent);assert.ok(p.getSnapshot().renderedCards<=72);}
 return seen;
}
test('100 IMG tags: decode/model/index/search/reset and every virtualized card shows its actual tags',async()=>{
 const h=harness();try{h.images();const result=h.collect(),p=h.picker(result.pack,true);p.setMetadataDiagnostics(result.metadataDiagnostics);p.setQuery('아루');
 const s=p.getSnapshot().metadata;assert.equal(s.images,100);assert.equal(s.ids,100);assert.equal(s.tagAttributes,100);assert.equal(s.decoded,100);assert.equal(s.decodeFailed,0);assert.equal(s.taggedIcons,100);assert.equal(s.indexed,100);assert.equal(s.searchMatched,100);assert.equal(s.displayedTags,100);
 const cards=await allCards(h,p);assert.equal(cards.size,100);assert.ok([...cards.values()].every(label=>label==='아루'));
 p.setQuery('없는 검색어');assert.equal(p.getSnapshot().uniqueCount,0);p.setQuery('');assert.equal(p.getSnapshot().uniqueCount,100);p.destroy();
 }finally{h.destroy();}
});
test('observed 5039 VIDEO attributes reproduce r2 97/100 + no labels, r3 100/100 + 100 actual labels with unchanged URL/order/IDs',async()=>{
 const before=harness(true),after=harness();try{const old=mixed(before),fresh=mixed(after),p0=before.picker(old.pack),p=after.picker(fresh.pack,true);
 p0.setQuery('아루');p.setQuery('아루');p.setMetadataDiagnostics(fresh.metadataDiagnostics);
 assert.equal(p0.getSnapshot().uniqueCount,97);assert.ok([...p0.shadowRoot.querySelectorAll('.icon-tags')].every(node=>node.textContent==='태그 없음'));
 assert.deepEqual(plain(fresh.pack.icons.map(icon=>[icon.id,icon.url,icon.origin.originalIndex])),plain(old.pack.icons.map(icon=>[icon.id,icon.url,icon.origin.originalIndex])));
 const s=p.getSnapshot().metadata;assert.equal(s.images,97);assert.equal(s.videos,3);assert.equal(s.media,100);assert.equal(s.mediaIds,100);assert.equal(s.mediaTagAttributes,100);assert.equal(s.mediaDecoded,100);assert.equal(s.taggedIcons,100);assert.equal(s.searchMatched,100);assert.equal(s.displayedTags,100);
 for(const row of evidence.videos){const icon=fresh.pack.icons.find(icon=>icon.url===row.url),diagnostic=fresh.metadataDiagnostics.mediaDetail.find(item=>item.iconId===icon.id);
 assert.equal(icon.imageMetadata.id,row.id);assert.deepEqual(plain(icon.imageMetadata.tags),['아루']);assert.equal(diagnostic.position,row.position);assert.equal(diagnostic.rawTags,row.rawTags);assert.equal(icon.mediaKind,'video');}
 const cards=await allCards(after,p);assert.equal(cards.size,100);assert.ok([...cards.values()].every(label=>label==='아루'));
 fs.writeFileSync(path.join(version,'docs/results/100-item-comparison.json'),JSON.stringify({fixture:'97 synthetic images + three VIDEO attribute records supplied by user from 5039; no server/browser fetch',
   r2:{collected:100,searchMatched:p0.getSnapshot().uniqueCount,renderedTags:0},r3:plain(s),visitedVirtualCards:cards.size,visitedCardsWithTags:[...cards.values()].filter(label=>label==='아루').length,
   identityUrlOrderPreserved:true,liveBrowserVerification:false},null,2)+'\n');p0.destroy();p.destroy();
 }finally{before.destroy();after.destroy();}
});
test('partial/absent tags preserve untagged labels and never display arbitrary search keywords as public tags',()=>{
 const h=harness();try{const images=h.images(4,null);images[0].setAttribute('data-aru-tags',h.encode(['미소','아루']));const {pack}=h.collect();pack.icons[1].keywords=['검색용 아루'];
 const p=h.picker(pack);p.setQuery('아루');assert.equal(p.getSnapshot().uniqueCount,2);assert.deepEqual([...p.shadowRoot.querySelectorAll('.icon-tags')].map(n=>n.textContent),['미소 · 아루','태그 없음']);p.setQuery('');assert.equal(p.getSnapshot().uniqueCount,4);p.destroy();
 }finally{h.destroy();}
});
test('dictionary IDs and metadata display tags combine once; keywords remain independent',()=>{
 const h=harness();try{const labels=h.A.iconTagLabels({imageMetadata:{tags:['미소','아루']},tagIds:['smile','joy'],keywords:['검색만']},new Map([['smile','미소'],['joy','기쁨']]));assert.deepEqual(plain(labels),['미소','아루','기쁨']);}finally{h.destroy();}
});
test('duplicate URLs remain first-occurrence based; reorder remaps exact owner tags without joining other occurrences',()=>{
 const h=harness();try{const images=h.images(3);images[1].src=images[0].src;images[1].setAttribute('data-aru-tags',h.encode(['무츠키']));const a=h.collect();assert.equal(a.pack.icons.length,2);assert.equal(a.counts.duplicates,1);assert.deepEqual(plain(a.pack.icons[0].imageMetadata.tags),['아루']);assert.equal(a.metadataDiagnostics.mediaDetail[1].reason,'duplicate-url');
 h.body.prepend(images[1]);const b=h.collect();assert.deepEqual(plain(b.pack.icons[0].imageMetadata.tags),['무츠키']);assert.equal(b.pack.icons[0].imageMetadata.id,'public-2');
 }finally{h.destroy();}
});
test('malformed/unknown tag codec on IMG and VIDEO affects only that media and is diagnosed',()=>{
 const h=harness();try{const images=h.images(3);images[1].setAttribute('data-aru-tags','aru-tags:v1:%XX');const v=h.w.document.createElement('video');v.src=url('movie.mp4');v.setAttribute('data-aru-tags','aru-tags:v9:test');images[2].replaceWith(v);const r=h.collect();
 assert.equal(r.pack.icons.length,3);assert.equal(r.counts.metadata.mediaDecodeFailed,2);assert.equal(r.counts.tagErrors,2);assert.equal(new h.A.SearchIndex(r.pack).search({query:'아루'}).uniqueCount,1);assert.ok(r.metadataDiagnostics.mediaDetail.slice(1).every(row=>row.reason==='decode-failed'));
 }finally{h.destroy();}
});
test('VIDEO source URLs read attributes from their own VIDEO, never a neighbouring IMG or unverified SOURCE attribute',()=>{
 const h=harness();try{h.images(1,['다른 이미지']);const video=h.w.document.createElement('video'),source=h.w.document.createElement('source');source.src=url('clip.webm');source.type='video/webm';source.setAttribute('data-aru-tags',h.encode(['source-only']));video.setAttribute('data-aru-id','video-id');video.setAttribute('data-aru-tags',h.encode(['아루']));video.append(source);h.body.append(video);const r=h.collect();
 assert.equal(r.pack.icons.length,2);assert.deepEqual(plain(r.pack.icons[1].imageMetadata),{id:'video-id',tags:['아루']});assert.equal(new h.A.SearchIndex(r.pack).search({query:'source-only'}).uniqueCount,0);
 }finally{h.destroy();}
});
test('all 13 fixed tags, Korean spaces/commas/special chars/duplicates use unchanged writer serialization in search and labels',()=>{
 const h=harness();try{const writer=fs.readFileSync(path.join(version,'docs/source/icon-metadata/core.js'),'utf8');
 // The generated codec must contain the exact unchanged writer normalize/decode/encode snippet.
 const snippet=writer.slice(writer.indexOf("  const PREFIX='aru-tags:v1:';"),writer.indexOf('  function plan('));assert.ok(read('attribute-tags').includes(snippet));
 const tags=[...h.A.AttributeTags.FIXED,' 아루  테스트 ','쉼표,태그','아루  테스트','특수 <>&"','Ｍｕｔｓｕｋｉ'];h.images(1,tags);const {pack}=h.collect();assert.equal(pack.icons[0].imageMetadata.tags.length,17);const p=h.picker(pack);p.setQuery('아루 테스트');assert.equal(p.getSnapshot().uniqueCount,1);p.shadowRoot.querySelector('.icon-card').click();assert.equal(p.shadowRoot.querySelectorAll('.selection-tags .small-tag').length,17);assert.ok(p.shadowRoot.querySelector('.icon-tags').title.includes('쉼표,태그'));assert.ok(!p.shadowRoot.querySelector('.selection-tags').querySelector('script'));p.destroy();
 }finally{h.destroy();}
});
test('query input ignores placeholder; folds/selection/preview survive search and reset without insertion',async()=>{
 const h=harness();try{h.images();const p=h.picker(h.collect().pack);assert.equal(p.getSnapshot().query,'');assert.equal(p.shadowRoot.querySelector('[data-control="search-input"]').value,'');p.shadowRoot.querySelector('.group-toggle').click();assert.equal(p.getSnapshot().groups[0].collapsed,true);
 const input=p.shadowRoot.querySelector('[data-control="search-input"]');input.value='아루';input.dispatchEvent(new h.w.Event('input'));await h.wait(180);assert.equal(p.getSnapshot().uniqueCount,100);p.shadowRoot.querySelector('.icon-card').click();const selected=p.getSnapshot().selectedIconId;assert.equal(p.shadowRoot.querySelector('.selection-tags').textContent,'아루');assert.ok(p.shadowRoot.querySelector('.selection-art img'));assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,true);
 p.shadowRoot.querySelector('.group-toggle').click();assert.equal(p.getSnapshot().groups[0].collapsed,true);p.setQuery('아루');assert.equal(p.getSnapshot().groups[0].collapsed,true);p.resetSearch();assert.equal(p.getSnapshot().groups[0].collapsed,true);assert.equal(p.getSnapshot().selectedIconId,selected);p.destroy();
 }finally{h.destroy();}
});
test('detailed metadata logs are debug-only and identical search/fold actions do not repeat diagnostic records',()=>{
 const h=harness();try{h.images();const r=h.collect(),p=h.picker(r.pack);p.setQuery('아루');p.setMetadataDiagnostics(r.metadataDiagnostics);assert.equal(h.logs.length,0);assert.equal(p.getMetadataDiagnostics(),null);p.destroy();
 const debug=h.picker(r.pack,true);debug.setMetadataDiagnostics(r.metadataDiagnostics);debug.setQuery('아루');const count=h.logs.length;debug.setQuery('아루');assert.equal(h.logs.length,count);const details=debug.getMetadataDiagnostics();assert.equal(details.images.length,100);assert.equal(details.summary.searchMatched,100);assert.equal(details.missing.length,0);debug.destroy();
 }finally{h.destroy();}
});
