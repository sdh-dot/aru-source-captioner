'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root,read,harness,url,encode}=require('./harness.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
test('r1 original collector reproduces the tag-search failure for identical HTML',()=>{
 const h=harness();try{const original=process.env.ARU_R1_SITE||path.resolve(root,'../../aru-icons-phase2b-1-development/aru-icons-phase2b-1/shared/ruliweb-icons/site-adapter.js');
 const html='<img src="'+url()+'" data-aru-tags="'+encode(['인사','아루,작품'])+'">',current=h.A.SiteAdapter.readArticlePack(h.doc(html),6000).pack;
 h.w.eval(fs.readFileSync(original,'utf8'));const before=h.A.SiteAdapter.readArticlePack(h.doc(html),6000).pack;
 assert.equal(before.icons.length,current.icons.length);assert.equal(before.icons[0].id,current.icons[0].id);assert.equal(before.icons[0].url,current.icons[0].url);
 assert.equal(new h.A.SearchIndex(before).search({query:'인사'}).uniqueCount,0);assert.equal(new h.A.SearchIndex(current).search({query:'인사'}).uniqueCount,1);}finally{h.destroy();}
});
test('both production content bundles exactly include the writer-sourced tag codec and all existing common modules',()=>{
 const names=['core','metadata','attribute-tags','browser-adapter','site-adapter','registry','catalog','picker','composer-adapter','feature'];
 const expected=names.map(n=>'/* source: shared/ruliweb-icons/'+n+'.js */\n'+read('shared/ruliweb-icons/'+n+'.js')+'\n').join('\n');
 for(const p of ['aru-source-captioner','aru-source-captioner-firefox'])assert.equal(read(p+'/features/ruliweb-icons/content.bundle.js'),expected);
 const writer=read('shared/icon-metadata/core.js'),snippet=writer.slice(writer.indexOf("  const PREFIX='aru-tags:v1:';"),writer.indexOf('  function plan('));assert.ok(read('shared/ruliweb-icons/attribute-tags.js').includes(snippet));
});
test('every baseline browser and shared source is unchanged except two content bundles, two reader sources and builder',()=>{
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'reader-artifacts/r1-source-hashes.json'),'utf8'));
 const allowed=new Set(['shared/ruliweb-icons/site-adapter.js','shared/ruliweb-icons/feature.js','tools/build-ruliweb-icons.mjs','aru-source-captioner/features/ruliweb-icons/content.bundle.js','aru-source-captioner-firefox/features/ruliweb-icons/content.bundle.js']);
 let changes=[];for(const [file,before]of Object.entries(baseline)){const actual=sha(fs.readFileSync(path.join(root,file)));if(actual!==before){assert.ok(allowed.has(file),file);changes.push(file);}}
 assert.deepEqual(changes.sort(),[...allowed].sort());
 assert.equal(read('aru-source-captioner/features/icon-metadata/bridge.bundle.js'),read('aru-source-captioner-firefox/features/icon-metadata/bridge.bundle.js'));
});
