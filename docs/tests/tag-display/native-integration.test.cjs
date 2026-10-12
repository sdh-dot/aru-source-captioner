'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {project,version}=require('./harness.cjs');
const root=process.env.ARU_LEGACY_TEST_ROOT||path.join(project,'aru-icons-phase2b-1-development/aru-icons-phase2b-1');
const {harness:writer}=require(path.join(root,'tests/icon-metadata/harness.cjs'));
const read=name=>fs.readFileSync(path.join(version,'docs/source/ruliweb-icons/'+name+'.js'),'utf8');
const row=JSON.parse(fs.readFileSync(path.join(version,'docs/evidence/5039-user-diagnostic-summary.json'),'utf8')).videos[0];
for(const target of ['comment','reply','write','modify'])test('tagged MP4 search/display/selection/preview/confirm preserves native '+target+' data and text without publication',async()=>{
 const h=writer('<p>기존 본문</p>');try{
 h.w.TextDecoder=TextDecoder;h.w.TextEncoder=TextEncoder;
 for(const name of ['core','attribute-tags','site-adapter','registry','catalog','picker','composer-bridge','feature'])h.w.eval(read(name));
 Object.setPrototypeOf(h.feature,h.A.IconFeature.prototype);h.feature.site=h.A.SiteAdapter;h.feature.createPicker=h.A.createPicker;
 h.w.HTMLMediaElement.prototype.load=function(){};h.w.HTMLMediaElement.prototype.pause=function(){};
 Object.defineProperty(h.w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return 648;}});Object.defineProperty(h.w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return 248;}});
 const cmt=h.w.document.getElementById('cmt'),info=h.$('#cmt').data('comment_info'),container=h.w.document.createElement('div');container.className='comment_container';while(cmt.firstChild)container.append(cmt.firstChild);cmt.append(container);h.$('#cmt').removeData('comment_info');h.$(container).data('comment_info',info);
 const doc=new h.w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><video src="'+row.url+'" data-aru-id="'+row.id+'" data-aru-tags="'+row.rawTags+'"></video></div>','text/html');h.A.SiteAdapter.getPublicDocument=async()=>doc;
 await h.enable();let opener;if(target==='comment')opener=h.entry('main');else if(target==='reply'){info.active_reply_id='101';opener=h.entry('101');}
 else{h.dom.reconfigure({url:'https://bbs.ruliweb.com/community/board/300143/'+(target==='modify'?'modify/6000':'write')});h.source.summernote('editor.setLastRange',h.$.summernote.range.create(h.editable.firstChild.firstChild,1));opener=h.editorRoot.querySelector('[data-aru-icons-entry]').shadowRoot.querySelector('button');}
 const draft=h.editable.textContent,comments=['main','101','202'].map(id=>h.root(id).querySelector('textarea').value);opener.click();await h.tick();assert.ok(h.feature.current.target.session);await h.feature.chooseArticle('5039');const p=h.feature.picker;p.setQuery('아루');
 assert.equal(p.getSnapshot().uniqueCount,1);assert.equal(p.shadowRoot.querySelector('.icon-tags').textContent,'아루');const before=h.editable.innerHTML;p.shadowRoot.querySelector('.icon-card').click();assert.equal(h.editable.innerHTML,before);assert.equal(h.serialized('main'),null);assert.equal(h.serialized('101'),null);
 assert.equal(p.shadowRoot.querySelector('.selection-art video').getAttribute('src'),row.url);assert.equal(p.shadowRoot.querySelector('.selection-tags').textContent,'아루');assert.equal(p.shadowRoot.querySelector('#prepare-selection').disabled,false);
 p.shadowRoot.querySelector('#prepare-selection').click();await h.tick();assert.equal(h.feature.picker,null);
 if(target==='comment'||target==='reply'){const id=target==='comment'?'main':'101';assert.equal(h.serialized(id),row.url);assert.equal(h.serialized(id==='main'?'101':'main'),null);}else{assert.ok(h.w.seditor.getHtml().includes(row.url));assert.equal(h.editable.querySelectorAll('video').length,1);}
 assert.equal(h.editable.textContent,draft);assert.deepEqual(['main','101','202'].map(id=>h.root(id).querySelector('textarea').value),comments);assert.ok(h.requests.every(item=>['capture','insert','release'].includes(item.op)));
 }finally{h.destroy();}
});
