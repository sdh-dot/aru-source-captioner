// WXT가 파일명을 바꾸어도 기존 권한·World·URL 범위와 공개 리소스 계약은 같아야 한다.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const order = ['ruliweb-composer', 'ruliweb-icons', 'body-download', 'icon-metadata-bridge', 'icon-metadata', 'bundle-generator-bridge', 'bundle-generator'];
const sorted = values => [...values].sort();
for (const browser of ['chrome', 'firefox', 'whale']) {
  const folder = '.output/' + browser + '-mv3';
  const actual = read(folder + '/manifest.json');
  const prior = read((browser === 'firefox' ? 'firefox' : 'whale') + '/manifest.json');
  for (const key of ['name', 'description', 'version', 'manifest_version', 'icons', 'action', 'options_ui', 'browser_specific_settings']) {
    assert.deepEqual(actual[key], prior[key], browser + ': ' + key);
  }
  for (const key of ['permissions', 'host_permissions']) assert.deepEqual(sorted(actual[key]), sorted(prior[key]), browser + ': ' + key);
  assert.equal(actual.content_scripts.length, prior.content_scripts.length);
  actual.content_scripts.forEach((entry, index) => {
    const original = prior.content_scripts[index];
    assert.deepEqual(sorted(entry.matches), sorted(original.matches));
    assert.equal(entry.world, original.world || 'ISOLATED');
    assert.equal(entry.run_at, original.run_at);
    assert.equal(entry.js[0], 'content-scripts/' + order[index] + '.js');
    for (const file of [...entry.js, ...(entry.css || [])]) assert.ok(fs.existsSync(path.join(root, folder, file)), file);
  });
  assert.deepEqual(actual.web_accessible_resources, prior.web_accessible_resources);
  for (const entry of actual.web_accessible_resources) for (const file of entry.resources) {
    assert.deepEqual(fs.readFileSync(path.join(root, folder, file)), fs.readFileSync(path.join(root, browser === 'firefox' ? 'firefox' : 'whale', file)));
  }
  assert.ok(fs.existsSync(path.join(root, folder, 'features/body-download/download.html')));
  assert.ok(fs.existsSync(path.join(root, folder, 'background.js')));
  console.log(JSON.stringify({ browser, manifest: true, contentScripts: actual.content_scripts.length, resources: true }));
}
