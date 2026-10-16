// 자동 생성: src/platform/firefox/background.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../../runtime/contracts.mjs";
// 브라우저별 기존 초기화·저장 키·사용자 설정과 이벤트 계약을 유지한다.
import { createModuleScope } from "../../runtime/module-scope.mjs";
export function installFirefoxBackground({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { chrome, console } = environment;
    let downloads = createModuleScope(dependencies.downloads, ["ownsDownload"], []);
    //
    // Phase 2A: 기본 옵션 seed 구현.
    // - 신규 설치 또는 업데이트 시 chrome.storage.sync에 누락된 키만 기본값으로 채운다.
    // - 기존 사용자가 설정한 값은 절대 덮어쓰지 않는다.
    //
    // 캡션 삽입 / EXIF·XMP 파싱은 Phase 2B에서 추가된다.
    const DEFAULT_OPTIONS = Object.freeze({
        enabled: true,
        aruIconsOptions: { enabled: false, autoLoad: true },
        aruBodyDownloadOptions: { enabled: false },
        allowHttp: false,
        strictAllowlist: false,
        allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
        ruliwebAiRevealMode: "off",
        ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
        ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"],
    });
    function seedMissingOptions() {
        chrome.storage.sync.get(null, (items) => {
            if (chrome.runtime.lastError) {
                console.warn("[Aru Source Captioner] storage.get failed:", chrome.runtime.lastError.message);
                return;
            }
            const updates = {};
            for (const key of Object.keys(DEFAULT_OPTIONS)) {
                if (!(key in items)) {
                    updates[key] = DEFAULT_OPTIONS[key];
                }
            }
            if (Object.keys(updates).length === 0) {
                return;
            }
            chrome.storage.sync.set(updates, () => {
                if (chrome.runtime.lastError) {
                    console.warn("[Aru Source Captioner] storage.set failed:", chrome.runtime.lastError.message);
                    return;
                }
                console.info("[Aru Source Captioner] seeded missing default options:", Object.keys(updates));
            });
        });
    }
    chrome.runtime.onInstalled.addListener(() => {
        // install / update / chrome_update / shared_module_update 모두에 대해 누락 키만 보강한다.
        seedMissingOptions();
    });
    // chrome.downloads는 PC Firefox에서만 사용 가능하다.
    // Android Firefox에서는 API 자체가 없으므로 아래 guard가 자연히 처리한다.
    const NATIVE_HOST_ID = "net.aru_archive.host";
    const _IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
    const _PIXIV_CDN_RE = /\/(\d{6,12})_p\d+/;
    function _getFileExt(filename) {
        const m = (filename || "").match(/\.([a-z0-9]+)$/i);
        return m ? m[1].toLowerCase() : "";
    }
    function _extractPixivId(str) {
        if (!str) {
            return null;
        }
        const m = str.match(_PIXIV_CDN_RE);
        return m ? m[1] : null;
    }
    function _onDownloadComplete(item) {
        if (downloads?.ownsDownload(item)) {
            return;
        } // 일괄 다운로드 원본 바이트를 보존하기 위해 이 경로에서는 Native Host를 호출하지 않는다.
        const ext = _getFileExt(item.filename);
        if (!_IMAGE_EXTS.has(ext)) {
            return;
        }
        const artworkId = _extractPixivId(item.url) ||
            _extractPixivId(item.referrer) ||
            _extractPixivId(item.filename);
        if (!artworkId) {
            return;
        }
        const fileFormat = ext === "jpeg" ? "jpg" : ext;
        const metadata = {
            schema_version: "2.0",
            source_site: "pixiv",
            artwork_id: artworkId,
            artwork_url: `https://www.pixiv.net/artworks/${artworkId}`,
        };
        chrome.runtime.sendNativeMessage(NATIVE_HOST_ID, {
            action: "embed_download_metadata",
            request_id: `dl_${item.id}_${Date.now()}`,
            payload: {
                file_path: item.filename,
                file_format: fileFormat,
                metadata,
            },
        }, (response) => {
            if (chrome.runtime?.lastError) {
                console.warn("[Aru] embed native message failed:", chrome.runtime.lastError.message);
                return;
            }
            if (response?.success) {
                console.info("[Aru] metadata embedded:", response.data?.message);
            }
            else {
                console.warn("[Aru] embed failed:", response?.error);
            }
        });
    }
    if (typeof chrome !== "undefined" && chrome.downloads?.onChanged) {
        chrome.downloads.onChanged.addListener((delta) => {
            if (delta.state?.current !== "complete") {
                return;
            }
            chrome.downloads.search({ id: delta.id }, (items) => {
                if (items?.length) {
                    _onDownloadComplete(items[0]);
                }
            });
        });
    }
    return {};
}
