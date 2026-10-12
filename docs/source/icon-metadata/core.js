/* Attribute-only metadata model. No storage, network or editor side effects. */
(function(g){
  'use strict';
  const M=g.AruMetadata=g.AruMetadata||{};
  const PREFIX='aru-tags:v1:';
  const FIXED=Object.freeze(['인사','사과','축하','응원','감사','미소','도발','조토피아','매도','분노','슬픔','당황','놀람']);
  const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
  function normalize(values){
    if(!Array.isArray(values)||values.length>1000)fail('TAGS_INVALID','태그 목록이 올바르지 않거나 1,000개를 넘었습니다.');
    const result=[],seen=new Set();
    for(const value of values){
      if(typeof value!=='string')fail('TAGS_INVALID','태그는 문자열이어야 합니다.');
      const tag=value.replace(/\s+/gu,' ').trim();
      if(tag.length>512||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(tag))fail('TAGS_INVALID','태그 길이 또는 제어 문자를 확인해 주세요.');
      if(tag&&!seen.has(tag)){seen.add(tag);result.push(tag);}
    }
    return result;
  }
  function decode(raw){
    if(raw==null||raw==='')return [];
    if(raw.length>65536)fail('TAGS_INVALID','기존 태그 속성이 너무 큽니다. 원본은 변경하지 않았습니다.');
    if(raw.startsWith(PREFIX)){
      try{return normalize(JSON.parse(decodeURIComponent(raw.slice(PREFIX.length))));}
      catch(_){fail('TAGS_INVALID','인코딩된 기존 태그를 읽을 수 없습니다. 원본을 확인해 주세요.');}
    }
    if(raw.startsWith('aru-tags:'))fail('TAGS_VERSION','지원하지 않는 태그 규격입니다. 기존 속성은 보존합니다.');
    return normalize(raw.split(','));
  }
  function encode(values){
    let raw;try{raw=PREFIX+encodeURIComponent(JSON.stringify(normalize(values)));}catch(e){if(e.code)throw e;fail('TAGS_INVALID','태그에 올바르지 않은 유니코드 문자가 있습니다.');}
    if(raw.length>65536)fail('TAGS_INVALID','인코딩된 태그가 64KB를 넘었습니다. 태그를 줄여 주세요.');
    return raw;
  }
  function plan(images,handles,tags,operation,generate){
    if(!['add','remove','replace'].includes(operation))fail('OP_INVALID','태그 작업을 선택해 주세요.');
    tags=normalize(tags);
    if(operation!=='replace'&&!tags.length)fail('TAGS_EMPTY','추가하거나 제거할 태그를 지정해 주세요.');
    const selected=new Set(handles);
    if(!selected.size||selected.size!==handles.length)fail('SELECTION_INVALID','선택한 이미지가 없거나 중복되었습니다.');
    const available=new Set(images.map(x=>x.handle));
    for(const h of selected)if(!available.has(h))fail('IMAGE_CHANGED','선택한 이미지가 삭제되거나 교체되었습니다. 목록을 다시 확인해 주세요.');
    const occupied=new Set(images.filter(x=>!selected.has(x.handle)&&x.id).map(x=>x.id));
    const allIds=new Set(images.filter(x=>x.id).map(x=>x.id)),changes=[],remove=new Set(tags);
    let ids=0,tagChanges=0;
    for(const img of images){
      if(!selected.has(img.handle))continue;
      const before=decode(img.rawTags);
      const after=operation==='add'?normalize(before.concat(tags)):operation==='remove'?before.filter(x=>!remove.has(x)):tags;
      let id=img.id;
      if(!id||occupied.has(id)){
        let tries=0;
        do{id=generate();if(++tries>100)fail('ID_COLLISION','고유 ID 생성에 실패했습니다.');}while(allIds.has(id)||occupied.has(id));
        if(typeof id!=='string'||!id)fail('ID_INVALID','고유 ID 생성에 실패했습니다.');
        allIds.add(id);
      }
      occupied.add(id);
      // Preserve byte-for-byte legacy values on a semantic no-op, unless a first ID is needed.
      const same=JSON.stringify(before)===JSON.stringify(after);
      const rawTags=same&&img.rawTags!=null?img.rawTags:encode(after);
      if(id!==img.id||rawTags!==img.rawTags){
        changes.push({handle:img.handle,id,rawTags});
        if(id!==img.id)ids++;
        if(rawTags!==img.rawTags)tagChanges++;
      }
    }
    return {changes,selected:selected.size,changed:changes.length,ids,tagChanges};
  }
  class Selection{
    constructor(){this.values=new Set();this.anchor=null;}
    click(handle,order,{ctrlKey=false,metaKey=false,shiftKey=false,checkbox=false}={}){
      const additive=ctrlKey||metaKey;
      if(shiftKey&&this.anchor&&order.includes(this.anchor)){
        if(!additive)this.values.clear();
        const a=order.indexOf(this.anchor),b=order.indexOf(handle);
        for(const h of order.slice(Math.min(a,b),Math.max(a,b)+1))this.values.add(h);
      }else if(additive||checkbox){if(this.values.has(handle))this.values.delete(handle);else this.values.add(handle);this.anchor=handle;}
      else{this.values=new Set([handle]);this.anchor=handle;}
    }
    all(order){this.values=new Set(order);}
    clear(){this.values.clear();this.anchor=null;}
    retain(order){const keep=new Set(order);for(const h of this.values)if(!keep.has(h))this.values.delete(h);if(!keep.has(this.anchor))this.anchor=null;}
  }
  Object.assign(M,{PREFIX,FIXED,fail,normalize,decode,encode,plan,Selection});
})(globalThis);
