// 자동 생성: src/body-download/background.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 사용자가 요청한 본문 다운로드만 직렬 실행하고 로컬 원장과 관리 탭을 연결한다.
import { createModuleScope } from "../runtime/module-scope.mjs";
export function createDownloadBackground({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { TextEncoder, console } = environment;
    let downloads = createModuleScope(dependencies.downloads, [
        "api",
        "options",
        "call",
        "writeJob",
        "error",
        "article",
        "readJob",
        "actualName",
        "mediaUrl",
        "folder",
    ], []);
    const initializeDownloadBackground = function (root) {
        "use strict";
        const D = downloads, api = D.api, MENU = "aru-body-download-v1", PAGE = "features/body-download/download.html";
        if (!api?.contextMenus) {
            return;
        }
        let queue = Promise.resolve();
        const serialize = (fn) => {
            const run = queue.then(fn);
            queue = run.catch(() => { });
            return run;
        };
        async function menu() {
            // 서비스 워커가 다시 시작되어도 같은 메뉴 ID를 갱신해 중복 등록을 피한다.
            const routes = ["https://bbs.ruliweb.com/community/board/98/read/*"];
            if (api.runtime
                .getManifest()
                .host_permissions.some((x) => x.startsWith("https://m.ruliweb.com/"))) {
                routes.push("https://m.ruliweb.com/community/board/98/read/*");
            }
            const config = {
                title: "아루 · 게시글 아이콘 일괄 다운로드",
                contexts: ["all"],
                documentUrlPatterns: routes,
                enabled: await D.options(),
            };
            try {
                await D.call(api.contextMenus, "update", MENU, config);
            }
            catch (_) {
                await new Promise((resolve, reject) => {
                    try {
                        api.contextMenus.create({ id: MENU, ...config }, () => {
                            const err = api.runtime.lastError;
                            if (err) {
                                reject(new Error(err.message));
                            }
                            else {
                                resolve();
                            }
                        });
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
        }
        async function open(job) {
            const url = api.runtime.getURL(PAGE) + "?job=" + encodeURIComponent(job.id);
            if (job.managerTabId != null) {
                try {
                    const tab = await D.call(api.tabs, "get", job.managerTabId);
                    if (tab.url === url) {
                        await D.call(api.tabs, "update", tab.id, { active: true });
                        return;
                    }
                }
                catch (_) { }
            }
            const tab = await D.call(api.tabs, "create", { url, active: true });
            job.managerTabId = tab.id;
            if (job.status === "error") {
                await D.call(api.storage.local, "set", { aruBodyDownloadErrorV1: job });
            }
            else {
                await D.writeJob(job);
            }
        }
        async function clicked(info, tab) {
            if (info.menuItemId !== MENU) {
                return;
            }
            if (!(await D.options())) {
                return;
            }
            const current = await D.call(api.tabs, "get", tab.id);
            if (!current.active || current.incognito) {
                throw D.error("TAB", "현재 활성화된 일반 탭에서 실행해 주세요.");
            }
            const source = D.article(current.url);
            const prior = await D.readJob();
            if (prior &&
                ["prepared", "running", "cancelling"].includes(prior.status)) {
                try {
                    const manager = await D.call(api.tabs, "get", prior.managerTabId);
                    if (manager.url ===
                        api.runtime.getURL(PAGE) + "?job=" + encodeURIComponent(prior.id)) {
                        await open(prior);
                        return;
                    }
                }
                catch (_) { }
                // 이전 미완료 기록은 보존하되 이미지 요청을 자동 재실행하지 않는다.
                for (const image of prior.images) {
                    if (image.downloadId == null ||
                        !["processing", "saving"].includes(image.status)) {
                        continue;
                    }
                    try {
                        const item = (await D.call(api.downloads, "search", { id: image.downloadId }))[0];
                        if (item?.state === "complete" &&
                            item.exists !== false &&
                            item.filename &&
                            item.fileSize === image.byteLength) {
                            Object.assign(image, {
                                status: "complete",
                                actualPath: item.filename,
                                filename: D.actualName(item.filename),
                            });
                        }
                        else {
                            if (item?.state === "in_progress") {
                                await D.call(api.downloads, "cancel", item.id);
                            }
                            image.status = "interrupted";
                        }
                    }
                    catch (_) {
                        image.status = "interrupted";
                    }
                }
                prior.status =
                    prior.status === "prepared" ? "cancelled" : "interrupted";
                await D.call(api.storage.local, "set", {
                    aruBodyDownloadPreviousJobV1: prior,
                });
            }
            const response = await D.call(api.tabs, "sendMessage", tab.id, { type: "aru-body-download:collect", url: source.url }, { frameId: 0 });
            if (!response?.ok) {
                throw D.error(response?.error?.code || "COLLECT", response?.error?.message ||
                    "게시글 수집 응답이 없습니다. 페이지를 새로고침해 주세요.");
            }
            const snapshot = response.result;
            if (D.article(snapshot?.source?.url).url !== source.url ||
                snapshot.source.articleId !== source.articleId ||
                !Array.isArray(snapshot.images) ||
                snapshot.images.length > 5000) {
                throw D.error("SNAPSHOT", "본문 수집 결과가 올바르지 않습니다.");
            }
            snapshot.images.forEach((x) => D.mediaUrl(x.originalUrl));
            if (new TextEncoder().encode(JSON.stringify(snapshot)).length >
                4 * 1024 * 1024) {
                throw D.error("RESOURCE_LIMIT", "본문 수집 기록이 4 MiB를 넘습니다.");
            }
            const id = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) +
                "-" +
                root.crypto.randomUUID().slice(0, 8);
            const job = {
                ...snapshot,
                id,
                status: "prepared",
                createdAt: new Date().toISOString(),
                folder: D.folder(snapshot.source, id),
                sourceTabId: tab.id,
                managerTabId: null,
            };
            await D.writeJob(job);
            await open(job);
        }
        api.contextMenus.onClicked.addListener((info, tab) => {
            serialize(() => clicked(info, tab)).catch(async (err) => {
                console.warn("[Aru body download]", err.code || "ERROR", err.message);
                // 실패는 관리 화면에 표시하며 페이지 전체 수집이나 다운로드로 대체하지 않는다.
                const id = root.crypto.randomUUID();
                const job = {
                    id,
                    status: "error",
                    error: err.message,
                    createdAt: new Date().toISOString(),
                    images: [],
                    unsupported: [],
                };
                try {
                    await D.call(api.storage.local, "set", {
                        aruBodyDownloadErrorV1: job,
                    });
                    await open(job);
                }
                catch (openError) {
                    console.warn("[Aru body download] 오류 화면 열기 실패", openError.message);
                }
            });
        });
        api.runtime.onInstalled.addListener(() => serialize(menu).catch((err) => console.warn("[Aru body download] 메뉴 등록 실패", err.message)));
        api.runtime.onStartup?.addListener(() => serialize(menu).catch((err) => console.warn("[Aru body download]", err.message)));
        api.storage.onChanged.addListener((changes, area) => {
            if (area === "sync" &&
                (changes.enabled || changes.aruBodyDownloadOptions)) {
                serialize(menu).catch((err) => console.warn("[Aru body download]", err.message));
            }
        });
        serialize(menu).catch((err) => console.warn("[Aru body download] 메뉴 준비 실패", err.message));
    };
    initializeDownloadBackground(environment);
    return {};
}
