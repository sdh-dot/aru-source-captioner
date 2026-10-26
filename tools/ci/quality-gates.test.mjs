import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, gates, compareHistorical, compareFirefox, warningKeys, assertExecuted, readTests, writeJson } from './model.mjs';
import { execute } from './run-command.mjs';
import { summarize } from './report.mjs';
import { checkGenerated } from './check-generated.mjs';

const baseline = JSON.parse(fs.readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
function temporary(t) {
  const parent = fs.realpathSync(os.tmpdir()), directory = fs.mkdtempSync(path.join(parent, 'aru-ci-test-'));
  t.after(() => { assert.equal(path.dirname(directory), parent); assert.ok(path.basename(directory).startsWith('aru-ci-test-')); fs.rmSync(directory, { recursive: true, force: true }); });
  return directory;
}
const validText = (tests = 60) => ['tests ' + tests, 'pass ' + tests, 'fail 0', 'cancelled 0', 'skipped 0', 'todo 0'].map(line => 'ℹ ' + line).join('\n');
test('Historical 원시 FAIL과 기준선 비교 통과를 구분한다', () => {
  const result = compareHistorical(baseline.historical, baseline.historical, baseline.historical);
  assert.equal(result.status, 'KNOWN_FAILURES'); assert.equal(result.rawSuiteStatus, 'FAIL'); assert.equal(result.rawExitCode, 1);
  assert.equal(result.existingFailures, 94); assert.equal(result.unavailableLegacyContext, 2);
  assert.equal(baseline.unavailableLegacyContext.length, 2); assert.equal(baseline.historical.failures.length, 96);
});
for (const [label, mutate] of [
  ['같은 개수의 다른 실패', value => { value.failures[0] = 'NEW_FAILURE'; }],
  ['신규 실패', value => { value.failures.push('NEW_FAILURE'); value.counts.failed++; }],
  ['기존 실패 제거', value => { value.failures.pop(); value.counts.failed--; }],
  ['기존 검사 누락', value => { value.identities.pop(); }],
  ['전체 검사수 감소', value => { value.counts.tests--; }],
  ['skip', value => { value.counts.skipped++; }],
  ['cancelled', value => { value.counts.cancelled++; }],
  ['todo', value => { value.counts.todo++; }],
  ['raw exit 성공 위장', value => { value.exitCode = 0; }],
  ['실패수 불일치', value => { value.counts.failed--; }],
]) test('Historical ' + label + '는 실패한다', () => {
  const candidate = clone(baseline.historical); mutate(candidate);
  assert.throws(() => compareHistorical(baseline.historical, candidate, baseline.historical));
});
test('고정 reference의 새 환경 실패도 자동 기준선으로 수용하지 않는다', () => {
  const reference = clone(baseline.historical); reference.failures[0] = 'ENVIRONMENT_DRIFT';
  assert.throws(() => compareHistorical(reference, reference, baseline.historical), /REFERENCE_DRIFT/);
});
test('기존 검사를 모두 보존한 신규 정상 검사는 허용한다', () => {
  const candidate = clone(baseline.historical); candidate.counts.tests++; candidate.counts.passed++; candidate.identities.push('NEW_PASS');
  assert.equal(compareHistorical(baseline.historical, candidate, baseline.historical).newFailures, 0);
});
test('테스트 summary 부재·중복·가짜 개수는 거절한다', () => {
  assert.throws(() => readTests('', root, 0));
  const counts = { tests: 1, passed: 1, failed: 0, skipped: 0, cancelled: 0, todo: 0 };
  const summary = '@@ARU_TEST@@' + JSON.stringify({ type: 'test:summary', counts });
  assert.throws(() => readTests(summary, root, 0));
  assert.throws(() => readTests(summary + '\n' + summary, root, 0));
  const result = readTests('@@ARU_TEST@@' + JSON.stringify({ type: 'test:pass', name: 'real', file: path.join(root, 'test.cjs'), nesting: 0 }) + '\n' + summary, root, 0);
  assert.ok(result.identities[0].includes('<ROOT>/test.cjs'));
});
const warnings = baseline.firefoxWarnings.map(value => JSON.parse(value));
test('기존 Firefox 경고 9개는 숨기지 않고 KNOWN_WARNINGS로 표시한다', () => {
  assert.equal(compareFirefox({ errors: [], warnings: [...warnings].reverse() }, 0, baseline.firefoxWarnings).warnings, 9);
});
for (const [label, change] of [
  ['신규 오류', value => { value.errors.push({ code: 'ERROR' }); }],
  ['신규 경고', value => { value.warnings.push({ code: 'NEW' }); }],
  ['같은 개수의 다른 경고', value => { value.warnings[0].code = 'NEW'; }],
  ['기존 경고 제거', value => { value.warnings.pop(); }],
  ['위치 drift', value => { value.warnings[0].line++; }],
]) test('Firefox ' + label + '는 실패한다', () => {
  const result = { errors: [], warnings: clone(warnings) }; change(result);
  assert.throws(() => compareFirefox(result, 0, baseline.firefoxWarnings));
});
test('Firefox 비정상 exit·누락 결과는 실패한다', () => {
  assert.throws(() => compareFirefox({ errors: [], warnings }, 1, baseline.firefoxWarnings));
  assert.throws(() => compareFirefox({}, 0, baseline.firefoxWarnings));
  assert.equal(warningKeys(warnings).length, 9);
});
test('필수 테스트의 실행수·실패·skip을 확인한다', () => {
  assert.equal(assertExecuted(validText(), 60).tests, 60);
  for (const value of ['', validText(0), validText(59), validText().replace('fail 0', 'fail 1'), validText().replace('skipped 0', 'skipped 1')]) assert.throws(() => assertExecuted(value, 60));
});
test('명령 실패 exit와 summary 없는 성공을 실제 runner가 실패로 전달한다', t => {
  const output = temporary(t); writeJson(path.join(output, 'run.json'), { runId: 'test-run' });
  assert.equal(execute('typecheck', 'node', ['-e', 'process.exit(7)'], { output }).status, 'FAIL');
  assert.equal(execute('typescript', 'node', ['-e', 'process.stdout.write("not a test")'], { output }).status, 'FAIL');
  assert.equal(execute('typescript', 'node', ['-e', 'process.stdout.write(' + JSON.stringify(validText()) + ')'], { output }).status, 'PASS');
  assert.throws(() => execute('not-a-gate', 'node', []));
});
test('집계는 미실행·이전 run·비정상 status를 통과로 오인하지 않는다', t => {
  const directory = temporary(t); writeJson(path.join(directory, 'run.json'), { runId: 'current' });
  assert.equal(summarize(directory).status, 'FAIL');
  for (const gate of gates) writeJson(path.join(directory, 'steps', gate.id + '.json'), { id: gate.id, runId: 'current', status: gate.id === 'historical' ? 'KNOWN_FAILURES' : gate.id === 'firefox-lint' ? 'KNOWN_WARNINGS' : 'PASS', exitCode: 0 });
  assert.equal(summarize(directory).status, 'PASS');
  writeJson(path.join(directory, 'steps', 'typecheck.json'), { id: 'typecheck', runId: 'old', status: 'PASS', exitCode: 0 });
  assert.equal(summarize(directory).rows.find(row => row.id === 'typecheck').status, 'NOT RUN');
  writeJson(path.join(directory, 'steps', 'typecheck.json'), { id: 'typecheck', runId: 'current', status: 'KNOWN_FAILURES', exitCode: 0 });
  assert.equal(summarize(directory).status, 'FAIL');
});
test('생성물 검사는 tracked 변경과 untracked 출력 모두 실패로 처리한다', t => {
  const cwd = temporary(t); fs.mkdirSync(path.join(cwd, 'firefox'));
  fs.writeFileSync(path.join(cwd, 'firefox/generated.js'), 'before');
  assert.equal(spawnSync('git', ['init', '--quiet'], { cwd }).status, 0);
  assert.equal(spawnSync('git', ['add', 'firefox/generated.js'], { cwd }).status, 0);
  assert.equal(checkGenerated(cwd).status, 'PASS');
  fs.writeFileSync(path.join(cwd, 'firefox/generated.js'), 'after'); assert.throws(() => checkGenerated(cwd));
  fs.writeFileSync(path.join(cwd, 'firefox/generated.js'), 'before');
  fs.writeFileSync(path.join(cwd, 'firefox/new.js'), 'new'); assert.throws(() => checkGenerated(cwd));
});
test('Workflow는 모든 Gate를 직렬 연결하고 read-only·always 증적 정책을 유지한다', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const ids = [...workflow.matchAll(/run: node tools\/ci\/run-command\.mjs ([a-z0-9-]+) --/g)].map(match => match[1]);
  assert.deepEqual(ids, gates.map(gate => gate.id));
  assert.match(workflow, /contents: read/); assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /^    branches: \[main, integration\/aru-stabilization-verified\]$/m); assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target|continue-on-error|secrets\.|contents: write/);
  assert.equal([...workflow.matchAll(/if: always\(\)/g)].length, 2);
  assert.equal([...workflow.matchAll(/uses: [\w/-]+@[a-f0-9]{40}/g)].length, 3);
  assert.match(workflow, /retention-days: 7/);
});
