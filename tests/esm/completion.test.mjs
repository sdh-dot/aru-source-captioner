import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as search from '../../docs/source/ruliweb-icons/core.mjs';
import { createIconsCatalog } from '../../docs/source/ruliweb-icons/catalog.mjs';
import { createIconsDesignSystem } from '../../docs/source/ruliweb-icons/design-system.mjs';
import { createDownloadCore } from '../../docs/source/body-download/core.mjs';
import { createIconsLibrarySearch } from '../../docs/source/ruliweb-icons/library-search.mjs';
import { createBundleCore } from '../../docs/source/bundle-generator/core.mjs';
import { createBundleSearch } from '../../docs/source/bundle-generator/search.mjs';
import { createMetadata } from '../../docs/source/ruliweb-icons/metadata.mjs';
import { createIconReader, createBundleMain, createBundleUiRuntime, createMetadataUi } from '../../docs/source/runtime/icons.mjs';
import { installDownloadContent } from '../../docs/source/runtime/downloads.mjs';
import { compileCompatibility, compileRuntime } from '../../tools/build-esm.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/completion-baseline.json', import.meta.url)));
const entries = JSON.parse(fs.readFileSync(new URL('../../tools/esm-completion-entries.json', import.meta.url)));
const plain = value => JSON.parse(JSON.stringify(value));
const capture = action => { try { return { ok: true, value: plain(action()) }; } catch (error) { return { ok: false, name: error.name, code: error.code, message: error.message }; } };
function dom() {
  const result = new JSDOM('<!doctype html><main></main>', { url: 'https://bbs.ruliweb.com/community/board/98/modify/6000', pretendToBeVisual: true, runScripts: 'outside-only' });
  result.window.TextEncoder = TextEncoder; result.window.TextDecoder = TextDecoder;
  result.window.__aruBundleNoAutoStart = true; result.window.__aruMetadataNoAutoStart = true;
  return result;
}
function prepare(window) {
  const icons = { ...search, ...createMetadata({ environment: window }), packRegistry: { packs: [] } };
  const dependencies = { icons: Object.fromEntries(Object.keys(icons).map(key => [key, () => icons[key]])) };
  Object.assign(icons, createIconsCatalog({ environment: window, dependencies }).icons);
  return icons;
}
test('새로 옮긴 모든 원본은 기준 커밋에서 동결한 SHA와 비교한다', () => {
  assert.equal(golden.commit, '2f755c3db89b628256586cfd314337b496f36421');
  for (const [file, record] of Object.entries(golden.files)) assert.equal(crypto.createHash('sha256').update(record.source).digest('hex'), record.sha256, file);
});
test('모든 신규 ESM은 브라우저·DOM·namespace 없이 import할 수 있다', () => {
  const modules = [...new Set(entries.map(entry => pathToFileURL(root + entry.module).href))];
  modules.push(new URL('../../docs/source/runtime/icons.mjs', import.meta.url).href, new URL('../../docs/source/runtime/downloads.mjs', import.meta.url).href);
  const code = `for(const name of ['document','window','chrome','browser','AruIcons','AruMetadata','AruBundle','AruBodyDownload','AruSourceAttribution','fetch','localStorage'])Object.defineProperty(globalThis,name,{get(){throw Error(name)},set(){throw Error(name)}});await Promise.all(${JSON.stringify(modules)}.map(url=>import(url)));`;
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--input-type=module','-e',code], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
});
test('통합 검색의 membership·중복 이미지·순서·캐시·한글 필터가 이전 구현과 같다', () => {
  const instance = dom(); const w = instance.window;
  try {
    const icons = prepare(w); w.AruIcons = icons;
    w.eval(golden.files['docs/source/ruliweb-icons/library-search.js'].source);
    const dependencies = { icons: Object.fromEntries(Object.keys(icons).map(key => [key, () => icons[key]])) };
    const actualApi = createIconsLibrarySearch({ environment: w, dependencies }).icons;
    const actual = new actualApi.LibrarySearchEngine(), expected = new w.AruIcons.LibrarySearchEngine();
    const refs = [{ boardId: '98', articleId: 5039, title: '아루', source: 'direct' }, { boardId: '98', articleId: 5040, title: '기쁨', source: 'favorite' }];
    const pack = { name: '테스트', tags: [], icons: Array.from({ length: 100 }, (_, i) => ({ id: 'item-'+i, url: 'https://i1.ruliweb.com/'+i+'.png', origin: { articleId: 5039, originalIndex: i }, imageMetadata: { id: 'm-'+i, tags: i%2 ? ['아루', '기쁨'] : ['아루', '캐릭터 이름'] } })) };
    for (const model of [actual, expected]) { model.setEntries(refs); refs.forEach((ref,i) => model.remember(ref, pack, { acquiredAt: i+1, stale: !!i })); }
    const states = [{ scope: 'all' }, { scope: 'current', currentKey: '98:5039' }, { scope: 'all', query: '아루 기쁨', textMatch: 'all' }, { query: '기쁨 이름', textMatch: 'any' }, { query: '', selectedTags: ['기쁨'], tagMatch: 'all' }];
    for (const state of states) assert.deepEqual(plain(actual.setState(state)), plain(expected.setState(state)));
    assert.equal(actual.rows.length, 100); assert.equal(actual.rows[0].memberships.length, 2);
    actual.destroy(); expected.destroy(); assert.equal(actual.closed, expected.closed);
  } finally { w.close(); }
});
test('통합팩 원문·unknown 필드·슬롯 순서와 번호/URL 예외를 보존한다', () => {
  const instance = dom(), w = instance.window;
  try {
    const icons = prepare(w); w.AruIcons = icons;
    w.eval(golden.files['docs/source/bundle-generator/core.js'].source);
    const bundle = createBundleCore({ environment: w, dependencies: { icons: { Metadata: () => icons.Metadata, SiteAdapter: () => icons.SiteAdapter } } }).bundle;
    const value = { version: 1, name: '아루', boardId: 98, mainArticleId: 6000, foreign: { retained: '기존' }, slaves: [{ page: 7, articleId: 5039, images: ['https://i1.ruliweb.com/a.png'], extension: [1,'보존'] }] };
    const actual = new bundle.Draft(value), expected = new w.AruBundle.Draft(value);
    for (const model of [actual, expected]) { model.name = '제목 변경'; model.add({ articleId: 5040, urls: ['https://i2.ruliweb.com/b.mp4?gif'] }); model.move(1,0); }
    assert.deepEqual(plain(actual.value(6000)), plain(expected.value(6000)));
    assert.equal(bundle.encode(actual.value(6000)), w.AruBundle.encode(expected.value(6000)));
    for (const url of ['https://m.ruliweb.com/community/board/98/read/5039?x=1', 'http://bbs.ruliweb.com/community/board/98/read/5039', 'https://bbs.ruliweb.com/community/board/98/read/0']) assert.deepEqual(capture(() => bundle.articleUrl(url)), capture(() => w.AruBundle.articleUrl(url)));
    assert.deepEqual(value.slaves[0].extension, [1,'보존']);
  } finally { w.close(); }
});
test('게시판 검색 URL·다중 선택·페이지 전환 상태가 같다', () => {
  const instance = dom(), w = instance.window;
  try {
    w.AruIcons = prepare(w); w.eval(golden.files['docs/source/bundle-generator/core.js'].source); w.eval(golden.files['docs/source/bundle-generator/search.js'].source);
    const previous = w.AruBundle;
    const bundle = createBundleSearch({ environment: w, dependencies: { bundle: Object.fromEntries(['fail','articleUrl','clone'].map(key => [key,()=>previous[key]])) } }).bundle;
    for (const query of ['아루 & 기쁨','캐릭터 이름', '']) assert.deepEqual(capture(() => bundle.searchUrl(query,2)),capture(() => previous.searchUrl(query,2)));
    const actual = new bundle.SearchSelection(), expected = new previous.SearchSelection();
    const page = number => ({ query: '아루', items: Array.from({length:6},(_,index)=>({articleId:number*10+index,page:number,index})) });
    for (const model of [actual, expected]) { model.set(page(1)); model.click(2); model.click(5,{shiftKey:true}); model.click(1,{ctrlKey:true}); model.set(page(2)); model.all(); }
    assert.deepEqual(plain(actual.ordered()),plain(expected.ordered()));
    actual.clear(); expected.clear(); assert.deepEqual(plain(actual.ordered()),plain(expected.ordered()));
  } finally { w.close(); }
});
test('runtime 조립은 전역 namespace 없이 작동하고 이미 제공된 metadata·UI 인스턴스를 재사용한다', async () => {
  const instance = dom(), w = instance.window;
  try {
    for (const name of ['AruIcons','AruMetadata','AruBundle']) Object.defineProperty(w,name,{get(){throw Error('global '+name);},set(){throw Error('global '+name);}});
    const listener = { addListener(){}, removeListener(){} };
    w.browser = { runtime: {}, storage: { sync: { get: async()=>({enabled:false}) }, onChanged:listener } };
    const icons = createIconReader({environment:w}); await Promise.resolve();
    const ds = icons.DesignSystem, metadata = icons.Metadata;
    const main = createBundleMain({environment:w,initialIcons:icons});
    const ui = createBundleUiRuntime({environment:w,initialIcons:icons});
    const writer = createMetadataUi({environment:w,initialIcons:icons});
    assert.equal(main.icons.Metadata,metadata); assert.equal(ui.icons.Metadata,metadata);
    assert.equal(ui.icons.DesignSystem,ds); assert.equal(writer.icons.DesignSystem,ds);
    assert.equal(typeof writer.metadata.Client,'function'); assert.equal(typeof ui.bundle.BoardSearch,'function');
    icons.feature.destroy();
  } finally { w.close(); }
});
test('디자인 토큰·스타일·비상호작용 아이콘은 이전 실행 결과와 같다', () => {
  const instance = dom(), w = instance.window;
  try {
    w.eval(golden.files['docs/source/ruliweb-icons/design-system.js'].source);
    const expected = w.AruIcons.DesignSystem;
    const actual = createIconsDesignSystem({environment:w}).icons.DesignSystem;
    assert.deepEqual(plain(actual.LIGHT),plain(expected.LIGHT));
    assert.deepEqual(plain(actual.DARK),plain(expected.DARK));
    assert.equal(actual.css,expected.css);
    assert.match(actual.css,/\.aru-entry-icon\{[^}]*pointer-events:none/);
    const host = w.document.createElement('div'); w.document.body.append(host);
    const shadow = host.attachShadow({mode:'open'});
    actual.attach(shadow); actual.attach(shadow);
    assert.equal(shadow.querySelectorAll('style').length,1);
    const oldHost = w.document.createElement('div'); w.document.body.append(oldHost);
    const oldShadow = oldHost.attachShadow({mode:'open'}); expected.attach(oldShadow);
    assert.equal(shadow.querySelector('style').textContent,oldShadow.querySelector('style').textContent);
  } finally { w.close(); }
});

test('공통 다운로드 코덱의 경로·미디어 판별·예외 결과는 두 브라우저 원본과 같다', () => {
  const actual = createDownloadCore({environment:globalThis}).downloads;
  for (const browser of ['firefox','whale']) {
    const instance = dom(), w = instance.window;
    try {
      w.eval(golden.files[browser+'/features/body-download/core.js'].source);
      const expected = w.AruBodyDownload;
      for (const url of ['https://bbs.ruliweb.com/community/board/98/read/5039','https://m.ruliweb.com/community/board/98/read/5039?x=1','http://bbs.ruliweb.com/community/board/98/read/5039','invalid']) assert.deepEqual(capture(()=>actual.article(url)),capture(()=>expected.article(url)));
      for (const name of ['아루 : 기쁨 / 😀','CON.txt','.. ','a'.repeat(130)]) assert.equal(actual.safeName(name),expected.safeName(name));
      for (const url of ['https://i1.ruliweb.com/a.png','https://i2.ruliweb.com/a.mp4?gif','http://i1.ruliweb.com/a.png','https://evil.test/a.png']) assert.deepEqual(capture(()=>actual.mediaUrl(url)),capture(()=>expected.mediaUrl(url)));
      for (const bytes of [Uint8Array.of(137,80,78,71,13,10,26,10),Uint8Array.of(255,216,255),Uint8Array.of(0,1)]) assert.deepEqual(capture(()=>actual.inspect(bytes,'image/png','https://i1.ruliweb.com/a.png')),capture(()=>expected.inspect(bytes,'image/png','https://i1.ruliweb.com/a.png')));
    } finally { w.close(); }
  }
});

test('다운로드 Content 메시지의 발신자·탐색 변경·비활성화 응답을 보존한다', async () => {
  for (const mode of ['valid','sender','disabled','navigation']) {
    const results = [];
    for (const legacy of [true,false]) {
      const instance = dom(), w = instance.window;
      try {
        let listener;
        instance.reconfigure({url:'https://bbs.ruliweb.com/community/board/98/read/5039'});
        w.document.body.innerHTML='<h1 class="subject_text">아루</h1><div class="view_content" itemprop="articleBody"><img src="https://i1.ruliweb.com/a.png"><img src="https://i1.ruliweb.com/a.png"><aside class="comment"><img src="https://i1.ruliweb.com/excluded.png"></aside></div>';
        w.Date=class extends Date {constructor(...args){super(...(args.length?args:['2026-10-16T00:00:00Z']));}};
        w.browser={runtime:{id:'test-extension',onMessage:{addListener(value){listener=value;}}},storage:{sync:{get:async()=>({enabled:true,aruBodyDownloadOptions:{enabled:mode!=='disabled'}})}}};
        if (legacy) w.eval(golden.files['firefox/features/body-download/content.bundle.js'].source);
        else installDownloadContent({environment:w});
        assert.equal(listener({type:'unrelated'}, {},()=>assert.fail()),undefined);
        results.push(await new Promise(resolve=>assert.equal(listener({type:'aru-body-download:collect',url:mode==='navigation'?'https://other.test':w.location.href},{id:mode==='sender'?'outside':'test-extension'},reply=>resolve(plain(reply))),true)));
      } finally { w.close(); }
    }
    assert.deepEqual(results[0],results[1]);
    if(mode==='valid') {assert.equal(results[1].ok,true); assert.equal(results[1].result.images.length,1); assert.equal(results[1].result.counts.duplicates,1);}
  }
});

test('생성물은 실제 ESM 빌드 결과와 일치하며 runtime 그래프도 검사한다', async () => {
  assert.deepEqual((await compileCompatibility({check:true})).changed,[]);
  assert.deepEqual((await compileRuntime({check:true})).changed,[]);
});
