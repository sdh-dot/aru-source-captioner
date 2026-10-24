// 외부 작품이나 사용자 이미지를 복사하지 않고 JSON 경계 검증용 PNG·EXIF 바이트를 재생성한다.
import fs from 'node:fs';
import { deflateSync } from 'node:zlib';

const folder = new URL('../typescript/fixtures/', import.meta.url);
const cases = JSON.parse(fs.readFileSync(new URL('source-input-cases.json', folder)));
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), head = Buffer.alloc(4), tail = Buffer.alloc(4);
  head.writeUInt32BE(data.length);tail.writeUInt32BE(crc(Buffer.concat([name,data])));
  return Buffer.concat([head,name,data,tail]);
}
function png(payload) {
  const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('iTXt',Buffer.concat([Buffer.from('AruArchive\0\0\0\0\0'),Buffer.from(JSON.stringify(payload))])),chunk('IDAT',deflateSync(Buffer.from([0,32,64,96]))),chunk('IEND',Buffer.alloc(0))]);
}
function jpeg(payload) {
  const text=Buffer.from(JSON.stringify(payload)+'\0'),tiff=Buffer.alloc(26);
  tiff.write('II');tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);tiff.writeUInt16LE(1,8);
  tiff.writeUInt16LE(0x010e,10);tiff.writeUInt16LE(2,12);tiff.writeUInt32LE(text.length,14);tiff.writeUInt32LE(26,18);
  const exif=Buffer.concat([Buffer.from('Exif\0\0'),tiff,text]),head=Buffer.from([0xff,0xe1,0,0]);head.writeUInt16BE(exif.length+2,2);
  const original=fs.readFileSync(new URL('source-exif.jpg',folder)),segments=[original.subarray(0,2)];
  let offset=2;
  while (offset<original.length) {
    const marker=original[offset+1];
    if(marker===0xda||marker===0xd9){segments.push(original.subarray(offset));break;}
    const length=original.readUInt16BE(offset+2),segment=original.subarray(offset,offset+length+2);
    if(marker!==0xe1)segments.push(segment);
    offset+=length+2;
  }
  return Buffer.concat([segments[0],head,exif,...segments.slice(1)]);
}
for(const [file,key] of [
  ['input-string-id.png','string-id'],['input-bad-url-valid-source.png','object-url-then-valid'],['input-all-invalid.png','all-invalid-with-nested-url'],
  ['input-valid-url-bad-id.jpg','valid-url-bad-id'],['input-bad-url-valid-source.jpg','object-url-then-valid'],['input-all-invalid.jpg','all-invalid-with-nested-url'],
]){
  const payload=cases.find(row=>row.name===key).payload;
  fs.writeFileSync(new URL(file,folder),file.endsWith('.png')?png(payload):jpeg(payload));
}
