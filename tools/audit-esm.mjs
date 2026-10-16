// 직접 관리하는 원본과 생성물·외부 라이브러리를 나누어 전환 범위와 남은 의존성을 기록한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'acorn';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../', import.meta.url));
const managedFiles = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0'))].filter(file => file && fs.existsSync(path.join(root, file))).sort();
const files = managedFiles.filter(file => /\.(?:js|mjs|cjs)$/.test(file));
const converted = new Set(['core', 'metadata', 'attribute-tags', 'browser-adapter', 'site-adapter', 'composer-adapter'].map(name => `docs/source/ruliweb-icons/${name}.js`).concat('docs/source/icon-metadata/core.js', 'docs/source/icon-metadata/editor-bridge.js'));
for (const manifest of ['esm-completion-entries.json', 'esm-runtime-entries.json']) for (const entry of JSON.parse(fs.readFileSync(path.join(root, 'tools', manifest), 'utf8'))) converted.add(entry.file);
function category(file) {
  if (/\/lib\//.test(file)) return '제3자 라이브러리';
  if (converted.has(file) || /(?:content|bridge|background)\.bundle\.js$/.test(file) || /^(?:firefox|whale)\/features\/(?:ruliweb-icons\/composer-bridge|upload-attribution\/(?:core|ui))\.js$/.test(file)) return '생성 번들·복사본';
  if (/^tests\/|\/tests\//.test(file)) return '검증 코드';
  if (/composer|editor-bridge|bundle-generator\/(?:bridge|client)\./.test(file)) return '작성기 연동';
  if (/background/.test(file)) return 'Background Script';
  if (/browser-adapter|browser-api|options\./.test(file)) return '브라우저 API 연동';
  if (/site-adapter|ruliweb-icons\/metadata\.mjs/.test(file)) return '루리웹 DOM 처리';
  if (/content\./.test(file)) return 'Content Script';
  if (/ui|picker|interface|controller|feature|design-system/.test(file)) return 'UI 초기화';
  if (/core|metadata|attribute-tags|tag-codec|tag-edit-model/.test(file)) return '순수 데이터 처리 로직';
  if (/search|catalog|registry|library-reader/.test(file)) return '검색 및 인덱싱';
  return '기타 도구·원본';
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(item => walk(item, visit)); else if (value && typeof value === 'object') walk(value, visit);
}
const inventory = [], graph = new Map(), failures = [];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: file.endsWith('.mjs') ? 'module' : 'script', locations: true, allowReturnOutsideFunction: true });
  const iifes = [], dependencies = [];
  const module = (file.startsWith('shared/') || file.startsWith('docs/source/') && !file.startsWith('docs/source/compat/') || /^docs\/(?:MOBILE-TAGS-READONLY|READONLY-UPLOAD-DIAGNOSTIC)\.mjs$/.test(file) || file === 'docs/demo/upload-surfaces.mjs') && file.endsWith('.mjs');
  walk(ast, node => {
    if (node.type === 'CallExpression') {
      const callee = node.callee.type === 'MemberExpression' && ['call', 'apply'].includes(node.callee.property.name) ? node.callee.object : node.callee;
      if (['FunctionExpression', 'ArrowFunctionExpression'].includes(callee.type)) iifes.push(node.loc.start.line);
    }
    if (module && file !== 'shared/icon-metadata/legacy-adapter.mjs' && node.type === 'Identifier' && ['AruIcons', 'AruMetadata', 'AruBundle', 'AruBodyDownload', 'AruSourceAttribution', 'AruUploadUI', 'AruPerformance'].includes(node.name)) failures.push(`${file}:${node.loc.start.line}: 암묵적 전역 API 참조`);
    if (module && ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), node.source.value));
      if (!node.source.value.startsWith('.') || !fs.existsSync(path.join(root, target))) failures.push(`${file}: 확인할 수 없는 import ${node.source.value}`);
      else dependencies.push(target);
    }
  });
  if (module && iifes.length) failures.push(`${file}: 직접 관리하는 ESM에 IIFE가 남음`);
  if (!['제3자 라이브러리', '검증 코드', '생성 번들·복사본'].includes(category(file)) && iifes.length) failures.push(`${file}: 직접 관리하는 원본에 IIFE가 남음`);
  if (module) graph.set(file, dependencies);
  inventory.push({ file, category: category(file), iifeLines: iifes, imports: dependencies });
}
const visiting = new Set(), visited = new Set();
function visit(file) { if (visiting.has(file)) { failures.push(`순환 의존: ${file}`); return; } if (visited.has(file)) return; visiting.add(file); for (const target of graph.get(file) ?? []) visit(target); visiting.delete(file); visited.add(file); }
for (const file of graph.keys()) visit(file);
const categories = {};
for (const entry of inventory) { const total = categories[entry.category] ??= { files: 0, iifes: 0 }; total.files++; total.iifes += entry.iifeLines.length; }
const inlineHtml = [];
for (const file of managedFiles.filter(file => file.endsWith('.html') && !file.startsWith('tests/') && !file.includes('/tests/'))) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
  try {
    for (const [index, script] of [...dom.window.document.querySelectorAll('script:not([src])')].entries()) {
      if (script.type && !['module', 'text/javascript', 'application/javascript'].includes(script.type)) continue;
      let iifes = 0;
      walk(parse(script.textContent, { ecmaVersion: 'latest', sourceType: script.type === 'module' ? 'module' : 'script' }), node => {
        if (node.type !== 'CallExpression') return;
        const callee = node.callee.type === 'MemberExpression' && ['call', 'apply'].includes(node.callee.property.name) ? node.callee.object : node.callee;
        if (['FunctionExpression', 'ArrowFunctionExpression'].includes(callee.type)) iifes++;
      });
      inlineHtml.push({ file, script: index, iifes });
      if (iifes) failures.push(`${file}: inline script ${index}에 원본 IIFE가 남음`);
    }
  } finally { dom.window.close(); }
}
const sourceIifes = inventory.filter(entry => !['제3자 라이브러리', '검증 코드', '생성 번들·복사본'].includes(entry.category)).reduce((total, entry) => total + entry.iifeLines.length, 0);
const report = { definitions: { iife: '함수 표현식/화살표의 즉시 호출 및 .call/.apply 호출', source: '이 Git 작업 트리의 추적·미추적 JS/CJS/MJS, ignored 제외', generated: 'build-esm.mjs의 출력 목록과 두 esm-*-entries.json, *.bundle.js 및 build.mjs의 upload/composer 복사본; --check로 생성물 일치 검증', legacyGlobals: 'compat entry와 명시적 installLegacyTagApis만 namespace에 등록; ESM 내부는 주입 또는 import' }, categories, convertedModules: [...graph.keys()], sourceIifes, failures, inventory };
report.inlineHtml = inlineHtml;
if (process.argv.includes('--write')) { fs.mkdirSync(path.join(root, 'docs/architecture'), { recursive: true }); fs.writeFileSync(path.join(root, 'docs/architecture/esm-iife-inventory.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ categories, modules: graph.size, sourceIifes, cycles: failures.filter(failure => failure.startsWith('순환')).length, failures }));
if (failures.length) process.exitCode = 1;
