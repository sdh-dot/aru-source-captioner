'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const base=require('../phase2b3/harness.cjs'),root=base.version,previous=path.join(path.dirname(root),'phase2b-3-r4');
const read=(file,dir=root)=>fs.readFileSync(path.join(dir,file),'utf8').replace(/\r\n/g,'\n');
const changes=JSON.parse(read('docs/results/copy-changes.json'));
// This explicit ledger is reviewed presentation text/markup, not an AST mask that could hide behavior.
for(const file of [...new Set(changes.map(c=>c.file))])test('presentation ledger exactly accounts for '+file,()=>{
 let expected=read('docs/source/'+file,previous);
 for(const c of changes.filter(c=>c.file===file)){assert.ok(expected.includes(c.before),'missing original '+c.before);expected=expected.split(c.before).join(c.after);}
 assert.equal(read('docs/source/'+file),expected);
});
test('design source changes only append shared CSS; palettes, theme observer, font loading and entry handlers frozen',()=>{
 const current=read('docs/source/ruliweb-icons/design-system.js'),css=read('docs/source/ruliweb-icons/polish.css');
 const block='  const polish=`'+css+'`;\n';assert.ok(current.includes(block));
 const without=current.replace(block,'').replace('css+polish+','css+').replace('css:css+entryCss+polish','css:css+entryCss');
 assert.equal(without,read('docs/source/ruliweb-icons/design-system.js',previous));
});
test('all data, native insertion, storage, decoder, collection, search and background source files remain byte identical',()=>{
 const changed=new Set(changes.map(c=>c.file).concat('ruliweb-icons/design-system.js'));
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const old of walk(path.join(previous,'docs/source'))){const rel=path.relative(path.join(previous,'docs/source'),old).replaceAll('\\','/');if(!changed.has(rel))assert.ok(fs.readFileSync(old).equals(fs.readFileSync(path.join(root,'docs/source',rel))),rel);}
 for(const browser of ['firefox','whale'])for(const f of ['manifest.json','content.js','background.js','options.js','features/ruliweb-icons/composer-bridge.js','features/icon-metadata/bridge.bundle.js','features/bundle-generator/bridge.bundle.js','features/body-download/content.bundle.js'])assert.ok(fs.readFileSync(path.join(root,browser,f)).equals(fs.readFileSync(path.join(previous,browser,f))),browser+'/'+f);
});
test('settings form identities, field types, option values and existing checked states are preserved in both packages',()=>{
 const fields=doc=>[...doc.querySelectorAll('input,select,textarea,button')].map(n=>({tag:n.tagName,id:n.id,name:n.name,type:n.type,checked:n.checked,value:n.value,min:n.min,max:n.max,options:n.options?[...n.options].map(o=>({value:o.value,selected:o.selected})):null}));
 for(const browser of ['firefox','whale']){const old=new JSDOM(read(browser+'/options.html',previous)),now=new JSDOM(read(browser+'/options.html'));try{assert.deepEqual(fields(now.window.document),fields(old.window.document));assert.equal(now.window.document.querySelector('script').getAttribute('src'),'options.js');assert.equal(now.window.document.querySelector('link[rel="stylesheet"]').getAttribute('href'),'options.css');}finally{old.window.close();now.window.close();}}
});
test('local font/license and CSP are preserved; new presentation assets have no remote dependency',()=>{
 for(const browser of ['firefox','whale']){for(const f of ['assets/fonts/PretendardVariable.woff2','assets/fonts/OFL.txt'])assert.ok(fs.readFileSync(path.join(root,browser,f)).equals(fs.readFileSync(path.join(previous,browser,f))),f);assert.doesNotMatch(read(browser+'/options.css'),/https?:\/\//);}
 assert.doesNotMatch(read('docs/source/ruliweb-icons/polish.css'),/https?:\/\/|url\(/);assert.equal(read('firefox/options.css'),read('whale/options.css'));
});
test('theme text, primary action, selection, error and focus colors meet measured AA text threshold',()=>{
 const h=base.harness(),rows=[];try{const D=h.A.DesignSystem;for(const [theme,p]of Object.entries({light:D.LIGHT,dark:D.DARK})){
  for(const [name,fg,bg]of [['text',p.text,p.surface],['muted',p.muted,p.surface],['muted-soft',p.muted,p.soft],['primary',p.primaryText,p.primary],['selected',p.selectedText,p.selected],['error',p.danger,p.dangerBackground],['focus',p.deepWine,p.surface]]){const ratio=D.contrast(fg,bg);rows.push({theme,name,foreground:fg,background:bg,ratio});assert.ok(ratio>=4.5,theme+'/'+name+' '+ratio);}
 }fs.writeFileSync(path.join(root,'docs/results/contrast.json'),JSON.stringify({scope:'Token pairs only; not full WCAG conformance or assistive-technology verification',rows},null,2));}finally{h.destroy();}
});
test('icon-only controls retain accessible names; concise copy leaves native handler identifiers and modes intact',()=>{
 const h=base.harness(),p=h.A.createPicker({insertionMode:true,targetValid:true});try{p.setPack(base.pack(5039,100));const q=s=>p.shadowRoot.querySelector(s);assert.equal(q('h1').textContent,'아루 아이콘');assert.equal(q('.search-input').placeholder,'캐릭터·태그 검색');for(const s of ['#picker-close','#clear-search']){assert.ok(q(s).getAttribute('aria-label'));assert.equal(q(s+' svg').getAttribute('aria-hidden'),'true');assert.equal(q(s+' svg').getAttribute('focusable'),'false');}assert.equal(q('#prepare-selection').textContent,'삽입');assert.deepEqual([...q('#text-match').options].map(o=>o.value),['all','any']);assert.deepEqual([...q('#tag-match').options].map(o=>o.value),['any','all']);assert.equal(q('.dialog').getAttribute('role'),'dialog');assert.equal(q('.dialog').getAttribute('aria-modal'),'true');assert.ok(q('.pack-kind'));assert.ok(q('.metrics'));}finally{p.destroy();h.destroy();}
});
test('100 saved image/video tag records reach search and card labels without changing codec or URLs',()=>{
 const h=base.harness();let p;try{h.images(97,['아루','인사']);for(let i=98;i<=100;i++){const v=h.w.document.createElement('video');v.src='https://i1.ruliweb.com/ori/'+i+'.mp4?gif';v.setAttribute('data-aru-id','video-'+i);v.setAttribute('data-aru-tags',h.encode(['아루','미소']));h.body.append(v);}const model=h.collect().pack;assert.equal(model.icons.length,100);assert.equal(model.icons.filter(i=>i.imageMetadata.tags.includes('아루')).length,100);p=h.A.createPicker({});p.setPack(model);p.setQuery('아루');assert.equal(p.getSnapshot().uniqueCount,100);assert.ok(p.getSnapshot().renderedCards<=72);for(const c of p.shadowRoot.querySelectorAll('.icon-card'))assert.match(c.querySelector('.icon-tags').textContent,/아루/);p.setQuery('');assert.equal(p.getSnapshot().uniqueCount,100);assert.equal(model.icons.filter(i=>i.url.includes('.mp4?gif')).length,3);}finally{p?.destroy();h.destroy();}
});
test('presentation CSS provides focus, reduced motion and touch states without overriding virtual dimensions or hiding actions',()=>{
 const css=read('docs/source/ruliweb-icons/polish.css');assert.match(css,/:focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/forced-colors/);assert.match(css,/pointer:coarse/);assert.doesNotMatch(css,/--aru-(row-height|card-height|card-width|media-size)\s*:/);assert.doesNotMatch(css,/\.card-choose[^{}]*\{[^}]*display:none/);assert.match(css,/\.pack-kind.*\.metrics\{display:none\}/);assert.match(css,/svg\.aru-ui-icon.*stroke-width:1\.6/);
});
