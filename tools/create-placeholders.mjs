// Original geometric placeholders. No third-party pictures or raster source used.
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const crc=buf=>{let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
const chunk=(name,data)=>{const tag=Buffer.from(name),size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([tag,data])));return Buffer.concat([size,tag,data,check]);};
function png(size,kind,background=[100,41,64]){const rows=Buffer.alloc(size*(size*4+1));for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const nx=(x+.5)/size,ny=(y+.5)/size;let color=[0,0,0,0];
 if(nx>.08&&nx<.92&&ny>.08&&ny<.92)color=[...background,255];
 let ink=false;
 if(kind==='tags'){const xx=(nx-.5)*.85+(ny-.5)*.4,yy=(ny-.5)*.85-(nx-.5)*.4;ink=Math.abs(xx)<.21&&Math.abs(yy)<.28; if(Math.hypot(xx,yy+.18)<.037)ink=false;}
 else if(kind==='bundle'){ink=(nx>.24&&nx<.67&&ny>.23&&ny<.66&&(nx<.29||ny<.28))||(nx>.34&&nx<.78&&ny>.34&&ny<.77&&(nx<.39||nx>.73||ny<.39||ny>.72));}
 else {const center=.5,width=.06+(ny-.26)*.29;ink=ny>.25&&ny<.76&&(Math.abs(nx-center-width)<.043||Math.abs(nx-center+width)<.043||(ny>.57&&ny<.64&&Math.abs(nx-center)<width));}
 if(ink)color=[229,207,167,255];rows.set(color,y*(size*4+1)+1+x*4);
 }const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
for(const browser of ['firefox','whale']){
 for(const size of [16,32,48,128]){const dir=path.join(root,browser,'icons');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'icon'+size+'.png'),png(size,'select'));}
 const dir=path.join(root,browser,'assets/icons');fs.mkdirSync(dir,{recursive:true});
 for(const size of [16,32,48,64,128])fs.writeFileSync(path.join(dir,'aru-main-'+size+'.png'),png(size,'select'));
 for(const kind of ['select','bundle','tags']){for(const size of [16,20,24])fs.writeFileSync(path.join(dir,'editor-'+kind+'-'+size+'.png'),png(size,kind));fs.writeFileSync(path.join(dir,'modal-'+kind+'-256.png'),png(256,kind));}
}
const samples=path.join(root,'docs/demo/media');fs.mkdirSync(samples,{recursive:true});
for(const [i,bg]of [[146,63,97],[100,41,64],[112,88,109],[72,100,94],[128,88,55]].entries())fs.writeFileSync(path.join(samples,'sample-'+i+'.png'),png(128,'select',bg));
console.log('Generated local geometric placeholders for both browsers.');
