import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const evidence = path.join(root, 'docs/results/ci-quality');
export const gates = [
  ['install', '의존성 설치'], ['prepare-wxt', 'WXT 타입 준비'],
  ['typecheck', 'TypeScript 타입'], ['lint', 'Lint'], ['format', '포맷'],
  ['ci-tests', 'CI Gate 자체 검증', 1], ['typescript', 'TypeScript 직접 테스트', 60],
  ['esm', 'ESM 동등성', 51], ['integration', '통합 계약', 4],
  ['regression', '전체 회귀', 111], ['rc3', 'RC3', 59],
  ['build', 'Firefox·Chromium·Whale 빌드'], ['verify', 'classic Manifest·문법'],
  ['verify-wxt', 'WXT Manifest·권한·World·리소스'], ['verify-typescript', 'TS 생성물'],
  ['verify-esm', 'ESM 생성물'], ['audit-esm', '원본 IIFE·순환 의존'],
  ['generated', '추적·미추적 생성물 drift'], ['historical', 'Historical 기준선 비교'],
  ['firefox-lint', 'Firefox Lint 기준선 비교'],
].map(([id, name, minimumTests]) => ({ id, name, minimumTests }));

export function normalize(value, directory) {
  let text = String(value).replaceAll('\\', '/');
  if (text.startsWith('file://')) text = fileURLToPath(text).replaceAll('\\', '/');
  return text.replaceAll(path.resolve(directory).replaceAll('\\', '/'), '<ROOT>');
}
export function identity(event, directory) {
  return JSON.stringify([normalize(event.file || '', directory), event.nesting || 0, normalize(event.name, directory)]);
}
export function readTests(output, directory, exitCode) {
  const events = output.split(/\r?\n/).filter(line => line.startsWith('@@ARU_TEST@@')).map(line => JSON.parse(line.slice(12)));
  const summaries = events.filter(event => event.type === 'test:summary');
  if (summaries.length !== 1) throw Error('TEST_SUMMARY_MISSING_OR_DUPLICATE');
  const counts = summaries[0].counts;
  for (const key of ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo']) {
    if (!Number.isSafeInteger(counts?.[key]) || counts[key] < 0) throw Error('TEST_COUNTS_INVALID');
  }
  const all = events.filter(event => event.type !== 'test:summary');
  if (all.length !== counts.tests) throw Error('TEST_EVENT_COUNTS_INVALID');
  const failures = all.filter(event => event.type === 'test:fail').map(event => identity(event, directory)).sort();
  return { exitCode, counts, failures, identities: all.map(event => identity(event, directory)).sort() };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function includesMultiset(actual, expected) {
  const remaining = [...actual];
  return expected.every(value => { const index = remaining.indexOf(value); if (index < 0) return false; remaining.splice(index, 1); return true; });
}
export function compareHistorical(reference, candidate, expected) {
  if (!same(reference, expected)) throw Error('HISTORICAL_REFERENCE_DRIFT');
  if (candidate.exitCode !== 1 || candidate.failures.length !== expected.failures.length || !same(candidate.failures, expected.failures)) throw Error('HISTORICAL_FAILURE_DRIFT');
  if (candidate.counts.cancelled || candidate.counts.skipped || candidate.counts.todo || candidate.counts.tests < reference.counts.tests || candidate.counts.passed < reference.counts.passed || !includesMultiset(candidate.identities, reference.identities)) throw Error('HISTORICAL_TESTS_NOT_RUN');
  if (candidate.counts.failed !== candidate.failures.length) throw Error('HISTORICAL_COUNTS_INVALID');
  return { status: 'KNOWN_FAILURES', rawSuiteStatus: 'FAIL', rawExitCode: candidate.exitCode, existingFailures: 94, unavailableLegacyContext: 2, failed: candidate.counts.failed, newFailures: 0 };
}
export function warningKeys(warnings) {
  return warnings.map(({ code, message, file, line, column }) => JSON.stringify({ code, message, file: String(file).replaceAll('\\', '/'), line, column })).sort();
}
export function compareFirefox(result, exitCode, expected) {
  if (!Array.isArray(result.errors) || !Array.isArray(result.warnings) || exitCode !== 0 || result.errors.length) throw Error('FIREFOX_LINT_ERROR');
  if (!same(warningKeys(result.warnings), expected)) throw Error('FIREFOX_WARNING_DRIFT');
  return { status: 'KNOWN_WARNINGS', errors: 0, warnings: result.warnings.length, newWarnings: 0 };
}
export function testCounts(output) {
  const counts = {};
  for (const match of output.replace(/\x1b\[[0-9;]*m/g, '').matchAll(/(?:ℹ|#) (tests|pass|fail|cancelled|skipped|todo) (\d+)/g)) counts[match[1]] = Number(match[2]);
  return counts;
}
export function assertExecuted(output, minimum) {
  const counts = testCounts(output);
  if (!Number.isSafeInteger(counts.tests) || counts.tests < minimum || counts.pass !== counts.tests || counts.fail !== 0 || counts.cancelled !== 0 || counts.skipped !== 0 || counts.todo !== 0) throw Error('REQUIRED_TESTS_NOT_RUN_OR_FAILED');
  return counts;
}
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
