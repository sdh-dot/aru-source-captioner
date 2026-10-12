'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{harness,url,plain,encode,read}=require('./harness.cjs');
const cases=[
 ['Korean fixed and free tags',['인사','아루','블루 아카이브']],
 ['commas remain one free tag',['아루,무츠키','프로젝트, A']],
 ['duplicate whitespace tags',[' 인사 ','인사','아루   기쁨','아루 기쁨']],
 ['empty tags',[]],
];
for(const [label,values]of cases)test('writer/reader codec parity: '+label,()=>{
 const h=harness();try{h.w.eval(read('shared/icon-metadata/core.js'));assert.deepEqual(plain(h.A.AttributeTags.decode(encode(values))),plain(h.w.AruMetadata.decode(encode(values))));
 assert.equal(h.A.AttributeTags.encode(values),h.w.AruMetadata.encode(values));}finally{h.destroy();}
});
for(const [label,raw,code]of [['malformed percent','aru-tags:v1:%ZZ','TAGS_INVALID'],['malformed JSON','aru-tags:v1:%5B','TAGS_INVALID'],['invalid list',encode([1]),'TAGS_INVALID'],['unknown version','aru-tags:v9:any','TAGS_VERSION'],['size limit','x'.repeat(65537),'TAGS_INVALID']])test('bad attributes isolate one image: '+label,()=>{
 const h=harness();try{const doc=h.doc('<img src="'+url()+'"><img src="'+url('bad.png')+'"><img src="'+url('ok.gif')+'">'),nodes=doc.querySelectorAll('img');nodes[1].setAttribute('data-aru-tags',raw);nodes[2].setAttribute('data-aru-tags',encode(['미소']));
 const before=doc.body.innerHTML,r=h.A.SiteAdapter.readArticlePack(doc,6000);
 assert.equal(r.pack.icons.length,3);assert.deepEqual(plain(r.pack.icons[1].keywords),[]);assert.deepEqual(plain(r.pack.icons[2].keywords),['미소']);assert.equal(r.counts.tagErrors,1);assert.equal(r.counts.tagErrorCodes[code],1);assert.equal(doc.body.innerHTML,before);}finally{h.destroy();}
});
test('missing/empty metadata, legacy CSV and case-sensitive names use unchanged writer meanings',()=>{
 const h=harness();try{const doc=h.doc([0,1,2,3].map(i=>'<img src="'+url(i+'.png')+'">').join('')),nodes=doc.querySelectorAll('img');
 nodes[1].setAttribute('data-aru-tags','');nodes[2].setAttribute('data-aru-tags','인사, 감사 ,인사');nodes[3].setAttribute('data-aru-tags',encode(['Aru','aru']));
 const r=h.A.SiteAdapter.readArticlePack(doc,6000);assert.deepEqual(plain(r.pack.icons.map(i=>i.keywords)),[[],[],['인사','감사'],['Aru','aru']]);assert.deepEqual(plain(r.pack.tags),[]);assert.ok(r.pack.icons.every(i=>i.tagIds.length===0));}finally{h.destroy();}
});
test('anchor and site container preserve exact owner attrs, URL, ordinal and count',()=>{
 const h=harness();try{const doc=h.doc('<a class="img_load" href="'+url('original.png')+'"><img src="'+url('thumb.png')+'"></a><div class="image_wrapper"><p><img data-src="'+url('lazy.gif')+'" src="data:image/gif,x"></p></div><video src="'+url('movie.mp4')+'?webp"></video>'),nodes=doc.querySelectorAll('img');
 nodes[0].setAttribute('data-aru-id','first-id');nodes[0].setAttribute('data-aru-tags',encode(['인사','자유,태그']));nodes[1].setAttribute('data-aru-id','second-id');nodes[1].setAttribute('data-aru-tags',encode(['감사']));
 const r=h.A.SiteAdapter.readArticlePack(doc,6000);assert.equal(r.pack.icons.length,3);assert.equal(r.counts.wrappedImages,1);assert.equal(r.pack.icons[0].url,url('original.png'));assert.equal(r.pack.icons[0].imageMetadata.id,'first-id');assert.deepEqual(plain(r.pack.icons[0].keywords),['인사','자유,태그']);assert.equal(r.pack.icons[1].imageMetadata.id,'second-id');assert.equal(r.pack.icons[2].mediaKind,'video');assert.deepEqual(plain(r.pack.icons[2].keywords),[]);assert.equal(r.counts.taggedIcons,2);}finally{h.destroy();}
});
test('same URL different image attrs retain first occurrence without union; ID collisions do not dedupe distinct URLs',()=>{
 const h=harness();try{const doc=h.doc('<img src="'+url()+'"><img src="'+url()+'"><img src="'+url('different.webp')+'">'),nodes=doc.querySelectorAll('img');
 nodes.forEach((n,i)=>{n.setAttribute('data-aru-id','same-id');n.setAttribute('data-aru-tags',encode([['인사'],['감사'],['미소']][i]));});
 const r=h.A.SiteAdapter.readArticlePack(doc,6000);assert.equal(r.pack.icons.length,2);assert.equal(r.counts.duplicates,1);assert.equal(r.imageAttributesByUrl.length,3);assert.deepEqual(plain(r.pack.icons.map(i=>i.keywords)),[['인사'],['미소']]);assert.equal(new h.A.SearchIndex(r.pack).search({query:'감사'}).uniqueCount,0);assert.equal(new h.A.SearchIndex(r.pack).iconCount,2);}finally{h.destroy();}
});
test('multi-image anchor cannot guess owner; nested images keep their own tags',()=>{
 const h=harness();try{const doc=h.doc('<a class="img_load" href="'+url()+'"><img src="'+url()+'"><img src="'+url('two.webp')+'"></a>');doc.querySelector('img').setAttribute('data-aru-tags',encode(['인사']));
 const r=h.A.SiteAdapter.readArticlePack(doc,6000);assert.equal(r.pack.icons.length,1);assert.deepEqual(plain(r.pack.icons[0].keywords),[]);}finally{h.destroy();}
});
test('native snapshot model reads attrs while preserving insertion selection URL',()=>{
 const h=harness();try{const panel=h.w.document.createElement('div');panel.innerHTML='<div class="icon_share_data">모든 아이콘을 불러왔습니다.<div class="select_icon_box"><img class="select_icon" src="'+url()+'"></div></div>';h.w.document.body.append(panel);panel.querySelector('img').setAttribute('data-aru-tags',encode(['인사']));
 const pack=h.A.SiteAdapter.normalPack(h.A.SiteAdapter.snapshot(panel,6000),6000,'원본');assert.deepEqual(plain(pack.icons[0].keywords),['인사']);assert.equal(pack.icons[0].variants[0].url,url());assert.equal(pack.icons[0].variants[0].role,'selection');}finally{h.destroy();}
});
test('actual SearchIndex supports fixed/free/Korean/comma and AND queries plus catalog search',()=>{
 const h=harness();try{const doc=h.doc([0,1,2].map(i=>'<img src="'+url(i+'.png')+'">').join(''));doc.querySelectorAll('img').forEach((n,i)=>n.setAttribute('data-aru-tags',encode([['인사','아루','자유,태그'],['인사','무츠키'],['감사','아루']][i])));
 const pack=h.A.SiteAdapter.readArticlePack(doc,6000).pack,idx=new h.A.SearchIndex(pack);
 for(const [q,count]of [['인사',2],['무츠키',1],['아루 인사',1],['자유,태그',1],['감사 인사',0]])assert.equal(idx.search({query:q}).uniqueCount,count,q);
 const cat=new h.A.Catalog();const ref={boardId:'98',articleId:6000,source:'favorite',key:'favorite:98:6000',title:'테스트 팩'};cat.setEntries([ref]);assert.equal(cat.search('인사').rows.length,0);cat.remember(ref,pack);assert.equal(cat.search('인사').rows[0].matches,2);assert.equal(cat.search('아루 인사').rows[0].matches,1);}finally{h.destroy();}
});
