/* Independent opt-in lifecycle. Existing caption/download listeners are untouched. */
(function(global) {
  'use strict';
  const API=global.AruIcons=global.AruIcons||{};
  const Site=API.SiteAdapter;
  class IconFeature {
    constructor({document=global.document,browser=API.BrowserAdapter,createPicker=API.createPicker,site=Site}={}) {
      this.document=document;this.browser=browser;this.createPicker=createPicker;this.site=site;
      this.enabled=false;this.generation=0;this.entry=null;this.picker=null;this.current=null;this.controller=null;
      this.optionsRevision=0;this.destroyed=false;
      this.onClick=this.onClick.bind(this);this.onNavigate=()=>this.stopSession(true);
    }
    async start() {
      if(this.unsubscribe||this.destroyed)return;
      this.unsubscribe=this.browser.onChanged(()=>this.applyOptions());
      await this.applyOptions();
    }
    async applyOptions() {
      const revision=++this.optionsRevision;
      let opts;
      try {opts=await this.browser.readOptions();}
      catch (_) {opts={active:false,aruIconsOptions:{enabled:false,autoLoad:true}};}
      if(this.destroyed||revision!==this.optionsRevision)return;
      const active=opts.active===true;
      this.options=opts.aruIconsOptions;
      if(active===this.enabled)return;
      this.enabled=active;
      if(active) {
        this.document.addEventListener('click',this.onClick,true);
        global.addEventListener?.('popstate',this.onNavigate);
        global.addEventListener?.('hashchange',this.onNavigate);
        if(API.ComposerController) {
          this.composers=new API.ComposerController({document:this.document,debug:this.options?.debug===true,onOpen:entry=>this.openComposer(entry),
            onRemoved:root=>{if(this.current?.target?.root===root)this.stopSession(true);}});
          this.composers.start();
        }
      } else {
        this.document.removeEventListener('click',this.onClick,true);
        global.removeEventListener?.('popstate',this.onNavigate);
        global.removeEventListener?.('hashchange',this.onNavigate);
        this.composers?.stop();this.composers=null;
        this.stopSession(true);this.entry?.remove();this.entry=null;
      }
    }
    addReadEntry() {
      const id=global.location?.pathname.match(/^\/community\/board\/98\/read\/(\d+)\/?$/)?.[1];
      const body=this.document.querySelector('.view_content[itemprop="articleBody"],.view_content article');
      if(!id||!body)return;
      const host=this.document.createElement('div');host.dataset.aruIconsEntry='true';
      const shadow=host.attachShadow({mode:'open'}),button=this.document.createElement('button');button.type='button';
      button.textContent='확장 아이콘 보기 · 읽기 전용';
      const style=this.document.createElement('style');style.textContent=':host{display:block;margin:12px 0}button{min-height:44px;padding:10px 16px;border:1px solid #70609a;border-radius:10px;color:#463362;background:#f4effb;font:14px system-ui;cursor:pointer}';
      shadow.append(style,button);body.before(host);this.entry=host;
      button.addEventListener('click',()=>this.open({articleId:Number(id),title:body.querySelector('h1')?.textContent||'글 '+id,panel:null,document:this.document,opener:button}));
    }
    onClick(event) {
      // Phase 2A's native button retains its own behavior. Aru entries own the extension picker.
      if(API.ComposerController)return;
      const target=event.target?.closest?.('.icon_data_show_target[onclick]');
      if(!target)return;
      const articleId=this.site.selectionId(target),panel=target.closest('.comment_icon');
      if(!articleId||!panel)return;
      // The original event still reaches the site's own listener. No preventDefault/bridge.
      const closingSame=this.current?.articleId===articleId&&this.current?.panel===panel;
      this.stopSession(true);
      const context={articleId,panel,title:target.getAttribute('title')||'글 '+articleId,opener:target};
      const generation=this.generation;
      setTimeout(()=>{if(closingSame&&panel.querySelector('.icon_share_data')?.style.display==='none')return;if(this.enabled&&generation===this.generation)this.open(context);},0);
    }
    stopSession(destroy=false) {
      this.packSelection=null;this.generation++;this.controller?.abort();this.controller=null;
      this.panelObserver?.disconnect();this.panelObserver=null;
      if(destroy){
        this.librarySearch?.destroy();this.librarySearch=null;this.libraryDirect=null;this.libraryCatalogSignature='';
        this.catalogObserver?.disconnect();this.catalogObserver=null;
        const session=this.current?.target?.session?.session;
        if(session)API.ComposerAdapter?.request(this.document,'release',{session}).catch(()=>{});
        this.picker?.destroy();this.picker=null;this.current=null;this.preparedSelection=null;
      }
    }
    async openComposer(entry) {
      if(!this.enabled)return;
      const panel=entry.kind==='post'?this.document.querySelector('#editor_common_write_wrapper .comment_icon'):entry.root.querySelector('.comment_icon');
      // Let the site's normal button load its own catalog/module; never call the denied API directly.
      // Viewing favorites is independent of whether an insertion session was captured.
      if(entry.kind!=='post' && panel && !panel.children.length)entry.anchor.click();
      // A composer target is independent of its media source. Never auto-select the current article.
      await this.open({articleId:null,boardId:'98',title:'아이콘팩과 즐겨찾기',panel:null,
        document:null,opener:entry.button,target:entry,nativePanel:panel,catalogMode:!!API.CatalogSources});
    }
    cancelPackSelection() {
      const task=this.packSelection;if(!task)return;
      this.packSelection=null;this.stopCollection();
      if(this.current===task.context)Object.assign(task.context,task.before);
    }
    chooseArticle(value,boardId='98') {
      if(!this.current||!this.picker)return Promise.resolve({ok:false});
      // A repeated tap on the same loading entry joins its existing task. A
      // different entry still cancels the old request and restores its context.
      let ref;
      try {
        ref=API.CatalogSources?(typeof value==='object'?{...value,...API.CatalogSources.parseRef(value.url)}:{...API.CatalogSources.parseRef(value,boardId),source:'direct'}):{articleId:API.ComposerAdapter.parseArticle(value),boardId:'98'};
      } catch(error) {return Promise.reject(error);}
      ref.key=ref.key||'direct:'+ref.boardId+':'+ref.articleId;
      const key=String(ref.boardId)+':'+ref.articleId;
      if(this.packSelection?.key===key&&this.packSelection.context===this.current)return this.packSelection.promise;
      this.cancelPackSelection();
      const context=this.current,picker=this.picker;
      const before=Object.fromEntries(['articleId','boardId','catalogRef','title','document','panel','sourceQuery'].map(k=>[k,context[k]]));
      const task={key,context,before};this.packSelection=task;
      task.promise=this.loadChosenArticle(ref,task,picker);return task.promise;
    }
    async loadChosenArticle(ref,task,picker) {
      const {context,before}=task;
      if(this.librarySearch){if(ref.source==='direct')this.libraryDirect?.set(String(ref.boardId)+':'+ref.articleId,ref);this.librarySearch.setEntries([...this.librarySearch.entries.values(),ref]);}
      if(ref.source==='direct')picker.setCatalog?.([...API.CatalogSources.developerPacks(),...API.CatalogSources.favorites(context.nativePanel),...this.libraryDirect.values()]);
      this.stopCollection();Object.assign(context,{articleId:ref.articleId,boardId:ref.boardId,catalogRef:ref,title:ref.title||'글 '+ref.articleId,document:null,panel:null,sourceQuery:''});
      const result=await this.collect(false,false,true);
      if(this.packSelection!==task || this.current!==context)return {ok:false,cancelled:true};
      this.packSelection=null;
      if(!result?.ok){Object.assign(context,before);return result||{ok:false};}
      picker.completeCatalogSelection?.();return result;
    }
    async insertSelection(icon,context) {
      if(!this.enabled)throw Object.assign(new Error('아이콘 기능이 비활성화되었습니다.'),{code:'FEATURE_DISABLED'});
      if(this.current!==context)throw Object.assign(new Error('선택기 대상이 바뀌었습니다. 해당 작성기에서 다시 열어 주세요.'),{code:'PICKER_TARGET_CHANGED'});
      if(!context.target?.session)throw Object.assign(new Error(context.target?.error?.message||'삽입 세션이 없습니다. 작성기에서 다시 열어 주세요.'),{code:context.target?.error?.code||'SESSION_UNAVAILABLE'});
      if(this.inserting)throw new Error('아이콘을 첨부하는 중입니다.');
      this.inserting=true;
      try {
        const result=await API.ComposerAdapter.request(this.document,'insert',{session:context.target.session.session,media:API.ComposerAdapter.selectedMedia(icon),debug:this.options?.debug===true});
        if(this.current!==context)return result;
        const input=context.target.root.querySelector('textarea.comment_input,textarea.reply_input,.note-editable');
        this.stopSession(true);input?.focus({preventScroll:true});
        return {message:'작성기에 아이콘을 첨부했습니다.',...result};
      } finally {this.inserting=false;}
    }
    async open(context) {
      if(!this.enabled)return;
      const readBudget=this.current?.readBudget||{count:0,max:128};
      this.stopSession(true);this.current=context;context.readBudget=readBudget;
      // Current-pack reads retain the existing collector; all-pack UI uses the bounded library reader.
      if(API.LibrarySearchEngine&&API.LibraryPackReader)this.librarySearch=new API.LibrarySearchEngine({reader:new API.LibraryPackReader({browser:this.browser,site:this.site,isActive:()=>this.enabled})});
      this.libraryDirect=new Map();
      this.picker=this.createPicker({opener:context.opener,debug:this.options?.debug===true,insertionMode:!!context.target,catalogMode:context.catalogMode,openCatalogInitially:!!context.target&&context.catalogMode===true,targetValid:!context.target||!!context.target.session,librarySearch:this.librarySearch,
        onLibraryScope:scope=>{if(scope==='all')this.stopCollection();else if(context.articleId&&!this.librarySearch?.packs.has(String(context.boardId)+':'+context.articleId))this.collect(false);},
        onCatalogSource:(ref,query)=>this.chooseArticle(ref,ref.boardId,query),
        onDirectSource:(value,board)=>this.chooseArticle(value,board),
        onCatalogCancel:()=>this.cancelPackSelection(),
        targetLabel:context.target?.kind==='post'?'게시글':context.target?.kind==='reply'?'현재 답글':'현재 댓글',
        onSource:context.target?value=>this.chooseArticle(value):null,
        onClose:()=>this.stopSession(true),onNativeReturn:()=>{
          this.stopSession(true);
          if(context.target?.kind==='post')this.document.querySelector('#iconImage')?.click();
          else context.target?.anchor?.click();
        },
        onStop:()=>{if(this.packSelection)this.cancelPackSelection();else this.stopCollection();},onRetry:()=>this.collect(true,true),onRefresh:()=>this.collect(true),
        onSelect:context.target?icon=>this.insertSelection(icon,context):icon=>{const prepared=this.site.prepareInsertion(icon,{panel:context.panel,kind:context.panel?.closest('#editor_common_write_wrapper')?'post':'comment'});this.preparedSelection=prepared;return {message:prepared.message};}});
      this.document.body.append(this.picker.element);
      if(context.target) {
        const update=()=>{
          if(this.current!==context)return;
          if(context.catalogMode) {
            const favorites=API.CatalogSources.favorites(context.nativePanel);
            const entries=[...API.CatalogSources.developerPacks(),...favorites];
            entries.push(...this.libraryDirect.values());
            if(context.catalogRef&&context.catalogRef.source!=='direct')entries.push(context.catalogRef);
            const signature=JSON.stringify(entries.map(ref=>[ref.boardId,ref.articleId,ref.title,ref.url,ref.source]));if(signature!==this.libraryCatalogSignature){this.libraryCatalogSignature=signature;this.librarySearch?.setEntries(entries);this.picker?.refreshLibrary?.();}
            this.picker?.setCatalog?.(entries,favorites.length?'즐겨찾기는 사이트 기본 목록의 현재 상태를 읽었습니다.':'즐겨찾기 목록을 아직 확인하지 못했습니다. 기존 아이콘 버튼의 로그인·목록 상태를 확인해 주세요.');
          } else this.picker?.setSources?.(API.ComposerAdapter.packChoices(context.nativePanel));
        };
        update();
        if(context.nativePanel) {
          this.catalogObserver=new MutationObserver(update);
          this.catalogObserver.observe(context.nativePanel,{childList:true,subtree:true});
        }
        this.picker.setTargetState?.(!!context.target.session,context.target.error);
        if(context.target.error)this.picker.setError('['+(context.target.error.code||'CAPTURE_FAILED')+'] '+context.target.error.message);
      }
      if(context.panel && typeof MutationObserver!=='undefined') {
        this.panelObserver=new MutationObserver(()=>{
          if(this.current!==context)return;
          if(!context.panel.isConnected||context.panel.style.display==='none'||context.panel.querySelector('.icon_share_data')?.style.display==='none')this.stopCollection();
        });
        this.panelObserver.observe(context.panel,{attributes:true,attributeFilter:['style','hidden'],subtree:true});
      }
      if(context.articleId)await this.collect(false);
      else this.picker.setProgress({status:'partial',message:'기본 목록에서 팩을 고르거나 아이콘 게시글 URL 또는 번호를 입력해 주세요.',busy:false});
    }
    stopCollection() {
      this.generation++;this.controller?.abort();this.controller=null;
      this.picker?.setProgress({status:'stopped',message:'수집을 중지했습니다. 재시도로 이어서 수집할 수 있습니다.',busy:false});
    }
    collect(refresh,manualNative=false,transactional=false) {
      if(!this.enabled||!this.current||!this.picker)return Promise.resolve();
      const key=JSON.stringify([this.current.boardId,this.current.articleId,!!refresh,!!manualNative,!!transactional]);
      if(this.collectionTask?.context===this.current&&this.collectionTask.key===key&&this.controller&&!this.controller.signal.aborted)return this.collectionTask.promise;
      const task={key,context:this.current};this.collectionTask=task;
      task.promise=this.runCollection(refresh,manualNative,transactional).finally(()=>{if(this.collectionTask===task)this.collectionTask=null;});
      return task.promise;
    }
    async runCollection(refresh,manualNative=false,transactional=false) {
      if(!this.enabled||!this.current||!this.picker)return;
      this.controller?.abort();const controller=new AbortController();this.controller=controller;
      const signal=controller.signal,token=++this.generation,context=this.current,picker=this.picker;
      const current=()=>!signal.aborted && this.enabled && this.generation===token && this.current===context;
      const ensure=()=>{if(!current())throw Object.assign(new Error('수집 중지'),{code:'ABORTED'});};
      const diagnostics=new Map();
      const log=(stage,data)=>{
        if(!current()||this.options?.debug!==true)return;const key=JSON.stringify(data);if(diagnostics.get(stage)===key)return;diagnostics.set(stage,key);
        global.console?.info?.('[Aru Icons]',{stage,articleId:context.articleId,...data});
      };
      let pendingPack=null,pendingData=null,latestProgress=null;
      const progress=info=>{latestProgress={...info};picker.setProgress(info);};
      const commit=(pack,data={})=>{
        if(this.librarySearch&&context.articleId){const ref=context.catalogRef||{boardId:context.boardId||'98',articleId:context.articleId,title:context.title,source:'direct'};this.librarySearch.remember(ref,pack,{stale:data.stale===true||(pack.kind==='NORMAL'&&pack.bodyCounts?.tagErrors>0)||(pack.kind==='BUNDLE'&&(pack.attributeReaderVersion!==2||pack.mediaReaderVersion!==1))});this.librarySearch.setState({currentKey:String(ref.boardId)+':'+ref.articleId});}
        picker.setCurrentSource?.(String(context.boardId)+':'+context.articleId);picker.setPack(pack);
        if(context.catalogRef)picker.setCatalogPack?.(context.catalogRef,pack);
        const view=picker.getSnapshot?.();
        log('picker-delivery',{kind:pack.kind,delivered:pack.icons.length,visibleMatches:view?.uniqueCount ?? null,groups:view?.groups?.length ?? null,
          renderedCards:view?.renderedCards ?? null,...data});
      };
      const publish=(pack,data={})=>{if(transactional){pendingPack=pack;pendingData=data;}else commit(pack,data);};
      const cacheArgs={boardId:context.boardId||'98',articleId:String(context.articleId)};
      const cacheFor=kind=>context.catalogRef?{...cacheArgs,catalogSource:context.catalogRef.source||'direct',packKind:kind,readerVersion:2}:cacheArgs;
      const cacheWarning=()=>{if(current())picker.setError('캐시를 사용할 수 없어 이번 세션에서만 표시합니다. 원래 기능은 계속 사용할 수 있습니다.');};
      const readPublic=async(id,opts={})=>{
        ensure();const budget=context.readBudget||{count:0,max:128};
        if(budget.count>=budget.max)throw Object.assign(new Error('이번 선택기의 공개 글 조회 상한 128회에 도달했습니다. 닫고 다시 열어 주세요.'),{code:'REQUEST_LIMIT'});
        budget.count++;return this.site.getPublicDocument(id,{...opts,signal});
      };
      try {
        picker.clearError();progress({status:'loading',phase:'cache',processed:null,total:null,message:'저장된 팩을 확인하고 있어요.',busy:true});
        if(refresh) {try{for(const kind of context.catalogRef?['BUNDLE','NORMAL']:['NORMAL'])await this.browser.requestCache('invalidate',cacheFor(kind));}catch(_){cacheWarning();}ensure();}
        else {
          try {
            let cached;for(const kind of context.catalogRef?['BUNDLE','NORMAL']:['NORMAL']){cached=await this.browser.requestCache('get',cacheFor(kind));ensure();if(cached?.snapshot?.pack)break;}
            const cachedPack=cached?.snapshot?.pack;
            const normal=cachedPack?.kind==='NORMAL';
            const empty=normal && (!Array.isArray(cachedPack.icons) || !cachedPack.icons.length);
            const bodyForNative=normal && !!context.panel && cachedPack.collectionMode==='article-body-v1';
            // Read entries have the current DOM: an old native/body NORMAL cache must not
            // mask missing/changed metadata or perpetuate an empty list.
            const readCurrent=normal && !context.panel;
            const readAttributes=cachedPack?.kind==='BUNDLE' && (cachedPack.attributeReaderVersion!==2 || cachedPack.mediaReaderVersion!==1 || cached.stale===true || cached.snapshot?.sourceCheck?.status==='partial'||cached.snapshot?.sourceCheck?.states?.some(s=>s.metadataReadError||s.tagErrors||s.ambiguousMetadata));
            log('cache',{hit:!!cachedPack,kind:cachedPack?.kind || null,icons:cachedPack?.icons?.length ?? 0,
              action:empty?'ignore-empty-normal':bodyForNative?'ignore-body-for-native':readCurrent?'read-current-normal-body':readAttributes?'read-bundle-attributes':cachedPack?'reuse':'miss'});
            if(cachedPack && !empty && !bodyForNative && !readCurrent && !readAttributes) {
              publish(cachedPack,{from:'cache',stale:cached.stale===true});
              progress({status:'cached',phase:'ready',processed:cachedPack.icons.length,loaded:cachedPack.icons.length,total:cachedPack.icons.length,message:'저장된 팩을 불러왔어요.'+(cached.stale?' 최신 정보는 새로고침으로 확인해 주세요.':''),fetchedAt:cached.acquiredAt,busy:false});
              // Cache cannot establish current native availability or current source verification.
              if(transactional){ensure();commit(pendingPack,pendingData);}return {ok:true,pack:cachedPack};
            }
          } catch(error){ensure();cacheWarning();}
        }
        let resolved,doc;
        try {
          progress({status:'loading',phase:'article',processed:null,total:null,message:'아이콘 게시글을 읽고 있어요.',busy:true});
          doc=(!refresh&&context.document) || await readPublic(context.articleId,{forceRead:refresh,boardId:context.boardId||'98'});ensure();
          const body=doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
          progress({status:'loading',phase:'metadata',processed:null,total:null,message:'팩 정보를 확인하고 있어요.',busy:true});
          resolved=(context.boardId&&context.boardId!=='98')?{kind:'NORMAL',pack:null,warnings:[],rawMetadata:null}:await API.Metadata.parseDocument(body||doc,{articleId:context.articleId,boardId:98});ensure();
        } catch(error) {
          ensure();if(transactional)throw error;picker.setError('['+(error.code||'READ_FAILED')+'] '+error.message+' 정상 탭에서 대표 글을 열거나 원래 선택기로 돌아갈 수 있습니다.');
          if(error.code==='ACCESS_DENIED') {progress({status:'partial',message:'접근 제한으로 중지했습니다. 자동 재요청은 하지 않습니다.',busy:false});return;}
          resolved={kind:'NORMAL',pack:null,warnings:[],rawMetadata:null};
        }
        log('pack-type',{kind:resolved.kind,metadataVersion:resolved.metadataVersion ?? null,metadataIcons:resolved.pack?.icons?.length ?? 0,
          warnings:resolved.warnings?.length || 0,route:context.panel?'native-panel':'article-read'});
        if(resolved.warnings?.length)picker.setError(resolved.warnings.map(w=>w.message||String(w)).join(' '));
        let pack=resolved.pack,sourceCheck=null;
        if(!pack) {
          if(!context.panel){
            if(!doc){progress({status:'partial',message:'공개 본문을 읽지 못했습니다. 정상 탭에서 다시 열거나 원본 다시 읽기를 사용해 주세요.',busy:false});return;}
            progress({status:'loading',phase:'tags',processed:null,total:null,message:'아이콘과 태그를 읽고 있어요.',busy:true});
            const collected=this.site.readArticlePack(doc,context.articleId,context.title,context.boardId||'98',{diagnostics:this.options?.debug===true});ensure();pack=collected.pack;
            log('body-collect',{selector:collected.selector,...collected.counts});publish(pack,{from:'article-body'});
            picker.setMetadataDiagnostics?.(collected.metadataDiagnostics);
            progress({status:!pack.icons.length || collected.counts.excluded || collected.counts.tagErrors?'partial':'complete',phase:'ready',processed:pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,
              message:'NORMAL 본문 URL 수집 · 대상 '+collected.counts.candidates+'개 · 제외 '+collected.counts.excluded+'개 · 중복 '+collected.counts.duplicates+'개. '+(!pack.icons.length?'지원하는 본문 미디어가 없습니다. ':'')+(collected.counts.tagErrors?'태그를 읽지 못한 이미지 '+collected.counts.tagErrors+'개는 태그 없이 표시합니다.':''),busy:false});
          } else {
          progress({status:'loading',phase:'native',processed:null,total:null,message:'사이트 아이콘 목록이 준비되기를 기다리고 있어요.',busy:true});
          const start=Date.now();let s=this.site.snapshot(context.panel,context.articleId);
          while(!s.ready&&Date.now()-start<10000){await this.site.delay(100,signal);ensure();s=this.site.snapshot(context.panel,context.articleId);}
          ensure();pack=this.site.normalPack(s,context.articleId,context.title);publish(pack,{from:'native-panel',raw:s.rawCount});
          if(this.options.autoLoad!==false||manualNative) {
            const session=new this.site.NativeLoadSession({articleId:context.articleId,read:()=>this.site.snapshot(context.panel,context.articleId),click:b=>b.click(),isCurrent:current,
              onProgress:p=>{if(!current())return;publish(this.site.normalPack(p,context.articleId,context.title),{from:'native-panel',raw:p.rawCount});progress(p);}});
            const final=await session.run(signal);ensure();pack=this.site.normalPack(final,context.articleId,context.title);
          } else progress({status:s.done?'complete':'partial',loaded:s.rawCount,total:s.declaredTotal,message:'자동 추가 수집 꺼짐 · 원래 버튼 사용 후 설정에서 자동 수집을 켤 수 있습니다.',busy:false});
          }
        } else {
          publish(pack,{from:'metadata'});
          if(resolved.v1Slaves?.length) {
            sourceCheck=await this.site.verifyReferences(resolved,{signal,readDocument:(id,opts)=>readPublic(id,{...opts,boardId:'98',forceRead:refresh}),onProgress:p=>{if(current())progress(p);}});ensure();
            // A new pack identity rebuilds the catalog's previously computed index too.
            pack={...pack,attributeReaderVersion:2,mediaReaderVersion:1};
            publish(pack,{from:'metadata',stale:sourceCheck.status!=='complete'});progress({...sourceCheck,phase:'ready',processed:sourceCheck.processedCount??sourceCheck.verifiedCount,loaded:pack.icons.length,total:pack.icons.length,declaredCount:pack.icons.length,message:sourceCheck.status==='partial'?'일부 원본 정보(URL·태그)를 확인하지 못했어요. 아래 안내를 확인해 주세요.':'원본 아이콘과 태그를 확인했어요.',busy:false});
            const problems=sourceCheck.states.filter(s=>s.status!=='verified'||s.metadataStatus==='partial');
            if(problems.length)picker.setError(problems.map(s=>'글 '+s.articleId+': '+(s.message||[s.status!=='verified'?'원본 URL '+s.matched+'/'+s.declared+'개 확인 · 나머지 URL 대응 미확인':'',s.metadataStatus==='partial'?'일부 태그를 읽지 못했어요. 새로고침하거나 원본 태그를 확인해 주세요.':''].filter(Boolean).join(' '))).join(' / '));
          } else progress({status:'complete',phase:'ready',processed:pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,message:'팩 정보를 읽었어요.',busy:false});
        }
        ensure();
        if(pack.kind==='NORMAL' && !pack.icons.length){log('cache-write',{action:'skip-empty-normal',icons:0});if(transactional)throw Object.assign(new Error('이 게시글에는 표시할 수 있는 아이콘이 없습니다.'),{code:'PACK_EMPTY'});return;}
        // Existing v1 partial source verification remains a warning, not a new pack rejection policy.
        const completedProgress={...latestProgress,phase:'ready',processed:sourceCheck?.processedCount??pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,busy:false};
        progress({...completedProgress,status:'loading',phase:'storage',message:'다음에 사용할 팩을 저장하고 있어요.',busy:true});
        try{await this.browser.requestCache('put',{...cacheFor(pack.kind),snapshot:{pack,kind:resolved.kind,sourceCheck},rawMetadata:resolved.rawMetadata});}catch(_){cacheWarning();}
        ensure();progress(completedProgress);
        ensure();if(transactional&&pendingPack)commit(pendingPack,pendingData);return {ok:true,pack};
      } catch(error) {
        if(!current())return {ok:false,cancelled:true};
        picker.setError('['+(error.code||'READ_FAILED')+'] '+error.message);progress({status:error.code==='ABORTED'?'stopped':'error',message:error.message,busy:false});
        return {ok:false,error:{code:error.code||'READ_FAILED',message:error.message}};
      }
    }
    destroy() {
      this.destroyed=true;this.optionsRevision++;
      this.enabled=false;this.document.removeEventListener('click',this.onClick,true);
      global.removeEventListener?.('popstate',this.onNavigate);global.removeEventListener?.('hashchange',this.onNavigate);
      this.unsubscribe?.();this.unsubscribe=null;this.composers?.stop();this.composers=null;this.stopSession(true);this.entry?.remove();this.entry=null;
    }
  }
  API.IconFeature=IconFeature;
  // All expensive work is gated by both stored toggles; loading this file creates no site UI.
  if(global.document && API.BrowserAdapter && /^(bbs|m)\.ruliweb\.com$/.test(global.location?.hostname||'')) {
    const feature=new IconFeature();API.feature=feature;
    feature.start().catch(error=>console.warn('[Aru Icons] 초기화 실패:',error.message));
  }
})(typeof globalThis!=='undefined'?globalThis:this);
