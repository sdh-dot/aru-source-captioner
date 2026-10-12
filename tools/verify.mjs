import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const issues=[];
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const browser of ['firefox','whale']){
 const folder=path.join(root,browser),m=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
 const refs=[m.background?.service_worker,...(m.background?.scripts||[]),m.options_ui?.page,...Object.values(m.icons||{}),...m.content_scripts.flatMap(s=>[...(s.js||[]),...(s.css||[])]),...(m.web_accessible_resources||[]).flatMap(s=>s.resources)];
 for(const ref of refs.filter(Boolean))if(!fs.existsSync(path.join(folder,ref)))issues.push(browser+': missing '+ref);
 for(const file of walk(folder).filter(f=>f.endsWith('.js'))){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)issues.push(path.relative(root,file)+': syntax error');}
 const exifr=fs.readFileSync(path.join(folder,'lib/exifr.full.umd.js'));
 if(crypto.createHash('sha256').update(exifr).digest('hex')!==JSON.parse(fs.readFileSync(path.join(root,'docs/vendor-integrity.json'),'utf8')).exifr.browserSHA256[browser])issues.push(browser+': exifr hash changed');
}
const common=['ruliweb-icons/content.bundle.js','ruliweb-icons/background.bundle.js','ruliweb-icons/composer-bridge.js','icon-metadata/content.bundle.js','icon-metadata/bridge.bundle.js','bundle-generator/content.bundle.js','bundle-generator/bridge.bundle.js'];
for(const file of common)if(!fs.readFileSync(path.join(root,'firefox/features',file)).equals(fs.readFileSync(path.join(root,'whale/features',file))))issues.push('Browser feature mismatch: '+file);
console.log(JSON.stringify({manifestReferences:issues.filter(x=>x.includes('missing')).length===0,issues},null,2));if(issues.length)process.exitCode=1;
