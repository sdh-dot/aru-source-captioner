/* source: shared/body-download/core.js */
/* Local download records; deliberately separate from public aru-icons metadata. */
(function (root) {
  'use strict';
  const D = root.AruBodyDownload = root.AruBodyDownload || {};
  const HOSTS = ['i1.ruliweb.com','i2.ruliweb.com','i3.ruliweb.com'];
  const JOB_KEY = 'aruBodyDownloadJobV1';
  const error = (code, message) => Object.assign(new Error(message), {code});
  function article(url) {
    let u; try {u = new URL(url);} catch (_) {throw error('PAGE_URL','게시글 주소를 확인할 수 없습니다.');}
    const match = u.pathname.match(/^\/community\/board\/98\/read\/([1-9]\d{0,14})\/?$/);
    if (u.protocol !== 'https:' || !['bbs.ruliweb.com','m.ruliweb.com'].includes(u.hostname) || u.port || u.username || u.password || !match)
      throw error('PAGE_URL','아이콘 공유 게시판의 게시글 읽기 페이지에서 실행해 주세요.');
    return {site:'ruliweb',boardId:98,articleId:match[1],url:u.origin+'/community/board/98/read/'+match[1]};
  }
  function mediaUrl(value, base) {
    if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) throw error('MEDIA_URL','안전하지 않은 이미지 주소입니다.');
    let u; try {u = new URL(value, base);} catch (_) {throw error('MEDIA_URL','이미지 주소를 해석할 수 없습니다.');}
    if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname) || u.username || u.password || u.port || u.hash)
      throw error('MEDIA_URL','허용된 루리웹 이미지 CDN 주소가 아닙니다.');
    return u.href;
  }
  function safeName(value, max=100) {
    let text=String(value || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu,'_').replace(/\s+/gu,' ').trim().replace(/^[. ]+|[. ]+$/gu,'');
    if (!text) text='제목 없음';
    if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(text)) text='_'+text;
    text=[...text].slice(0,max).join('').replace(/[. ]+$/u,'');
    // Keep UTF-16 paths short even for non-BMP titles.
    while (text.length > max) text=[...text].slice(0,-1).join('');
    return text || '제목 없음';
  }
  function folder(source, runId) {
    const suffix=String(runId).replace(/[^a-zA-Z0-9-]/g,'').slice(0,30);
    if (!suffix) throw error('RUN_ID','다운로드 실행 식별자가 없습니다.');
    return 'Aru-Icons/'+safeName(source.title,75)+' ('+source.articleId+')/'+suffix;
  }
  function originalFilename(url) {
    const value=new URL(url).pathname.split('/').pop();
    try {return decodeURIComponent(value);} catch (_) {return value;}
  }
  function numbered(index, ext) {return String(index).padStart(3,'0')+'.'+ext;}
  function streamMedia(value, mime='') {
    const type=String(mime).split(';')[0].trim().toLowerCase();
    if (['application/vnd.apple.mpegurl','application/x-mpegurl','audio/mpegurl','audio/x-mpegurl','application/dash+xml','video/mp2t'].includes(type)) return true;
    try {return /\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(value).pathname);} catch (_) {return false;}
  }
  // Container metadata only: skip compressed payloads, never decode or reencode them.
  function isoMedia(b) {
    const text=(p,n)=>String.fromCharCode(...b.subarray(p,p+n));
    const u32=p=>b[p]*16777216+b[p+1]*65536+b[p+2]*256+b[p+3];
    let budget=4096,encrypted=false;
    function boxes(start,end,depth=0) {
      if(depth>16)throw Error('depth');
      const result=[];
      for(let p=start;p<end;){
        if(--budget<0 || p+8>end)throw Error('box');
        let size=u32(p),head=8;const type=text(p+4,4);
        if(size===1){if(p+16>end)throw Error('large box');size=u32(p+8)*4294967296+u32(p+12);head=16;}
        if(size===0)size=end-p;
        if(!Number.isSafeInteger(size) || size<head || p+size>end)throw Error('size');
        const data=p+head,limit=p+size;result.push({type,data,end:limit});
        if(['pssh','encv','enca','sinf'].includes(type))encrypted=true;
        if(['moov','trak','mdia','minf','stbl','mvex','moof','traf','sinf','schi'].includes(type))boxes(data,limit,depth+1);
        if(type==='stsd'){if(data+8>limit)throw Error('stsd');boxes(data+8,limit,depth+1);}
        // Visual sample entries have 78 bytes before child boxes (ISO BMFF).
        if(['avc1','avc3','hvc1','hev1','av01','vp08','vp09','encv'].includes(type) && data+78<limit)boxes(data+78,limit,depth+1);
        p=limit;
      }
      return result;
    }
    try {
      const top=boxes(0,b.length),ftyp=top.find(x=>x.type==='ftyp');
      if(!ftyp || ftyp.data+8>ftyp.end || (ftyp.end-ftyp.data)%4) return null;
      const brands=[text(ftyp.data,4)];for(let p=ftyp.data+8;p+4<=ftyp.end;p+=4)brands.push(text(p,4));
      if(brands.some(x=>['avif','avis'].includes(x)))return {ext:'avif',mime:'image/avif',mediaKind:'image'};
      if(brands.some(x=>['qt  ','heic','heix','hevc','hevx'].includes(x)))return null;
      if(!brands.some(x=>/^(?:isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(x)))return null;
      if(encrypted)return {ext:null,mime:'video/mp4',reason:'encrypted-media'};
      // Init segments and isolated media fragments are not standalone downloads.
      if(!top.some(x=>x.type==='moov') || !top.some(x=>x.type==='mdat' && x.end>x.data))return null;
      return {ext:'mp4',mime:'video/mp4',mediaKind:'video'};
    } catch (_) {return null;}
  }
  function webmMedia(b) {
    let budget=4096,encrypted=false;
    function vint(p,asId=false) {
      if(p>=b.length || !b[p])throw Error('vint');
      let n=1,mask=128;while(!(b[p]&mask)){n++;mask>>=1;}
      if(n>(asId?4:8) || p+n>b.length)throw Error('vint length');
      let value=asId?b[p]:b[p]&(mask-1),unknown=!asId && value===mask-1;
      for(let i=1;i<n;i++){value=value*256+b[p+i];unknown=unknown && b[p+i]===255;}
      if(!unknown && !Number.isSafeInteger(value))throw Error('vint range');
      return {value,n,unknown};
    }
    function elements(start,end,depth=0) {
      if(depth>16)throw Error('depth');const list=[];
      for(let p=start;p<end;){
        if(--budget<0)throw Error('budget');
        const id=vint(p,true),size=vint(p+id.n),data=p+id.n+size.n;
        if(size.unknown && ![0x18538067,0x1f43b675].includes(id.value))throw Error('unknown size');
        const limit=size.unknown?end:data+size.value;
        if(data>end || limit>end)throw Error('element size');
        list.push({id:id.value,data,end:limit});
        if([0x6d80,0x5035].includes(id.value))encrypted=true; // ContentEncodings / ContentEncryption
        if([0x18538067,0x1654ae6b,0xae,0x6d80,0x6240].includes(id.value))elements(data,limit,depth+1);
        p=limit;
      }
      return list;
    }
    try {
      const top=elements(0,b.length),header=top[0];
      if(header?.id!==0x1a45dfa3)return null;
      const doc=elements(header.data,header.end).find(x=>x.id===0x4282);
      if(!doc || String.fromCharCode(...b.subarray(doc.data,doc.end))!=='webm')return null;
      const segment=top.find(x=>x.id===0x18538067);if(!segment)return null;
      const children=elements(segment.data,segment.end);
      if(encrypted)return {ext:null,mime:'video/webm',reason:'encrypted-media'};
      if(!children.some(x=>x.id===0x1654ae6b) || !children.some(x=>x.id===0x1f43b675 && x.end>x.data))return null;
      return {ext:'webm',mime:'video/webm',mediaKind:'video'};
    } catch (_) {return null;}
  }
  function signature(bytes) {
    const b=bytes, s=(start,count)=>String.fromCharCode(...b.subarray(start,start+count));
    if (b.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)) return {ext:'png',mime:'image/png'};
    if (b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255) return {ext:'jpg',mime:'image/jpeg'};
    if (b.length>=6 && ['GIF87a','GIF89a'].includes(s(0,6))) return {ext:'gif',mime:'image/gif'};
    if (b.length>=12 && s(0,4)==='RIFF' && s(8,4)==='WEBP') return {ext:'webp',mime:'image/webp'};
    if (b.length>=8 && ['ftyp','free','skip','wide'].includes(s(4,4)))return isoMedia(b) || {ext:null,mime:'unknown'};
    if (b.length>=4 && [26,69,223,163].every((v,i)=>b[i]===v))return webmMedia(b) || {ext:null,mime:'unknown'};
    return {ext:null,mime:'unknown'};
  }
  function inspect(bytes, mime, url) {
    const detected=signature(bytes), declared=String(mime || '').split(';')[0].trim().toLowerCase();
    if (!detected.ext) throw error('UNSUPPORTED_MEDIA',detected.reason==='encrypted-media'?'암호화된 미디어는 지원하지 않습니다.':'지원하는 미디어 파일 구조가 아닙니다 ('+detected.mime+').');
    if (declared==='text/html' || declared==='application/xhtml+xml') throw error('UNSUPPORTED_MEDIA','서버가 미디어 대신 HTML을 반환했습니다.');
    if (streamMedia(url,declared))throw error('UNSUPPORTED_MEDIA','스트리밍 목록이나 분할 파일은 지원하지 않습니다.');
    const urlExt=new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
    const normal=x=>x==='jpeg'?'jpg':x;
    const mismatches=[];
    if (normal(urlExt)!==detected.ext)mismatches.push('url-extension');
    if (declared!==detected.mime)mismatches.push('response-mime');
    return {...detected,mediaKind:detected.mediaKind || 'image',responseMimeType:declared,urlExtension:urlExt,mismatches};
  }
  function actualName(path) {return String(path || '').replace(/\\/g,'/').split('/').pop();}
  function localManifest(job) {
    return {schemaVersion:1,kind:'aru-local-body-download',source:job.source,runId:job.id,createdAt:job.createdAt,finishedAt:job.finishedAt || null,
      status:job.status,requestedFolder:job.folder,bodySelector:job.bodySelector,counts:job.counts,unsupported:job.unsupported,
      images:job.images.map(x=>({...x,filename:x.status==='complete'?actualName(x.actualPath):null})),
      notice:'로컬 저장 기록입니다. 공개 메타데이터나 재배포 허가가 아닙니다.'};
  }
  Object.assign(D,{HOSTS,JOB_KEY,error,article,mediaUrl,safeName,folder,originalFilename,numbered,streamMedia,signature,inspect,actualName,localManifest});
})(globalThis);


/* source: shared/body-download/extractor.js */
(function (root) {
  'use strict';
  const D=root.AruBodyDownload;
  // Same articleBody selectors as Phase 1 SiteAdapter. Never fall back to document/body.
  function body(doc) {
    let nodes=[...doc.querySelectorAll('.view_content[itemprop="articleBody"]')], selector='.view_content[itemprop="articleBody"]';
    if (!nodes.length) {nodes=[...doc.querySelectorAll('.view_content article')];selector='.view_content article';}
    if (nodes.length!==1) throw D.error('BODY_NOT_FOUND','게시글 본문을 한 곳으로 식별할 수 없습니다. 페이지 전체는 수집하지 않습니다.');
    return {element:nodes[0],selector};
  }
  function extract(doc, pageUrl) {
    const source=D.article(pageUrl), {element,selector}=body(doc);
    source.title=doc.querySelector('.subject_text[itemprop="headline"], .subject_text')?.textContent?.trim() || '게시글 '+source.articleId;
    source.title=source.title.slice(0,500);
    const images=[], unsupported=[], byUrl=new Map(), representations=[];
    const nodes=[...element.querySelectorAll('img, a[href], video, source[src]')];
    if (nodes.length>5000) throw D.error('RESOURCE_LIMIT','본문 미디어가 5,000개를 넘습니다.');
    const excluded=n=>n.closest('[data-aru-icons-entry],[data-aru-icons-picker],[data-aru-body-download],.comment,.comment_view,.comment_wrapper,.comment_icon,.select_icon_box,.ad,.advertisement,[data-ad]');
    const originalByStem=new Map();
    for(const link of element.querySelectorAll('a.img_load[href]')){
      if(excluded(link))continue;
      try{const original=new URL(D.mediaUrl(link.getAttribute('href'),pageUrl));
        if(/\.(?:webp|png|jpe?g|gif|avif)$/i.test(original.pathname))originalByStem.set(original.origin+original.pathname.replace(/\.[^.\/]+$/,''),original.href);
      }catch(_){}
    }
    let position=0;
    for (const node of nodes) {
      if (excluded(node))continue;
      const tag=node.tagName.toUpperCase();
      let candidates=[], alternatives=[];
      if(tag==='SOURCE' && node.closest('video'))continue; // handled once with its owning video
      if (tag==='A') {
        const raw=node.getAttribute('href'),type=node.getAttribute('type') || '';
        // Ordinary article/navigation links are not download candidates.
        if(!node.matches('a.img_load') && !/\.(?:png|jpe?g|gif|webp|avif|mp4|webm|m3u8|mpd|m4s|ts)(?:[?#]|$)/i.test(raw) && !/^video\/(?:mp4|webm)(?:;|$)/i.test(type))continue;
        candidates.push({value:raw,attribute:'href',type});
      }
      if (tag==='IMG') {
        // Prefer only explicit observed original links, never synthesize a webp from an mp4.
        const link=node.closest('a.img_load[href]');
        if (link)continue;
        let raw=node.getAttribute('src') || '',attribute='src';
        const lazy=node.getAttribute('data-src');
        if ((!raw || /^(?:data:|about:blank)/i.test(raw)) && lazy) {raw=lazy;attribute='data-src';}
        if (!raw) {
          const srcset=node.getAttribute('srcset') || '';
          const parts=srcset.split(',').map(x=>x.trim()).filter(Boolean);
          if (parts.length===1) {raw=parts[0].split(/\s+/)[0];attribute='srcset';}
          else if (parts.length>1) {unsupported.push({position:++position,reason:'ambiguous-srcset',srcset:srcset.slice(0,2048)});continue;}
        }
        for (const attr of ['src','data-src','srcset'])if(node.getAttribute(attr))alternatives.push({attribute:attr,value:node.getAttribute(attr).slice(0,2048)});
        candidates.push({value:raw,attribute});
      }
      if (tag==='VIDEO') {
        if(node.mediaKeys || node.getAttribute('data-drm')==='true' || node.getAttribute('data-encrypted')==='true'){
          unsupported.push({position:++position,reason:'encrypted-media'});continue;
        }
        // A selected blob/MSE or playlist is outside scope: do not substitute a source.
        if(node.currentSrc && (/^blob:/i.test(node.currentSrc) || D.streamMedia(node.currentSrc))){
          unsupported.push({position:++position,reason:'streaming-media',url:String(node.currentSrc).slice(0,2048)});continue;
        }
        if(node.currentSrc)candidates.push({value:node.currentSrc,attribute:'video-currentSrc'});
        if(node.getAttribute('src'))candidates.push({value:node.getAttribute('src'),attribute:'video-src'});
        if(node.src)candidates.push({value:node.src,attribute:'video.src'});
        for(const child of node.querySelectorAll('source[src]'))if(!excluded(child)){
          candidates.push({value:child.getAttribute('src'),attribute:'source-src',type:child.getAttribute('type') || ''});
          if(child.src)candidates.push({value:child.src,attribute:'source.src',type:child.getAttribute('type') || ''});
        }
        if(!candidates.length)candidates.push({value:'',attribute:'video-src'});
      }
      if(tag==='SOURCE'){
        candidates.push({value:node.getAttribute('src'),attribute:'source-src',type:node.getAttribute('type') || ''});
        if(node.src)candidates.push({value:node.src,attribute:'source.src',type:node.getAttribute('type') || ''});
      }
      // An explicit stream type must still win when currentSrc/src already named the URL.
      const streams=new Set();for(const candidate of candidates)try{
        const url=D.mediaUrl(candidate.value,pageUrl);if(D.streamMedia(url,candidate.type))streams.add(url);
      }catch(_){}
      const local=new Map();
      for(const candidate of candidates){
        let url;try {url=D.mediaUrl(candidate.value,pageUrl);}catch(err){
          const key=String(candidate.value);if(local.has(key))continue;local.set(key,null);
          unsupported.push({position:++position,reason:err.code,url:key.slice(0,2048)});continue;
        }
        if(local.has(url)){const item=local.get(url);if(item)item.alternatives.push({attribute:candidate.attribute,value:url});continue;}
        ++position;local.set(url,null);
        if(streams.has(url) || /\.(?:mov|svg)$/i.test(new URL(url).pathname)){
          unsupported.push({position,url,reason:streams.has(url)?'streaming-media':'unsupported-media',attribute:candidate.attribute});continue;
        }
        if(byUrl.has(url)){const item=byUrl.get(url);item.positions.push(position);local.set(url,item);continue;}
        const item={index:images.length+1,originalUrl:url,originalFilename:D.originalFilename(url),positions:[position],attribute:candidate.attribute,
          alternatives:alternatives.slice(),status:'pending',attempts:0};
        byUrl.set(url,item);local.set(url,item);images.push(item);
        if(tag==='VIDEO' || tag==='SOURCE'){
          const preview=new URL(url),originalUrl=originalByStem.get(preview.origin+preview.pathname.replace(/\.[^.\/]+$/,''));
          if(originalUrl && originalUrl!==url)representations.push({originalUrl,displayUrl:url,role:'site-animation-preview'});
        }
      }
    }
    for(const preview of representations)byUrl.get(preview.originalUrl)?.alternatives.push({attribute:'video-src',value:preview.displayUrl,role:preview.role});
    return {source,bodySelector:selector,images,unsupported,counts:{bodyMedia:position,unique:images.length,duplicates:images.reduce((sum,x)=>sum+x.positions.length-1,0),unsupported:unsupported.length,animationPreviews:representations.length},capturedAt:new Date().toISOString()};
  }
  Object.assign(D,{findBody:body,extract});
})(globalThis);


/* source: shared/body-download/browser-api.js */
(function(root){
  'use strict';
  const D=root.AruBodyDownload, promise=!!root.browser?.runtime, api=promise?root.browser:root.chrome;
  function call(target, method, ...args) {
    if(!target || typeof target[method]!=='function')return Promise.reject(D.error('API_UNAVAILABLE','브라우저 기능을 사용할 수 없습니다: '+method));
    if(promise) {try{return Promise.resolve(target[method](...args));}catch(err){return Promise.reject(err);}}
    return new Promise((resolve,reject)=>{try{target[method](...args,value=>{const err=api.runtime.lastError;if(err)reject(D.error('BROWSER_API',err.message));else resolve(value);});}catch(err){reject(err);}});
  }
  async function options(){const value=await call(api.storage.sync,'get',['enabled','aruBodyDownloadOptions']);return (value.enabled===undefined || value.enabled===true) && value.aruBodyDownloadOptions?.enabled===true;}
  async function readJob(id){const stored=await call(api.storage.local,'get',[D.JOB_KEY,'aruBodyDownloadErrorV1']);const current=stored[D.JOB_KEY] || null;return id && current?.id!==id?stored.aruBodyDownloadErrorV1 || null:current;}
  async function writeJob(job){await call(api.storage.local,'set',{[D.JOB_KEY]:job});}
  function own(item){const base=api?.runtime?.getURL?.('');return !!base && typeof item.url==='string' && item.url.startsWith('blob:'+base);}
  Object.assign(D,{api,call,options,readJob,writeJob,ownsDownload:own});
})(globalThis);


/* source: shared/body-download/content.js */
(function(root){
  'use strict';
  const D=root.AruBodyDownload;
  if(!D.api?.runtime?.onMessage)return;
  D.api.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type!=='aru-body-download:collect')return;
    (async()=>{
      if(sender.id!==D.api.runtime.id)throw D.error('SENDER','확장 내부 요청만 허용합니다.');
      if(!await D.options())throw D.error('DISABLED','전체 확장과 게시글 다운로드 옵션을 켜 주세요.');
      const current=D.article(root.location.href);
      if(current.url!==message.url)throw D.error('NAVIGATED','게시글이 변경되었습니다. 다시 실행해 주세요.');
      return D.extract(root.document,root.location.href);
    })().then(result=>reply({ok:true,result}),err=>reply({ok:false,error:{code:err.code || 'COLLECT',message:err.message}}));
    return true;
  });
})(globalThis);

