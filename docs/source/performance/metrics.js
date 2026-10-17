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

  // docs/source/compat/performance-metrics.mjs
  getLegacyPerformanceMetrics();
})();
