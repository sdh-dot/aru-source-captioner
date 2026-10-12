'use strict';
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const version=path.resolve(__dirname,'../../..'),project=path.dirname(version),plain=x=>JSON.parse(JSON.stringify(x));
const url=n=>'https://i1.ruliweb.com/ori/icon-'+n+'.png';
const sample=(id=5039,urls=[url(1),url(2)])=>({boardId:98,articleId:id,url:'https://bbs.ruliweb.com/community/board/98/read/'+id,title:'원본 '+id,urls,icons:urls.length,images:urls.length,videos:0,taggedIcons:0,hasMetadata:false,thumbnail:null});
function common(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.__aruBundleNoAutoStart=true;for(const name of ['core','metadata','attribute-tags','site-adapter'])w.eval(fs.readFileSync(path.join(version,'docs/source/ruliweb-icons/'+name+'.js'),'utf8'));w.eval(fs.readFileSync(path.join(version,'docs/source/bundle-generator/core.js'),'utf8'));return w.AruBundle;}
function basic(){const dom=new JSDOM('<main></main>',{url:'https://bbs.ruliweb.com/community/board/98/modify/6000',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;const B=common(w);return {dom,w,B,A:w.AruIcons,doc:w.document,destroy:()=>w.close()};}
function editor(html='<p>기존 본문<img src="'+url(1)+'" data-aru-id="keep" data-aru-tags="aru-tags:v1:%5B%22%EC%95%84%EB%A3%A8%22%5D"></p><video src="https://i2.ruliweb.com/ori/movie.mp4?gif"></video><a href="attachment.zip">첨부파일</a>',route='modify/6000'){
 const legacy=process.env.ARU_LEGACY_TEST_ROOT||path.join(project,'aru-icons-phase2b-1-source-and-tests/aru-icons-phase2b-1');const {harness}=require(path.join(legacy,'tests/icon-metadata/harness.cjs'));
 const h=harness(html),w=h.w;h.dom.reconfigure({url:'https://bbs.ruliweb.com/community/board/98/'+route});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.__aruBundleNoAutoStart=true;
 w.eval(fs.readFileSync(path.join(version,'whale/features/bundle-generator/bridge.bundle.js'),'utf8'));w.eval(fs.readFileSync(path.join(version,'whale/features/bundle-generator/content.bundle.js'),'utf8'));
 h.B=w.AruBundle;h.bundleClient=new h.B.Client(w.document);h.bundleToken=w.crypto.randomUUID().replaceAll('-','');h.editorRoot.dataset.aruBundleTarget=h.bundleToken;h.scanBundle=()=>h.bundleClient.request('scan',{token:h.bundleToken});
 h.previewBundle=(s,value)=>h.bundleClient.request('preview',{session:s.session,encoded:h.B.encode(value)});h.applyBundle=(s,p)=>h.bundleClient.request('apply',{session:s.session,previewId:p.previewId});
 h.bundleRequests=[];w.document.addEventListener('aru-bundle-request-v1',e=>h.bundleRequests.push(JSON.parse(e.detail)));
 const old=h.destroy.bind(h);h.destroy=()=>{h.bundlePanel?.close();h.bundleController?.destroy();h.bundleClient.destroy();old();};return h;
}
const value=(id=6000)=>({version:1,name:'통합팩 아루',boardId:98,mainArticleId:id,slaves:[{page:1,articleId:5039,images:[url(1),url(2)]}]});
const html=value=>'<div data-meta="ruricon:v1"><p>기존 안내</p><span data-meta="ruricon-state" style="display:none">'+Buffer.from(JSON.stringify(value)).toString('base64url')+'</span></div>';
module.exports={version,project,plain,url,sample,basic,editor,value,html};
