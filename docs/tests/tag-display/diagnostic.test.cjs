'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,version,plain}=require('./harness.cjs');
const code=fs.readFileSync(path.join(version,'docs/06-READONLY-DIAGNOSTIC.js'),'utf8');
test('read-only Console diagnostic is valid JavaScript and reports 100 actual metadata/search rows without touching DOM/global/storage/network',()=>{
 const h=harness();try{h.images();const before=h.w.document.documentElement.outerHTML;
 h.w.fetch=()=>assert.fail('no network');h.w.localStorage.setItem('preserve','yes');let mutations=0;
 const keys=Object.getOwnPropertyNames(h.w);
 const observer=new h.w.MutationObserver(records=>{mutations+=records.length;});observer.observe(h.w.document,{subtree:true,attributes:true,childList:true,characterData:true});
 const output=h.w.eval(code);mutations+=observer.takeRecords().length;observer.disconnect();
 assert.equal(output.diagnostic,'aru-tags-r3-readonly-v1');assert.equal(output.counts.images,100);assert.equal(output.counts.decoded,100);assert.equal(output.counts.searchMatched,100);assert.equal(output.counts.displayableTags,100);assert.equal(output.images.length,100);assert.equal(output.missingIcons.length,0);
 assert.equal(h.w.document.documentElement.outerHTML,before);assert.deepEqual(Object.getOwnPropertyNames(h.w),keys);assert.equal(mutations,0);assert.equal(h.w.localStorage.getItem('preserve'),'yes');
 assert.ok(!JSON.stringify(output).includes('preserve'));}finally{h.destroy();}
});
test('three synthetic missing attributes reproduce 97/100 and identify exact occurrence/ID/URL/raw value, not an assumed live-site cause',()=>{
 const h=harness();try{const images=h.images();for(const position of [3,51,100])images[position-1].removeAttribute('data-aru-tags');
 const output=h.w.eval(code);assert.equal(output.counts.images,100);assert.equal(output.counts.ids,100);assert.equal(output.counts.tagAttributes,97);assert.equal(output.counts.searchMatched,97);
 assert.deepEqual(plain(output.missingIcons.map(row=>row.position)),[3,51,100]);assert.ok(output.missingIcons.every(row=>row.rawTags===null&&row.id&&row.url&&row.reason==='tag-attribute-missing'));
 }finally{h.destroy();}
});
test('already-open editor diagnostic compares only media attributes and does not expose text or claim server persistence',()=>{
 const h=harness();try{h.images(100);h.body.removeAttribute('itemprop');h.body.className='note-editable';const editor=h.w.document.createElement('div');editor.className='seditor';h.body.before(editor);editor.append(h.body);h.body.prepend(h.w.document.createTextNode('PRIVATE_DRAFT_DO_NOT_COLLECT'));
 h.dom.reconfigure({url:'https://bbs.ruliweb.com/community/board/98/modify/5039'});const before=h.body.outerHTML,output=h.w.eval(code);
 assert.equal(output.counts.searchMatched,100);assert.ok(output.source.includes('NOT proof'));assert.ok(!JSON.stringify(output).includes('PRIVATE_DRAFT'));assert.equal(h.body.outerHTML,before);
 }finally{h.destroy();}
});
