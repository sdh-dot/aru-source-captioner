// 자동 생성: src/runtime/settings-read.ts. tools/compile-typescript.mjs로 갱신한다.
import { contextEffectGate } from "./context-effect-gate.mjs";
const clock = {
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: (handle) => globalThis.clearTimeout(handle),
};
function failure(code, message) {
    return Object.assign(new Error(message), { code });
}
function errorResult(error) {
    const value = error instanceof Error ? error : failure("API_ERROR", String(error));
    return {
        state: /extension context invalidated/i.test(value.message)
            ? "invalidated"
            : "failed",
        error: value,
        attempts: 1,
    };
}
function selectApi(root) {
    const browser = root.browser;
    const promiseApi = !!(browser?.runtime && browser.storage);
    return { api: promiseApi ? browser : root.chrome, promiseApi };
}
// callback lastError와 Promise 거절을 같은 실패로 다루되 실제 API 호출은 시도당 한 번만 한다.
function readOnce(root, keys, timer, signal) {
    return new Promise((resolve) => {
        let finished = false;
        let deadline;
        const finish = (result) => {
            if (finished) {
                return;
            }
            finished = true;
            timer.clearTimeout(deadline);
            signal?.removeEventListener("abort", cancel);
            resolve(result);
        };
        const cancel = () => finish({
            state: "cancelled",
            attempts: 1,
            error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다."),
        });
        if (signal?.aborted) {
            cancel();
            return;
        }
        signal?.addEventListener("abort", cancel, { once: true });
        deadline = timer.setTimeout(() => finish({
            state: "failed",
            attempts: 1,
            error: failure("SETTINGS_TIMEOUT", "설정 조회 응답 시간이 초과되었습니다."),
        }), 1000);
        const accept = (value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                finish({
                    state: "failed",
                    attempts: 1,
                    error: failure("SETTINGS_INVALID_RESPONSE", "설정 조회 응답이 올바르지 않습니다."),
                });
            }
            else {
                finish({
                    state: "success",
                    values: value,
                    attempts: 1,
                });
            }
        };
        try {
            const { api, promiseApi } = selectApi(root);
            const sync = api?.storage?.sync;
            if (!sync || typeof sync.get !== "function") {
                finish({
                    state: "failed",
                    attempts: 1,
                    error: failure("API_UNAVAILABLE", "확장 프로그램 API를 사용할 수 없습니다."),
                });
                return;
            }
            const callback = (value) => {
                // 타임아웃 이후에도 lastError는 callback 안에서 소비하되 결과는 되살리지 않는다.
                try {
                    const error = api?.runtime?.lastError;
                    if (error) {
                        finish(errorResult(failure("API_ERROR", error.message || "확장 프로그램 API 요청에 실패했습니다.")));
                    }
                    else {
                        accept(value);
                    }
                }
                catch (error) {
                    finish(errorResult(error));
                }
            };
            const returned = promiseApi ? sync.get(keys) : sync.get(keys, callback);
            if (returned &&
                typeof returned.then === "function") {
                Promise.resolve(returned).then(accept, (error) => finish(errorResult(error)));
            }
        }
        catch (error) {
            finish(errorResult(error));
        }
    });
}
export async function readSettings(root, keys, options = {}) {
    const timer = options.clock ?? clock;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (options.signal?.aborted) {
        cancel();
    }
    else {
        options.signal?.addEventListener("abort", cancel, { once: true });
    }
    // 조회 중 변경된 설정의 이전 응답은 초기 실행 승인으로 사용할 수 없다.
    const unsubscribe = subscribeSettings(root, (changes, area) => {
        if (area === "sync" &&
            Object.keys(changes).some((key) => keys === null || keys.includes(key))) {
            cancel();
        }
    });
    try {
        for (let attempt = 1;; attempt++) {
            const result = await readOnce(root, keys, timer, controller.signal);
            result.attempts = attempt;
            if (result.state === "invalidated") {
                contextEffectGate(root).invalidate();
            }
            if (controller.signal.aborted) {
                return {
                    state: "cancelled",
                    attempts: attempt,
                    error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다."),
                };
            }
            if (result.state !== "failed" || attempt === 3) {
                return result;
            }
            const proceed = await new Promise((resolve) => {
                if (controller.signal.aborted) {
                    resolve(false);
                    return;
                }
                const cancelWait = () => {
                    timer.clearTimeout(handle);
                    resolve(false);
                };
                const handle = timer.setTimeout(() => {
                    controller.signal.removeEventListener("abort", cancelWait);
                    resolve(true);
                }, attempt === 1 ? 200 : 500);
                controller.signal.addEventListener("abort", cancelWait, { once: true });
            });
            if (!proceed) {
                return {
                    state: "cancelled",
                    attempts: attempt,
                    error: failure("SETTINGS_CANCELLED", "설정 조회가 취소되었습니다."),
                };
            }
        }
    }
    finally {
        options.signal?.removeEventListener("abort", cancel);
        unsubscribe?.();
    }
}
export function subscribeSettings(root, listener) {
    try {
        const changed = selectApi(root).api?.storage?.onChanged;
        if (!changed) {
            return undefined;
        }
        changed.addListener(listener);
        return () => {
            try {
                changed.removeListener(listener);
            }
            catch {
                /* 무효화된 컨텍스트의 해제는 재주입하지 않는다. */
            }
        };
    }
    catch {
        return undefined;
    }
}
