/* Picker appearance only. No cache, sync settings, favorites or metadata writes. */
(function(g){
  'use strict';
  const A=g.AruIcons=g.AruIcons||{},key='aruIconsPickerUiV1';
  const defaults=Object.freeze({modalSize:'default',iconSize:'normal',previewVisible:true});
  function sanitize(value){
    const v=value&&typeof value==='object'?value:{};
    return {modalSize:['default','wide','max'].includes(v.modalSize)?v.modalSize:'default',
      iconSize:['small','normal','large'].includes(v.iconSize)?v.iconSize:'normal',
      previewVisible:typeof v.previewVisible==='boolean'?v.previewVisible:true};
  }
  function create({api=g.browser||g.chrome,promiseApi=!!g.browser}={}){
    let writes=Promise.resolve();
    function invoke(method,args){
      const storage=api?.storage?.local;
      if(typeof storage?.[method]!=='function')return Promise.reject(Error('Local storage unavailable'));
      if(promiseApi){try{return Promise.resolve(storage[method](...args));}catch(error){return Promise.reject(error);}}
      return new Promise((resolve,reject)=>{try{storage[method](...args,result=>{
        const error=api.runtime?.lastError;if(error)reject(Error(error.message||'Storage failed'));else resolve(result);
      });}catch(error){reject(error);}});
    }
    return Object.freeze({key,defaults,sanitize,
      read:async()=>sanitize((await invoke('get',[[key]]))?.[key]),
      write:value=>{const next={schemaVersion:1,...sanitize(value)};
        const pending=writes.catch(()=>{}).then(()=>invoke('set',[{[key]:next}]));writes=pending;return pending;}
    });
  }
  A.createUiPreferences=create;A.UiPreferences=create();
})(globalThis);
