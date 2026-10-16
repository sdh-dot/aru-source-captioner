// 자동 생성: src/body-download/ui.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 로컬 다운로드 작업을 표시하고 사용자 조작에 따른 실행·취소를 연결한다.
import { createModuleScope } from "../runtime/module-scope.mjs";
export function createDownloadUi({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { document, URLSearchParams } = environment;
    let downloads = createModuleScope(dependencies.downloads, [
        "readJob",
        "error",
        "DownloadRunner",
        "options",
        "call",
        "api",
        "article",
        "writeJob",
    ], []);
    const initializeDownloadUi = function (root) {
        "use strict";
        const D = downloads, $ = (id) => document.getElementById(id);
        let job = null, runner = null, lease = null;
        const labels = {
            prepared: "실행 전",
            running: "다운로드 중",
            complete: "미디어 저장 완료",
            partial: "일부 파일 저장 실패",
            blocked: "접근 제한으로 미디어 요청 중지",
            cancelled: "취소됨",
            interrupted: "중단됨",
            error: "실행할 수 없습니다",
        };
        function render(value) {
            job = value;
            if (!job.source) {
                $("article-title").textContent = "본문을 확인할 수 없습니다";
                $("error").hidden = false;
                $("error").textContent =
                    job.error || "게시글에서 다시 실행해 주세요.";
                return;
            }
            $("article-title").textContent = job.source.title || null;
            $("source").textContent =
                "게시글 " + job.source.articleId + " · " + job.source.url;
            $("found").textContent = String(job.counts.bodyMedia - job.counts.unsupported);
            $("unique").textContent = String(job.images.length);
            $("unsupported").textContent = String(job.counts.unsupported +
                job.images.filter((x) => x.status === "unsupported").length);
            $("folder").textContent = job.folder;
            const complete = job.images.filter((x) => x.status === "complete").length, failed = job.images.filter((x) => ["failed", "unsupported", "blocked"].includes(x.status)).length;
            const processed = job.images.filter((x) => ["complete", "failed", "unsupported"].includes(x.status)).length;
            const percentage = job.images.length
                ? Math.round((processed / job.images.length) * 100)
                : 0;
            $("percentage").textContent = percentage + "%";
            $("progress").value = percentage;
            $("counts").textContent =
                "전체 " +
                    job.images.length +
                    "개 · 완료 " +
                    complete +
                    "개 · 실패/제외 " +
                    failed +
                    "개 · 미완료 " +
                    (job.images.length - complete - failed) +
                    "개";
            const current = job.images.find((x) => x.index === job.currentIndex);
            $("current").textContent = current
                ? "현재 처리: " +
                    (current.requestedFilename ||
                        String(current.index).padStart(3, "0")) +
                    " · 시도 " +
                    current.attempts +
                    "/2"
                : "";
            $("status").textContent =
                (labels[job.status] || job.status) +
                    (job.manifest?.status === "complete"
                        ? " · " + job.manifest.filename + " 저장됨"
                        : job.manifest?.status === "failed"
                            ? " · 기록 저장 실패"
                            : "");
            $("error").hidden = !job.error && job.manifest?.status !== "failed";
            $("error").textContent = job.error || job.manifest?.error || "";
            $("start").disabled =
                job.status !== "prepared" || !job.images.length;
            $("cancel").textContent = ["running", "cancelling"].includes(job.status)
                ? "다운로드 취소"
                : "닫기";
            $("record").hidden =
                !["interrupted", "partial", "cancelled", "blocked"].includes(job.status) && job.manifest?.status !== "failed";
            // Details are populated on demand; progress updates do not rebuild thousands of rows.
            if ($("results").open) {
                renderResults();
            }
        }
        function renderResults() {
            const fragment = document.createDocumentFragment();
            for (const image of job?.images || []) {
                const li = document.createElement("li");
                li.textContent =
                    (image.filename ||
                        image.requestedFilename ||
                        String(image.index).padStart(3, "0")) +
                        " · " +
                        image.status +
                        (image.error ? " · " + image.error.message : "") +
                        (image.filenameMatchesRequest === false
                            ? " · 브라우저가 파일명을 변경함"
                            : "");
                fragment.append(li);
            }
            $("file-results").replaceChildren(fragment);
        }
        $("results").addEventListener("toggle", () => {
            if ($("results").open) {
                renderResults();
            }
        });
        async function load() {
            const id = new URLSearchParams(root.location.search).get("job"), stored = await D.readJob(id);
            if (!stored || stored.id !== id) {
                throw D.error("JOB", "이 실행 기록이 없거나 다른 다운로드 화면이 열렸습니다. 게시글에서 다시 실행해 주세요.");
            }
            job = stored;
            runner = new D.DownloadRunner({ onProgress: render });
            // Lock held for the lifetime of this manager, including before confirmation.
            if (!root.navigator.locks) {
                throw D.error("LOCK_UNAVAILABLE", "중복 실행 방지 기능을 사용할 수 없는 브라우저입니다.");
            }
            let readyResolve;
            const ready = new Promise((resolve) => {
                readyResolve = resolve;
            });
            const hold = new Promise((resolve) => {
                lease = resolve;
            });
            root.navigator.locks
                .request("aru-body-download-manager", { ifAvailable: true }, async (lock) => {
                readyResolve(!!lock);
                if (lock) {
                    await hold;
                }
            })
                .catch(() => readyResolve(false));
            if (!(await ready)) {
                throw D.error("BUSY", "다른 다운로드 화면이 이미 열려 있습니다. 그 화면에서 진행해 주세요.");
            }
            await runner.recover(job);
            render(job);
        }
        $("start").addEventListener("click", async (event) => {
            if (!event.isTrusted || !job || runner?.running) {
                return;
            }
            $("start").disabled = true;
            try {
                if (!(await D.options())) {
                    throw D.error("DISABLED", "전체 확장과 다운로드 옵션을 켜 주세요.");
                }
                const sourceTab = await D.call(D.api.tabs, "get", job.sourceTabId);
                if (D.article(sourceTab.url).url !== job.source.url) {
                    throw D.error("NAVIGATED", "원본 탭의 게시글이 변경되었습니다. 다시 실행해 주세요.");
                }
                const fresh = await D.call(D.api.tabs, "sendMessage", job.sourceTabId, { type: "aru-body-download:collect", url: job.source.url }, { frameId: 0 });
                if (!fresh?.ok ||
                    JSON.stringify(fresh.result.images.map((x) => x.originalUrl)) !== JSON.stringify(job.images.map((x) => x.originalUrl))) {
                    throw D.error("BODY_CHANGED", "본문 미디어 목록이 변경되었습니다. 게시글에서 다시 실행해 주세요.");
                }
                await runner.run(job);
            }
            catch (err) {
                $("error").hidden = false;
                $("error").textContent = err.message;
                $("start").disabled = job.status !== "prepared";
            }
        });
        $("cancel").addEventListener("click", async (event) => {
            if (!event.isTrusted) {
                return;
            }
            if (runner?.running) {
                $("cancel").disabled = true;
                await runner.cancel();
                $("cancel").disabled = false;
            }
            else {
                if (job?.status === "prepared") {
                    job.status = "cancelled";
                    await D.writeJob(job);
                }
                lease?.();
                root.close();
            }
        });
        $("record").addEventListener("click", async (event) => {
            if (!event.isTrusted || !runner || runner.running) {
                return;
            }
            $("record").disabled = true;
            await runner.saveManifest(job);
            $("record").disabled = false;
        });
        D.api?.storage.onChanged.addListener((changes, area) => {
            if (area === "sync" &&
                (changes.enabled || changes.aruBodyDownloadOptions)) {
                D.options()
                    .then((active) => {
                    if (!active && runner?.running) {
                        runner.cancel();
                    }
                })
                    .catch(() => runner?.cancel());
            }
        });
        root.addEventListener("beforeunload", (event) => {
            if (runner?.running) {
                event.preventDefault();
                event.returnValue = "";
            }
        });
        load().catch((err) => {
            $("error").hidden = false;
            $("error").textContent = err.message;
            $("start").disabled = true;
        });
    };
    initializeDownloadUi(environment);
    return {};
}
