// ESM 원본에서만 호환 스크립트를 만들고 기존 배포 빌드의 순서·Manifest 정책을 유지한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const destinations = {
  core: 'docs/source/ruliweb-icons/core.js',
  metadata: 'docs/source/ruliweb-icons/metadata.js',
  'attribute-tags': 'docs/source/ruliweb-icons/attribute-tags.js',
  'metadata-writer': 'docs/source/icon-metadata/core.js',
  'browser-adapter': 'docs/source/ruliweb-icons/browser-adapter.js',
  'site-adapter': 'docs/source/ruliweb-icons/site-adapter.js',
  'composer-adapter': 'docs/source/ruliweb-icons/composer-adapter.js',
  'metadata-editor-bridge': 'docs/source/icon-metadata/editor-bridge.js'
};

export async function compileCompatibility({ check = false } = {}) {
  const outputs = new Map();
  for (const [name, destination] of Object.entries(destinations)) {
    const result = await build({
      absWorkingDir: root,
      entryPoints: ['docs/source/compat/' + name + '.mjs'],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2022',
      charset: 'utf8',
      keepNames: true,
      minify: false,
      write: false,
      legalComments: 'none',
      banner: { js: '// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.' }
    });
    outputs.set(destination, result.outputFiles[0].text);
  }
  // MAIN은 전역 호환 API와 editor 설치를 하나의 import 그래프로 묶어 코덱을 한 번만 포함한다.
  const editor = outputs.get('docs/source/icon-metadata/editor-bridge.js');
  for (const browser of ['firefox', 'whale']) {
    outputs.set(browser + '/features/icon-metadata/bridge.bundle.js', editor);
  }
  const changed = [];
  for (const [relative, text] of outputs) {
    const file = path.join(root, relative);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) continue;
    changed.push(relative);
    if (!check) fs.writeFileSync(file, text);
  }
  if (check && changed.length) throw new Error('ESM 생성본 불일치: ' + changed.join(', '));
  return { files: [...outputs.keys()], changed };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--check', '--compat-only'].includes(arg))) throw new Error('지원하지 않는 빌드 인자입니다.');
  const result = await compileCompatibility({ check: args.includes('--check') });
  if (!args.includes('--check') && !args.includes('--compat-only')) await import('./build.mjs');
  console.log(JSON.stringify({ compatibilityFiles: result.files.length, changed: result.changed }));
}
