// 자동 생성: src/bundle-generator/client.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// ISOLATED UI의 통합팩 요청을 기존 MAIN 이벤트 계약에 맞춰 연결한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createBundleClient({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { TextEncoder } = environment;
    let bundle = createModuleScope(dependencies.bundle, ["fail", "Draft"], ["Client", "Browser"]);
    const initializeBundleClient = function (g) {
        "use strict";
        const B = bundle;
        class Client {
            constructor(doc) {
                this.doc = doc;
                this.pending = new Map();
                this.closed = false;
                this.receive = (e) => {
                    if (e.target !== doc ||
                        typeof e.detail !== "string" ||
                        e.detail.length > 2 * 1024 * 1024) {
                        return;
                    }
                    let p;
                    try {
                        p = JSON.parse(e.detail);
                    }
                    catch (_) {
                        return;
                    }
                    const r = this.pending.get(p.requestId);
                    if (!r) {
                        return;
                    }
                    g.clearTimeout(r.timer);
                    this.pending.delete(p.requestId);
                    if (p.ok) {
                        r.resolve(p.result);
                    }
                    else {
                        r.reject(Object.assign(new Error(p.error?.message || "생성기 연결 오류"), {
                            code: p.error?.code,
                        }));
                    }
                };
                doc.addEventListener("aru-bundle-response-v1", this.receive);
            }
            request(op, data = {}) {
                if (this.closed) {
                    return Promise.reject(new Error("생성기가 종료되었습니다."));
                }
                return new Promise((resolve, reject) => {
                    const requestId = g.crypto.randomUUID().replaceAll("-", ""), detail = JSON.stringify({ ...data, op, requestId });
                    if (detail.length > 2 * 1024 * 1024) {
                        reject(Object.assign(new Error("요청 크기가 2MB 상한을 넘었습니다."), {
                            code: "RESOURCE_LIMIT",
                        }));
                        return;
                    }
                    const timer = g.setTimeout(() => {
                        this.pending.delete(requestId);
                        reject(Object.assign(new Error("에디터 연결 응답을 확인하지 못했습니다."), { code: "BRIDGE_TIMEOUT" }));
                    }, 15000);
                    this.pending.set(requestId, { resolve, reject, timer });
                    this.doc.dispatchEvent(new g.CustomEvent("aru-bundle-request-v1", { detail }));
                });
            }
            destroy() {
                this.closed = true;
                this.doc.removeEventListener("aru-bundle-response-v1", this.receive);
                for (const r of this.pending.values()) {
                    g.clearTimeout(r.timer);
                    r.reject(new Error("생성기가 종료되었습니다."));
                }
                this.pending.clear();
            }
        }
        const api = g.browser || g.chrome, KEY = "aruBundleDraftV1";
        async function storage(area, method, arg) {
            if (!api?.storage?.[area]) {
                throw new Error("확장 저장소에 접근할 수 없습니다.");
            }
            if (g.browser) {
                return api.storage[area][method](arg);
            }
            return new Promise((resolve, reject) => api.storage[area][method](arg, (r) => api.runtime?.lastError
                ? reject(new Error(api.runtime.lastError.message))
                : resolve(r)));
        }
        const Browser = {
            async active() {
                try {
                    const v = await storage("sync", "get", [
                        "enabled",
                        "aruIconsOptions",
                    ]);
                    return v.enabled !== false && v.aruIconsOptions?.enabled === true;
                }
                catch (_) {
                    return false;
                }
            },
            subscribe(fn) {
                const listener = (c, a) => {
                    if (a === "sync" && (c.enabled || c.aruIconsOptions)) {
                        fn();
                    }
                };
                api?.storage?.onChanged?.addListener(listener);
                return () => api?.storage?.onChanged?.removeListener(listener);
            },
            async saveDraft(draft) {
                const data = draft.snapshot();
                if (new TextEncoder().encode(JSON.stringify(data)).length >
                    2 * 1024 * 1024) {
                    B.fail("RESOURCE_LIMIT", "저장할 초안이 2MB 상한을 넘었습니다.");
                }
                await storage("local", "set", { [KEY]: data });
            },
            async loadDraft() {
                const r = await storage("local", "get", KEY);
                if (!r[KEY]) {
                    B.fail("DRAFT_EMPTY", "저장한 생성기 초안이 없습니다.");
                }
                return B.Draft.restore(r[KEY]);
            },
        };
        Object.assign(B, { Client, Browser });
    };
    initializeBundleClient(environment);
    return { bundle: selectModuleExports(bundle, ["Client", "Browser"]) };
}
