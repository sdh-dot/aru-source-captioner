import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { evidence, gates, writeJson } from './model.mjs';

export function summarize(directory = evidence) {
  const contextFile = path.join(directory, 'run.json');
  const runId = fs.existsSync(contextFile) ? JSON.parse(fs.readFileSync(contextFile, 'utf8')).runId : null;
  const rows = gates.map(gate => {
    const file = path.join(directory, 'steps', gate.id + '.json');
    if (!fs.existsSync(file)) return { id: gate.id, name: gate.name, status: 'NOT RUN' };
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!runId || value.runId !== runId) return { id: gate.id, name: gate.name, status: 'NOT RUN' };
      const expected = gate.id === 'historical' ? 'KNOWN_FAILURES' : gate.id === 'firefox-lint' ? 'KNOWN_WARNINGS' : 'PASS';
      if (value.id !== gate.id || value.exitCode !== 0 || value.status !== expected) return { id: gate.id, name: gate.name, ...value, status: 'FAIL' };
      return { name: gate.name, ...value };
    }
    catch { return { id: gate.id, name: gate.name, status: 'INVALID RESULT' }; }
  });
  const ok = rows.every(row => ['PASS', 'KNOWN_FAILURES', 'KNOWN_WARNINGS'].includes(row.status));
  const result = { status: ok ? 'PASS' : 'FAIL', rawHistoricalSuite: 'See historical comparison; known failures are not test PASS', rows };
  writeJson(path.join(directory, 'summary.json'), result);
  const text = '# CI 품질 Gate\n\n| 검사 | 상태 | 시간(s) |\n| --- | --- | --- |\n' + rows.map(row => `| ${row.name} | ${row.status} | ${row.durationMs == null ? '-' : (row.durationMs / 1000).toFixed(1)} |`).join('\n') + '\n\nHistorical의 기존94 실패와 공개 환경의 legacy-context 부재2건은 raw FAIL이며, 기준선 비교 통과와 구분합니다. Firefox 기존9경고도 유지됩니다. 실제 로그인·게시·업로드·브라우저 E2E는 이 job에서 NOT RUN입니다.\n';
  fs.writeFileSync(path.join(directory, 'summary.md'), text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  return result;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = summarize(); console.log(JSON.stringify(result)); if (result.status !== 'PASS') process.exitCode = 1;
}
