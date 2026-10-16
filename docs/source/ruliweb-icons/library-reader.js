// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/performance/metrics.mjs
  function createPerformanceMetrics({ environment = globalThis } = {}) {
    const g = environment;
    "use strict";
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
      if (!stats.has(name)) stats.set(name, { count: 0, total: 0, max: 0, active: 0, peak: 0, samples: [], cursor: 0 });
      return stats.get(name);
    }, "row");
    const valid = /* @__PURE__ */ __name((name) => enabled && names.has(name), "valid");
    const api = {
      configure(options = {}) {
        enabled = options.enabled === true;
        generation++;
        for (const value of stats.values()) value.active = 0;
      },
      reset() {
        generation++;
        stats.clear();
      },
      start(name) {
        if (!valid(name)) return;
        const value = row(name), started = clock(), epoch = generation;
        value.active++;
        value.peak = Math.max(value.peak, value.active);
        let finished = false;
        return () => {
          if (finished || epoch !== generation || !enabled) return;
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
        if (valid(name)) row(name).count++;
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
        return { enabled, windowSize, percentiles: "last 512 completed calls per metric; totals cover this reset interval", metrics };
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

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) scope[name] = resolvers[name]?.();
      else Object.defineProperty(scope, name, { enumerable: true, get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get") });
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/ruliweb-icons/library-reader.mjs
  function createIconsLibraryReader({ environment = globalThis, dependencies = {}, metrics = null } = {}) {
    const { browser } = environment;
    let icons2 = createModuleScope(dependencies.icons, ["SiteAdapter", "BrowserAdapter", "feature", "Metadata", "LibraryPackReader"], ["LibraryPackReader"]);
    const initializeIconsLibraryReader = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const A = icons2 = icons2 || {};
      const fail = /* @__PURE__ */ __name((code, message) => Object.assign(new Error(message), { code }), "fail");
      class LibraryPackReader {
        static {
          __name(this, "LibraryPackReader");
        }
        constructor({ site = A.SiteAdapter, browser: browser2 = A.BrowserAdapter, isActive = /* @__PURE__ */ __name(() => A.feature?.enabled === true, "isActive"), maxRequests = 256 } = {}) {
          Object.assign(this, { site, browser: browser2, isActive, maxRequests, requests: 0 });
        }
        check(signal) {
          if (signal?.aborted) throw fail("ABORTED", "검색 수집을 중지했습니다.");
          if (!this.isActive()) throw fail("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
        }
        args(ref, kind, source = ref.source || "direct") {
          return { boardId: String(ref.boardId), articleId: String(ref.articleId), catalogSource: source, packKind: kind, readerVersion: 2 };
        }
        async getCached(ref, { signal } = {}) {
          const finish = metrics?.start("reader.cache");
          try {
            this.check(signal);
            for (const source of ref.sources || [ref.source || "direct"]) for (const kind of ["BUNDLE", "NORMAL"]) {
              const cached = await this.browser.requestCache("get", this.args(ref, kind, source));
              this.check(signal);
              const pack = cached?.snapshot?.pack;
              if (pack?.icons?.length) {
                metrics?.count("cache.hit");
                return { pack, acquiredAt: cached.acquiredAt || 0, stale: cached.stale === true || pack.kind === "NORMAL" && pack.bodyCounts?.tagErrors > 0 || cached.snapshot?.sourceCheck?.status === "partial" || cached.snapshot?.sourceCheck?.states?.some((s) => s.metadataReadError || s.tagErrors || s.ambiguousMetadata) || pack.kind === "BUNDLE" && (pack.attributeReaderVersion !== 2 || pack.mediaReaderVersion !== 1) };
              }
            }
            metrics?.count("cache.miss");
            return null;
          } finally {
            finish?.();
          }
        }
        async invalidate(ref, { signal } = {}) {
          for (const source of ref.sources || [ref.source || "direct"]) for (const kind of ["NORMAL", "BUNDLE"]) {
            this.check(signal);
            await this.browser.requestCache("invalidate", this.args(ref, kind, source));
          }
        }
        async load(ref, { signal, forceRead = false } = {}) {
          const read = /* @__PURE__ */ __name(async (articleId, options = {}) => {
            this.check(signal);
            if (++this.requests > this.maxRequests) throw fail("REQUEST_LIMIT", "검색의 공개 글 조회 상한에 도달했습니다.");
            const finish = metrics?.start("reader.network");
            try {
              const doc2 = await this.site.getPublicDocument(articleId, { ...options, boardId: String(ref.boardId), signal, forceRead });
              this.check(signal);
              return doc2;
            } finally {
              finish?.();
            }
          }, "read");
          const doc = await read(ref.articleId), body = doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
          if (!body) throw fail("ARTICLE_UNAVAILABLE", "공개 본문을 읽을 수 없습니다.");
          const parsed = String(ref.boardId) === "98" ? await A.Metadata.parseDocument(body, { articleId: ref.articleId, boardId: 98 }) : { pack: null };
          this.check(signal);
          let pack = parsed.pack;
          if (pack && parsed.v1Slaves?.length) {
            const verification = await this.site.verifyReferences(parsed, { signal, readDocument: read });
            this.check(signal);
            if (verification.status !== "complete") throw fail("REFERENCE_UNAVAILABLE", "일부 원본 글을 확인하지 못했습니다.");
            pack = { ...pack, attributeReaderVersion: 2, mediaReaderVersion: 1 };
          }
          const observedTitle = doc.querySelector(".subject_text,.subject,.view_content h1")?.textContent?.trim().slice(0, 120);
          if (!pack) pack = this.site.readArticlePack(doc, ref.articleId, observedTitle || ref.title, String(ref.boardId)).pack;
          this.check(signal);
          if (!pack.icons?.length) throw fail("EMPTY_PACK", "읽을 수 있는 아이콘이 없습니다.");
          try {
            await this.browser.requestCache("put", { ...this.args(ref, pack.kind), snapshot: { pack }, rawMetadata: parsed.rawMetadata });
          } catch (error) {
            this.check(signal);
          }
          return { pack, stale: pack.kind === "NORMAL" && pack.bodyCounts?.tagErrors > 0 };
        }
      }
      A.LibraryPackReader = LibraryPackReader;
    }, "initializeIconsLibraryReader");
    initializeIconsLibraryReader(environment);
    return { "icons": selectModuleExports(icons2, ["LibraryPackReader"]) };
  }
  __name(createIconsLibraryReader, "createIconsLibraryReader");

  // docs/source/compat/ruliweb-icons-library-reader.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var result = createIconsLibraryReader({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: { icons: { "SiteAdapter": /* @__PURE__ */ __name(() => icons["SiteAdapter"], "SiteAdapter"), "BrowserAdapter": /* @__PURE__ */ __name(() => icons["BrowserAdapter"], "BrowserAdapter"), "feature": /* @__PURE__ */ __name(() => icons["feature"], "feature"), "Metadata": /* @__PURE__ */ __name(() => icons["Metadata"], "Metadata"), "LibraryPackReader": /* @__PURE__ */ __name(() => icons["LibraryPackReader"], "LibraryPackReader") } } });
  Object.assign(icons, result.icons);
})();
