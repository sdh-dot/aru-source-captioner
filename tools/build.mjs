import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'docs/source/ruliweb-icons',name+'.js'),'utf8');
// Reproduce the delivered Firefox-only exifr patch from the official Chromium copy.
const vendor=fs.readFileSync(path.join(root,'whale/lib/exifr.full.umd.js'),'utf8').trim();
const start=vendor.indexOf('function h(e,t=l){'),end=vendor.indexOf('let u=t.fetch;',start);
if(start<0||end<start)throw new Error('Unexpected exifr 7.1.3 optional loader');
const patched=vendor.slice(0,start)+'function h(e,t=l){/* optional-dep loader disabled in browser extension */}'+vendor.slice(end);
fs.writeFileSync(path.join(root,'firefox/lib/exifr.full.umd.js'),'\ufeff'+patched+'\r\n');
// Concatenation only. Existing metadata and UI algorithms are unchanged.
await import('../docs/tools/build-generator.mjs');
const background='/* source: shared/ruliweb-icons/background.js */\n'+read('background')+'\n';
for(const browser of ['firefox','whale']){
 const upload=path.join(root,browser,'features/upload-attribution');fs.mkdirSync(upload,{recursive:true});
 for(const name of ['core','ui'])fs.copyFileSync(path.join(root,'docs/source/upload-attribution',name+'.js'),path.join(upload,name+'.js'));
 fs.writeFileSync(path.join(root,browser,'features/ruliweb-icons/background.bundle.js'),background);
 fs.copyFileSync(path.join(root,'docs/source/ruliweb-icons/composer-bridge.js'),path.join(root,browser,'features/ruliweb-icons/composer-bridge.js'));
 const core=fs.readFileSync(path.join(root,'docs/source/icon-metadata/core.js'),'utf8');
 // The MAIN metadata bridge was delivered as readable source; it has no build transform.
 if(!fs.existsSync(path.join(root,browser,'features/icon-metadata/bridge.bundle.js')))throw new Error('Missing readable editor bridge');
 if(!core.includes('aru-tags:v1:'))throw new Error('Unexpected tag codec');
}
console.log('Build complete: firefox/ and whale/. No network, minifier or private paths required.');
