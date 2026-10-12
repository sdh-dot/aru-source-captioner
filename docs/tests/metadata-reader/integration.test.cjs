'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness:writer}=require('../icon-metadata/harness.cjs'),{read,plain,url,encode,harness}=require('./harness.cjs');
function reader(h){
 h.w.TextDecoder=TextDecoder;h.w.TextEncoder=TextEncoder;
 h.w.eval(read('shared/ruliweb-icons/attribute-tags.js'));
 for(const f of ['registry','catalog','picker','composer-bridge'])h.w.eval(read('shared/ruliweb-icons/'+f+'.js'));
 h.feature.createPicker=h.A.createPicker;
 h.w.HTMLMediaElement.prototype.load=function(){};
 Object.defineProperty(h.w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return 648;}});
 Object.defineProperty(h.w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return 248;}});
 const info=h.$('#cmt').data('comment_info'),container=h.w.document.createElement('div');container.className='comment_container';
 const cmt=h.w.document.getElementById('cmt');while(cmt.firstChild)container.append(cmt.firstChild);cmt.append(container);h.$('#cmt').removeData('comment_info');h.$(container).data('comment_info',info);
 return info;
}
for(const target of ['comment','reply','write','modify'])test('writer HTML -> NORMAL -> actual picker tag search/preview/confirm -> native '+target+' serialized target',async()=>{
 const h=writer('<p>기존 본문<img src="'+url()+'"><img src="'+url('two.webp')+'"><video src="'+url('movie.mp4')+'"></video></p>');try{
 const info=reader(h),d=await h.scan();await h.apply(d,['인사','아루,작품'],'add',[d.images[0].handle]);
 const saved=h.w.seditor.getHtml();assert.ok(saved.includes('data-aru-tags'));const parsed=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody">'+saved+'</div>','text/html');
 h.A.SiteAdapter.getPublicDocument=async()=>parsed;await h.enable();
 let opener;if(target==='comment')opener=h.entry('main');else if(target==='reply'){info.active_reply_id='101';opener=h.entry('101');}
 else{
   h.dom.reconfigure({url:'https://bbs.ruliweb.com/community/board/300143/'+(target==='modify'?'modify/6000':'write')});
   h.source.summernote('editor.setLastRange',h.$.summernote.range.create(h.editable.firstChild.firstChild,1));
   opener=h.editorRoot.querySelector('[data-aru-icons-entry]').shadowRoot.querySelector('button');
 }
 const draftText=h.editable.textContent,comments=['main','101','202'].map(id=>h.root(id).querySelector('textarea').value);
 opener.click();await h.tick();assert.ok(h.feature.current.target.session);await h.feature.chooseArticle('6000');
 const picker=h.feature.picker;assert.equal(picker.getSnapshot().uniqueCount,3);
 const search=picker.shadowRoot.querySelector('[data-control="search-input"]');search.value='인사 아루,작품';search.dispatchEvent(new h.w.Event('input'));await h.wait(190);
 assert.equal(picker.getSnapshot().uniqueCount,1);assert.equal(picker.shadowRoot.querySelectorAll('.icon-card').length,1);
 assert.ok(picker.shadowRoot.querySelector('#prepare-selection').disabled);const htmlBefore=h.editable.innerHTML;picker.shadowRoot.querySelector('.icon-card').click();
 assert.equal(picker.shadowRoot.querySelector('.selection-art img').getAttribute('src'),parsed.querySelector('img').getAttribute('src'));
 assert.equal(h.editable.innerHTML,htmlBefore);assert.equal(h.serialized('main'),null);assert.equal(h.serialized('101'),null);
 assert.equal(picker.shadowRoot.querySelector('#prepare-selection').disabled,false);picker.shadowRoot.querySelector('#prepare-selection').click();await h.tick();assert.equal(h.feature.picker,null);
 const selected=parsed.querySelector('img').getAttribute('src');
 if(target==='comment'||target==='reply'){const id=target==='comment'?'main':'101';assert.equal(h.serialized(id),selected);assert.equal(h.serialized(id==='main'?'101':'main'),null);}
 else{assert.equal(h.editable.querySelectorAll('img').length,3);assert.ok(h.w.seditor.getHtml().includes(selected));assert.equal(h.serialized('main'),null);assert.equal(h.serialized('101'),null);}
 assert.equal(h.editable.textContent,draftText);assert.deepEqual(['main','101','202'].map(id=>h.root(id).querySelector('textarea').value),comments);
 assert.ok(h.requests.every(x=>['capture','insert','release'].includes(x.op)));
 }finally{h.destroy();}
});
test('bundle late enrichment rebuilds the actual catalog AND-query index',async()=>{
 const h=writer();try{reader(h);const state={boardId:98,mainArticleId:6000,title:'묶음',slaves:[{page:1,articleId:6001,images:[url()]}]};
 // Use the validated fixture shape; replace only its existing references.
 const template=JSON.parse(read('tests/ruliweb-icons/fixtures/bundle-v1.json'));template.boardId=98;template.mainArticleId=6000;template.slaves=[{...template.slaves[0],page:1,articleId:6001,images:[url()]}];
 const carrier=Buffer.from(JSON.stringify(template)).toString('base64url');
 h.A.SiteAdapter.getPublicDocument=async id=>new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody">'+(id===6000?'<div data-meta="ruricon:v1"><div data-meta="ruricon-state">'+carrier+'</div></div>':'<img src="'+url()+'" data-aru-tags="'+encode(['인사'])+'">')+'</div>','text/html');
 await h.enable();h.entry('main').click();await h.tick();h.feature.picker.setCatalog([{boardId:'98',articleId:6000,key:'favorite:98:6000',source:'favorite',title:'묶음'}]);
 await h.feature.chooseArticle({url:'https://bbs.ruliweb.com/community/board/98/read/6000',source:'favorite',key:'favorite:98:6000',title:'묶음'});
 const p=h.feature.picker;assert.equal(p.getSnapshot().uniqueCount,1);const input=p.shadowRoot.querySelector('.catalog-controls input');input.value='인사';input.dispatchEvent(new h.w.Event('input'));assert.equal(p.getSnapshot().catalog.entries,1);assert.equal(p.shadowRoot.querySelectorAll('.catalog-row').length,1);assert.equal(p.getSnapshot().uniqueCount,1);
 }finally{h.destroy();}
});
test('preview/confirm guard remains inactive without a captured target; tag data cannot bypass composer validation',()=>{
 const h=harness();try{const doc=h.doc('<img src="'+url()+'" data-aru-tags="'+encode(['인사'])+'">'),pack=h.A.SiteAdapter.readArticlePack(doc,6000).pack;
 const p=h.A.createPicker({insertionMode:true,targetValid:false,catalogMode:true,onSelect:()=>assert.fail('must not insert')});h.w.document.body.append(p.element);p.setPack(pack);p.setQuery('인사');p.shadowRoot.querySelector('.icon-card').click();assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,true);p.destroy();}finally{h.destroy();}
});
