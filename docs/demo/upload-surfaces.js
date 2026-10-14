// Only local synthetic data and local assets; never send files to Ruliweb.
(async () => {
  const params = new URLSearchParams(location.search), view = params.get('view') || 'controls';
  const base = new URL('../../', location.href);
  window.chrome = { runtime: { getURL: file => new URL('whale/' + file, base).href } };
  window.__aruMetadataNoAutoStart = window.__aruBundleNoAutoStart = window.__aruUploadNoAutoStart = true;
  if (params.get('theme') === 'dark') document.body.dataset.theme = 'dark';
  const load = file => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = new URL(file, base).href; s.onload = resolve; s.onerror = reject; document.head.append(s); });
  for (const file of ['whale/features/icon-metadata/content.bundle.js', 'whale/features/bundle-generator/content.bundle.js', 'docs/source/upload-attribution/ui.js']) await load(file);
  const A = window.AruIcons, M = window.AruMetadata, B = window.AruBundle;
  const nativeButton = document.querySelector('#native-upload'); let calls = 0;
  nativeButton.addEventListener('click', () => document.querySelector('#native-result').textContent = '기존 클릭 이벤트 ' + (++calls) + '회 확인 · 실제 파일 선택기/업로드를 실행하지 않음');
  new window.AruUploadUI(document);
  const c = new A.ComposerController({ document, onOpen: () => {} }); c.start();
  const m = new M.Controller({ document }); m.client.request = async () => ({ images: 97, videos: 3, total: 100, policyImages: 97, limit: null }); m.active = true; m.discover();
  const b = new B.Controller({ document }); b.active = true; b.discover();
  const media = new URL('media/sample-0.png', location.href).href;
  if (view === 'tags') {
    const data = { session: 'synthetic-tags', collisions: 0, canUndo: false, canRedo: false, images: Array.from({ length: 100 }, (_, index) => ({ handle: 'synthetic-' + index, index, alt: '샘플 ' + index, src: media, id: 'id-' + index, tags: ['아루', '미소'] })) };
    new M.Panel({ document, client: { request: async op => op === 'scan' ? data : {} }, token: 'synthetic', onClose() {} });
  } else if (view === 'bundle') {
    const client = { request: async op => op === 'scan' ? { session: 'synthetic-bundle', articleId: null, value: null } : { changed: false } };
    new B.Panel({ document, client, token: 'synthetic', reader: { pending: new Map(), read: async () => { throw new Error('실제 사이트 조회 없음'); }, cancel() {}, destroy() {} },
      searcher: { search: async () => ({ items: [] }), cancel() {}, destroy() {} }, browser: { saveDraft: async () => {}, loadDraft: async () => new B.Draft() }, onClose() {} });
  } else if (view === 'select') {
    await load('docs/source/ruliweb-icons/picker.js');
    // Explicit local fixture URL policy. Not packaged in the extension.
    const original = A.Metadata.mediaUrl;
    A.Metadata = { ...A.Metadata, mediaUrl: value => value.startsWith(location.origin + '/docs/demo/media/') ? value : original(value) };
    const pack = { kind: 'BUNDLE', articleId: 6000, title: '합성 샘플 통합팩', tags: [], categories: [], sources: [], icons: Array.from({ length: 608 }, (_, index) => ({ id: 'synthetic-' + index, name: '샘플 ' + (index + 1), url: media + '?index=' + index, mediaKind: 'image', tagIds: [], categoryIds: [], keywords: [], sourceId: 'synthetic-source', origin: { articleId: 6001, originalIndex: index }, imageMetadata: { id: 'synthetic-' + index, tags: ['아루', index % 2 ? '미소' : '인사'] } })) };
    const engine=new A.LibrarySearchEngine();
    const ref={articleId:6000,boardId:'98',source:'direct',title:pack.title,url:'https://bbs.ruliweb.com/community/board/98/read/6000'};
    engine.setEntries([ref]);engine.remember(ref,pack);engine.setState({scope:'current',currentKey:'98:6000'});
    const picker = A.createPicker({ librarySearch:engine, insertionMode: true, targetValid: true, catalogMode: false, uiPreferences: { read: async () => null, write: async () => {} }, onSelect: async () => ({ message: '로컬 콜백 확인 · 실제 작성기 변경 없음' }) });
    picker.setPack(pack);
  }
})().catch(error => document.querySelector('#native-result').textContent = '합성 화면 오류: ' + error.message);
