// 동기 문자열 요청·응답과 작성기별 세션 수명주기를 유지한다.
import { createSiteAdapter } from './site-adapter.mjs';
export function createComposerAdapter({ environment: global = globalThis, site = createSiteAdapter({ environment: global }), getDesignSystem = () => null } = {}) {
  const { MutationObserver, AbortController, CustomEvent } = global;
  const requestAnimationFrame = callback => global.requestAnimationFrame(callback);
  const cancelAnimationFrame = frame => global.cancelAnimationFrame(frame);
  const REQUEST='aru-icons-composer-request-v1',RESPONSE='aru-icons-composer-response-v1';
  const token=()=>global.crypto.randomUUID().replaceAll('-','');
  function request(document,op,payload={}) {
    const requestId=token();
    return new Promise((resolve,reject)=>{
      let replied=false;
      const listener=event=>{
        if(event.target!==document || typeof event.detail!=='string')return;
        let reply;try{reply=JSON.parse(event.detail);}catch(_){return;}
        if(reply.requestId!==requestId)return;
        replied=true;document.removeEventListener(RESPONSE,listener);
        reply.ok?resolve(reply.result):reject(Object.assign(new Error(reply.error?.message||'작성기에 반영하지 못했습니다.'),{code:reply.error?.code}));
      };
      document.addEventListener(RESPONSE,listener);
      document.dispatchEvent(new CustomEvent(REQUEST,{detail:JSON.stringify({requestId,op,...payload})}));
      if(!replied){document.removeEventListener(RESPONSE,listener);reject(Object.assign(new Error('네이티브 연결 모듈 응답이 없습니다. 테스트 확장을 다시 로드하고 페이지를 새로 열어 주세요.'),{code:'BRIDGE_UNAVAILABLE'}));}
    });
  }
  function selectedMedia(icon) {
    const variants=icon.variants||icon.media?.variants||[];
    const v=variants.find(v=>v.role==='selection')||variants.find(v=>v.role==='original')||variants.find(v=>v.role==='body')||variants[0];
    const url=v?.url||icon.url;
    const format=v?.format||icon.media?.format||icon.format;
    const kind=v?.kind||icon.media?.kind||icon.mediaKind;
    return {url,format,kind:kind==='animated'?'image':kind==='unknown'?undefined:kind};
  }
  function nativeButton(wrapper) {
    return [...wrapper.querySelectorAll('button[onclick],span[onclick]')].find(node=>{
      const code=node.getAttribute('onclick')||'';
      return /app\.comment_icon(?:_toggle)?\(/.test(code) && !/['"](?:preset|pick)['"]/.test(code) &&
        node.closest('.common_write_wrapper')===wrapper && !node.closest('.comment_icon');
    });
  }
  function packChoices(panel) {
    const seen=new Set(),choices=[];
    for(const node of panel?.querySelectorAll('.icon_data_show_target[onclick]')||[]) {
      const articleId=site.selectionId(node);
      if(!articleId||seen.has(articleId))continue;seen.add(articleId);
      choices.push({articleId,title:node.getAttribute('title')||'글 '+articleId});
    }
    return choices;
  }
  function parseArticle(value) {
    const text=String(value||'').trim();
    let id=text;
    if(!/^[1-9]\d*$/.test(text)){
      let url;try{url=new URL(text);}catch(_){throw new Error('루리웹 아이콘 게시판의 글 URL 또는 번호를 입력해 주세요.');}
      if(url.protocol!=='https:' || !['bbs.ruliweb.com','m.ruliweb.com'].includes(url.hostname) || url.port || url.username || url.password || url.hash ||
         !/^\/community\/board\/98\/read\/([1-9]\d*)\/?$/.test(url.pathname))throw new Error('아이콘 게시판의 공개 읽기 URL만 사용할 수 있습니다.');
      id=url.pathname.match(/\/read\/([1-9]\d*)/)[1];
    }
    if(!Number.isSafeInteger(Number(id)) || Number(id)<1)throw new Error('글 번호가 올바르지 않습니다.');
    return Number(id);
  }
  class ComposerController {
    constructor({document=global.document,onOpen,onRemoved,debug=false}={}) {
      this.document=document;this.onOpen=onOpen;this.onRemoved=onRemoved;this.debug=debug;this.entries=new Map();this.frame=0;this.stopped=true;
    }
    start() {
      if(!this.stopped)return;this.stopped=false;this.scan();
      this.observer=new MutationObserver(records=>{
        if(this.stopped)return;
        const relevant=records.some(record=>{
          if(record.target.closest?.('[data-aru-icons-entry],[data-aru-icons-picker]'))return false;
          return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1 &&
            !node.matches('[data-aru-icons-entry],[data-aru-icons-picker]') &&
            (node.matches('.common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar')||
             node.querySelector('.common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar')));
        });
        if(relevant&&!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.stopped)this.scan();});
      });
      this.observer.observe(this.document.body,{childList:true,subtree:true});
    }
    scan() {
      for(const [root,entry] of this.entries)if(!root.isConnected || !entry.anchor.isConnected || !entry.host.isConnected) {
        entry.events.abort();entry.uiCleanup?.();entry.host.remove();root.removeAttribute('data-aru-composer-token');this.entries.delete(root);this.onRemoved?.(root);
      }
      for(const root of this.document.querySelectorAll('.common_write_wrapper')) {
        if(this.entries.has(root) || root.closest('#editor_v2'))continue;
        const inputs=[...root.querySelectorAll('textarea.comment_input,textarea.reply_input')].filter(n=>n.closest('.common_write_wrapper')===root);
        const anchor=nativeButton(root);if(inputs.length!==1||!anchor)continue;
        this.add(root,anchor,inputs[0].matches('.reply_input')?'reply':'comment');
      }
      for(const root of this.document.querySelectorAll('#editor_v2 .seditor')) {
        if(this.entries.has(root) || !root.querySelector('#ReactSummernoteLite'))continue;
        const camera=root.querySelector('.note-toolbar .icon-camera');
        const anchor=camera?.closest('button');if(anchor)this.add(root,anchor,'post');
      }
    }
    add(root,anchor,kind) {
      const id=token();root.dataset.aruComposerToken=id;
      const host=this.document.createElement('span');host.dataset.aruIconsEntry='true';
      const shadow=host.attachShadow({mode:'open'}),style=this.document.createElement('style'),button=this.document.createElement('button');
      style.textContent=':host{display:inline-block;vertical-align:middle;margin:0 4px}button{all:initial;box-sizing:border-box;display:inline-block;padding:5px 9px;border:1px solid #78609f;border-radius:6px;background:#f4effb;color:#463362;font:13px/1.4 system-ui;cursor:pointer;min-height:30px}button:focus-visible{outline:2px solid #7150b6}button:disabled{opacity:.5}';
      button.type='button';button.textContent='아이콘 선택';button.setAttribute('aria-label',kind==='post'?'아이콘 선택 · 게시글':kind==='reply'?'아이콘 선택 · 이 답글':'아이콘 선택 · 이 댓글');
      shadow.append(style,button);const uiCleanup=getDesignSystem()?.entry(shadow,{label:'아이콘 선택',tooltip:'아이콘 라이브러리에서 원하는 아이콘을 선택해 삽입합니다.',priority:'primary'});anchor.after(host);
      const events=new AbortController();const entry={root,anchor,kind,host,button,token:id,events,uiCleanup,pending:null};
      this.entries.set(root,entry);
      button.addEventListener('pointerdown',event=>{if(event.button===0)event.preventDefault();},{signal:events.signal});
      button.addEventListener('click',async()=>{
        if(entry.pending||this.stopped)return;
        button.disabled=true;button.setAttribute('aria-busy','true');
        const pending=request(this.document,'capture',{token:id,debug:this.debug});entry.pending=pending;
        try{
          const session=await pending;
          if(this.stopped||!root.isConnected||this.entries.get(root)!==entry){await request(this.document,'release',{session:session.session});return;}
          await this.onOpen({...entry,session});
        }catch(error){
          if(this.debug)global.console?.info?.('[Aru Icons Composer]',{stage:'capture',status:'failed',code:error.code||'CAPTURE_FAILED',kind,connected:root.isConnected});
          if(!this.stopped)await this.onOpen({...entry,error});
        }finally{entry.pending=null;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
      },{signal:events.signal});
    }
    stop() {
      this.stopped=true;this.observer?.disconnect();if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
      for(const [root,entry]of this.entries){entry.events.abort();entry.uiCleanup?.();entry.host.remove();root.removeAttribute('data-aru-composer-token');}
      this.entries.clear();
    }
  }
  return { ComposerAdapter: Object.freeze({ request, selectedMedia, nativeButton, packChoices,parseArticle }), ComposerController };
}
