'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..'), sourceRoot = process.env.ARU_TAGS_SOURCE_ROOT || root;
const read = file => fs.readFileSync(path.join(file.startsWith('docs/source/') ? sourceRoot : root, file), 'utf8');
function setup(host = 'm', { invalid = false, untagged = false } = {}) {
  const dom = new JSDOM('<div class="view_content" itemprop="articleBody"></div>', {
    url: 'https://' + host + '.ruliweb.com/community/board/98/read/5039', runScripts: 'outside-only', pretendToBeVisual: true
  }), w = dom.window;
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  w.matchMedia = query => ({ matches: query.includes('pointer:coarse') || query.includes('pointer: coarse'), addEventListener() {}, removeEventListener() {} });
  w.HTMLMediaElement.prototype.pause = function () {}; w.HTMLMediaElement.prototype.load = function () {};
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 360; } });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 250; } });
  const A = (() => { for (const name of ['core', 'metadata', 'attribute-tags', 'site-adapter', 'registry', 'catalog', 'library-search', 'ui-preferences', 'picker']) w.eval(read('docs/source/ruliweb-icons/' + name + '.js')); return w.AruIcons; })();
  const body = w.document.querySelector('.view_content');
  for (let i = 0; i < 100; i++) {
    const video = [77, 86, 87].includes(i), media = w.document.createElement(video ? 'video' : 'img');
    media.src = 'https://i1.ruliweb.com/ori/synthetic-' + i + (video ? '.mp4?gif' : '.webp');
    media.setAttribute('data-aru-id', 'synthetic-' + i);
    if (!untagged || i < 50) media.setAttribute('data-aru-tags', invalid && i === 99 ? 'aru-tags:v1:%broken' : A.AttributeTags.encode(['아루', ...(i < 50 ? ['미소'] : ['분노']), '기쁨, 행복']));
    body.append(media);
  }
  const result = A.SiteAdapter.readArticlePack(w.document, 5039, '중립 제목', '98', { diagnostics: true }), ref = { boardId: '98', articleId: 5039, title: '중립 제목', url: w.location.href, source: 'direct' };
  const engine = new A.LibrarySearchEngine(); engine.setEntries([ref]); engine.remember(ref, result.pack); engine.setState({ currentKey: '98:5039' });
  const p = A.createPicker({ librarySearch: engine, catalogMode: false, targetValid: false, uiPreferences: { read: async () => ({}) } });
  p.setPack(result.pack); w.document.body.append(p.element);
  const q = selector => p.shadowRoot.querySelector(selector), event = (element, name, props = {}) => { const e = new w.Event(name, { bubbles: true, cancelable: true }); Object.assign(e, props); element.dispatchEvent(e); };
  return { dom, w, A, result, ref, engine, p, q, event, close() { p.destroy(); engine.destroy(); w.close(); } };
}
test('mobile and PC saved-media collectors decode all 97 images + 3 MP4 tags before indexing', () => {
  for (const host of ['m', 'bbs']) {
    const h = setup(host); try {
      assert.equal(h.result.counts.metadata.media, 100); assert.equal(h.result.counts.metadata.mediaTagAttributes, 100);
      assert.equal(h.result.counts.metadata.mediaDecoded, 100); assert.equal(h.result.counts.taggedIcons, 100);
      assert.equal(h.engine.setState({ query: '아루' }).count, 100); assert.equal(h.p.getSnapshot().metadata.displayedTags, 100);
      assert.ok([...h.p.shadowRoot.querySelectorAll('.icon-tags')].every(node => node.textContent !== '태그 없음'));
    } finally { h.close(); }
  }
});
test('touch-origin clicks on fixed chips commit filters and AND/OR uses exact public tag values without requests', () => {
  const h = setup(); try {
    let requests = 0; h.engine.reader = { getCached: async () => { requests++; return null; }, load: async () => { requests++; throw Error('must not fetch'); } };
    const tap = tag => { const button = h.q('[data-tag-id="' + tag + '"]'); h.event(button, 'pointerdown', { pointerType: 'touch' }); h.event(button, 'pointerup', { pointerType: 'touch' }); h.event(button, 'click', { pointerType: 'touch' }); };
    tap('미소'); assert.equal(h.p.getSnapshot().uniqueCount, 50); assert.equal(h.q('[data-tag-id="미소"]').getAttribute('aria-pressed'), 'true');
    tap('분노'); assert.equal(h.p.getSnapshot().uniqueCount, 100);
    h.q('#tag-match').value = 'all'; h.event(h.q('#tag-match'), 'change'); assert.equal(h.p.getSnapshot().uniqueCount, 0);
    h.q('#tag-match').value = 'any'; h.event(h.q('#tag-match'), 'change'); assert.equal(h.p.getSnapshot().uniqueCount, 100);
    h.p.setQuery('기쁨, 행복'); assert.equal(h.p.getSnapshot().uniqueCount, 100);
    tap(''); assert.equal(h.p.getSnapshot().selectedTagIds.length, 0); assert.equal(requests, 0);
  } finally { h.close(); }
});
test('IME composition end feeds Hangul query; a subsequent chip click commits text still awaiting debounce', async () => {
  const h = setup(); try {
    const input = h.q('.search-input'); h.event(input, 'compositionstart'); input.value = '아루'; h.event(input, 'input'); h.event(input, 'compositionend');
    await new Promise(resolve => setTimeout(resolve, 190)); assert.equal(h.p.getSnapshot().query, '아루'); assert.equal(h.p.getSnapshot().uniqueCount, 100);
    input.value = '분노'; h.event(input, 'input'); h.event(h.q('[data-tag-id="미소"]'), 'click');
    assert.equal(h.p.getSnapshot().query, '분노'); assert.equal(h.p.getSnapshot().uniqueCount, 0);
  } finally { h.close(); }
});
test('missing and malformed metadata remain separate from successful media loading, without fabricated tags', () => {
  const partial = setup('m', { untagged: true }); try {
    assert.equal(partial.result.pack.icons.length, 100); assert.equal(partial.result.counts.metadata.mediaTagAttributes, 50);
    assert.equal(partial.engine.setState({ query: '아루' }).count, 50); assert.equal(partial.engine.setState({ query: '' }).count, 100);
  } finally { partial.close(); }
  const invalid = setup('m', { invalid: true }); try {
    assert.equal(invalid.result.pack.icons.length, 100); assert.equal(invalid.result.counts.metadata.mediaDecodeFailed, 1);
    assert.equal(invalid.engine.setState({ query: '아루' }).count, 99); assert.equal(invalid.result.metadataDiagnostics.mediaDetail[99].reason, 'decode-failed');
  } finally { invalid.close(); }
});
test('new source metadata rebuilds the index and UI while preserving query and unrelated pack tags', () => {
  const h = setup(); try {
    h.p.setQuery('아루'); h.event(h.q('[data-tag-id="미소"]'), 'click');
    const next = structuredClone(h.result.pack); next.icons.forEach(icon => { icon.imageMetadata.tags = ['무츠키', '미소']; icon.keywords = ['무츠키', '미소']; });
    h.engine.remember(h.ref, next, { acquiredAt: Date.now() + 1000 }); h.p.setPack(next);
    assert.equal(h.p.getSnapshot().query, '아루'); assert.equal(h.p.getSnapshot().uniqueCount, 0);
    h.p.setQuery('무츠키'); assert.equal(h.p.getSnapshot().uniqueCount, 100); assert.equal(h.q('.icon-tags').textContent, '무츠키 · 미소');
  } finally { h.close(); }
});
test('read-only tag diagnostic reports public source/control counts without requests, storage or DOM changes', () => {
  const h = setup(); try {
    h.w.fetch = () => { throw Error('must not request'); }; h.w.console.log = () => {};
    const before = h.w.document.documentElement.outerHTML;
    const report = h.w.eval(read('docs/MOBILE-TAGS-READONLY.js'));
    assert.equal(report.body.counts.media, 100); assert.equal(report.body.counts.decoded, 100); assert.equal(report.body.counts.tagged, 100);
    assert.equal(report.picker.tagButtons, 14); assert.equal(report.picker.disabledTags, 0); assert.ok(report.picker.taggedCards > 0);
    assert.equal(h.w.document.documentElement.outerHTML, before); assert.ok(!JSON.stringify(report).includes('rawTags'));
  } finally { h.close(); }
});
