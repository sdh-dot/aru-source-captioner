// HTML 판독을 carrier 모델과 분리하고 호출자가 제공한 브라우저 환경만 사용한다.
import { createMetadataCore } from './metadata-core.mjs';
export function createMetadata({ environment: global = globalThis } = {}) {
  const core = createMetadataCore(global);
  const { LIMITS, parseCarriers } = core;
  const fail = (code, message) => { throw new core.MetadataError(code, message); };
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
    const doc = new global.DOMParser().parseFromString(rootOrHtml, 'text/html');
    const body = doc.querySelector('.view_content') || doc.querySelector('[itemprop="articleBody"]') || doc.body;
    return parseDocument(body, options);
  }
  return { MetadataError: core.MetadataError, Metadata: Object.freeze({ supportsUnboundV1: true, LIMITS: core.LIMITS, mediaUrl: core.mediaUrl, publicArticleUrl: core.publicArticleUrl, decodeCarrier: core.decodeCarrier, validateV1: core.validateV1, validateV2: core.validateV2, parseCarrier: core.parseCarrier, parseCarriers: core.parseCarriers, fromV1: core.fromV1, fromTagged: core.fromTagged, sha256: core.sha256, parseDocument, parseMetadata, readDocumentCarriers }) };
}
