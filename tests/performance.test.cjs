'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'../docs/source/performance/metrics.js');
const {readBaseline}=require('./integration/baseline.cjs');
test('numeric performance instrumentation defaults OFF, has no clock/storage/network work and bounds samples',()=>{
 let time=0,reads=0;const context=vm.createContext({performance:{now:()=>{reads++;return time++;}}});vm.runInContext(fs.readFileSync(file,'utf8'),context);const p=context.AruPerformance;
 assert.equal(p.start('upload.match'),undefined);p.count('cache.hit');assert.equal(reads,0);assert.equal(Object.keys(p.snapshot().metrics).length,0);
 p.configure({enabled:true});p.count('private-filename-token');p.gauge('registry.records',NaN);
 for(let i=0;i<600;i++){const done=p.start('upload.match');done();done();}
 const s=p.snapshot();assert.equal(s.metrics['upload.match'].calls,600);assert.equal(s.metrics['upload.match'].sampleCount,512);assert.equal(s.metrics['upload.match'].meanMs,1);assert.equal(s.metrics['upload.match'].active,0);assert.equal(Object.keys(s.metrics).length,1);
 const stale=p.start('metadata.parse');p.reset();stale();assert.equal(Object.keys(p.snapshot().metrics).length,0);
 const stopped=p.start('reader.network');p.configure({enabled:false});stopped();assert.equal(p.snapshot().metrics['reader.network'].active,0);
 const before=context.AruPerformance;vm.runInContext(fs.readFileSync(file,'utf8'),context);assert.equal(context.AruPerformance,before);
 assert.ok(!JSON.stringify(s).includes('private-filename-token'));
});
test('performance injection preserves permissions, browser IDs, routes, execution worlds and current development versions',()=>{
 const root=path.resolve(__dirname,'..');
 for(const browser of ['firefox','whale']){
  const before=JSON.parse(readBaseline(browser+'/manifest.json')),after=JSON.parse(fs.readFileSync(path.join(root,browser,'manifest.json')));
  after.content_scripts.forEach(s=>s.js=s.js.filter(f=>f!=='features/performance/metrics.js'));
  assert.deepEqual(after,before);
 }
});
