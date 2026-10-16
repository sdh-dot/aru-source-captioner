// 다운로드 설정과 로컬 원장에 대한 Promise·callback 브라우저 API 차이를 흡수한다.
import { createModuleScope, selectModuleExports } from '../runtime/module-scope.mjs';

export function createDownloadBrowserApi({ environment = globalThis, dependencies = {} } = {}) {
  const { chrome, browser } = environment;

  let downloads = createModuleScope(dependencies.downloads, ["error","JOB_KEY"], ["api","call","options","readJob","writeJob","ownsDownload"]);
const initializeDownloadBrowserApi = function(root){
  'use strict';
  const D=downloads, promise=!!root.browser?.runtime, api=promise?root.browser:root.chrome;
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
};
(initializeDownloadBrowserApi)(environment);

  return {"downloads": selectModuleExports(downloads, ["api","call","options","readJob","writeJob","ownsDownload"])};
}
