'use strict';
// 얕은 checkout에서도 이전 알고리즘을 같은 바이트로 검증하도록 Git 객체 대신 동결한 원본을 읽는다.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const baseline=require('./fixtures/original-baseline.json');
assert.equal(baseline.commit,'4d871f702fb633722c09e0074e6fa0d9429c17f6');
for(const file of Object.values(baseline.files))assert.equal(crypto.createHash('sha256').update(file.source).digest('hex'),file.sha256);
exports.readBaseline=file=>{
  assert.ok(baseline.files[file],'등록하지 않은 baseline: '+file);
  return baseline.files[file].source;
};
