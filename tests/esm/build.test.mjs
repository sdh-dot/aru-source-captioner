import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
function hashes() {
  const result = {};
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else result[path.relative(root, file)] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  }
  for (const folder of ['firefox', 'whale']) walk(path.join(root, folder));
  return result;
}
test('전체 빌드는 반복 실행해도 모든 브라우저 파일의 바이트와 Manifest 계약이 같다', () => {
  const before = hashes(), env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  for (let i = 0; i < 2; i++) {
    const result = spawnSync(process.execPath, ['tools/build-esm.mjs'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(hashes(), before);
  }
});
