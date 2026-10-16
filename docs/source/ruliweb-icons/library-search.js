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

  // docs/source/ruliweb-icons/library-search.mjs
  function createIconsLibrarySearch({ environment = globalThis, dependencies = {}, metrics = null } = {}) {
    const { AbortController } = environment;
    let icons2 = createModuleScope(dependencies.icons, ["normalize", "CatalogSources", "queryTokens", "LibrarySearchEngine", "libraryIconIdentity", "libraryFixedTags"], ["LibrarySearchEngine", "libraryIconIdentity", "libraryFixedTags"]);
    const initializeIconsLibrarySearch = /* @__PURE__ */ __name(function(g) {
      "use strict";
      const A = icons2 = icons2 || {}, norm = /* @__PURE__ */ __name((value) => A.normalize(value), "norm"), key = /* @__PURE__ */ __name((ref) => String(ref.boardId) + ":" + ref.articleId, "key");
      const abort = /* @__PURE__ */ __name(() => Object.assign(new Error("검색 수집을 중지했습니다."), { code: "ABORTED" }), "abort");
      function identity(icon, ref) {
        const article = icon.origin?.articleId || ref.articleId, board = String(ref.boardId);
        return JSON.stringify(icon.imageMetadata?.id ? [board, article, "metadata", icon.imageMetadata.id] : [board, article, "occurrence", icon.origin?.originalIndex ?? icon.ref?.index ?? icon.id, icon.url]);
      }
      __name(identity, "identity");
      function tags(icon, dictionary, normalize) {
        return [...new Set([...icon.imageMetadata?.tags || [], ...(icon.tagIds || []).map((id) => dictionary.get(id)).filter(Boolean)].filter((tag) => typeof tag === "string").map(normalize).filter(Boolean))];
      }
      __name(tags, "tags");
      class LibrarySearchEngine {
        static {
          __name(this, "LibrarySearchEngine");
        }
        constructor({ reader = null, concurrency = 2, maxPacks = 200 } = {}) {
          this.reader = reader;
          this.concurrency = Math.max(1, Math.min(2, concurrency));
          this.maxPacks = Math.min(200, Math.max(1, maxPacks));
          this.entries = /* @__PURE__ */ new Map();
          this.packs = /* @__PURE__ */ new Map();
          this.rows = [];
          this.cache = /* @__PURE__ */ new Map();
          this.revision = 0;
          this.closed = false;
          this.state = { scope: "current", currentKey: null, query: "", textMatch: "all", selectedTags: [], tagMatch: "any" };
          this.progress = { status: "idle", total: 0, cached: 0, loaded: 0, failed: 0, errors: [] };
        }
        setEntries(entries) {
          const next = /* @__PURE__ */ new Map();
          for (const raw of entries) {
            try {
              const ref = A.CatalogSources.parseRef(raw.url || String(raw.articleId), String(raw.boardId || "98")), id = key(ref);
              if (!next.has(id) && next.size >= this.maxPacks) continue;
              const old = next.get(id);
              next.set(id, { ...ref, title: String(raw.title || raw.name || ""), source: raw.source || "direct", sources: [.../* @__PURE__ */ new Set([...old?.sources || [], ...raw.sources || [], raw.source || "direct"])] });
            } catch (_) {
            }
          }
          if (JSON.stringify([...next.keys()]) !== JSON.stringify([...this.entries.keys()])) this.cancel();
          this.entries = next;
          for (const id of this.packs.keys()) if (!next.has(id)) this.packs.delete(id);
          this.rebuild();
        }
        remember(ref, pack, { acquiredAt = Date.now(), stale = false } = {}) {
          if (this.closed) return;
          const id = key(ref);
          if (!this.entries.has(id)) {
            if (this.entries.size >= this.maxPacks) return;
            this.entries.set(id, { ...ref, title: pack.name || pack.title || "", sources: [ref.source || "direct"] });
          }
          this.packs.set(id, { pack, acquiredAt, stale });
          this.rebuild();
        }
        rebuild() {
          const finish = metrics?.start("library.rebuild");
          try {
            const rows = /* @__PURE__ */ new Map(), normalized = /* @__PURE__ */ new Map();
            let order = 0;
            const normalize = /* @__PURE__ */ __name((value) => {
              if (!normalized.has(value)) normalized.set(value, norm(value));
              return normalized.get(value);
            }, "normalize");
            for (const [id, ref] of this.entries) {
              const stored = this.packs.get(id);
              if (!stored) continue;
              const dictionary = /* @__PURE__ */ new Map(), displayDictionary = /* @__PURE__ */ new Map();
              for (const tag of stored.pack.tags || []) {
                dictionary.set(tag.id, tag.name);
                if (!displayDictionary.has(tag.id)) displayDictionary.set(tag.id, tag.name);
              }
              const baseTitles = [ref.title, stored.pack.name, stored.pack.title].filter((x) => typeof x === "string" && x.trim()).map(normalize), sourceTitles = /* @__PURE__ */ new Map();
              const sourceTitle = /* @__PURE__ */ __name((icon) => {
                const article = icon.origin?.articleId;
                if (!sourceTitles.has(article)) sourceTitles.set(article, /* @__PURE__ */ new Map());
                const bySource = sourceTitles.get(article);
                if (!bySource.has(icon.sourceId)) bySource.set(icon.sourceId, (stored.pack.sources || []).find((s) => s.articleId && s.articleId === article || s.sourceId === icon.sourceId)?.title);
                return bySource.get(icon.sourceId);
              }, "sourceTitle");
              const displayTags = /* @__PURE__ */ __name((icon) => [.../* @__PURE__ */ new Set([...icon.imageMetadata?.tags || [], ...(icon.tagIds || []).map((id2) => displayDictionary.get(id2)).filter(Boolean)])], "displayTags");
              for (const [position, icon] of (stored.pack.icons || []).entries()) {
                const token = identity(icon, ref), source = sourceTitle(icon), titles = baseTitles.concat(typeof source === "string" && source.trim() ? [normalize(source)] : []);
                const membership = { packKey: id, title: ref.title, position, kind: stored.pack.kind, sources: [...ref.sources || [ref.source || "direct"]], titles };
                const existing = rows.get(token);
                if (existing) {
                  if (!existing.memberships.some((m) => m.packKey === id)) existing.memberships.push(membership);
                  if (stored.acquiredAt > existing.acquiredAt) {
                    existing.icon = icon;
                    existing.tags = tags(icon, dictionary, normalize);
                    existing.tagLabels = displayTags(icon);
                    existing.acquiredAt = stored.acquiredAt;
                  }
                } else rows.set(token, { identity: token, icon, tags: tags(icon, dictionary, normalize), tagLabels: displayTags(icon), memberships: [membership], order: order++, acquiredAt: stored.acquiredAt });
              }
            }
            this.rows = [...rows.values()];
            this.cache.clear();
            metrics?.gauge("library.rows", this.rows.length);
          } finally {
            finish?.();
          }
        }
        setState(state = {}) {
          const next = { ...this.state, ...state };
          next.query = String(next.query || "");
          next.scope = next.scope === "all" ? "all" : "current";
          next.textMatch = next.textMatch === "any" ? "any" : "all";
          next.tagMatch = next.tagMatch === "all" ? "all" : "any";
          next.selectedTags = [...new Set((next.selectedTags || []).map(norm))];
          if (["query", "scope", "currentKey", "textMatch"].some((k) => next[k] !== this.state[k])) this.cancel();
          this.state = next;
          return this.search();
        }
        search() {
          const finish = metrics?.start("library.search");
          try {
            const state = this.state, cacheKey = JSON.stringify(state);
            if (this.cache.has(cacheKey)) {
              metrics?.count("search.hit");
              return this.cache.get(cacheKey);
            }
            metrics?.count("search.miss");
            const terms = A.queryTokens(state.query), items = [];
            for (const row of this.rows) {
              const memberships = row.memberships.filter((m) => state.scope === "all" || m.packKey === state.currentKey);
              if (!memberships.length) continue;
              if (state.selectedTags.length) {
                const matched = state.selectedTags.map((tag) => row.tags.includes(tag));
                if (!(state.tagMatch === "all" ? matched.every(Boolean) : matched.some(Boolean))) continue;
              }
              const titles = memberships.flatMap((m) => m.titles), scores = terms.map((term) => row.tags.includes(term) ? 8 : row.tags.some((tag) => tag.includes(term)) ? 4 : titles.some((title) => title === term) ? 2 : titles.some((title) => title.includes(term)) ? 1 : 0);
              if (terms.length && !(state.textMatch === "all" ? scores.every(Boolean) : scores.some(Boolean))) continue;
              items.push({ ...row, memberships, order: state.scope === "current" ? memberships[0].position : row.order, score: scores.reduce((a, b) => a + b, 0) });
            }
            items.sort((a, b) => (terms.length ? b.score - a.score : 0) || a.order - b.order);
            const scopedKeys = [...this.entries.keys()].filter((id) => state.scope === "all" || id === state.currentKey);
            const partial = scopedKeys.some((id) => !this.packs.has(id) || this.packs.get(id).stale) || this.progress.errors.some((error) => scopedKeys.includes(error.packKey));
            const result2 = { items, count: items.length, scope: state.scope, partial, progress: { ...this.progress }, registered: this.entries.size, indexed: this.packs.size, scopedRegistered: scopedKeys.length, scopedIndexed: scopedKeys.filter((id) => this.packs.has(id)).length };
            if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value);
            this.cache.set(cacheKey, result2);
            metrics?.gauge("library.cache", this.cache.size);
            return result2;
          } finally {
            finish?.();
          }
        }
        cancel() {
          this.revision++;
          this.controller?.abort();
          this.controller = null;
          if (this.progress.status === "loading") {
            this.progress = { ...this.progress, status: "cancelled" };
            this.cache.clear();
          }
        }
        async collect({ refresh = false, onProgress = /* @__PURE__ */ __name(() => {
        }, "onProgress") } = {}) {
          this.cancel();
          if (this.closed || !this.reader) return this.search();
          const controller = new AbortController();
          this.controller = controller;
          const revision = this.revision, signal = controller.signal;
          const refs = [...this.entries].filter(([id]) => this.state.scope === "all" || id === this.state.currentKey);
          this.progress = { status: "loading", total: refs.length, cached: 0, loaded: 0, failed: 0, errors: [] };
          this.cache.clear();
          const ensure = /* @__PURE__ */ __name(() => {
            if (this.closed || signal.aborted || revision !== this.revision) throw abort();
          }, "ensure");
          const emit = /* @__PURE__ */ __name(() => {
            ensure();
            this.cache.clear();
            onProgress(this.search());
          }, "emit");
          const parallel = /* @__PURE__ */ __name(async (rows, action) => {
            let cursor = 0;
            const worker = /* @__PURE__ */ __name(async () => {
              while (cursor < rows.length) {
                ensure();
                await action(rows[cursor++]);
              }
            }, "worker");
            await Promise.all(Array.from({ length: Math.min(this.concurrency, rows.length) }, worker));
          }, "parallel");
          try {
            if (!refresh) await parallel(refs, async ([id, ref]) => {
              let cached;
              try {
                cached = await this.reader.getCached(ref, { signal });
              } catch (error) {
                if (error.code === "ABORTED" || signal.aborted) throw abort();
              }
              ensure();
              if (cached?.pack) {
                if (!this.packs.has(id) || cached.acquiredAt > this.packs.get(id).acquiredAt) this.remember(ref, cached.pack, cached);
                this.progress.cached++;
                emit();
              }
            });
            const pending = refs.filter(([id]) => refresh || !this.packs.has(id) || this.packs.get(id).stale);
            await parallel(pending, async ([id, ref]) => {
              try {
                ensure();
                if (refresh) await this.reader.invalidate(ref, { signal });
                ensure();
                const loaded = await this.reader.load(ref, { signal, forceRead: refresh });
                ensure();
                this.remember(ref, loaded.pack || loaded, { acquiredAt: Date.now(), stale: loaded.stale === true });
                this.progress.loaded++;
                emit();
              } catch (error) {
                if (error.code === "ABORTED" || signal.aborted) throw abort();
                ensure();
                this.progress.failed++;
                this.progress.errors.push({ packKey: id, code: error.code || "READ_FAILED" });
                emit();
              }
            });
            ensure();
            this.progress.status = this.progress.failed || refs.some(([id]) => this.packs.get(id)?.stale) ? "partial" : "complete";
            emit();
            return this.search();
          } catch (error) {
            if (error.code !== "ABORTED") throw error;
            if (revision === this.revision) {
              this.progress.status = "cancelled";
              this.cache.clear();
            }
            return { cancelled: true };
          } finally {
            if (this.controller === controller) this.controller = null;
          }
        }
        destroy() {
          this.closed = true;
          this.cancel();
          this.entries.clear();
          this.packs.clear();
          this.rows = [];
          this.cache.clear();
        }
      }
      A.LibrarySearchEngine = LibrarySearchEngine;
      A.libraryIconIdentity = identity;
      A.libraryFixedTags = Object.freeze(["인사", "사과", "축하", "응원", "감사", "미소", "도발", "조토피아", "매도", "분노", "슬픔", "당황", "놀람"]);
    }, "initializeIconsLibrarySearch");
    initializeIconsLibrarySearch(environment);
    return { "icons": selectModuleExports(icons2, ["LibrarySearchEngine", "libraryIconIdentity", "libraryFixedTags"]) };
  }
  __name(createIconsLibrarySearch, "createIconsLibrarySearch");

  // docs/source/compat/ruliweb-icons-library-search.mjs
  var icons = globalThis.AruIcons = globalThis.AruIcons || {};
  var result = createIconsLibrarySearch({ environment: globalThis, metrics: getLegacyPerformanceMetrics(), dependencies: { icons: { "normalize": /* @__PURE__ */ __name(() => icons["normalize"], "normalize"), "CatalogSources": /* @__PURE__ */ __name(() => icons["CatalogSources"], "CatalogSources"), "queryTokens": /* @__PURE__ */ __name(() => icons["queryTokens"], "queryTokens"), "LibrarySearchEngine": /* @__PURE__ */ __name(() => icons["LibrarySearchEngine"], "LibrarySearchEngine"), "libraryIconIdentity": /* @__PURE__ */ __name(() => icons["libraryIconIdentity"], "libraryIconIdentity"), "libraryFixedTags": /* @__PURE__ */ __name(() => icons["libraryFixedTags"], "libraryFixedTags") } } });
  Object.assign(icons, result.icons);
})();
