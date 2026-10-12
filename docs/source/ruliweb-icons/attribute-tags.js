/* Generated from the unchanged shared/icon-metadata/core.js codec. */
(function(g){
  'use strict';
  const A=g.AruIcons=g.AruIcons||{};
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
  A.AttributeTags=Object.freeze({PREFIX,FIXED,normalize,decode,encode});
})(globalThis);
