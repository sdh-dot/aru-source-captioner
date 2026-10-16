// 개발자가 켠 경우에만 허용된 수치 집계를 유지하며 저장소·네트워크·개인 데이터를 사용하지 않는다.
export function createPerformanceMetrics({ environment = globalThis } = {}) {
  const g = environment;
  'use strict';
  const names = new Set(['upload.discover','upload.observer','upload.reconcile','upload.match','upload.snapshot',
    'metadata.parse','uploadUI.observer','uploadUI.discover','library.rebuild','library.search',
    'reader.cache','reader.network','cache.hit','cache.miss','search.hit','search.miss',
    'registry.records','upload.candidates','upload.roots','library.rows','library.cache']);
  const stats = new Map(), windowSize = 512;
  let enabled = false, generation = 0;
  const clock = () => g.performance.now();
  const row = name => { if (!stats.has(name)) stats.set(name, { count:0,total:0,max:0,active:0,peak:0,samples:[],cursor:0 }); return stats.get(name); };
  const valid = name => enabled && names.has(name);
  const api = {
    configure(options = {}) { enabled = options.enabled === true; generation++; for (const value of stats.values()) value.active = 0; },
    reset() { generation++; stats.clear(); },
    start(name) {
      if (!valid(name)) return;
      const value = row(name), started = clock(), epoch = generation; value.active++; value.peak = Math.max(value.peak,value.active);
      let finished = false;
      return () => {
        if (finished || epoch !== generation || !enabled) return; finished = true;
        const duration = Math.max(0,clock()-started); value.active--; value.count++; value.total+=duration; value.max=Math.max(value.max,duration);
        value.samples[value.cursor] = duration; value.cursor = (value.cursor+1)%windowSize;
      };
    },
    count(name) { if (valid(name)) row(name).count++; },
    gauge(name,number) { if (valid(name) && Number.isFinite(number) && number >= 0) { const value=row(name); value.current=number; value.peak=Math.max(value.peak,number); } },
    snapshot() {
      const metrics = {};
      for (const [name,value] of stats) {
        const sorted = value.samples.slice().sort((a,b)=>a-b), percentile = p => sorted.length ? sorted[Math.ceil(sorted.length*p)-1] : null;
        metrics[name] = { calls:value.count,totalMs:value.total,meanMs:value.count?value.total/value.count:0,maxMs:value.max,
          p50Ms:percentile(.5),p95Ms:percentile(.95),sampleCount:sorted.length,active:value.active,peak:value.peak,...(value.current===undefined?{}:{current:value.current}) };
      }
      return { enabled,windowSize,percentiles:'last 512 completed calls per metric; totals cover this reset interval',metrics };
    }
  };
  return Object.freeze(api);
}
