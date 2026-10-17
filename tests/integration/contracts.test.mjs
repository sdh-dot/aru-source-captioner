import {normalizeControlBlocks} from "../helpers/normalize-control-blocks.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import {JSDOM} from 'jsdom';
import {createPerformanceMetrics} from '../../docs/source/performance/metrics.mjs';
import {createIconReader} from '../../docs/source/runtime/icons.mjs';
import {createAttributionCore} from '../../docs/source/upload-attribution/core.mjs';
import {createAttributionUi} from '../../docs/source/upload-attribution/ui.mjs';
import {encode} from '../../shared/icon-metadata/tag-codec.mjs';

const sources=JSON.parse(fs.readFileSync(new URL('./fixtures/hybrid-source.json',import.meta.url))).sources;
const plain=value=>JSON.parse(JSON.stringify(value));
function walk(node,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(n=>walk(n,visit));else if(value&&typeof value==='object')walk(value,visit);}
const canonical=source=>JSON.stringify(normalizeControlBlocks(parse('function compare(g){'+source+'}',{ecmaVersion:'latest'})));
function environment(){
  const dom=new JSDOM('<div class="seditor"><input type="file" accept="image/*"><div class="note-editable" contenteditable="true"></div></div>',{url:'https://bbs.ruliweb.com/community/board/300143/write',pretendToBeVisual:true});
  const w=dom.window;
  w.browser={runtime:{},storage:{sync:{get:async()=>({enabled:false})},onChanged:{addListener(){},removeListener(){}}}};
  w.__aruUploadNoAutoStart=true;w.__aruMetadataNoAutoStart=true;w.__aruBundleNoAutoStart=true;
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  return {dom,w};
}

test('이식한 Hybrid 알고리즘의 AST는 namespace·PR1 부분 상태·이미지편집 탭 장식 제외 외에 같다',()=>{
  const ports=[['ruliweb-icons/library-search','initializeIconsLibrarySearch'],['ruliweb-icons/library-reader','initializeIconsLibraryReader'],['upload-attribution/core','initializeAttributionCore'],['upload-attribution/ui','initializeAttributionUi']];
  for(const [name,initializer]of ports){
    const frozen=sources[name+'.js'];assert.equal(crypto.createHash('sha256').update(frozen.source).digest('hex'),frozen.sha256);
    const ast=parse(frozen.source,{ecmaVersion:'latest'}),call=ast.body.find(n=>n.type==='ExpressionStatement'&&n.expression.type==='CallExpression'&&n.expression.callee.type==='FunctionExpression').expression;
    let expected=frozen.source.slice(call.callee.body.start+1,call.callee.body.end-1).replaceAll('g.AruIcons','icons').replaceAll('g.AruSourceAttribution','attribution').replaceAll('g.AruUploadUI','uploadUI').replaceAll('g.AruPerformance','metrics');
    if(name.endsWith('library-reader'))expected=expected.replace('stale:cached.stale===true||',"stale:cached.stale===true||(pack.kind==='NORMAL'&&pack.bodyCounts?.tagErrors>0)||").replace('return {pack};',"return {pack,stale:pack.kind==='NORMAL'&&pack.bodyCounts?.tagErrors>0};");
    if(name.endsWith('library-search'))expected=expected.replace('{acquiredAt:Date.now(),stale:false}','{acquiredAt:Date.now(),stale:loaded.stale===true}').replace("this.progress.status=this.progress.failed?'partial':'complete'","this.progress.status=this.progress.failed||refs.some(([id])=>this.packs.get(id)?.stale)?'partial':'complete'");
    if(name==='upload-attribution/ui')expected=expected.replace('if (this.records.has(control) || !D) return;', 'if (this.records.has(control) || !D || control.closest("#editor_tab_bar")) return;');
    const actual=fs.readFileSync(new URL('../../docs/source/'+name+'.mjs',import.meta.url),'utf8');let body;
    walk(parse(actual,{ecmaVersion:'latest',sourceType:'module'}),node=>{if(node.type==='VariableDeclarator'&&node.id.name===initializer)body=node.init.body;});
    assert.equal(canonical(actual.slice(body.start+1,body.end-1)),canonical(expected),name);
  }
});

test('순수 ESM 계측과 기존 Hybrid 계측의 OFF·허용 키·상한·reset 결과가 같다',()=>{
  let left=0,right=0;
  const legacy=vm.createContext({performance:{now:()=>left++}});vm.runInContext(sources['performance/metrics.js'].source,legacy);
  const actual=createPerformanceMetrics({environment:{performance:{now:()=>right++}}});
  for(const api of [legacy.AruPerformance,actual]){
    assert.equal(api.start('metadata.parse'),undefined);api.count('cache.hit');
    api.configure({enabled:true});api.count('private-file-name');
    for(let i=0;i<600;i++){const finish=api.start('upload.match');finish();finish();}
    api.gauge('registry.records',12);api.gauge('registry.records',NaN);
  }
  assert.deepEqual(plain(actual.snapshot()),plain(legacy.AruPerformance.snapshot()));
  assert.equal(actual.snapshot().metrics['upload.match'].sampleCount,512);
  assert.equal(left,right);
  const stale=actual.start('metadata.parse');actual.reset();stale();assert.deepEqual(actual.snapshot().metrics,{});
});

test('검색·업로드·UI의 계측은 Aru 전역 없이 명시적 주입으로 연결된다',async()=>{
  const {w}=environment();let icons,controller,ui;
  try{
    for(const name of ['AruIcons','AruMetadata','AruBundle','AruPerformance','AruSourceAttribution','AruUploadUI'])Object.defineProperty(w,name,{get(){throw Error('implicit '+name);},set(){throw Error('implicit '+name);}});
    const metrics=createPerformanceMetrics({environment:w});metrics.configure({enabled:true});
    icons=createIconReader({environment:w,metrics});
    const engine=new icons.LibrarySearchEngine();engine.setEntries([]);engine.setState({query:'아루'});engine.destroy();
    const {attribution}=createAttributionCore({environment:w,metrics});
    controller=new attribution.Controller({document:w.document,parse:async()=>({status:'missing'})});
    const root=w.document.querySelector('[contenteditable]'),record=controller.registry.begin([{name:'same.png'}],root)[0];controller.registry.ready(record,{status:'ok',url:'https://www.pixiv.net/artworks/1234'});assert.equal(controller.registry.match(['same.png'],root).status,'matched');
    const api=createAttributionUi({environment:w,metrics,dependencies:{icons:{DesignSystem:()=>icons.DesignSystem}}});ui=new api.uploadUI(w.document);
    await Promise.resolve();
    const snapshot=metrics.snapshot();for(const name of ['library.rebuild','library.search','upload.discover','upload.match','uploadUI.discover'])assert.ok(snapshot.metrics[name].calls>0,name);
  }finally{ui?.destroy();controller?.destroy();icons?.feature.destroy();w.close();}
});

test('직접 ESM 경로도 NORMAL 태그 오류 후 partial을 유지하고 성공한 재수집에서만 해제한다',async()=>{
  const {w}=environment();let icons,engine;
  try{
    icons=createIconReader({environment:w});
    const doc=new w.DOMParser().parseFromString('<div class="view_content" itemprop="articleBody"><img src="https://i1.ruliweb.com/a.png" data-aru-id="same" data-aru-tags="aru-tags:v1:%broken"></div>','text/html');let reads=0;
    const reader=new icons.LibraryPackReader({isActive:()=>true,site:{...icons.SiteAdapter,getPublicDocument:async()=>{reads++;return doc;}},browser:{requestCache:async()=>null}});
    engine=new icons.LibrarySearchEngine({reader});engine.setEntries([{boardId:'98',articleId:3867,source:'direct'}]);engine.setState({scope:'all'});
    const partial=await engine.collect();assert.equal(partial.count,1);assert.equal(partial.partial,true);assert.equal(partial.progress.status,'partial');
    doc.querySelector('img').setAttribute('data-aru-tags',encode(['미소']));const complete=await engine.collect();assert.equal(reads,2);assert.equal(complete.partial,false);assert.equal(complete.progress.status,'complete');
  }finally{engine?.destroy();icons?.feature.destroy();w.close();}
});
