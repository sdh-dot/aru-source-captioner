// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/performance/metrics.mjs
  function createPerformanceMetrics({ environment = globalThis } = {}) {
    const g = environment;
    const names = /* @__PURE__ */ new Set([
      "upload.discover",
      "upload.observer",
      "upload.reconcile",
      "upload.match",
      "upload.snapshot",
      "metadata.parse",
      "uploadUI.observer",
      "uploadUI.discover",
      "library.rebuild",
      "library.search",
      "reader.cache",
      "reader.network",
      "cache.hit",
      "cache.miss",
      "search.hit",
      "search.miss",
      "registry.records",
      "upload.candidates",
      "upload.roots",
      "library.rows",
      "library.cache"
    ]);
    const stats = /* @__PURE__ */ new Map(), windowSize = 512;
    let enabled = false, generation = 0;
    const clock = /* @__PURE__ */ __name(() => g.performance.now(), "clock");
    const row = /* @__PURE__ */ __name((name) => {
      if (!stats.has(name)) {
        stats.set(name, {
          count: 0,
          total: 0,
          max: 0,
          active: 0,
          peak: 0,
          samples: [],
          cursor: 0
        });
      }
      return stats.get(name);
    }, "row");
    const valid = /* @__PURE__ */ __name((name) => enabled && names.has(name), "valid");
    const api = {
      configure(options = {}) {
        enabled = options.enabled === true;
        generation++;
        for (const value of stats.values()) {
          value.active = 0;
        }
      },
      reset() {
        generation++;
        stats.clear();
      },
      start(name) {
        if (!valid(name)) {
          return;
        }
        const value = row(name), started = clock(), epoch = generation;
        value.active++;
        value.peak = Math.max(value.peak, value.active);
        let finished = false;
        return () => {
          if (finished || epoch !== generation || !enabled) {
            return;
          }
          finished = true;
          const duration = Math.max(0, clock() - started);
          value.active--;
          value.count++;
          value.total += duration;
          value.max = Math.max(value.max, duration);
          value.samples[value.cursor] = duration;
          value.cursor = (value.cursor + 1) % windowSize;
        };
      },
      count(name) {
        if (valid(name)) {
          row(name).count++;
        }
      },
      gauge(name, number) {
        if (valid(name) && Number.isFinite(number) && number >= 0) {
          const value = row(name);
          value.current = number;
          value.peak = Math.max(value.peak, number);
        }
      },
      snapshot() {
        const metrics = {};
        for (const [name, value] of stats) {
          const sorted = value.samples.slice().sort((a, b) => a - b), percentile = /* @__PURE__ */ __name((p) => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null, "percentile");
          metrics[name] = {
            calls: value.count,
            totalMs: value.total,
            meanMs: value.count ? value.total / value.count : 0,
            maxMs: value.max,
            p50Ms: percentile(0.5),
            p95Ms: percentile(0.95),
            sampleCount: sorted.length,
            active: value.active,
            peak: value.peak,
            ...value.current === void 0 ? {} : { current: value.current }
          };
        }
        return {
          enabled,
          windowSize,
          percentiles: "last 512 completed calls per metric; totals cover this reset interval",
          metrics
        };
      }
    };
    return Object.freeze(api);
  }
  __name(createPerformanceMetrics, "createPerformanceMetrics");

  // docs/source/compat/performance-api.mjs
  function getLegacyPerformanceMetrics(environment = globalThis) {
    return environment.AruPerformance ||= createPerformanceMetrics({ environment });
  }
  __name(getLegacyPerformanceMetrics, "getLegacyPerformanceMetrics");

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) {
        scope[name] = resolvers[name]?.();
      } else {
        Object.defineProperty(scope, name, {
          enumerable: true,
          get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get")
        });
      }
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/upload-attribution/core.mjs
  function createAttributionCore({ environment = defaultEnvironment, dependencies = {}, metrics = null } = {}) {
    const { URL } = environment;
    let attribution2 = createModuleScope(dependencies.attribution, [], ["Registry", "Controller"]);
    const initializeAttributionCore = /* @__PURE__ */ __name(function(g) {
      "use strict";
      let sequence = 0;
      const id = /* @__PURE__ */ __name((prefix) => prefix + ++sequence, "id");
      const ROOTS = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
      class Registry {
        static {
          __name(this, "Registry");
        }
        constructor({ now = /* @__PURE__ */ __name(() => Date.now(), "now"), ttl = 5 * 60 * 1e3, limit = 512 } = {}) {
          this.now = now;
          this.ttl = ttl;
          this.limit = limit;
          this.records = [];
          this.blocked = /* @__PURE__ */ new Set();
          this.full = false;
          this.byRoot = /* @__PURE__ */ new Map();
          this.known = /* @__PURE__ */ new Set();
          this.nextExpiryAt = Infinity;
        }
        begin(files, root) {
          this.expire();
          const batch = id("b");
          if (this.records.length + files.length > this.limit) {
            this.full = true;
            return [];
          }
          const records = files.map((file, index) => ({
            id: id("f"),
            batch,
            index,
            name: String(file.name || ""),
            size: file.size,
            modified: file.lastModified,
            root,
            ordinal: this.records.length + index,
            created: this.now(),
            state: "pending",
            consumed: false,
            info: null
          }));
          this.records.push(...records);
          if (!this.byRoot.has(root)) {
            this.byRoot.set(root, /* @__PURE__ */ new Map());
          }
          const names = this.byRoot.get(root);
          for (const record of records) {
            this.known.add(record);
            this.nextExpiryAt = Math.min(this.nextExpiryAt, record.created + this.ttl);
            if (!names.has(record.name)) {
              names.set(record.name, []);
            }
            names.get(record.name).push(record);
          }
          return records;
        }
        ready(record, info) {
          if (this.known.has(record) && record.state !== "expired") {
            record.info = info || { status: "missing" };
            record.state = "ready";
          }
        }
        expire() {
          const now = this.now();
          if (now <= this.nextExpiryAt) {
            return;
          }
          this.nextExpiryAt = Infinity;
          for (const record of this.records) {
            if (!record.consumed && record.state !== "expired") {
              if (now - record.created > this.ttl) {
                record.state = "expired";
                this.blocked.add(record.name);
              } else {
                this.nextExpiryAt = Math.min(this.nextExpiryAt, record.created + this.ttl);
              }
            }
          }
        }
        match(names, root) {
          const finish = metrics?.start("upload.match");
          try {
            this.expire();
            const exact = new Set(names.filter((value) => typeof value === "string" && value.length));
            if (this.full) {
              return { status: "capacity" };
            }
            if ([...exact].some((name) => this.blocked.has(name))) {
              return { status: "expired" };
            }
            const namesIndex = this.byRoot.get(root);
            const alternatives = [...exact].flatMap((name) => namesIndex?.get(name) || []).filter((record) => record.state !== "expired").sort((a, b) => a.ordinal - b.ordinal);
            const possible = alternatives.filter((record) => !record.consumed);
            if (!possible.length) {
              return { status: "unidentified" };
            }
            if (alternatives.some((record) => record.state === "pending")) {
              return { status: "waiting" };
            }
            if (alternatives.some((record) => record.info?.status !== "ok" || !record.info.url)) {
              return { status: "source-missing" };
            }
            const urls = new Set(alternatives.map((record) => record.info.url));
            if (urls.size !== 1) {
              return { status: "ambiguous" };
            }
            return {
              status: "matched",
              url: possible[0].info.url,
              record: possible[0],
              evidence: alternatives.length === 1 ? "unique-exact-name" : "source-equivalent",
              possibleIds: alternatives.map((record) => record.id)
            };
          } finally {
            finish?.();
          }
        }
        commit(match) {
          if (match.status === "matched") {
            match.record.consumed = true;
          }
        }
        clear() {
          this.records.length = 0;
          this.byRoot.clear();
          this.known.clear();
          this.blocked.clear();
          this.nextExpiryAt = Infinity;
        }
      }
      class Controller {
        static {
          __name(this, "Controller");
        }
        constructor({ document = g.document, parse, sanitize, caption, anchor, existing, onStatus = /* @__PURE__ */ __name(() => {
        }, "onStatus"), now } = {}) {
          this.doc = document;
          this.parse = parse;
          this.sanitize = sanitize;
          this.caption = caption;
          this.anchor = anchor;
          this.existing = existing;
          this.onStatus = onStatus;
          this.registry = new Registry({ now });
          this.roots = /* @__PURE__ */ new Set();
          this.candidates = /* @__PURE__ */ new Set();
          this.ignored = /* @__PURE__ */ new WeakSet();
          this.handled = /* @__PURE__ */ new WeakSet();
          this.imageIds = /* @__PURE__ */ new WeakMap();
          this.mediaFailures = /* @__PURE__ */ new WeakMap();
          this.proof = /* @__PURE__ */ new WeakMap();
          this.events = [];
          this.closed = false;
          this.pending = [];
          this.parseQueue = [];
          this.parseActive = 0;
          this.parseJobs = /* @__PURE__ */ new WeakMap();
          this.activeJobs = /* @__PURE__ */ new Set();
          this.selected = 0;
          this.readyCount = 0;
          this.inserted = 0;
          this.imageListeners = new g.AbortController();
          this.rootObservers = /* @__PURE__ */ new Map();
          this.observer = new g.MutationObserver((mutations) => {
            metrics?.count("upload.observer");
            const changed = mutations.some((mutation) => {
              if (mutation.type === "attributes") {
                return this.roots.has(mutation.target) || mutation.target.getAttribute("contenteditable") === "true";
              }
              return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => node.nodeType === 1 && (node.getAttribute("contenteditable") === "true" || this.roots.has(node) || node.childElementCount > 0 && (node.querySelector('[contenteditable="true"]') || [...this.roots].some((root) => node.contains(root)))));
            });
            if (changed) {
              this.discover();
              this.schedule();
            }
          });
          this.discover();
          this.observer.observe(this.doc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["contenteditable", "class"]
          });
        }
        trace(event) {
          this.events.push(event);
          if (this.events.length > 120) {
            this.events.shift();
          }
        }
        discover() {
          const finish = metrics?.start("upload.discover");
          try {
            if (this.closed) {
              return;
            }
            const found = [...this.doc.querySelectorAll(ROOTS)];
            if (!found.length) {
              found.push(...this.doc.querySelectorAll('[contenteditable="true"]'));
            }
            for (const root of this.roots) {
              if (!found.includes(root)) {
                this.rootObservers.get(root)?.disconnect();
                this.rootObservers.delete(root);
                this.roots.delete(root);
              }
            }
            for (const root of found) {
              if (!this.roots.has(root)) {
                this.roots.add(root);
                for (const image of root.querySelectorAll("img")) {
                  this.ignored.add(image);
                }
                const observer = new g.MutationObserver((mutations) => {
                  metrics?.count("upload.observer");
                  let relevant = false;
                  for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                      this.observeImage(mutation.target);
                      relevant = true;
                    } else {
                      for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                          if (node.matches("img")) {
                            this.observeImage(node);
                            relevant = true;
                          }
                          for (const image of node.querySelectorAll("img")) {
                            this.observeImage(image);
                            relevant = true;
                          }
                        }
                      }
                      if (mutation.removedNodes.length && this.candidates.size) {
                        relevant = true;
                      }
                    }
                  }
                  if (relevant) {
                    this.schedule();
                  }
                });
                observer.observe(root, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: [
                    "alt",
                    "title",
                    "src",
                    "data-original-name",
                    "data-filename"
                  ]
                });
                this.rootObservers.set(root, observer);
              }
            }
          } finally {
            finish?.();
          }
        }
        rootFor(image) {
          return [...this.roots].find((root) => root.isConnected && root.contains(image));
        }
        observeImage(image) {
          if (!image.matches?.("img") || this.ignored.has(image) || this.handled.has(image)) {
            return;
          }
          const root = this.rootFor(image);
          if (!root || !this.registry.records.some((record) => record.root === root && !record.consumed)) {
            return;
          }
          if (!this.imageIds.has(image)) {
            this.imageIds.set(image, id("i"));
            this.trace({
              stage: "editor-image-observed",
              image: this.imageIds.get(image)
            });
            image.addEventListener("load", () => {
              if (!this.closed) {
                this.mediaFailures.delete(image);
                this.schedule();
              }
            }, { signal: this.imageListeners.signal });
            image.addEventListener("error", () => {
              if (!this.closed) {
                this.mediaFailures.set(image, image.getAttribute("src"));
                this.schedule();
              }
            }, { signal: this.imageListeners.signal });
          }
          this.candidates.add(image);
        }
        async select(files, input) {
          if (this.closed) {
            return;
          }
          this.discover();
          const roots = [...this.roots].filter((root2) => root2.isConnected);
          const scope = input?.closest?.(".seditor,.note-editor,.editor");
          const scoped = scope ? roots.filter((root2) => root2 === scope || scope.contains(root2)) : roots;
          const root = scoped.length === 1 ? scoped[0] : null;
          if (!root) {
            this.trace({ stage: "editor-unavailable" });
            this.onStatus({
              state: "editor-unavailable",
              selected: files.length
            });
            return;
          }
          for (const image of root.querySelectorAll("img")) {
            if (!this.candidates.has(image)) {
              this.ignored.add(image);
            }
          }
          const records = this.registry.begin(files, root);
          this.selected += files.length;
          records.forEach((record) => this.trace({
            stage: "file-selected",
            file: record.id,
            batch: record.batch,
            index: record.index
          }));
          if (!records.length) {
            this.report();
            return;
          }
          const task = Promise.all(records.map((record, index) => this.parseFile(files[index]).then((info) => {
            if (this.closed) {
              return;
            }
            this.registry.ready(record, info);
            this.readyCount++;
            this.trace({
              stage: "metadata-ready",
              file: record.id,
              sourceAvailable: info?.status === "ok"
            });
            this.schedule();
          })));
          this.pending.push(task);
          try {
            await task;
          } finally {
            const index = this.pending.indexOf(task);
            if (index >= 0) {
              this.pending.splice(index, 1);
            }
            this.schedule();
          }
        }
        parseFile(file) {
          if (this.closed) {
            return Promise.resolve({ status: "cancelled" });
          }
          const reusable = typeof g.File === "function" && file instanceof g.File;
          if (reusable && this.parseJobs.has(file)) {
            return this.parseJobs.get(file);
          }
          const promise = new Promise((resolve) => {
            this.parseQueue.push({ file, resolve });
            this.drainParsers();
          });
          if (reusable) {
            this.parseJobs.set(file, promise);
            promise.finally(() => this.parseJobs.delete(file));
          }
          return promise;
        }
        drainParsers() {
          while (!this.closed && this.parseActive < 2 && this.parseQueue.length) {
            const job = this.parseQueue.shift();
            this.parseActive++;
            this.activeJobs.add(job);
            const finish = metrics?.start("metadata.parse");
            Promise.resolve().then(() => this.closed ? { status: "cancelled" } : this.parse(job.file)).catch(() => ({ status: "error", reason: "parse-failed" })).then((info) => job.resolve(info)).finally(() => {
              finish?.();
              this.activeJobs.delete(job);
              this.parseActive--;
              this.drainParsers();
            });
          }
        }
        schedule() {
          if (this.scheduled || this.closed) {
            return;
          }
          this.scheduled = true;
          g.queueMicrotask(() => {
            this.scheduled = false;
            if (!this.closed) {
              this.reconcile();
            }
          });
        }
        reconcile() {
          const finish = metrics?.start("upload.reconcile");
          try {
            for (const image of [...this.candidates]) {
              const root = this.rootFor(image);
              if (!root || !image.isConnected) {
                this.candidates.delete(image);
                continue;
              }
              if (image.dataset.aruSourceCaptioned === "1" || this.existing(image)) {
                this.handled.add(image);
                this.candidates.delete(image);
                continue;
              }
              const match = this.registry.match([
                image.getAttribute("alt"),
                image.getAttribute("title"),
                image.getAttribute("data-original-name"),
                image.getAttribute("data-filename")
              ], root);
              this.proof.set(image, match);
              if (match.status !== "matched") {
                continue;
              }
              let uploaded;
              try {
                uploaded = new URL(image.getAttribute("src") || "", this.doc.baseURI);
              } catch (_) {
              }
              if (!uploaded || uploaded.protocol !== "https:" || !/^i[123]\.ruliweb\.com$/.test(uploaded.hostname) || uploaded.username || uploaded.password || uploaded.port) {
                this.proof.set(image, { status: "upload-pending" });
                continue;
              }
              if (this.mediaFailures.get(image) === image.getAttribute("src")) {
                this.proof.set(image, { status: "media-error" });
                continue;
              }
              if (!image.complete || image.naturalWidth === 0) {
                this.proof.set(image, { status: "media-loading" });
                continue;
              }
              const url = this.sanitize(match.url);
              if (!url) {
                this.proof.set(image, { status: "source-rejected" });
                continue;
              }
              const anchor = this.anchor(image);
              if (!anchor || anchor !== image && (anchor.querySelectorAll("img").length !== 1 || anchor.textContent.trim())) {
                this.proof.set(image, { status: "mixed-anchor" });
                continue;
              }
              try {
                anchor.after(this.caption(url));
                image.dataset.aruSourceCaptioned = "1";
                this.handled.add(image);
                this.registry.commit(match);
                this.inserted++;
                this.candidates.delete(image);
                this.proof.set(image, match);
                this.trace({
                  stage: "caption-inserted",
                  image: this.imageIds.get(image),
                  evidence: match.evidence,
                  possibleFiles: match.possibleIds
                });
              } catch (_) {
                this.proof.set(image, { status: "insert-failed" });
              }
            }
            this.report();
          } finally {
            finish?.();
          }
        }
        snapshot() {
          const finish = metrics?.start("upload.snapshot");
          try {
            const blocked = {};
            for (const image of this.candidates) {
              const state = this.proof.get(image)?.status || "waiting";
              blocked[state] = (blocked[state] || 0) + 1;
            }
            const order = [];
            for (const root of this.roots) {
              if (root.isConnected) {
                for (const image of root.querySelectorAll("img")) {
                  const match = this.proof.get(image);
                  if (this.imageIds.has(image)) {
                    order.push({
                      image: this.imageIds.get(image),
                      selectionIndex: match?.evidence === "unique-exact-name" ? match.record.index : null,
                      batch: match?.evidence === "unique-exact-name" ? match.record.batch : null,
                      evidence: match?.evidence || null
                    });
                  }
                }
              }
            }
            return {
              diagnostic: "aru-upload-attribution-v1",
              state: this.registry.full ? "capacity" : "active",
              selected: this.selected,
              metadataReady: this.readyCount,
              captionsInserted: this.inserted,
              blocked,
              editorOrder: order,
              events: this.events.slice(),
              limits: "Selection, metadata completion and DOM order only. No upload request/response capture, file names, source URLs, content, credentials or storage."
            };
          } finally {
            finish?.();
          }
        }
        report() {
          metrics?.gauge("registry.records", this.registry.records.length);
          metrics?.gauge("upload.candidates", this.candidates.size);
          metrics?.gauge("upload.roots", this.roots.size);
          const snapshot = this.snapshot();
          this.onStatus(snapshot);
        }
        destroy() {
          this.closed = true;
          this.observer.disconnect();
          this.imageListeners.abort();
          for (const observer of this.rootObservers.values()) {
            observer.disconnect();
          }
          this.rootObservers.clear();
          this.candidates.clear();
          this.roots.clear();
          this.registry.clear();
          this.events.length = 0;
          this.parseJobs = /* @__PURE__ */ new WeakMap();
          for (const job of this.parseQueue.splice(0)) {
            job.resolve({ status: "cancelled" });
          }
          for (const job of this.activeJobs) {
            job.resolve({ status: "cancelled" });
          }
          this.activeJobs.clear();
        }
      }
      attribution2 = Object.freeze({ Registry, Controller });
    }, "initializeAttributionCore");
    initializeAttributionCore(environment);
    return {
      attribution: selectModuleExports(attribution2, ["Registry", "Controller"])
    };
  }
  __name(createAttributionCore, "createAttributionCore");

  // docs/source/compat/upload-attribution-core.mjs
  var attribution = globalThis.AruSourceAttribution = globalThis.AruSourceAttribution || {};
  var result = createAttributionCore({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: { attribution: {} } });
  Object.assign(attribution, result.attribution);
})();
