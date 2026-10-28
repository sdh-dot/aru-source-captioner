import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, evidence, gates, assertExecuted, writeJson } from './model.mjs';
import { compareHistorical } from './model.mjs';
import { assertHistoricalEvidence } from './dependency-profile.mjs';

export function invocation(command, args) {
  if (command === 'node') return [process.execPath, args];
  if (command === 'npm' && process.platform === 'win32') return [process.execPath, [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...args]];
  return [command, args];
}
export function execute(id, command, args, { cwd = root, output = evidence, env = process.env } = {}) {
  const gate = gates.find(gate => gate.id === id);
  if (!gate) throw Error('UNKNOWN_GATE');
  const start = Date.now();
  const contextFile = path.join(output, 'run.json');
  if (id === 'install') writeJson(contextFile, { runId: randomUUID(), startedAt: new Date(start).toISOString() });
  const context = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  const record = { id, runId: context.runId, command: [command, ...args], status: 'RUNNING', startedAt: new Date(start).toISOString(), node: process.version, platform: process.platform };
  if (id === 'install') {
    const [binary, parameters] = invocation('npm', ['--version']);
    record.npm = spawnSync(binary, parameters, { encoding: 'utf8' }).stdout?.trim();
  }
  if (['historical', 'firefox-lint'].includes(id)) fs.rmSync(path.join(output, id + '-comparison.json'), { force: true });
  if (id === 'historical') {
    for (const name of ['integrity.json', 'installed-tree.json', 'reference.json', 'reference.log', 'candidate.json', 'candidate.log']) fs.rmSync(path.join(output, 'historical-' + name), { force: true });
  }
  const file = path.join(output, 'steps', id + '.json');
  writeJson(file, record);
  console.log('[CI] START ' + id);
  const [executable, parameters] = invocation(command, args);
  const result = spawnSync(executable, parameters, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  const text = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(output, 'steps', id + '.log'), text);
  process.stdout.write(text);
  Object.assign(record, { exitCode: result.status, signal: result.signal, durationMs: Date.now() - start, status: result.status === 0 && !result.error ? 'PASS' : 'FAIL' });
  try {
    if (record.status !== 'PASS') throw Error('COMMAND_FAILED');
    if (gate.minimumTests) record.counts = assertExecuted(text, gate.minimumTests);
    if (['historical', 'firefox-lint'].includes(id)) {
      const comparison = JSON.parse(fs.readFileSync(path.join(output, id + '-comparison.json'), 'utf8'));
      if (comparison.status !== (id === 'historical' ? 'KNOWN_FAILURES' : 'KNOWN_WARNINGS')) throw Error('BASELINE_COMPARISON_MISSING');
      if (id === 'historical') {
        const profile = JSON.parse(fs.readFileSync(new URL('./dependency-profile.json', import.meta.url), 'utf8'));
        const baseline = JSON.parse(fs.readFileSync(new URL('./baseline.json', import.meta.url), 'utf8'));
        const runs = assertHistoricalEvidence(output, profile, baseline, context.runId);
        const expected = compareHistorical(runs.reference, runs.candidate, baseline.historical);
        if (JSON.stringify(comparison) !== JSON.stringify({ referenceCommit: baseline.referenceCommit, ...expected })) throw Error('HISTORICAL_COMPARISON_EVIDENCE_DRIFT');
      }
      record.status = comparison.status;
      record.comparison = comparison;
    }
  } catch (error) { record.status = 'FAIL'; record.reason = error.message; }
  writeJson(file, record);
  console.log('[CI] ' + id + ' ' + record.status);
  return record;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const [id, separator, command, ...args] = process.argv.slice(2);
  if (separator !== '--' || !command) throw Error('USAGE: run-command.mjs gate -- command args');
  if (execute(id, command, args).status === 'FAIL') process.exitCode = 1;
}
