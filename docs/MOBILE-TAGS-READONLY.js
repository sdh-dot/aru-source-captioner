/* Run in the page Console (top). Read only: no requests, storage, auth or editor content. */
(() => {
  'use strict';
  const route = location.pathname.match(/^\/community\/board\/(\d+)\/read\/(\d+)\/?$/u);
  const report = {
    diagnostic: 'aru-mobile-picker-tags-readonly-v1',
    article: route ? { boardId: Number(route[1]), articleId: Number(route[2]), host: location.hostname } : null,
    limits: 'Public article media attributes and picker control state only; no editor/comment content, storage, cookies, network or mutations.'
  };
  const bodies = [...document.querySelectorAll('.view_content[itemprop="articleBody"]')];
  const fallback = bodies.length ? bodies : [...document.querySelectorAll('.view_content article')];
  report.body = { identified: fallback.length === 1, candidateCount: fallback.length };
  if (route && /^(?:bbs|m)\.ruliweb\.com$/u.test(location.hostname) && fallback.length === 1) {
    const body = fallback[0];
    const rows = [...body.querySelectorAll('img,video')].filter(node => !node.closest('.comment,.comment_view,.comment_wrapper,.comment_icon,.select_icon_box,.ad,.advertisement,[data-ad],aside'));
    const counts = { media: rows.length, images: 0, videos: 0, ids: 0, tagAttributes: 0, decoded: 0, tagged: 0, failed: 0, versionUnknown: 0 };
    const failures = [];
    rows.forEach((node, index) => {
      counts[node.tagName === 'VIDEO' ? 'videos' : 'images']++;
      if (node.hasAttribute('data-aru-id')) counts.ids++;
      const raw = node.getAttribute('data-aru-tags');
      if (raw === null) return;
      counts.tagAttributes++;
      if (raw.startsWith('aru-tags:') && !raw.startsWith('aru-tags:v1:')) {
        counts.versionUnknown++; failures.push({ position: index + 1, kind: node.tagName, code: 'TAGS_VERSION' }); return;
      }
      try {
        if (raw.length > 65536) throw new Error('size');
        const parsed = raw.startsWith('aru-tags:v1:') ? JSON.parse(decodeURIComponent(raw.slice(12))) : raw.split(',');
        if (!Array.isArray(parsed) || parsed.length > 1000 || parsed.some(tag => typeof tag !== 'string' || tag.replace(/\s+/gu, ' ').trim().length > 512 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(tag))) throw new Error('tags');
        counts.decoded++; if (parsed.some(tag => tag.trim())) counts.tagged++;
      } catch (_) { counts.failed++; failures.push({ position: index + 1, kind: node.tagName, code: 'TAGS_INVALID' }); }
    });
    report.body.counts = counts; report.body.failures = failures;
    // A BUNDLE carrier normally has no per-icon attributes. Read each source article separately.
    report.body.bundleCarrier = !!body.querySelector('[data-meta="ruricon:v1"],[data-meta="ruricon-state"]');
  }
  const hosts = [...document.querySelectorAll('[data-aru-icons-picker]')];
  report.picker = { openCount: hosts.length };
  if (hosts.length === 1 && hosts[0].shadowRoot) {
    const root = hosts[0].shadowRoot;
    const tags = [...root.querySelectorAll('.tag-button')];
    const labels = [...root.querySelectorAll('.icon-tags')];
    const style = node => node ? { display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility, pointerEvents: getComputedStyle(node).pointerEvents } : null;
    report.picker = {
      ...report.picker,
      catalogOpen: root.querySelector('.dialog')?.classList.contains('catalog-open') || false,
      scope: root.querySelector('#search-scope')?.value || null,
      textMatch: root.querySelector('#text-match')?.value || null,
      tagMatch: root.querySelector('#tag-match')?.value || null,
      queryPresent: !!root.querySelector('.search-input')?.value,
      tagButtons: tags.length,
      disabledTags: tags.filter(button => button.disabled).length,
      pressedTagIds: tags.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset.tagId),
      chipsStyle: style(root.querySelector('#tag-chips')),
      renderedCards: root.querySelectorAll('.icon-card').length,
      taggedCards: labels.filter(node => node.textContent.trim() && node.textContent.trim() !== '태그 없음').length,
      libraryStatus: root.querySelector('.library-status')?.textContent?.trim() || '',
      errorPresent: !![...root.querySelectorAll('.error,.target-error')].find(node => !node.hidden && node.textContent.trim()),
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      viewport: { width: innerWidth, height: innerHeight, visualHeight: globalThis.visualViewport?.height || null }
    };
    const rawChecks=root.querySelector('#load-progress')?.getAttribute('data-source-checks');
    if(rawChecks&&rawChecks.length<=65536){try{const checks=JSON.parse(rawChecks);if(Array.isArray(checks))report.picker.sourceChecks=checks.slice(0,200).map(row=>{
      const result={};for(const key of ['articleId','page','declared','matched','tagged','tagErrors','ambiguousMetadata','missingCount'])if(Number.isSafeInteger(row[key])&&row[key]>=0&&row[key]<=20000)result[key]=row[key];
      for(const key of ['status','metadataStatus','metadataReadError'])if(typeof row[key]==='string'&&/^[a-zA-Z_-]{1,64}$/.test(row[key]))result[key]=row[key];
      if(Array.isArray(row.missing))result.missing=row.missing.slice(0,5).flatMap(item=>{try{const url=new URL(item.url);return url.protocol==='https:'&&/^i[123]\.ruliweb\.com$/.test(url.hostname)&&!url.username&&!url.password?[{index:item.index,url:url.origin+url.pathname}]:[];}catch(_){return [];}});
      return result;
    });}catch(_){report.picker.sourceChecksInvalid=true;}}
  }
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
