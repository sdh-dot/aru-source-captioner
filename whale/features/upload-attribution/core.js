/* Order-independent attribution. No upload interception, media requests or storage. */
(function (g) {
  'use strict';
  let sequence = 0;
  const id = prefix => prefix + (++sequence);
  const ROOTS = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
  class Registry {
    constructor({ now = () => Date.now(), ttl = 5 * 60 * 1000, limit = 512 } = {}) {
      this.now = now; this.ttl = ttl; this.limit = limit;
      this.records = []; this.blocked = new Set(); this.full = false;
    }
    begin(files, root) {
      this.expire();
      const batch = id('b');
      if (this.records.length + files.length > this.limit) { this.full = true; return []; }
      // Register EVERY name before any asynchronous metadata parse can finish.
      const records = files.map((file, index) => ({ id: id('f'), batch, index,
        name: String(file.name || ''), size: file.size, modified: file.lastModified,
        root, created: this.now(), state: 'pending', consumed: false, info: null }));
      this.records.push(...records); return records;
    }
    ready(record, info) {
      if (this.records.includes(record) && record.state !== 'expired') {
        record.info = info || { status: 'missing' }; record.state = 'ready';
      }
    }
    expire() {
      for (const record of this.records) if (!record.consumed && record.state !== 'expired' && this.now() - record.created > this.ttl) {
        record.state = 'expired'; this.blocked.add(record.name);
      }
      // Expired names remain quarantined for the session: a late upload must
      // not become associated with a later file of the same name.
    }
    match(names, root) {
      this.expire();
      const exact = new Set(names.filter(value => typeof value === 'string' && value.length));
      if (this.full) return { status: 'capacity' };
      if ([...exact].some(name => this.blocked.has(name))) return { status: 'expired' };
      const possible = this.records.filter(record => record.root === root && record.state !== 'expired' && !record.consumed && exact.has(record.name));
      if (!possible.length) return { status: 'unidentified' };
      // Retain same-name history too. A delayed earlier upload must not borrow
      // the source of a newly selected file with the same name.
      const alternatives = this.records.filter(record => record.root === root && record.state !== 'expired' && exact.has(record.name));
      if (alternatives.some(record => record.state === 'pending')) return { status: 'waiting' };
      if (alternatives.some(record => record.info?.status !== 'ok' || !record.info.url)) return { status: 'source-missing' };
      const urls = new Set(alternatives.map(record => record.info.url));
      if (urls.size !== 1) return { status: 'ambiguous' };
      // Duplicate names are safe only when ALL possible sources are identical.
      // This proves the source, not which duplicate upload finished first.
      return { status: 'matched', url: possible[0].info.url, record: possible[0],
        evidence: alternatives.length === 1 ? 'unique-exact-name' : 'source-equivalent',
        possibleIds: alternatives.map(record => record.id) };
    }
    commit(match) { if (match.status === 'matched') match.record.consumed = true; }
  }
  class Controller {
    constructor({ document = g.document, parse, sanitize, caption, anchor, existing, onStatus = () => {}, now } = {}) {
      this.doc = document; this.parse = parse; this.sanitize = sanitize; this.caption = caption;
      this.anchor = anchor; this.existing = existing; this.onStatus = onStatus;
      this.registry = new Registry({ now }); this.roots = new Set(); this.candidates = new Set();
      this.ignored = new WeakSet(); this.handled = new WeakSet(); this.imageIds = new WeakMap();
      this.mediaFailures = new WeakMap();
      this.proof = new WeakMap(); this.events = []; this.closed = false; this.pending = [];
      this.selected = 0; this.readyCount = 0; this.inserted = 0;
      this.observer = new g.MutationObserver(mutations => {
        this.discover();
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') this.observeImage(mutation.target);
          for (const node of mutation.addedNodes || []) {
            if (node.nodeType !== 1) continue;
            if (node.matches('img')) this.observeImage(node);
            for (const image of node.querySelectorAll('img')) this.observeImage(image);
          }
        }
        this.schedule();
      });
      this.discover();
      this.observer.observe(this.doc.body, { childList: true, subtree: true, attributes: true,
        attributeFilter: ['alt', 'title', 'src', 'data-original-name', 'data-filename'] });
    }
    trace(event) { this.events.push(event); if (this.events.length > 120) this.events.shift(); }
    discover() {
      const found = [...this.doc.querySelectorAll(ROOTS)];
      // Preserve the existing generic-editor fallback only when unambiguous.
      if (!found.length) found.push(...this.doc.querySelectorAll('[contenteditable="true"]'));
      for (const root of found) if (!this.roots.has(root)) {
        this.roots.add(root);
        for (const image of root.querySelectorAll('img')) this.ignored.add(image);
      }
    }
    rootFor(image) { return [...this.roots].find(root => root.isConnected && root.contains(image)); }
    observeImage(image) {
      if (!image.matches?.('img') || this.ignored.has(image) || this.handled.has(image)) return;
      const root = this.rootFor(image);
      if (!root || !this.registry.records.some(record => record.root === root && !record.consumed)) return;
      if (!this.imageIds.has(image)) {
        this.imageIds.set(image, id('i')); this.trace({ stage: 'editor-image-observed', image: this.imageIds.get(image) });
        image.addEventListener('load', () => { if (!this.closed) { this.mediaFailures.delete(image); this.schedule(); } });
        image.addEventListener('error', () => { if (!this.closed) { this.mediaFailures.set(image, image.getAttribute('src')); this.schedule(); } });
      }
      this.candidates.add(image);
    }
    async select(files, input) {
      this.discover();
      const roots = [...this.roots].filter(root => root.isConnected);
      const scope = input?.closest?.('.seditor,.note-editor,.editor');
      const scoped = scope ? roots.filter(root => root === scope || scope.contains(root)) : roots;
      const root = scoped.length === 1 ? scoped[0] : null;
      if (!root) { this.trace({ stage: 'editor-unavailable' }); this.onStatus({ state: 'editor-unavailable', selected: files.length }); return; }
      // Images which predate this selection are never given a newly selected
      // file's source. Previously observed in-flight candidates remain eligible.
      for (const image of root.querySelectorAll('img')) if (!this.candidates.has(image)) this.ignored.add(image);
      const records = this.registry.begin(files, root); this.selected += files.length;
      records.forEach(record => this.trace({ stage: 'file-selected', file: record.id, batch: record.batch, index: record.index }));
      if (!records.length) { this.report(); return; }
      // Metadata completion can vary independently of selection/upload order.
      let next = 0;
      const worker = async () => {
        while (!this.closed && next < records.length) {
          const index = next++, record = records[index]; let info;
          try { info = await this.parse(files[index]); } catch (_) { info = { status: 'error', reason: 'parse-failed' }; }
          if (this.closed) return;
          this.registry.ready(record, info); this.readyCount++;
          this.trace({ stage: 'metadata-ready', file: record.id, sourceAvailable: info?.status === 'ok' }); this.schedule();
        }
      };
      const task = Promise.all([worker(), worker()]); this.pending.push(task);
      try { await task; } finally { this.pending.splice(this.pending.indexOf(task), 1); this.schedule(); }
    }
    schedule() {
      if (this.scheduled || this.closed) return;
      this.scheduled = true; g.queueMicrotask(() => { this.scheduled = false; if (!this.closed) this.reconcile(); });
    }
    reconcile() {
      for (const image of [...this.candidates]) {
        const root = this.rootFor(image);
        if (!root || !image.isConnected) { this.candidates.delete(image); continue; }
        if (image.dataset.aruSourceCaptioned === '1' || this.existing(image)) { this.handled.add(image); this.candidates.delete(image); continue; }
        const match = this.registry.match([image.getAttribute('alt'), image.getAttribute('title'),
          image.getAttribute('data-original-name'), image.getAttribute('data-filename')], root);
        this.proof.set(image, match);
        if (match.status !== 'matched') continue;
        // src is never used to choose a file/source. It only distinguishes the
        // site's finished upload from a blob/data preview or failed decoding.
        let uploaded;
        try { uploaded = new URL(image.getAttribute('src') || '', this.doc.baseURI); } catch (_) {}
        if (!uploaded || uploaded.protocol !== 'https:' || !/^i[123]\.ruliweb\.com$/.test(uploaded.hostname)
            || uploaded.username || uploaded.password || uploaded.port) {
          this.proof.set(image, { status: 'upload-pending' }); continue;
        }
        if (this.mediaFailures.get(image) === image.getAttribute('src')) {
          this.proof.set(image, { status: 'media-error' }); continue;
        }
        if (!image.complete || image.naturalWidth === 0) {
          this.proof.set(image, { status: 'media-loading' }); continue;
        }
        const url = this.sanitize(match.url);
        if (!url) { this.proof.set(image, { status: 'source-rejected' }); continue; }
        const anchor = this.anchor(image);
        // A paragraph containing multiple images or user text is not a proven
        // caption anchor. Do not put one image's source after a whole mixed block.
        if (!anchor || (anchor !== image && (anchor.querySelectorAll('img').length !== 1 || anchor.textContent.trim()))) {
          this.proof.set(image, { status: 'mixed-anchor' }); continue;
        }
        try {
          anchor.after(this.caption(url));
          image.dataset.aruSourceCaptioned = '1'; this.handled.add(image);
          this.registry.commit(match); this.inserted++; this.candidates.delete(image);
          this.proof.set(image, match);
          this.trace({ stage: 'caption-inserted', image: this.imageIds.get(image), evidence: match.evidence, possibleFiles: match.possibleIds });
        } catch (_) { this.proof.set(image, { status: 'insert-failed' }); }
      }
      this.report();
    }
    snapshot() {
      const blocked = {};
      for (const image of this.candidates) {
        const state = this.proof.get(image)?.status || 'waiting'; blocked[state] = (blocked[state] || 0) + 1;
      }
      const order = [];
      for (const root of this.roots) if (root.isConnected) for (const image of root.querySelectorAll('img')) {
        const match = this.proof.get(image);
        if (this.imageIds.has(image)) order.push({ image: this.imageIds.get(image),
          selectionIndex: match?.evidence === 'unique-exact-name' ? match.record.index : null,
          batch: match?.evidence === 'unique-exact-name' ? match.record.batch : null, evidence: match?.evidence || null });
      }
      return { diagnostic: 'aru-upload-attribution-v1', state: this.registry.full ? 'capacity' : 'active', selected: this.selected, metadataReady: this.readyCount,
        captionsInserted: this.inserted, blocked, editorOrder: order, events: this.events.slice(),
        limits: 'Selection, metadata completion and DOM order only. No upload request/response capture, file names, source URLs, content, credentials or storage.' };
    }
    report() { const snapshot = this.snapshot(); this.onStatus(snapshot); }
    destroy() { this.closed = true; this.observer.disconnect(); this.candidates.clear(); this.roots.clear(); this.registry.records.length = 0; this.events.length = 0; }
  }
  g.AruSourceAttribution = Object.freeze({ Registry, Controller });
})(globalThis);
