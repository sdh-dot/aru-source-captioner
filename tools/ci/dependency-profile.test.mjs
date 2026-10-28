import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, compareHistorical, writeJson } from './model.mjs';
import { execute } from './run-command.mjs';
import { dependencyFiles, referenceCommit, hashFile, gitBlob, assertDependencyProfiles, assertBaselineContract, assertApprovedDependencyDelta, parseReferenceInventory, assertSourceInventory, installedProfile, assertSharedInstallation, assertHistoricalEvidence } from './dependency-profile.mjs';

const profile = JSON.parse(fs.readFileSync(new URL('./dependency-profile.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
function temporary(t) {
  const parent = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent, 'aru-profile-test-'));
  t.after(() => { assert.equal(path.dirname(directory), parent); assert.ok(path.basename(directory).startsWith('aru-profile-test-')); fs.rmSync(directory, { recursive: true, force: true }); });
  return directory;
}
function copyProfile(directory) { for (const file of dependencyFiles) fs.copyFileSync(path.join(root, file), path.join(directory, file)); }
function original(file) {
  const result = spawnSync('git', ['show', referenceCommit + ':' + file], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0); return JSON.parse(result.stdout);
}
test('승인 profile은 고정 reference와 원본 baseline hash를 별도로 유지한다', () => {
  assert.equal(assertBaselineContract(baseline, profile, root).id, profile.id);
  assert.equal(baseline.referenceCommit, referenceCommit);
  assert.notEqual(baseline.lockfileSHA256, profile.lockfileSHA256);
  assert.equal(baseline.historical.failures.length, 96);
  assert.equal(baseline.firefoxWarnings.length, 9);
});
for (const [label, mutate] of [
  ['다른 profile', p => { p.lockfileSHA256 = '0'.repeat(64); }],
  ['다른 package', p => { p.packageJSONSHA256 = '0'.repeat(64); }],
  ['reference 변경', p => { p.referenceCommit = '0'.repeat(40); }],
  ['패치 버전 변경', p => { p.patches.vite[1] = '8.3.5'; }],
  ['profile 증적 누락', p => { delete p.id; }],
]) test('승인되지 않은 ' + label + '은 거절한다', () => {
  const changed = structuredClone(profile); mutate(changed);
  assert.throws(() => assertBaselineContract(baseline, changed, root));
});
test('baseline 원본 hash를 새 hash로 단순 갱신하면 거절한다', () => {
  assert.throws(() => assertBaselineContract({ ...baseline, lockfileSHA256: profile.lockfileSHA256 }, profile, root), /BASELINE_CONTRACT_DRIFT/);
});
test('reference/candidate의 서로 다른 lock 및 profile 누락을 거절한다', t => {
  const reference = temporary(t), candidate = temporary(t); copyProfile(reference); copyProfile(candidate);
  assert.equal(assertDependencyProfiles([reference, candidate], profile).lockfileSHA256, profile.lockfileSHA256);
  fs.appendFileSync(path.join(candidate, 'package-lock.json'), '\n');
  assert.throws(() => assertDependencyProfiles([reference, candidate], profile), /BASELINE_DEPENDENCY_DRIFT/);
  fs.rmSync(path.join(reference, 'package.json'));
  assert.throws(() => assertDependencyProfiles([reference, candidate], profile));
});
test('서로 다른 dependency profile은 실제 runner exit 1로 실패한다', t => {
  const candidate = temporary(t), output = temporary(t); copyProfile(candidate);
  fs.appendFileSync(path.join(candidate, 'package-lock.json'), '\n'); writeJson(path.join(output, 'run.json'), { runId: 'different-profile' });
  const module = new URL('./dependency-profile.mjs', import.meta.url).href, file = new URL('./dependency-profile.json', import.meta.url).href;
  const script = `import fs from 'node:fs';import {assertDependencyProfiles} from ${JSON.stringify(module)};assertDependencyProfiles(${JSON.stringify([root, candidate])},JSON.parse(fs.readFileSync(new URL(${JSON.stringify(file)}))));`;
  const result = execute('historical', 'node', ['--input-type=module', '-e', script], { output });
  assert.equal(result.status, 'FAIL'); assert.equal(result.exitCode, 1);
  assert.match(fs.readFileSync(path.join(output, 'steps/historical.log'), 'utf8'), /BASELINE_DEPENDENCY_DRIFT/);
});
test('제품 package 필드 변경과 승인 밖 전이 의존성 변경을 거절한다', () => {
  const op = original('package.json'), ol = original('package-lock.json');
  const ap = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))), al = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  assert.doesNotThrow(() => assertApprovedDependencyDelta(op, ol, ap, al));
  const productChange = structuredClone(ap); productChange.scripts.test = 'node -e ""';
  assert.throws(() => assertApprovedDependencyDelta(op, ol, productChange, al), /UNAPPROVED_DEPENDENCY_CHANGE/);
  const dependencyChange = structuredClone(al); dependencyChange.packages['node_modules/exifr'].version = '9.0.0';
  assert.throws(() => assertApprovedDependencyDelta(op, ol, ap, dependencyChange), /UNAPPROVED_DEPENDENCY_CHANGE/);
});
test('reference 원본 변조·파일 누락·추가 파일은 실제 blob 검사로 실패한다', t => {
  const directory = temporary(t), bytes = Buffer.from('unchanged product\n'), file = path.join(directory, 'product.js');
  fs.writeFileSync(file, bytes);
  const inventory = parseReferenceInventory('100644 blob ' + gitBlob(bytes) + '\tproduct.js\0');
  assert.equal(assertSourceInventory(directory, inventory).productSourceUnchanged, true);
  fs.writeFileSync(file, 'tampered'); assert.throws(() => assertSourceInventory(directory, inventory), /BASELINE_SOURCE_DRIFT/);
  fs.rmSync(file); assert.throws(() => assertSourceInventory(directory, inventory), /BASELINE_SOURCE_DRIFT/);
  fs.writeFileSync(file, bytes); fs.writeFileSync(path.join(directory, 'injected.js'), 'extra');
  assert.throws(() => assertSourceInventory(directory, inventory), /BASELINE_SOURCE_EXTRA/);
  assert.throws(() => parseReferenceInventory(''), /REFERENCE_INVENTORY_MISSING/);
});
test('profile 적용 후에도 dependency 외 reference 제품 변조를 거절한다', t => {
  const directory = temporary(t); copyProfile(directory); const file = path.join(directory, 'product.js'); fs.writeFileSync(file, 'original');
  const inventory = [...dependencyFiles.map(name => ({ path: name, blob: '0'.repeat(40) })), { path: 'product.js', blob: gitBlob(Buffer.from('original')) }];
  assert.doesNotThrow(() => assertSourceInventory(directory, inventory, { profiled: true }));
  fs.writeFileSync(file, 'tampered'); assert.throws(() => assertSourceInventory(directory, inventory, { profiled: true }), /BASELINE_SOURCE_DRIFT/);
});
test('고정 reference archive의 실제 파일 변조는 runner exit 1로 실패한다', t => {
  const parent = temporary(t), directory = path.join(parent, 'reference'), output = temporary(t); fs.mkdirSync(directory);
  const archive = path.join(parent, 'reference.tar');
  assert.equal(spawnSync('git', ['archive', referenceCommit, '--output=' + archive], { cwd: root }).status, 0);
  assert.equal(spawnSync('tar', ['-xf', archive, '-C', directory]).status, 0);
  const tree = spawnSync('git', ['ls-tree', '-rz', '--full-tree', referenceCommit], { cwd: root, encoding: 'utf8' });
  assert.equal(tree.status, 0); const inventory = parseReferenceInventory(tree.stdout);
  assert.doesNotThrow(() => assertSourceInventory(directory, inventory));
  fs.appendFileSync(path.join(directory, '.gitignore'), '\nTAMPERED_REFERENCE\n');
  const inventoryFile = path.join(parent, 'inventory.json'); writeJson(inventoryFile, inventory); writeJson(path.join(output, 'run.json'), { runId: 'tampered-reference' });
  const module = new URL('./dependency-profile.mjs', import.meta.url).href;
  const script = `import fs from 'node:fs';import {assertSourceInventory} from ${JSON.stringify(module)};assertSourceInventory(${JSON.stringify(directory)},JSON.parse(fs.readFileSync(${JSON.stringify(inventoryFile)})));`;
  const result = execute('historical', 'node', ['--input-type=module', '-e', script], { output });
  assert.equal(result.status, 'FAIL'); assert.equal(result.exitCode, 1);
  assert.match(fs.readFileSync(path.join(output, 'steps/historical.log'), 'utf8'), /BASELINE_SOURCE_DRIFT/);
});
test('실제 설치 버전·필수 설치 누락은 승인 lock과 다르면 실패한다', t => {
  const directory = temporary(t); copyProfile(directory);
  fs.mkdirSync(path.join(directory, 'node_modules')); writeJson(path.join(directory, 'node_modules/.package-lock.json'), { packages: {} });
  assert.throws(() => installedProfile(directory, profile), /INSTALLED_DEPENDENCY_MISSING/);
});
test('실행 중 node_modules 연결이 다른 설치로 바뀌면 실패한다', t => {
  const directory = temporary(t), first = temporary(t), second = temporary(t), link = path.join(directory, 'node_modules');
  fs.symlinkSync(first, link, process.platform === 'win32' ? 'junction' : 'dir');
  const installed = { directory: fs.realpathSync(first) };
  assert.doesNotThrow(() => assertSharedInstallation([directory], installed));
  fs.unlinkSync(link); fs.symlinkSync(second, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => assertSharedInstallation([directory], installed), /INSTALLED_PROFILE_NOT_SHARED/);
  fs.unlinkSync(link);
});
test('Historical 실행·integrity 증적과 현재 run identity 누락을 거절한다', t => {
  const directory = temporary(t);
  assert.throws(() => assertHistoricalEvidence(directory, profile, baseline, 'run'));
  writeJson(path.join(directory, 'historical-integrity.json'), { runId: 'stale' });
  assert.throws(() => assertHistoricalEvidence(directory, profile, baseline, 'run'), /HISTORICAL_INTEGRITY_EVIDENCE_MISSING/);
});
test('성공 comparison만 출력하고 실제 실행 증적을 생략하면 runner가 FAIL한다', t => {
  const directory = temporary(t); writeJson(path.join(directory, 'run.json'), { runId: 'evidence-test' });
  const file = path.join(directory, 'historical-comparison.json');
  const script = 'require("fs").writeFileSync(' + JSON.stringify(file) + ',JSON.stringify({status:"KNOWN_FAILURES"}))';
  assert.equal(execute('historical', 'node', ['-e', script], { output: directory }).status, 'FAIL');
});
test('신규 Historical 실패는 비교기와 실제 CI runner에서 모두 실패한다', t => {
  const directory = temporary(t); writeJson(path.join(directory, 'run.json'), { runId: 'new-failure-test' });
  const changed = structuredClone(baseline.historical); changed.failures.push('NEW_FAILURE'); changed.counts.failed++;
  assert.throws(() => compareHistorical(baseline.historical, changed, baseline.historical), /HISTORICAL_FAILURE_DRIFT/);
  const model = new URL('./model.mjs', import.meta.url).href;
  const baselineFile = new URL('./baseline.json', import.meta.url).href;
  const script = `import fs from 'node:fs';import {compareHistorical} from ${JSON.stringify(model)};const b=JSON.parse(fs.readFileSync(new URL(${JSON.stringify(baselineFile)})));const c=structuredClone(b.historical);c.failures.push('NEW_FAILURE');c.counts.failed++;compareHistorical(b.historical,c,b.historical);`;
  const result = execute('historical', 'node', ['--input-type=module', '-e', script], { output: directory });
  assert.equal(result.status, 'FAIL'); assert.equal(result.exitCode, 1);
  assert.match(fs.readFileSync(path.join(directory, 'steps/historical.log'), 'utf8'), /HISTORICAL_FAILURE_DRIFT/);
});
test('실제 설치 트리와 승인 profile은 버전 및 integrity가 일치한다', () => {
  const result = installedProfile(root, profile);
  assert.ok(result.verified.length > 0);
  assert.equal(hashFile(path.join(root, 'package-lock.json')), profile.lockfileSHA256);
});
