/* Uses existing public readers/cache, never site private endpoints or favorite mutations. */
(function(g){
  'use strict';const A=g.AruIcons=g.AruIcons||{};
  const fail=(code,message)=>Object.assign(new Error(message),{code});
  class LibraryPackReader{
    constructor({site=A.SiteAdapter,browser=A.BrowserAdapter,isActive=()=>A.feature?.enabled===true,maxRequests=256}={}){Object.assign(this,{site,browser,isActive,maxRequests,requests:0});}
    check(signal){if(signal?.aborted)throw fail('ABORTED','검색 수집을 중지했습니다.');if(!this.isActive())throw fail('FEATURE_DISABLED','아이콘 기능이 비활성화되어 있습니다.');}
    args(ref,kind,source=ref.source||'direct'){return {boardId:String(ref.boardId),articleId:String(ref.articleId),catalogSource:source,packKind:kind,readerVersion:2};}
    async getCached(ref,{signal}={}){
      this.check(signal);for(const source of ref.sources||[ref.source||'direct'])for(const kind of ['BUNDLE','NORMAL']){
        const cached=await this.browser.requestCache('get',this.args(ref,kind,source));this.check(signal);const pack=cached?.snapshot?.pack;
        if(pack?.icons?.length)return {pack,acquiredAt:cached.acquiredAt||0,stale:cached.stale===true||cached.snapshot?.sourceCheck?.status==='partial'||(pack.kind==='BUNDLE'&&(pack.attributeReaderVersion!==2||pack.mediaReaderVersion!==1))};
      }return null;
    }
    async invalidate(ref,{signal}={}){for(const source of ref.sources||[ref.source||'direct'])for(const kind of ['NORMAL','BUNDLE']){this.check(signal);await this.browser.requestCache('invalidate',this.args(ref,kind,source));}}
    async load(ref,{signal,forceRead=false}={}){
      const read=async(articleId,options={})=>{this.check(signal);if(++this.requests>this.maxRequests)throw fail('REQUEST_LIMIT','검색의 공개 글 조회 상한에 도달했습니다.');
        const doc=await this.site.getPublicDocument(articleId,{...options,boardId:String(ref.boardId),signal,forceRead});this.check(signal);return doc;};
      const doc=await read(ref.articleId),body=doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
      if(!body)throw fail('ARTICLE_UNAVAILABLE','공개 본문을 읽을 수 없습니다.');
      const parsed=String(ref.boardId)==='98'?await A.Metadata.parseDocument(body,{articleId:ref.articleId,boardId:98}):{pack:null};this.check(signal);
      let pack=parsed.pack;
      if(pack&&parsed.v1Slaves?.length){const verification=await this.site.verifyReferences(parsed,{signal,readDocument:read});this.check(signal);
        if(verification.status!=='complete')throw fail('REFERENCE_UNAVAILABLE','일부 원본 글을 확인하지 못했습니다.');pack={...pack,attributeReaderVersion:2,mediaReaderVersion:1};}
      const observedTitle=doc.querySelector('.subject_text,.subject,.view_content h1')?.textContent?.trim().slice(0,120);
      if(!pack)pack=this.site.readArticlePack(doc,ref.articleId,observedTitle||ref.title,String(ref.boardId)).pack;
      this.check(signal);if(!pack.icons?.length)throw fail('EMPTY_PACK','읽을 수 있는 아이콘이 없습니다.');
      try{await this.browser.requestCache('put',{...this.args(ref,pack.kind),snapshot:{pack},rawMetadata:parsed.rawMetadata});}catch(error){this.check(signal);/* Cache unavailable: still return the actual public model. */}
      return {pack};
    }
  }
  A.LibraryPackReader=LibraryPackReader;
})(globalThis);
