// 본문으로 식별된 영역의 관측 URL만 수집하고 댓글·광고·스트리밍 자료를 제외한다.
import { createModuleScope, selectModuleExports } from '../runtime/module-scope.mjs';

export function createDownloadExtractor({ environment = globalThis, dependencies = {} } = {}) {
  const { URL, Date } = environment;
  const D = createModuleScope(dependencies.downloads, ['error','article','mediaUrl','streamMedia','originalFilename'], []);
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
  return { downloads: selectModuleExports(D, ['findBody','extract']) };
}
