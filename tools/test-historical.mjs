// Keep original assertions intact, including their obsolete baseline dependencies.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk(path.join(root,'docs/tests')).filter(f=>f.endsWith('.test.cjs'));
console.log('Historical suite: original assertions retained. Baseline versions and ZIPs are deliberately excluded from the public repository; dependency and old-design failures remain visible.');
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});process.exitCode=result.status??1;
