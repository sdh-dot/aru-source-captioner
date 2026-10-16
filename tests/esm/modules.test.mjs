import {normalizeControlBlocks} from "../helpers/normalize-control-blocks.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { parse } from 'acorn';
import * as search from '../../docs/source/ruliweb-icons/core.mjs';
import { createMetadataCore } from '../../docs/source/ruliweb-icons/metadata-core.mjs';
import { createMetadata } from '../../docs/source/ruliweb-icons/metadata.mjs';
import { createBrowserAdapter } from '../../docs/source/ruliweb-icons/browser-adapter.mjs';
import { createSiteAdapter } from '../../docs/source/ruliweb-icons/site-adapter.mjs';
import { createComposerAdapter } from '../../docs/source/ruliweb-icons/composer-adapter.mjs';
import { compileCompatibility } from '../../tools/build-esm.mjs';

const baselines = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy.json', import.meta.url))).baselines;
const environment = { atob, crypto: crypto.webcrypto };
const plain = value => JSON.parse(JSON.stringify(value));
const capture = async action => {
  try { return { ok: true, value: plain(await action()) }; }
  catch (error) { return { ok: false, name: error.name, code: error.code, message: error.message }; }
};
function legacy(namespace, globals = {}) {
  const item = baselines.find(item => item.namespace === namespace && item.name.startsWith('android-upload-attribution/'));
  const context = vm.createContext({ ...environment, URL, TextDecoder, TextEncoder, ...globals });
  vm.runInContext(item.source, context);
  return context.AruIcons;
}
function dom() {
  const instance = new JSDOM('<!doctype html><body></body>', { url: 'https://bbs.ruliweb.com/community/board/98/read/6000', pretendToBeVisual: true });
  instance.window.TextDecoder = TextDecoder;
  instance.window.TextEncoder = TextEncoder;
  return instance;
}
const v1 = { version: 1, name: '아루 & 통합', boardId: 98, mainArticleId: 6000, slaves: [{ page: 1, articleId: 5039, images: ['https://i1.ruliweb.com/ori/a.png?x=1', 'https://i2.ruliweb.com/ori/b.mp4?gif'] }] };
const carrier = value => Buffer.from(JSON.stringify(value)).toString('base64url');

test('동결된 이전 구현의 출처 해시를 검증한다', () => {
  for (const item of baselines) assert.equal(crypto.createHash('sha256').update(item.source).digest('hex'), item.sha256, item.name);
});

test('MAIN 설치 함수의 알고리즘은 의존성 선언을 제외하면 기존 AST와 같다', () => {
  const source = baselines.find(item => item.name === 'android-upload-attribution/firefox/features/icon-metadata/bridge.bundle.js').source;
  const opening = '(function(g){', closing = '})(globalThis);';
  const body = source.slice(source.lastIndexOf(opening) + opening.length, source.lastIndexOf(closing))
    .replace("'use strict';", '').replace('const M=g.AruMetadata,d=g.document;', 'const M={decode,fail,plan},d=g.document;');
  const expected = parse(`function installMetadataEditorBridge(g){${body}}`, { ecmaVersion: 'latest' }).body[0].body;
  const actual = parse(fs.readFileSync(new URL('../../docs/source/icon-metadata/metadata-editor-bridge.mjs', import.meta.url), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' }).body.find(node => node.type === 'ExportNamedDeclaration').declaration.body;
  const canonical = normalizeControlBlocks;
  assert.deepEqual(canonical(actual), canonical(expected));
});

test('모든 신규 ESM import는 DOM·전역 등록·확장 API 없이 완료된다', () => {
  const modules = ['core', 'metadata-core', 'metadata', 'browser-adapter', 'site-adapter', 'composer-adapter'].map(name => new URL(`../../docs/source/ruliweb-icons/${name}.mjs`, import.meta.url).href);
  modules.push(new URL('../../docs/source/icon-metadata/metadata-editor-bridge.mjs', import.meta.url).href);
  const script = `for (const name of ['document','window','chrome','browser','AruIcons','AruMetadata','fetch','localStorage']) Object.defineProperty(globalThis,name,{get(){throw Error(name)},set(){throw Error(name)}}); await Promise.all(${JSON.stringify(modules)}.map(url=>import(url)));`;
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('검색 정규화·토큰·필터 및 정렬 결과가 이전 구현과 같다', () => {
  const old = legacy('search');
  for (const value of [null, '', ' ＡＲＵ\t아루  ', '기쁨\n아루', 25]) {
    assert.equal(search.normalize(value), old.normalize(value));
    assert.deepEqual(plain(search.queryTokens(value)), plain(old.queryTokens(value)));
  }
  const pack = {
    tags: [{ id: 't1', name: '아루' }, { id: 't2', name: '기쁨' }],
    categories: [{ id: 'c1', name: '인사', aliases: ['안녕'] }, { id: 'c2', name: '기타' }],
    sources: [{ sourceId: 's1', title: '원본' }],
    icons: Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, name: `${i % 2 ? 'ＡＲＵ' : '아루'} ${i}`, categoryIds: i % 3 ? ['c1', 'c2'] : [], sourceId: 's1', tagIds: i % 2 ? ['t1', 't2'] : ['t1'], sortOrder: 40 - i }))
  };
  pack.icons.push(pack.icons[0]);
  const before = structuredClone(pack), actual = new search.SearchIndex(pack), expected = new old.SearchIndex(pack);
  const states = [{}, { query: 'ＡＲＵ' }, { query: '안녕' }, { selectedTagIds: ['t1', 't2'], tagMatch: 'all' }, { selectedTagIds: ['t2'], tagMatch: 'any', sort: 'name' }, { categoryFilterIds: ['c2'], sourceFilterIds: ['s1'] }, { sourceFilterIds: ['missing'] }];
  for (let i = 0; i < 40; i++) states.push({ query: String(i), sort: 'name' });
  for (const state of states) {
    assert.deepEqual(plain(actual.search(state)), plain(expected.search(state)));
    assert.equal(search.hasCriteria(state), old.hasCriteria(state));
  }
  assert.equal(actual.cache.size, 32); assert.equal(expected.cache.size, 32);
  assert.deepEqual(pack, before);
});

test('검색 세션 접기 상태와 초기 상태 복원이 같다', () => {
  const old = legacy('search'), actual = new search.FoldState({ a: true }), expected = new old.FoldState({ a: true });
  for (const [method, args] of [['update', [true]], ['toggle', ['a']], ['setAll', [['a', 'b'], true]], ['update', [false]], ['toggle', ['b']], ['dispose', []]]) {
    actual[method](...args); expected[method](...args);
    assert.deepEqual(['a','b'].map(id => actual.isCollapsed(id)), ['a','b'].map(id => expected.isCollapsed(id)));
  }
});

test('v1 raw bytes·모델·경고와 대표 글 바인딩을 보존한다', async () => {
  const actual = createMetadataCore(environment), old = legacy('metadata').Metadata;
  for (const value of [v1, { ...v1, mainArticleId: 0 }, { ...v1, mainArticleId: 5039 }, { ...v1, unknown: true }]) {
    const input = { v1: [carrier(value)] };
    assert.deepEqual(await capture(() => actual.parseCarriers(input, { articleId: 6000, boardId: 98 })), await capture(() => old.parseCarriers(input, { articleId: 6000, boardId: 98 })));
  }
});

test('v2 BUNDLE의 원본 바이트 digest·fallback과 TAGGED 모델을 보존한다', async () => {
  const bytes = Buffer.from(JSON.stringify(v1, null, 2));
  const bundle = {
    format: 'aru-icons', version: 2, kind: 'BUNDLE', boardId: 98, mainArticleId: 6000,
    packId: 'a7bcaec2-eef0-4d88-bc42-a2f471318ed2', revision: 1, name: '아루',
    v1Digest: crypto.createHash('sha256').update(bytes).digest('hex'),
    tags: [{ id: 'greeting', name: '인사' }], categories: [], sources: [{ sourceId: 's1', articleId: 5039, title: '원본' }],
    icons: [{ iconId: '451451d7-31a3-44e5-98cd-816e0b51d3b1', name: '아루', keywords: ['기쁨'], tagIds: ['greeting'], categoryIds: [], sortOrder: 0, origin: { sourceId: 's1', articleId: 5039, originalIndex: 0 }, mediaKind: 'image', ref: { page: 1, index: 0 } }]
  };
  for (const env of [environment, { atob, crypto: undefined }]) {
    const actual = createMetadataCore(env), old = legacy('metadata', env).Metadata;
    for (const digest of [bundle.v1Digest, '0'.repeat(64)]) {
      const input = { v1: [bytes.toString('base64url')], v2: [carrier({ ...bundle, v1Digest: digest })] };
      const result = await actual.parseCarriers(input);
      assert.deepEqual(plain(result), plain(await old.parseCarriers(input)));
      assert.equal(result.metadataVersion, digest === bundle.v1Digest && env.crypto ? 2 : 1);
      assert.equal(result.rawMetadata.v1[0].decodedText, bytes.toString());
    }
  }
  const tagged = structuredClone(bundle); tagged.kind = 'TAGGED'; delete tagged.v1Digest;
  delete tagged.icons[0].ref; tagged.icons[0].media = { kind: 'image', variants: [{ role: 'body', url: v1.slaves[0].images[0] }] };
  const actual = createMetadataCore(environment), old = legacy('metadata').Metadata;
  const result = await actual.parseCarriers({ v2: [carrier(tagged)] });
  assert.equal(result.metadataVersion, 2);
  assert.deepEqual(plain(result), plain(await old.parseCarriers({ v2: [carrier(tagged)] })));
});

test('잘못된 carrier·URL·구조의 오류 name/code/message가 같다', async () => {
  const actual = createMetadataCore(environment), old = legacy('metadata').Metadata;
  for (const value of ['', '%broken', 'not!base64', carrier({}), carrier({ ...v1, version: 9 })]) {
    assert.deepEqual(await capture(() => actual.parseCarrier(value, 1)), await capture(() => old.parseCarrier(value, 1)));
  }
  for (const value of ['https://evil.example/a', 'https://i1.ruliweb.com/a#hash', 'http://i1.ruliweb.com/a', 'https://i1.ruliweb.com/a']) {
    assert.deepEqual(await capture(() => actual.mediaUrl(value)), await capture(() => old.mediaUrl(value)));
  }
});

test('DOM carrier 읽기·HTML 파싱과 잘못된 본문 진단이 같다', async () => {
  const instance = dom();
  try {
    const { window } = instance, actual = createMetadata({ environment: window }).Metadata;
    const old = legacy('metadata', { DOMParser: window.DOMParser }).Metadata;
    for (const body of [`<article class="view_content"><div data-meta="ruricon:v1"><span data-meta="ruricon-state">${carrier(v1)}</span></div></article>`, '<div data-meta="ruricon:v1"></div>', '<div>태그 없음</div>']) {
      assert.deepEqual(await capture(() => actual.parseMetadata(body)), await capture(() => old.parseMetadata(body)));
    }
    assert.deepEqual(await capture(() => actual.readDocumentCarriers(null)), await capture(() => old.readDocumentCarriers(null)));
  } finally { instance.window.close(); }
});

function browserApi(mode) {
  const messages = [], listeners = new Set();
  const data = { enabled: true, aruIconsOptions: { enabled: true, foreign: { retained: 1 } } };
  const result = (value, callback) => mode === 'promise' ? Promise.resolve(value) : callback(value);
  const api = { runtime: { sendMessage(request, callback) { messages.push(request); return result({ ok: true, result: request.action === 'get' ? { rawMetadata: { v1: { $aruIconsBytesV1: 'AQID', byteLength: 3 } } } : { saved: true } }, callback); } }, storage: { sync: { get(_keys, callback) { return result(data, callback); } }, onChanged: { addListener(listener) { listeners.add(listener); }, removeListener(listener) { listeners.delete(listener); } } } };
  return { root: { [mode === 'promise' ? 'browser' : 'chrome']: api, atob, btoa }, messages, listeners, api };
}
for (const mode of ['promise', 'callback']) test(`${mode} 확장 API·바이트 wire 계약·구독 해제가 같다`, async () => {
  const next = browserApi(mode), before = browserApi(mode);
  const actual = createBrowserAdapter(next.root), old = legacy('browser', before.root).BrowserAdapter;
  assert.deepEqual(await capture(() => actual.readOptions()), await capture(() => old.readOptions()));
  const input = { rawMetadata: { v1: new Uint8Array([1,2,3]) } };
  assert.deepEqual(await capture(() => actual.requestCache('put', input)), await capture(() => old.requestCache('put', input)));
  assert.deepEqual(plain(next.messages), plain(before.messages));
  assert.deepEqual(await capture(() => actual.requestCache('get', {})), await capture(() => old.requestCache('get', {})));
  assert.deepEqual(await capture(() => actual.requestCache('unsupported', {})), await capture(() => old.requestCache('unsupported', {})));
  const unsubscribe = actual.onChanged(() => {}); assert.equal(next.listeners.size, 1); unsubscribe(); assert.equal(next.listeners.size, 0);
  assert.deepEqual([...input.rawMetadata.v1], [1,2,3]);
});

test('확장 API 누락·callback lastError를 기존 코드로 보고한다', async () => {
  const actual = createBrowserAdapter({}), old = legacy('browser').BrowserAdapter;
  assert.deepEqual(await capture(() => actual.readOptions()), await capture(() => old.readOptions()));
  const mock = browserApi('callback'); mock.api.runtime.lastError = { message: '실패' };
  assert.equal((await capture(() => createBrowserAdapter(mock.root).readOptions())).code, 'API_ERROR');
});

test('사이트 본문 수집은 이미지 순서·태그 오류·중복과 MP4를 보존한다', async () => {
  const instance = dom();
  try {
    const w = instance.window, metadata = createMetadata({ environment: w }).Metadata;
    const actual = createSiteAdapter({ environment: w, metadata });
    const oldMetadata = legacy('metadata', { DOMParser: w.DOMParser });
    const oldTags = {}; vm.runInNewContext(baselines.find(x => x.namespace === 'reader').source, oldTags);
    const old = legacy('site', { AruIcons: { ...oldMetadata, AttributeTags: oldTags.AruIcons.AttributeTags }, DOMParser: w.DOMParser, AbortController: w.AbortController, location: w.location, document: w.document }).SiteAdapter;
    w.document.body.innerHTML = '<article class="view_content" itemprop="articleBody"><img src="https://i1.ruliweb.com/ori/a.png" data-aru-id="keep" data-aru-tags="아루, 기쁨"><video src="https://i2.ruliweb.com/ori/b.mp4?gif" data-aru-tags="aru-tags:v1:%broken"></video><img src="https://i1.ruliweb.com/ori/a.png"><img src="https://evil.example/a.png"></article>';
    const before = w.document.body.innerHTML;
    assert.deepEqual(await capture(() => actual.readArticlePack(w.document, 6000, '아루', '98', { diagnostics: true })), await capture(() => old.readArticlePack(w.document, 6000, '아루', '98', { diagnostics: true })));
    assert.equal(w.document.body.innerHTML, before);
    assert.deepEqual(await capture(() => actual.readPath(0)), await capture(() => old.readPath(0)));
    await assert.rejects(actual.delay(1, AbortSignal.abort()), { code: 'ABORTED' });
  } finally { instance.window.close(); }
});

test('작성기 선택 모델·동기 문자열 응답·응답 누락 오류를 보존한다', async () => {
  const instance = dom();
  try {
    const w = instance.window, site = createSiteAdapter({ environment: w });
    const actual = createComposerAdapter({ environment: w, site }).ComposerAdapter;
    const old = legacy('composer', { crypto: w.crypto, CustomEvent: w.CustomEvent, MutationObserver: w.MutationObserver, AbortController: w.AbortController, AruIcons: { SiteAdapter: site } }).ComposerAdapter;
    for (const icon of [{ url: 'a', mediaKind: 'animated' }, { variants: [{ role: 'body', url: 'body' }, { role: 'selection', url: 'selection', kind: 'image' }] }]) assert.deepEqual(plain(actual.selectedMedia(icon)), plain(old.selectedMedia(icon)));
    const requests = [];
    const respond = event => { const request = JSON.parse(event.detail); requests.push(request); w.document.dispatchEvent(new w.CustomEvent('aru-icons-composer-response-v1', { detail: JSON.stringify({ requestId: request.requestId, ok: true, result: { session: 'retained' } }) })); };
    w.document.addEventListener('aru-icons-composer-request-v1', respond);
    assert.deepEqual(await capture(() => actual.request(w.document, 'capture', { token: 'kept' })), await capture(() => old.request(w.document, 'capture', { token: 'kept' })));
    assert.equal(requests[0].op, 'capture'); assert.equal(requests[0].token, 'kept'); assert.equal(typeof requests[0].requestId, 'string');
    w.document.removeEventListener('aru-icons-composer-request-v1', respond);
    assert.deepEqual(await capture(() => actual.request(w.document, 'capture')), await capture(() => old.request(w.document, 'capture')));
  } finally { instance.window.close(); }
});

test('ESM에서 생성한 호환 스크립트가 현재 파일과 일치한다', async () => {
  const result = await compileCompatibility({ check: true }); assert.equal(result.changed.length, 0);
});
