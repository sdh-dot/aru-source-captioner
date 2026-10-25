import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { root, evidence, readTests, compareHistorical, compareFirefox, writeJson } from './model.mjs';
import { invocation } from './run-command.mjs';

export const referenceCommit = '50a64edae5a73fe6269367545b178656fbfdf5ee';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 5 * 60 * 1000, ...options });
  if (result.error || result.signal) throw Error('BASELINE_COMMAND_INTERRUPTED');
  return result;
}
function required(executable, args, options) {
  const result = command(executable, args, options);
  if (result.status !== 0) throw Error('BASELINE_PREPARATION_FAILED: ' + executable);
  return result.stdout;
}
export function collectHistorical(output = evidence) {
  // 두 실행 모두 공개 checkout과 같은 상대 경로를 사용한다. 로컬의 과거 Fixture/프로필은 가져오지 않는다.
  const tempParent = fs.realpathSync(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempParent, 'aru-ci-baseline-'));
  const reference = path.join(temp, 'reference'), candidate = path.join(temp, 'candidate');
  fs.mkdirSync(reference); fs.mkdirSync(candidate);
  const archive = path.join(temp, 'reference.tar');
  const links = [];
  try {
    required('git', ['archive', referenceCommit, '--output=' + archive]);
    required('tar', ['-xf', archive, '-C', reference]);
    const files = required('git', ['ls-files', '--cached', '-z']).split('\0').filter(Boolean);
    for (const relative of files) {
      const destination = path.resolve(candidate, relative);
      if (!destination.startsWith(candidate + path.sep)) throw Error('TRACKED_PATH_OUTSIDE_CANDIDATE');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, relative), destination);
    }
    if (hash(path.join(reference, 'package-lock.json')) !== hash(path.join(root, 'package-lock.json'))) throw Error('BASELINE_DEPENDENCY_DRIFT');
    const results = {};
    for (const [name, directory] of [['reference', reference], ['candidate', candidate]]) {
      const link = path.join(directory, 'node_modules');
      fs.symlinkSync(fs.realpathSync(path.join(root, 'node_modules')), link, process.platform === 'win32' ? 'junction' : 'dir');
      links.push(link);
      fs.mkdirSync(path.join(directory, 'docs/results'), { recursive: true });
      const reporter = pathToFileURL(path.join(root, 'tools/ci/test-reporter.mjs')).href;
      const env = { ...process.env, NODE_OPTIONS: '--test-reporter=' + reporter };
      const [executable, args] = invocation('npm', ['run', 'test:historical']);
      const run = command(executable, args, { cwd: directory, env });
      const text = (run.stdout || '') + (run.stderr || '');
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, 'historical-' + name + '.log'), text);
      results[name] = readTests(text, directory, run.status);
      writeJson(path.join(output, 'historical-' + name + '.json'), results[name]);
    }
    return { ...results, lockfileSHA256: hash(path.join(root, 'package-lock.json')) };
  } finally {
    // 삭제 대상은 직접 생성한 임시 디렉터리로 한정하고, 공유 의존성 링크부터 분리한다.
    if (path.dirname(path.resolve(temp)) !== path.resolve(tempParent) || !path.basename(temp).startsWith('aru-ci-baseline-')) throw Error('UNSAFE_TEMP_CLEANUP');
    for (const link of links) if (fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
export function collectFirefox(output = evidence) {
  const run = command(process.execPath, ['node_modules/addons-linter/bin/addons-linter', 'firefox', '--output', 'json']);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'firefox-lint-raw.json'), run.stdout || '');
  fs.writeFileSync(path.join(output, 'firefox-lint-stderr.log'), run.stderr || '');
  return { result: JSON.parse(run.stdout), exitCode: run.status };
}
export function baselineGate(kind, output = evidence) {
  const baseline = JSON.parse(fs.readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
  if (baseline.referenceCommit !== referenceCommit || baseline.lockfileSHA256 !== hash(path.join(root, 'package-lock.json'))) throw Error('BASELINE_CONTRACT_DRIFT');
  let result;
  if (kind === 'historical') {
    const runs = collectHistorical(output);
    result = { referenceCommit, ...compareHistorical(runs.reference, runs.candidate, baseline.historical) };
  } else if (kind === 'firefox-lint') {
    const run = collectFirefox(output);
    result = compareFirefox(run.result, run.exitCode, baseline.firefoxWarnings);
  } else throw Error('UNKNOWN_BASELINE_GATE');
  writeJson(path.join(output, kind + '-comparison.json'), result);
  console.log('[CI] ' + kind + ': ' + JSON.stringify(result));
  if (process.env.GITHUB_ACTIONS) console.log('::warning title=' + kind + ' baseline::' + (kind === 'historical' ? 'Historical suite is FAIL: 94 existing failures + 2 unavailable legacy-context failures; comparison only has no regression.' : 'Firefox Lint retains 9 known warnings; this is not warning-free.'));
  return result;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  baselineGate(process.argv[2]);
}
