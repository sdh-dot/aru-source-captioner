// 자동 생성: src/ruliweb-icons/background.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 공개 아이콘 스냅샷만 확장 저장소에 캐시하며 Native Host와 개인 데이터 경로를 분리한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createIconsBackground({ environment = defaultEnvironment, dependencies = {}, } = {}) {
    const { TextEncoder, URL } = environment;
    const setTimeout = typeof environment.setTimeout === "function"
        ? (...args) => environment.setTimeout(...args)
        : undefined;
    const clearTimeout = typeof environment.clearTimeout === "function"
        ? (...args) => environment.clearTimeout(...args)
        : undefined;
    let icons = createModuleScope(dependencies.icons, ["CacheProtocol"], ["CacheProtocol"]);
    /* Public icon snapshots only; extension-origin IndexedDB. No fetch or Native Host calls. */
    const initializeIconsBackground = function (root) {
        "use strict";
        const namespace = (icons = icons || {});
        const promiseApi = typeof root.browser !== "undefined" &&
            root.browser.runtime &&
            root.browser.storage;
        const api = promiseApi ? root.browser : root.chrome;
        if (!api ||
            !api.runtime ||
            !api.runtime.onMessage ||
            !api.storage ||
            !api.storage.sync) {
            return;
        }
        const TYPE = "ARU_ICONS_CACHE";
        const DB_NAME = "aru-icons-cache";
        const VERSION = 1;
        const MAX_BYTES = 50 * 1024 * 1024;
        const MAX_ENTRY_BYTES = 10 * 1024 * 1024;
        const MAX_STRING_CHARS = 1536 * 1024;
        const MAX_RAW_BYTES = 8 * 1024 * 1024;
        const MAX_DECODED_BYTES = 1024 * 1024;
        const MAX_ENTRIES = 200;
        const DEFAULT_TTL = 24 * 60 * 60 * 1000;
        const MAX_TTL = 7 * DEFAULT_TTL;
        let databasePromise = null;
        let queue = Promise.resolve();
        let generation = 0;
        const activeTransactions = new Set();
        const messages = Object.freeze({
            FORBIDDEN: "허용되지 않은 캐시 요청입니다.",
            FEATURE_DISABLED: "아이콘 기능이 비활성화되어 있습니다.",
            INVALID_REQUEST: "캐시 요청 데이터가 올바르지 않습니다.",
            CACHE_UNAVAILABLE: "아이콘 캐시를 사용할 수 없습니다. 공개 자료를 다시 읽어 주세요.",
            CACHE_SCHEMA_UNSUPPORTED: "이 버전에서 캐시 형식을 열 수 없습니다. 기존 데이터를 보존했습니다.",
            CACHE_QUOTA: "캐시 저장 공간이 부족합니다. 캐시 없이 읽기를 계속할 수 있습니다.",
            CACHE_CANCELLED: "설정 변경으로 캐시 작업이 중단되었습니다.",
        });
        function error(code) {
            const value = new Error(messages[code]);
            value.code = code;
            return value;
        }
        // Same wire representation as BrowserAdapter, including Chromium JSON message transport.
        const BYTE_MARKER = "$aruIconsBytesV1";
        function carrierBytes(value, encode) {
            let nodes = 0;
            const seen = new Set();
            function visit(item, depth) {
                if (++nodes > 1000000 || depth > 20) {
                    throw error("INVALID_REQUEST");
                }
                if (!item || typeof item !== "object") {
                    return item;
                }
                if (ArrayBuffer.isView(item)) {
                    if (!bytesArray(item) || item.byteLength > MAX_DECODED_BYTES) {
                        throw error("INVALID_REQUEST");
                    }
                    if (!encode) {
                        return new Uint8Array(item);
                    }
                    const parts = [];
                    for (let i = 0; i < item.length; i += 8192) {
                        parts.push(String.fromCharCode(...item.subarray(i, i + 8192)));
                    }
                    return {
                        [BYTE_MARKER]: root.btoa(parts.join("")),
                        byteLength: item.byteLength,
                    };
                }
                if (seen.has(item)) {
                    throw error("INVALID_REQUEST");
                }
                seen.add(item);
                if (Object.prototype.hasOwnProperty.call(item, BYTE_MARKER)) {
                    if (encode ||
                        Object.keys(item).length !== 2 ||
                        !Object.prototype.hasOwnProperty.call(item, "byteLength")) {
                        throw error("INVALID_REQUEST");
                    }
                    const text = item[BYTE_MARKER], length = item.byteLength;
                    if (typeof text !== "string" ||
                        text.length > 1398104 ||
                        !Number.isInteger(length) ||
                        length < 0 ||
                        length > MAX_DECODED_BYTES ||
                        text.length % 4 !== 0 ||
                        !/^[A-Za-z0-9+/]*={0,2}$/.test(text) ||
                        (text.length / 4) * 3 -
                            (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0) !==
                            length) {
                        throw error("INVALID_REQUEST");
                    }
                    let binary;
                    try {
                        binary = root.atob(text);
                    }
                    catch (_) {
                        throw error("INVALID_REQUEST");
                    }
                    if (binary.length !== length || root.btoa(binary) !== text) {
                        throw error("INVALID_REQUEST");
                    }
                    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
                }
                let result;
                if (Array.isArray(item)) {
                    if (item.length > 10000) {
                        throw error("INVALID_REQUEST");
                    }
                    result = item.map((child) => visit(child, depth + 1));
                }
                else {
                    result = Object.fromEntries(Object.entries(item).map(([key, child]) => [
                        key,
                        visit(child, depth + 1),
                    ]));
                }
                seen.delete(item);
                return result;
            }
            return visit(value, 0);
        }
        function classify(value) {
            if (value && value.code && messages[value.code]) {
                return value;
            }
            if (value && value.name === "QuotaExceededError") {
                return error("CACHE_QUOTA");
            }
            if (value && value.name === "VersionError") {
                return error("CACHE_SCHEMA_UNSUPPORTED");
            }
            return error("CACHE_UNAVAILABLE");
        }
        function readSettings() {
            if (promiseApi) {
                return Promise.resolve(api.storage.sync.get(["enabled", "aruIconsOptions"]));
            }
            return new Promise((resolve, reject) => {
                api.storage.sync.get(["enabled", "aruIconsOptions"], (items) => {
                    if (api.runtime.lastError) {
                        reject(error("CACHE_UNAVAILABLE"));
                    }
                    else {
                        resolve(items || {});
                    }
                });
            });
        }
        async function requireEnabled() {
            const settings = await readSettings();
            const master = Object.prototype.hasOwnProperty.call(settings, "enabled")
                ? settings.enabled === true
                : true;
            if (!master ||
                !settings.aruIconsOptions ||
                settings.aruIconsOptions.enabled !== true) {
                throw error("FEATURE_DISABLED");
            }
        }
        function authorized(sender) {
            if (!sender ||
                sender.id !== api.runtime.id ||
                !sender.tab ||
                !Number.isInteger(sender.tab.id)) {
                return false;
            }
            if (sender.frameId !== undefined && sender.frameId !== 0) {
                return false;
            }
            try {
                const url = new URL((sender.url || sender.tab.url));
                return (url.protocol === "https:" &&
                    !url.username &&
                    !url.password &&
                    !url.port &&
                    ["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) &&
                    /^\/community\/board\/\d+(?:\/|$)/.test(url.pathname) &&
                    (!sender.origin || sender.origin === url.origin));
            }
            catch (_) {
                return false;
            }
        }
        function cacheKey(payload) {
            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                throw error("INVALID_REQUEST");
            }
            const boardId = String(payload.boardId === undefined ? 98 : payload.boardId);
            const articleId = String(payload.articleId);
            if (!/^[1-9]\d{0,11}$/.test(boardId) ||
                !/^[1-9]\d{0,11}$/.test(articleId)) {
                throw error("INVALID_REQUEST");
            }
            if (payload.catalogSource !== undefined) {
                if (!["developer", "favorite", "direct"].includes(payload.catalogSource) ||
                    !["NORMAL", "BUNDLE"].includes(payload.packKind) ||
                    payload.readerVersion !== 2) {
                    throw error("INVALID_REQUEST");
                }
                return ("catalog:2:" +
                    payload.catalogSource +
                    ":" +
                    payload.packKind +
                    ":" +
                    boardId +
                    ":" +
                    articleId);
            }
            return boardId + ":" + articleId; // Preserve all existing keys and database records.
        }
        function validPublicUrl(text) {
            if (typeof text !== "string" ||
                text.length > 4096 ||
                /[\x00-\x20\x7f\\]/.test(text)) {
                return false;
            }
            try {
                const url = new URL(text);
                if (url.protocol !== "https:" ||
                    url.username ||
                    url.password ||
                    url.port ||
                    url.hash) {
                    return false;
                }
                if (["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"].includes(url.hostname)) {
                    return true;
                }
                return (["bbs.ruliweb.com", "m.ruliweb.com"].includes(url.hostname) &&
                    /^\/community\/board\/[1-9]\d*\/read\/[1-9]\d*\/?$/.test(url.pathname));
            }
            catch (_) {
                return false;
            }
        }
        // Limits are enforced before IDB is opened. The cache never accepts private options or arbitrary HTML.
        function bytesArray(value) {
            return (ArrayBuffer.isView(value) &&
                Object.prototype.toString.call(value) === "[object Uint8Array]");
        }
        function publicJson(value, allowBytes = false) {
            let nodes = 0;
            const seen = new Set();
            function visit(item, depth) {
                if (++nodes > 1000000 || depth > 20) {
                    throw error("INVALID_REQUEST");
                }
                if (item === null || typeof item === "boolean") {
                    return;
                }
                if (typeof item === "number") {
                    if (!Number.isFinite(item)) {
                        throw error("INVALID_REQUEST");
                    }
                    return;
                }
                if (typeof item === "string") {
                    if (item.length > MAX_STRING_CHARS ||
                        (/^(?:https?:|data:|blob:|javascript:)/i.test(item) &&
                            !validPublicUrl(item))) {
                        throw error("INVALID_REQUEST");
                    }
                    return;
                }
                if (allowBytes && bytesArray(item)) {
                    if (item.byteLength > MAX_DECODED_BYTES) {
                        throw error("INVALID_REQUEST");
                    }
                    return;
                }
                if (typeof item !== "object" || seen.has(item)) {
                    throw error("INVALID_REQUEST");
                }
                const prototype = Object.getPrototypeOf(item);
                if (!Array.isArray(item) &&
                    prototype !== Object.prototype &&
                    prototype !== null) {
                    throw error("INVALID_REQUEST");
                }
                seen.add(item);
                if (Array.isArray(item)) {
                    if (item.length > 10000) {
                        throw error("INVALID_REQUEST");
                    }
                    for (const child of item) {
                        visit(child, depth + 1);
                    }
                }
                else {
                    for (const key of Object.keys(item)) {
                        if (key.length > 128 ||
                            /^(?:__proto__|prototype|constructor|cookie|cookies|authorization|password|credentials|session|token|accessToken|refreshToken|headers|privateOverrides|usage|drafts|publishJobs)$/i.test(key)) {
                            throw error("INVALID_REQUEST");
                        }
                        if (/url$|^src$/i.test(key) &&
                            item[key] !== null &&
                            !validPublicUrl(item[key])) {
                            throw error("INVALID_REQUEST");
                        }
                        const descriptor = Object.getOwnPropertyDescriptor(item, key);
                        if (!descriptor ||
                            !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                            throw error("INVALID_REQUEST");
                        }
                        visit(descriptor.value, depth + 1);
                    }
                }
                seen.delete(item);
            }
            visit(value, 0);
            return value;
        }
        // Estimate public serialized data plus actual decoded byte payloads; IDB's internal overhead is browser-specific.
        function byteSize(value) {
            let binaryBytes = 0;
            const json = JSON.stringify(value, (_, item) => {
                if (bytesArray(item)) {
                    binaryBytes += item.byteLength;
                    return null;
                }
                return item;
            });
            return new TextEncoder().encode(json).byteLength + binaryBytes;
        }
        function copyRaw(value) {
            if (bytesArray(value)) {
                return new Uint8Array(value);
            }
            if (Array.isArray(value)) {
                return value.map(copyRaw);
            }
            if (value && typeof value === "object") {
                return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyRaw(item)]));
            }
            return value;
        }
        function makeRecord(payload) {
            const key = cacheKey(payload);
            if (!payload.snapshot ||
                typeof payload.snapshot !== "object" ||
                Array.isArray(payload.snapshot)) {
                throw error("INVALID_REQUEST");
            }
            publicJson(payload.snapshot);
            let raw = payload.rawMetadata === undefined ? null : payload.rawMetadata;
            if (typeof raw === "string" && raw.length > MAX_STRING_CHARS) {
                throw error("INVALID_REQUEST");
            }
            if (raw !== null && typeof raw !== "string") {
                publicJson(raw, true);
            }
            if (byteSize(raw) > MAX_RAW_BYTES) {
                throw error("INVALID_REQUEST");
            }
            const ttl = payload.ttlMs === undefined ? DEFAULT_TTL : payload.ttlMs;
            if (!Number.isFinite(ttl) || ttl < 1000 || ttl > MAX_TTL) {
                throw error("INVALID_REQUEST");
            }
            const acquiredAt = Date.now();
            // JSON public model and byte-preserving original carriers are deliberately separate.
            const record = {
                cacheKey: key,
                snapshot: JSON.parse(JSON.stringify(payload.snapshot)),
                rawMetadata: copyRaw(raw),
                acquiredAt,
                expiresAt: acquiredAt + ttl,
                lastAccess: acquiredAt,
                byteSize: 0,
            };
            record.byteSize = byteSize(record);
            record.byteSize = byteSize(record);
            if (record.byteSize > MAX_ENTRY_BYTES) {
                throw error("INVALID_REQUEST");
            }
            return record;
        }
        function openDatabase() {
            if (databasePromise) {
                return databasePromise;
            }
            if (!root.indexedDB) {
                return Promise.reject(error("CACHE_UNAVAILABLE"));
            }
            const opening = new Promise((resolve, reject) => {
                let request;
                let settled = false;
                let timer;
                const fail = (value) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    reject(classify(value));
                };
                try {
                    request = root.indexedDB.open(DB_NAME, VERSION);
                }
                catch (value) {
                    fail(value);
                    return;
                }
                timer = setTimeout(() => fail(error("CACHE_UNAVAILABLE")), 5000);
                request.onupgradeneeded = () => {
                    if (settled) {
                        request.transaction.abort();
                        return;
                    }
                    const db = request.result;
                    if (!db.objectStoreNames.contains("packSnapshots")) {
                        db.createObjectStore("packSnapshots", { keyPath: "cacheKey" });
                    }
                    if (!db.objectStoreNames.contains("schemaMeta")) {
                        db.createObjectStore("schemaMeta", { keyPath: "key" });
                    }
                    request
                        .transaction.objectStore("schemaMeta")
                        .put({ key: "version", schemaVersion: VERSION, phase: 1 });
                };
                request.onerror = () => fail(request.error);
                request.onblocked = () => fail(error("CACHE_UNAVAILABLE"));
                request.onsuccess = () => {
                    const db = request.result;
                    if (settled) {
                        db.close();
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    db.onversionchange = () => {
                        db.close();
                        databasePromise = null;
                    };
                    resolve(db);
                };
            });
            databasePromise = opening;
            opening.catch(() => {
                if (databasePromise === opening) {
                    databasePromise = null;
                }
            });
            return opening;
        }
        function transaction(db, mode, run) {
            return new Promise((resolve, reject) => {
                const transactionGeneration = generation;
                let tx;
                let result;
                let explicitError = null;
                try {
                    tx = db.transaction("packSnapshots", mode);
                }
                catch (value) {
                    reject(classify(value));
                    return;
                }
                activeTransactions.add(tx);
                const cleanup = () => activeTransactions.delete(tx);
                tx.oncomplete = () => {
                    cleanup();
                    resolve(result);
                };
                tx.onabort = () => {
                    cleanup();
                    reject(generation !== transactionGeneration
                        ? error("CACHE_CANCELLED")
                        : explicitError || classify(tx.error));
                };
                tx.onerror = () => { }; // onabort is the authoritative atomic failure.
                try {
                    run(tx.objectStore("packSnapshots"), (value) => {
                        result = value;
                    }, (value) => {
                        explicitError = classify(value);
                        tx.abort();
                    });
                }
                catch (value) {
                    explicitError = classify(value);
                    try {
                        tx.abort();
                    }
                    catch (_) {
                        cleanup();
                        reject(explicitError);
                    }
                }
            });
        }
        async function execute(action, payload, expectedGeneration, record) {
            await requireEnabled();
            if (generation !== expectedGeneration) {
                throw error("CACHE_CANCELLED");
            }
            const db = await openDatabase();
            await requireEnabled();
            if (generation !== expectedGeneration) {
                throw error("CACHE_CANCELLED");
            }
            if (action === "get") {
                return transaction(db, "readwrite", (store, done) => {
                    const request = store.get(cacheKey(payload));
                    request.onsuccess = () => {
                        const value = request.result;
                        if (!value) {
                            done(null);
                            return;
                        }
                        const stale = value.expiresAt <= Date.now();
                        value.lastAccess = Date.now();
                        store.put(value);
                        done({
                            cacheKey: value.cacheKey,
                            snapshot: value.snapshot,
                            rawMetadata: value.rawMetadata,
                            acquiredAt: value.acquiredAt,
                            expiresAt: value.expiresAt,
                            stale,
                        });
                    };
                });
            }
            if (action === "invalidate") {
                return transaction(db, "readwrite", (store, done) => {
                    if (payload && payload.all === true) {
                        store.clear();
                    }
                    else {
                        store.delete(cacheKey(payload));
                    }
                    done({ invalidated: true });
                });
            }
            if (action === "info") {
                return transaction(db, "readonly", (store, done) => {
                    const request = store.getAll();
                    request.onsuccess = () => done({
                        schemaVersion: VERSION,
                        entries: request.result.length,
                        bytes: request.result.reduce((sum, item) => sum + item.byteSize, 0),
                        maxBytes: MAX_BYTES,
                        maxEntries: MAX_ENTRIES,
                    });
                });
            }
            return transaction(db, "readwrite", (store, done) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const candidates = request.result.filter((item) => item.cacheKey !== record.cacheKey);
                    let bytes = candidates.reduce((sum, item) => sum + item.byteSize, record.byteSize);
                    let count = candidates.length + 1;
                    // Stale public snapshots first, then least recently used. No private store is opened.
                    candidates.sort((a, b) => Number(a.expiresAt > Date.now()) -
                        Number(b.expiresAt > Date.now()) ||
                        a.lastAccess - b.lastAccess);
                    for (const item of candidates) {
                        if (bytes <= MAX_BYTES && count <= MAX_ENTRIES) {
                            break;
                        }
                        store.delete(item.cacheKey);
                        bytes -= item.byteSize;
                        count -= 1;
                    }
                    store.put(record);
                    done({
                        cacheKey: record.cacheKey,
                        acquiredAt: record.acquiredAt,
                        expiresAt: record.expiresAt,
                        byteSize: record.byteSize,
                    });
                };
            });
        }
        async function handle(message, sender) {
            if (!authorized(sender)) {
                throw error("FORBIDDEN");
            }
            await requireEnabled();
            const action = message.action;
            if (!["get", "put", "invalidate", "info"].includes(action)) {
                throw error("INVALID_REQUEST");
            }
            let payload = message.payload || {};
            let record;
            if (action === "put") {
                if (Object.prototype.hasOwnProperty.call(payload, "rawMetadata")) {
                    payload = {
                        ...payload,
                        rawMetadata: carrierBytes(payload.rawMetadata, false),
                    };
                }
                record = makeRecord(payload);
            }
            else if (action === "get" ||
                (action === "invalidate" && payload.all !== true)) {
                cacheKey(payload);
            }
            const expectedGeneration = generation;
            const task = queue.then(() => execute(action, payload, expectedGeneration, record));
            queue = task.catch(() => { });
            return task;
        }
        api.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (!message || message.type !== TYPE) {
                return false;
            }
            handle(message, sender)
                .then((result) => {
                if (message.action === "get" && result) {
                    result = {
                        ...result,
                        rawMetadata: carrierBytes(result.rawMetadata, true),
                    };
                }
                return { ok: true, result };
            })
                .catch((value) => {
                const safe = classify(value);
                return {
                    ok: false,
                    error: { code: safe.code, message: safe.message },
                };
            })
                .then(sendResponse);
            return true;
        });
        if (api.storage.onChanged) {
            api.storage.onChanged.addListener((changes, area) => {
                if (area !== "sync" ||
                    (!changes.enabled && !changes.aruIconsOptions)) {
                    return;
                }
                const disabled = (changes.enabled && changes.enabled.newValue !== true) ||
                    (changes.aruIconsOptions &&
                        (!changes.aruIconsOptions.newValue ||
                            changes.aruIconsOptions.newValue.enabled !==
                                true));
                if (disabled) {
                    ++generation;
                    for (const tx of activeTransactions) {
                        try {
                            tx.abort();
                        }
                        catch (_) { }
                    }
                }
            });
        }
        namespace.CacheProtocol = Object.freeze({
            type: TYPE,
            database: DB_NAME,
            schemaVersion: VERSION,
            maxBytes: MAX_BYTES,
        });
    };
    initializeIconsBackground(environment);
    return { icons: selectModuleExports(icons, ["CacheProtocol"]) };
}
