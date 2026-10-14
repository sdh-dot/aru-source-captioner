/* source: shared/ruliweb-icons/core.js */
(function (global) {
  'use strict';
  const api = global.AruIcons = global.AruIcons || {};

  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFKC').toLocaleLowerCase('ko-KR').trim().replace(/\s+/gu, ' ');
  }
  function queryTokens(query) { return [...new Set(normalize(query).split(' ').filter(Boolean))]; }
  function hasCriteria(state = {}) {
    return queryTokens(state.query).length > 0 || ['selectedTagIds', 'categoryFilterIds', 'sourceFilterIds'].some(key => Array.isArray(state[key]) && state[key].length > 0);
  }

  class SearchIndex {
    constructor(pack = {}) {
      this.pack = pack;
      this.groups = [];
      this.tagIndex = new Map();
      this.cache = new Map();
      const tags = new Map((pack.tags || []).map(tag => [tag.id, tag.name]));
      const categories = new Map((pack.categories || []).map(cat => [cat.id, cat]));
      const sources = new Map((pack.sources || []).map(source => [source.sourceId, source]));
      const groupMap = new Map();
      const makeGroup = (id, name, aliases, sourceId) => {
        if (!groupMap.has(id)) {
          const group = { id, name, aliases: aliases || [], sourceId, entries: [], seen: new Set(), fields: [name, ...(aliases || [])].map(normalize) };
          groupMap.set(id, group);
          this.groups.push(group);
        }
        return groupMap.get(id);
      };
      for (const category of categories.values()) makeGroup(category.id, category.name, category.aliases || []);
      const seenIcons = new Set();
      for (const [position, icon] of (pack.icons || []).entries()) {
        const id = icon.id || icon.iconId;
        if (!id || seenIcons.has(id)) continue;
        seenIcons.add(id);
        const sourceId = icon.sourceId || (icon.origin && icon.origin.sourceId) || 'unclassified';
        const tagIds = new Set(icon.tagIds || []);
        const entry = { icon, id, position, sourceId, tagIds, fields: [icon.name, ...(icon.keywords || []), ...[...tagIds].map(tag => tags.get(tag) || '')].map(normalize) };
        for (const tag of tagIds) {
          if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
          this.tagIndex.get(tag).add(id);
        }
        const memberships = [...new Set(icon.categoryIds || [])].filter(cat => categories.has(cat));
        const groups = memberships.length ? memberships.map(cat => groupMap.get(cat)) : [makeGroup('source:' + sourceId, sources.get(sourceId)?.title || (icon.origin?.articleId ? '원본 글 ' + icon.origin.articleId : '미분류'), [], sourceId)];
        for (const group of groups) {
          if (group.seen.has(id)) continue;
          group.seen.add(id);
          group.entries.push(entry);
        }
      }
      this.groups = this.groups.filter(group => group.entries.length);
      this.iconCount = seenIcons.size;
      this.membershipCount = this.groups.reduce((sum, group) => sum + group.entries.length, 0);
    }

    search(state = {}) {
      const tokens = queryTokens(state.query);
      const selected = [...new Set(state.selectedTagIds || [])].sort();
      const categoryIds = new Set(state.categoryFilterIds || []);
      const sourceIds = new Set(state.sourceFilterIds || []);
      const mode = state.tagMatch === 'all' ? 'all' : 'any';
      const sort = state.sort || 'source';
      const key = JSON.stringify([tokens, selected, mode, [...categoryIds].sort(), [...sourceIds].sort(), sort]);
      if (this.cache.has(key)) return this.cache.get(key);
      let tagCandidates = null;
      if (selected.length) {
        const sets = selected.map(tag => this.tagIndex.get(tag) || new Set());
        tagCandidates = mode === 'all' ? new Set([...sets[0]].filter(id => sets.every(set => set.has(id)))) : new Set(sets.flatMap(set => [...set]));
      }
      const unique = new Set();
      let membershipCount = 0;
      const groups = [];
      for (const group of this.groups) {
        if (categoryIds.size && !categoryIds.has(group.id)) continue;
        const groupMatches = tokens.map(token => group.fields.some(field => field.includes(token)));
        const matches = group.entries.filter(entry => {
          if (tagCandidates && !tagCandidates.has(entry.id)) return false;
          if (sourceIds.size && !sourceIds.has(entry.sourceId)) return false;
          return tokens.every((token, index) => groupMatches[index] || entry.fields.some(field => field.includes(token)));
        });
        if (!matches.length) continue;
        matches.sort((a, b) => sort === 'name' ? String(a.icon.name).localeCompare(String(b.icon.name), 'ko-KR') || a.position - b.position : (a.icon.sortOrder ?? a.position) - (b.icon.sortOrder ?? b.position) || a.position - b.position);
        for (const entry of matches) unique.add(entry.id);
        membershipCount += matches.length;
        groups.push({ id: group.id, name: group.name, aliases: group.aliases, sourceId: group.sourceId, icons: matches.map(entry => entry.icon), count: matches.length });
      }
      const result = { groups, uniqueCount: unique.size, membershipCount, active: hasCriteria(state) };
      if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, result);
      return result;
    }
  }

  class FoldState {
    constructor(baseCollapsed = {}) {
      this.baseCollapsed = baseCollapsed instanceof Map ? new Map(baseCollapsed) : new Map(Object.entries(baseCollapsed));
      this.searchSession = null;
    }
    update(active) {
      if (active && !this.searchSession) this.searchSession = { snapshot: new Map(this.baseCollapsed), overrides: new Map() };
      if (!active && this.searchSession) this.reset();
      return this;
    }
    isCollapsed(id) {
      return this.searchSession ? !!this.searchSession.overrides.get(id) : !!this.baseCollapsed.get(id);
    }
    toggle(id) {
      const collapsed = !this.isCollapsed(id);
      (this.searchSession ? this.searchSession.overrides : this.baseCollapsed).set(id, collapsed);
      return collapsed;
    }
    setAll(ids, collapsed) {
      const target = this.searchSession ? this.searchSession.overrides : this.baseCollapsed;
      for (const id of ids) target.set(id, !!collapsed);
    }
    reset() {
      if (this.searchSession) this.baseCollapsed = new Map(this.searchSession.snapshot);
      this.searchSession = null;
      return this;
    }
    dispose() { return this.reset(); }
  }

  Object.assign(api, { normalize, queryTokens, hasCriteria, SearchIndex, FoldState });
})(globalThis);


/* source: shared/ruliweb-icons/metadata.js */
(function (global) {
  'use strict';
  const api = global.AruIcons = global.AruIcons || {};
  const LIMITS = Object.freeze({ decodedBytes: 1048576, icons: 10000, sources: 512 });
  const LOCAL_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const MEDIA_KINDS = ['image', 'video', 'animated', 'unknown'];

  class MetadataError extends Error {
    constructor(code, message) { super(message); this.name = 'MetadataError'; this.code = code; }
  }
  function fail(code, message) { throw new MetadataError(code, message); }
  function object(value, label, allowed, required = allowed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_STRUCTURE', label + ': 객체가 필요합니다.');
    if (allowed && Object.keys(value).some(key => !allowed.includes(key))) fail('UNKNOWN_FIELD', label + ': 지원하지 않는 필드가 있습니다.');
    if (required.some(key => !Object.prototype.hasOwnProperty.call(value, key))) fail('MISSING_FIELD', label + ': 필수 필드가 없습니다.');
  }
  function integer(value, min, max, label) {
    if (!Number.isSafeInteger(value) || value < min || value > max) fail('INVALID_NUMBER', label + ': 숫자 범위가 올바르지 않습니다.');
  }
  function text(value, min, max, label) {
    if (typeof value !== 'string' || [...value].length < min || [...value].length > max || (min && !value.trim())) fail('INVALID_TEXT', label + ': 텍스트 길이/내용이 올바르지 않습니다.');
  }
  function array(value, min, max, label, unique = false) {
    if (!Array.isArray(value) || value.length < min || value.length > max) fail('INVALID_ARRAY', label + ': 항목 수가 올바르지 않습니다.');
    if (unique && new Set(value.map(item => JSON.stringify(item))).size !== value.length) fail('DUPLICATE_VALUE', label + ': 중복 항목이 있습니다.');
  }
  function localId(value, label) {
    if (typeof value !== 'string' || !LOCAL_ID.test(value)) fail('INVALID_ID', label + ': 식별자가 올바르지 않습니다.');
  }
  function articleId(value, label) { integer(value, 1, Number.MAX_SAFE_INTEGER, label); }
  function uuid(value, label) {
    if (typeof value !== 'string' || !UUID.test(value)) fail('INVALID_ID', label + ': UUID가 올바르지 않습니다.');
  }
  function mediaUrl(value) {
    if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value) || !/^https:\/\/i[123]\.ruliweb\.com\//u.test(value)) fail('UNSAFE_URL', '허용된 HTTPS 루리웹 CDN URL이 아닙니다.');
    let parsed;
    try { parsed = new URL(value); } catch (_) { fail('UNSAFE_URL', '미디어 URL을 해석할 수 없습니다.'); }
    if (parsed.protocol !== 'https:' || !/^i[123]\.ruliweb\.com$/u.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.hash) fail('UNSAFE_URL', '미디어 URL에 허용되지 않은 주소 요소가 있습니다.');
    return value;
  }
  function publicArticleUrl(id, mobile = false) {
    articleId(id, 'articleId');
    return 'https://' + (mobile ? 'm' : 'bbs') + '.ruliweb.com/community/board/98/read/' + id;
  }

  function decodeCarrier(encoded) {
    if (typeof encoded !== 'string' || encoded.length > Math.ceil(LIMITS.decodedBytes * 4 / 3) + 65536) fail('RESOURCE_LIMIT', '메타데이터 크기 상한을 초과했습니다.');
    const compact = encoded.replace(/\s/gu, '');
    if (!compact || !/^[A-Za-z0-9_+\/-]+={0,2}$/u.test(compact)) fail('INVALID_BASE64', '메타데이터 base64 형식이 올바르지 않습니다.');
    const unpadded = compact.replace(/=+$/u, '').replace(/-/gu, '+').replace(/_/gu, '/');
    if (unpadded.length % 4 === 1) fail('INVALID_BASE64', '메타데이터 base64 길이가 올바르지 않습니다.');
    const padded = unpadded + '='.repeat((4 - unpadded.length % 4) % 4);
    let binary;
    try { binary = global.atob(padded); } catch (_) { fail('INVALID_BASE64', '메타데이터를 디코딩할 수 없습니다.'); }
    if (binary.length > LIMITS.decodedBytes) fail('RESOURCE_LIMIT', '메타데이터 decoded 크기 상한을 초과했습니다.');
    const decodedBytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    let decodedText;
    try { decodedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes); } catch (_) { fail('INVALID_UTF8', '메타데이터가 올바른 UTF-8이 아닙니다.'); }
    let value;
    try { value = JSON.parse(decodedText); } catch (_) { fail('INVALID_JSON', '메타데이터 JSON을 해석할 수 없습니다.'); }
    return { encoded, decodedText, decodedBytes, value };
  }

  function validateV1(value, { allowUnbound = false } = {}) {
    object(value, 'v1', null, ['version', 'name', 'boardId', 'mainArticleId', 'slaves']);
    if (value.version !== 1) fail('UNSUPPORTED_VERSION', '지원하지 않는 ruricon 버전입니다.');
    if (value.boardId !== 98) fail('INVALID_BOARD', '아이콘 게시판 98의 메타데이터가 아닙니다.');
    text(value.name, 1, 120, 'v1.name');
    if (!(allowUnbound && value.mainArticleId === 0)) articleId(value.mainArticleId, 'v1.mainArticleId');
    array(value.slaves, 1, LIMITS.sources, 'v1.slaves');
    const pages = new Set();
    let count = 0;
    for (const slave of value.slaves) {
      object(slave, 'v1.slave', null, ['page', 'articleId', 'images']);
      integer(slave.page, 1, 512, 'v1.page');
      if (pages.has(slave.page)) fail('DUPLICATE_PAGE', '통합팩의 page가 중복되었습니다.');
      pages.add(slave.page);
      articleId(slave.articleId, 'v1.articleId');
      array(slave.images, 0, LIMITS.icons, 'v1.images');
      count += slave.images.length;
      if (count > LIMITS.icons) fail('RESOURCE_LIMIT', '통합팩 아이콘 수 상한을 초과했습니다.');
      slave.images.forEach(mediaUrl);
    }
    if (!count) fail('EMPTY_PACK', '통합팩에 선언된 아이콘이 없습니다.');
    return value;
  }

  function validateV2(value) {
    object(value, 'v2', ['format', 'version', 'kind', 'packId', 'boardId', 'mainArticleId', 'revision', 'name', 'description', 'v1Digest', 'tags', 'categories', 'sources', 'icons'], ['format', 'version', 'kind', 'packId', 'boardId', 'mainArticleId', 'revision', 'name', 'tags', 'categories', 'sources', 'icons']);
    if (value.format !== 'aru-icons' || value.version !== 2) fail('UNSUPPORTED_VERSION', '지원하지 않는 aru-icons 형식/버전입니다.');
    if (!['TAGGED', 'BUNDLE'].includes(value.kind)) fail('INVALID_KIND', '지원하지 않는 아이콘팩 유형입니다.');
    if (value.boardId !== 98) fail('INVALID_BOARD', '아이콘 게시판 98의 메타데이터가 아닙니다.');
    uuid(value.packId, 'packId');
    articleId(value.mainArticleId, 'mainArticleId');
    integer(value.revision, 1, 2147483647, 'revision');
    text(value.name, 1, 120, 'name');
    if ('description' in value) text(value.description, 0, 2000, 'description');
    if (value.kind === 'BUNDLE') {
      if (typeof value.v1Digest !== 'string' || !/^[0-9a-f]{64}$/u.test(value.v1Digest)) fail('INVALID_DIGEST', 'BUNDLE의 v1Digest가 올바르지 않습니다.');
    } else if ('v1Digest' in value) fail('INVALID_DIGEST', 'TAGGED에는 v1Digest를 둘 수 없습니다.');
    const labelMap = (values, category) => {
      array(values, 0, 512, category ? 'categories' : 'tags');
      const map = new Map();
      for (const label of values) {
        object(label, 'label', category ? ['id', 'name', 'aliases'] : ['id', 'name'], ['id', 'name']);
        localId(label.id, 'label.id'); text(label.name, 1, 80, 'label.name');
        if (map.has(label.id)) fail('DUPLICATE_ID', '태그/카테고리 ID가 중복되었습니다.');
        if (category && 'aliases' in label) {
          array(label.aliases, 0, 32, 'aliases', true);
          label.aliases.forEach(alias => text(alias, 1, 80, 'alias'));
        }
        map.set(label.id, label);
      }
      return map;
    };
    const tags = labelMap(value.tags, false);
    const categories = labelMap(value.categories, true);
    array(value.sources, 1, LIMITS.sources, 'sources');
    const sources = new Map();
    for (const source of value.sources) {
      object(source, 'source', ['sourceId', 'articleId', 'title']);
      localId(source.sourceId, 'sourceId'); articleId(source.articleId, 'source.articleId'); text(source.title, 1, 200, 'source.title');
      if (sources.has(source.sourceId)) fail('DUPLICATE_ID', '출처 ID가 중복되었습니다.');
      sources.set(source.sourceId, source);
    }
    const origin = item => {
      object(item, 'origin', ['sourceId', 'articleId', 'originalIndex']);
      localId(item.sourceId, 'origin.sourceId'); articleId(item.articleId, 'origin.articleId'); integer(item.originalIndex, 0, 9999, 'origin.originalIndex');
      if (!sources.has(item.sourceId) || sources.get(item.sourceId).articleId !== item.articleId) fail('INVALID_REFERENCE', '아이콘 출처 참조가 올바르지 않습니다.');
    };
    const variants = items => {
      array(items, 1, 8, 'variants');
      for (const variant of items) {
        object(variant, 'variant', ['role', 'url', 'articleId'], ['role', 'url']);
        if (!['body', 'editor', 'selection', 'thumbnail'].includes(variant.role)) fail('INVALID_ROLE', '미디어 variant 역할이 올바르지 않습니다.');
        mediaUrl(variant.url);
        if ('articleId' in variant) articleId(variant.articleId, 'variant.articleId');
      }
    };
    array(value.icons, 1, LIMITS.icons, 'icons');
    const ids = new Set();
    const refs = new Set();
    for (const icon of value.icons) {
      object(icon, 'icon', ['iconId', 'name', 'keywords', 'tagIds', 'categoryIds', 'sortOrder', 'origin', 'mediaKind', 'alsoFrom', 'ref', 'media', 'variants', 'publishedSlot'], ['iconId', 'name', 'keywords', 'tagIds', 'categoryIds', 'sortOrder', 'origin', 'mediaKind']);
      uuid(icon.iconId, 'iconId'); text(icon.name, 1, 120, 'icon.name'); integer(icon.sortOrder, -1000000000, 1000000000, 'sortOrder');
      if (ids.has(icon.iconId)) fail('DUPLICATE_ID', '아이콘 ID가 중복되었습니다.');
      ids.add(icon.iconId);
      array(icon.keywords, 0, 32, 'keywords', true); icon.keywords.forEach(keyword => text(keyword, 1, 80, 'keyword'));
      for (const [key, maximum, dictionary] of [['tagIds', 64, tags], ['categoryIds', 32, categories]]) {
        array(icon[key], 0, maximum, key, true);
        for (const id of icon[key]) { localId(id, key); if (!dictionary.has(id)) fail('INVALID_REFERENCE', key + ': 존재하지 않는 참조입니다.'); }
      }
      origin(icon.origin);
      if (!MEDIA_KINDS.includes(icon.mediaKind)) fail('INVALID_MEDIA', '아이콘 미디어 유형이 올바르지 않습니다.');
      if ('alsoFrom' in icon) { array(icon.alsoFrom, 1, 64, 'alsoFrom', true); icon.alsoFrom.forEach(origin); }
      if ('variants' in icon) variants(icon.variants);
      if ('publishedSlot' in icon) {
        object(icon.publishedSlot, 'publishedSlot', ['articleId', 'index']);
        articleId(icon.publishedSlot.articleId, 'publishedSlot.articleId'); integer(icon.publishedSlot.index, 0, 9999, 'publishedSlot.index');
      }
      if (value.kind === 'BUNDLE') {
        if ('media' in icon) fail('INVALID_MEDIA', 'BUNDLE 아이콘에는 media를 둘 수 없습니다.');
        object(icon.ref, 'ref', ['page', 'index']); integer(icon.ref.page, 1, 512, 'ref.page'); integer(icon.ref.index, 0, 9999, 'ref.index');
        const slot = icon.ref.page + ':' + icon.ref.index;
        if (refs.has(slot)) fail('DUPLICATE_REFERENCE', 'BUNDLE metadata 슬롯이 중복되었습니다.');
        refs.add(slot);
      } else {
        if ('ref' in icon) fail('INVALID_MEDIA', 'TAGGED 아이콘에는 ref를 둘 수 없습니다.');
        object(icon.media, 'media', ['kind', 'variants']);
        if (!MEDIA_KINDS.includes(icon.media.kind) || icon.media.kind !== icon.mediaKind) fail('INVALID_MEDIA', 'media.kind와 mediaKind가 다릅니다.');
        variants(icon.media.variants);
      }
    }
    return value;
  }

  function parseCarrier(encoded, options = {}) {
    const decoded = decodeCarrier(encoded);
    const type = options.type || (decoded.value?.format === 'aru-icons' ? 'v2' : 'v1');
    if (type === 'v1' || type === 'ruricon:v1') validateV1(decoded.value);
    else if (type === 'v2' || type === 'aru-icons:v2') validateV2(decoded.value);
    else fail('UNKNOWN_CARRIER', '지원하지 않는 carrier입니다.');
    return decoded;
  }
  function urlKey(url) {
    // This is only a local occurrence key; original URL and origin stay in the model.
    let hash = 2166136261;
    for (let i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  }
  function fromV1(value) {
    const sources = new Map();
    const icons = [];
    for (const slave of value.slaves) {
      const sourceId = 'source-' + slave.articleId;
      if (!sources.has(sourceId)) sources.set(sourceId, { sourceId, articleId: slave.articleId, title: '원본 글 ' + slave.articleId, availability: 'declared' });
      for (const [index, url] of slave.images.entries()) {
        const id = ['v1', value.mainArticleId, slave.articleId, slave.page, index, urlKey(url)].join(':');
        icons.push({ id, iconId: id, name: '아이콘 ' + (index + 1), keywords: [], tagIds: [], categoryIds: [], sourceId, url, mediaKind: 'unknown', variants: [{ role: 'body', url, articleId: slave.articleId }], sortOrder: icons.length, origin: { sourceId, articleId: slave.articleId, originalIndex: index }, ref: { page: slave.page, index }, availability: 'declared' });
      }
    }
    return { kind: 'BUNDLE', metadataVersion: 1, packId: 'v1:' + value.boardId + ':' + value.mainArticleId, name: value.name, boardId: value.boardId, mainArticleId: value.mainArticleId, categories: [], tags: [], sources: [...sources.values()], icons };
  }
  function preferredUrl(variants) {
    for (const role of ['selection', 'editor', 'body', 'thumbnail']) { const found = variants.find(variant => variant.role === role); if (found) return found.url; }
    return variants[0].url;
  }
  function fromTagged(value) {
    return { ...value, metadataVersion: 2, categories: value.categories.map(category => ({ ...category, aliases: category.aliases || [] })), icons: value.icons.map(icon => ({ ...icon, id: icon.iconId, sourceId: icon.origin.sourceId, variants: icon.media.variants, url: preferredUrl(icon.media.variants) })) };
  }
  async function sha256(bytes) {
    if (!global.crypto?.subtle) fail('DIGEST_UNAVAILABLE', 'SHA-256 검증을 실행할 수 없어 v1으로 표시합니다.');
    const digest = await global.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function fromBundle(value, v1) {
    if (value.mainArticleId !== v1.value.mainArticleId || value.boardId !== v1.value.boardId) fail('BUNDLE_ID_MISMATCH', 'v1과 v2 대표 글 식별자가 다릅니다.');
    if (await sha256(v1.decodedBytes) !== value.v1Digest) fail('DIGEST_MISMATCH', 'v1 원본 바이트와 v2 digest가 일치하지 않습니다.');
    const pages = new Map(v1.value.slaves.map(slave => [slave.page, slave]));
    for (const icon of value.icons) {
      const slave = pages.get(icon.ref.page);
      if (!slave || icon.ref.index >= slave.images.length) fail('INVALID_REFERENCE', 'v2 ref가 v1 아이콘 범위를 벗어났습니다.');
    }
    const base = fromV1(v1.value);
    const overrides = new Map(value.icons.map(icon => [icon.ref.page + ':' + icon.ref.index, icon]));
    const icons = base.icons.map(icon => {
      const metadata = overrides.get(icon.ref.page + ':' + icon.ref.index);
      if (!metadata) return icon;
      const variants = metadata.variants || icon.variants;
      return { ...metadata, id: metadata.iconId, sourceId: metadata.origin.sourceId, url: icon.url, variants, declaredUrl: icon.url, availability: 'declared' };
    });
    const usedSources = new Set(icons.map(icon => icon.sourceId));
    const sources = new Map(base.sources.map(source => [source.sourceId, source]));
    value.sources.forEach(source => sources.set(source.sourceId, source));
    return { ...value, metadataVersion: 2, categories: value.categories.map(category => ({ ...category, aliases: category.aliases || [] })), sources: [...sources.values()].filter(source => usedSources.has(source.sourceId) || value.sources.some(item => item.sourceId === source.sourceId)), icons };
  }

  async function parseCarriers(carriers = {}, options = {}) {
    const warnings = [];
    const rawMetadata = { v1: [], v2: [] };
    const decoded = {};
    for (const type of ['v1', 'v2']) {
      const entries = Array.isArray(carriers[type]) ? carriers[type] : [];
      rawMetadata[type] = entries.map(encoded => ({ encoded: typeof encoded === 'string' ? encoded : '', decodedText: null, decodedBytes: null }));
      if (entries.length > 1) { warnings.push({ code: 'DUPLICATE_CARRIER', message: type + ' carrier가 여러 개여서 해당 metadata를 사용하지 않습니다.' }); continue; }
      if (!entries.length) continue;
      try {
        const raw = decodeCarrier(entries[0]);
        rawMetadata[type][0] = { encoded: raw.encoded, decodedText: raw.decodedText, decodedBytes: raw.decodedBytes };
        // Zero is an explicit r2 unbound representative, never a guessed ID.
        // Only a known saved board98 read context may bind it for the model.
        if (type === 'v1') validateV1(raw.value, {allowUnbound: options.boardId === 98 && Number.isSafeInteger(options.articleId) && options.articleId > 0}); else validateV2(raw.value);
        decoded[type] = raw;
      } catch (error) { warnings.push({ code: error.code || 'INVALID_METADATA', message: error.message }); }
    }
    let pack = null;
    let metadataVersion = null;
    if (decoded.v2) {
      try {
        if (decoded.v2.value.kind === 'TAGGED') pack = fromTagged(decoded.v2.value);
        else {
          if (!decoded.v1) fail('MISSING_V1', 'BUNDLE v2의 유효한 원본 v1을 찾을 수 없습니다.');
          pack = await fromBundle(decoded.v2.value, decoded.v1);
        }
        metadataVersion = 2;
      } catch (error) { warnings.push({ code: error.code || 'INVALID_METADATA', message: error.message }); }
    }
    if (!pack && decoded.v1) {
      let value = decoded.v1.value;
      if (value.mainArticleId === 0) {
        value = {...value, mainArticleId: options.articleId};
        if (value.slaves.some(slave => slave.articleId === value.mainArticleId)) {
          warnings.push({code:'SELF_REFERENCE',message:'현재 글을 원본으로 참조하는 통합팩은 읽을 수 없습니다.'});
          value = null;
        } else warnings.push({code:'REPRESENTATIVE_BOUND',message:'신규 통합팩의 대표 번호를 현재 저장된 글 번호로 판독했습니다. 원본 저장값 0은 변경하지 않습니다.'});
      }
      if (value) {pack = fromV1(value); metadataVersion = 1;}
    }
    if (pack && options.articleId != null && Number(options.articleId) !== pack.mainArticleId) warnings.push({ code: 'ARTICLE_ID_MISMATCH', message: '현재 글 ID와 metadata의 대표 글 ID가 다릅니다. 원본 metadata는 수정하지 않습니다.' });
    if (pack && options.boardId != null && Number(options.boardId) !== pack.boardId) warnings.push({ code: 'BOARD_ID_MISMATCH', message: '현재 게시판과 metadata의 게시판 ID가 다릅니다.' });
    return { kind: pack ? pack.kind : 'NORMAL', metadataVersion, pack, warnings, limited: !pack && warnings.length > 0, rawMetadata, v1Slaves: decoded.v1 ? decoded.v1.value.slaves.map(slave => ({ page: slave.page, articleId: slave.articleId, images: [...slave.images], url: publicArticleUrl(slave.articleId) })) : [] };
  }

  function readDocumentCarriers(root) {
    if (!root || typeof root.querySelectorAll !== 'function') fail('INVALID_DOCUMENT', '읽을 수 있는 DOM이 필요합니다.');
    const result = { v1: [], v2: [] };
    for (const [type, marker, stateMarker] of [['v1', 'ruricon:v1', 'ruricon-state'], ['v2', 'aru-icons:v2', 'aru-icons-state']]) {
      const markers = [...root.querySelectorAll('[data-meta="' + marker + '"]')];
      if (root.matches?.('[data-meta="' + marker + '"]')) markers.unshift(root);
      for (const markerNode of markers) {
        const states = [...markerNode.querySelectorAll('[data-meta="' + stateMarker + '"]')];
        if (states.length === 1) result[type].push(states[0].textContent || '');
        else if (states.length === 0) result[type].push('');
        else result[type].push(...states.map(node => node.textContent || ''));
      }
    }
    return result;
  }
  async function parseDocument(root, options = {}) { return parseCarriers(readDocumentCarriers(root), options); }
  async function parseMetadata(rootOrHtml, options = {}) {
    if (typeof rootOrHtml !== 'string') return parseDocument(rootOrHtml, options);
    if (typeof global.DOMParser !== 'function') fail('DOM_PARSER_UNAVAILABLE', 'HTML 판독에는 DOMParser가 필요합니다. 데이터 테스트는 parseCarriers를 사용하세요.');
    if (rootOrHtml.length > 8 * LIMITS.decodedBytes) fail('RESOURCE_LIMIT', '본문 HTML의 로컬 처리 상한을 초과했습니다.');
    // Inert document only: never attach article HTML, script, style or events to the page.
    const doc = new global.DOMParser().parseFromString(rootOrHtml, 'text/html');
    const body = doc.querySelector('.view_content') || doc.querySelector('[itemprop="articleBody"]') || doc.body;
    return parseDocument(body, options);
  }

  Object.assign(api, { MetadataError, Metadata: Object.freeze({ supportsUnboundV1: true, LIMITS, mediaUrl, publicArticleUrl, decodeCarrier, validateV1, validateV2, parseCarrier, parseCarriers, parseDocument, parseMetadata, readDocumentCarriers, fromV1, fromTagged, sha256 }) });
})(globalThis);


/* source: shared/ruliweb-icons/attribute-tags.js */
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


/* source: shared/ruliweb-icons/browser-adapter.js */
/* Aru Source Captioner: callback/Promise extension APIs. No settings are written here. */
(function (root) {
  "use strict";
  const namespace = root.AruIcons = root.AruIcons || {};
  const defaults = Object.freeze({ enabled: false, autoLoad: true, preferredSort: "source", localOverlay: true });
  const promiseApi = typeof root.browser !== "undefined" && root.browser.runtime && root.browser.storage;
  const api = promiseApi ? root.browser : root.chrome;

  function failure(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  // Chromium messages serialize JSON; Firefox is deliberately sent the same byte-safe representation.
  const BYTE_MARKER = "$aruIconsBytesV1";
  function carrierBytes(value, encode) {
    let nodes = 0;
    const seen = new Set();
    const invalid = () => failure("INVALID_REQUEST", "메타데이터 원본 바이트를 캐시에 전달할 수 없습니다.");
    function visit(item, depth) {
      if (++nodes > 1000000 || depth > 20) throw invalid();
      if (!item || typeof item !== "object") return item;
      if (ArrayBuffer.isView(item)) {
        if (Object.prototype.toString.call(item) !== "[object Uint8Array]" || item.byteLength > 1048576) throw invalid();
        if (!encode) return new Uint8Array(item);
        const parts = [];
        for (let i = 0; i < item.length; i += 8192) parts.push(String.fromCharCode(...item.subarray(i, i + 8192)));
        return { [BYTE_MARKER]: root.btoa(parts.join("")), byteLength: item.byteLength };
      }
      if (seen.has(item)) throw invalid();
      seen.add(item);
      if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
        if (encode || Object.keys(item).length !== 2 || !Object.prototype.hasOwnProperty.call(item, "byteLength")) throw invalid();
        const text = item[BYTE_MARKER], length = item.byteLength;
        if (typeof text !== "string" || text.length > 1398104 || !Number.isInteger(length) || length < 0 || length > 1048576 ||
          text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text) ||
          text.length / 4 * 3 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !== length) throw invalid();
        let binary;
        try { binary = root.atob(text); } catch (_) { throw invalid(); }
        if (binary.length !== length || root.btoa(binary) !== text) throw invalid();
        return Uint8Array.from(binary, char => char.charCodeAt(0));
      }
      let result;
      if (Array.isArray(item)) {
        if (item.length > 10000) throw invalid();
        result = item.map(child => visit(child, depth + 1));
      } else result = Object.fromEntries(Object.entries(item).map(([key, child]) => [key, visit(child, depth + 1)]));
      seen.delete(item);
      return result;
    }
    return visit(value, 0);
  }

  function invoke(target, method, args) {
    if (!api || !target || typeof target[method] !== "function") {
      return Promise.reject(failure("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다."));
    }
    if (promiseApi) {
      try { return Promise.resolve(target[method](...args)); }
      catch (error) { return Promise.reject(error); }
    }
    return new Promise((resolve, reject) => {
      try {
        target[method](...args, (value) => {
          // lastError must be read inside the callback, before Chromium clears it.
          const error = api.runtime && api.runtime.lastError;
          if (error) reject(failure("API_ERROR", error.message || "확장 프로그램 API 요청에 실패했습니다."));
          else resolve(value);
        });
      } catch (error) { reject(error); }
    });
  }

  async function readOptions() {
    const stored = await invoke(api && api.storage && api.storage.sync, "get", [["enabled", "aruIconsOptions"]]);
    const items = stored || {};
    const supplied = items.aruIconsOptions;
    const iconOptions = Object.assign({}, defaults,
      supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied : {});
    const enabled = Object.prototype.hasOwnProperty.call(items, "enabled") ? items.enabled === true : true;
    return { enabled, aruIconsOptions: iconOptions, active: enabled && iconOptions.enabled === true };
  }

  function onChanged(callback) {
    if (!api || !api.storage || !api.storage.onChanged) return () => {};
    let disposed = false;
    let revision = 0;
    const listener = (changes, area) => {
      if (area !== "sync" || (!changes.enabled && !changes.aruIconsOptions)) return;
      const current = ++revision;
      readOptions().then((options) => {
        if (!disposed && current === revision) callback(options);
      }).catch(() => {
        if (!disposed && current === revision) callback({ enabled: false, aruIconsOptions: { ...defaults }, active: false });
      });
    };
    api.storage.onChanged.addListener(listener);
    return () => {
      disposed = true;
      ++revision;
      api.storage.onChanged.removeListener(listener);
    };
  }

  async function requestCache(action, payload) {
    if (!["get", "put", "invalidate", "info"].includes(action)) {
      throw failure("INVALID_REQUEST", "지원하지 않는 캐시 요청입니다.");
    }
    if (!(await readOptions()).active) throw failure("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
    let requestPayload = payload || {};
    if (action === "put" && Object.prototype.hasOwnProperty.call(requestPayload, "rawMetadata")) {
      requestPayload = { ...requestPayload, rawMetadata: carrierBytes(requestPayload.rawMetadata, true) };
    }
    const response = await invoke(api && api.runtime, "sendMessage", [{ type: "ARU_ICONS_CACHE", action, payload: requestPayload }]);
    if (!response || response.ok !== true) {
      const error = response && response.error;
      throw failure(error && error.code || "CACHE_UNAVAILABLE", error && error.message || "아이콘 캐시 응답을 받지 못했습니다.");
    }
    if (action === "get" && response.result) return { ...response.result, rawMetadata: carrierBytes(response.result.rawMetadata, false) };
    return response.result;
  }

  namespace.BrowserAdapter = Object.freeze({ readOptions, onChanged, requestCache, defaults });
})(globalThis);


/* source: shared/ruliweb-icons/site-adapter.js */
/* Aru Icons Phase 1: native read controls only. No page-function bridge or write API. */
(function (global) {
  'use strict';
  const API = global.AruIcons = global.AruIcons || {};
  const number = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const stopped = () => Object.assign(new Error('수집을 중지했습니다.'), {code:'ABORTED'});
  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(stopped());
      const done = () => { signal?.removeEventListener('abort', cancel); resolve(); };
      const timer = setTimeout(done, ms);
      const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(stopped()); };
      signal?.addEventListener('abort', cancel, {once:true});
    });
  }
  function selectionId(element) {
    const text = element?.getAttribute?.('onclick') || '';
    const match = text.match(/^\s*(?:window\.)?app\.icon_data_show\(\s*this\s*,\s*(\d+)\s*\)\s*;?\s*$/);
    return match ? number(match[1]) : null;
  }
  function moreInfo(button) {
    const match = (button?.getAttribute?.('onclick') || '').match(/^\s*(?:window\.)?app\.icon_data_load_more\(\s*this\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*;?\s*$/);
    return match ? {articleId:number(match[1]), offset:Number(match[2])} : null;
  }
  function safeMedia(url) {
    if (API.Metadata?.mediaUrl) {try {API.Metadata.mediaUrl(url);return true;}catch (_) {return false;}}
    if (API.isSafeMediaUrl) return API.isSafeMediaUrl(url);
    try { const u = new URL(url); return u.protocol==='https:' && ['i1.ruliweb.com','i2.ruliweb.com','i3.ruliweb.com'].includes(u.hostname) && !u.username && !u.password && !u.port && !u.hash && !/[\u0000-\u0020\u007f\\]/.test(url); } catch (_) {return false;}
  }
  function snapshot(panel, articleId) {
    const detail = panel.querySelector('.icon_share_data');
    const box = detail?.querySelector('.select_icon_box');
    const media = box ? [...box.querySelectorAll('img.select_icon, video.select_icon')] : [];
    const icons = [], seen = new Set();
    for (let ordinal=0; ordinal<media.length; ordinal++) {
      const node=media[ordinal], url=node.getAttribute('src') || node.querySelector('source')?.getAttribute('src');
      if (!safeMedia(url) || seen.has(url)) continue;
      seen.add(url);
      icons.push({url, ordinal, node, mediaKind:node.tagName==='VIDEO'?'video':node.getAttribute('data-gifct')==='yes'?'animated':'image', format: new URL(url).pathname.split('.').pop()});
    }
    const button=detail?.querySelector('.btn_icon_load_more');
    const next=moreInfo(button);
    const text=detail?.textContent || '';
    const totalMatch=text.match(/총\s*([\d,]+)\s*개/);
    const declaredTotal=totalMatch ? Number(totalMatch[1].replace(/,/g,'')) : null;
    const loadedText=detail?.querySelector('.loaded_icon_cnt')?.textContent || '';
    const loadedCount=Number(loadedText.replace(/[^\d]/g,'')) || media.length;
    const visible=panel.isConnected && !panel.hidden && panel.style.display!=='none' && detail?.style.display!=='none';
    const done=/모든 아이콘을 불러왔습니다/.test(text) || (!button && declaredTotal!==null && media.length>=declaredTotal);
    return {icons, rawCount:media.length, loadedCount, declaredTotal, button, offset:next?.offset ?? null,
      articleId:next?.articleId || articleId, visible:!!visible, ready:!!box,
      loading:!!button && (/불러오는 중/.test(button.textContent) || button.disabled || button.getAttribute('aria-busy')==='true'),
      error:!!button && /불러오기 실패/.test(button.textContent), done};
  }
  class NativeLoadSession {
    constructor(options) {
      this.options={intervalMs:300,pollMs:100,timeoutMs:10000,maxRequests:256,maxIcons:10000,isCurrent:()=>true,...options};
      this.running=false;
    }
    async run(signal) {
      if (this.running) throw new Error('이미 수집 중입니다.');
      this.running=true;
      let count=0, lastOffset=-1;
      const read=()=>this.options.read();
      const report=(s,status,message)=>this.options.onProgress?.({...s,status,phase:'native',processed:s.rawCount,loaded:s.rawCount,total:s.declaredTotal,uniqueCount:s.icons.length,requests:count,message,busy:status==='loading'});
      try {
        let s=read();
        if (!s.ready) throw Object.assign(new Error('정상 아이콘 목록을 찾을 수 없습니다. 원래 선택기를 다시 열어 주세요.'),{code:'NATIVE_UNAVAILABLE'});
        while (true) {
          if (signal?.aborted) throw stopped();
          if (!s.visible || !this.options.isCurrent?.()) throw stopped();
          if (s.articleId!==this.options.articleId) throw stopped();
          report(s,'loading','정상 사이트 버튼으로 순차 수집 중');
          if (s.done) { report(s,'complete','사이트가 전체 로딩 완료를 표시했습니다.');return {...s,status:'complete',requests:count}; }
          if (!s.button || s.offset===null) { report(s,'partial','완료를 확인할 수 없습니다. 원래 선택기에서 제공 범위를 확인해 주세요.');return {...s,status:'partial',requests:count}; }
          if (s.rawCount>=this.options.maxIcons || count>=this.options.maxRequests) {report(s,'partial','수집 자원 상한입니다. 재시도로 이어서 수집할 수 있습니다.');return {...s,status:'partial',requests:count};}
          if (s.offset<=lastOffset) throw Object.assign(new Error('다음 로딩 위치가 증가하지 않아 중지했습니다.'),{code:'OFFSET_STALLED'});
          if (s.error) throw Object.assign(new Error('사이트가 아이콘 로딩 실패를 표시했습니다. 재시도를 눌러 주세요.'),{code:'NATIVE_ERROR'});
          const start=Date.now();
          if (s.loading) {
            do {await delay(this.options.pollMs,signal);s=read();if(!s.visible||!this.options.isCurrent?.()||s.articleId!==this.options.articleId)throw stopped();}
            while(s.loading && Date.now()-start<this.options.timeoutMs);
            if(s.loading)throw Object.assign(new Error('기존 사이트 요청이 끝나지 않아 중지했습니다.'),{code:'TIMEOUT'});
            continue;
          }
          await delay(this.options.intervalMs,signal);
          if (!this.options.isCurrent?.() || signal?.aborted) throw stopped();
          const fresh=read();
          if(!fresh.visible||fresh.articleId!==this.options.articleId)throw stopped();
          if(fresh.loading||fresh.button!==s.button||fresh.offset!==s.offset||fresh.rawCount!==s.rawCount||fresh.done){s=fresh;continue;}
          const before=s;lastOffset=s.offset;count++;
          this.options.click(s.button);
          const deadline=Date.now()+this.options.timeoutMs;
          while(true) {
            await delay(this.options.pollMs,signal);s=read();
            if(!s.visible||!this.options.isCurrent?.()||s.articleId!==this.options.articleId)throw stopped();
            if(s.error)throw Object.assign(new Error('사이트 아이콘 로딩이 실패했습니다.'),{code:'NATIVE_ERROR'});
            if(!s.loading && (s.done || s.rawCount>before.rawCount || s.offset!==before.offset))break;
            if(Date.now()>=deadline)throw Object.assign(new Error('10초 동안 새 아이콘이 도착하지 않아 중지했습니다. 자동 재요청은 하지 않습니다.'),{code:'TIMEOUT'});
          }
          if(!s.done && s.rawCount<=before.rawCount)throw Object.assign(new Error('목록 증가가 없어 수집을 중지했습니다.'),{code:'NO_PROGRESS'});
        }
      } catch (error) {
        const s=read();report(s,error.code==='ABORTED'?'stopped':'error',error.message);throw error;
      } finally {this.running=false;}
    }
  }
  function imageAttributes(node) {
    if(!['IMG','VIDEO'].includes(node?.tagName?.toUpperCase()))return {metadataId:null,tags:[],tagError:null};
    const metadataId=node.getAttribute('data-aru-id'),raw=node.getAttribute('data-aru-tags');
    // IDs stay public metadata; they never replace URL-based picker/insertion identities.
    const id=typeof metadataId==='string' && metadataId.length<=512?metadataId:null;
    if(raw==null || raw==='')return {metadataId:id,tags:[],tagError:null};
    try {
      if(!API.AttributeTags)throw Object.assign(new Error('Tag codec unavailable'),{code:'TAGS_CODEC_UNAVAILABLE'});
      return {metadataId:id,tags:API.AttributeTags.decode(raw),tagError:null};
    } catch(error) {return {metadataId:id,tags:[],tagError:error.code||'TAGS_INVALID'};}
  }
  function normalPack(s, articleId, title) {
    const sourceId='article:'+articleId;
    // Exact URL is part of the identity. Cache serialization never includes native DOM nodes.
    return {id:'normal:'+articleId,kind:'NORMAL',name:title||'아이콘 글 '+articleId,mainArticleId:articleId,
      categories:[],tags:[],sources:[{sourceId,articleId,title:title||'글 '+articleId}],
      attributeReaderVersion:2,
      icons:s.icons.map(item=>{
        const attributes=item.attributes || imageAttributes(item.node);
        return {id:'normal:'+articleId+':'+item.url,name:'아이콘 '+(item.ordinal+1),url:item.url,
          variants:[{role:'selection',url:item.url,articleId}],keywords:[...attributes.tags],categoryIds:[],tagIds:[],sourceId,
          imageMetadata:{id:attributes.metadataId,tags:[...attributes.tags]},
          mediaKind:item.mediaKind,format:item.format,origin:{sourceId,articleId,originalIndex:item.ordinal}};
      })};
  }
  function findArticleBody(doc) {
    let nodes=[...doc.querySelectorAll('.view_content[itemprop="articleBody"]')],selector='.view_content[itemprop="articleBody"]';
    if(!nodes.length){nodes=[...doc.querySelectorAll('.view_content article')];selector='.view_content article';}
    if(nodes.length!==1)throw Object.assign(new Error('게시글 본문을 한 곳으로 식별할 수 없습니다. 페이지 전체는 수집하지 않습니다.'),{code:'BODY_NOT_FOUND'});
    return {element:nodes[0],selector};
  }
  // Read-only article entry has no native panel. Collect observed body URLs without a write/API bridge.
  function readArticlePack(doc, articleId, title, boardId='98', options={}) {
    const {element,selector}=findArticleBody(doc),base=readPath(articleId,'https://bbs.ruliweb.com',boardId);
    const nodes=[...element.querySelectorAll('img,video,source[src],a[href]')];
    if(nodes.length>5000)throw Object.assign(new Error('본문 미디어 탐색 상한 5,000개를 넘었습니다.'),{code:'RESOURCE_LIMIT'});
    const media=nodes.filter(node=>['IMG','VIDEO'].includes(node.tagName.toUpperCase())),images=media.filter(node=>node.tagName.toUpperCase()==='IMG');
    const attributesByImage=new WeakMap(),positions=new WeakMap(),imagePositions=new WeakMap();
    images.forEach((node,index)=>imagePositions.set(node,index+1));
    const metadataCounts={images:images.length,videos:media.length-images.length,media:media.length,
      ids:0,tagAttributes:0,decoded:0,decodeFailed:0,taggedImages:0,mediaIds:0,mediaTagAttributes:0,mediaDecoded:0,mediaDecodeFailed:0,taggedMedia:0};
    media.forEach((node,index)=>{
      positions.set(node,index+1);
      const attrs=imageAttributes(node);attributesByImage.set(node,attrs);
      if(node.getAttribute('data-aru-id')!=null)metadataCounts.mediaIds++;
      if(node.getAttribute('data-aru-tags')!=null){
        metadataCounts.mediaTagAttributes++;
        if(attrs.tagError)metadataCounts.mediaDecodeFailed++;else metadataCounts.mediaDecoded++;
      }
      if(attrs.tags.length)metadataCounts.taggedMedia++;
      if(node.tagName.toUpperCase()==='IMG'){
        if(node.getAttribute('data-aru-id')!=null)metadataCounts.ids++;
        if(node.getAttribute('data-aru-tags')!=null){metadataCounts.tagAttributes++;if(attrs.tagError)metadataCounts.decodeFailed++;else metadataCounts.decoded++;}
        if(attrs.tags.length)metadataCounts.taggedImages++;
      }
    });
    const counts={domNodes:nodes.length,bodyImages:images.length,bodyVideos:element.querySelectorAll('video').length,
      candidates:0,excluded:0,duplicates:0,wrappedImages:0,ignoredLinks:0,finalIcons:0,reasons:{},
      metadataImages:0,taggedIcons:0,tagErrors:0,tagErrorCodes:{},metadata:metadataCounts};
    const icons=[],seen=new Set(),imageAttributesByUrl=[],recordedOwners=new WeakMap();
    const deliveredOwners=new Map();
    const exclude=reason=>{counts.excluded++;counts.reasons[reason]=(counts.reasons[reason]||0)+1;};
    const scoped=n=>n.closest('[data-aru-icons-entry],[data-aru-icons-picker],[data-aru-body-download],.comment,.comment_view,.comment_wrapper,.comment_icon,.select_icon_box,.ad,.advertisement,[data-ad],.profile_image,.user_profile,.sidebar,.right_best,aside');
    const stream=(url,type='')=>/\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(url).pathname) || ['application/vnd.apple.mpegurl','application/x-mpegurl','audio/mpegurl','audio/x-mpegurl','application/dash+xml','video/mp2t'].includes(type.split(';')[0].trim().toLowerCase());
    const normalize=raw=>{
      if(typeof raw!=='string' || !raw || raw.length>2048 || /[\u0000-\u0020\u007f\\]/.test(raw))return null;
      try{const url=new URL(raw,base).href;return safeMedia(url)?url:null;}catch(_){return null;}
    };
    for(const node of nodes){
      const tag=node.tagName.toUpperCase();
      if(scoped(node)){counts.candidates++;exclude('outside-content');continue;}
      if(tag==='SOURCE' && node.closest('video'))continue;
      if(tag==='IMG' && node.closest('a.img_load[href]')){counts.wrappedImages++;continue;}
      const candidates=[];
      let owner=tag==='IMG'||tag==='VIDEO'?node:null;
      if(tag==='A'){
        const raw=node.getAttribute('href') || '',type=node.getAttribute('type') || '';
        if(!node.matches('a.img_load') && !/\.(?:png|jpe?g|gif|webp|avif|mp4|webm|m3u8|mpd|m4s|ts)(?:[?#]|$)/i.test(raw) && !/^video\/(?:mp4|webm)(?:;|$)/i.test(type)){counts.ignoredLinks++;continue;}
        candidates.push({raw,type});
        // Only a single contained image can supply this anchor's metadata. Never
        // join another occurrence by URL: repeated URLs can have different tags.
        const children=[...(node.querySelectorAll?.('img')||[])];
        if(children.length===1)owner=children[0];
      }
      if(tag==='IMG'){
        let raw=node.getAttribute('src') || '';
        if((!raw || /^(?:data:|about:blank)/i.test(raw)) && node.getAttribute('data-src'))raw=node.getAttribute('data-src');
        if(!raw){const parts=(node.getAttribute('srcset') || '').split(',').map(x=>x.trim()).filter(Boolean);
          if(parts.length===1)raw=parts[0].split(/\s+/)[0];
          else if(parts.length>1){counts.candidates++;exclude('ambiguous-srcset');continue;}
        }
        candidates.push({raw});
      }
      if(tag==='VIDEO'){
        if(node.mediaKeys || node.getAttribute('data-drm')==='true' || node.getAttribute('data-encrypted')==='true'){counts.candidates++;exclude('encrypted-media');continue;}
        if(node.currentSrc && (/^blob:/i.test(node.currentSrc) || stream(node.currentSrc))){counts.candidates++;exclude('streaming-media');continue;}
        for(const raw of [node.currentSrc,node.getAttribute('src'),node.src])if(raw)candidates.push({raw});
        for(const child of node.querySelectorAll('source[src]'))if(!scoped(child))for(const raw of [child.getAttribute('src'),child.src])if(raw)candidates.push({raw,type:child.getAttribute('type') || ''});
        if(!candidates.length)candidates.push({raw:''});
      }
      if(tag==='SOURCE')for(const raw of [node.getAttribute('src'),node.src])if(raw)candidates.push({raw,type:node.getAttribute('type') || ''});
      const normalized=candidates.map(c=>({...c,url:normalize(c.raw)})),streams=new Set(normalized.filter(c=>c.url && stream(c.url,c.type)).map(c=>c.url)),local=new Set();
      for(const candidate of normalized){
        const key=candidate.url || candidate.raw;if(local.has(key))continue;local.add(key);counts.candidates++;
        const url=candidate.url;if(!url){exclude('unsafe-url');continue;}
        const format=new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
        if(streams.has(url)){exclude('streaming-media');continue;}
        if(['svg','mov','mp3','ogg'].includes(format)){exclude('unsupported-format');continue;}
        const attributes=attributesByImage.get(owner) || imageAttributes(owner);
        let ownerUrls=owner && recordedOwners.get(owner);
        if(owner && !ownerUrls?.has(url)){
          if(!ownerUrls){ownerUrls=new Set();recordedOwners.set(owner,ownerUrls);}ownerUrls.add(url);
          imageAttributesByUrl.push({url,...attributes,imageIndex:imagePositions.get(owner),mediaIndex:positions.get(owner)});
          if(owner.getAttribute('data-aru-id')!=null || owner.getAttribute('data-aru-tags')!=null)counts.metadataImages++;
          if(attributes.tagError){counts.tagErrors++;counts.tagErrorCodes[attributes.tagError]=(counts.tagErrorCodes[attributes.tagError]||0)+1;}
        }
        if(seen.has(url)){counts.duplicates++;continue;}seen.add(url);
        if(owner)deliveredOwners.set(url,owner);
        const video=['mp4','webm'].includes(format) || tag==='VIDEO' || tag==='SOURCE' || /^video\//i.test(candidate.type || '');
        if(attributes.tags.length)counts.taggedIcons++;
        icons.push({url,ordinal:counts.candidates-1,mediaKind:video?'video':format==='gif'?'animated':'image',format,attributes});
      }
    }
    counts.finalIcons=icons.length;
    const name=doc.querySelector('.subject_text[itemprop="headline"],.subject_text')?.textContent?.trim().slice(0,120) || title;
    const pack=normalPack({icons},articleId,name);
    pack.collectionMode='article-body-v1';pack.boardId=String(boardId);pack.articleUrl=base;pack.bodySelector=selector;pack.bodyCounts=counts;
    if(String(boardId)!=='98') {pack.id='normal:'+boardId+':'+articleId;pack.sources[0].sourceId='article:'+boardId+':'+articleId;
      for(const icon of pack.icons){icon.id='normal:'+boardId+':'+articleId+':'+icon.url;icon.sourceId=pack.sources[0].sourceId;icon.origin.sourceId=icon.sourceId;}}
    for(const source of pack.sources){source.boardId=String(boardId);source.articleUrl=base;}
    for(const icon of pack.icons)icon.variants[0].role='body';
    // Raw public attributes are diagnostic-only, never included in the pack/cache.
    let metadataDiagnostics=null;
    if(options.diagnostics===true){
      const recordsByImage=new Map(),iconsByUrl=new Map(pack.icons.map(icon=>[icon.url,icon]));
      for(const record of imageAttributesByUrl){
        if(!recordsByImage.has(record.mediaIndex))recordsByImage.set(record.mediaIndex,[]);
        recordsByImage.get(record.mediaIndex).push(record);
      }
      metadataDiagnostics={...metadataCounts,mediaDetail:media.map((image,index)=>{
        const attrs=attributesByImage.get(image),records=recordsByImage.get(index+1)||[];
        const delivered=records.find(record=>deliveredOwners.get(record.url)===image);
        const icon=delivered && iconsByUrl.get(delivered.url);
        const wrapper=image.closest('a.img_load[href]');
        const reason=icon?(attrs.tagError?'decode-failed':image.getAttribute('data-aru-tags')==null?'tag-attribute-missing':attrs.tags.length?'mapped':'empty-tags'):
          scoped(image)?'outside-content':records.length?'duplicate-url':wrapper && wrapper.querySelectorAll('img').length!==1?'ambiguous-wrapper-owner':'no-collected-url';
        return {position:index+1,imageIndex:imagePositions.get(image)||null,element:image.tagName.toUpperCase(),id:image.getAttribute('data-aru-id'),url:delivered?.url||records[0]?.url||normalize(wrapper?.getAttribute('href')||image.getAttribute('src')||image.getAttribute('data-src')),
          rawTags:image.getAttribute('data-aru-tags'),decodedTags:[...attrs.tags],decodeError:attrs.tagError,iconId:icon?.id||null,reason};
      })};
      metadataDiagnostics.imagesDetail=metadataDiagnostics.mediaDetail.filter(row=>row.element==='IMG');
    }
    return {pack,counts,selector,imageAttributesByUrl,metadataDiagnostics};
  }
  function readPath(articleId, origin=global.location?.origin, boardId='98') {
    const id=number(articleId);
    if(!id || !/^[1-9]\d{0,11}$/.test(String(boardId)) || !['https://bbs.ruliweb.com','https://m.ruliweb.com'].includes(origin))throw new Error('허용되지 않은 공개 글 경로입니다.');
    return origin+'/community/board/'+boardId+'/read/'+id;
  }
  async function getPublicDocument(articleId,{signal,origin=global.location?.origin,fetchFn=global.fetch,timeoutMs=10000,forceRead=false,boardId='98'}={}) {
    const url=readPath(articleId,origin,boardId);
    const current=global.document;
    if(!forceRead && global.location?.href?.split(/[?#]/)[0]===url && current?.querySelector('.view_content[itemprop="articleBody"],.view_content article'))return current;
    const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted)controller.abort();
    const timer=setTimeout(abort,timeoutMs);
    try {
      const response=await fetchFn(url,{method:'GET',credentials:'same-origin',mode:'same-origin',redirect:'error',cache:'no-cache',signal:controller.signal});
      if(response.redirected || (response.url && response.url!==url))throw Object.assign(new Error('공개 글이 다른 주소로 이동하여 읽기를 중지했습니다.'),{code:'READ_REDIRECT'});
      if(!response.ok)throw Object.assign(new Error('공개 글 '+articleId+' 조회 실패 (HTTP '+response.status+'). 접근 제한을 우회하지 않습니다.'),{code:[401,403,429].includes(response.status)?'ACCESS_DENIED':'READ_FAILED',articleId});
      const maxBytes=3*1024*1024;
      if(Number(response.headers?.get('content-length'))>maxBytes)throw new Error('공개 글 응답 크기 상한을 넘었습니다.');
      let html='';
      if(response.body?.getReader) {
        const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0;
        try {while(true){const r=await reader.read();if(controller.signal.aborted){await reader.cancel();throw stopped();}if(r.done)break;bytes+=r.value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('공개 글 응답 크기 상한을 넘었습니다.');}html+=decoder.decode(r.value,{stream:true});}html+=decoder.decode();}finally{reader.releaseLock();}
      } else {html=await response.text();if(new TextEncoder().encode(html).length>maxBytes)throw new Error('공개 글 응답 크기 상한을 넘었습니다.');}
      if(controller.signal.aborted)throw stopped();
      const doc=new DOMParser().parseFromString(html,'text/html');
      if(!doc.querySelector('.view_content[itemprop="articleBody"],.view_content article'))throw Object.assign(new Error('글 본문을 확인할 수 없습니다. 정상 탭에서 해당 글을 열어 주세요.'),{code:'READ_UNAVAILABLE'});
      return doc;
    } catch(error) {if(controller.signal.aborted)throw signal?.aborted?stopped():Object.assign(new Error('공개 글 조회 시간이 초과되어 중지했습니다.'),{code:'TIMEOUT'});throw error;}
    finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async function verifyReferences(result,{signal,onProgress,readDocument=getPublicDocument,intervalMs=300}={}) {
    const slaves=result.v1Slaves||[];
    const states=[];let verified=0,processed=0;
    // Index once instead of rescanning the full BUNDLE for each source article.
    // The carrier's page/index order and every URL stay unchanged.
    const iconsByReference=new Map(),repeatCounts=new Map(),readSources=new Map();
    for(const icon of result.pack.icons){const key=icon.ref?.page+':'+icon.origin?.articleId;
      if(!iconsByReference.has(key))iconsByReference.set(key,[]);iconsByReference.get(key).push(icon);}
    for(const slave of slaves)repeatCounts.set(slave.articleId,(repeatCounts.get(slave.articleId)||0)+1);
    const progress=(phase,message,status='loading')=>onProgress?.({status,phase,processed,total:result.pack.icons.length,loaded:result.pack.icons.length,
      verifiedCount:verified,declaredCount:result.pack.icons.length,referencesProcessed:states.length,referencesTotal:slaves.length,
      message,states:[...states],busy:status==='loading'});
    const check=()=>{if(signal?.aborted)throw stopped();};
    for(const slave of slaves) {
      check();progress('references','원본 글 '+slave.articleId+'을 확인하고 있어요.');
      // Keep the existing interval for actual reads; cached duplicate references
      // perform no request and need no additional network pacing delay.
      if(!readSources.has(slave.articleId))await delay(intervalMs,signal);
      try {
        let observed=readSources.get(slave.articleId);
        if(!observed){
        const doc=await readDocument(slave.articleId,{signal});check();
        const body=doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
        if(!body)throw new Error('원본 본문 없음');
        progress('tags','원본 아이콘과 태그를 읽고 있어요.');
        let articleRead=null,attributeError=null;
        try{articleRead=readArticlePack(doc,slave.articleId,'','98');}catch(error){attributeError=error.code||'ATTRIBUTES_UNAVAILABLE';}
        // Reuse the collector's normalization, including data-src and relative
        // paths. Comparison stays exact: never guess a different CDN/original URL.
        const urls=new Set(articleRead?.pack.icons.map(icon=>icon.url)||[]);
        // Verification of an observed URL must remain independent of optional
        // tag decoding/model construction failures. Normalize only the actual href/src.
        for(const node of body.querySelectorAll('img,video,video source,a[href]')){
          const raw=node.getAttribute('src')||node.getAttribute('data-src')||node.getAttribute('href');
          if(!raw)continue;try{const absolute=new URL(raw,readPath(slave.articleId,'https://bbs.ruliweb.com','98')).href;if(safeMedia(absolute))urls.add(absolute);}catch(_){/* Invalid observed URL stays unconfirmed. */}
        }
        const byUrl=new Map(),mediaByUrl=new Map((articleRead?.pack.icons||[]).map(icon=>[icon.url,icon]));
        for(const item of articleRead?.imageAttributesByUrl||[]){if(!byUrl.has(item.url))byUrl.set(item.url,[]);byUrl.get(item.url).push(item);}
        observed={doc,articleRead,attributeError,urls,byUrl,mediaByUrl};
        // Keep parsed DOMs only for articles actually referenced more than once.
        if(repeatCounts.get(slave.articleId)>1)readSources.set(slave.articleId,observed);
        }
        check();const {doc,articleRead,attributeError,urls,byUrl,mediaByUrl}=observed;
        const matched=slave.images.filter(url=>urls.has(url)).length;
        verified+=matched;processed+=slave.images.length;
        // Enrich only exact, unambiguous occurrences. The carrier still owns
        // URL, order, refs, categories, tagIds and all source identities.
        let tagged=0,ambiguous=0,tagErrors=0,metadataReadError=attributeError;
        try {
          const metadata=articleRead;
          tagErrors=metadata.counts.tagErrors;
          for(const icon of iconsByReference.get(slave.page+':'+slave.articleId)||[]){
            const entries=byUrl.get(icon.url)||[];
            if(entries.length>1){ambiguous++;continue;}
            const attrs=entries[0];if(!attrs)continue;
            icon.imageMetadata={id:attrs.metadataId,tags:[...attrs.tags]};
            icon.keywords=[...new Set([...(icon.keywords||[]),...attrs.tags])];
            const original=mediaByUrl.get(icon.url);
            if(original){icon.mediaKind=original.mediaKind;icon.format=original.format;}
            if(attrs.tags.length)tagged++;
          }
        } catch(error) {metadataReadError=error.code||'ATTRIBUTES_UNAVAILABLE';}
        const title=doc.querySelector('.subject_text,.subject,.view_content h1')?.textContent?.trim().slice(0,120)||'글 '+slave.articleId;
        const source=result.pack.sources.find(s=>s.articleId===slave.articleId);if(source)source.title=title;
        // Public CDN URL paths and carrier positions suffice for mismatch
        // diagnostics. Query strings are deliberately omitted from diagnostics.
        const missing=[];for(let index=0;index<slave.images.length;index++)if(!urls.has(slave.images[index])){
          if(missing.length===5)break;const url=new URL(slave.images[index]);missing.push({index,url:url.origin+url.pathname});}
        states.push({articleId:slave.articleId,page:slave.page,status:matched===slave.images.length?'verified':'url-unconfirmed',declared:slave.images.length,matched,
          tagged,ambiguousMetadata:ambiguous,tagErrors,metadataReadError,
          metadataStatus:metadataReadError||tagErrors||ambiguous?'partial':articleRead?.counts.metadata.mediaTagAttributes?'complete':'none',
          missingCount:slave.images.length-matched,missing});
      } catch(error) {
        if(error.code==='ABORTED'||signal?.aborted)throw stopped();
        states.push({articleId:slave.articleId,page:slave.page,status:'unavailable',message:error.message});
        if(error.code==='ACCESS_DENIED'||error.code==='TIMEOUT') {
          progress('references',error.message,'partial');
          return {states,verifiedCount:verified,processedCount:processed,status:'partial',stoppedByRestriction:true};
        }
      }
      progress('references','원본 '+states.length+'/'+slaves.length+'개를 확인했어요.');
    }
    // A URL match does not establish that tags decoded or had an unambiguous owner.
    const complete=states.every(x=>x.status==='verified'&&x.metadataStatus!=='partial');
    return {states,verifiedCount:verified,processedCount:processed,referencesProcessed:states.length,referencesTotal:slaves.length,status:complete?'complete':'partial'};
  }
  function prepareInsertion(icon, context) {
    const variants=icon.variants||icon.media?.variants||[];
    const url=variants.find(v=>v.role==='selection')?.url || icon.url;
    const nodes=context?.panel?.querySelectorAll?.('img.select_icon,video.select_icon')||[];
    const native=[...nodes].find(node=>(node.getAttribute('src')||node.querySelector('source')?.getAttribute('src'))===url);
    return {iconId:icon.id,url,available:!!native,context:context?.kind||'unknown',nativeElement:native||null,
      message:native?'네이티브 선택 항목을 확인했습니다. Phase 1은 선택 정보만 준비하며 삽입·등록은 실행하지 않습니다.':'원래 선택기에 대응 항목이 없습니다. 삽입 지원은 검증 대기입니다.'};
  }
  API.SiteAdapter={selectionId,moreInfo,snapshot,normalPack,imageAttributes,findArticleBody,readArticlePack,readPath,getPublicDocument,verifyReferences,prepareInsertion,NativeLoadSession,delay,safeMedia};
})(typeof globalThis!=='undefined'?globalThis:this);


/* source: shared/ruliweb-icons/registry.js */
/* Generated from pack-registry.json; do not edit this copy. */
(function(g){g.AruIcons=g.AruIcons||{};g.AruIcons.packRegistry={"registryVersion":1,"packs":[{"id":"ruliweb-4998","url":"https://m.ruliweb.com/community/board/98/read/4998","boardId":"98","articleId":4998,"name":"블루아카 백업용 여러캐릭터콘 (M)","thumbnail":null,"enabled":true,"expectedKind":"BUNDLE"}]};})(globalThis);


/* source: shared/ruliweb-icons/catalog.js */
/* Source catalog only. Favorites remain a live view of the native menu, never a new store. */
(function(global) {
  'use strict';
  const A=global.AruIcons=global.AruIcons||{},MAX_ROWS=16,ROW_HEIGHT=76,MAX_INDEXED=6;
  const error=(code,message)=>Object.assign(new Error(message),{code});
  function parseRef(value,boardId='98') {
    const text=String(value||'').trim();let articleId=text,origin='https://bbs.ruliweb.com';
    if(!/^[1-9]\d*$/.test(text)) {
      let url;try{url=new URL(text);}catch(_){throw error('ARTICLE_URL_INVALID','공개 게시글 URL 또는 게시판 번호와 글 번호를 입력해 주세요.');}
      const match=url.pathname.match(/^\/community\/board\/([1-9]\d*)\/read\/([1-9]\d*)\/?$/);
      if(url.protocol!=='https:'||!['bbs.ruliweb.com','m.ruliweb.com'].includes(url.hostname)||url.port||url.username||url.password||url.hash||!match)
        throw error('ARTICLE_PATH_NOT_ALLOWED','현재 권한의 루리웹 community/board 공개 읽기 URL만 지원합니다. 다른 게시판 경로의 권한은 확대하지 않습니다.');
      boardId=match[1];articleId=match[2];origin=url.origin;
    }
    if(!/^[1-9]\d{0,11}$/.test(String(boardId))||!Number.isSafeInteger(Number(articleId))||Number(articleId)<1||String(articleId).length>12)
      throw error('ARTICLE_ID_INVALID','게시판 번호와 글 번호가 올바르지 않습니다.');
    boardId=String(boardId);articleId=Number(articleId);
    return {boardId,articleId,url:origin+'/community/board/'+boardId+'/read/'+articleId};
  }
  const refKey=ref=>String(ref.boardId)+':'+ref.articleId;
  function developerPacks(registry=A.packRegistry) {
    if(registry?.registryVersion!==1||!Array.isArray(registry.packs))return [];
    const seen=new Set(),list=[];
    for(const item of registry.packs.slice(0,100))try {
      if(item.enabled!==true)continue;const ref=parseRef(item.url);
      if(String(item.boardId)!==ref.boardId||Number(item.articleId)!==ref.articleId||seen.has(refKey(ref)))continue;
      seen.add(refKey(ref));list.push({...ref,key:'developer:'+refKey(ref),source:'developer',title:String(item.name||'글 '+ref.articleId).slice(0,160),
        thumbnail:A.SiteAdapter.safeMedia(item.thumbnail)?item.thumbnail:null,expectedKind:['NORMAL','BUNDLE'].includes(item.expectedKind)?item.expectedKind:null});
    }catch(_) {/* Invalid developer records do not trigger a request. */}
    return list;
  }
  function favorites(panel) {
    const seen=new Set(),list=[];
    for(const node of panel?.querySelectorAll('.icon_data_show_target[onclick]')||[]) {
      // Native recommendation entries lack this marker. Never label them as the user's favorites.
      if(![...node.parentElement?.querySelectorAll('[onclick]')||[]].some(n=>/^\s*(?:window\.)?app\.comment_icon_pick_remove\(/.test(n.getAttribute('onclick')||'')))continue;
      const articleId=A.SiteAdapter.selectionId(node);if(!articleId||seen.has(articleId))continue;
      seen.add(articleId);if(list.length>=100)break;
      const ref=parseRef(String(articleId)),raw=node.querySelector('img')?.getAttribute('src');
      list.push({...ref,key:'favorite:'+refKey(ref),source:'favorite',title:node.getAttribute('title')?.slice(0,160)||'글 '+articleId,
        thumbnail:A.SiteAdapter.safeMedia(raw)?raw:null,expectedKind:null});
    }
    return list;
  }
  class Catalog {
    constructor(){this.entries=[];this.indexed=new Map();this.active=null;this.query='';this.scope='all';}
    setEntries(entries){const seen=new Set();this.entries=entries.filter(e=>{const key=refKey(e);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,200);}
    remember(ref,pack) {
      const key=refKey(ref),old=this.indexed.get(key);
      if(old?.pack===pack)return;
      this.indexed.delete(key);this.indexed.set(key,{pack,index:new A.SearchIndex(pack)});
      while(this.indexed.size>MAX_INDEXED)this.indexed.delete(this.indexed.keys().next().value);
    }
    search(query=this.query,scope=this.scope) {
      this.query=query;this.scope=scope;
      const terms=String(query).normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      const scoped=this.entries.filter(e=>scope==='all'||e.source===scope),rows=[];let indexed=0;
      for(const entry of scoped) {
        const record=this.indexed.get(refKey(entry));if(record)indexed++;
        const fields=[entry.title,entry.boardId,String(entry.articleId),record?.pack.name,record?.pack.title].filter(Boolean).map(s=>s.normalize('NFKC').toLocaleLowerCase());
        const remaining=terms.filter(t=>!fields.some(f=>f.includes(t)));
        const matches=record&&remaining.length?record.index.search({query:remaining.join(' ')}).uniqueCount:record?.pack.icons.length;
        if(!remaining.length||matches>0)rows.push({...entry,iconCount:record?.pack.icons.length??entry.knownIconCount,matches:terms.length?matches:null,indexed:!!record});
      }
      return {rows,indexed,total:scoped.length,partial:indexed<scoped.length,unindexed:scoped.length-indexed};
    }
    destroy(){this.entries=[];this.indexed.clear();}
  }
  // Limits concurrent src assignments and detaches pending media on group/pack changes.
  class MediaBudget {
    constructor(limit=4){this.limit=limit;this.queue=[];this.running=new Set();this.jobs=new Set();this.frame=0;this.closed=false;this.started=0;this.peak=0;}
    add(node,url,onTimeout,canStart=()=>true,completion=null) {
      if(this.closed)return;const job={node,url,onTimeout,canStart,completion,finish:null};this.jobs.add(job);this.queue.push(job);
      if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.pump();});
    }
    pump() {
      if(this.closed)return;
      while(this.running.size<this.limit&&this.queue.length) {
        const next=this.queue.findIndex(j=>!j.node.isConnected||j.canStart());if(next<0)break;
        const job=this.queue.splice(next,1)[0];if(!job.node.isConnected){this.jobs.delete(job);continue;}
        this.running.add(job);this.peak=Math.max(this.peak,this.running.size);this.started++;
        const doneEvents=job.completion?[...job.completion.events,'error']:job.node.tagName==='VIDEO'?['loadedmetadata','error']:['load','error'];
        const completed=event=>{if(event.type==='error'||!job.completion||job.completion.isReady())finish();};
        let timer;const finish=()=>{if(!this.running.delete(job))return;clearTimeout(timer);for(const type of doneEvents)job.node.removeEventListener(type,completed);this.jobs.delete(job);this.pump();};
        job.finish=finish;for(const type of doneEvents)job.node.addEventListener(type,completed);
        timer=setTimeout(()=>{job.node.removeAttribute('src');try{if(job.node.isConnected&&!this.closed)job.onTimeout?.();}finally{finish();}},10000);job.node.src=job.url;
      }
    }
    prune(){this.queue=this.queue.filter(j=>j.node.isConnected);for(const j of [...this.jobs])if(!j.node.isConnected){j.node.removeAttribute('src');this.jobs.delete(j);j.finish?.();}this.pump();}
    reset(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.queue=[];for(const j of [...this.jobs]){j.node.removeAttribute('src');j.finish?.();}this.jobs.clear();this.running.clear();}
    destroy(){this.closed=true;this.reset();}
    snapshot(){return {active:this.running.size,queued:this.queue.length,peak:this.peak,started:this.started,limit:this.limit};}
  }
  class CatalogView {
    constructor({container,onChoose,onDirect,onCancel}) {
      this.catalog=new Catalog();this.onChoose=onChoose;this.onDirect=onDirect;this.events=new AbortController();this.media=new MediaBudget(4);this.frame=0;this.closed=false;this.busy=false;this.operation=0;this.failures=new Map();
      const doc=container.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};this.el=el;
      this.node=el('section');this.node.className='catalog';this.node.tabIndex=-1;this.node.setAttribute('role','dialog');this.node.setAttribute('aria-modal','true');this.node.setAttribute('aria-label','아이콘 리스트');
      const heading=el('h2','아이콘 리스트'),cancel=el('button','목록 닫기');cancel.type='button';cancel.className='quiet';cancel.id='catalog-cancel';
      const head=el('div');head.className='catalog-heading';head.append(heading,cancel);
      const controls=el('div');controls.className='catalog-controls';this.scope=el('select');this.scope.setAttribute('aria-label','팩 검색 범위');
      for(const [value,label]of [['all','전체'],['developer','기본 제공 팩'],['favorite','즐겨찾기'],['direct','직접 등록']]){const o=el('option',label);o.value=value;this.scope.append(o);}
      this.input=el('input');this.input.type='search';this.input.placeholder='팩 이름·글 번호 검색';this.input.setAttribute('aria-label','팩 목록 검색');
      controls.append(this.scope,this.input);this.notice=el('p');this.notice.className='help';this.notice.setAttribute('role','status');
      this.nativeStatus=el('p');this.nativeStatus.className='help';
      this.loadStatus=el('p');this.loadStatus.className='catalog-load-status';this.loadStatus.tabIndex=-1;this.loadStatus.setAttribute('role','status');this.loadStatus.setAttribute('aria-live','polite');this.loadStatus.textContent='사용할 팩을 선택하세요.';
      this.loadingArt=el('img');this.loadingArt.className='catalog-loading-art';this.loadingArt.alt='';this.loadingArt.setAttribute('aria-hidden','true');this.loadingArt.hidden=true;
      const artURL=A.DesignSystem?.assetURL?.('assets/icons/aru-main-64.png');if(artURL)this.loadingArt.src=artURL;
      this.loadingArt.addEventListener('error',()=>{this.artFailed=true;this.loadingArt.hidden=true;},{once:true});this.artAvailable=!!artURL;
      this.progress=el('progress');this.progress.className='catalog-progress';this.progress.setAttribute('aria-label','아이콘 정보 처리량');this.progress.hidden=true;
      this.retry=el('button','다시 시도');this.retry.type='button';this.retry.hidden=true;this.retry.id='catalog-retry';
      this.viewport=el('div');this.viewport.className='catalog-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','팩 목록 스크롤');this.content=el('div');this.content.className='catalog-content';this.viewport.append(this.content);
      const direct=el('form');direct.className='catalog-direct';this.url=el('input');this.url.setAttribute('aria-label','공개 게시글 URL 또는 번호');this.url.placeholder='공개 게시글 URL 또는 글 번호';
      this.board=el('input');this.board.value='98';this.board.inputMode='numeric';this.board.setAttribute('aria-label','직접 조회 게시판 번호');this.board.style.cssText='width:85px;min-width:70px;flex:0 0 85px';
      this.submit=el('button','직접 조회');this.submit.type='submit';direct.append(this.url,this.board,this.submit);
      this.cancel=cancel;this.node.append(head,controls,this.notice,this.nativeStatus,this.loadingArt,this.loadStatus,this.progress,this.retry,this.viewport,direct);container.append(this.node);
      const listen=(n,t,fn)=>n.addEventListener(t,fn,{signal:this.events.signal});
      listen(cancel,'click',()=>onCancel?.());listen(this.input,'input',()=>this.render());listen(this.scope,'change',()=>this.render());
      listen(this.viewport,'scroll',()=>{if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.renderRows();});});
      listen(direct,'submit',e=>{e.preventDefault();this.run(()=>this.onDirect?.(this.url.value,this.board.value));});
      listen(this.retry,'click',()=>{if(this.lastRequest)this.run(this.lastRequest,this.lastRef);});this.render();
    }
    async run(request,ref=null) {
      if(this.busy||this.closed)return;const token=++this.operation;this.lastRequest=request;this.lastRef=ref;this.errorCode=null;this.busy=true;this.pending=ref?refKey(ref):null;this.retry.hidden=true;this.loadStatus.textContent='아이콘팩을 불러오는 중…';this.node.setAttribute('aria-busy','true');this.submit.disabled=true;this.renderRows();this.loadStatus.focus({preventScroll:true});
      try {const result=await request();if(this.closed||token!==this.operation)return;
        if(result?.cancelled)return;
        if(result?.ok!==true)throw Object.assign(new Error(result?.error?.message||'아이콘팩을 불러오지 못했습니다.'),{code:result?.error?.code||'READ_FAILED'});
        if(ref)this.failures.delete(refKey(ref));this.loadStatus.textContent='아이콘팩을 불러왔어요.';
      } catch(err) {if(this.closed||token!==this.operation)return;const code=err.code||'READ_FAILED';this.errorCode=code;this.loadStatus.textContent=(code==='ACCESS_DENIED'?'접근할 수 없는 게시글이에요. ':code==='ARTICLE_URL_INVALID'||code==='ARTICLE_PATH_NOT_ALLOWED'?'게시글 주소를 확인해 주세요. ':'팩을 불러오지 못했어요. ')+err.message+' 다른 팩을 선택하거나 다시 시도해 주세요.';this.retry.hidden=false;this.retry.focus({preventScroll:true});if(ref)this.failures.set(refKey(ref),code);}
      finally {if(!this.closed&&token===this.operation){this.busy=false;this.pending=null;this.setProgress({busy:false});this.node.setAttribute('aria-busy','false');this.submit.disabled=false;this.renderRows();}}
    }
    setProgress(info={}){
      if(this.closed)return;const busy=info.busy===undefined?info.status==='loading':!!info.busy;
      this.progress.hidden=!busy;this.loadingArt.hidden=!busy||!this.artAvailable||this.artFailed;
      this.cancel.textContent=busy&&!['cache','storage'].includes(info.phase)?'중지하고 목록 닫기':'목록 닫기';
      this.cancel.title=['cache','storage'].includes(info.phase)?'이미 시작한 캐시 작업은 마무리되며 목록에는 반영하지 않습니다.':'목록을 닫고 진행 중인 원본 수집을 중지합니다.';
      if(busy&&info.message){const n=Number.isFinite(info.processed)?info.processed:null,total=Number.isFinite(info.total)&&info.total>0?info.total:null;
        this.loadStatus.textContent=info.message+(n===null?'':' · '+n.toLocaleString('ko-KR')+(total===null?'개 처리':' / '+total.toLocaleString('ko-KR')+'개 처리'));
        if(n!==null&&total!==null){this.progress.max=total;this.progress.value=Math.min(total,Math.max(0,n));}else{this.progress.removeAttribute('value');this.progress.removeAttribute('max');}
      }
    }
    cancelPending(){this.operation++;this.busy=false;this.pending=null;this.setProgress({busy:false});this.node.setAttribute('aria-busy','false');this.submit.disabled=false;this.renderRows();}
    setEntries(entries,message='',packs=null){
      this.catalog.setEntries(entries.map(ref=>({...ref,knownIconCount:packs?.get(refKey(ref))?.pack?.icons.length??ref.knownIconCount})));
      const cached=this.catalog.entries.filter(ref=>packs?.has(refKey(ref))),indexed=cached.slice(-MAX_INDEXED);
      const active=cached.find(ref=>refKey(ref)===this.catalog.active);if(active&&!indexed.includes(active)){indexed.shift();indexed.push(active);}
      for(const ref of indexed)this.catalog.remember(ref,packs.get(refKey(ref)).pack);
      this.nativeStatus.textContent=message;this.render();
    }
    setPack(ref,pack){this.catalog.active=refKey(ref);this.catalog.remember(ref,pack);this.render();}
    collapse(){this.render();}
    render(){if(this.closed)return;const started=performance.now();this.result=this.catalog.search(this.input.value,this.scope.value);this.notice.textContent='팩 '+this.result.rows.length+'/'+this.result.total+'개 · '+(this.result.partial?'선택한 팩만 불러옵니다.':'아이콘 수를 확인했습니다.');this.renderRows();this.lastSearchMs=performance.now()-started;}
    renderRows(){if(this.closed)return;this.media.reset();this.content.replaceChildren();const rows=this.result?.rows||[];this.content.style.height=rows.length*ROW_HEIGHT+'px';const start=Math.max(0,Math.floor(this.viewport.scrollTop/ROW_HEIGHT)-2),end=Math.min(rows.length,start+MAX_ROWS);
      let moving=0;
      for(let i=start;i<end;i++) {const entry=rows[i],key=refKey(entry),selected=this.catalog.active===key,row=this.el('button');row.type='button';row.className='catalog-row';row.style.top=i*ROW_HEIGHT+'px';row.dataset.catalogKey=entry.key;row.dataset.articleId=entry.articleId;row.disabled=this.busy;row.setAttribute('aria-current',String(selected));row.setAttribute('aria-expanded',String(selected));row.setAttribute('aria-label',entry.title+' · '+(entry.iconCount===undefined?'아이콘 수 미확인':entry.iconCount+'개')+(selected?' · 현재 팩':''));
        const animated=/\.(?:gif|webp)(?:[?#]|$)/i.test(entry.thumbnail||'');
        const show=entry.thumbnail&&!/\.(?:mp4|webm)(?:[?#]|$)/i.test(entry.thumbnail)&&( !animated || moving++<4 );
        const thumbnail=this.el(show?'img':'span',show?'':'팩');thumbnail.className='catalog-thumbnail';if(show){thumbnail.alt='';thumbnail.loading='lazy';thumbnail.decoding='async';if(animated)thumbnail.dataset.animatedCatalogThumb='true';thumbnail.addEventListener('error',()=>{const placeholder=this.el('span','팩');placeholder.className='catalog-thumbnail';thumbnail.replaceWith(placeholder);},{once:true});this.media.add(thumbnail,entry.thumbnail);}
        const detail=this.el('span');detail.className='catalog-detail';detail.append(this.el('strong',entry.title),this.el('small',(entry.source==='developer'?'기본 제공 팩':entry.source==='favorite'?'즐겨찾기':'직접 등록')+' · '+entry.boardId+'/'+entry.articleId+' · '+(entry.iconCount===undefined?'아이콘 수 미확인':entry.iconCount+'개')));
        const status=this.pending===key?'로딩 중':this.failures.has(key)?(this.failures.get(key)==='ACCESS_DENIED'?'접근 불가':'조회 실패'):selected?'현재 팩':'선택';
        row.append(thumbnail,detail,this.el('span',status));row.addEventListener('click',()=>this.run(()=>this.onChoose?.(entry),entry));
        row.addEventListener('keydown',e=>{let next;if(e.key==='ArrowDown')next=Math.min(rows.length-1,i+1);else if(e.key==='ArrowUp')next=Math.max(0,i-1);else if(e.key==='Home')next=0;else if(e.key==='End')next=rows.length-1;else return;e.preventDefault();this.viewport.scrollTop=next*ROW_HEIGHT;this.renderRows();this.content.querySelector('[data-catalog-key="'+rows[next].key+'"]')?.focus();});this.content.append(row);
      }
    }
    snapshot(){return {entries:this.catalog.entries.length,rows:this.content.children.length,indexed:this.catalog.indexed.size,active:this.catalog.active,partial:this.result.partial,busy:this.busy,pending:this.pending,errorCode:this.errorCode||null,lastSearchMs:this.lastSearchMs||0,media:this.media.snapshot()};}
    destroy(){this.closed=true;this.operation++;this.events.abort();if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.media.destroy();this.catalog.destroy();this.node.remove();}
  }
  A.Catalog=Catalog;A.CatalogView=CatalogView;A.MediaBudget=MediaBudget;A.CatalogSources=Object.freeze({parseRef,refKey,developerPacks,favorites});
})(globalThis);


/* source: shared/ruliweb-icons/design-system.js */
/* Phase 2B-3 design foundation. No DOM, storage or font requests until attach(). */
(function(g){
  'use strict';
  const A=g.AruIcons=g.AruIcons||{};
  const LIGHT=Object.freeze({background:'#FAF7F2',surface:'#FFFFFF',soft:'#F4EDE7',text:'#30252B',muted:'#69535D',wine:'#923F61',deepWine:'#642940',gold:'#C5A268',softGold:'#E5CFA7',border:'#B9A8AE',primary:'#923F61',primaryText:'#FFFFFF',accentText:'#FFFFFF',selected:'#F5E9D4',selectedText:'#642940',danger:'#8C2929',dangerBackground:'#FFF0E9'});
  const DARK=Object.freeze({background:'#21181E',surface:'#2E232A',soft:'#3B2C34',text:'#F7EEE9',muted:'#D2BDC6',wine:'#E59AB6',deepWine:'#F2B7CF',gold:'#D9B77F',softGold:'#E5CFA7',border:'#947E89',primary:'#C5A268',primaryText:'#21181E',accentText:'#2B1721',selected:'#4D392C',selectedText:'#F7E3BE',danger:'#FFC1B1',dangerBackground:'#482A2A'});
  const variables=palette=>Object.entries(palette).map(([name,value])=>'--aru-'+name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value+';').join('');
  const css=`:host{${variables(LIGHT)}font-family:"Aru Pretendard",Pretendard,system-ui,-apple-system,"Malgun Gothic",sans-serif!important;color:var(--aru-text)!important;color-scheme:light}
  @media(prefers-color-scheme:dark){:host{${variables(DARK)}color-scheme:dark}}
  :host([data-aru-theme="light"]){${variables(LIGHT)}color-scheme:light}
  :host([data-aru-theme="dark"]){${variables(DARK)}color-scheme:dark}
  button,input,select,textarea{color:var(--aru-text);background:var(--aru-surface);border-color:var(--aru-border)}
  header,footer,.row,.preview,.viewport,.status{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
  .hint,.note,.info,.change-count,.drag{color:var(--aru-muted)}
  .fixed button[aria-pressed="true"],.chips button[aria-pressed="true"]{background:var(--aru-wine);color:var(--aru-accent-text);border-color:var(--aru-wine)}
  .apply{background:var(--aru-primary);color:var(--aru-primary-text);font-weight:800}
  .dialog,.body{background:var(--aru-background);color:var(--aru-text)}
  .header,.footer,.main,.selection,.group-viewport,.icon-card,.quiet,.tag-button,.group-count{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
  .header,.footer,.main,.selection,.group,.search-area,.search-box,.status-panel{border-color:var(--aru-border)}
  .search-box,.group-toggle,.status-panel,.selection-art,.media-placeholder,.catalog-row,.badge,.avatar,.small-tag{background:var(--aru-soft);color:var(--aru-deep-wine)}
  .primary,.brand,.tag-button[aria-pressed="true"]{background:var(--aru-wine);border-color:var(--aru-wine);color:var(--aru-accent-text)}
  .icon-card[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border:2px solid var(--aru-gold);box-shadow:inset 0 0 0 1px var(--aru-soft-gold)}
  .icon-card[aria-pressed="true"]::after{content:"✓";position:absolute;right:4px;top:2px;color:var(--aru-selected-text);font-size:13px;font-weight:800}
  .icon-card:hover:not([aria-pressed="true"]),.group-toggle:hover{background:var(--aru-soft)}
  a,.live,.reset{color:var(--aru-deep-wine)}
  .help,.summary,.icon-tags,.selection-label,.selection-detail,.selection-url,.phase-note,.metrics,.progress,.footer,.aliases,.group-foot,.pack-line,.icon-name,.text-button,.preview-status,.media-format{color:var(--aru-muted)}
  .summary strong{color:var(--aru-text)}.error{background:var(--aru-danger-background);color:var(--aru-danger)}
  input::placeholder{color:var(--aru-muted);opacity:1}
  button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid var(--aru-deep-wine)}
  .selection-note{color:var(--aru-selected-text);background:var(--aru-selected)}
  .selection-art{background:var(--aru-soft)}.catalog{background:var(--aru-surface);border-color:var(--aru-border)}
  .catalog input,.catalog select{background:var(--aru-surface);border-color:var(--aru-border);color:var(--aru-text)}
  .catalog-direct button,.catalog-thumbnail,.catalog-row[aria-expanded="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-color:var(--aru-gold)}
  .catalog-detail small{color:var(--aru-muted)}.target-error{background:var(--aru-danger-background);color:var(--aru-danger)}
  .search-input{color:var(--aru-text)}.search-box:focus-within{border-color:var(--aru-deep-wine);box-shadow:0 0 0 2px var(--aru-soft-gold)}
  .clear-search,.search-symbol,.arrow{color:var(--aru-muted)}
  @media(forced-colors:active){.icon-card[aria-pressed="true"]{outline:2px solid Highlight}}
  `;

  const entryCss=`:host{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px;max-width:100%;vertical-align:middle;margin:3px;font-size:13px;line-height:1.4}
  .aru-entry-button{all:unset;box-sizing:border-box;font:inherit;font-weight:700;display:inline-flex;align-items:center;justify-content:center;min-height:34px;max-width:100%;padding:6px 10px;border:1px solid var(--aru-border);border-radius:7px;background:var(--aru-surface);color:var(--aru-deep-wine);cursor:pointer;touch-action:manipulation;white-space:normal}
  .aru-entry-button[data-priority="primary"],.primary{background:var(--aru-primary);color:var(--aru-primary-text);border-color:var(--aru-primary);font-weight:800}
  .aru-entry-button{gap:6px}.aru-entry-icon{display:block;flex:0 0 20px;width:20px;height:20px;object-fit:contain;pointer-events:none}
  .aru-entry-button:hover:enabled{box-shadow:inset 0 0 0 2px var(--aru-soft-gold)}
  .aru-entry-button:active:enabled{transform:translateY(1px)}
  .aru-entry-button:focus-visible{outline:3px solid var(--aru-deep-wine);outline-offset:2px}
  .aru-entry-button:disabled{opacity:.55;cursor:default;transform:none}
  .aru-entry-button[aria-busy="true"]::after{content:' · 준비 중';font-size:11px}
  .aru-media-count{font-size:11px;color:var(--aru-muted);padding:3px 5px;overflow-wrap:anywhere;cursor:default}.aru-media-count.warn{color:var(--aru-danger)}
  @media(pointer:coarse){.aru-entry-button{min-height:44px}}
  `;
  const polish=`/* RC1 presentation only. Virtual card dimensions remain owned by picker.js. */
:host{--aru-space-1:4px;--aru-space-2:8px;--aru-space-3:12px;--aru-space-4:16px;--aru-space-5:24px;--aru-radius:8px;--aru-divider:color-mix(in srgb,var(--aru-border) 48%,var(--aru-surface));--aru-shadow:0 20px 64px #170e1938;font-size:14px;line-height:1.5}
*{scrollbar-color:var(--aru-border) var(--aru-surface);scrollbar-width:thin}
::selection{background:var(--aru-selected);color:var(--aru-selected-text)}
input,textarea{caret-color:var(--aru-deep-wine)}
button,input,select,textarea{font-family:inherit;border-radius:var(--aru-radius)}
a{color:var(--aru-deep-wine);text-underline-offset:3px}
button{font-weight:600;transition:background-color 150ms ease-out,color 150ms ease-out}
button:disabled{opacity:.55;cursor:default}
button:hover:enabled{background:var(--aru-soft)}
button.primary:hover:enabled,button.apply:hover:enabled,.aru-entry-button[data-priority="primary"]:hover:enabled{background:var(--aru-deep-wine);color:var(--aru-surface)}
:host([data-aru-theme="dark"]) button.primary:hover:enabled,:host([data-aru-theme="dark"]) button.apply:hover:enabled,:host([data-aru-theme="dark"]) .aru-entry-button[data-priority="primary"]:hover:enabled{background:var(--aru-soft-gold);color:var(--aru-primary-text)}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible,[tabindex="0"]:focus-visible{outline:2px solid var(--aru-deep-wine);outline-offset:2px}
.search-box:focus-within{outline:2px solid var(--aru-deep-wine);outline-offset:2px;box-shadow:none}
.dialog,.dialog[data-modal-size="max"]{border:0;border-radius:16px;box-shadow:var(--aru-shadow)}
.dialog .header,.dialog header{padding:16px 20px;border-color:var(--aru-divider);background:var(--aru-surface)}
.dialog h1,.dialog h2,.dialog header strong{font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.dialog .header-title h1,.dialog .header h2,.dialog header strong{font-size:18px}
.dialog .brand{width:32px;height:32px;flex-basis:32px;border-radius:8px;font-size:21px}
.dialog .pack-line{font-size:12px;gap:8px}
.dialog .badge{font-size:12px;padding:0;background:transparent;color:var(--aru-muted);border-radius:0}
.dialog .pack-kind,.dialog .selection-label .badge,.dialog .metrics{display:none}
.dialog .view-controls{padding:6px 20px;border-color:var(--aru-divider);gap:12px}
.dialog .mode-label{font-size:12px;gap:6px}
.dialog .quiet,.dialog .view-controls select,.dialog .mode-label select{border-color:var(--aru-divider);border-radius:8px}
.dialog .view-controls button,.dialog .view-controls select,.dialog .mode-label select{min-height:34px}
.dialog .bundle-view .body,.dialog.bundle-view .body{gap:8px;padding:12px 16px}
.dialog .main{border:0;border-radius:0;background:var(--aru-surface)}
.dialog .selection{border:0;border-left:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface)}
.dialog .selection-label{font-size:12px;color:var(--aru-muted)}
.dialog .selection-art{background:var(--aru-soft);border-radius:12px}
.dialog .selection-detail,.dialog .selection-url,.dialog .phase-note,.dialog .selection-note,.dialog .preview-status{font-size:12px;line-height:1.5}
.dialog .selection-name{font-size:16px;font-weight:700}
.dialog .selection-tags .small-tag{font-size:12px;background:transparent;padding:0;color:var(--aru-muted)}
.dialog .primary,.dialog .apply{border:0;border-radius:8px;min-height:40px;font-size:14px;font-weight:700}
.dialog .search-area{border-color:var(--aru-divider)}
.dialog .search-box{background:var(--aru-surface);border-color:var(--aru-border);border-radius:8px;height:44px}
.dialog .search-input{font-size:14px}
.dialog .search-symbol{display:flex;width:18px;height:18px;margin:0 12px;font-size:0;flex-shrink:0}
.dialog .close,.dialog .clear-search{display:inline-flex;align-items:center;justify-content:center;background:var(--aru-surface);color:var(--aru-text)}
.dialog svg.aru-ui-icon{width:18px;height:18px;flex-shrink:0;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;fill:none;pointer-events:none}
.dialog .tag-button{border:1px solid transparent;background:var(--aru-soft);color:var(--aru-muted);font-size:12px;font-weight:500;border-radius:6px;min-height:30px;padding:3px 9px}
.dialog .tag-button[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-color:var(--aru-gold);font-weight:700}
.dialog .chips{gap:4px}
.dialog .help,.dialog .summary,.dialog .note,.dialog .hint,.dialog .info,.dialog .change-count{font-size:12px;line-height:1.5;color:var(--aru-muted)}
.dialog .help{margin-top:6px}
.dialog .library-status:empty,.dialog .live:empty,.dialog .status:empty{display:none}
.dialog .toolbar{padding:6px 12px}
.dialog .text-button{font-size:12px;min-height:32px}
.dialog .icon-card{border:1px solid transparent;border-radius:8px;background:var(--aru-surface)}
.dialog .icon-card:hover:not([aria-pressed="true"]){border-color:transparent;background:var(--aru-soft)}
.dialog .icon-card[aria-pressed="true"]{border:2px solid var(--aru-gold);background:var(--aru-selected);box-shadow:none}
.dialog .icon-card[aria-pressed="true"]::after{content:"";width:5px;height:9px;border:solid var(--aru-selected-text);border-width:0 2px 2px 0;transform:rotate(45deg);right:7px;top:5px}
.dialog .icon-name,.dialog .icon-tags{font-size:11px;line-height:14px}
.dialog .card-preview{font-size:11px;line-height:16px;border:0;background:transparent;color:var(--aru-deep-wine);border-radius:4px}
.dialog[data-icon-size="small"] .icon-name,.dialog[data-icon-size="small"] .icon-tags{font-size:10.5px;line-height:12px}
.dialog .status-panel{border:0;border-top:1px solid var(--aru-divider);border-radius:0;background:transparent;padding:8px 0}
.dialog .progress,.dialog .live{font-size:12px;line-height:1.5}
.dialog .footer,.dialog footer{font-size:12px;border-color:var(--aru-divider);background:var(--aru-surface);padding:10px 20px}
.dialog .catalog{border:0;border-radius:12px;box-shadow:none;padding:16px 20px;background:var(--aru-surface)}
.dialog .catalog-row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface)}
.dialog .catalog-row[aria-current="true"]{background:var(--aru-selected);color:var(--aru-selected-text);border-radius:8px}
.dialog .catalog-row[aria-current="true"]::after{content:"";width:7px;height:12px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg);margin:0 8px}
.dialog .catalog-detail strong{font-size:14px;font-weight:600}
.dialog .catalog-detail small{font-size:12px}
.dialog .catalog-row>span:last-child{font-size:12px;color:var(--aru-muted)}
.dialog .catalog-thumbnail{background:var(--aru-soft);color:var(--aru-muted);font-size:12px;border-radius:8px}
.dialog .catalog-direct{border-top:1px solid var(--aru-divider);padding-top:12px}
.dialog .catalog-load-status{color:var(--aru-muted);font-size:12px}
.dialog .pack-toast{border:0;border-radius:8px;box-shadow:0 4px 16px #170e1924;font-size:12px}
/* Tag editor and bundle generator share the same controls and flat lists. */
.dialog .viewport{border:0;border-radius:0;background:var(--aru-surface)}
.dialog .card{background:var(--aru-surface);border:1px solid transparent;border-radius:8px}
.dialog .card[aria-pressed="true"]{background:var(--aru-selected);color:var(--aru-selected-text);box-shadow:none;border:2px solid var(--aru-gold)}
.dialog .card .check{width:16px;height:16px;border:1px solid var(--aru-muted);font-size:0!important;background:var(--aru-surface)!important}
.dialog .card[aria-pressed="true"] .check{border-color:var(--aru-gold);background:var(--aru-selected)!important}
.dialog .card[aria-pressed="true"] .check::after{content:"";position:absolute;width:5px;height:9px;left:4px;top:1px;border:solid var(--aru-selected-text);border-width:0 2px 2px 0;transform:rotate(45deg)}
.dialog .fixed button,.dialog .chips button{border-color:var(--aru-divider);background:var(--aru-soft);color:var(--aru-text);font-weight:500}
.dialog .fixed button[aria-pressed="true"],.dialog .chips button[aria-pressed="true"]{background:var(--aru-selected);border-color:var(--aru-gold);color:var(--aru-selected-text);font-weight:700}
.dialog .row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface);margin:0;padding:12px 0}
.dialog .row.drag-over{outline:2px solid var(--aru-deep-wine);outline-offset:-2px}
.dialog .row-head strong{font-size:14px;font-weight:600}
.dialog .actions{flex-wrap:wrap}
.dialog .preview{border:0;border-top:1px solid var(--aru-divider);border-radius:0;background:var(--aru-surface);padding:16px 0}
.dialog .status{background:transparent;padding:8px 0;border-radius:0;color:var(--aru-muted);font-size:12px}
.dialog .status.error,.dialog .target-error,.dialog .error{background:var(--aru-danger-background);color:var(--aru-danger);padding:10px 12px;border-radius:8px;font-size:13px}
.dialog .article-search{border:0;border-top:1px solid var(--aru-divider);border-bottom:1px solid var(--aru-divider);border-radius:0;padding:16px 0;margin:20px 0}
.dialog .article-search h3{font-size:14px;font-weight:700;margin:0 0 8px}
.dialog .search-row{border:0;border-bottom:1px solid var(--aru-divider);border-radius:0;margin:0;background:var(--aru-surface);padding:10px 8px}
.dialog .search-row.selected{background:var(--aru-selected);color:var(--aru-selected-text);border-radius:8px}
.dialog .search-row .thumbnail{background:var(--aru-soft)}
.dialog .search-row small,.dialog .apply-reason{font-size:12px;color:var(--aru-muted)}
.dialog .search-row input{accent-color:var(--aru-deep-wine)}
.dialog .search-row:focus-visible{outline-color:var(--aru-deep-wine)}
.dialog input:not([type="checkbox"]),.dialog textarea,.dialog select{background:var(--aru-surface);color:var(--aru-text);border-color:var(--aru-border)}
.dialog input:not([type="checkbox"]){min-height:40px}
.dialog .search-input{min-height:0!important}
.aru-entry-button{border-radius:6px;min-height:34px;font-size:13px;box-shadow:none}
.aru-entry-button:hover:enabled{box-shadow:none;background:var(--aru-soft)}
@media(max-width:750px){.dialog .selection{border-left:0;border-top:1px solid var(--aru-divider)}.dialog .mode-label{font-size:11px}.dialog .header,.dialog header{padding:10px 12px}.dialog .view-controls{padding:4px 12px;gap:6px}.dialog .footer,.dialog footer{padding:8px 12px}.dialog .catalog{padding:12px}.dialog .bundle-view .body,.dialog.bundle-view .body{padding:8px}.dialog .help{font-size:11px}.dialog .search-box{height:44px}}
@media(max-width:500px){.dialog .header-actions{justify-content:flex-start}.dialog .header-title{flex-basis:calc(100% - 52px)}.dialog .catalog-detail strong{font-size:13px}.dialog .catalog-detail small{font-size:11px}.dialog .catalog-row{gap:8px}.dialog .catalog-row>span:last-child{font-size:11px}.dialog .selection-detail,.dialog .preview-status{font-size:11px}.dialog .lookup button{flex:1}.dialog .actions{gap:4px}.dialog .actions button{min-height:34px}.dialog .search-toolbar input{min-width:100px}.dialog .primary,.dialog .apply{font-size:13px}}
@media(max-height:600px){.dialog .header,.dialog header{padding:6px 12px}.dialog .view-controls{padding:4px 12px}.dialog .phase-note,.dialog .metrics{display:none}}
@media(pointer:coarse){.dialog button:not(.card-choose),.dialog select,.aru-entry-button{min-height:44px}.dialog .close,.dialog .clear-search{min-width:44px}.dialog .card-preview{min-height:44px}.dialog .tag-button{padding:4px 10px}.dialog .card-choose{touch-action:pan-y}}
@media(prefers-reduced-motion:reduce){button{transition:none}.aru-entry-button:active:enabled{transform:none}}
@media(forced-colors:active){.dialog .icon-card[aria-pressed="true"],.dialog .card[aria-pressed="true"],.dialog .catalog-row[aria-current="true"],.dialog .tag-button[aria-pressed="true"]{outline:2px solid Highlight;outline-offset:-2px}.dialog svg{forced-color-adjust:auto}}
`;
  const fonts=new WeakMap(),themes=new WeakMap();
  function observeTheme(shadow){
    const doc=shadow.host.ownerDocument;
    let watch=themes.get(doc);
    if(!watch){
      const hosts=new Set(),mq=g.matchMedia?.('(prefers-color-scheme: dark)');
      const detect=()=>{
        // Read the site's actual painted background; no assumed theme class names.
        for(const node of [doc.body,doc.documentElement]){
          const c=node&&g.getComputedStyle(node).backgroundColor,values=c?.match(/[\d.]+/g)?.map(Number);
          if(values?.length>=3&&(values.length<4||values[3]>=.95))return (.2126*values[0]+.7152*values[1]+.0722*values[2])<128?'dark':'light';
        }
        return mq?.matches?'dark':'light';
      };
      const update=()=>{const theme=detect();for(const host of hosts)host.dataset.aruTheme=theme;};
      const observer=g.MutationObserver?new g.MutationObserver(update):null;
      for(const node of [doc.documentElement,doc.body])if(node)observer?.observe(node,{attributes:true,attributeFilter:['class','style','data-theme','data-color-scheme']});
      mq?.addEventListener?.('change',update);
      watch={hosts,update,observer,mq};themes.set(doc,watch);
    }
    watch.hosts.add(shadow.host);watch.update();
    return ()=>{watch.hosts.delete(shadow.host);if(!watch.hosts.size){watch.observer?.disconnect();watch.mq?.removeEventListener?.('change',watch.update);themes.delete(doc);}};
  }
  function entry(shadow,{label,tooltip,priority='secondary',fontURL}={}){
    const cleanup=attach(shadow,{fontURL});
    const style=shadow.host.ownerDocument.createElement('style');style.textContent=entryCss;shadow.append(style);
    const button=shadow.querySelector('button');button.classList.add('aru-entry-button');button.dataset.priority=priority;button.textContent=label;button.title=tooltip;
    const iconName={'아이콘 선택':'editor-select','아이콘 통합':'editor-bundle','아이콘 태그':'editor-tags','이미지 첨부':'editor-upload'}[label];
    const icon=iconName&&assetImage(shadow.host.ownerDocument,'assets/icons/'+iconName+'-20.png',iconName,'aru-entry-icon');
    if(icon)button.prepend(icon);
    return cleanup;
  }
  function fallbackIcon(doc,kind,className){
    const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('class',className);svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');
    const path=doc.createElementNS(ns,'path');path.setAttribute('d',String(kind).includes('tags')?'M3 3h8l10 10-8 8L3 11Z M7 7h.01':'M4 5h16v14H4Z M4 15l5-5 5 5 3-3 3 3');svg.append(path);return svg;
  }
  function assetURL(file){
    try{return g.browser?.runtime?.getURL?.(file)||g.chrome?.runtime?.getURL?.(file)||null;}catch(_){return null;}
  }
  function assetImage(doc,file,kind,className,onFallback){
    const url=file.startsWith('assets/icons/')?assetURL('assets/icons/'+file.slice('assets/icons/'.length)):assetURL(file);
    if(!url)return fallbackIcon(doc,kind,className);
    const image=doc.createElement('img');image.className=className;image.alt='';image.setAttribute('aria-hidden','true');image.width=20;image.height=20;image.draggable=false;
    image.addEventListener('error',()=>{const fallback=fallbackIcon(doc,kind,className);image.replaceWith(fallback);onFallback?.(fallback);},{once:true});image.src=url;return image;
  }
  // Shared decorative header only; no editor, picker or metadata state is touched.
  const modalHeaderCss=`
    .dialog .aru-modal-header{--aru-header-art:128px;display:grid;grid-template-columns:minmax(0,1fr) var(--aru-header-art) auto;align-items:center;gap:16px;padding:12px 20px;flex-shrink:0;box-sizing:border-box}
    .dialog .aru-modal-heading{min-width:0;flex-basis:auto;overflow-wrap:anywhere}
    .dialog .aru-modal-heading h1,.dialog .aru-modal-heading h2{margin:0}
    .dialog .aru-modal-description{font-size:12px;line-height:1.5;color:var(--aru-muted);margin:4px 0 0}
    .dialog .aru-modal-character{display:block;width:var(--aru-header-art);height:var(--aru-header-art);max-width:none;max-height:none;object-fit:contain;aspect-ratio:1;margin-block:-8px;pointer-events:none;user-select:none}
    .dialog .aru-modal-header .header-actions{display:flex;width:auto;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:nowrap}
    .dialog .aru-modal-header .close,.dialog .aru-modal-header [data-action="close"]{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;flex-shrink:0}
    .dialog .aru-modal-header.aru-modal-no-art{grid-template-columns:minmax(0,1fr) auto}
    .dialog .aru-modal-no-art .aru-modal-heading{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;column-gap:8px}
    .dialog .aru-modal-no-art .aru-modal-character{width:24px;height:24px;margin:0;grid-row:1}
    .dialog .aru-modal-no-art .aru-modal-heading>:not(.aru-modal-character){grid-column:2}
    @media(max-width:750px){.dialog .aru-modal-header{--aru-header-art:56px;gap:8px;padding:10px 12px}.dialog .aru-modal-character{margin-block:-4px}}
    @media(max-height:600px){.dialog .aru-modal-header{--aru-header-art:32px;gap:6px;padding:6px 10px}.dialog .aru-modal-character{margin:0}}
    @media(max-width:500px){.dialog .aru-modal-header .header-actions{flex-direction:column;align-items:flex-end;gap:4px}.dialog .aru-modal-header #catalog-dock{font-size:11px;padding:4px 6px}.dialog .aru-modal-description{font-size:11px}}
  `;
  function modalHeader(header,{kind,description}={}){
    const file={select:'modal-select',bundle:'modal-bundle',tags:'modal-tags'}[kind];
    if(!header||!file||header.classList.contains('aru-modal-header'))return;
    const doc=header.ownerDocument,shadow=header.getRootNode();
    let heading=header.querySelector('.header-title,h1,h2,strong');
    if(!heading)return;
    if(!heading.classList.contains('header-title')){const wrapper=doc.createElement('div');header.insertBefore(wrapper,heading);wrapper.append(heading);heading=wrapper;}
    heading.classList.add('aru-modal-heading');header.classList.add('aru-modal-header');
    if(description){const note=doc.createElement('p');note.className='aru-modal-description';note.textContent=description;heading.append(note);}
    if(!shadow.querySelector('[data-aru-modal-header-style]')){const style=doc.createElement('style');style.dataset.aruModalHeaderStyle='';style.textContent=modalHeaderCss;shadow.append(style);}
    const compactFallback=fallback=>{header.classList.add('aru-modal-no-art');heading.prepend(fallback);};
    const image=assetImage(doc,'assets/icons/'+file+'-256.png',kind,'aru-modal-character',compactFallback);image.setAttribute('width','128');image.setAttribute('height','128');
    if(image.tagName.toLowerCase()==='svg')compactFallback(image);else heading.after(image);
  }
  function attach(shadow,{fontURL}={}){
    if(!shadow||shadow.querySelector('[data-aru-design-tokens]'))return ()=>{};
    const doc=shadow.host.ownerDocument,style=doc.createElement('style');style.dataset.aruDesignTokens='';style.textContent=css+polish+' .primary{background:var(--aru-primary);border-color:var(--aru-primary);color:var(--aru-primary-text)}';shadow.append(style);
    if(!fonts.has(doc)&&g.FontFace&&doc.fonts){
      const url=fontURL||assetURL('assets/fonts/PretendardVariable.woff2');
      if(url){try{const face=new g.FontFace('Aru Pretendard','url("'+url+'")',{weight:'45 920',display:'swap'});doc.fonts.add(face);
        fonts.set(doc,face.load().then(()=>true).catch(()=>false));}catch(_){fonts.set(doc,Promise.resolve(false));}}
    }
    return observeTheme(shadow);
  }
  function contrast(foreground,background){
    const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }
  A.DesignSystem=Object.freeze({LIGHT,DARK,css:css+entryCss+polish,attach,entry,observeTheme,contrast,assetURL,assetImage,modalHeader});
})(globalThis);


/* source: shared/ruliweb-icons/library-search.js */
/* Pure search + explicitly requested bounded collection. Picker controls ship in r2. */
(function(g){
  'use strict';
  const A=g.AruIcons=g.AruIcons||{},norm=value=>A.normalize(value),key=ref=>String(ref.boardId)+':'+ref.articleId;
  const abort=()=>Object.assign(new Error('검색 수집을 중지했습니다.'),{code:'ABORTED'});
  function identity(icon,ref){
    const article=icon.origin?.articleId||ref.articleId,board=String(ref.boardId);
    return JSON.stringify(icon.imageMetadata?.id?[board,article,'metadata',icon.imageMetadata.id]:[board,article,'occurrence',icon.origin?.originalIndex??icon.ref?.index??icon.id,icon.url]);
  }
  function tags(icon,pack){
    const dictionary=new Map((pack.tags||[]).map(tag=>[tag.id,tag.name]));
    return [...new Set([...(icon.imageMetadata?.tags||[]),...(icon.tagIds||[]).map(id=>dictionary.get(id)).filter(Boolean)].filter(tag=>typeof tag==='string').map(norm).filter(Boolean))];
  }
  class LibrarySearchEngine{
    constructor({reader=null,concurrency=2,maxPacks=200}={}){
      this.reader=reader;this.concurrency=Math.max(1,Math.min(2,concurrency));this.maxPacks=Math.min(200,Math.max(1,maxPacks));
      this.entries=new Map();this.packs=new Map();this.rows=[];this.cache=new Map();this.revision=0;this.closed=false;
      this.state={scope:'current',currentKey:null,query:'',textMatch:'all',selectedTags:[],tagMatch:'any'};this.progress={status:'idle',total:0,cached:0,loaded:0,failed:0,errors:[]};
    }
    setEntries(entries){
      const next=new Map();for(const raw of entries){try{const ref=A.CatalogSources.parseRef(raw.url||String(raw.articleId),String(raw.boardId||'98')),id=key(ref);
        if(!next.has(id)&&next.size>=this.maxPacks)continue;const old=next.get(id);next.set(id,{...ref,title:String(raw.title||raw.name||''),source:raw.source||'direct',sources:[...new Set([...(old?.sources||[]),...(raw.sources||[]),raw.source||'direct'])]});}catch(_){/* Never request invalid URLs. */}}
      if(JSON.stringify([...next.keys()])!==JSON.stringify([...this.entries.keys()]))this.cancel();this.entries=next;
      for(const id of this.packs.keys())if(!next.has(id))this.packs.delete(id);this.rebuild();
    }
    remember(ref,pack,{acquiredAt=Date.now(),stale=false}={}){
      if(this.closed)return;const id=key(ref);if(!this.entries.has(id)){if(this.entries.size>=this.maxPacks)return;this.entries.set(id,{...ref,title:pack.name||pack.title||'',sources:[ref.source||'direct']});}
      this.packs.set(id,{pack,acquiredAt,stale});this.rebuild();
    }
    rebuild(){
      const rows=new Map();let order=0;
      for(const [id,ref]of this.entries){const stored=this.packs.get(id);if(!stored)continue;
        for(const [position,icon]of (stored.pack.icons||[]).entries()){
          const token=identity(icon,ref),titles=[ref.title,stored.pack.name,stored.pack.title,(stored.pack.sources||[]).find(s=>(s.articleId&&s.articleId===icon.origin?.articleId)||s.sourceId===icon.sourceId)?.title].filter(x=>typeof x==='string'&&x.trim()).map(norm);
          const membership={packKey:id,title:ref.title,position,kind:stored.pack.kind,sources:[...(ref.sources||[ref.source||'direct'])],titles};
          const existing=rows.get(token);
          if(existing){if(!existing.memberships.some(m=>m.packKey===id))existing.memberships.push(membership);
            if(stored.acquiredAt>existing.acquiredAt){existing.icon=icon;existing.tags=tags(icon,stored.pack);existing.tagLabels=[...new Set([...(icon.imageMetadata?.tags||[]),...(icon.tagIds||[]).map(id=>(stored.pack.tags||[]).find(t=>t.id===id)?.name).filter(Boolean)])];existing.acquiredAt=stored.acquiredAt;}}
          else rows.set(token,{identity:token,icon,tags:tags(icon,stored.pack),tagLabels:[...new Set([...(icon.imageMetadata?.tags||[]),...(icon.tagIds||[]).map(id=>(stored.pack.tags||[]).find(t=>t.id===id)?.name).filter(Boolean)])],memberships:[membership],order:order++,acquiredAt:stored.acquiredAt});
        }
      }
      this.rows=[...rows.values()];this.cache.clear();
    }
    setState(state={}){
      const next={...this.state,...state};next.query=String(next.query||'');next.scope=next.scope==='all'?'all':'current';next.textMatch=next.textMatch==='any'?'any':'all';next.tagMatch=next.tagMatch==='all'?'all':'any';next.selectedTags=[...new Set((next.selectedTags||[]).map(norm))];
      if(['query','scope','currentKey','textMatch'].some(k=>next[k]!==this.state[k]))this.cancel();this.state=next;return this.search();
    }
    search(){
      const state=this.state,cacheKey=JSON.stringify(state);if(this.cache.has(cacheKey))return this.cache.get(cacheKey);
      const terms=A.queryTokens(state.query),items=[];
      for(const row of this.rows){const memberships=row.memberships.filter(m=>state.scope==='all'||m.packKey===state.currentKey);if(!memberships.length)continue;
        if(state.selectedTags.length){const matched=state.selectedTags.map(tag=>row.tags.includes(tag));if(!(state.tagMatch==='all'?matched.every(Boolean):matched.some(Boolean)))continue;}
        const titles=memberships.flatMap(m=>m.titles),scores=terms.map(term=>row.tags.includes(term)?8:row.tags.some(tag=>tag.includes(term))?4:titles.some(title=>title===term)?2:titles.some(title=>title.includes(term))?1:0);
        if(terms.length&&!(state.textMatch==='all'?scores.every(Boolean):scores.some(Boolean)))continue;
        items.push({...row,memberships,order:state.scope==='current'?memberships[0].position:row.order,score:scores.reduce((a,b)=>a+b,0)});
      }
      items.sort((a,b)=>(terms.length?b.score-a.score:0)||a.order-b.order);
      const scopedKeys=[...this.entries.keys()].filter(id=>state.scope==='all'||id===state.currentKey);
      const partial=scopedKeys.some(id=>!this.packs.has(id)||this.packs.get(id).stale)||this.progress.errors.some(error=>scopedKeys.includes(error.packKey));
      const result={items,count:items.length,scope:state.scope,partial,progress:{...this.progress},registered:this.entries.size,indexed:this.packs.size,scopedRegistered:scopedKeys.length,scopedIndexed:scopedKeys.filter(id=>this.packs.has(id)).length};
      if(this.cache.size>=32)this.cache.delete(this.cache.keys().next().value);this.cache.set(cacheKey,result);return result;
    }
    cancel(){this.revision++;this.controller?.abort();this.controller=null;if(this.progress.status==='loading'){this.progress={...this.progress,status:'cancelled'};this.cache.clear();}}
    async collect({refresh=false,onProgress=()=>{}}={}){
      this.cancel();if(this.closed||!this.reader)return this.search();const controller=new AbortController();this.controller=controller;const revision=this.revision,signal=controller.signal;
      const refs=[...this.entries].filter(([id])=>this.state.scope==='all'||id===this.state.currentKey);
      this.progress={status:'loading',total:refs.length,cached:0,loaded:0,failed:0,errors:[]};this.cache.clear();
      const ensure=()=>{if(this.closed||signal.aborted||revision!==this.revision)throw abort();};
      const emit=()=>{ensure();this.cache.clear();onProgress(this.search());};
      const parallel=async(rows,action)=>{let cursor=0;const worker=async()=>{while(cursor<rows.length){ensure();await action(rows[cursor++]);}};await Promise.all(Array.from({length:Math.min(this.concurrency,rows.length)},worker));};
      // Hydrate all registered cache entries before starting slow public-page reads.
      // Cache unavailability does not make an otherwise public pack inaccessible.
      try{
        if(!refresh)await parallel(refs,async([id,ref])=>{let cached;try{cached=await this.reader.getCached(ref,{signal});}catch(error){if(error.code==='ABORTED'||signal.aborted)throw abort();}ensure();if(cached?.pack){if(!this.packs.has(id)||cached.acquiredAt>this.packs.get(id).acquiredAt)this.remember(ref,cached.pack,cached);this.progress.cached++;emit();}});
        const pending=refs.filter(([id])=>refresh||!this.packs.has(id)||this.packs.get(id).stale);
        await parallel(pending,async([id,ref])=>{try{ensure();if(refresh)await this.reader.invalidate(ref,{signal});ensure();
          const loaded=await this.reader.load(ref,{signal,forceRead:refresh});ensure();this.remember(ref,loaded.pack||loaded,{acquiredAt:Date.now(),stale:false});this.progress.loaded++;emit();
        }catch(error){if(error.code==='ABORTED'||signal.aborted)throw abort();ensure();this.progress.failed++;this.progress.errors.push({packKey:id,code:error.code||'READ_FAILED'});emit();}});
        ensure();this.progress.status=this.progress.failed?'partial':'complete';emit();return this.search();}
      catch(error){if(error.code!=='ABORTED')throw error;if(revision===this.revision){this.progress.status='cancelled';this.cache.clear();}return {cancelled:true};}
      finally{if(this.controller===controller)this.controller=null;}
    }
    destroy(){this.closed=true;this.cancel();this.entries.clear();this.packs.clear();this.rows=[];this.cache.clear();}
  }
  A.LibrarySearchEngine=LibrarySearchEngine;A.libraryIconIdentity=identity;
  A.libraryFixedTags=Object.freeze(['인사','사과','축하','응원','감사','미소','도발','조토피아','매도','분노','슬픔','당황','놀람']);
})(globalThis);


/* source: shared/ruliweb-icons/library-reader.js */
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
        if(pack?.icons?.length)return {pack,acquiredAt:cached.acquiredAt||0,stale:cached.stale===true||cached.snapshot?.sourceCheck?.status==='partial'||cached.snapshot?.sourceCheck?.states?.some(s=>s.metadataReadError||s.tagErrors||s.ambiguousMetadata)||(pack.kind==='BUNDLE'&&(pack.attributeReaderVersion!==2||pack.mediaReaderVersion!==1))};
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


/* source: shared/ruliweb-icons/ui-preferences.js */
/* Picker appearance only. No cache, sync settings, favorites or metadata writes. */
(function(g){
  'use strict';
  const A=g.AruIcons=g.AruIcons||{},key='aruIconsPickerUiV1';
  const defaults=Object.freeze({modalSize:'default',iconSize:'normal',previewVisible:true});
  function sanitize(value){
    const v=value&&typeof value==='object'?value:{};
    return {modalSize:['default','wide','max'].includes(v.modalSize)?v.modalSize:'default',
      iconSize:['small','normal','large'].includes(v.iconSize)?v.iconSize:'normal',
      previewVisible:typeof v.previewVisible==='boolean'?v.previewVisible:true};
  }
  function create({api=g.browser||g.chrome,promiseApi=!!g.browser}={}){
    let writes=Promise.resolve();
    function invoke(method,args){
      const storage=api?.storage?.local;
      if(typeof storage?.[method]!=='function')return Promise.reject(Error('Local storage unavailable'));
      if(promiseApi){try{return Promise.resolve(storage[method](...args));}catch(error){return Promise.reject(error);}}
      return new Promise((resolve,reject)=>{try{storage[method](...args,result=>{
        const error=api.runtime?.lastError;if(error)reject(Error(error.message||'Storage failed'));else resolve(result);
      });}catch(error){reject(error);}});
    }
    return Object.freeze({key,defaults,sanitize,
      read:async()=>sanitize((await invoke('get',[[key]]))?.[key]),
      write:value=>{const next={schemaVersion:1,...sanitize(value)};
        const pending=writes.catch(()=>{}).then(()=>invoke('set',[{[key]:next}]));writes=pending;return pending;}
    });
  }
  A.createUiPreferences=create;A.UiPreferences=create();
})(globalThis);


/* source: shared/ruliweb-icons/picker.js */
/* Aru Source Captioner: isolated icon library; unified virtual grid and native insertion. */
(function (global) {
  'use strict';
  const api = global.AruIcons = global.AruIcons || {};
  const MAX_CARDS = 72;
  const UI_SIZES=Object.freeze({small:{row:96,card:88,width:92,media:32,mediaWidth:48},normal:{row:120,card:112,width:108,media:53,mediaWidth:64},large:{row:168,card:160,width:152,media:96,mediaWidth:104}});
  function mouseDoubleClick(event,proof,now){return event.isTrusted===true&&event.type==='dblclick'&&event.button===0&&event.detail===2&&event.sourceCapabilities?.firesTouchEvents!==true&&proof?.trusted===true&&proof.pointerType==='mouse'&&now-proof.time>=0&&now-proof.time<=1200&&now-proof.touchTime>1200;}
  api.isMouseDoubleClick=mouseDoubleClick;
  let nextPickerId = 0;
  // Shared per-document lock: closing a picker restores the page's own overflow.
  const scrollLocks = new WeakMap();
  function lockPage(doc) {
    let lock=scrollLocks.get(doc);
    if(!lock){lock={count:0,styles:[doc.documentElement,doc.body].filter(Boolean).map(node=>({node,value:node.style.getPropertyValue('overflow'),priority:node.style.getPropertyPriority('overflow')}))};scrollLocks.set(doc,lock);}
    lock.count++;lock.styles.forEach(({node})=>node.style.setProperty('overflow','hidden','important'));
    return ()=>{if(--lock.count)return;for(const {node,value,priority}of lock.styles){if(node.style.getPropertyValue('overflow')!=='hidden')continue;if(value)node.style.setProperty('overflow',value,priority);else node.style.removeProperty('overflow');}scrollLocks.delete(doc);};
  }

  // Public image tags and dictionary tag IDs have separate meanings. Search-only
  // keywords (names/aliases/carrier terms) are never presented as image tags.
  function iconTagLabels(icon, dictionary=new Map()) {
    return [...new Set([...(icon.imageMetadata?.tags || []),...(icon.tagIds || []).map(id=>dictionary.get(id)||id)]
      .filter(tag=>typeof tag==='string' && tag.length))];
  }
  api.iconTagLabels=iconTagLabels;

  const stylesheet = `
    :host{all:initial;position:fixed;inset:0;display:block;z-index:2147483200;color:#292a35;font:14px/1.5 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;color-scheme:light}
    *,*::before,*::after{box-sizing:border-box}button,input{font:inherit;color:inherit;touch-action:manipulation}button{cursor:pointer;min-height:44px}button:disabled{opacity:.45;cursor:default}button,input,a{outline-offset:3px}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #b198df}a{color:#7150b6}h1,h2,p{margin:0}[hidden]{display:none!important}
    .backdrop{position:absolute;inset:0;background:#28213366;display:grid;place-items:center;padding:24px}.dialog{position:relative;display:flex;flex-direction:column;background:#f5f4f9;border:1px solid #d7d0e1;border-radius:20px;box-shadow:0 24px 90px #241b4255;width:min(1120px,100%);max-height:calc(var(--aru-available-height,100dvh) - 48px);min-height:340px;overflow:hidden}.header{display:flex;align-items:center;gap:12px;padding:17px 23px;border-bottom:1px solid #e5e3ec;background:white}.brand{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:#7150b6;color:white;font-size:23px;font-weight:800}.header-title{min-width:0;flex:1}.header-title h1{font-size:18px;line-height:1.4;letter-spacing:-.5px}.pack-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:11px;color:#737681}.pack-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:380px}.badge{font-size:10px;background:#eee7fa;color:#7150b6;padding:2px 7px;border-radius:20px}.header-actions{display:flex;gap:6px;flex-shrink:0}.quiet{border:1px solid #e5e3ec;border-radius:9px;background:white;padding:0 12px;font-size:12px}.close{font-size:22px;width:44px;padding:0}.body{min-height:0;overflow:auto;padding:20px}.columns{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:18px;align-items:start}.main,.selection{border:1px solid #e5e3ec;border-radius:15px;background:white;overflow:hidden}.search-area{padding:20px 20px 13px;border-bottom:1px solid #e5e3ec}.search-box{display:flex;align-items:center;border:1px solid #d6cfdf;background:#fbfafe;border-radius:11px;height:49px}.search-box:focus-within{border-color:#7150b6;box-shadow:0 0 0 3px #eee7fa}.search-symbol{font-size:23px;margin:0 12px;color:#998da5}.search-input{background:transparent;border:0;outline:none!important;min-width:0;flex:1;height:100%;font-size:15px}.search-input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}.clear-search{border:0;background:none;width:44px;flex-shrink:0;font-size:22px;color:#867c8e}.chips{display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;padding:3px 2px;margin-top:12px}.tag-button{flex-shrink:0;white-space:nowrap;border:1px solid #e5e3ec;background:white;border-radius:24px;padding:0 15px;font-size:12px}.tag-button[aria-pressed="true"]{background:#7150b6;border-color:#7150b6;color:white;font-weight:700}.help{font-size:11px;color:#737681;margin-top:8px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px;flex-wrap:wrap}.summary{font-size:12px;color:#737681}.summary strong{color:#292a35}.toolbar-actions{display:flex;gap:1px;margin-left:auto}.text-button{border:0;background:none;padding:0 7px;font-size:11px;color:#74677e}.reset{color:#7150b6;font-weight:700}.groups{padding:0 14px 14px}.group{border:1px solid #e5e3ec;border-radius:12px;margin-bottom:11px;overflow:hidden}.group:last-child{margin-bottom:0}.group-heading{font-size:14px}.group-toggle{border:0;background:#faf9fc;display:flex;align-items:center;text-align:left;padding:12px 14px;width:100%;gap:10px;min-height:61px}.group-toggle:hover{background:#f3eff9}.arrow{color:#a097ad;font-size:11px;width:12px;transform:rotate(0deg)}.group-toggle[aria-expanded="true"] .arrow{transform:rotate(90deg)}.avatar{background:#eee7fa;color:#7150b6;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-weight:800;flex-shrink:0}.group-title{min-width:0;overflow-wrap:anywhere;font-weight:800}.aliases{display:block;font-size:10px;font-weight:400;color:#737681}.group-count{margin-left:auto;flex-shrink:0;border:1px solid #e4ddec;border-radius:25px;padding:3px 8px;background:white;font-size:11px;color:#766984}.group-viewport{position:relative;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;overscroll-behavior:contain;height:252px;background:white}.virtual-content{position:relative;width:100%}.icon-card{position:absolute;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;height:112px;border:1px solid transparent;border-radius:11px;background:white;padding:6px;overflow:hidden}.icon-card:hover{background:#f7f3fc;border-color:#e9e0f3}.icon-card[aria-pressed="true"]{background:#eee7fa;border-color:#9b7ccf;box-shadow:inset 0 0 0 1px #b59ddb}.icon-media{height:65px;width:65px;object-fit:contain;display:block;pointer-events:none}.media-placeholder{height:65px;width:65px;display:grid;place-items:center;background:#f3eff8;color:#9a84b4;border-radius:13px;font-size:12px}.media-format{font-size:9px;color:#85728d}.icon-name{font-size:11px;font-weight:700;width:100%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.icon-tags{font-size:9px;color:#8a8096;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.group-foot{font-size:10px;color:#92869d;padding:5px 14px;border-top:1px solid #f0edf4}.empty{text-align:center;padding:50px 15px;color:#737681}.empty h2{font-size:15px;color:#292a35;margin-bottom:7px}.selection{padding:18px;position:sticky;top:0}.selection-label{font-size:11px;color:#737681;display:flex;justify-content:space-between;gap:5px}.selection-art{display:grid;place-items:center;min-height:145px;background:linear-gradient(135deg,#faf5fc,#eeebf8);border-radius:13px;margin:12px 0}.selection-art .icon-media,.selection-art .media-placeholder{width:102px;height:102px;pointer-events:auto}.selection-name{font-size:17px;overflow-wrap:anywhere;margin-bottom:7px}.selection-detail{font-size:11px;color:#737681;overflow-wrap:anywhere}.selection-url{display:block;font-size:10px;color:#867493;overflow-wrap:anywhere;margin-top:8px;max-height:80px;overflow:auto}.selection-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.small-tag{font-size:10px;color:#887098;background:#f3eff8;border-radius:5px;padding:3px 6px}.selection-note{font-size:11px;color:#946e2e;background:#fff7e6;padding:8px;border-radius:8px;margin-top:10px}.primary{border:1px solid #7150b6;background:#7150b6;color:white;border-radius:10px;padding:8px 13px;font-size:12px;font-weight:700}.prepare{width:100%;margin-top:13px}.phase-note{font-size:10px;color:#837b8c;margin-top:10px}.status-panel{background:#fdfcfe;border:1px solid #e5e3ec;border-radius:12px;margin-top:14px;padding:12px 15px}.progress{font-size:12px;color:#5c5366}.load-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.error{font-size:12px;color:#94412d;background:#fff1ed;padding:10px;border-radius:9px;margin-bottom:8px;overflow-wrap:anywhere}.live{font-size:11px;color:#7150b6;min-height:17px;margin-top:8px}.metrics{font-size:10px;color:#8b789c;margin-top:6px}.footer{padding:9px 23px;background:white;border-top:1px solid #e5e3ec;font-size:10px;color:#837b8c}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:750px){.backdrop{padding:0;align-items:end}.dialog{width:100%;max-height:var(--aru-available-height,100dvh);border-radius:16px 16px 0 0;min-height:60dvh}.header{padding:12px;gap:8px}.header-title h1{font-size:16px}.header-actions{gap:4px}.header-actions .quiet{padding:0 8px;font-size:11px}.header-actions .close{padding:0}.brand{width:31px;height:31px;flex-basis:31px;font-size:20px}.pack-title{max-width:200px}.body{padding:12px}.columns{grid-template-columns:minmax(0,1fr);gap:12px}.search-area{padding:15px 13px 12px}.search-input{font-size:14px}.toolbar{padding:6px 10px}.summary{font-size:11px}.groups{padding:0 10px 10px}.group-toggle{padding:11px;gap:8px}.group-title{font-size:13px}.group-count{font-size:10px}.selection{position:static;padding:15px}.selection-art{min-height:110px}.selection-art .icon-media,.selection-art .media-placeholder{width:83px;height:83px}.selection-name{font-size:16px}.footer{padding:9px 12px}.status-panel{padding:11px}.group-viewport{height:252px}.help{font-size:10px}.text-button{font-size:10px;padding:0 5px}}
    @media(forced-colors:active){.tag-button[aria-pressed="true"],.icon-card[aria-pressed="true"]{outline:2px solid Highlight}.group-count,.group{border-color:CanvasText}.arrow{color:CanvasText}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, text) {
    const node = el('button', className, text);
    node.type = 'button';
    if(text)node.title=text;
    return node;
  }
  function formatCount(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Number(value)).toLocaleString('ko-KR') : '?';
  }
  function mediaUrl(value) {
    if (typeof value !== 'string') return null;
    // Published packs pass the metadata URL validator. Data images exist only in local fixtures.
    if (/^data:image\/(?:png|gif|jpeg|webp|svg\+xml);/i.test(value)) {
      return /^(?:127\.0\.0\.1|localhost)$/.test(global.location && global.location.hostname || '') ? value : null;
    }
    if (value.includes('#')) return null;
    if (api.Metadata && typeof api.Metadata.mediaUrl === 'function') {
      try { return api.Metadata.mediaUrl(value); } catch (_) { return null; }
    }
    if (value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value) || !/^https:\/\/i[123]\.ruliweb\.com\//u.test(value)) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ['i1.ruliweb.com', 'i2.ruliweb.com', 'i3.ruliweb.com'].includes(url.hostname) && !url.username && !url.password && !url.port && !url.hash ? value : null;
    } catch (_) { return null; }
  }
  function articleUrl(source) {
    const raw = source && (source.articleUrl || source.url);
    if (typeof raw === 'string' && raw.length <= 2048 && !/[\u0000-\u0020\u007f\\]/u.test(raw) && /^https:\/\/(?:bbs|m)\.ruliweb\.com\/community\/board\/98\/read\/[1-9]\d*\/?(?:\?[^#]*)?$/u.test(raw)) {
      try {
        const url = new URL(raw);
        const match = url.pathname.match(/^\/community\/board\/([1-9]\d*)\/read\/([1-9]\d*)\/?$/u);
        if (match && Number.isSafeInteger(Number(match[2])) && url.protocol === 'https:' && /^(?:bbs|m)\.ruliweb\.com$/.test(url.hostname) && !url.username && !url.password && !url.port && !url.hash) return raw;
      } catch (_) { /* Fall through to a canonical article link. */ }
    }
    const id = source && source.articleId;
    const board=source?.boardId||98;
    return /^[1-9]\d*$/u.test(String(id)) && Number.isSafeInteger(Number(id)) && /^[1-9]\d*$/u.test(String(board)) ? 'https://bbs.ruliweb.com/community/board/'+board+'/read/' + id : null;
  }

  api.createPicker = function createPicker(options = {}) {
    if (!api.SearchIndex || !api.FoldState) throw new Error('아이콘 검색 모듈이 준비되지 않았습니다.');
    const instanceId = 'aru-icons-' + (++nextPickerId);
    const opener = options.anchor || options.opener || document.activeElement;
    const coarsePointer=global.matchMedia?.('(pointer:coarse)');
    const mobileInput=()=>coarsePointer?.matches===true||global.matchMedia?.('(hover:none)')?.matches===true||global.innerWidth<=750;
    const host = el('div');
    host.id = instanceId;
    host.dataset.aruIconsPicker = 'true';
    host.style.cssText = 'all:initial;position:fixed;inset:0;display:block;z-index:2147483200;color:#292a35;font:14px/1.5 "Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;';
    const root = host.attachShadow({mode: 'open'});
    const style = el('style');
    style.textContent = stylesheet + `
      .selection-tags{max-height:120px;overflow:auto}.small-tag{max-width:100%;overflow-wrap:anywhere}
      .catalog{background:white;border:1px solid #e5e3ec;border-radius:15px;padding:16px;margin-bottom:16px}.catalog h2{font-size:16px;margin-bottom:10px}.catalog-controls,.catalog-direct{display:flex;gap:8px;flex-wrap:wrap}.catalog input,.catalog select,.catalog button{font:inherit}.catalog input,.catalog select{padding:8px;border:1px solid #d6cfdf;border-radius:8px;min-height:44px}.catalog input{flex:1;min-width:140px}.catalog-direct{margin-top:10px}.catalog-direct button{background:#f4effb;border:1px solid #d6cfdf;border-radius:8px;padding:0 12px}.catalog-viewport{height:310px;overflow:auto;margin-top:12px;overscroll-behavior:contain}.catalog-content{position:relative}.catalog-row{position:absolute;left:0;right:0;display:flex;gap:12px;align-items:center;height:70px;width:100%;text-align:left;background:#faf9fc;border:1px solid #e5e3ec;border-radius:10px;padding:8px}.catalog-row[aria-expanded=true]{background:#eee7fa;border-color:#9b7ccf}.catalog-thumbnail{width:48px;height:48px;flex-shrink:0;object-fit:contain;background:#eee7fa;border-radius:8px;display:grid;place-items:center;color:#7150b6}.catalog-detail{flex:1;min-width:0}.catalog-detail strong,.catalog-detail small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.catalog-detail small{font-size:11px;color:#737681}.target-error{font-size:12px;color:#94412d;background:#fff1ed;padding:10px;border-radius:8px;margin-bottom:12px}
    `;
    root.append(style);
    style.textContent += `
      .icon-video-frame{position:relative;width:65px;height:65px;flex-shrink:0;pointer-events:none}
      .icon-video-frame .media-placeholder{position:absolute;inset:0}.icon-video-frame .media-placeholder[data-media-state="loading"]::after{content:'로딩 중';position:absolute;bottom:2px;font-size:9px}
      .preview-status{font-size:11px;color:#737681;margin-top:6px}.media-retry{margin-top:6px}
      .bundle-view{height:min(850px,calc(var(--aru-available-height,100dvh) - 48px));min-height:0}
      .bundle-view .body{flex:1;display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0;padding:14px}
      .bundle-view .columns{flex:1;min-height:0;align-items:stretch;gap:12px}
      .bundle-view .main{display:flex;flex-direction:column;min-height:0}
      .bundle-view .search-area{padding:12px}.bundle-view .help{margin-top:4px}
      .bundle-view .groups{flex:1;min-height:0;padding:0 8px 8px}
      .bundle-view .bundle-viewport{height:100%;min-height:0;overflow:auto;overscroll-behavior:contain}
      .bundle-view .selection{position:static;min-height:0;padding:12px}
      .bundle-view .selection-art{min-height:120px;margin:8px 0}
      .bundle-view .selection-url{max-height:none;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.bundle-view .selection-tags{max-height:48px}
      .bundle-view .status-panel{margin:0;padding:8px 12px;flex-shrink:0;display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center}
      .bundle-view .status-panel .error{width:100%;margin:0;max-height:64px;overflow:auto}
      .bundle-view .load-actions,.bundle-view .live,.bundle-view .metrics{margin:0}
      .bundle-view .metrics{width:100%}.bundle-view .target-error{margin:0}
      .bundle-view .catalog{display:none}.bundle-view.catalog-open .catalog{display:block;position:absolute;z-index:2;left:14px;right:14px;top:var(--aru-catalog-top,85px);box-shadow:0 8px 24px #241b4233}
      .bundle-view.catalog-open .catalog-viewport{height:190px}
      @media(max-width:750px){
        .bundle-view{height:var(--aru-available-height,100dvh)}.bundle-view .body{padding:8px;gap:6px}
        .bundle-view .columns{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(90px,1fr) auto;gap:6px}
        .bundle-view .selection{display:grid;grid-template-columns:82px minmax(0,1fr) 120px;gap:3px 10px;padding:8px}
        .bundle-view .selection-label{grid-column:1/-1}.bundle-view .selection-art{grid-column:1;grid-row:2/6;min-height:74px;margin:0}
        .bundle-view .selection-art .icon-media,.bundle-view .selection-art .media-placeholder{height:70px;width:70px}
        .bundle-view .selection-name,.bundle-view .selection-detail,.bundle-view .selection-tags,.bundle-view .preview-status{grid-column:2;margin:0}
        .bundle-view .selection-name{font-size:13px}.bundle-view .selection-detail{max-height:30px;overflow:hidden}
        .bundle-view .selection-url,.bundle-view .phase-note,.bundle-view .selection-note{display:none}
        .bundle-view #media-policy-note{display:block;grid-column:2/4;margin:0;font-size:10px}
        .bundle-view .prepare{grid-column:3;grid-row:2/4;margin:0}.bundle-view .media-retry{grid-column:3;grid-row:4/6;margin:0}
        .bundle-view .help,.bundle-view .metrics{display:none}.bundle-view .search-area{padding:8px}
        .bundle-view .chips{margin-top:4px}.bundle-view .search-box{height:44px}.bundle-view .toolbar{padding:0 8px}
        .bundle-view.catalog-open .catalog{left:8px;right:8px}.bundle-view.catalog-open .catalog-viewport{height:150px}
      }
    `;
    const uiCleanup=api.DesignSystem?.attach(root,{fontURL:options.fontURL});
    style.textContent+=`
      .search-modes{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px}.mode-label{font-size:11px;color:var(--aru-muted);display:flex;align-items:center;gap:4px}.mode-label select{min-height:32px;max-width:140px;border:1px solid var(--aru-border);border-radius:7px;background:var(--aru-surface);color:var(--aru-text);font:inherit}
      .library-status{margin-top:4px}.chips{flex-wrap:wrap;overflow:visible;gap:4px}.tag-button{min-height:30px;padding:3px 10px}
      .icon-card{padding:3px;gap:0;justify-content:flex-start}.card-choose{display:flex;align-items:center;flex-direction:column;gap:2px;width:100%;flex:1;min-height:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden}
      .icon-card .icon-media,.icon-card .icon-video-frame,.icon-card .media-placeholder{height:53px;width:64px}.icon-name{font-size:10px}.icon-tags{font-size:10px}.card-preview{min-height:24px;padding:1px 5px;width:100%;font-size:10px;border:0;border-top:1px solid var(--aru-border);background:transparent;color:var(--aru-deep-wine)}
      .icon-card:focus-visible{outline:3px solid var(--aru-deep-wine);outline-offset:-3px}.card-preview:hover{background:var(--aru-soft)}.header-actions{flex-wrap:wrap}
      @media(max-width:500px){.header{flex-wrap:wrap}.header-actions{width:100%;justify-content:flex-end}.chips{gap:3px}.tag-button{padding:2px 7px;min-height:32px}.search-modes{gap:4px}.mode-label select{max-width:106px}.mode-label{font-size:10px}.bundle-view .selection{grid-template-columns:64px minmax(0,1fr) 92px}.bundle-view .selection-art .icon-media{width:58px;height:58px}}
      @media(max-height:600px){.header{padding:6px 12px}.bundle-view .selection-art{min-height:64px}.bundle-view .selection-art .icon-media{height:60px}.help,.library-status,.phase-note,.metrics{display:none}.search-area{padding:6px!important}.selection{padding:6px!important}.footer{padding:4px}}
    `;
    style.textContent+=`
      .compact-height{min-height:0}.compact-height .body{display:block;overflow:auto;overscroll-behavior:contain}
      .compact-height.bundle-view .columns{display:flex;flex-direction:column;gap:8px}
      .compact-height.bundle-view .main{min-height:280px;flex:none}
      .compact-height.bundle-view .groups{height:140px;min-height:140px;flex:none}
      .compact-height.bundle-view .selection{display:block;flex:none}.compact-height.bundle-view .selection-art{min-height:64px}
      .compact-height .footer{max-height:32px;overflow:auto;flex-shrink:0}.compact-height .header{flex-shrink:0}
      .compact-height .phase-note,.compact-height .metrics,.compact-height .selection-url{display:none}
    `;
    style.textContent+=`
      .view-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 18px;border-bottom:1px solid var(--aru-border);background:var(--aru-surface);flex-shrink:0;font-size:12px}
      .view-controls select,.view-controls button{min-height:32px;font:inherit}.view-controls select{border:1px solid var(--aru-border);border-radius:6px;background:var(--aru-surface);color:var(--aru-text)}
      .dialog[data-modal-size="default"]{width:min(1120px,100%)}.dialog[data-modal-size="wide"]{width:min(1440px,100%)}
      .dialog[data-modal-size="max"]{width:100%;height:100%;max-height:100%;min-height:0;border-radius:10px}
      .bundle-view.preview-collapsed .columns{grid-template-columns:minmax(0,1fr)!important}
      .icon-card{height:var(--aru-card-height,112px)}.icon-card .icon-media,.icon-card .icon-video-frame,.icon-card .media-placeholder{height:var(--aru-card-media,53px);width:var(--aru-card-media-width,64px)}
      @media(max-width:750px){.view-controls{padding:4px 10px;gap:4px;font-size:11px}.dialog[data-modal-size]{max-width:100%;min-height:0}.dialog[data-modal-size="max"]{border-radius:0}}
      @media(pointer:coarse){.view-controls select,.view-controls button,.card-preview{min-height:44px}}
    `;
    const backdrop = el('div', 'backdrop');
    const dialog = el('section', 'dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', instanceId + '-title');
    dialog.setAttribute('aria-describedby', instanceId + '-phase');
    dialog.tabIndex = -1;
    backdrop.append(dialog); root.append(backdrop);
    const header = el('header', 'header');
    const flowStyle=el('style');flowStyle.textContent=`
      .catalog-backdrop{position:absolute;z-index:2;inset:var(--aru-catalog-top,85px) 0 0;background:var(--aru-surface,#faf7f2);opacity:.94}
      .bundle-view.catalog-open .catalog{z-index:3;display:flex;flex-direction:column;bottom:14px;max-height:calc(100% - var(--aru-catalog-top,85px) - 14px);margin:0;overflow:auto;background:var(--aru-surface,#fff)}
      .catalog-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0}.catalog-heading h2{margin:0}
      .bundle-view.catalog-open .catalog-viewport{flex:1;min-height:76px;height:auto}.catalog-controls,.catalog-direct,.catalog-load-status{flex-shrink:0}
      .catalog-load-status{font-size:12px;line-height:1.5;margin-top:8px;overflow-wrap:anywhere}.catalog-row{color:inherit}.catalog-row[aria-current=true]{border-color:var(--aru-gold,#C5A268)}
      .pack-toast{position:absolute;z-index:4;bottom:16px;left:18px;right:18px;pointer-events:none;border:1px solid #C5A268;border-radius:10px;background:var(--aru-surface,#fff);color:var(--aru-text,#642940);padding:10px 14px;font-size:12px;line-height:1.5;box-shadow:0 4px 16px #0002}
      .dialog.toast-visible .footer{padding-bottom:65px}
      @media(max-width:600px){.pack-toast{bottom:8px;left:10px;right:10px;padding:8px;font-size:11px}.bundle-view.catalog-open .catalog{padding:10px;bottom:8px}.catalog-controls input{min-width:100px}.catalog-direct input{min-width:90px}.catalog-row{gap:8px}.catalog-thumbnail{width:36px;height:36px}.catalog-heading h2{font-size:14px}}
    `;root.append(flowStyle);
    const headerTitle = el('div', 'header-title');
    const title = el('h1', '', '아루 아이콘'); title.id = instanceId + '-title';
    const packLine = el('div', 'pack-line');
    const packTitle = el('span', 'pack-title', options.insertionMode?'아이콘팩을 선택해 주세요':'아이콘팩을 불러오는 중');
    const packBadge = el('span', 'badge pack-kind', options.catalogMode?'목록':'NORMAL');
    const packLink = el('a', '', '원본 게시글'); packLink.target = '_blank'; packLink.rel = 'noopener noreferrer'; packLink.hidden = true;
    packLine.append(packTitle, packBadge, packLink);
    if(options.insertionMode)packLine.append(el('span','badge','삽입 대상: '+(options.targetLabel||'현재 작성기')));
    headerTitle.append(title, packLine);
    const headerActions = el('div', 'header-actions');
    const closeButton = button('quiet close', '×'); closeButton.id = 'picker-close'; closeButton.setAttribute('aria-label', '아이콘 선택기 닫기'); closeButton.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    headerActions.append(closeButton); header.append(headerTitle, headerActions); dialog.append(header);
    api.DesignSystem?.modalHeader(header,{kind:'select'});
    const catalogDock=button('quiet','아이콘 리스트');catalogDock.id='catalog-dock';catalogDock.hidden=true;
    catalogDock.setAttribute('aria-expanded','false');headerActions.prepend(catalogDock);
    const positionCatalog=()=>dialog.style.setProperty('--aru-catalog-top',(header.getBoundingClientRect().height+8)+'px');
    let catalogOpen=false,catalogReturnFocus=null,toastShown=false,toastTimer=0;
    catalogDock.addEventListener('click',()=>setCatalogOpen(!catalogOpen,'cancel'));
    const viewControls=el('div','view-controls');viewControls.setAttribute('role','group');viewControls.setAttribute('aria-label','아이콘 화면 설정');
    function viewChoice(id,label,choices){const wrapper=el('label','mode-label',label+' '),control=el('select');control.id=id;control.setAttribute('aria-label',label);for(const [value,text]of choices){const o=el('option','',text);o.value=value;control.append(o);}wrapper.append(control);viewControls.append(wrapper);return control;}
    const modalSize=viewChoice('modal-size','창 크기',[['default','기본'],['wide','넓게'],['max','최대화']]);
    const iconSize=viewChoice('icon-size','아이콘 크기',[['small','작게'],['normal','보통'],['large','크게']]);
    const previewToggle=button('quiet','미리보기 접기');previewToggle.id='preview-toggle';previewToggle.setAttribute('aria-expanded','true');viewControls.append(previewToggle);dialog.append(viewControls);
    const body = el('div', 'body');
    const targetError = el('p','target-error');targetError.hidden=true;targetError.setAttribute('role','alert');body.append(targetError);
    let targetValid=options.targetValid!==false;
    let catalogRef=null,catalogPack=null;
    async function chooseCatalog(action) {
      const result=await action();if(destroyed)return result;
      if(result?.ok===true){setCatalogOpen(false,'selected');showPackToast();}
      return result;
    }
    const catalogView=options.catalogMode&&api.CatalogView?new api.CatalogView({container:body,
      onChoose:ref=>chooseCatalog(()=>options.onCatalogSource?.(ref)),onDirect:(value,board)=>chooseCatalog(()=>options.onDirectSource?.(value,board)),onCancel:()=>setCatalogOpen(false,'cancel')}):null;
    let sourceSelect;
    if(!options.catalogMode && options.insertionMode && typeof options.onSource==='function') {
      const sourceBar=el('form','load-actions');
      sourceBar.style.cssText='margin:0 0 14px;padding:10px;border:1px solid #e5e3ec;border-radius:10px;background:white';
      sourceSelect=el('select');sourceSelect.setAttribute('aria-label','기본 선택기의 아이콘팩');sourceSelect.style.cssText='max-width:100%;min-height:44px;font:inherit';
      const sourceInput=el('input');sourceInput.id='pack-source';sourceInput.placeholder='아이콘 글 URL 또는 번호';sourceInput.setAttribute('aria-label','아이콘 게시글 URL 또는 번호');sourceInput.style.cssText='min-width:120px;flex:1;padding:8px;border:1px solid #d6cfdf;border-radius:8px';
      const sourceOpen=button('quiet','팩 열기');sourceOpen.type='submit';sourceOpen.id='pack-open';
      const sourceLabel=el('span','help','삽입 대상: '+(options.targetLabel||'현재 작성기'));
      sourceBar.append(sourceSelect,sourceInput,sourceOpen,sourceLabel);body.append(sourceBar);
      sourceBar.addEventListener('submit',event=>{event.preventDefault();Promise.resolve(options.onSource(sourceInput.value)).catch(error=>setError(error.message));});
      sourceSelect.addEventListener('change',()=>{if(sourceSelect.value)Promise.resolve(options.onSource(sourceSelect.value)).catch(error=>setError(error.message));});
    }
    const columns = el('div', 'columns'); const main = el('main', 'main');
    const searchArea = el('div', 'search-area');
    const label = el('label', 'sr-only', options.librarySearch?'게시글 제목과 아이콘 태그 검색':'카테고리, 별칭, 아이콘 이름, 태그, 키워드 검색'); label.htmlFor = instanceId + '-search';
    const searchBox = el('div', 'search-box'); const searchSymbol = el('span', 'search-symbol', '⌕'); searchSymbol.setAttribute('aria-hidden', 'true'); searchSymbol.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
    const input = el('input', 'search-input'); input.id = instanceId + '-search'; input.dataset.control = 'search-input'; input.type = 'search'; input.autocomplete = 'off'; input.placeholder = '캐릭터·태그 검색'; input.setAttribute('aria-describedby', instanceId + '-help');
    const clearSearch = button('clear-search', '×'); clearSearch.id = 'clear-search'; clearSearch.setAttribute('aria-label', '검색어만 지우기'); clearSearch.innerHTML = '<svg class="aru-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>'; clearSearch.hidden = true;
    searchBox.append(searchSymbol, input, clearSearch);
    const chips = el('div', 'chips'); chips.id = 'tag-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', '고정 태그 필터, 여러 태그 선택 가능');
    const help = el('p', 'help', '여러 검색어는 모두 일치 · 태그 버튼은 검색어와 함께 적용'); help.id = instanceId + '-help';
    const modes=el('div','search-modes');
    function mode(id,label,choices){const wrapper=el('label','mode-label',label+' '),control=el('select');control.id=id;control.setAttribute('aria-label',label);for(const [value,text]of choices){const item=el('option','',text);item.value=value;control.append(item);}wrapper.append(control);modes.append(wrapper);return control;}
    const scope=mode('search-scope','검색 범위',[['current','현재 팩'],['all','전체 팩']]);
    const textMatch=mode('text-match','검색어',[['all','모두 일치'],['any','하나 이상']]);
    const tagMatch=mode('tag-match','태그',[['any','하나 이상'],['all','모두 일치']]);
    const libraryStatus=el('p','help library-status');libraryStatus.setAttribute('role','status');libraryStatus.setAttribute('aria-live','polite');
    modes.hidden=!options.librarySearch;
    const searchOptions=el('details','search-options');searchOptions.id='search-options';searchOptions.open=!mobileInput();
    const optionsSummary=el('summary','','검색·화면 설정');const optionContent=el('div','search-option-content');optionContent.append(modes,viewControls);searchOptions.append(optionsSummary,optionContent);
    searchArea.append(label, searchBox, searchOptions, chips, help,libraryStatus);
    const toolbar = el('div', 'toolbar');
    const summary = el('div', 'summary'); summary.id = 'result-summary'; summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite'); summary.setAttribute('aria-atomic', 'true');
    const toolbarActions = el('div', 'toolbar-actions');
    const expandAll = button('text-button', '모두 펼치기'); expandAll.id = 'expand-all';
    const collapseAll = button('text-button', '모두 접기'); collapseAll.id = 'collapse-all';
    const reset = button('text-button reset', '검색 지우기'); reset.id = 'search-reset';
    toolbarActions.append(expandAll, collapseAll, reset); toolbar.append(summary, toolbarActions);
    const groupsNode = el('div', 'groups'); groupsNode.id = 'groups';
    const gridStage=el('div','grid-stage');
    const loadingPanel=el('div','pack-loading');loadingPanel.hidden=true;loadingPanel.id='pack-loading';
    const loadingArt=el('img','loading-art');loadingArt.alt='';loadingArt.setAttribute('aria-hidden','true');loadingArt.width=64;loadingArt.height=64;
    const loadingArtUrl=api.DesignSystem?.assetURL?.('assets/icons/aru-main-64.png');if(loadingArtUrl)loadingArt.src=loadingArtUrl;else loadingArt.hidden=true;
    loadingArt.addEventListener('error',()=>{loadingArt.hidden=true;},{once:true});
    const loadingMessage=el('p','loading-message','아이콘팩을 확인하고 있어요.');loadingMessage.setAttribute('role','status');loadingMessage.setAttribute('aria-live','polite');loadingMessage.setAttribute('aria-atomic','true');
    const loadingCount=el('p','loading-count');
    const loadingBar=el('progress');loadingBar.setAttribute('aria-label','아이콘 정보 처리량');
    const loadingStop=button('quiet','로딩 중지');loadingStop.id='grid-load-stop';
    loadingPanel.append(loadingArt,loadingMessage,loadingCount,loadingBar,loadingStop);
    gridStage.append(groupsNode,loadingPanel);main.append(searchArea,toolbar,gridStage);
    const selection = el('aside', 'selection'); selection.setAttribute('aria-labelledby', instanceId + '-selection');
    const selectionLabel = el('div', 'selection-label', '선택한 아이콘'); const readBadge = el('span', 'badge', '선택 준비'); selectionLabel.append(readBadge);
    const selectionArt = el('div', 'selection-art');
    const selectionName = el('h2', 'selection-name', '아이콘을 골라주세요'); selectionName.id = instanceId + '-selection';
    const selectionDetail = el('p', 'selection-detail', '선택한 아이콘을 여기서 확인하세요.');
    const selectionSource = el('a', 'selection-url'); selectionSource.target = '_blank'; selectionSource.rel = 'noopener noreferrer'; selectionSource.hidden = true;
    const selectionUrl = el('span', 'selection-url');
    const selectionTags = el('div', 'selection-tags');
    const selectionNote = el('p', 'selection-note', '검색 결과 밖의 아이콘을 선택한 상태입니다.'); selectionNote.hidden = true;
    const prepare = button('primary prepare', options.insertionMode?'삽입':'선택 정보 준비'); prepare.id = 'prepare-selection'; prepare.disabled = true;
    const phaseNote = el('p', 'phase-note', options.insertionMode?'선택 후 삽입하세요. PC에서는 더블클릭으로 삽입할 수 있습니다.':'조회용 화면입니다. 작성기에서 열면 삽입할 수 있습니다.'); phaseNote.id = instanceId + '-phase';
    selection.append(selectionLabel, selectionArt, selectionName, selectionDetail, selectionSource, selectionUrl, selectionTags, selectionNote, prepare, phaseNote);
    const previewStatus=el('p','preview-status');previewStatus.id='preview-status';previewStatus.setAttribute('role','status');
    const mediaRetry=button('quiet media-retry','다시 시도');mediaRetry.id='media-retry';mediaRetry.hidden=true;
    const mediaPolicyNote=el('p','selection-note');mediaPolicyNote.id='media-policy-note';mediaPolicyNote.hidden=true;
    selection.append(previewStatus,mediaRetry,mediaPolicyNote);
    columns.append(main, selection); body.append(columns);if(options.catalogMode&&!options.librarySearch)columns.hidden=true;
    const statusPanel = el('section', 'status-panel'); statusPanel.setAttribute('aria-label', '아이콘 수집 상태');
    const errorNode = el('p', 'error'); errorNode.id = 'load-error'; errorNode.hidden = true; errorNode.setAttribute('role', 'alert');
    const progressNode = el('p', 'progress', '아이콘 리스트에서 팩을 선택하세요.'); progressNode.id = 'load-progress'; progressNode.setAttribute('role', 'status'); progressNode.setAttribute('aria-live', 'polite'); progressNode.setAttribute('aria-atomic', 'true');
    const loadActions = el('div', 'load-actions');
    const stop = button('quiet', '로딩 중지'); stop.id = 'load-stop'; stop.disabled = true;
    const retry = button('quiet', '재시도'); retry.id = 'load-retry'; retry.disabled = true;
    const refresh = button('quiet', '새로고침'); refresh.id = 'load-refresh'; refresh.disabled = typeof options.onRefresh !== 'function';
    loadActions.append(stop, retry, refresh);
    const live = el('p', 'live'); live.id = 'status-message'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    const metrics = el('p', 'metrics'); metrics.id = 'perf-summary';
    statusPanel.append(errorNode, progressNode, loadActions, live, metrics); body.append(statusPanel); dialog.append(body);
    const footer = el('footer', 'footer', '원본 파일과 출처를 그대로 사용합니다.'); dialog.append(footer);
    const catalogBackdrop=el('div','catalog-backdrop');catalogBackdrop.hidden=true;dialog.append(catalogBackdrop);
    const toast=el('p','pack-toast');toast.id='pack-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');dialog.append(toast);
    const mobileStyle=el('style');mobileStyle.dataset.aruMobileUx='';mobileStyle.textContent=`
      .grid-stage{display:flex;flex:1;min-height:0;position:relative}.grid-stage>.groups{width:100%}
      .search-options{margin-top:8px}.search-options>summary{display:none}.search-options .view-controls{padding:6px 0;border:0;background:transparent}
      .pack-loading{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;background:var(--aru-surface,#fff);text-align:center}
      .loading-art{object-fit:contain;animation:aru-loading-bob 1.8s ease-in-out infinite;pointer-events:none}.loading-message{font-weight:600;color:var(--aru-text)}.loading-count{color:var(--aru-muted);font-size:12px;font-variant-numeric:tabular-nums}
      .pack-loading progress,.catalog-progress{width:min(220px,100%);height:8px;accent-color:var(--aru-wine,#923F61)}
      .catalog-progress{display:block;margin:8px auto}.catalog-loading-art{width:48px;height:48px;object-fit:contain;animation:aru-loading-bob 1.8s ease-in-out infinite;float:left;margin-right:12px;pointer-events:none}
      @keyframes aru-loading-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      .dialog.mobile-layout{min-height:0;height:var(--aru-available-height,100dvh);max-height:var(--aru-available-height,100dvh)}
      .mobile-layout .header.aru-modal-header{--aru-header-art:56px;grid-template-columns:minmax(0,1fr) 56px auto;padding:8px 10px;gap:6px}
      .mobile-layout .aru-modal-character{margin:0}.mobile-layout .aru-modal-header .header-actions{flex-direction:row;gap:4px}.mobile-layout .header-title h1{font-size:16px}.mobile-layout .pack-line{font-size:10px;gap:4px}.mobile-layout .pack-title{max-width:150px}
      .mobile-layout .body,.compact-height.mobile-layout .body{display:flex;flex-direction:column;overflow:hidden;min-height:0;padding:6px;gap:4px}
      .mobile-layout .columns,.compact-height.mobile-layout .columns{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;flex:1;min-height:0;gap:4px}
      .mobile-layout .main,.compact-height.mobile-layout .main{flex:1;min-height:0}
      .mobile-layout .groups,.compact-height.mobile-layout .groups{height:auto;min-height:0;flex:1;padding:0 4px 4px}
      .mobile-layout .bundle-viewport{height:100%;touch-action:pan-y;overscroll-behavior:contain}
      .mobile-layout .search-area{padding:6px}.mobile-layout .search-input{font-size:16px}.mobile-layout .search-options{margin-top:4px}
      .mobile-layout .search-options>summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:12px;color:var(--aru-muted);list-style:revert}
      .mobile-layout .search-options[open]{max-height:min(210px,40dvh);overflow:auto;overscroll-behavior:contain}
      .mobile-layout .search-modes{margin-top:0;gap:4px 10px}.mobile-layout .mode-label{font-size:12px}.mobile-layout .mode-label select{min-height:44px;max-width:130px}
      .mobile-layout .view-controls{gap:4px 8px;margin:0;padding:4px 0}.mobile-layout .view-controls select,.mobile-layout .view-controls button{min-height:44px}
      .mobile-layout .chips{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;gap:4px;padding:0 0 3px;margin-top:0;overscroll-behavior-x:contain;touch-action:pan-x}
      .mobile-layout .tag-button{min-height:44px;padding:4px 12px;flex-shrink:0}
      .mobile-layout .toolbar{padding:0 6px;min-height:30px}.mobile-layout .help,.mobile-layout .library-status,.mobile-layout .metrics{display:none}
      .mobile-layout.all-pack-search .library-status{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}
      .mobile-layout .selection,.compact-height.mobile-layout .selection{display:grid;grid-template-columns:48px minmax(0,1fr) 88px;gap:2px 8px;padding:6px;flex:none}
      .mobile-layout .selection-label,.mobile-layout .selection-detail,.mobile-layout .selection-url,.mobile-layout .selection-tags,.mobile-layout .selection-note,.mobile-layout .phase-note{display:none}
      .mobile-layout .selection-art{grid-column:1;grid-row:1/3;min-height:44px;margin:0}.mobile-layout .selection-art .icon-media,.mobile-layout .selection-art .media-placeholder{width:44px;height:44px}
      .compact-height.mobile-layout .selection-art{min-height:44px}
      .mobile-layout .selection-name{grid-column:2;grid-row:1;font-size:12px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobile-layout .preview-status{grid-column:2;grid-row:2;font-size:10px;margin:0}
      .mobile-layout .prepare{grid-column:3;grid-row:1/3;margin:0;min-height:44px}.mobile-layout .media-retry{grid-column:2;grid-row:3;margin:0;min-height:44px}
      .mobile-layout #media-policy-note{display:block;grid-column:1/-1;font-size:11px}.mobile-layout #media-policy-note[hidden]{display:none}
      .mobile-layout .status-panel{padding:4px 6px;gap:4px;min-height:0}.mobile-layout .load-actions{gap:4px;flex-wrap:nowrap}.mobile-layout .status-panel .quiet{padding:0 8px;min-height:44px}
      .mobile-layout .status-panel .quiet:disabled{display:none}.mobile-layout.pack-busy #load-stop,.mobile-layout.pack-busy .status-panel .progress{display:none}
      .mobile-layout .live:empty,.mobile-layout .metrics:empty{display:none}
      .mobile-layout .search-options #load-refresh{min-height:44px;margin-top:4px}.mobile-layout.compact-height .status-panel .progress{display:none}
      .mobile-layout .progress{font-size:11px}.mobile-layout .footer{padding:4px 10px;padding-bottom:max(4px,env(safe-area-inset-bottom));font-size:10px}
      .mobile-layout .pack-toast{bottom:auto;top:var(--aru-catalog-top,64px);font-size:11px}.mobile-layout.toast-visible .footer{padding-bottom:max(4px,env(safe-area-inset-bottom))}
      .mobile-layout .catalog{left:6px;right:6px;bottom:6px;padding:8px}.mobile-layout .catalog-controls select{max-width:90px}.mobile-layout .catalog-controls input{min-width:110px;font-size:16px}
      .mobile-layout .catalog-direct input{min-width:80px;font-size:16px}.mobile-layout .catalog-viewport{touch-action:pan-y}
      .mobile-layout.compact-height .header{padding-block:4px}.mobile-layout.compact-height .pack-line,.mobile-layout.compact-height .footer{display:none}.mobile-layout.compact-height .aru-modal-character{width:32px;height:32px}
      .mobile-layout.compact-height .search-options>summary{min-height:44px}.mobile-layout.compact-height .tag-button{min-height:44px}.mobile-layout.compact-height .chips{padding-bottom:0}
      .compact-height.mobile-layout .search-area{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:4px;position:relative}
      .compact-height.mobile-layout .search-box{grid-column:1;grid-row:1}.compact-height.mobile-layout .search-options{grid-column:2;grid-row:1;margin:0;overflow:visible;max-height:none}
      .compact-height.mobile-layout .search-options>summary{justify-content:center;font-weight:600}.compact-height.mobile-layout .search-option-content{position:absolute;z-index:2;left:0;right:0;top:calc(100% - 4px);max-height:max(44px,calc(var(--aru-available-height,100dvh) - 212px));overflow:auto;overscroll-behavior:contain;padding:8px;background:var(--aru-surface);box-shadow:var(--aru-shadow)}
      .compact-height.mobile-layout .library-status{grid-column:1/-1;margin:0}
      @media(prefers-reduced-motion:reduce){.loading-art,.catalog-loading-art{animation:none}}
    `;root.append(mobileStyle);
    function setCatalogOpen(open,reason='cancel'){
      if(!catalogView||destroyed)return;
      if(open&&!catalogOpen)catalogReturnFocus=root.activeElement;
      if(!open&&reason==='cancel'){options.onCatalogCancel?.();catalogView.cancelPending();}
      catalogOpen=open;dialog.classList.toggle('catalog-open',open);catalogDock.setAttribute('aria-expanded',String(open));catalogView.node.hidden=!open;catalogBackdrop.hidden=!open;
      for(const node of [viewControls,columns,statusPanel,targetError,footer,packLink]){node.inert=open;if(open)node.setAttribute('inert','');else node.removeAttribute('inert');}
      if(open){positionCatalog();(mobileInput()?catalogView.node:catalogView.input).focus({preventScroll:true});}
      else {const focus=reason==='selected'?(mobileInput()?dialog:input):catalogReturnFocus?.isConnected?catalogReturnFocus:catalogDock;focusWithoutKeyboard(focus);}
    }
    function showPackToast(){if(toastShown||destroyed)return;toastShown=true;toast.textContent="아이콘팩을 불러왔어요. 다른 팩은 '아이콘 리스트'에서 선택하세요.";toast.hidden=false;dialog.classList.add('toast-visible');toastTimer=setTimeout(()=>{toastTimer=0;if(!destroyed){toast.hidden=true;dialog.classList.remove('toast-visible');}},3500);}

    document.body.append(host);
    const unlockPage=lockPage(document);

    const collapsedInsert=button('primary',prepare.textContent);collapsedInsert.id='collapsed-insert';collapsedInsert.hidden=true;collapsedInsert.disabled=true;loadActions.append(collapsedInsert);
    let rowHeight=120,ui={modalSize:'default',iconSize:'normal',previewVisible:true},uiRevision=0;
    const preferences=options.uiPreferences||api.UiPreferences;let mouseProof=null,lastTouchTime=-Infinity;
    function currentCardSize(){const size=UI_SIZES[ui.iconSize];return coarsePointer?.matches?{...size,row:size.row+32,card:size.card+32}:size;}
    const events = new AbortController();
    const listen = (node, type, handler, other = {}) => node.addEventListener(type, handler, {...other, signal: events.signal});
    const folds = new Map();
    let fold = new api.FoldState();
    let currentPackKey = null;
    let pack = null;
    let index = null;
    let displayTags = new Map();
    let collectionDiagnostics = null;
    let lastMetadataLog = '';
    let result = {groups: [], uniqueCount: 0, membershipCount: 0};
    let contexts = [];
    let visibilityObserver = null;
    let resizeObserver = null;
    let destroyed = false;
    let composing = false;
    let searchTimer = 0;
    let virtualFrame = 0;
    let initialFocusFrame = 0;
    let selectedIconId = null;
    let preparing = false;
    let previewState={iconId:null,status:'none',code:null};
    let previewCleanup=()=>{};
    const mediaFailures=new Map();
    let lastListCriteria='';
    const library=options.librarySearch||null;let basePack=null,libraryResult=null,collectionKey='',libraryFrame=0;const projections=new WeakMap();let currentProgress=null;
    // UI layout only: NORMAL/BUNDLE collection and metadata remain distinct.
    const isGrid=()=>true;
    function syncLayout(){dialog.classList.toggle('bundle-view',isGrid());catalogDock.hidden=!isGrid()||!catalogView;expandAll.hidden=collapseAll.hidden=isGrid();}
    let lastSearchMs = 0;
    let lastRenderMs = 0;
    const mediaBudget=api.MediaBudget?new api.MediaBudget(4):null;
    const mediaCleanups=new WeakMap();
    const state = {query: '', selectedTagIds: [], tagMatch: 'any', categoryFilterIds: [], sourceFilterIds: [], sort: 'source', queryRevision: 0};
    const hasCriteria = () => !!state.query.normalize('NFKC').trim() || state.selectedTagIds.length > 0 || state.categoryFilterIds.length > 0 || state.sourceFilterIds.length > 0;
    const announce = text => { if (!destroyed) live.textContent = text; };
    function focusWithoutKeyboard(node){
      const editable=node?.matches?.('input,textarea,[contenteditable="true"]');
      (mobileInput()&&editable?dialog:node)?.focus?.({preventScroll:true});
    }
    const byIconId = id => (pack && pack.icons || []).find(icon => icon.id === id);
    const tagsFor = icon => displayTags.get(icon.id) || [];
    const sourceOf = icon => icon.librarySource || (pack && pack.sources || []).find(source => source.sourceId === icon.sourceId || source.id === icon.sourceId);

    function pauseMedia(node) {
      node.querySelectorAll('video').forEach(video => {mediaCleanups.get(video)?.();mediaCleanups.delete(video);try { video.pause();video.removeAttribute('src');video.querySelectorAll('source').forEach(s=>s.removeAttribute('src'));video.load(); } catch (_) { /* Detached media can be ignored. */ } });
    }
    function cancelSearch() { if (searchTimer) { clearTimeout(searchTimer); searchTimer = 0; } }
    function teardownGroups() {
      mediaBudget?.reset();
      if (virtualFrame) { cancelAnimationFrame(virtualFrame); virtualFrame = 0; }
      if (visibilityObserver) { visibilityObserver.disconnect(); visibilityObserver = null; }
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      contexts.forEach(context => { context.viewport.removeEventListener('scroll', context.scrollHandler); pauseMedia(context.content); });
      contexts = [];
    }
    function mediaDiagnostic(icon,stage,code,eventCode=null){
      const exact=mediaUrl(icon.url),url=exact&&new URL(exact);
      const publicQuery=url&&/^(?:\?(?:gif|webp|png|jpg|jpeg|avif))?$/i.test(url.search);
      const row={articleId:icon.origin?.articleId||sourceOf(icon)?.articleId||null,originalIndex:icon.origin?.originalIndex??null,
        iconId:!publicQuery&&String(icon.id).includes('?')?String(icon.id).split('?')[0]+'?[query omitted]':icon.id,
        kind:icon.mediaKind||'unknown',url:url?(publicQuery?exact:url.origin+url.pathname+'?[query omitted]'):null,stage,code,eventCode};
      // Bounded, public-media-only diagnostics; never include editor/session data.
      const key=icon.id+':'+stage;mediaFailures.set(key,row);if(mediaFailures.size>100)mediaFailures.delete(mediaFailures.keys().next().value);
      if(options.debug===true)global.console?.info?.('[Aru Icons] media diagnostics',row);
    }
    function updatePrepare(){
      const icon=byIconId(selectedIconId),native=icon&&options.insertionMode&&api.ComposerAdapter?.selectedMedia(icon);
      const unsupported=native&&!/\.(png|jpe?g|gif|webp|mp4)(?:\?|$)/i.test(native.url||'');
      mediaPolicyNote.hidden=!unsupported;
      mediaPolicyNote.textContent=unsupported?'미리보기는 지원하지만 현재 네이티브 삽입은 PNG·JPG·GIF·WEBP·MP4만 지원합니다.':'';
      prepare.disabled=!icon||preparing||!targetValid||typeof options.onSelect!=='function'||previewState.status==='error'||!!unsupported;
      collapsedInsert.disabled=prepare.disabled;prepare.setAttribute('aria-busy',String(preparing));collapsedInsert.setAttribute('aria-busy',String(preparing));
    }
    function createMedia(icon, preview = false, context = null, position = 0, renderMedia = null) {
      const url = mediaUrl(icon.url);
      if (!url) {mediaDiagnostic(icon,preview?'preview':'thumbnail','UNSAFE_URL');if(preview){previewState={iconId:icon.id,status:'error',code:'UNSAFE_URL'};previewStatus.textContent='원본 주소를 확인할 수 없습니다.';mediaRetry.hidden=false;updatePrepare();}return el('span', 'media-placeholder', '원본 확인');}
      const video = /video|mp4|webm/i.test(String(icon.mediaKind || '')) || /\.(mp4|webm)(?:[?#]|$)/i.test(url);
      const frameThumbnail=video&&!preview;
      const frame=frameThumbnail?el('span','icon-video-frame'):null;
      const cover=frameThumbnail?el('span','media-placeholder',/\.webm(?:[?#]|$)/i.test(url)?'WEBM · 보기':'MP4 · 보기'):null;
      if(cover){cover.dataset.mediaState='loading';cover.setAttribute('aria-label','동영상 썸네일 로딩 중');}
      // The common grid uses the existing BUNDLE visibility/request budget for both kinds.
      // Legacy grouped presentation is retained only as an inactive compatibility branch.
      const capped=!preview&&!isGrid()&&options.catalogMode&&/\.(gif|webp)(?:[?#]|$)/i.test(url);
      if(capped&&renderMedia){if(renderMedia.animatedRemaining<=0)return el('span','media-placeholder','미리보기');renderMedia.animatedRemaining--;}
      const media = el(video ? 'video' : 'img', 'icon-media');
      if(capped)media.dataset.animatedThumb='true';
      if (video) {
        media.preload = 'auto'; media.muted = true; media.playsInline = true;
        media.controls = preview; media.autoplay = false;
        media.setAttribute('aria-label', (icon.name || '원본 아이콘') + ', 동영상');
      } else {
        // The virtual window and budget decide visibility before assigning src.
        // A selected preview must not wait for native lazy-load heuristics.
        media.loading = preview||isGrid()?'eager':'lazy'; media.decoding = 'async'; media.alt = preview ? icon.name || '선택한 아이콘' : '';
      }
      let finished=false,timer=0,frameSeeking=false;
      const clean=()=>{clearTimeout(timer);media.removeEventListener(video?'loadeddata':'load',ready);media.removeEventListener('loadedmetadata',seekFrame);media.removeEventListener('seeked',seekReady);media.removeEventListener('error',failed);};
      const ready=()=>{if(finished||!media.isConnected||destroyed||frameThumbnail&&(frameSeeking||media.readyState<2))return;finished=true;clean();media.dataset.mediaState='ready';cover?.remove();if(frame)frame.dataset.mediaState='ready';if(preview){previewState={iconId:icon.id,status:'ready',code:null};previewStatus.textContent='미리보기 준비됨';mediaRetry.hidden=true;updatePrepare();}};
      const seekReady=()=>{frameSeeking=false;ready();};
      const seekFrame=()=>{if(!frameThumbnail||finished||!media.isConnected)return;try{if(Number.isFinite(media.duration)&&media.duration>0){frameSeeking=true;media.currentTime=Math.min(.01,media.duration/2);}else ready();}catch(_){frameSeeking=false;ready();}};
      const showFailure = (text,code) => {
        if (!media.isConnected || destroyed) return;
        if(finished)return;finished=true;clean();
        mediaDiagnostic(icon,preview?'preview':'thumbnail',code,video?media.error?.code||null:null);
        const placeholder = el('span', 'media-placeholder', text);
        placeholder.dataset.mediaState='error';placeholder.dataset.mediaCode=code;
        if(video&&media.error?.code)placeholder.dataset.mediaEventCode=String(media.error.code);
        placeholder.title = '선택한 아이콘의 미디어 재시도에서 원본을 다시 확인할 수 있습니다.';
        if(frame){frame.replaceChildren(placeholder);frame.dataset.mediaState='error';}else media.replaceWith(placeholder);
        media.removeAttribute('src');if(preview){previewState={iconId:icon.id,status:'error',code};previewStatus.textContent=text+' · 재시도하거나 원문을 확인해 주세요.';mediaRetry.hidden=false;updatePrepare();}
      };
      const failed=()=>showFailure('미디어를 읽지 못했습니다.','MEDIA_ERROR');
      media.dataset.mediaState='loading';media.addEventListener(video?'loadeddata':'load',ready);media.addEventListener('error',failed);
      mediaCleanups.set(media,()=>{finished=true;clean();});
      if(frameThumbnail){media.addEventListener('loadedmetadata',seekFrame);media.addEventListener('seeked',seekReady);frame.append(media,cover);}
      if(preview){previewState={iconId:icon.id,status:'loading',code:null};previewStatus.textContent='미리보기 로딩 중';mediaRetry.hidden=false;previewCleanup=()=>{finished=true;clean();};
        timer=setTimeout(()=>showFailure('미리보기 로딩 시간 초과','MEDIA_TIMEOUT'),15000);media.src=url;
      }else if(mediaBudget)mediaBudget.add(media,url,()=>showFailure('로딩 시간 초과','MEDIA_TIMEOUT'),()=>{
        if(!context||!isGrid()&&!frameThumbnail)return true;
        const top=Math.floor(position/context.columns)*rowHeight;
        return top+rowHeight>context.viewport.scrollTop && top<context.viewport.scrollTop+context.viewport.clientHeight;
      },frameThumbnail?{events:['loadeddata','seeked'],isReady:()=>media.dataset.mediaState==='ready'}:null);
      else media.src=url;
      return frame||media;
    }
    function updateMetrics() {
      metrics.textContent = '전체 데이터 ' + formatCount(pack && pack.icons.length || 0) + '개 · 현재 렌더링 ' + root.querySelectorAll('.icon-card').length + '개 / 최대 ' + MAX_CARDS + '개 · 검색 ' + lastSearchMs.toFixed(2) + 'ms · 그룹 갱신 ' + lastRenderMs.toFixed(2) + 'ms';
    }
    function select(icon) {
      if(catalogOpen)return;
      selectedIconId = icon.id;
      root.querySelectorAll('.icon-card').forEach(card => {card.setAttribute('aria-pressed', String(card.dataset.iconId === selectedIconId));card.querySelector('.card-choose')?.setAttribute('aria-pressed',String(card.dataset.iconId === selectedIconId));});
      renderSelection(); announce((icon.name || '아이콘') + (options.insertionMode?' 선택. 삽입을 누르세요.':' 선택. 선택 정보 준비 버튼으로 확인해 주세요.'));
    }
    function makeCard(icon, position, context, renderMedia) {
      const card = el('div','icon-card');card.tabIndex=0;card.setAttribute('role','group'); card.dataset.iconId = icon.id; card.dataset.groupId = context.group.id; card.dataset.index = String(position);
      const labels = tagsFor(icon).join(' · ');
      card.setAttribute('aria-pressed', String(icon.id === selectedIconId));
      card.setAttribute('aria-label', (icon.name || '아이콘 ' + (position + 1)) + (labels ? ', 태그 ' + labels : '') + ', 선택');
      card.style.top = (Math.floor(position / context.columns) * rowHeight + 4) + 'px';
      card.style.left = 'calc(' + (position % context.columns) * 100 / context.columns + '% + 4px)';
      card.style.width = 'calc(' + 100 / context.columns + '% - 8px)';
      const name = el('span', 'icon-name', icon.name || '아이콘 ' + (position + 1));name.title=[icon.name||'아이콘 '+(position+1),sourceOf(icon)?.title,...(icon.libraryMemberships||[]).map(m=>m.title)].filter(Boolean).join(' · ');
      const tags = el('span', 'icon-tags', labels || '태그 없음');
      if(labels)tags.title=labels;
      const choose=button('card-choose');choose.setAttribute('aria-label',card.getAttribute('aria-label'));choose.setAttribute('aria-pressed',String(icon.id===selectedIconId));choose.append(createMedia(icon,false,context,position,renderMedia),name,tags);card.append(choose);
      choose.title=options.insertionMode?'한 번 클릭하여 선택 · 마우스로 더블클릭하여 삽입':'아이콘 선택';
      let touchStart=null,moved=false;
      card.addEventListener('pointerdown',event=>{moved=false;touchStart=event.pointerType==='touch'?{x:event.clientX,y:event.clientY}:null;if(event.pointerType==='touch'){lastTouchTime=performance.now();mouseProof=null;}else if(event.isTrusted&&event.pointerType==='mouse'&&event.isPrimary!==false&&event.button===0)mouseProof={trusted:true,pointerType:'mouse',time:performance.now(),touchTime:lastTouchTime,iconId:icon.id};});
      card.addEventListener('pointermove',event=>{if(touchStart&&Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)>8)moved=true;});
      card.addEventListener('pointercancel',()=>{moved=true;mouseProof=null;});
      card.addEventListener('click', event => {if(moved){event.preventDefault();moved=false;return;}select(icon);});
      const preview=button('card-preview','미리보기');preview.title='아이콘을 선택하고 미리보기 패널에서 확인합니다.';
      preview.dataset.previewFor=icon.id;preview.addEventListener('click',event=>{if(catalogOpen)return;if(moved){event.preventDefault();moved=false;mouseProof=null;return;}if(!ui.previewVisible)applyUi({...ui,previewVisible:true},true);select(icon);selection.scrollIntoView?.({block:'nearest'});});
      // Sibling button avoids nested interactive elements. Same virtual item owns both.
      card.append(preview);preview.addEventListener('click',event=>event.stopPropagation());
      preview.addEventListener('dblclick',event=>event.stopPropagation());
      card.addEventListener('dblclick',event=>{if(catalogOpen||!options.insertionMode||event.target.closest?.('.card-preview')||moved||mouseProof?.iconId!==icon.id||!mouseDoubleClick(event,mouseProof,performance.now()))return;event.preventDefault();event.stopPropagation();select(icon);requestInsertion();});
      card.addEventListener('keydown', event => {
        const offsets = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: context.columns, ArrowUp: -context.columns, PageDown: context.columns * 2, PageUp: -context.columns * 2};
        let next;
        if(event.key==='Enter'||event.key===' '){if(event.target===card){event.preventDefault();select(icon);}return;}
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = context.group.icons.length - 1;
        else if (Object.prototype.hasOwnProperty.call(offsets, event.key)) next = Math.min(context.group.icons.length - 1, Math.max(0, position + offsets[event.key]));
        else return;
        event.preventDefault();
        const top = Math.floor(next / context.columns) * rowHeight;
        if (top < context.viewport.scrollTop) context.viewport.scrollTop = top;
        else if (top + rowHeight > context.viewport.scrollTop + context.viewport.clientHeight) context.viewport.scrollTop = top + rowHeight - context.viewport.clientHeight;
        context.lastWindow = '';
        context.forceIndex = next;
        renderWindows();
        const target = [...context.content.children].find(node => Number(node.dataset.index) === next);
        if (target) target.focus({preventScroll: true});
      });
      return card;
    }
    function queueWindows() {
      if (virtualFrame || destroyed) return;
      virtualFrame = requestAnimationFrame(() => { virtualFrame = 0; if (!destroyed) renderWindows(); });
    }
    function renderWindows() {
      if (destroyed) return;
      let remaining = MAX_CARDS;
      // Count the new virtual windows, including cards built in detached fragments.
      const renderMedia = {animatedRemaining:4};
      // Focused groups get their window first so keyboard navigation cannot lose its item to the DOM budget.
      const active = root.activeElement?.closest('.icon-card')||root.activeElement;
      const ordered = contexts.slice().sort((a, b) => Number(b.content.contains(active)) - Number(a.content.contains(active)));
      ordered.forEach(context => {
        const width = context.viewport.clientWidth;
        const nextColumns=Math.max(2,Math.min(8,Math.floor(width/UI_SIZES[ui.iconSize].width),Math.floor(MAX_CARDS/(Math.ceil((context.viewport.clientHeight||248)/rowHeight)+2))||2));
        let resizedTop=null;
        // Keep the logical first visible item when responsive column count changes.
        if(isGrid()&&context.lastWindow&&(context.columns!==nextColumns||context.rowHeight!==rowHeight)){
          const oldHeight=context.rowHeight||rowHeight,anchor=Math.floor(context.viewport.scrollTop/oldHeight)*context.columns;
          resizedTop=Math.floor(anchor/nextColumns)*rowHeight+(context.viewport.scrollTop%oldHeight)/oldHeight*rowHeight;
          if(context.content.contains(active)&&Number.isInteger(Number(active.dataset.index))){
            const focusedTop=Math.floor(Number(active.dataset.index)/nextColumns)*rowHeight;
            if(focusedTop<resizedTop)resizedTop=focusedTop;
            else if(focusedTop+rowHeight>resizedTop+context.viewport.clientHeight)resizedTop=focusedTop+rowHeight-context.viewport.clientHeight;
          }
        }
        context.columns=nextColumns;context.rowHeight=rowHeight;
        const rows = Math.ceil(context.group.icons.length / context.columns);
        const height = rows * rowHeight + 8;
        context.content.style.height = height + 'px';
        // Set the new content height first: real browsers otherwise clamp the
        // requested position to the old, shorter scroll range.
        if(resizedTop!==null)context.viewport.scrollTop=resizedTop;
        if(!isGrid())context.viewport.style.height = Math.min(height, 248) + 'px';
        if (!context.visible && !context.content.contains(active) && context.forceIndex === null) {
          if (context.content.childElementCount) { pauseMedia(context.content); context.content.replaceChildren(); }
          context.lastWindow = ''; return;
        }
        const firstRow = Math.max(0, Math.floor(context.viewport.scrollTop / rowHeight) - 1);
        // Cover every visible row plus one row on each side, including the final partial row.
        const lastRow = Math.min(rows, Math.ceil((context.viewport.scrollTop + context.viewport.clientHeight) / rowHeight) + 1);
        let first = firstRow * context.columns;
        const windowLimit = isGrid()?MAX_CARDS:context.columns * 5;
        let end = Math.min(lastRow * context.columns, context.group.icons.length, first + windowLimit, first + remaining);
        if (context.forceIndex !== null && (context.forceIndex < first || context.forceIndex >= end) && remaining > 0) {
          first = Math.max(0, Math.floor(context.forceIndex / context.columns) * context.columns);
          end = Math.min(context.group.icons.length, first + windowLimit, first + remaining);
        }
        context.forceIndex = null;
        const key = rowHeight + ':' + context.columns + ':' + first + ':' + end + (!isGrid()&&options.catalogMode?':a:'+renderMedia.animatedRemaining:'');
        const focusedIndex = context.content.contains(active) ? Number(active.dataset.index) : null;
        remaining -= Math.max(0, end - first);
        if (key === context.lastWindow) {if(!isGrid())renderMedia.animatedRemaining=Math.max(0,renderMedia.animatedRemaining-context.content.querySelectorAll('[data-animated-thumb]').length);return;}
        context.lastWindow = key;
        // Keep overlapping cards (and their media requests) alive. Reuse requires
        // the same icon ID, index and column layout; never rebind an old image/tag.
        if(!isGrid()){
          pauseMedia(context.content);const fragment=document.createDocumentFragment();
          for(let position=first;position<end;position++)fragment.append(makeCard(context.group.icons[position],position,context,renderMedia));
          context.content.replaceChildren(fragment);
        }else{
        const old=new Map([...context.content.children].map(card=>[card.dataset.iconId,card]));
        const keep=new Set();
        for(const card of old.values())if(Number(card.dataset.index)<first||Number(card.dataset.index)>=end||(card.dataset.columns!==String(context.columns)||card.dataset.rowHeight!==String(rowHeight))){pauseMedia(card);card.remove();}
        for(let position=first;position<end;position++){
          const icon=context.group.icons[position],existing=old.get(icon.id);
          const card=existing&&Number(existing.dataset.index)===position&&existing.dataset.columns===String(context.columns)&&existing.dataset.rowHeight===String(rowHeight)?existing:makeCard(icon,position,context,renderMedia);
          card.dataset.columns=String(context.columns);card.dataset.rowHeight=String(rowHeight);keep.add(card);
          const at=context.content.children[position-first];if(at!==card)context.content.insertBefore(card,at||null);
        }
        for(const card of old.values())if(!keep.has(card)){pauseMedia(card);card.remove();}
        }
        if (focusedIndex !== null) {
          const replacement = [...context.content.children].find(node => Number(node.dataset.index) === focusedIndex);
          if (replacement) replacement.focus({preventScroll: true});
          else (context.toggle||input).focus({preventScroll: true});
        }
      });
      mediaBudget?.prune();updateMetrics();
    }
    function renderChips(rebuild = false) {
      if (rebuild) {
        chips.replaceChildren();
        const tags = library ? api.libraryFixedTags.map(name=>({id:name,name})) : pack && pack.tags || [];
        chips.hidden = tags.length === 0;
        if (tags.length) [{id: '', name: '전체'}, ...tags].forEach(tag => {
          const chip = button('tag-button', tag.name); chip.dataset.tagId = tag.id;
          chip.addEventListener('click', () => {
            cancelSearch();
            // A chip commits the current input, even if its debounce has not fired yet.
            if (!composing) state.query = input.value;
            if(library){if(!tag.id)state.selectedTagIds=[];else state.selectedTagIds=state.selectedTagIds.includes(tag.id)?state.selectedTagIds.filter(id=>id!==tag.id):[...state.selectedTagIds,tag.id];}else state.selectedTagIds = tag.id && !state.selectedTagIds.includes(tag.id) ? [tag.id] : [];
            applySearch();
          }); chips.append(chip);
        });
      }
      chips.querySelectorAll('button').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.tagId ? state.selectedTagIds.includes(chip.dataset.tagId) : !state.selectedTagIds.length)));
    }
    function renderSelection() {
      const icon = byIconId(selectedIconId);
      updatePrepare();
      selectionTags.replaceChildren();
      const keepPreview=icon&&previewState.iconId===icon.id&&selectionArt.dataset.url===icon.url;
      if(!keepPreview){previewCleanup();pauseMedia(selectionArt); selectionArt.replaceChildren();previewState={iconId:null,status:'none',code:null};previewStatus.textContent='';mediaRetry.hidden=true;selectionArt.dataset.url=icon?.url||'';}
      selectionSource.hidden = true; selectionSource.removeAttribute('href'); selectionUrl.textContent = '';
      selectionNote.hidden = !icon || result.groups.some(group => group.icons.some(item => item.id === icon.id));
      if (!icon) {
        selectionArt.append(el('span', 'media-placeholder', '선택 대기'));
        selectionName.textContent = '아이콘을 골라주세요';
        selectionDetail.textContent = '선택한 아이콘을 여기서 확인하세요.';
        return;
      }
      if(!keepPreview&&ui.previewVisible)selectionArt.append(createMedia(icon, true)); selectionName.textContent = icon.name || '선택한 아이콘';
      const source = sourceOf(icon);
      const categoryNames = (pack.categories || []).filter(category => (icon.categoryIds || []).includes(category.id)).map(category => category.name);
      selectionDetail.textContent = categoryNames.join(' · ') + (categoryNames.length && source ? ' / ' : '') + (source ? source.title || '원본 글 ' + source.articleId : '출처 정보 미확인');
      const sourceLink = articleUrl(source);
      if (sourceLink) { selectionSource.href = sourceLink; selectionSource.textContent = '출처 게시글 열기'; selectionSource.hidden = false; }
      selectionUrl.textContent = '원본 URL: ' + (icon.url || '미확인');
      selectionUrl.title=icon.url||'';
      tagsFor(icon).forEach(tag => selectionTags.append(el('span', 'small-tag', tag)));
      updatePrepare();
    }
    function renderGroups() {
      const started = performance.now();
      const oldActive = root.activeElement;
      const activeGroup = oldActive && oldActive.closest('.group');
      const activeGroupId = activeGroup && activeGroup.dataset.groupId;
      const activeIconId = oldActive && oldActive.dataset.iconId;
      const criteria=JSON.stringify([state.query,state.selectedTagIds,state.categoryFilterIds,state.sourceFilterIds,currentPackKey,scope.value,textMatch.value,tagMatch.value]);
      const previousTop=isGrid()&&criteria===lastListCriteria?contexts[0]?.viewport.scrollTop||0:0;lastListCriteria=criteria;
      teardownGroups(); groupsNode.replaceChildren();
      summary.replaceChildren(el('strong', '', formatCount(result.uniqueCount) + '개'), document.createTextNode(''));
      if (!result.groups.length) {
        const empty = el('div', 'empty');
        empty.append(el('h2', '', index ? '일치하는 아이콘이 없어요' : '아이콘을 불러오면 여기에 표시됩니다'), el('p', '', index ? '검색어를 줄이거나 선택한 태그를 바꿔보세요.' : '사이트가 제공하는 목록과 공개 메타데이터를 읽습니다.'));
        groupsNode.append(empty);
      }
      if(isGrid()&&result.uniqueCount){
        const matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id))),seen=new Set();
        const icons=(library?result.groups.flatMap(group=>group.icons):pack.icons).filter(icon=>matched.has(icon.id)&&!seen.has(icon.id)&&(seen.add(icon.id),true));
        const viewport=el('div','group-viewport bundle-viewport');viewport.dataset.groupId='bundle-list';viewport.tabIndex=0;
        viewport.setAttribute('aria-label','전체 아이콘 목록');const content=el('div','virtual-content');viewport.append(content);groupsNode.append(viewport);
        const context={group:{id:'bundle-list',name:pack.name||pack.title,icons},viewport,content,toggle:null,columns:2,lastWindow:'',visible:true,forceIndex:null,scrollHandler:queueWindows};
        viewport.scrollTop=previousTop;viewport.addEventListener('scroll',queueWindows,{passive:true});contexts.push(context);
      }
      (isGrid()?[]:result.groups).forEach((group, position) => {
        const collapsed = fold.isCollapsed(group.id);
        const section = el('section', 'group'); section.dataset.groupId = group.id;
        const heading = el('h2', 'group-heading');
        const toggle = button('group-toggle'); toggle.dataset.groupId = group.id;
        toggle.id = instanceId + '-toggle-' + position;
        const bodyId = instanceId + '-group-' + position;
        toggle.setAttribute('aria-expanded', String(!collapsed)); toggle.setAttribute('aria-controls', bodyId);
        const arrow = el('span', 'arrow', '▶'); arrow.setAttribute('aria-hidden', 'true');
        const avatar = el('span', 'avatar', (group.name || '원본').slice(0, 1)); avatar.setAttribute('aria-hidden', 'true');
        const name = el('span', 'group-title', group.name || '미분류');
        const aliases = el('span', 'aliases', (group.aliases || []).join(' / ')); if (aliases.textContent) name.append(aliases);
        const count = el('span', 'group-count', formatCount(group.count === undefined ? group.icons.length : group.count) + '개');
        toggle.append(arrow, avatar, name, count); heading.append(toggle); section.append(heading);
        const groupBody = el('div', 'group-body'); groupBody.id = bodyId; groupBody.hidden = collapsed; section.append(groupBody); groupsNode.append(section);
        toggle.addEventListener('click', () => {
          fold.toggle(group.id); renderGroups();
          const replacement = [...root.querySelectorAll('.group-toggle')].find(node => node.dataset.groupId === group.id);
          if (replacement) replacement.focus({preventScroll: true});
        });
        if (!collapsed) {
          const viewport = el('div', 'group-viewport'); viewport.dataset.groupId = group.id;
          viewport.setAttribute('aria-label', (group.name || '미분류') + ' 아이콘, 그룹 안에서 스크롤');
          const content = el('div', 'virtual-content'); viewport.append(content); groupBody.append(viewport);
          const foot = el('div', 'group-foot', group.icons.length > 12 ? '그룹 안에서 스크롤 · 보이는 아이콘만 표시' : '카테고리별 표시 · 같은 그룹 안의 중복 제외'); groupBody.append(foot);
          const context = {group, viewport, content, toggle, columns: 2, lastWindow: '', visible: true, forceIndex: null, scrollHandler: queueWindows};
          viewport.addEventListener('scroll', context.scrollHandler, {passive: true}); contexts.push(context);
        }
      });
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(()=>{if(dialog.classList.contains('catalog-open'))positionCatalog();queueWindows();}); contexts.forEach(context => resizeObserver.observe(context.viewport));
      }
      if (typeof IntersectionObserver === 'function') {
        visibilityObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => { const context = contexts.find(item => item.viewport === entry.target); if (context) context.visible = entry.isIntersecting; }); queueWindows();
        }, {root: body, rootMargin: '160px 0px'});
        contexts.forEach(context => visibilityObserver.observe(context.viewport));
      }
      renderWindows(); clearSearch.hidden = !state.query.length; renderChips(); renderSelection();
      if (activeGroupId) {
        const nextGroup = [...root.querySelectorAll('.group')].find(node => node.dataset.groupId === activeGroupId);
        const nextCard = nextGroup && [...nextGroup.querySelectorAll('.icon-card')].find(node => node.dataset.iconId === activeIconId);
        const replacement = nextCard || nextGroup && nextGroup.querySelector('.group-toggle');
        if (replacement) replacement.focus({preventScroll: true}); else input.focus({preventScroll: true});
      }
      lastRenderMs = performance.now() - started; updateMetrics();
    }
    function project(row){
      const projectionKey=scope.value==='all'?'all':library.state.currentKey;
      const cached=projections.get(row);if(cached?.has(projectionKey))return cached.get(projectionKey);
      const membership=row.memberships.find(m=>scope.value==='all'||m.packKey===library.state.currentKey)||row.memberships[0];
      const memberPack=library.packs.get(membership?.packKey)?.pack,memberIcon=memberPack?.icons[membership?.position]||row.icon;
      const source=(memberPack?.sources||[]).find(s=>s.sourceId===memberIcon.sourceId||String(s.articleId)===String(row.icon.origin?.articleId));
      // Public tags may be fresher in another membership; category IDs belong to
      // the current pack and must never leak from a merged BUNDLE membership.
      const icon={...row.icon,categoryIds:scope.value==='current'?memberIcon.categoryIds:row.icon.categoryIds,
        id:'library:'+row.identity,libraryIdentity:row.identity,libraryMemberships:row.memberships,librarySource:source,
        tagIds:[],imageMetadata:{...row.icon.imageMetadata,tags:row.tagLabels||[]}};
      const cache=cached||new Map();cache.set(projectionKey,icon);projections.set(row,cache);return icon;
    }
    function paintProgress(info={}) {
        if (destroyed) return;
        const status = info.status || (info.busy ? 'loading' : 'partial');
        const loaded = info.loaded === undefined ? info.count : info.loaded;
        const labels = {loading: '불러오는 중', complete: '불러옴', partial: '일부 불러옴', stopped: '중지됨', cached: '저장된 목록', error: '읽기 실패'};
        let text = info.message || labels[status] || '수집 상태';
        if (loaded !== undefined) text += ' · ' + formatCount(loaded) + '개';
        if (info.total !== undefined && info.total !== null) text += ' / 전체 ' + formatCount(info.total) + '개';
        else if (loaded !== undefined && status !== 'complete') text += ' · 전체 수 미확인';
        if (info.declaredCount !== undefined) text += ' · 메타데이터 선언 ' + formatCount(info.declaredCount) + '개';
        if (info.verifiedCount !== undefined) text += ' · 하위 글 확인 ' + formatCount(info.verifiedCount) + '개';
        if (status === 'cached' && info.fetchedAt) {
          const date = new Date(info.fetchedAt); if (Number.isFinite(date.getTime())) text += ' · 취득 ' + date.toLocaleString('ko-KR');
        }
        progressNode.textContent = text;
        const busy = info.busy === undefined ? status === 'loading' : !!info.busy;
        stop.disabled = !busy || ['cache','storage'].includes(info.phase) || typeof options.onStop !== 'function';
        stop.textContent=info.phase==='native'?'추가 수집 중지':'로딩 중지';
        retry.disabled = !['partial', 'stopped', 'error'].includes(status) || typeof options.onRetry !== 'function';
        refresh.disabled = busy || typeof options.onRefresh !== 'function';
        paintLoading(info);
    }
    function paintLoading(info={}){
      const busy=info.busy===undefined?info.status==='loading':!!info.busy;
      const phaseLabels={cache:'저장된 팩을 확인하고 있어요.',article:'아이콘 게시글을 읽고 있어요.',metadata:'팩 정보를 확인하고 있어요.',references:'원본 게시글을 확인하고 있어요.',tags:'아이콘과 태그를 읽고 있어요.',storage:'팩을 저장하고 있어요.',native:'아이콘 목록을 읽고 있어요.'};
      // Only reader-supplied counts are displayed; a progress bar without value is indeterminate.
      const processed=Number.isFinite(info.processed)?info.processed:Number.isFinite(info.loaded)?info.loaded:null;
      const total=Number.isFinite(info.total)&&info.total>0?info.total:null;
      loadingPanel.hidden=!busy;groupsNode.inert=busy;
      dialog.classList.toggle('pack-busy',busy);loadingPanel.dataset.phase=info.phase||'';
      if(info.states)progressNode.dataset.sourceChecks=JSON.stringify(info.states.map(s=>({articleId:s.articleId,page:s.page,status:s.status,metadataStatus:s.metadataStatus,declared:s.declared,matched:s.matched,tagged:s.tagged,tagErrors:s.tagErrors,ambiguousMetadata:s.ambiguousMetadata,metadataReadError:s.metadataReadError,missingCount:s.missingCount,missing:s.missing})));
      gridStage.setAttribute('aria-busy',String(busy));
      loadingMessage.textContent=info.message||phaseLabels[info.phase]||'아이콘팩을 확인하고 있어요.';
      loadingCount.textContent=processed===null?'':formatCount(processed)+(total===null?'개 처리':' / '+formatCount(total)+'개 처리');
      if(total!==null&&processed!==null){loadingBar.max=total;loadingBar.value=Math.min(total,Math.max(0,processed));}else{loadingBar.removeAttribute('value');loadingBar.removeAttribute('max');}
      loadingStop.disabled=!busy||['cache','storage'].includes(info.phase)||typeof options.onStop!=='function';
      loadingStop.textContent=info.phase==='native'?'추가 수집 중지':'로딩 중지';
      catalogView?.setProgress?.({...info,message:loadingMessage.textContent});
    }
    function renderLibrary(){
      libraryResult=library.search();
      dialog.classList.toggle('all-pack-search',scope.value==='all');
      if(scope.value==='current'&&library.packs.has(library.state.currentKey))basePack=library.packs.get(library.state.currentKey).pack;
      const rows=library.rows.filter(row=>scope.value==='all'||row.memberships.some(m=>m.packKey===library.state.currentKey));
      const icons=rows.map(project),byIdentity=new Map(icons.map(icon=>[icon.libraryIdentity,icon]));
      pack={...(basePack||{}),icons,kind:scope.value==='all'?'BUNDLE':basePack?.kind||'NORMAL',categories:basePack?.categories||[],tags:basePack?.tags||[]};
      displayTags=new Map(icons.map(icon=>[icon.id,iconTagLabels(icon)]));
      const ordered=libraryResult.items.map(row=>byIdentity.get(row.identity)).filter(Boolean);
      // Keep NORMAL categories while applying ranked order inside each category.
      if(!isGrid()&&pack.categories.length){const groups=pack.categories.map(category=>({...category,icons:ordered.filter(icon=>(icon.categoryIds||[]).includes(category.id))})).filter(group=>group.icons.length);
        const loose=ordered.filter(icon=>!(icon.categoryIds||[]).length);if(loose.length)groups.push({id:'uncategorized',name:'기타 아이콘',icons:loose});result={groups,uniqueCount:ordered.length,membershipCount:groups.reduce((n,g)=>n+g.icons.length,0)};
      }else result={groups:ordered.length?[{id:'library-list',name:basePack?.title||'아이콘 목록',icons:ordered}]:[],uniqueCount:ordered.length,membershipCount:ordered.length};
      syncLayout();
      const progress=libraryResult.progress,loading=progress.status==='loading';
      libraryStatus.textContent=loading?`수집 중 · ${libraryResult.scopedIndexed}/${libraryResult.scopedRegistered}개 팩 검색 가능 · 실패 ${progress.failed}개`:libraryResult.partial?`일부 팩을 아직 읽지 못했어요. 현재 확인된 아이콘을 표시합니다. · ${libraryResult.scopedIndexed}/${libraryResult.scopedRegistered}개 팩`:`${libraryResult.scopedIndexed}개 팩 검색 완료`;
      help.textContent=`${scope.value==='all'?'전체 팩':'현재 팩'} · 검색어 ${textMatch.value==='all'?'모두':'하나 이상'} + 태그 ${tagMatch.value==='all'?'모두':'하나 이상'} 일치`;
      if(scope.value==='current'){if(currentProgress)paintProgress(currentProgress);else if(basePack)paintProgress({status:'complete',loaded:basePack.icons.length});else{progressNode.textContent='아이콘 리스트에서 팩을 선택하세요.';stop.disabled=retry.disabled=refresh.disabled=true;}}
      if(scope.value==='all'){stop.disabled=!loading;retry.disabled=loading||!libraryResult.partial;refresh.disabled=loading||!libraryResult.scopedRegistered;progressNode.textContent=loading?'등록된 팩을 차례로 확인하고 있어요.':libraryResult.partial?'읽지 못한 팩이 있어요. 확인된 아이콘을 먼저 검색할 수 있습니다.':'확인한 전체 팩에서 검색할 수 있습니다.';}
      if(scope.value==='all'){packTitle.textContent='등록된 전체 아이콘팩';packBadge.textContent='전체';packLink.hidden=true;}
      else if(basePack){packTitle.textContent=basePack.title||basePack.name||'현재 팩';packBadge.textContent=basePack.kind||'NORMAL';const url=articleUrl(basePack.representative||{articleId:basePack.mainArticleId||basePack.articleId,boardId:basePack.boardId});packLink.hidden=!url;if(url)packLink.href=url;}
    }
    function libraryCollect(refresh=false){
      if(!library||destroyed)return;
      const work=library.collect({refresh,onProgress:()=>{if(destroyed||libraryFrame)return;libraryFrame=requestAnimationFrame(()=>{libraryFrame=0;if(!destroyed)applySearch(false);});}});applySearch(false);work.catch(error=>{if(!destroyed)setError(error.message);});
    }
    function applySearch(collect=true) {
      if (destroyed) return;
      state.queryRevision++; fold.update(hasCriteria());
      const start = performance.now();
      if(library){
        library.setState({scope:scope.value,query:state.query,textMatch:textMatch.value,tagMatch:tagMatch.value,selectedTags:state.selectedTagIds});
        renderLibrary();
        const key=JSON.stringify([scope.value,state.query,textMatch.value,library.state.currentKey]);
        if(collect&&scope.value==='all'&&key!==collectionKey){collectionKey=key;if(libraryResult.partial)libraryCollect();}
      }else result = index ? index.search(state) : {groups: [], uniqueCount: 0, membershipCount: 0};
      lastSearchMs = performance.now() - start; renderGroups();reportMetadata();
    }
    function metadataSummary() {
      const matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id)));
      return {...(pack?.bodyCounts?.metadata || {}),modelIcons:pack?.icons?.length||0,
        taggedIcons:(pack?.icons||[]).filter(icon=>icon.imageMetadata?.tags?.length).length,
        indexed:library?pack?.icons.length||0:index?.iconCount||0,query:state.query,searchMatched:result.uniqueCount,
        // Virtualization intentionally mounts only a window of the logical result.
        displayedTags:[...matched].filter(id=>displayTags.get(id)?.length).length,
        renderedCards:root.querySelectorAll('.icon-card').length,
        renderedTaggedCards:[...root.querySelectorAll('.icon-tags')].filter(node=>node.textContent!=='태그 없음').length};
    }
    function metadataDetails() {
      const summary=metadataSummary(),matched=new Set(result.groups.flatMap(group=>group.icons.map(icon=>icon.id)));
      const media=collectionDiagnostics?.mediaDetail || [],byId=new Map(media.filter(row=>row.iconId).map(row=>[row.iconId,row]));
      return {summary,images:media,missing:(pack?.icons||[]).filter(icon=>!matched.has(icon.id)).map(icon=>{
        const source=byId.get(icon.id);
        return {...source,iconId:icon.id,url:icon.url,keywords:[...(icon.keywords||[])],tags:tagsFor(icon),stage:'search',
          reason:source?.reason && source.reason!=='mapped'?source.reason:'query-or-filter-mismatch'};
      })};
    }
    function reportMetadata() {
      if(options.debug!==true || !pack)return;
      const detail=metadataDetails(),key=JSON.stringify(detail);
      if(key===lastMetadataLog)return;lastMetadataLog=key;
      const failures=detail.images.filter(row=>row.reason!=='mapped');
      global.console?.info?.('[Aru Icons] metadata diagnostics',{...detail.summary,unmappedOrUntagged:failures,missing:detail.missing});
    }
    function resetSearch() {
      cancelSearch(); composing = false; input.value = ''; state.query = ''; state.selectedTagIds = []; state.categoryFilterIds = []; state.sourceFilterIds = [];
      fold.update(false); applySearch(); announce('검색을 초기화하고 검색 전 접힘 상태를 복원했습니다.');
    }
    function callAction(name) {
      if (typeof options[name] !== 'function') return;
      try {
        Promise.resolve(options[name]()).catch(error => setError(error && error.message || '요청을 처리하지 못했습니다.'));
      } catch (error) { setError(error && error.message || '요청을 처리하지 못했습니다.'); }
    }
    function setError(message) {
      if (destroyed) return;
      errorNode.textContent = String(message || '아이콘을 읽지 못했습니다.'); errorNode.hidden = false;
      retry.disabled = typeof options.onRetry !== 'function';
    }
    function close(action) {
      if (destroyed) return;
      destroy();
      try { if (typeof options[action] === 'function') options[action](); } catch (_) { /* New UI failures must not stop the existing captioner. */ }
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;clearTimeout(toastTimer); cancelSearch();previewCleanup();library?.cancel();uiCleanup?.();if(libraryFrame)cancelAnimationFrame(libraryFrame);
      if (initialFocusFrame) cancelAnimationFrame(initialFocusFrame);
      events.abort(); teardownGroups(); pauseMedia(root);mediaBudget?.destroy();catalogView?.destroy();
      root.querySelectorAll('img,source').forEach(n=>n.removeAttribute('src'));
      pack=null;index=null;displayTags.clear();collectionDiagnostics=null;catalogRef=null;catalogPack=null;selectedIconId=null;result={groups:[],uniqueCount:0,membershipCount:0};
      folds.forEach(item => item.dispose()); if (!folds.size) fold.dispose();
      folds.clear();root.replaceChildren();
      host.remove();
      unlockPage();
      if (opener && opener.isConnected && typeof opener.focus === 'function' && !(mobileInput()&&opener.matches?.('input,textarea,[contenteditable="true"]'))) opener.focus({preventScroll: true});
    }
    function availableViewport(){
      const height=global.visualViewport?.height||global.innerHeight;
      if(!Number.isFinite(height)||height<=0)return;
      host.style.setProperty('--aru-available-height',height+'px');
      host.style.top=(global.visualViewport?.offsetTop||0)+'px';host.style.bottom='auto';host.style.height=height+'px';
      const width=global.visualViewport?.width||global.innerWidth;
      if(Number.isFinite(width)&&width>0){host.style.left=(global.visualViewport?.offsetLeft||0)+'px';host.style.right='auto';host.style.width=width+'px';}
      const mobile=mobileInput();
      if(dialog.classList.contains('mobile-layout')!==mobile)searchOptions.open=!mobile;
      dialog.classList.toggle('mobile-layout',mobile);positionCatalog();
      if(mobile&&refresh.parentNode!==optionContent)optionContent.append(refresh);
      else if(!mobile&&refresh.parentNode!==loadActions)loadActions.append(refresh);
      const compact=height<600;
      if(mobile&&viewControls.parentNode!==optionContent)optionContent.append(viewControls);
      else if(!mobile&&viewControls.parentNode!==dialog)header.after(viewControls);
      if(mobile&&compact&&chips.parentNode!==optionContent)optionContent.prepend(chips);
      else if((!mobile||!compact)&&chips.parentNode!==searchArea)searchOptions.after(chips);
      optionsSummary.textContent=mobile&&compact?'필터':'검색·화면 설정';optionsSummary.setAttribute('aria-label','검색·태그·화면 설정');
      dialog.classList.toggle('compact-height',compact);queueWindows();
    }
    function applyUi(value,persist=false){
      const next=api.UiPreferences?.sanitize?api.UiPreferences.sanitize(value):{modalSize:['default','wide','max'].includes(value.modalSize)?value.modalSize:'default',iconSize:['small','normal','large'].includes(value.iconSize)?value.iconSize:'normal',previewVisible:typeof value.previewVisible==='boolean'?value.previewVisible:true};
      ui=next;rowHeight=currentCardSize().row;dialog.dataset.modalSize=ui.modalSize;dialog.classList.toggle('preview-collapsed',!ui.previewVisible);
      selection.hidden=!ui.previewVisible;collapsedInsert.hidden=ui.previewVisible;modalSize.value=ui.modalSize;iconSize.value=ui.iconSize;
      previewToggle.textContent=ui.previewVisible?'미리보기 접기':'미리보기 펼치기';previewToggle.setAttribute('aria-expanded',String(ui.previewVisible));
      const size=currentCardSize();for(const [name,value]of Object.entries({height:size.card,media:size.media,'media-width':size.mediaWidth}))dialog.style.setProperty('--aru-card-'+name,value+'px');
      if(!ui.previewVisible){for(const v of selectionArt.querySelectorAll('video'))try{v.pause();}catch(_){}if(previewState.status==='loading'){previewCleanup();pauseMedia(selectionArt);selectionArt.replaceChildren();previewState={iconId:null,status:'none',code:null};}}
      renderWindows();renderSelection();queueWindows();
      if(persist){uiRevision++;const saved={...ui};Promise.resolve().then(()=>preferences?.write?.(saved)).catch(()=>{if(!destroyed)announce('화면 설정을 저장하지 못했어요. 이번 창에서는 계속 사용할 수 있습니다.');});}
    }
    listen(modalSize,'change',()=>applyUi({...ui,modalSize:modalSize.value},true));listen(iconSize,'change',()=>applyUi({...ui,iconSize:iconSize.value},true));listen(previewToggle,'click',()=>applyUi({...ui,previewVisible:!ui.previewVisible},true));
    applyUi(ui);
    const pointerChanged=()=>applyUi(ui);
    if(coarsePointer?.addEventListener)listen(coarsePointer,'change',pointerChanged);
    else if(coarsePointer?.addListener){coarsePointer.addListener(pointerChanged);events.signal.addEventListener('abort',()=>coarsePointer.removeListener?.(pointerChanged),{once:true});}
    const uiReady=Promise.resolve().then(()=>preferences?.read?.()).then(value=>{if(!destroyed&&uiRevision===0&&value)applyUi(value);}).catch(()=>{if(!destroyed)announce('화면 설정을 복원하지 못했어요. 기본 크기로 열었습니다.');});
    availableViewport();listen(global,'resize',availableViewport);
    if(global.visualViewport){listen(global.visualViewport,'resize',availableViewport);listen(global.visualViewport,'scroll',availableViewport);}
    listen(backdrop,'wheel',event=>{if(event.target===backdrop)event.preventDefault();},{passive:false});
    listen(backdrop,'touchmove',event=>{if(event.target===backdrop)event.preventDefault();},{passive:false});
    listen(input, 'compositionstart' , () => { composing = true; cancelSearch(); });
    listen(input, 'compositionend', () => { composing = false; cancelSearch(); searchTimer = setTimeout(() => { searchTimer = 0; state.query = input.value; applySearch(); }, 150); });
    listen(input, 'input', event => {
      if (composing || event.isComposing) return;
      if(library&&scope.value==='all')library.cancel();
      cancelSearch(); searchTimer = setTimeout(() => { searchTimer = 0; state.query = input.value; applySearch(); }, 150);
    });
    listen(clearSearch, 'click', () => { cancelSearch(); composing = false; input.value = ''; state.query = ''; applySearch();if(!mobileInput()) input.focus(); announce('검색어만 지웠습니다. 태그 필터는 유지됩니다.'); });
    listen(reset, 'click', resetSearch);
    listen(expandAll, 'click', () => { fold.setAll(result.groups.map(group => group.id), false); renderGroups(); announce('현재 표시된 그룹을 모두 펼쳤습니다.'); });
    listen(collapseAll, 'click', () => { fold.setAll(result.groups.map(group => group.id), true); renderGroups(); announce('현재 표시된 그룹을 모두 접었습니다.'); });
    listen(closeButton, 'click', () => close('onClose'));
    listen(scope,'change',()=>{cancelSearch();state.query=input.value;collectionKey='';options.onLibraryScope?.(scope.value);applySearch();});
    listen(textMatch,'change',()=>{cancelSearch();state.query=input.value;applySearch();});
    listen(tagMatch,'change',()=>{cancelSearch();state.query=input.value;applySearch();});
    listen(stop, 'click', () => {if(library&&scope.value==='all'){library.cancel();applySearch(false);announce('전체 팩 수집을 중지했습니다.');}else callAction('onStop');});
    listen(loadingStop,'click',()=>callAction('onStop'));
    listen(retry, 'click', () => {if(library&&scope.value==='all')libraryCollect();else callAction('onRetry');});
    listen(refresh, 'click', () => {if(library&&scope.value==='all')libraryCollect(true);else callAction('onRefresh');});
    listen(mediaRetry,'click',()=>{
      const icon=byIconId(selectedIconId);if(!icon)return;
      previewCleanup();previewState={iconId:null,status:'none',code:null};
      // Retry only this media, using the exact URL and no query rewriting.
      for(const card of root.querySelectorAll('.icon-card'))if(card.dataset.iconId===icon.id&&card.querySelector('[data-media-state="error"]')){
        card.replaceWith(makeCard(icon,Number(card.dataset.index),contexts.find(c=>c.content===card.parentNode),{}));
      }
      renderSelection();mediaBudget?.prune();
    });
    async function requestInsertion(){
      const icon = byIconId(selectedIconId); if (catalogOpen || destroyed || !icon || prepare.disabled || preparing || !targetValid || previewState.status==='error' || typeof options.onSelect !== 'function') return;
      preparing = true; updatePrepare();
      try {
        const prepared = await options.onSelect(icon);
        if (!destroyed) announce(typeof prepared === 'string' ? prepared : prepared && prepared.message || '선택 정보를 준비했습니다. 실제 삽입·게시·전송은 실행하지 않았습니다.');
      } catch (error) {mediaDiagnostic(icon,'insertion',error?.code||'INSERT_FAILED');setError((error?.code?'['+error.code+'] ':'')+(error?.message||'선택 정보를 준비하지 못했습니다.')); }
      finally { preparing = false; if (!destroyed) renderSelection(); }
    }
    listen(prepare,'click',requestInsertion);listen(collapsedInsert,'click',requestInsertion);
    listen(root, 'keydown', event => {
      // Keep picker keystrokes out of the site's editor shortcuts while preserving input behavior.
      event.stopPropagation();
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if(catalogOpen)setCatalogOpen(false,'cancel');else close('onClose'); return; }
      if (event.key !== 'Tab') return;
      const scopeRoot=catalogOpen?catalogView.node:root;
      const focusable = [...scopeRoot.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href],[tabindex="0"]')].filter(node => !node.hidden && !node.closest('[inert],[hidden]') && (!node.closest('details:not([open])')||node.tagName==='SUMMARY') && node.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if(root.activeElement!==first&&!focusable.includes(root.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}
      else if (event.shiftKey && (root.activeElement === first || root.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    ['click', 'pointerdown', 'mousedown', 'keyup', 'keypress'].forEach(type => listen(root, type, event => event.stopPropagation()));
    if(library)renderChips(true);renderGroups();syncLayout();if(catalogView&&options.openCatalogInitially===true)setCatalogOpen(true); initialFocusFrame = requestAnimationFrame(() => {
      initialFocusFrame = 0;
      // Do not steal a click/keyboard focus established before the first frame,
      // or try to focus a catalog that a cached BUNDLE has already hidden.
      if (!destroyed && !root.activeElement) (mobileInput()?(catalogOpen?catalogView.node:dialog):(catalogOpen?catalogView.input:input)).focus({preventScroll: true});
    });

    const apiPicker = {
      setCurrentSource(key){if(!library)return;library.setState({currentKey:key});collectionKey='';},
      completeCatalogSelection(){setCatalogOpen(false,'selected');showPackToast();},
      openCatalog(){setCatalogOpen(true);},
      closeCatalog(){setCatalogOpen(false,'cancel');},
      refreshLibrary(){if(library){if(scope.value==='all')libraryCollect();applySearch(false);}},
      setMetadataDiagnostics(value){collectionDiagnostics=options.debug===true?value:null;reportMetadata();},
      getMetadataDiagnostics(){return options.debug===true?metadataDetails():null;},
      setCatalog(entries,message){catalogView?.setEntries(entries,message,library?.packs);},
      setCatalogPack(ref,next){catalogRef=ref;catalogPack=next;catalogView?.setPack(ref,next);},
      setQuery(value){cancelSearch();input.value=String(value||'');state.query=input.value;applySearch();},
      setTargetState(valid,error){targetValid=valid;targetError.hidden=valid;targetError.textContent=valid?'':'['+(error?.code||'SESSION_UNAVAILABLE')+'] '+(error?.message||'삽입 대상 세션이 없습니다. 작성기에서 다시 열어 주세요.');renderSelection();},
      clearPack(){if(library&&scope.value==='all'){applySearch(false);return;}if(library)library.setState({currentKey:null});basePack=null;teardownGroups();pack=null;syncLayout();index=null;displayTags.clear();collectionDiagnostics=null;lastMetadataLog='';catalogRef=null;catalogPack=null;selectedIconId=null;result={groups:[],uniqueCount:0,membershipCount:0};columns.hidden=!!options.catalogMode&&!library;packTitle.textContent='아이콘팩과 즐겨찾기';packBadge.textContent='목록';packLink.hidden=true;renderGroups();renderSelection();},
      setSources(choices=[]) {
        if(!sourceSelect || destroyed)return;
        const selected=sourceSelect.value;
        sourceSelect.replaceChildren();
        const placeholder=el('option','','기본 목록에서 팩 선택');placeholder.value='';sourceSelect.append(placeholder);
        for(const item of choices){const option=el('option','',item.title);option.value=String(item.articleId);sourceSelect.append(option);}
        sourceSelect.value=selected;
      },
      uiReady,
      element: host,
      shadowRoot: root,
      setPack(nextPack) {
        columns.hidden=false;
        if (destroyed) return;
        if (!nextPack || !Array.isArray(nextPack.icons)) throw new Error('아이콘팩 데이터가 올바르지 않습니다.');
        const key = String(nextPack.packId || nextPack.id || nextPack.mainArticleId || nextPack.articleId || nextPack.title || 'current-pack');
        if (currentPackKey !== key) {
          selectedIconId=null;previewCleanup();previewState={iconId:null,status:'idle',code:null};
          if (!folds.has(key)) {
            const nextFold = new api.FoldState();
            const initiallyCollapsed = Object.entries(options.initialCollapsed || {}).filter(([, value]) => value).map(([id]) => id);
            if (initiallyCollapsed.length) nextFold.setAll(initiallyCollapsed, true);
            folds.set(key, nextFold);
          }
          fold = folds.get(key); currentPackKey = key;
        }
        basePack=nextPack;currentPackKey=key;pack = nextPack;syncLayout(); index = new api.SearchIndex(pack);collectionDiagnostics=null;
        const tagDictionary=new Map((pack.tags||[]).map(tag=>[tag.id,tag.name]));
        displayTags=new Map(pack.icons.map(icon=>[icon.id,iconTagLabels(icon,tagDictionary)]));
        packTitle.textContent = pack.title || pack.name || '아이콘팩 ' + (pack.mainArticleId || pack.articleId || '');
        packBadge.textContent = pack.kind || pack.packKind || 'NORMAL';
        const primarySource = pack.representative || {articleId: pack.mainArticleId || pack.articleId, boardId:pack.boardId, articleUrl: pack.articleUrl};
        const link = articleUrl(primarySource); packLink.hidden = !link; if (link) packLink.href = link; else packLink.removeAttribute('href');
        renderChips(true); applySearch();
      },
      setProgress(info = {}) {currentProgress={...info};if(!library||scope.value!=='all')paintProgress(info);else catalogView?.setProgress?.(info);},
      setError,
      clearError() { errorNode.hidden = true; errorNode.textContent = ''; },
      resetSearch,
      destroy,
      getSnapshot() {
        return {destroyed, targetValid, catalog:catalogView?{...catalogView.snapshot(),open:catalogOpen,toastShown}:null, media:mediaBudget?.snapshot(), library:libraryResult?{scope:scope.value,textMatch:textMatch.value,tagMatch:tagMatch.value,partial:libraryResult.partial,registered:libraryResult.registered,indexed:libraryResult.indexed,progress:libraryResult.progress}:null,ui:{...ui,rowHeight,columns:contexts[0]?.columns||0,preparing},displayMode:'icon-list',viewportCount:contexts.length,preview:{...previewState},mediaFailures:options.debug===true?[...mediaFailures.values()]:[], packId: currentPackKey, query: state.query, selectedTagIds: state.selectedTagIds.slice(), selectedIconId, uniqueCount: result.uniqueCount, membershipCount: result.membershipCount, groups: result.groups.map(group => ({id: group.id, count: group.count === undefined ? group.icons.length : group.count, collapsed: fold.isCollapsed(group.id)})), renderedCards: root.querySelectorAll('.icon-card').length, maxCards: MAX_CARDS, searchMs: lastSearchMs, renderMs: lastRenderMs,metadata:metadataSummary()};
      }
    };
    return apiPicker;
  };
})(globalThis);


/* source: shared/ruliweb-icons/composer-adapter.js */
/* ISOLATED world: opt-in entries and immutable composer sessions. */
(function(global) {
  'use strict';
  const API=global.AruIcons=global.AruIcons||{};
  const REQUEST='aru-icons-composer-request-v1',RESPONSE='aru-icons-composer-response-v1';
  const token=()=>global.crypto.randomUUID().replaceAll('-','');
  function request(document,op,payload={}) {
    const requestId=token();
    // Native attachment APIs are synchronous. No delayed operation may commit after a timeout/close.
    return new Promise((resolve,reject)=>{
      let replied=false;
      const listener=event=>{
        if(event.target!==document || typeof event.detail!=='string')return;
        let reply;try{reply=JSON.parse(event.detail);}catch(_){return;}
        if(reply.requestId!==requestId)return;
        replied=true;document.removeEventListener(RESPONSE,listener);
        reply.ok?resolve(reply.result):reject(Object.assign(new Error(reply.error?.message||'작성기에 반영하지 못했습니다.'),{code:reply.error?.code}));
      };
      document.addEventListener(RESPONSE,listener);
      document.dispatchEvent(new CustomEvent(REQUEST,{detail:JSON.stringify({requestId,op,...payload})}));
      if(!replied){document.removeEventListener(RESPONSE,listener);reject(Object.assign(new Error('네이티브 연결 모듈 응답이 없습니다. 테스트 확장을 다시 로드하고 페이지를 새로 열어 주세요.'),{code:'BRIDGE_UNAVAILABLE'}));}
    });
  }
  function selectedMedia(icon) {
    const variants=icon.variants||icon.media?.variants||[];
    const v=variants.find(v=>v.role==='selection')||variants.find(v=>v.role==='original')||variants.find(v=>v.role==='body')||variants[0];
    const url=v?.url||icon.url;
    const format=v?.format||icon.media?.format||icon.format;
    const kind=v?.kind||icon.media?.kind||icon.mediaKind;
    return {url,format,kind:kind==='animated'?'image':kind==='unknown'?undefined:kind};
  }
  function nativeButton(wrapper) {
    return [...wrapper.querySelectorAll('button[onclick],span[onclick]')].find(node=>{
      const code=node.getAttribute('onclick')||'';
      return /app\.comment_icon(?:_toggle)?\(/.test(code) && !/['"](?:preset|pick)['"]/.test(code) &&
        node.closest('.common_write_wrapper')===wrapper && !node.closest('.comment_icon');
    });
  }
  function packChoices(panel) {
    const seen=new Set(),choices=[];
    for(const node of panel?.querySelectorAll('.icon_data_show_target[onclick]')||[]) {
      const articleId=API.SiteAdapter.selectionId(node);
      if(!articleId||seen.has(articleId))continue;seen.add(articleId);
      choices.push({articleId,title:node.getAttribute('title')||'글 '+articleId});
    }
    return choices;
  }
  function parseArticle(value) {
    const text=String(value||'').trim();
    let id=text;
    if(!/^[1-9]\d*$/.test(text)){
      let url;try{url=new URL(text);}catch(_){throw new Error('루리웹 아이콘 게시판의 글 URL 또는 번호를 입력해 주세요.');}
      if(url.protocol!=='https:' || !['bbs.ruliweb.com','m.ruliweb.com'].includes(url.hostname) || url.port || url.username || url.password || url.hash ||
         !/^\/community\/board\/98\/read\/([1-9]\d*)\/?$/.test(url.pathname))throw new Error('아이콘 게시판의 공개 읽기 URL만 사용할 수 있습니다.');
      id=url.pathname.match(/\/read\/([1-9]\d*)/)[1];
    }
    if(!Number.isSafeInteger(Number(id)) || Number(id)<1)throw new Error('글 번호가 올바르지 않습니다.');
    return Number(id);
  }
  class ComposerController {
    constructor({document=global.document,onOpen,onRemoved,debug=false}={}) {
      this.document=document;this.onOpen=onOpen;this.onRemoved=onRemoved;this.debug=debug;this.entries=new Map();this.frame=0;this.stopped=true;
    }
    start() {
      if(!this.stopped)return;this.stopped=false;this.scan();
      this.observer=new MutationObserver(records=>{
        if(this.stopped)return;
        const relevant=records.some(record=>{
          if(record.target.closest?.('[data-aru-icons-entry],[data-aru-icons-picker]'))return false;
          return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1 &&
            !node.matches('[data-aru-icons-entry],[data-aru-icons-picker]') &&
            (node.matches('.common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar')||
             node.querySelector('.common_write_wrapper,.seditor,textarea.comment_input,textarea.reply_input,.note-toolbar')));
        });
        if(relevant&&!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.stopped)this.scan();});
      });
      this.observer.observe(this.document.body,{childList:true,subtree:true});
    }
    scan() {
      for(const [root,entry] of this.entries)if(!root.isConnected || !entry.anchor.isConnected || !entry.host.isConnected) {
        entry.events.abort();entry.uiCleanup?.();entry.host.remove();root.removeAttribute('data-aru-composer-token');this.entries.delete(root);this.onRemoved?.(root);
      }
      for(const root of this.document.querySelectorAll('.common_write_wrapper')) {
        if(this.entries.has(root) || root.closest('#editor_v2'))continue;
        const inputs=[...root.querySelectorAll('textarea.comment_input,textarea.reply_input')].filter(n=>n.closest('.common_write_wrapper')===root);
        const anchor=nativeButton(root);if(inputs.length!==1||!anchor)continue;
        this.add(root,anchor,inputs[0].matches('.reply_input')?'reply':'comment');
      }
      // Only the editor actually observed on the live write page. No guessed legacy editor DOM/API.
      for(const root of this.document.querySelectorAll('#editor_v2 .seditor')) {
        if(this.entries.has(root) || !root.querySelector('#ReactSummernoteLite'))continue;
        const camera=root.querySelector('.note-toolbar .icon-camera');
        const anchor=camera?.closest('button');if(anchor)this.add(root,anchor,'post');
      }
    }
    add(root,anchor,kind) {
      const id=token();root.dataset.aruComposerToken=id;
      const host=this.document.createElement('span');host.dataset.aruIconsEntry='true';
      const shadow=host.attachShadow({mode:'open'}),style=this.document.createElement('style'),button=this.document.createElement('button');
      style.textContent=':host{display:inline-block;vertical-align:middle;margin:0 4px}button{all:initial;box-sizing:border-box;display:inline-block;padding:5px 9px;border:1px solid #78609f;border-radius:6px;background:#f4effb;color:#463362;font:13px/1.4 system-ui;cursor:pointer;min-height:30px}button:focus-visible{outline:2px solid #7150b6}button:disabled{opacity:.5}';
      button.type='button';button.textContent='아이콘 선택';button.setAttribute('aria-label',kind==='post'?'아이콘 선택 · 게시글':kind==='reply'?'아이콘 선택 · 이 답글':'아이콘 선택 · 이 댓글');
      shadow.append(style,button);const uiCleanup=API.DesignSystem?.entry(shadow,{label:'아이콘 선택',tooltip:'아이콘 라이브러리에서 원하는 아이콘을 선택해 삽입합니다.',priority:'primary'});anchor.after(host);
      const events=new AbortController();const entry={root,anchor,kind,host,button,token:id,events,uiCleanup,pending:null};
      this.entries.set(root,entry);
      button.addEventListener('pointerdown',event=>{if(event.button===0)event.preventDefault();},{signal:events.signal});
      button.addEventListener('click',async()=>{
        if(entry.pending||this.stopped)return;
        button.disabled=true;button.setAttribute('aria-busy','true');
        const pending=request(this.document,'capture',{token:id,debug:this.debug});entry.pending=pending;
        try{
          const session=await pending;
          if(this.stopped||!root.isConnected||this.entries.get(root)!==entry){await request(this.document,'release',{session:session.session});return;}
          await this.onOpen({...entry,session});
        }catch(error){
          if(this.debug)global.console?.info?.('[Aru Icons Composer]',{stage:'capture',status:'failed',code:error.code||'CAPTURE_FAILED',kind,connected:root.isConnected});
          if(!this.stopped)await this.onOpen({...entry,error});
        }finally{entry.pending=null;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
      },{signal:events.signal});
    }
    stop() {
      this.stopped=true;this.observer?.disconnect();if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
      for(const [root,entry]of this.entries){entry.events.abort();entry.uiCleanup?.();entry.host.remove();root.removeAttribute('data-aru-composer-token');}
      this.entries.clear();
    }
  }
  API.ComposerAdapter=Object.freeze({request,selectedMedia,nativeButton,packChoices,parseArticle});
  API.ComposerController=ComposerController;
})(globalThis);


/* source: shared/ruliweb-icons/feature.js */
/* Independent opt-in lifecycle. Existing caption/download listeners are untouched. */
(function(global) {
  'use strict';
  const API=global.AruIcons=global.AruIcons||{};
  const Site=API.SiteAdapter;
  class IconFeature {
    constructor({document=global.document,browser=API.BrowserAdapter,createPicker=API.createPicker,site=Site}={}) {
      this.document=document;this.browser=browser;this.createPicker=createPicker;this.site=site;
      this.enabled=false;this.generation=0;this.entry=null;this.picker=null;this.current=null;this.controller=null;
      this.optionsRevision=0;this.destroyed=false;
      this.onClick=this.onClick.bind(this);this.onNavigate=()=>this.stopSession(true);
    }
    async start() {
      if(this.unsubscribe||this.destroyed)return;
      this.unsubscribe=this.browser.onChanged(()=>this.applyOptions());
      await this.applyOptions();
    }
    async applyOptions() {
      const revision=++this.optionsRevision;
      let opts;
      try {opts=await this.browser.readOptions();}
      catch (_) {opts={active:false,aruIconsOptions:{enabled:false,autoLoad:true}};}
      if(this.destroyed||revision!==this.optionsRevision)return;
      const active=opts.active===true;
      this.options=opts.aruIconsOptions;
      if(active===this.enabled)return;
      this.enabled=active;
      if(active) {
        this.document.addEventListener('click',this.onClick,true);
        global.addEventListener?.('popstate',this.onNavigate);
        global.addEventListener?.('hashchange',this.onNavigate);
        if(API.ComposerController) {
          this.composers=new API.ComposerController({document:this.document,debug:this.options?.debug===true,onOpen:entry=>this.openComposer(entry),
            onRemoved:root=>{if(this.current?.target?.root===root)this.stopSession(true);}});
          this.composers.start();
        }
      } else {
        this.document.removeEventListener('click',this.onClick,true);
        global.removeEventListener?.('popstate',this.onNavigate);
        global.removeEventListener?.('hashchange',this.onNavigate);
        this.composers?.stop();this.composers=null;
        this.stopSession(true);this.entry?.remove();this.entry=null;
      }
    }
    addReadEntry() {
      const id=global.location?.pathname.match(/^\/community\/board\/98\/read\/(\d+)\/?$/)?.[1];
      const body=this.document.querySelector('.view_content[itemprop="articleBody"],.view_content article');
      if(!id||!body)return;
      const host=this.document.createElement('div');host.dataset.aruIconsEntry='true';
      const shadow=host.attachShadow({mode:'open'}),button=this.document.createElement('button');button.type='button';
      button.textContent='확장 아이콘 보기 · 읽기 전용';
      const style=this.document.createElement('style');style.textContent=':host{display:block;margin:12px 0}button{min-height:44px;padding:10px 16px;border:1px solid #70609a;border-radius:10px;color:#463362;background:#f4effb;font:14px system-ui;cursor:pointer}';
      shadow.append(style,button);body.before(host);this.entry=host;
      button.addEventListener('click',()=>this.open({articleId:Number(id),title:body.querySelector('h1')?.textContent||'글 '+id,panel:null,document:this.document,opener:button}));
    }
    onClick(event) {
      // Phase 2A's native button retains its own behavior. Aru entries own the extension picker.
      if(API.ComposerController)return;
      const target=event.target?.closest?.('.icon_data_show_target[onclick]');
      if(!target)return;
      const articleId=this.site.selectionId(target),panel=target.closest('.comment_icon');
      if(!articleId||!panel)return;
      // The original event still reaches the site's own listener. No preventDefault/bridge.
      const closingSame=this.current?.articleId===articleId&&this.current?.panel===panel;
      this.stopSession(true);
      const context={articleId,panel,title:target.getAttribute('title')||'글 '+articleId,opener:target};
      const generation=this.generation;
      setTimeout(()=>{if(closingSame&&panel.querySelector('.icon_share_data')?.style.display==='none')return;if(this.enabled&&generation===this.generation)this.open(context);},0);
    }
    stopSession(destroy=false) {
      this.packSelection=null;this.generation++;this.controller?.abort();this.controller=null;
      this.panelObserver?.disconnect();this.panelObserver=null;
      if(destroy){
        this.librarySearch?.destroy();this.librarySearch=null;this.libraryDirect=null;this.libraryCatalogSignature='';
        this.catalogObserver?.disconnect();this.catalogObserver=null;
        const session=this.current?.target?.session?.session;
        if(session)API.ComposerAdapter?.request(this.document,'release',{session}).catch(()=>{});
        this.picker?.destroy();this.picker=null;this.current=null;this.preparedSelection=null;
      }
    }
    async openComposer(entry) {
      if(!this.enabled)return;
      const panel=entry.kind==='post'?this.document.querySelector('#editor_common_write_wrapper .comment_icon'):entry.root.querySelector('.comment_icon');
      // Let the site's normal button load its own catalog/module; never call the denied API directly.
      // Viewing favorites is independent of whether an insertion session was captured.
      if(entry.kind!=='post' && panel && !panel.children.length)entry.anchor.click();
      // A composer target is independent of its media source. Never auto-select the current article.
      await this.open({articleId:null,boardId:'98',title:'아이콘팩과 즐겨찾기',panel:null,
        document:null,opener:entry.button,target:entry,nativePanel:panel,catalogMode:!!API.CatalogSources});
    }
    cancelPackSelection() {
      const task=this.packSelection;if(!task)return;
      this.packSelection=null;this.stopCollection();
      if(this.current===task.context)Object.assign(task.context,task.before);
    }
    chooseArticle(value,boardId='98') {
      if(!this.current||!this.picker)return Promise.resolve({ok:false});
      // A repeated tap on the same loading entry joins its existing task. A
      // different entry still cancels the old request and restores its context.
      let ref;
      try {
        ref=API.CatalogSources?(typeof value==='object'?{...value,...API.CatalogSources.parseRef(value.url)}:{...API.CatalogSources.parseRef(value,boardId),source:'direct'}):{articleId:API.ComposerAdapter.parseArticle(value),boardId:'98'};
      } catch(error) {return Promise.reject(error);}
      ref.key=ref.key||'direct:'+ref.boardId+':'+ref.articleId;
      const key=String(ref.boardId)+':'+ref.articleId;
      if(this.packSelection?.key===key&&this.packSelection.context===this.current)return this.packSelection.promise;
      this.cancelPackSelection();
      const context=this.current,picker=this.picker;
      const before=Object.fromEntries(['articleId','boardId','catalogRef','title','document','panel','sourceQuery'].map(k=>[k,context[k]]));
      const task={key,context,before};this.packSelection=task;
      task.promise=this.loadChosenArticle(ref,task,picker);return task.promise;
    }
    async loadChosenArticle(ref,task,picker) {
      const {context,before}=task;
      if(this.librarySearch){if(ref.source==='direct')this.libraryDirect?.set(String(ref.boardId)+':'+ref.articleId,ref);this.librarySearch.setEntries([...this.librarySearch.entries.values(),ref]);}
      if(ref.source==='direct')picker.setCatalog?.([...API.CatalogSources.developerPacks(),...API.CatalogSources.favorites(context.nativePanel),...this.libraryDirect.values()]);
      this.stopCollection();Object.assign(context,{articleId:ref.articleId,boardId:ref.boardId,catalogRef:ref,title:ref.title||'글 '+ref.articleId,document:null,panel:null,sourceQuery:''});
      const result=await this.collect(false,false,true);
      if(this.packSelection!==task || this.current!==context)return {ok:false,cancelled:true};
      this.packSelection=null;
      if(!result?.ok){Object.assign(context,before);return result||{ok:false};}
      picker.completeCatalogSelection?.();return result;
    }
    async insertSelection(icon,context) {
      if(!this.enabled)throw Object.assign(new Error('아이콘 기능이 비활성화되었습니다.'),{code:'FEATURE_DISABLED'});
      if(this.current!==context)throw Object.assign(new Error('선택기 대상이 바뀌었습니다. 해당 작성기에서 다시 열어 주세요.'),{code:'PICKER_TARGET_CHANGED'});
      if(!context.target?.session)throw Object.assign(new Error(context.target?.error?.message||'삽입 세션이 없습니다. 작성기에서 다시 열어 주세요.'),{code:context.target?.error?.code||'SESSION_UNAVAILABLE'});
      if(this.inserting)throw new Error('아이콘을 첨부하는 중입니다.');
      this.inserting=true;
      try {
        const result=await API.ComposerAdapter.request(this.document,'insert',{session:context.target.session.session,media:API.ComposerAdapter.selectedMedia(icon),debug:this.options?.debug===true});
        if(this.current!==context)return result;
        const input=context.target.root.querySelector('textarea.comment_input,textarea.reply_input,.note-editable');
        this.stopSession(true);input?.focus({preventScroll:true});
        return {message:'작성기에 아이콘을 첨부했습니다.',...result};
      } finally {this.inserting=false;}
    }
    async open(context) {
      if(!this.enabled)return;
      const readBudget=this.current?.readBudget||{count:0,max:128};
      this.stopSession(true);this.current=context;context.readBudget=readBudget;
      // Current-pack reads retain the existing collector; all-pack UI uses the bounded library reader.
      if(API.LibrarySearchEngine&&API.LibraryPackReader)this.librarySearch=new API.LibrarySearchEngine({reader:new API.LibraryPackReader({browser:this.browser,site:this.site,isActive:()=>this.enabled})});
      this.libraryDirect=new Map();
      this.picker=this.createPicker({opener:context.opener,debug:this.options?.debug===true,insertionMode:!!context.target,catalogMode:context.catalogMode,openCatalogInitially:!!context.target&&context.catalogMode===true,targetValid:!context.target||!!context.target.session,librarySearch:this.librarySearch,
        onLibraryScope:scope=>{if(scope==='all')this.stopCollection();else if(context.articleId&&!this.librarySearch?.packs.has(String(context.boardId)+':'+context.articleId))this.collect(false);},
        onCatalogSource:(ref,query)=>this.chooseArticle(ref,ref.boardId,query),
        onDirectSource:(value,board)=>this.chooseArticle(value,board),
        onCatalogCancel:()=>this.cancelPackSelection(),
        targetLabel:context.target?.kind==='post'?'게시글':context.target?.kind==='reply'?'현재 답글':'현재 댓글',
        onSource:context.target?value=>this.chooseArticle(value):null,
        onClose:()=>this.stopSession(true),onNativeReturn:()=>{
          this.stopSession(true);
          if(context.target?.kind==='post')this.document.querySelector('#iconImage')?.click();
          else context.target?.anchor?.click();
        },
        onStop:()=>{if(this.packSelection)this.cancelPackSelection();else this.stopCollection();},onRetry:()=>this.collect(true,true),onRefresh:()=>this.collect(true),
        onSelect:context.target?icon=>this.insertSelection(icon,context):icon=>{const prepared=this.site.prepareInsertion(icon,{panel:context.panel,kind:context.panel?.closest('#editor_common_write_wrapper')?'post':'comment'});this.preparedSelection=prepared;return {message:prepared.message};}});
      this.document.body.append(this.picker.element);
      if(context.target) {
        const update=()=>{
          if(this.current!==context)return;
          if(context.catalogMode) {
            const favorites=API.CatalogSources.favorites(context.nativePanel);
            const entries=[...API.CatalogSources.developerPacks(),...favorites];
            entries.push(...this.libraryDirect.values());
            if(context.catalogRef&&context.catalogRef.source!=='direct')entries.push(context.catalogRef);
            const signature=JSON.stringify(entries.map(ref=>[ref.boardId,ref.articleId,ref.title,ref.url,ref.source]));if(signature!==this.libraryCatalogSignature){this.libraryCatalogSignature=signature;this.librarySearch?.setEntries(entries);this.picker?.refreshLibrary?.();}
            this.picker?.setCatalog?.(entries,favorites.length?'즐겨찾기는 사이트 기본 목록의 현재 상태를 읽었습니다.':'즐겨찾기 목록을 아직 확인하지 못했습니다. 기존 아이콘 버튼의 로그인·목록 상태를 확인해 주세요.');
          } else this.picker?.setSources?.(API.ComposerAdapter.packChoices(context.nativePanel));
        };
        update();
        if(context.nativePanel) {
          this.catalogObserver=new MutationObserver(update);
          this.catalogObserver.observe(context.nativePanel,{childList:true,subtree:true});
        }
        this.picker.setTargetState?.(!!context.target.session,context.target.error);
        if(context.target.error)this.picker.setError('['+(context.target.error.code||'CAPTURE_FAILED')+'] '+context.target.error.message);
      }
      if(context.panel && typeof MutationObserver!=='undefined') {
        this.panelObserver=new MutationObserver(()=>{
          if(this.current!==context)return;
          if(!context.panel.isConnected||context.panel.style.display==='none'||context.panel.querySelector('.icon_share_data')?.style.display==='none')this.stopCollection();
        });
        this.panelObserver.observe(context.panel,{attributes:true,attributeFilter:['style','hidden'],subtree:true});
      }
      if(context.articleId)await this.collect(false);
      else this.picker.setProgress({status:'partial',message:'기본 목록에서 팩을 고르거나 아이콘 게시글 URL 또는 번호를 입력해 주세요.',busy:false});
    }
    stopCollection() {
      this.generation++;this.controller?.abort();this.controller=null;
      this.picker?.setProgress({status:'stopped',message:'수집을 중지했습니다. 재시도로 이어서 수집할 수 있습니다.',busy:false});
    }
    collect(refresh,manualNative=false,transactional=false) {
      if(!this.enabled||!this.current||!this.picker)return Promise.resolve();
      const key=JSON.stringify([this.current.boardId,this.current.articleId,!!refresh,!!manualNative,!!transactional]);
      if(this.collectionTask?.context===this.current&&this.collectionTask.key===key&&this.controller&&!this.controller.signal.aborted)return this.collectionTask.promise;
      const task={key,context:this.current};this.collectionTask=task;
      task.promise=this.runCollection(refresh,manualNative,transactional).finally(()=>{if(this.collectionTask===task)this.collectionTask=null;});
      return task.promise;
    }
    async runCollection(refresh,manualNative=false,transactional=false) {
      if(!this.enabled||!this.current||!this.picker)return;
      this.controller?.abort();const controller=new AbortController();this.controller=controller;
      const signal=controller.signal,token=++this.generation,context=this.current,picker=this.picker;
      const current=()=>!signal.aborted && this.enabled && this.generation===token && this.current===context;
      const ensure=()=>{if(!current())throw Object.assign(new Error('수집 중지'),{code:'ABORTED'});};
      const diagnostics=new Map();
      const log=(stage,data)=>{
        if(!current()||this.options?.debug!==true)return;const key=JSON.stringify(data);if(diagnostics.get(stage)===key)return;diagnostics.set(stage,key);
        global.console?.info?.('[Aru Icons]',{stage,articleId:context.articleId,...data});
      };
      let pendingPack=null,pendingData=null,latestProgress=null;
      const progress=info=>{latestProgress={...info};picker.setProgress(info);};
      const commit=(pack,data={})=>{
        if(this.librarySearch&&context.articleId){const ref=context.catalogRef||{boardId:context.boardId||'98',articleId:context.articleId,title:context.title,source:'direct'};this.librarySearch.remember(ref,pack,{stale:data.stale===true||(pack.kind==='BUNDLE'&&(pack.attributeReaderVersion!==2||pack.mediaReaderVersion!==1))});this.librarySearch.setState({currentKey:String(ref.boardId)+':'+ref.articleId});}
        picker.setCurrentSource?.(String(context.boardId)+':'+context.articleId);picker.setPack(pack);
        if(context.catalogRef)picker.setCatalogPack?.(context.catalogRef,pack);
        const view=picker.getSnapshot?.();
        log('picker-delivery',{kind:pack.kind,delivered:pack.icons.length,visibleMatches:view?.uniqueCount ?? null,groups:view?.groups?.length ?? null,
          renderedCards:view?.renderedCards ?? null,...data});
      };
      const publish=(pack,data={})=>{if(transactional){pendingPack=pack;pendingData=data;}else commit(pack,data);};
      const cacheArgs={boardId:context.boardId||'98',articleId:String(context.articleId)};
      const cacheFor=kind=>context.catalogRef?{...cacheArgs,catalogSource:context.catalogRef.source||'direct',packKind:kind,readerVersion:2}:cacheArgs;
      const cacheWarning=()=>{if(current())picker.setError('캐시를 사용할 수 없어 이번 세션에서만 표시합니다. 원래 기능은 계속 사용할 수 있습니다.');};
      const readPublic=async(id,opts={})=>{
        ensure();const budget=context.readBudget||{count:0,max:128};
        if(budget.count>=budget.max)throw Object.assign(new Error('이번 선택기의 공개 글 조회 상한 128회에 도달했습니다. 닫고 다시 열어 주세요.'),{code:'REQUEST_LIMIT'});
        budget.count++;return this.site.getPublicDocument(id,{...opts,signal});
      };
      try {
        picker.clearError();progress({status:'loading',phase:'cache',processed:null,total:null,message:'저장된 팩을 확인하고 있어요.',busy:true});
        if(refresh) {try{for(const kind of context.catalogRef?['BUNDLE','NORMAL']:['NORMAL'])await this.browser.requestCache('invalidate',cacheFor(kind));}catch(_){cacheWarning();}ensure();}
        else {
          try {
            let cached;for(const kind of context.catalogRef?['BUNDLE','NORMAL']:['NORMAL']){cached=await this.browser.requestCache('get',cacheFor(kind));ensure();if(cached?.snapshot?.pack)break;}
            const cachedPack=cached?.snapshot?.pack;
            const normal=cachedPack?.kind==='NORMAL';
            const empty=normal && (!Array.isArray(cachedPack.icons) || !cachedPack.icons.length);
            const bodyForNative=normal && !!context.panel && cachedPack.collectionMode==='article-body-v1';
            // Read entries have the current DOM: an old native/body NORMAL cache must not
            // mask missing/changed metadata or perpetuate an empty list.
            const readCurrent=normal && !context.panel;
            const readAttributes=cachedPack?.kind==='BUNDLE' && (cachedPack.attributeReaderVersion!==2 || cachedPack.mediaReaderVersion!==1 || cached.stale===true || cached.snapshot?.sourceCheck?.status==='partial'||cached.snapshot?.sourceCheck?.states?.some(s=>s.metadataReadError||s.tagErrors||s.ambiguousMetadata));
            log('cache',{hit:!!cachedPack,kind:cachedPack?.kind || null,icons:cachedPack?.icons?.length ?? 0,
              action:empty?'ignore-empty-normal':bodyForNative?'ignore-body-for-native':readCurrent?'read-current-normal-body':readAttributes?'read-bundle-attributes':cachedPack?'reuse':'miss'});
            if(cachedPack && !empty && !bodyForNative && !readCurrent && !readAttributes) {
              publish(cachedPack,{from:'cache',stale:cached.stale===true});
              progress({status:'cached',phase:'ready',processed:cachedPack.icons.length,loaded:cachedPack.icons.length,total:cachedPack.icons.length,message:'저장된 팩을 불러왔어요.'+(cached.stale?' 최신 정보는 새로고침으로 확인해 주세요.':''),fetchedAt:cached.acquiredAt,busy:false});
              // Cache cannot establish current native availability or current source verification.
              if(transactional){ensure();commit(pendingPack,pendingData);}return {ok:true,pack:cachedPack};
            }
          } catch(error){ensure();cacheWarning();}
        }
        let resolved,doc;
        try {
          progress({status:'loading',phase:'article',processed:null,total:null,message:'아이콘 게시글을 읽고 있어요.',busy:true});
          doc=(!refresh&&context.document) || await readPublic(context.articleId,{forceRead:refresh,boardId:context.boardId||'98'});ensure();
          const body=doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
          progress({status:'loading',phase:'metadata',processed:null,total:null,message:'팩 정보를 확인하고 있어요.',busy:true});
          resolved=(context.boardId&&context.boardId!=='98')?{kind:'NORMAL',pack:null,warnings:[],rawMetadata:null}:await API.Metadata.parseDocument(body||doc,{articleId:context.articleId,boardId:98});ensure();
        } catch(error) {
          ensure();if(transactional)throw error;picker.setError('['+(error.code||'READ_FAILED')+'] '+error.message+' 정상 탭에서 대표 글을 열거나 원래 선택기로 돌아갈 수 있습니다.');
          if(error.code==='ACCESS_DENIED') {progress({status:'partial',message:'접근 제한으로 중지했습니다. 자동 재요청은 하지 않습니다.',busy:false});return;}
          resolved={kind:'NORMAL',pack:null,warnings:[],rawMetadata:null};
        }
        log('pack-type',{kind:resolved.kind,metadataVersion:resolved.metadataVersion ?? null,metadataIcons:resolved.pack?.icons?.length ?? 0,
          warnings:resolved.warnings?.length || 0,route:context.panel?'native-panel':'article-read'});
        if(resolved.warnings?.length)picker.setError(resolved.warnings.map(w=>w.message||String(w)).join(' '));
        let pack=resolved.pack,sourceCheck=null;
        if(!pack) {
          if(!context.panel){
            if(!doc){progress({status:'partial',message:'공개 본문을 읽지 못했습니다. 정상 탭에서 다시 열거나 원본 다시 읽기를 사용해 주세요.',busy:false});return;}
            progress({status:'loading',phase:'tags',processed:null,total:null,message:'아이콘과 태그를 읽고 있어요.',busy:true});
            const collected=this.site.readArticlePack(doc,context.articleId,context.title,context.boardId||'98',{diagnostics:this.options?.debug===true});ensure();pack=collected.pack;
            log('body-collect',{selector:collected.selector,...collected.counts});publish(pack,{from:'article-body'});
            picker.setMetadataDiagnostics?.(collected.metadataDiagnostics);
            progress({status:!pack.icons.length || collected.counts.excluded?'partial':'complete',phase:'ready',processed:pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,
              message:'NORMAL 본문 URL 수집 · 대상 '+collected.counts.candidates+'개 · 제외 '+collected.counts.excluded+'개 · 중복 '+collected.counts.duplicates+'개. '+(!pack.icons.length?'지원하는 본문 미디어가 없습니다. ':'')+(collected.counts.tagErrors?'태그를 읽지 못한 이미지 '+collected.counts.tagErrors+'개는 태그 없이 표시합니다.':''),busy:false});
          } else {
          progress({status:'loading',phase:'native',processed:null,total:null,message:'사이트 아이콘 목록이 준비되기를 기다리고 있어요.',busy:true});
          const start=Date.now();let s=this.site.snapshot(context.panel,context.articleId);
          while(!s.ready&&Date.now()-start<10000){await this.site.delay(100,signal);ensure();s=this.site.snapshot(context.panel,context.articleId);}
          ensure();pack=this.site.normalPack(s,context.articleId,context.title);publish(pack,{from:'native-panel',raw:s.rawCount});
          if(this.options.autoLoad!==false||manualNative) {
            const session=new this.site.NativeLoadSession({articleId:context.articleId,read:()=>this.site.snapshot(context.panel,context.articleId),click:b=>b.click(),isCurrent:current,
              onProgress:p=>{if(!current())return;publish(this.site.normalPack(p,context.articleId,context.title),{from:'native-panel',raw:p.rawCount});progress(p);}});
            const final=await session.run(signal);ensure();pack=this.site.normalPack(final,context.articleId,context.title);
          } else progress({status:s.done?'complete':'partial',loaded:s.rawCount,total:s.declaredTotal,message:'자동 추가 수집 꺼짐 · 원래 버튼 사용 후 설정에서 자동 수집을 켤 수 있습니다.',busy:false});
          }
        } else {
          publish(pack,{from:'metadata'});
          if(resolved.v1Slaves?.length) {
            sourceCheck=await this.site.verifyReferences(resolved,{signal,readDocument:(id,opts)=>readPublic(id,{...opts,boardId:'98',forceRead:refresh}),onProgress:p=>{if(current())progress(p);}});ensure();
            // A new pack identity rebuilds the catalog's previously computed index too.
            pack={...pack,attributeReaderVersion:2,mediaReaderVersion:1};
            publish(pack,{from:'metadata',stale:sourceCheck.status!=='complete'});progress({...sourceCheck,phase:'ready',processed:sourceCheck.processedCount??sourceCheck.verifiedCount,loaded:pack.icons.length,total:pack.icons.length,declaredCount:pack.icons.length,message:sourceCheck.status==='partial'?'일부 원본 정보(URL·태그)를 확인하지 못했어요. 아래 안내를 확인해 주세요.':'원본 아이콘과 태그를 확인했어요.',busy:false});
            const problems=sourceCheck.states.filter(s=>s.status!=='verified'||s.metadataStatus==='partial');
            if(problems.length)picker.setError(problems.map(s=>'글 '+s.articleId+': '+(s.message||[s.status!=='verified'?'원본 URL '+s.matched+'/'+s.declared+'개 확인 · 나머지 URL 대응 미확인':'',s.metadataStatus==='partial'?'일부 태그를 읽지 못했어요. 새로고침하거나 원본 태그를 확인해 주세요.':''].filter(Boolean).join(' '))).join(' / '));
          } else progress({status:'complete',phase:'ready',processed:pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,message:'팩 정보를 읽었어요.',busy:false});
        }
        ensure();
        if(pack.kind==='NORMAL' && !pack.icons.length){log('cache-write',{action:'skip-empty-normal',icons:0});if(transactional)throw Object.assign(new Error('이 게시글에는 표시할 수 있는 아이콘이 없습니다.'),{code:'PACK_EMPTY'});return;}
        // Existing v1 partial source verification remains a warning, not a new pack rejection policy.
        const completedProgress={...latestProgress,phase:'ready',processed:sourceCheck?.processedCount??pack.icons.length,loaded:pack.icons.length,total:pack.icons.length,busy:false};
        progress({...completedProgress,status:'loading',phase:'storage',message:'다음에 사용할 팩을 저장하고 있어요.',busy:true});
        try{await this.browser.requestCache('put',{...cacheFor(pack.kind),snapshot:{pack,kind:resolved.kind,sourceCheck},rawMetadata:resolved.rawMetadata});}catch(_){cacheWarning();}
        ensure();progress(completedProgress);
        ensure();if(transactional&&pendingPack)commit(pendingPack,pendingData);return {ok:true,pack};
      } catch(error) {
        if(!current())return {ok:false,cancelled:true};
        picker.setError('['+(error.code||'READ_FAILED')+'] '+error.message);progress({status:error.code==='ABORTED'?'stopped':'error',message:error.message,busy:false});
        return {ok:false,error:{code:error.code||'READ_FAILED',message:error.message}};
      }
    }
    destroy() {
      this.destroyed=true;this.optionsRevision++;
      this.enabled=false;this.document.removeEventListener('click',this.onClick,true);
      global.removeEventListener?.('popstate',this.onNavigate);global.removeEventListener?.('hashchange',this.onNavigate);
      this.unsubscribe?.();this.unsubscribe=null;this.composers?.stop();this.composers=null;this.stopSession(true);this.entry?.remove();this.entry=null;
    }
  }
  API.IconFeature=IconFeature;
  // All expensive work is gated by both stored toggles; loading this file creates no site UI.
  if(global.document && API.BrowserAdapter && /^(bbs|m)\.ruliweb\.com$/.test(global.location?.hostname||'')) {
    const feature=new IconFeature();API.feature=feature;
    feature.start().catch(error=>console.warn('[Aru Icons] 초기화 실패:',error.message));
  }
})(typeof globalThis!=='undefined'?globalThis:this);

