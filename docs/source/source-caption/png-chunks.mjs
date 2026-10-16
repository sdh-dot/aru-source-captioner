// 자동 생성: src/source-caption/png-chunks.ts. tools/compile-typescript.mjs로 갱신한다.
// 두 브라우저의 동일한 PNG 청크 판독만 공유한다. URL 정책과 메타데이터 우선순위는 호출자에 남긴다.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export function hasPngSignature(buffer) {
    if (!buffer || buffer.byteLength < 8) {
        return false;
    }
    const sig = new Uint8Array(buffer, 0, 8);
    for (let i = 0; i < PNG_SIGNATURE.length; i++) {
        if (sig[i] !== PNG_SIGNATURE[i]) {
            return false;
        }
    }
    return true;
}
export function* parsePngItxtChunks(buffer) {
    const view = new DataView(buffer);
    let offset = 8;
    // 각 chunk: length(4 BE) + type(4 ASCII) + data(length bytes) + crc(4) = 12 + length bytes
    while (offset + 12 <= buffer.byteLength) {
        const length = view.getUint32(offset, false);
        if (length > 0x7fffffff) {
            return;
        } // 비정상 길이로 버퍼 범위를 넘지 않게 한다.
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        if (dataEnd + 4 > buffer.byteLength) {
            return;
        }
        const t0 = view.getUint8(offset + 4);
        const t1 = view.getUint8(offset + 5);
        const t2 = view.getUint8(offset + 6);
        const t3 = view.getUint8(offset + 7);
        const type = String.fromCodePoint(t0, t1, t2, t3);
        if (type === "iTXt" && length > 0) {
            yield new Uint8Array(buffer, dataStart, length);
        }
        if (type === "IEND") {
            return;
        }
        offset = dataEnd + 4;
    }
}
export function parseItxtChunk(data) {
    if (!data || data.length < 6) {
        return null;
    }
    let kwEnd = -1;
    const maxKw = Math.min(data.length, 80);
    for (let i = 0; i < maxKw; i++) {
        if (data[i] === 0) {
            kwEnd = i;
            break;
        }
    }
    if (kwEnd < 1) {
        return null;
    }
    let keyword;
    try {
        keyword = String.fromCodePoint(...data.subarray(0, kwEnd));
    }
    catch {
        return null;
    }
    if (kwEnd + 2 >= data.length) {
        return null;
    }
    const compressionFlag = data[kwEnd + 1];
    const compressionMethod = data[kwEnd + 2];
    let langEnd = -1;
    for (let i = kwEnd + 3; i < data.length; i++) {
        if (data[i] === 0) {
            langEnd = i;
            break;
        }
    }
    if (langEnd === -1) {
        return null;
    }
    let tkwEnd = -1;
    for (let i = langEnd + 1; i < data.length; i++) {
        if (data[i] === 0) {
            tkwEnd = i;
            break;
        }
    }
    if (tkwEnd === -1) {
        return null;
    }
    const textBytes = data.subarray(tkwEnd + 1);
    return { keyword, compressionFlag, compressionMethod, textBytes };
}
