// 본문 범위·정확한 URL·태그 원문을 보존하며 사이트 I/O 환경을 명시적으로 주입한다.
import * as AttributeTags from '../../../shared/icon-metadata/tag-codec.mjs';
import { createMetadata } from './metadata.mjs';
export function createSiteAdapter({ environment: global = globalThis, metadata = createMetadata({ environment: global }).Metadata, attributeTags = AttributeTags, isSafeMediaUrl } = {}) {
  const { DOMParser, AbortController, TextDecoder, TextEncoder } = global;
  const number = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const stopped = () => Object.assign(new Error('수집을 중지했습니다.'), {code:'ABORTED'});
  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(stopped());
      const done = () => { signal?.removeEventListener('abort', cancel); resolve(); };
      const timer = setTimeout(done, ms);
      const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(stopped()); };
      signal?.addEventListener('abort', cancel, {once:true});
    });
  }
  function selectionId(element) {
    const text = element?.getAttribute?.('onclick') || '';
    const match = text.match(/^\s*(?:window\.)?app\.icon_data_show\(\s*this\s*,\s*(\d+)\s*\)\s*;?\s*$/);
    return match ? number(match[1]) : null;
  }
  function moreInfo(button) {
    const match = (button?.getAttribute?.('onclick') || '').match(/^\s*(?:window\.)?app\.icon_data_load_more\(\s*this\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*;?\s*$/);
    return match ? {articleId:number(match[1]), offset:Number(match[2])} : null;
  }
  function safeMedia(url) {
    if (metadata?.mediaUrl) {try {metadata.mediaUrl(url);return true;}catch (_) {return false;}}
    if (isSafeMediaUrl) return isSafeMediaUrl(url);
    try { const u = new URL(url); return u.protocol==='https:' && ['i1.ruliweb.com','i2.ruliweb.com','i3.ruliweb.com'].includes(u.hostname) && !u.username && !u.password && !u.port && !u.hash && !/[\u0000-\u0020\u007f\\]/.test(url); } catch (_) {return false;}
  }
  function snapshot(panel, articleId) {
    const detail = panel.querySelector('.icon_share_data');
    const box = detail?.querySelector('.select_icon_box');
    const media = box ? [...box.querySelectorAll('img.select_icon, video.select_icon')] : [];
    const icons = [], seen = new Set();
    for (let ordinal=0; ordinal<media.length; ordinal++) {
      const node=media[ordinal], url=node.getAttribute('src') || node.querySelector('source')?.getAttribute('src');
      if (!safeMedia(url) || seen.has(url)) continue;
      seen.add(url);
      icons.push({url, ordinal, node, mediaKind:node.tagName==='VIDEO'?'video':node.getAttribute('data-gifct')==='yes'?'animated':'image', format: new URL(url).pathname.split('.').pop()});
    }
    const button=detail?.querySelector('.btn_icon_load_more');
    const next=moreInfo(button);
    const text=detail?.textContent || '';
    const totalMatch=text.match(/총\s*([\d,]+)\s*개/);
    const declaredTotal=totalMatch ? Number(totalMatch[1].replace(/,/g,'')) : null;
    const loadedText=detail?.querySelector('.loaded_icon_cnt')?.textContent || '';
    const loadedCount=Number(loadedText.replace(/[^\d]/g,'')) || media.length;
    const visible=panel.isConnected && !panel.hidden && panel.style.display!=='none' && detail?.style.display!=='none';
    const done=/모든 아이콘을 불러왔습니다/.test(text) || (!button && declaredTotal!==null && media.length>=declaredTotal);
    return {icons, rawCount:media.length, loadedCount, declaredTotal, button, offset:next?.offset ?? null,
      articleId:next?.articleId || articleId, visible:!!visible, ready:!!box,
      loading:!!button && (/불러오는 중/.test(button.textContent) || button.disabled || button.getAttribute('aria-busy')==='true'),
      error:!!button && /불러오기 실패/.test(button.textContent), done};
  }
  class NativeLoadSession {
    constructor(options) {
      this.options={intervalMs:300,pollMs:100,timeoutMs:10000,maxRequests:256,maxIcons:10000,isCurrent:()=>true,...options};
      this.running=false;
    }
    async run(signal) {
      if (this.running) throw new Error('이미 수집 중입니다.');
      this.running=true;
      let count=0, lastOffset=-1;
      const read=()=>this.options.read();
      const report=(s,status,message)=>this.options.onProgress?.({...s,status,phase:'native',processed:s.rawCount,loaded:s.rawCount,total:s.declaredTotal,uniqueCount:s.icons.length,requests:count,message,busy:status==='loading'});
      try {
        let s=read();
        if (!s.ready) throw Object.assign(new Error('정상 아이콘 목록을 찾을 수 없습니다. 원래 선택기를 다시 열어 주세요.'),{code:'NATIVE_UNAVAILABLE'});
        while (true) {
          if (signal?.aborted) throw stopped();
          if (!s.visible || !this.options.isCurrent?.()) throw stopped();
          if (s.articleId!==this.options.articleId) throw stopped();
          report(s,'loading','정상 사이트 버튼으로 순차 수집 중');
          if (s.done) { report(s,'complete','사이트가 전체 로딩 완료를 표시했습니다.');return {...s,status:'complete',requests:count}; }
          if (!s.button || s.offset===null) { report(s,'partial','완료를 확인할 수 없습니다. 원래 선택기에서 제공 범위를 확인해 주세요.');return {...s,status:'partial',requests:count}; }
          if (s.rawCount>=this.options.maxIcons || count>=this.options.maxRequests) {report(s,'partial','수집 자원 상한입니다. 재시도로 이어서 수집할 수 있습니다.');return {...s,status:'partial',requests:count};}
          if (s.offset<=lastOffset) throw Object.assign(new Error('다음 로딩 위치가 증가하지 않아 중지했습니다.'),{code:'OFFSET_STALLED'});
          if (s.error) throw Object.assign(new Error('사이트가 아이콘 로딩 실패를 표시했습니다. 재시도를 눌러 주세요.'),{code:'NATIVE_ERROR'});
          const start=Date.now();
          if (s.loading) {
            do {await delay(this.options.pollMs,signal);s=read();if(!s.visible||!this.options.isCurrent?.()||s.articleId!==this.options.articleId)throw stopped();}
            while(s.loading && Date.now()-start<this.options.timeoutMs);
            if(s.loading)throw Object.assign(new Error('기존 사이트 요청이 끝나지 않아 중지했습니다.'),{code:'TIMEOUT'});
            continue;
          }
          await delay(this.options.intervalMs,signal);
          if (!this.options.isCurrent?.() || signal?.aborted) throw stopped();
          const fresh=read();
          if(!fresh.visible||fresh.articleId!==this.options.articleId)throw stopped();
          if(fresh.loading||fresh.button!==s.button||fresh.offset!==s.offset||fresh.rawCount!==s.rawCount||fresh.done){s=fresh;continue;}
          const before=s;lastOffset=s.offset;count++;
          this.options.click(s.button);
          const deadline=Date.now()+this.options.timeoutMs;
          while(true) {
            await delay(this.options.pollMs,signal);s=read();
            if(!s.visible||!this.options.isCurrent?.()||s.articleId!==this.options.articleId)throw stopped();
            if(s.error)throw Object.assign(new Error('사이트 아이콘 로딩이 실패했습니다.'),{code:'NATIVE_ERROR'});
            if(!s.loading && (s.done || s.rawCount>before.rawCount || s.offset!==before.offset))break;
            if(Date.now()>=deadline)throw Object.assign(new Error('10초 동안 새 아이콘이 도착하지 않아 중지했습니다. 자동 재요청은 하지 않습니다.'),{code:'TIMEOUT'});
          }
          if(!s.done && s.rawCount<=before.rawCount)throw Object.assign(new Error('목록 증가가 없어 수집을 중지했습니다.'),{code:'NO_PROGRESS'});
        }
      } catch (error) {
        const s=read();report(s,error.code==='ABORTED'?'stopped':'error',error.message);throw error;
      } finally {this.running=false;}
    }
  }
  function imageAttributes(node) {
    if(!['IMG','VIDEO'].includes(node?.tagName?.toUpperCase()))return {metadataId:null,tags:[],tagError:null};
    const metadataId=node.getAttribute('data-aru-id'),raw=node.getAttribute('data-aru-tags');
    const id=typeof metadataId==='string' && metadataId.length<=512?metadataId:null;
    if(raw==null || raw==='')return {metadataId:id,tags:[],tagError:null};
    try {
      if(!attributeTags)throw Object.assign(new Error('Tag codec unavailable'),{code:'TAGS_CODEC_UNAVAILABLE'});
      return {metadataId:id,tags:attributeTags.decode(raw),tagError:null};
    } catch(error) {return {metadataId:id,tags:[],tagError:error.code||'TAGS_INVALID'};}
  }
  function normalPack(s, articleId, title) {
    const sourceId='article:'+articleId;
    return {id:'normal:'+articleId,kind:'NORMAL',name:title||'아이콘 글 '+articleId,mainArticleId:articleId,
      categories:[],tags:[],sources:[{sourceId,articleId,title:title||'글 '+articleId}],
      attributeReaderVersion:2,
      icons:s.icons.map(item=>{
        const attributes=item.attributes || imageAttributes(item.node);
        return {id:'normal:'+articleId+':'+item.url,name:'아이콘 '+(item.ordinal+1),url:item.url,
          variants:[{role:'selection',url:item.url,articleId}],keywords:[...attributes.tags],categoryIds:[],tagIds:[],sourceId,
          imageMetadata:{id:attributes.metadataId,tags:[...attributes.tags]},
          mediaKind:item.mediaKind,format:item.format,origin:{sourceId,articleId,originalIndex:item.ordinal}};
      })};
  }
  function findArticleBody(doc) {
    let nodes=[...doc.querySelectorAll('.view_content[itemprop="articleBody"]')],selector='.view_content[itemprop="articleBody"]';
    if(!nodes.length){nodes=[...doc.querySelectorAll('.view_content article')];selector='.view_content article';}
    if(nodes.length!==1)throw Object.assign(new Error('게시글 본문을 한 곳으로 식별할 수 없습니다. 페이지 전체는 수집하지 않습니다.'),{code:'BODY_NOT_FOUND'});
    return {element:nodes[0],selector};
  }
  function readArticlePack(doc, articleId, title, boardId='98', options={}) {
    const {element,selector}=findArticleBody(doc),base=readPath(articleId,'https://bbs.ruliweb.com',boardId);
    const nodes=[...element.querySelectorAll('img,video,source[src],a[href]')];
    if(nodes.length>5000)throw Object.assign(new Error('본문 미디어 탐색 상한 5,000개를 넘었습니다.'),{code:'RESOURCE_LIMIT'});
    const media=nodes.filter(node=>['IMG','VIDEO'].includes(node.tagName.toUpperCase())),images=media.filter(node=>node.tagName.toUpperCase()==='IMG');
    const attributesByImage=new WeakMap(),positions=new WeakMap(),imagePositions=new WeakMap();
    images.forEach((node,index)=>imagePositions.set(node,index+1));
    const metadataCounts={images:images.length,videos:media.length-images.length,media:media.length,
      ids:0,tagAttributes:0,decoded:0,decodeFailed:0,taggedImages:0,mediaIds:0,mediaTagAttributes:0,mediaDecoded:0,mediaDecodeFailed:0,taggedMedia:0};
    media.forEach((node,index)=>{
      positions.set(node,index+1);
      const attrs=imageAttributes(node);attributesByImage.set(node,attrs);
      if(node.getAttribute('data-aru-id')!=null)metadataCounts.mediaIds++;
      if(node.getAttribute('data-aru-tags')!=null){
        metadataCounts.mediaTagAttributes++;
        if(attrs.tagError)metadataCounts.mediaDecodeFailed++;else metadataCounts.mediaDecoded++;
      }
      if(attrs.tags.length)metadataCounts.taggedMedia++;
      if(node.tagName.toUpperCase()==='IMG'){
        if(node.getAttribute('data-aru-id')!=null)metadataCounts.ids++;
        if(node.getAttribute('data-aru-tags')!=null){metadataCounts.tagAttributes++;if(attrs.tagError)metadataCounts.decodeFailed++;else metadataCounts.decoded++;}
        if(attrs.tags.length)metadataCounts.taggedImages++;
      }
    });
    const counts={domNodes:nodes.length,bodyImages:images.length,bodyVideos:element.querySelectorAll('video').length,
      candidates:0,excluded:0,duplicates:0,wrappedImages:0,ignoredLinks:0,finalIcons:0,reasons:{},
      metadataImages:0,taggedIcons:0,tagErrors:0,tagErrorCodes:{},metadata:metadataCounts};
    const icons=[],seen=new Set(),imageAttributesByUrl=[],recordedOwners=new WeakMap();
    const deliveredOwners=new Map();
    const exclude=reason=>{counts.excluded++;counts.reasons[reason]=(counts.reasons[reason]||0)+1;};
    const scoped=n=>n.closest('[data-aru-icons-entry],[data-aru-icons-picker],[data-aru-body-download],.comment,.comment_view,.comment_wrapper,.comment_icon,.select_icon_box,.ad,.advertisement,[data-ad],.profile_image,.user_profile,.sidebar,.right_best,aside');
    const stream=(url,type='')=>/\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(url).pathname) || ['application/vnd.apple.mpegurl','application/x-mpegurl','audio/mpegurl','audio/x-mpegurl','application/dash+xml','video/mp2t'].includes(type.split(';')[0].trim().toLowerCase());
    const normalize=raw=>{
      if(typeof raw!=='string' || !raw || raw.length>2048 || /[\u0000-\u0020\u007f\\]/.test(raw))return null;
      try{const url=new URL(raw,base).href;return safeMedia(url)?url:null;}catch(_){return null;}
    };
    for(const node of nodes){
      const tag=node.tagName.toUpperCase();
      if(scoped(node)){counts.candidates++;exclude('outside-content');continue;}
      if(tag==='SOURCE' && node.closest('video'))continue;
      if(tag==='IMG' && node.closest('a.img_load[href]')){counts.wrappedImages++;continue;}
      const candidates=[];
      let owner=tag==='IMG'||tag==='VIDEO'?node:null;
      if(tag==='A'){
        const raw=node.getAttribute('href') || '',type=node.getAttribute('type') || '';
        if(!node.matches('a.img_load') && !/\.(?:png|jpe?g|gif|webp|avif|mp4|webm|m3u8|mpd|m4s|ts)(?:[?#]|$)/i.test(raw) && !/^video\/(?:mp4|webm)(?:;|$)/i.test(type)){counts.ignoredLinks++;continue;}
        candidates.push({raw,type});
        const children=[...(node.querySelectorAll?.('img')||[])];
        if(children.length===1)owner=children[0];
      }
      if(tag==='IMG'){
        let raw=node.getAttribute('src') || '';
        if((!raw || /^(?:data:|about:blank)/i.test(raw)) && node.getAttribute('data-src'))raw=node.getAttribute('data-src');
        if(!raw){const parts=(node.getAttribute('srcset') || '').split(',').map(x=>x.trim()).filter(Boolean);
          if(parts.length===1)raw=parts[0].split(/\s+/)[0];
          else if(parts.length>1){counts.candidates++;exclude('ambiguous-srcset');continue;}
        }
        candidates.push({raw});
      }
      if(tag==='VIDEO'){
        if(node.mediaKeys || node.getAttribute('data-drm')==='true' || node.getAttribute('data-encrypted')==='true'){counts.candidates++;exclude('encrypted-media');continue;}
        if(node.currentSrc && (/^blob:/i.test(node.currentSrc) || stream(node.currentSrc))){counts.candidates++;exclude('streaming-media');continue;}
        for(const raw of [node.currentSrc,node.getAttribute('src'),node.src])if(raw)candidates.push({raw});
        for(const child of node.querySelectorAll('source[src]'))if(!scoped(child))for(const raw of [child.getAttribute('src'),child.src])if(raw)candidates.push({raw,type:child.getAttribute('type') || ''});
        if(!candidates.length)candidates.push({raw:''});
      }
      if(tag==='SOURCE')for(const raw of [node.getAttribute('src'),node.src])if(raw)candidates.push({raw,type:node.getAttribute('type') || ''});
      const normalized=candidates.map(c=>({...c,url:normalize(c.raw)})),streams=new Set(normalized.filter(c=>c.url && stream(c.url,c.type)).map(c=>c.url)),local=new Set();
      for(const candidate of normalized){
        const key=candidate.url || candidate.raw;if(local.has(key))continue;local.add(key);counts.candidates++;
        const url=candidate.url;if(!url){exclude('unsafe-url');continue;}
        const format=new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
        if(streams.has(url)){exclude('streaming-media');continue;}
        if(['svg','mov','mp3','ogg'].includes(format)){exclude('unsupported-format');continue;}
        const attributes=attributesByImage.get(owner) || imageAttributes(owner);
        let ownerUrls=owner && recordedOwners.get(owner);
        if(owner && !ownerUrls?.has(url)){
          if(!ownerUrls){ownerUrls=new Set();recordedOwners.set(owner,ownerUrls);}ownerUrls.add(url);
          imageAttributesByUrl.push({url,...attributes,imageIndex:imagePositions.get(owner),mediaIndex:positions.get(owner)});
          if(owner.getAttribute('data-aru-id')!=null || owner.getAttribute('data-aru-tags')!=null)counts.metadataImages++;
          if(attributes.tagError){counts.tagErrors++;counts.tagErrorCodes[attributes.tagError]=(counts.tagErrorCodes[attributes.tagError]||0)+1;}
        }
        if(seen.has(url)){counts.duplicates++;continue;}seen.add(url);
        if(owner)deliveredOwners.set(url,owner);
        const video=['mp4','webm'].includes(format) || tag==='VIDEO' || tag==='SOURCE' || /^video\//i.test(candidate.type || '');
        if(attributes.tags.length)counts.taggedIcons++;
        icons.push({url,ordinal:counts.candidates-1,mediaKind:video?'video':format==='gif'?'animated':'image',format,attributes});
      }
    }
    counts.finalIcons=icons.length;
    const name=doc.querySelector('.subject_text[itemprop="headline"],.subject_text')?.textContent?.trim().slice(0,120) || title;
    const pack=normalPack({icons},articleId,name);
    pack.collectionMode='article-body-v1';pack.boardId=String(boardId);pack.articleUrl=base;pack.bodySelector=selector;pack.bodyCounts=counts;
    if(String(boardId)!=='98') {pack.id='normal:'+boardId+':'+articleId;pack.sources[0].sourceId='article:'+boardId+':'+articleId;
      for(const icon of pack.icons){icon.id='normal:'+boardId+':'+articleId+':'+icon.url;icon.sourceId=pack.sources[0].sourceId;icon.origin.sourceId=icon.sourceId;}}
    for(const source of pack.sources){source.boardId=String(boardId);source.articleUrl=base;}
    for(const icon of pack.icons)icon.variants[0].role='body';
    let metadataDiagnostics=null;
    if(options.diagnostics===true){
      const recordsByImage=new Map(),iconsByUrl=new Map(pack.icons.map(icon=>[icon.url,icon]));
      for(const record of imageAttributesByUrl){
        if(!recordsByImage.has(record.mediaIndex))recordsByImage.set(record.mediaIndex,[]);
        recordsByImage.get(record.mediaIndex).push(record);
      }
      metadataDiagnostics={...metadataCounts,mediaDetail:media.map((image,index)=>{
        const attrs=attributesByImage.get(image),records=recordsByImage.get(index+1)||[];
        const delivered=records.find(record=>deliveredOwners.get(record.url)===image);
        const icon=delivered && iconsByUrl.get(delivered.url);
        const wrapper=image.closest('a.img_load[href]');
        const reason=icon?(attrs.tagError?'decode-failed':image.getAttribute('data-aru-tags')==null?'tag-attribute-missing':attrs.tags.length?'mapped':'empty-tags'):
          scoped(image)?'outside-content':records.length?'duplicate-url':wrapper && wrapper.querySelectorAll('img').length!==1?'ambiguous-wrapper-owner':'no-collected-url';
        return {position:index+1,imageIndex:imagePositions.get(image)||null,element:image.tagName.toUpperCase(),id:image.getAttribute('data-aru-id'),url:delivered?.url||records[0]?.url||normalize(wrapper?.getAttribute('href')||image.getAttribute('src')||image.getAttribute('data-src')),
          rawTags:image.getAttribute('data-aru-tags'),decodedTags:[...attrs.tags],decodeError:attrs.tagError,iconId:icon?.id||null,reason};
      })};
      metadataDiagnostics.imagesDetail=metadataDiagnostics.mediaDetail.filter(row=>row.element==='IMG');
    }
    return {pack,counts,selector,imageAttributesByUrl,metadataDiagnostics};
  }
  function readPath(articleId, origin=global.location?.origin, boardId='98') {
    const id=number(articleId);
    if(!id || !/^[1-9]\d{0,11}$/.test(String(boardId)) || !['https://bbs.ruliweb.com','https://m.ruliweb.com'].includes(origin))throw new Error('허용되지 않은 공개 글 경로입니다.');
    return origin+'/community/board/'+boardId+'/read/'+id;
  }
  async function getPublicDocument(articleId,{signal,origin=global.location?.origin,fetchFn=global.fetch,timeoutMs=10000,forceRead=false,boardId='98'}={}) {
    const url=readPath(articleId,origin,boardId);
    const current=global.document;
    if(!forceRead && global.location?.href?.split(/[?#]/)[0]===url && current?.querySelector('.view_content[itemprop="articleBody"],.view_content article'))return current;
    const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)controller.abort();
    const timer=setTimeout(abort,timeoutMs);
    try {
      const response=await fetchFn(url,{method:'GET',credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-cache',signal:controller.signal});
      if(response.redirected || (response.url && response.url!==url))throw Object.assign(new Error('공개 글이 다른 주소로 이동하여 읽기를 중지했습니다.'),{code:'READ_REDIRECT'});
      if(!response.ok)throw Object.assign(new Error('공개 글 '+articleId+' 조회 실패 (HTTP '+response.status+'). 접근 제한을 우회하지 않습니다.'),{code:[401,403,429].includes(response.status)?'ACCESS_DENIED':'READ_FAILED',articleId});
      const maxBytes=3*1024*1024;
      if(Number(response.headers?.get('content-length'))>maxBytes)throw new Error('공개 글 응답 크기 상한을 넘었습니다.');
      let html='';
      if(response.body?.getReader) {
        const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0;
        try {while(true){const r=await reader.read();if(controller.signal.aborted){await reader.cancel();throw stopped();}if(r.done)break;bytes+=r.value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('공개 글 응답 크기 상한을 넘었습니다.');}html+=decoder.decode(r.value,{stream:true});}html+=decoder.decode();}finally{reader.releaseLock();}
      } else {html=await response.text();if(new TextEncoder().encode(html).length>maxBytes)throw new Error('공개 글 응답 크기 상한을 넘었습니다.');}
      if(controller.signal.aborted)throw stopped();
      const doc=new DOMParser().parseFromString(html,'text/html');
      if(!doc.querySelector('.view_content[itemprop="articleBody"],.view_content article'))throw Object.assign(new Error('글 본문을 확인할 수 없습니다. 정상 탭에서 해당 글을 열어 주세요.'),{code:'READ_UNAVAILABLE'});
      return doc;
    } catch(error) {if(controller.signal.aborted)throw signal?.aborted?stopped():Object.assign(new Error('공개 글 조회 시간이 초과되어 중지했습니다.'),{code:'TIMEOUT'});throw error;}
    finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function verifyReferences(result,{signal,onProgress,readDocument=getPublicDocument,intervalMs=300}={}) {
    const slaves=result.v1Slaves||[];
    const states=[];let verified=0,processed=0;
    const iconsByReference=new Map(),repeatCounts=new Map(),readSources=new Map();
    for(const icon of result.pack.icons){const key=icon.ref?.page+':'+icon.origin?.articleId;
      if(!iconsByReference.has(key))iconsByReference.set(key,[]);iconsByReference.get(key).push(icon);}
    for(const slave of slaves)repeatCounts.set(slave.articleId,(repeatCounts.get(slave.articleId)||0)+1);
    const progress=(phase,message,status='loading')=>onProgress?.({status,phase,processed,total:result.pack.icons.length,loaded:result.pack.icons.length,
      verifiedCount:verified,declaredCount:result.pack.icons.length,referencesProcessed:states.length,referencesTotal:slaves.length,
      message,states:[...states],busy:status==='loading'});
    const check=()=>{if(signal?.aborted)throw stopped();};
    for(const slave of slaves) {
      check();progress('references','원본 글 '+slave.articleId+'을 확인하고 있어요.');
      if(!readSources.has(slave.articleId))await delay(intervalMs,signal);
      try {
        let observed=readSources.get(slave.articleId);
        if(!observed){
        const doc=await readDocument(slave.articleId,{signal});check();
        const body=doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
        if(!body)throw new Error('원본 본문 없음');
        progress('tags','원본 아이콘과 태그를 읽고 있어요.');
        let articleRead=null,attributeError=null;
        try{articleRead=readArticlePack(doc,slave.articleId,'','98');}catch(error){attributeError=error.code||'ATTRIBUTES_UNAVAILABLE';}
        const urls=new Set(articleRead?.pack.icons.map(icon=>icon.url)||[]);
        for(const node of body.querySelectorAll('img,video,video source,a[href]')){
          const raw=node.getAttribute('src')||node.getAttribute('data-src')||node.getAttribute('href');
          if(!raw)continue;try{const absolute=new URL(raw,readPath(slave.articleId,'https://bbs.ruliweb.com','98')).href;if(safeMedia(absolute))urls.add(absolute);}catch(_){/* 해석할 수 없는 URL은 검증된 참조로 취급하지 않는다. */}
        }
        const byUrl=new Map(),mediaByUrl=new Map((articleRead?.pack.icons||[]).map(icon=>[icon.url,icon]));
        for(const item of articleRead?.imageAttributesByUrl||[]){if(!byUrl.has(item.url))byUrl.set(item.url,[]);byUrl.get(item.url).push(item);}
        observed={doc,articleRead,attributeError,urls,byUrl,mediaByUrl};
        if(repeatCounts.get(slave.articleId)>1)readSources.set(slave.articleId,observed);
        }
        check();const {doc,articleRead,attributeError,urls,byUrl,mediaByUrl}=observed;
        const matched=slave.images.filter(url=>urls.has(url)).length;
        verified+=matched;processed+=slave.images.length;
        let tagged=0,ambiguous=0,tagErrors=0,metadataReadError=attributeError;
        try {
          const metadata=articleRead;
          tagErrors=metadata.counts.tagErrors;
          for(const icon of iconsByReference.get(slave.page+':'+slave.articleId)||[]){
            const entries=byUrl.get(icon.url)||[];
            if(entries.length>1){ambiguous++;continue;}
            const attrs=entries[0];if(!attrs)continue;
            icon.imageMetadata={id:attrs.metadataId,tags:[...attrs.tags]};
            icon.keywords=[...new Set([...(icon.keywords||[]),...attrs.tags])];
            const original=mediaByUrl.get(icon.url);
            if(original){icon.mediaKind=original.mediaKind;icon.format=original.format;}
            if(attrs.tags.length)tagged++;
          }
        } catch(error) {metadataReadError=error.code||'ATTRIBUTES_UNAVAILABLE';}
        const title=doc.querySelector('.subject_text,.subject,.view_content h1')?.textContent?.trim().slice(0,120)||'글 '+slave.articleId;
        const source=result.pack.sources.find(s=>s.articleId===slave.articleId);if(source)source.title=title;
        const missing=[];for(let index=0;index<slave.images.length;index++)if(!urls.has(slave.images[index])){
          if(missing.length===5)break;const url=new URL(slave.images[index]);missing.push({index,url:url.origin+url.pathname});}
        states.push({articleId:slave.articleId,page:slave.page,status:matched===slave.images.length?'verified':'url-unconfirmed',declared:slave.images.length,matched,
          tagged,ambiguousMetadata:ambiguous,tagErrors,metadataReadError,
          metadataStatus:metadataReadError||tagErrors||ambiguous?'partial':articleRead?.counts.metadata.mediaTagAttributes?'complete':'none',
          missingCount:slave.images.length-matched,missing});
      } catch(error) {
        if(error.code==='ABORTED'||signal?.aborted)throw stopped();
        states.push({articleId:slave.articleId,page:slave.page,status:'unavailable',message:error.message});
        if(error.code==='ACCESS_DENIED'||error.code==='TIMEOUT') {
          progress('references',error.message,'partial');
          return {states,verifiedCount:verified,processedCount:processed,status:'partial',stoppedByRestriction:true};
        }
      }
      progress('references','원본 '+states.length+'/'+slaves.length+'개를 확인했어요.');
    }
    const complete=states.every(x=>x.status==='verified'&&x.metadataStatus!=='partial');
    return {states,verifiedCount:verified,processedCount:processed,referencesProcessed:states.length,referencesTotal:slaves.length,status:complete?'complete':'partial'};
  }
  function prepareInsertion(icon, context) {
    const variants=icon.variants||icon.media?.variants||[];
    const url=variants.find(v=>v.role==='selection')?.url || icon.url;
    const nodes=context?.panel?.querySelectorAll?.('img.select_icon,video.select_icon')||[];
    const native=[...nodes].find(node=>(node.getAttribute('src')||node.querySelector('source')?.getAttribute('src'))===url);
    return {iconId:icon.id,url,available:!!native,context:context?.kind||'unknown',nativeElement:native||null,
      message:native?'네이티브 선택 항목을 확인했습니다. Phase 1은 선택 정보만 준비하며 삽입·등록은 실행하지 않습니다.':'원래 선택기에 대응 항목이 없습니다. 삽입 지원은 검증 대기입니다.'};
  }
  return { selectionId,moreInfo,snapshot,normalPack,imageAttributes,findArticleBody,readArticlePack,readPath,getPublicDocument,verifyReferences,prepareInsertion,NativeLoadSession,delay,safeMedia };
}
