// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/contracts.mjs
  var defaultEnvironment = globalThis;

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) {
        scope[name] = resolvers[name]?.();
      } else {
        Object.defineProperty(scope, name, {
          enumerable: true,
          get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get")
        });
      }
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/body-download/engine.mjs
  function createDownloadEngine({ environment = defaultEnvironment, dependencies = {} } = {}) {
    const { AbortController, TextEncoder, Blob } = environment;
    const setTimeout = typeof environment.setTimeout === "function" ? (...args) => environment.setTimeout(...args) : void 0;
    const clearTimeout = typeof environment.clearTimeout === "function" ? (...args) => environment.clearTimeout(...args) : void 0;
    let downloads2 = createModuleScope(dependencies.downloads, [
      "error",
      "mediaUrl",
      "inspect",
      "api",
      "call",
      "writeJob",
      "options",
      "numbered",
      "actualName",
      "localManifest"
    ], ["fetchImage", "DownloadRunner"]);
    const initializeDownloadEngine = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const D = downloads2;
      const sleep = /* @__PURE__ */ __name((ms, signal) => new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(D.error("CANCELLED", "취소했습니다."));
          return;
        }
        const cleanup = /* @__PURE__ */ __name(() => signal?.removeEventListener("abort", abort), "cleanup");
        const timer = setTimeout(() => {
          cleanup();
          resolve();
        }, ms);
        const abort = /* @__PURE__ */ __name(() => {
          clearTimeout(timer);
          cleanup();
          reject(D.error("CANCELLED", "취소했습니다."));
        }, "abort");
        signal?.addEventListener("abort", abort, { once: true });
      }), "sleep");
      async function fetchImage(url, { signal, fetchFn = root.fetch, maxBytes = 20 * 1024 * 1024, timeoutMs = 2e4 } = {}) {
        D.mediaUrl(url);
        const ctl = new AbortController(), abort = /* @__PURE__ */ __name(() => ctl.abort(), "abort");
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) {
          ctl.abort();
        }
        const timer = setTimeout(abort, timeoutMs);
        try {
          const response = await fetchFn(url, {
            method: "GET",
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal: ctl.signal
          });
          if (response.redirected || response.url && response.url !== url) {
            throw D.error("REDIRECT", "주소 이동을 허용하지 않습니다.");
          }
          if (!response.ok) {
            const err = D.error([401, 403, 429].includes(response.status) ? "ACCESS_DENIED" : "HTTP", "미디어 요청 실패 (HTTP " + response.status + ").");
            err.retryable = response.status >= 500;
            throw err;
          }
          if (Number(response.headers.get("content-length")) > maxBytes) {
            throw D.error("TOO_LARGE", "파일당 20 MiB 상한을 넘었습니다.");
          }
          const chunks = [];
          let length = 0;
          if (response.body?.getReader) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const part = await reader.read();
                if (part.done) {
                  break;
                }
                length += part.value.byteLength;
                if (length > maxBytes) {
                  await reader.cancel();
                  throw D.error("TOO_LARGE", "파일당 20 MiB 상한을 넘었습니다.");
                }
                chunks.push(part.value);
              }
            } finally {
              reader.releaseLock();
            }
          } else {
            const buffer = new Uint8Array(await response.arrayBuffer());
            length = buffer.length;
            chunks.push(buffer);
          }
          if (length > maxBytes) {
            throw D.error("TOO_LARGE", "파일당 20 MiB 상한을 넘었습니다.");
          }
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          const type = D.inspect(bytes, response.headers.get("content-type"), url);
          const digest = await root.crypto.subtle.digest("SHA-256", bytes);
          const sha256 = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
          return { bytes, type, sha256, responseUrl: response.url || url };
        } catch (err) {
          if (ctl.signal.aborted) {
            throw D.error(signal?.aborted ? "CANCELLED" : "TIMEOUT", signal?.aborted ? "취소했습니다." : "미디어 응답 시간이 초과되었습니다.");
          }
          if (err instanceof TypeError) {
            err.retryable = true;
          }
          throw err;
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
        }
      }
      __name(fetchImage, "fetchImage");
      class DownloadRunner {
        static {
          __name(this, "DownloadRunner");
        }
        constructor({ api = D.api, call = D.call, fetchFn = root.fetch, persist = D.writeJob, onProgress = /* @__PURE__ */ __name(() => {
        }, "onProgress"), isEnabled = D.options, intervalMs = 300, timeoutMs = 12e4 } = {}) {
          Object.assign(this, {
            api,
            call,
            fetchFn,
            persist,
            onProgress,
            isEnabled,
            intervalMs,
            timeoutMs
          });
          this.running = false;
          this.downloadId = null;
        }
        async cancel() {
          this.cancelled = true;
          this.controller?.abort();
          if (this.downloadId !== null) {
            try {
              await this.call(this.api.downloads, "cancel", this.downloadId);
            } catch (_) {
            }
          }
        }
        async saveBytes(bytes, mime, path, signal, onStarted = () => {
        }) {
          if (signal?.aborted) {
            throw D.error("CANCELLED", "취소했습니다.");
          }
          const blobUrl = root.URL.createObjectURL(new Blob([bytes], { type: mime }));
          let id = null, changed, timer, abort;
          try {
            let wake = /* @__PURE__ */ __name(() => {
            }, "wake");
            changed = /* @__PURE__ */ __name((delta) => {
              if (delta.id === id) {
                wake();
              }
            }, "changed");
            this.api.downloads.onChanged.addListener(changed);
            id = await this.call(this.api.downloads, "download", {
              url: blobUrl,
              filename: path,
              conflictAction: "uniquify",
              saveAs: false
            });
            this.downloadId = id;
            await onStarted(id);
            const item = await new Promise((resolve, reject) => {
              let checking = false, again = false, finished = false;
              const fail = /* @__PURE__ */ __name((err) => {
                if (!finished) {
                  finished = true;
                  reject(err);
                }
              }, "fail");
              const check = /* @__PURE__ */ __name(async () => {
                if (checking) {
                  again = true;
                  return;
                }
                checking = true;
                try {
                  do {
                    again = false;
                    const found = (await this.call(this.api.downloads, "search", { id }))[0];
                    if (!found) {
                      throw D.error("DOWNLOAD_MISSING", "다운로드 결과를 조회할 수 없습니다.");
                    }
                    if (found.state === "complete") {
                      if (found.exists === false || !found.filename) {
                        throw D.error("FILE_MISSING", "브라우저가 저장 파일을 확인하지 못했습니다.");
                      }
                      if (Number.isFinite(found.fileSize) && found.fileSize !== bytes.length) {
                        throw D.error("SIZE_MISMATCH", "저장된 파일 크기가 원본 바이트와 다릅니다.");
                      }
                      if (!finished) {
                        finished = true;
                        resolve(found);
                      }
                      return;
                    }
                    if (found.state === "interrupted") {
                      const err = D.error("DOWNLOAD_INTERRUPTED", "다운로드 중단: " + (found.error || "unknown"));
                      err.retryable = /^(?:NETWORK_|SERVER_FAILED|FILE_TRANSIENT_ERROR)/.test(found.error || "");
                      throw err;
                    }
                  } while (again && !finished);
                } catch (err) {
                  fail(err);
                } finally {
                  checking = false;
                }
              }, "check");
              wake = check;
              timer = setTimeout(() => fail(D.error("DOWNLOAD_TIMEOUT", "저장 완료 확인 시간이 초과되었습니다.")), this.timeoutMs);
              abort = /* @__PURE__ */ __name(() => fail(D.error("CANCELLED", "취소했습니다.")), "abort");
              signal?.addEventListener("abort", abort, { once: true });
              if (signal?.aborted) {
                abort();
              } else {
                check();
              }
            });
            return item;
          } catch (err) {
            if (id !== null) {
              try {
                await this.call(this.api.downloads, "cancel", id);
              } catch (_) {
              }
            }
            throw err;
          } finally {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            if (changed) {
              this.api.downloads.onChanged.removeListener(changed);
            }
            this.downloadId = null;
            root.URL.revokeObjectURL(blobUrl);
          }
        }
        async notify(job) {
          await this.persist(job);
          this.onProgress(job);
        }
        async run(job) {
          if (this.running) {
            throw D.error("BUSY", "이미 다운로드 중입니다.");
          }
          if (job.status !== "prepared") {
            throw D.error("STATE", "새 확인 화면에서 다운로드를 시작해 주세요. 자동 재개하지 않습니다.");
          }
          this.running = true;
          this.cancelled = false;
          try {
            if (!await this.isEnabled()) {
              throw D.error("DISABLED", "전체 확장과 다운로드 옵션이 꺼져 있습니다.");
            }
            if (this.cancelled) {
              throw D.error("CANCELLED", "취소했습니다.");
            }
          } catch (err) {
            this.running = false;
            throw err;
          }
          this.controller = new AbortController();
          const signal = this.controller.signal;
          try {
            job.status = "running";
            await this.notify(job);
            let blocked = false;
            for (const image of job.images) {
              if (this.cancelled || !await this.isEnabled()) {
                this.cancelled = true;
                break;
              }
              if (blocked) {
                image.status = "blocked";
                continue;
              }
              image.status = "processing";
              job.currentIndex = image.index;
              for (let attempt = 1; attempt <= 2; attempt++) {
                image.attempts = attempt;
                image.status = "processing";
                await this.notify(job);
                try {
                  const fetched = await fetchImage(image.originalUrl, {
                    signal,
                    fetchFn: this.fetchFn
                  });
                  const { type, bytes, sha256 } = fetched;
                  Object.assign(image, {
                    mediaKind: type.mediaKind,
                    mimeType: type.mime,
                    responseMimeType: type.responseMimeType,
                    urlExtension: type.urlExtension,
                    mismatches: type.mismatches,
                    responseUrl: fetched.responseUrl,
                    byteLength: bytes.length,
                    sha256,
                    requestedFilename: D.numbered(image.index, type.ext)
                  });
                  const path = job.folder + "/" + image.requestedFilename;
                  const item = await this.saveBytes(bytes, type.mime, path, signal, async (id) => {
                    image.downloadId = id;
                    image.status = "saving";
                    await this.notify(job);
                  });
                  Object.assign(image, {
                    status: "complete",
                    actualPath: item.filename,
                    filename: D.actualName(item.filename),
                    downloadMimeType: item.mime || null,
                    filenameMatchesRequest: D.actualName(item.filename) === image.requestedFilename,
                    folderMatchesRequest: item.filename.replace(/\\/g, "/").endsWith("/" + path)
                  });
                  if (item.mime && item.mime !== type.mime) {
                    image.mismatches.push("download-mime");
                  }
                  image.error = null;
                  break;
                } catch (err) {
                  image.error = {
                    code: err.code || "NETWORK",
                    message: err.message
                  };
                  if (err.code === "CANCELLED") {
                    image.status = "cancelled";
                    break;
                  }
                  if (err.code === "ACCESS_DENIED") {
                    image.status = "failed";
                    blocked = true;
                    break;
                  }
                  if (err.retryable && attempt < 2) {
                    await sleep(600, signal).catch(() => {
                    });
                    continue;
                  }
                  image.status = err.code === "UNSUPPORTED_MEDIA" ? "unsupported" : "failed";
                  break;
                }
              }
              await this.notify(job);
              if (this.cancelled) {
                break;
              }
              await sleep(this.intervalMs, signal).catch(() => {
              });
            }
            for (const image of job.images) {
              if (["pending", "processing", "saving"].includes(image.status)) {
                image.status = "cancelled";
              }
            }
            job.status = this.cancelled ? "cancelled" : blocked ? "blocked" : job.images.some((x) => x.status !== "complete") ? "partial" : "complete";
            job.currentIndex = null;
            job.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
            await this.notify(job);
            await this.saveManifest(job);
            return job;
          } catch (err) {
            job.status = "interrupted";
            job.error = err.message;
            await this.notify(job).catch(() => {
            });
            throw err;
          } finally {
            this.running = false;
            this.controller = null;
          }
        }
        async saveManifest(job) {
          const bytes = new TextEncoder().encode(JSON.stringify(D.localManifest(job), null, 2) + "\n");
          try {
            const item = await this.saveBytes(bytes, "application/json", job.folder + "/manifest.json");
            job.manifest = {
              status: "complete",
              actualPath: item.filename,
              filename: D.actualName(item.filename),
              filenameMatchesRequest: D.actualName(item.filename) === "manifest.json"
            };
          } catch (err) {
            job.manifest = {
              status: "failed",
              error: err.message
            };
          }
          await this.notify(job);
        }
        async recover(job) {
          if (!["running", "cancelling"].includes(job.status)) {
            return job;
          }
          for (const image of job.images) {
            if (!["processing", "saving", "pending"].includes(image.status)) {
              continue;
            }
            if (image.downloadId != null) {
              try {
                const item = (await this.call(this.api.downloads, "search", {
                  id: image.downloadId
                }))[0];
                if (item?.state === "complete" && item.exists !== false && item.filename && item.fileSize === image.byteLength) {
                  Object.assign(image, {
                    status: "complete",
                    actualPath: item.filename,
                    filename: D.actualName(item.filename),
                    filenameMatchesRequest: D.actualName(item.filename) === image.requestedFilename
                  });
                  continue;
                }
                if (item?.state === "in_progress") {
                  await this.call(this.api.downloads, "cancel", item.id);
                }
              } catch (_) {
              }
            }
            image.status = "interrupted";
          }
          job.status = "interrupted";
          job.currentIndex = null;
          job.error = "실행 화면이 닫히거나 다시 열렸습니다. 자동 재개하지 않습니다. 아래에서 기록을 저장하거나 새로 실행해 주세요.";
          await this.notify(job);
          return job;
        }
      }
      Object.assign(D, { fetchImage, DownloadRunner });
    }, "initializeDownloadEngine");
    initializeDownloadEngine(environment);
    return {
      downloads: selectModuleExports(downloads2, ["fetchImage", "DownloadRunner"])
    };
  }
  __name(createDownloadEngine, "createDownloadEngine");

  // docs/source/compat/body-download-engine.mjs
  var downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
  var result = createDownloadEngine({ environment: globalThis, dependencies: { downloads: { "error": /* @__PURE__ */ __name(() => downloads["error"], "error"), "mediaUrl": /* @__PURE__ */ __name(() => downloads["mediaUrl"], "mediaUrl"), "inspect": /* @__PURE__ */ __name(() => downloads["inspect"], "inspect"), "api": /* @__PURE__ */ __name(() => downloads["api"], "api"), "call": /* @__PURE__ */ __name(() => downloads["call"], "call"), "writeJob": /* @__PURE__ */ __name(() => downloads["writeJob"], "writeJob"), "options": /* @__PURE__ */ __name(() => downloads["options"], "options"), "numbered": /* @__PURE__ */ __name(() => downloads["numbered"], "numbered"), "actualName": /* @__PURE__ */ __name(() => downloads["actualName"], "actualName"), "localManifest": /* @__PURE__ */ __name(() => downloads["localManifest"], "localManifest") } } });
  Object.assign(downloads, result.downloads);
})();
