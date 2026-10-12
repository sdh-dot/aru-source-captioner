'use strict';
const base=require('../tag-display/harness.cjs');
function harness(){const h=base.harness();for(const name of ['design-system','library-search','library-reader'])h.w.eval(base.read(name));return h;}
const ref=(articleId,title='공개 글',source='direct')=>({boardId:'98',articleId,title,source,url:'https://bbs.ruliweb.com/community/board/98/read/'+articleId});
function pack(id,n=3,tags=['아루']){return {kind:'NORMAL',articleId:id,title:'공개 팩',sources:[{sourceId:'article:'+id,articleId:id,title:'공개 글'}],tags:[],categories:[],icons:Array.from({length:n},(_,i)=>({id:'normal:'+id+':'+i,url:'https://i1.ruliweb.com/ori/'+id+'-'+i+'.png',name:'아이콘 '+(i+1),keywords:['추론하지 않을 키워드'],tagIds:[],categoryIds:[],sourceId:'article:'+id,mediaKind:'image',imageMetadata:{id:'public-'+i,tags:[...tags]},origin:{articleId:id,originalIndex:i}}))};}
module.exports={...base,harness,ref,pack};
