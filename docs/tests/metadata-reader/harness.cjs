'use strict';
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const url=(name='one.webp')=>'https://i1.ruliweb.com/ori/'+name;
const plain=x=>JSON.parse(JSON.stringify(x));
const encode=tags=>'aru-tags:v1:'+encodeURIComponent(JSON.stringify(tags));
function harness(){
  const dom=new JSDOM('<main></main>',{url:'https://bbs.ruliweb.com/community/board/98/read/6000',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  w.console={info(){},warn(){},error(){}};w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
  for(const file of ['core','metadata','attribute-tags','site-adapter','registry','catalog','picker','feature'])w.eval(read('shared/ruliweb-icons/'+file+'.js'));
  const doc=html=>new w.DOMParser().parseFromString('<h1 class="subject_text">테스트 팩</h1><div class="view_content" itemprop="articleBody">'+html+'</div>','text/html');
  return {dom,w,A:w.AruIcons,doc,destroy(){dom.window.close();}};
}
function feature(h,{document,cache=null,ref=true,panel=null,read=null}={}){
  const seen={packs:[],requests:[],errors:[],progress:[],reads:0};
  const picker={element:h.w.document.createElement('div'),destroy(){},clearError(){},setError:e=>seen.errors.push(e),setPack:p=>seen.packs.push(p),setCatalogPack(){},setProgress:p=>seen.progress.push(p),getSnapshot(){return new h.A.SearchIndex(seen.packs.at(-1)).search({});}};
  const site={...h.A.SiteAdapter,getPublicDocument:async(id,opts)=>{seen.reads++;return read?read(id,opts):document;}};
  const f=new h.A.IconFeature({document:h.w.document,site,createPicker:()=>picker,browser:{requestCache:async(a,p)=>{seen.requests.push([a,plain(p)]);return a==='get'?cache:null;}}});
  f.enabled=true;f.options={autoLoad:false};
  const context={articleId:6000,boardId:'98',title:'팩',panel,...(ref?{catalogRef:{boardId:'98',articleId:6000,source:'favorite',key:'favorite:98:6000'}}:{})};
  return {f,seen,context,open:()=>f.open(context)};
}
module.exports={root,read,url,plain,encode,harness,feature};
