// 자동 생성: src/icon-metadata/legacy-adapter.ts. tools/compile-typescript.mjs로 갱신한다.
// 기존 전역 소비자를 남겨야 하는 엔트리포인트에서만 명시적으로 설치한다.
// 모듈 import 자체는 전역 등록이나 브라우저 초기화를 실행하지 않는다.
import { PREFIX, FIXED, fail, normalize, decode, encode } from "./tag-codec.mjs";
import { plan, Selection } from "./tag-edit-model.mjs";
export function installLegacyTagApis(target) {
    const icons = (target.AruIcons = target.AruIcons || {});
    const metadata = (target.AruMetadata = target.AruMetadata || {});
    // 다른 기능의 네임스페이스·UI 등록은 유지하고 기존 태그 API만 연결한다.
    icons.AttributeTags = Object.freeze({
        PREFIX,
        FIXED,
        normalize,
        decode,
        encode,
    });
    Object.assign(metadata, {
        PREFIX,
        FIXED,
        fail,
        normalize,
        decode,
        encode,
        plan,
        Selection,
    });
    return { AruIcons: icons, AruMetadata: metadata };
}
