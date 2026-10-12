'use strict';
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const version=path.resolve(__dirname,'../../..'),project=path.dirname(version),read=(name,base=version)=>fs.readFileSync(path.join(base,'docs/source/ruliweb-icons/'+name+'.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const url=n=>'https://i1.ruliweb.com/ori/icon-'+n+'.png';
function harness(baseline=false){
 const dom=new JSDOM('<main></main>',{url:'https://bbs.ruliweb.com/community/board/98/read/5039',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,logs=[];
 w.console={info:(...args)=>logs.push(args),warn(){},error(){},log:(...args)=>logs.push(args)};w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
 w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return 648;}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{configurable:true,get(){return 248;}});
 const base=baseline?path.join(project,'phase2b-1-r2'):version;
 for(const name of ['core','metadata','attribute-tags','site-adapter','registry','catalog','picker','feature'])w.eval(read(name,base));
 const body=w.document.createElement('div');body.className='view_content';body.setAttribute('itemprop','articleBody');w.document.body.append(body);
 const A=w.AruIcons,encode=tags=>A.AttributeTags.encode(tags);
 const images=(n=100,tags=['아루'])=>{body.replaceChildren();for(let i=1;i<=n;i++){const image=w.document.createElement('img');image.src=url(i);image.setAttribute('data-aru-id','public-'+i);if(tags)image.setAttribute('data-aru-tags',encode(tags));body.append(image);}return [...body.querySelectorAll('img')];};
 const collect=()=>A.SiteAdapter.readArticlePack(w.document,5039,'중립 제목','98',{diagnostics:true});
 const picker=(pack,debug=false)=>{const p=A.createPicker({debug,catalogMode:false,targetValid:false});p.setPack(pack);return p;};
 return {dom,w,A,body,logs,images,encode,collect,picker,wait:ms=>new Promise(resolve=>setTimeout(resolve,ms)),destroy:()=>w.close()};
}
module.exports={version,project,read,plain,url,harness};
