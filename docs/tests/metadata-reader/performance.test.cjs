'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{harness,url,encode,root}=require('./harness.cjs');
test('1500 and 3000 tagged NORMAL images retain virtual rendering/media caps and grouped searches',async()=>{
 const h=harness(),results=[];try{
 Object.defineProperty(h.w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return 648;}});
 Object.defineProperty(h.w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return 248;}});
 for(const count of [1500,3000]){
   const doc=h.doc(Array.from({length:count},(_,i)=>'<img src="'+url(i+'.png')+'" data-aru-id="id-'+i+'" data-aru-tags="'+encode([i%2?'인사':'감사','아루,작품'])+'">').join(''));
   const start=performance.now(),pack=h.A.SiteAdapter.readArticlePack(doc,6000).pack,readMs=performance.now()-start;
   const at=performance.now(),idx=new h.A.SearchIndex(pack),indexMs=performance.now()-at,s=performance.now(),found=idx.search({query:'인사 아루,작품'}),searchMs=performance.now()-s;
   assert.equal(pack.icons.length,count);assert.equal(found.uniqueCount,count/2);assert.equal(found.groups.length,1);
   const p=h.A.createPicker({catalogMode:true});h.w.document.body.append(p.element);p.setPack(pack);p.setQuery('인사 아루,작품');await new Promise(r=>h.w.setTimeout(r,25));
   const snapshot=p.getSnapshot();assert.ok(snapshot.renderedCards<=72);assert.ok(snapshot.media.active<=4);assert.equal(snapshot.uniqueCount,count/2);
   p.shadowRoot.querySelector('.group-toggle').click();assert.equal(p.getSnapshot().groups[0].collapsed,true);p.shadowRoot.querySelector('.group-toggle').click();assert.equal(p.getSnapshot().groups[0].collapsed,false);
   p.destroy();results.push({images:count,readMs,indexMs,searchMs,matched:found.uniqueCount,renderedCards:snapshot.renderedCards,activeMedia:snapshot.media.active});
 }
 fs.writeFileSync(path.join(root,'reader-artifacts/performance.json'),JSON.stringify({environment:'Node/jsdom, no browser/network/media decoding measurement',results},null,2)+'\n');
 }finally{h.destroy();}
});
