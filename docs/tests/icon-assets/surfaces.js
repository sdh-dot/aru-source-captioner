(async()=>{
  const params=new URLSearchParams(location.search),baseline=params.get('version')==='baseline';
  const base=new URL('../../../../'+(baseline?'phase2b-stable-rc1':'phase2b-stable-rc2')+'/',location.href).href;
  const view=params.get('view')||'tags';
  window.chrome={runtime:{getURL:file=>base+'whale/'+file}};
  window.__aruMetadataNoAutoStart=window.__aruBundleNoAutoStart=true;
  for(const file of ['docs/source/ruliweb-icons/core.js','docs/source/ruliweb-icons/metadata.js','docs/source/ruliweb-icons/design-system.js','docs/source/ruliweb-icons/composer-adapter.js','whale/features/icon-metadata/content.bundle.js','whale/features/bundle-generator/content.bundle.js'])await new Promise((ok,fail)=>{const s=document.createElement('script');s.src=base+file;s.onload=ok;s.onerror=fail;document.head.append(s);});
  let panel;
  const dark=()=>{document.body.style.backgroundColor=document.body.style.backgroundColor==='rgb(33, 24, 30)'?'#faf7f2':'#21181e';document.body.style.color=document.body.style.backgroundColor==='rgb(33, 24, 30)'?'#f7eee9':'#30252b';const f=document.querySelector('iframe');if(f?.contentDocument)f.contentDocument.documentElement.dataset.aruTheme=document.body.style.backgroundColor==='rgb(33, 24, 30)'?'dark':'light';};
  document.querySelector('#theme').onclick=dark;
  const themeControl=shadow=>{const b=document.createElement('button');b.id='fixture-theme';b.textContent='테마 전환';b.onclick=dark;shadow.querySelector('header').append(b);};
  if(view==='tags'){
    const media=new URL('../phase2b3-r3/sample.png',location.href).href;
    const data={session:'fixture-tags',collisions:0,canUndo:false,canRedo:false,images:Array.from({length:100},(_,i)=>({handle:'fixture-'+i,index:i,alt:'아이콘 '+(i+1),src:media,id:'id'+i,tags:['아루',i%2?'미소':'인사']}))};
    const client={request:async op=>op==='scan'?data:op==='preview'?{selected:10,changed:10,ids:0,tagChanges:10}:{selected:10,changed:10,ids:0,tagChanges:10}};
    const open=()=>{panel?.close(true);panel=new AruMetadata.Panel({document,client,token:'fixture',onClose:()=>{}});themeControl(panel.shadow);};document.querySelector('#open').onclick=open;open();
  }else if(view==='bundle'){
    const B=window.AruBundle,summary=id=>({articleId:id,boardId:98,title:'블루아카 아이콘팩 '+id,url:'https://bbs.ruliweb.com/community/board/98/read/'+id,urls:['https://i1.ruliweb.com/img/26/10/11/sample.webp'],icons:100,images:97,videos:3,taggedIcons:100,hasMetadata:true,thumbnail:null});
    const reader={pending:new Map(),read:async url=>summary(Number(url.match(/\d+$/)[0])),cancel(){},destroy(){}};
    const client={request:async op=>op==='scan'?{session:'fixture-bundle',articleId:null,value:null}:op==='preview'?{changed:true,previewId:'fixture-preview',expiresInMs:120000,changes:'통합팩 추가',references:3,icons:300}:{}};
    const searcher={search:async(query,page)=>({query,page,hasPrevious:page>1,hasNext:page<2,items:[5039,5040,5041].map(id=>summary(id))}),cancel(){},destroy(){}};
    const open=()=>{panel?.close();panel=new B.Panel({document,client,token:'fixture',reader,searcher,browser:{saveDraft:async()=>{},loadDraft:async()=>new B.Draft()},onClose:()=>{}});themeControl(panel.shadow);setTimeout(()=>{if(panel.closed)return;panel.q('.name').value='블루아카 통합 아이콘팩';panel.draft.name=panel.q('.name').value;[5039,5040,5041].forEach(id=>panel.draft.add(summary(id)));panel.render();panel.invalidate();},50);};document.querySelector('#open').onclick=open;open();
  }else if(view==='options'){
    const html=await(await fetch(base+'whale/options.html')).text();const f=document.createElement('iframe');document.body.classList.add('options-preview');f.title='설정 · 표시 전용';f.srcdoc=html.replace('<head>','<head><base href="'+base+'whale/">').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');document.body.append(f);document.querySelector('#open').hidden=true;
  }
  // Local UI only; no submit handlers, login or real editor content.
  const toolbar=document.querySelector('#fixture-toolbar');toolbar.innerHTML='<div class="common_write_wrapper"><textarea class="comment_input">테스트 댓글 보존</textarea><button onclick="app.comment_icon(1)">기본 아이콘</button></div><div class="common_write_wrapper"><textarea class="reply_input">테스트 답글 보존</textarea><button onclick="app.comment_icon(2)">기본 아이콘</button></div><div id="editor_v2"><div class="seditor"><textarea id="ReactSummernoteLite" hidden></textarea><div class="note-toolbar"><button><i class="icon-camera"></i> 이미지</button></div><div class="note-editable" contenteditable="true"></div></div></div>';
  const c=new AruIcons.ComposerController({document,onOpen:()=>{}});c.start();const m=new AruMetadata.Controller({document});m.client.request=async()=>({images:97,videos:3,total:100,policyImages:97,limit:null});m.active=true;m.discover();const b=new AruBundle.Controller({document});b.active=true;b.discover();
})().catch(e=>document.querySelector('#status').textContent='Fixture error: '+e.message);
