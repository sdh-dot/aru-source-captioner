import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import {parse} from "acorn";
import {PickerLifecycle} from "../../src/ruliweb-icons/picker-lifecycle.ts";
import {hasPngSignature,parsePngItxtChunks,parseItxtChunk} from "../../src/source-caption/png-chunks.ts";
import * as codec from "../../src/icon-metadata/tag-codec.ts";

test("Picker는 재진입과 반복 종료에서도 정리 작업을 한 번만 실행한다",()=>{
 const seen:boolean[]=[]; const lifecycle=new PickerLifecycle(()=>{seen.push(lifecycle.isClosed);lifecycle.destroy();});
 assert.equal(lifecycle.isClosed,false);lifecycle.destroy();lifecycle.destroy();assert.deepEqual(seen,[true]);
});
test("Picker 정리 실패 후에도 이미 종료된 세션은 재사용하지 않는다",()=>{
 const lifecycle=new PickerLifecycle(()=>{throw Error("dispose");});assert.throws(()=>lifecycle.destroy(),/dispose/);assert.equal(lifecycle.isClosed,true);assert.doesNotThrow(()=>lifecycle.destroy());
});
test("늦은 비동기 완료는 종료된 Picker 상태를 확인할 수 있다",async()=>{
 const lifecycle=new PickerLifecycle(()=>{});const pending=Promise.resolve().then(()=>lifecycle.isClosed);lifecycle.destroy();assert.equal(await pending,true);
});
const baseline=JSON.parse(fs.readFileSync(new URL("../esm/fixtures/completion-baseline.json",import.meta.url),"utf8"));
function walk(node:unknown,visit:(node:Record<string,unknown>)=>void){if(!node||typeof node!=="object")return;const value=node as Record<string,unknown>;if(value.type)visit(value);for(const child of Object.values(value))if(Array.isArray(child))child.forEach(x=>walk(x,visit));else if(child&&typeof child==="object")walk(child,visit);}
for(const browser of ["firefox","whale"]){
 const saved=baseline.files[browser+"/content.js"];const source=saved.source as string;
 test(browser+" PNG 판독은 고정된 기존 구현과 정상·손상 입력에서 같다",()=>{
  assert.equal(crypto.createHash("sha256").update(source).digest("hex"),saved.sha256);
  const declarations:string[]=[];walk(parse(source,{ecmaVersion:"latest"}),node=>{const id=node.id as {name?:string}|undefined;if(node.type==="FunctionDeclaration"&&["hasPngSignature","parsePngItxtChunks","parseItxtChunk"].includes(id?.name||""))declarations.push(source.slice(node.start as number,node.end as number));if(node.type==="VariableDeclarator"&&id?.name==="PNG_SIGNATURE")declarations.push("const "+source.slice(node.start as number,node.end as number)+";");});
  assert.equal(declarations.length,4);
  const legacy=vm.runInNewContext(declarations.join("\n")+";({hasPngSignature,parsePngItxtChunks,parseItxtChunk})",{Uint8Array,DataView,String}) as {hasPngSignature:typeof hasPngSignature;parsePngItxtChunks:typeof parsePngItxtChunks;parseItxtChunk:typeof parseItxtChunk};
  const payload=Buffer.from("aru_archive\0\0\0\0\0한글 태그 !?","utf8"),head=Buffer.alloc(8);head.writeUInt32BE(payload.length);head.write("iTXt",4);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),head,payload,Buffer.alloc(4)]);
  for(let n=0;n<=png.length;n++){
   const bytes=png.subarray(0,n),buffer=Uint8Array.from(bytes).buffer;
   assert.equal(hasPngSignature(buffer),legacy.hasPngSignature(buffer));
   assert.deepEqual([...parsePngItxtChunks(buffer)].map(x=>[...x]),[...legacy.parsePngItxtChunks(buffer)].map(x=>[...x]));
   const plain=(x:ReturnType<typeof parseItxtChunk>)=>x?{...x,textBytes:[...x.textBytes]}:null;
   assert.equal(JSON.stringify(plain(parseItxtChunk(bytes))),JSON.stringify(plain(legacy.parseItxtChunk(bytes))));
  }
 });
}
test("직접 TypeScript 코덱은 고정 IIFE와 저장값·오류 계약이 같다",()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL("../esm/fixtures/legacy.json",import.meta.url),"utf8"));const saved=fixtures.baselines.find((x:{namespace:string})=>x.namespace==="reader");const context=vm.createContext({});vm.runInContext(saved.source,context);const legacy=context.AruIcons.AttributeTags;
 const outcome=(action:()=>unknown)=>{try{return {value:action()};}catch(e){const error=e as Error & {code?:string};return {name:error.name,code:error.code,message:error.message};}};
 for(const tags of [[" 한글  태그 ","한글 태그","!@#","대문자A"],[],["a","A"]])assert.deepEqual(outcome(()=>codec.encode(tags)),JSON.parse(JSON.stringify(outcome(()=>legacy.encode(tags)))));
 for(const text of [null,"", "기존,태그",codec.encode(["한글","emoji🙂"]),"aru-tags:v1:bad"]){assert.deepEqual(outcome(()=>codec.decode(text)),JSON.parse(JSON.stringify(outcome(()=>legacy.decode(text)))));}
});

test("AST 비교는 단일 제어문 중괄호만 무시하고 조건과 선언 범위는 보존한다",async()=>{
 const {normalizeControlBlocks}=await import("../helpers/normalize-control-blocks.mjs");const ast=(text:string)=>normalizeControlBlocks(parse(text,{ecmaVersion:"latest"}));
 assert.deepEqual(ast("if(a)returnValue();"),ast("if(a){returnValue();}"));
 assert.notDeepEqual(ast("if(a)returnValue();"),ast("if(b)returnValue();"));
 assert.notDeepEqual(ast("if(a){let x=1;use(x);}"),ast("if(a){let x=2;use(x);}"));
 assert.notDeepEqual(ast("if(a){let x=1;}"),ast("if(a){var x=1;}"));
});
