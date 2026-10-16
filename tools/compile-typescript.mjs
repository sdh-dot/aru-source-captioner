// 기존 검증·classic 배포 경로는 TypeScript 원본에서 재생성하며 알고리즘을 두 곳에서 관리하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'tools/typescript-modules.json'), 'utf8'));
const list = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? list(path.join(directory, entry.name)) : entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') ? [path.join(directory, entry.name)] : []);
const modules = list(path.join(root, 'src')).map(file => {
  const source = path.relative(root, file).replaceAll('\\', '/');
  return mapping.find(entry => entry.source === source) || { source, output: source.replace(/^src\//, 'docs/source/').replace(/\.ts$/, '.mjs') };
});
const destinations = new Map(modules.map(entry => [path.resolve(root, entry.source), path.resolve(root, entry.output)]));

export function compileProductModules({ check = false } = {}) {
  const changed = [];
  for (const { source, output } of modules) {
    const text = fs.readFileSync(path.join(root, source), 'utf8');
    const result = ts.transpileModule(text, { fileName: source, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: true, removeComments: false } });
    if (/^\s*export\s*\{\s*\};?\s*$/.test(result.outputText)) {
      const emptyOutput = path.join(root, output);
      if (fs.existsSync(emptyOutput) && fs.readFileSync(emptyOutput, 'utf8').startsWith('// 자동 생성: '+source+'.')) {
        if(check) throw Error('불필요한 타입 전용 생성물: '+output);
        fs.unlinkSync(emptyOutput);
      }
      continue;
    }
    const rewritten = result.outputText.replace(/(from\s+|import\s*)(['"])(\.[^'"]+)\2/g, (whole, keyword, quote, specifier) => {
      const input = path.resolve(root, path.dirname(source), specifier);
      const destination = destinations.get(input) || (specifier.endsWith('pack-registry.json') ? path.resolve(root, 'docs/source/ruliweb-icons/pack-registry.json') : null);
      if (!destination) return whole;
      let relative = path.relative(path.dirname(path.resolve(root, output)), destination).replaceAll('\\', '/');
      if (!relative.startsWith('.')) relative = './' + relative;
      return keyword + quote + relative + quote;
    });
    const emitted = '// 자동 생성: ' + source + '. tools/compile-typescript.mjs로 갱신한다.\n' + rewritten;
    const destination = path.join(root, output);
    if (fs.existsSync(destination) && fs.readFileSync(destination, 'utf8') === emitted) continue;
    changed.push(output);
    if (!check) { fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, emitted); }
  }
  const registry = fs.readFileSync(path.join(root, 'src/ruliweb-icons/pack-registry.json'));
  const registryPath = path.join(root, 'docs/source/ruliweb-icons/pack-registry.json');
  if (!fs.readFileSync(registryPath).equals(registry)) {
    changed.push('docs/source/ruliweb-icons/pack-registry.json');
    if (!check) fs.writeFileSync(registryPath, registry);
  }
  if (check && changed.length) throw Error('TypeScript 호환 모듈 불일치: ' + changed.join(', '));
  return { modules: modules.length, changed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(compileProductModules({ check: process.argv.includes('--check') })));
