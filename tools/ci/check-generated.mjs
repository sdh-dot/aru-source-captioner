import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './model.mjs';

const outputs = ['docs/source', 'shared', 'firefox', 'whale', 'docs/MOBILE-TAGS-READONLY.js', 'docs/READONLY-UPLOAD-DIAGNOSTIC.js'];
export function checkGenerated(cwd = root) {
  const diff = spawnSync('git', ['diff', '--exit-code', '--', ...outputs], { cwd, encoding: 'utf8' });
  const extra = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', ...outputs], { cwd, encoding: 'utf8' });
  if (diff.status !== 0 || extra.status !== 0 || extra.stdout) throw Error('GENERATED_FILES_DRIFT');
  return { status: 'PASS', tracked: true, untracked: true };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) console.log(JSON.stringify(checkGenerated()));
