// 자동 생성: src/upload-attribution/core.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 업로드한 파일의 출처 매칭과 게시판 이미지 증거를 분리해 잘못된 자동 연결을 막는다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createAttributionCore({ environment = defaultEnvironment, dependencies = {}, metrics = null, } = {}) {
    const { URL } = environment;
    let attribution = createModuleScope(dependencies.attribution, [], ["Registry", "Controller"]);
    /* 선택·파싱·DOM 순서가 달라도 확인된 출처만 연결하며 업로드를 가로채거나 미디어·저장소에 접근하지 않는다. */
    const initializeAttributionCore = function (g) {
        "use strict";
        let sequence = 0;
        const id = (prefix) => prefix + ++sequence;
        const ROOTS = '.note-editable[contenteditable="true"],.fr-element[contenteditable="true"],.cke_editable[contenteditable="true"],.editor[contenteditable="true"]';
        class Registry {
            constructor({ now = () => Date.now(), ttl = 5 * 60 * 1000, limit = 512, } = {}) {
                this.now = now;
                this.ttl = ttl;
                this.limit = limit;
                this.records = [];
                this.blocked = new Set();
                this.full = false;
                this.byRoot = new Map();
                this.known = new Set();
                this.nextExpiryAt = Infinity;
            }
            begin(files, root) {
                this.expire();
                const batch = id("b");
                if (this.records.length + files.length > this.limit) {
                    this.full = true;
                    return [];
                }
                // 메타데이터 파싱이 끝나기 전에 배치 전체를 등록해야 먼저 끝난 동명 파일이 잘못 연결되지 않는다.
                const records = files.map((file, index) => ({
                    id: id("f"),
                    batch,
                    index,
                    name: String(file.name || ""),
                    size: file.size,
                    modified: file.lastModified,
                    root,
                    ordinal: this.records.length + index,
                    created: this.now(),
                    state: "pending",
                    consumed: false,
                    info: null,
                }));
                this.records.push(...records);
                if (!this.byRoot.has(root)) {
                    this.byRoot.set(root, new Map());
                }
                const names = this.byRoot.get(root);
                for (const record of records) {
                    this.known.add(record);
                    this.nextExpiryAt = Math.min(this.nextExpiryAt, record.created + this.ttl);
                    if (!names.has(record.name)) {
                        names.set(record.name, []);
                    }
                    names.get(record.name).push(record);
                }
                return records;
            }
            ready(record, info) {
                if (this.known.has(record) && record.state !== "expired") {
                    record.info = info || { status: "missing" };
                    record.state = "ready";
                }
            }
            expire() {
                const now = this.now();
                if (now <= this.nextExpiryAt) {
                    return;
                }
                this.nextExpiryAt = Infinity;
                for (const record of this.records) {
                    if (!record.consumed && record.state !== "expired") {
                        if (now - record.created > this.ttl) {
                            record.state = "expired";
                            this.blocked.add(record.name);
                        }
                        else {
                            this.nextExpiryAt = Math.min(this.nextExpiryAt, record.created + this.ttl);
                        }
                    }
                }
                // 만료된 이름은 세션 동안 격리해 지연된 업로드가
                // 나중에 선택한 동명 파일의 출처를 가져가지 못하게 한다.
            }
            match(names, root) {
                const finish = metrics?.start("upload.match");
                try {
                    this.expire();
                    const exact = new Set(names.filter((value) => typeof value === "string" && value.length));
                    if (this.full) {
                        return { status: "capacity" };
                    }
                    if ([...exact].some((name) => this.blocked.has(name))) {
                        return { status: "expired" };
                    }
                    const namesIndex = this.byRoot.get(root);
                    // alt/title에 여러 이름이 있어도 레코드의 실제 선택 순서를 보존한다.
                    const alternatives = [...exact]
                        .flatMap((name) => namesIndex?.get(name) || [])
                        .filter((record) => record.state !== "expired")
                        .sort((a, b) => a.ordinal - b.ordinal);
                    const possible = alternatives.filter((record) => !record.consumed);
                    if (!possible.length) {
                        return { status: "unidentified" };
                    }
                    // 늦게 도착하는 충돌 업로드를 거절할 수 있도록 이미 소비한 동명 이력도 보존한다.
                    if (alternatives.some((record) => record.state === "pending")) {
                        return { status: "waiting" };
                    }
                    if (alternatives.some((record) => record.info?.status !== "ok" || !record.info.url)) {
                        return { status: "source-missing" };
                    }
                    const urls = new Set(alternatives.map((record) => record.info.url));
                    if (urls.size !== 1) {
                        return { status: "ambiguous" };
                    }
                    // 동명 후보 모두의 출처가 같을 때만 출처 동등성을 인정한다.
                    // 이 조건으로 특정 중복 파일의 업로드 완료 순서를 추정하지 않는다.
                    return {
                        status: "matched",
                        url: possible[0].info.url,
                        record: possible[0],
                        evidence: alternatives.length === 1
                            ? "unique-exact-name"
                            : "source-equivalent",
                        possibleIds: alternatives.map((record) => record.id),
                    };
                }
                finally {
                    finish?.();
                }
            }
            commit(match) {
                if (match.status === "matched") {
                    match.record.consumed = true;
                }
            }
            clear() {
                this.records.length = 0;
                this.byRoot.clear();
                this.known.clear();
                this.blocked.clear();
                this.nextExpiryAt = Infinity;
            }
        }
        class Controller {
            constructor({ document = g.document, parse, sanitize, caption, anchor, existing, onStatus = () => { }, now, } = {}) {
                this.doc = document;
                this.parse = parse;
                this.sanitize = sanitize;
                this.caption = caption;
                this.anchor = anchor;
                this.existing = existing;
                this.onStatus = onStatus;
                this.registry = new Registry({ now });
                this.roots = new Set();
                this.candidates = new Set();
                this.ignored = new WeakSet();
                this.handled = new WeakSet();
                this.imageIds = new WeakMap();
                this.mediaFailures = new WeakMap();
                this.proof = new WeakMap();
                this.events = [];
                this.closed = false;
                this.pending = [];
                this.parseQueue = [];
                this.parseActive = 0;
                this.parseJobs = new WeakMap();
                this.activeJobs = new Set();
                this.selected = 0;
                this.readyCount = 0;
                this.inserted = 0;
                this.imageListeners = new g.AbortController();
                // 전역에서는 작성기 root의 생성·교체만 발견하고 미디어 속성은 각 작성기 안에서 감시한다.
                this.rootObservers = new Map();
                this.observer = new g.MutationObserver((mutations) => {
                    metrics?.count("upload.observer");
                    const changed = mutations.some((mutation) => {
                        if (mutation.type === "attributes") {
                            return (this.roots.has(mutation.target) ||
                                mutation.target.getAttribute("contenteditable") ===
                                    "true");
                        }
                        return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => node.nodeType === 1 &&
                            (node.getAttribute("contenteditable") === "true" ||
                                this.roots.has(node) ||
                                (node.childElementCount > 0 &&
                                    (node.querySelector('[contenteditable="true"]') ||
                                        [...this.roots].some((root) => node.contains(root))))));
                    });
                    if (changed) {
                        this.discover();
                        this.schedule();
                    }
                });
                this.discover();
                this.observer.observe(this.doc.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["contenteditable", "class"],
                });
            }
            trace(event) {
                this.events.push(event);
                if (this.events.length > 120) {
                    this.events.shift();
                }
            }
            discover() {
                const finish = metrics?.start("upload.discover");
                try {
                    if (this.closed) {
                        return;
                    }
                    const found = [...this.doc.querySelectorAll(ROOTS)];
                    // 기존 일반 작성기 fallback을 유지하되 여러 root에서 출처를 추측하지 않는다.
                    if (!found.length) {
                        found.push(...this.doc.querySelectorAll('[contenteditable="true"]'));
                    }
                    for (const root of this.roots) {
                        if (!found.includes(root)) {
                            this.rootObservers.get(root)?.disconnect();
                            this.rootObservers.delete(root);
                            this.roots.delete(root);
                        }
                    }
                    for (const root of found) {
                        if (!this.roots.has(root)) {
                            this.roots.add(root);
                            for (const image of root.querySelectorAll("img")) {
                                this.ignored.add(image);
                            }
                            const observer = new g.MutationObserver((mutations) => {
                                metrics?.count("upload.observer");
                                let relevant = false;
                                for (const mutation of mutations) {
                                    if (mutation.type === "attributes") {
                                        this.observeImage(mutation.target);
                                        relevant = true;
                                    }
                                    else {
                                        for (const node of mutation.addedNodes) {
                                            if (node.nodeType === 1) {
                                                if (node.matches("img")) {
                                                    this.observeImage(node);
                                                    relevant = true;
                                                }
                                                for (const image of node.querySelectorAll("img")) {
                                                    this.observeImage(image);
                                                    relevant = true;
                                                }
                                            }
                                        }
                                        // 새 이미지가 없어도 후보 삭제·재배치에 따른 연결 유효성은 다시 확인한다.
                                        if (mutation.removedNodes.length && this.candidates.size) {
                                            relevant = true;
                                        }
                                    }
                                }
                                if (relevant) {
                                    this.schedule();
                                }
                            });
                            observer.observe(root, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: [
                                    "alt",
                                    "title",
                                    "src",
                                    "data-original-name",
                                    "data-filename",
                                ],
                            });
                            this.rootObservers.set(root, observer);
                        }
                    }
                }
                finally {
                    finish?.();
                }
            }
            rootFor(image) {
                return [...this.roots].find((root) => root.isConnected && root.contains(image));
            }
            observeImage(image) {
                if (!image.matches?.("img") ||
                    this.ignored.has(image) ||
                    this.handled.has(image)) {
                    return;
                }
                const root = this.rootFor(image);
                if (!root ||
                    !this.registry.records.some((record) => record.root === root && !record.consumed)) {
                    return;
                }
                if (!this.imageIds.has(image)) {
                    this.imageIds.set(image, id("i"));
                    this.trace({
                        stage: "editor-image-observed",
                        image: this.imageIds.get(image),
                    });
                    image.addEventListener("load", () => {
                        if (!this.closed) {
                            this.mediaFailures.delete(image);
                            this.schedule();
                        }
                    }, { signal: this.imageListeners.signal });
                    image.addEventListener("error", () => {
                        if (!this.closed) {
                            this.mediaFailures.set(image, image.getAttribute("src"));
                            this.schedule();
                        }
                    }, { signal: this.imageListeners.signal });
                }
                this.candidates.add(image);
            }
            async select(files, input) {
                if (this.closed) {
                    return;
                }
                this.discover();
                const roots = [...this.roots].filter((root) => root.isConnected);
                const scope = input?.closest?.(".seditor,.note-editor,.editor");
                const scoped = scope
                    ? roots.filter((root) => root === scope || scope.contains(root))
                    : roots;
                const root = scoped.length === 1 ? scoped[0] : null;
                if (!root) {
                    this.trace({ stage: "editor-unavailable" });
                    this.onStatus({
                        state: "editor-unavailable",
                        selected: files.length,
                    });
                    return;
                }
                // 선택 전에 있던 이미지에는 이번에 선택한 파일의 출처를 붙이지 않는다.
                // 이미 관측한 진행 중 업로드 후보만 계속 재확인한다.
                for (const image of root.querySelectorAll("img")) {
                    if (!this.candidates.has(image)) {
                        this.ignored.add(image);
                    }
                }
                const records = this.registry.begin(files, root);
                this.selected += files.length;
                records.forEach((record) => this.trace({
                    stage: "file-selected",
                    file: record.id,
                    batch: record.batch,
                    index: record.index,
                }));
                if (!records.length) {
                    this.report();
                    return;
                }
                // 여러 배치는 두 파싱 슬롯을 공유하지만 파일 식별자는 큐 순서와 분리해 선택마다 유지한다.
                const task = Promise.all(records.map((record, index) => this.parseFile(files[index]).then((info) => {
                    if (this.closed) {
                        return;
                    }
                    this.registry.ready(record, info);
                    this.readyCount++;
                    this.trace({
                        stage: "metadata-ready",
                        file: record.id,
                        sourceAvailable: info?.status === "ok",
                    });
                    this.schedule();
                })));
                this.pending.push(task);
                try {
                    await task;
                }
                finally {
                    const index = this.pending.indexOf(task);
                    if (index >= 0) {
                        this.pending.splice(index, 1);
                    }
                    this.schedule();
                }
            }
            parseFile(file) {
                if (this.closed) {
                    return Promise.resolve({ status: "cancelled" });
                }
                // 동일한 불변 File 객체의 진행 중 파싱만 공유한다.
                // 이름·크기·수정 시각만으로 동일 파일로 보지 않고 완료 결과나 실패는 캐시하지 않는다.
                const reusable = typeof g.File === "function" && file instanceof g.File;
                if (reusable && this.parseJobs.has(file)) {
                    return this.parseJobs.get(file);
                }
                const promise = new Promise((resolve) => {
                    this.parseQueue.push({ file, resolve });
                    this.drainParsers();
                });
                if (reusable) {
                    this.parseJobs.set(file, promise);
                    promise.finally(() => this.parseJobs.delete(file));
                }
                return promise;
            }
            drainParsers() {
                while (!this.closed && this.parseActive < 2 && this.parseQueue.length) {
                    const job = this.parseQueue.shift();
                    this.parseActive++;
                    this.activeJobs.add(job);
                    const finish = metrics?.start("metadata.parse");
                    Promise.resolve()
                        .then(() => this.closed ? { status: "cancelled" } : this.parse(job.file))
                        .catch(() => ({ status: "error", reason: "parse-failed" }))
                        .then((info) => job.resolve(info))
                        .finally(() => {
                        finish?.();
                        this.activeJobs.delete(job);
                        this.parseActive--;
                        this.drainParsers();
                    });
                }
            }
            schedule() {
                if (this.scheduled || this.closed) {
                    return;
                }
                this.scheduled = true;
                g.queueMicrotask(() => {
                    this.scheduled = false;
                    if (!this.closed) {
                        this.reconcile();
                    }
                });
            }
            reconcile() {
                const finish = metrics?.start("upload.reconcile");
                try {
                    // oxlint-disable-next-line unicorn/no-useless-spread -- 정리·외부 콜백의 재진입이 순회 대상을 바꾸더라도 이번 작업의 대상은 보존한다.
                    for (const image of [...this.candidates]) {
                        const root = this.rootFor(image);
                        if (!root || !image.isConnected) {
                            this.candidates.delete(image);
                            continue;
                        }
                        if (image.dataset.aruSourceCaptioned === "1" ||
                            this.existing(image)) {
                            this.handled.add(image);
                            this.candidates.delete(image);
                            continue;
                        }
                        const match = this.registry.match([
                            image.getAttribute("alt"),
                            image.getAttribute("title"),
                            image.getAttribute("data-original-name"),
                            image.getAttribute("data-filename"),
                        ], root);
                        this.proof.set(image, match);
                        if (match.status !== "matched") {
                            continue;
                        }
                        // src는 파일이나 출처를 선택하는 근거로 사용하지 않고
                        // 서버 업로드 완료와 blob/data 미리보기·디코딩 실패를 구분하는 데만 사용한다.
                        let uploaded;
                        try {
                            uploaded = new URL(image.getAttribute("src") || "", this.doc.baseURI);
                        }
                        catch (_) { }
                        if (!uploaded ||
                            uploaded.protocol !== "https:" ||
                            !/^i[123]\.ruliweb\.com$/.test(uploaded.hostname) ||
                            uploaded.username ||
                            uploaded.password ||
                            uploaded.port) {
                            this.proof.set(image, { status: "upload-pending" });
                            continue;
                        }
                        if (this.mediaFailures.get(image) === image.getAttribute("src")) {
                            this.proof.set(image, { status: "media-error" });
                            continue;
                        }
                        if (!image.complete || image.naturalWidth === 0) {
                            this.proof.set(image, { status: "media-loading" });
                            continue;
                        }
                        const url = this.sanitize(match.url);
                        if (!url) {
                            this.proof.set(image, { status: "source-rejected" });
                            continue;
                        }
                        const anchor = this.anchor(image);
                        // 여러 이미지나 사용자 본문이 섞인 문단은 하나의 이미지 캡션 위치로
                        // 확인할 수 없으므로 문단 끝에 임의로 출처를 붙이지 않는다.
                        if (!anchor ||
                            (anchor !== image &&
                                (anchor.querySelectorAll("img").length !== 1 ||
                                    anchor.textContent.trim()))) {
                            this.proof.set(image, { status: "mixed-anchor" });
                            continue;
                        }
                        try {
                            anchor.after(this.caption(url));
                            image.dataset.aruSourceCaptioned = "1";
                            this.handled.add(image);
                            this.registry.commit(match);
                            this.inserted++;
                            this.candidates.delete(image);
                            this.proof.set(image, match);
                            this.trace({
                                stage: "caption-inserted",
                                image: this.imageIds.get(image),
                                evidence: match.evidence,
                                possibleFiles: match.possibleIds,
                            });
                        }
                        catch (_) {
                            this.proof.set(image, { status: "insert-failed" });
                        }
                    }
                    this.report();
                }
                finally {
                    finish?.();
                }
            }
            snapshot() {
                const finish = metrics?.start("upload.snapshot");
                try {
                    const blocked = {};
                    for (const image of this.candidates) {
                        const state = this.proof.get(image)?.status || "waiting";
                        blocked[state] = (blocked[state] || 0) + 1;
                    }
                    const order = [];
                    for (const root of this.roots) {
                        if (root.isConnected) {
                            for (const image of root.querySelectorAll("img")) {
                                const match = this.proof.get(image);
                                if (this.imageIds.has(image)) {
                                    order.push({
                                        image: this.imageIds.get(image),
                                        selectionIndex: match?.evidence === "unique-exact-name"
                                            ? match.record.index
                                            : null,
                                        batch: match?.evidence === "unique-exact-name"
                                            ? match.record.batch
                                            : null,
                                        evidence: match?.evidence || null,
                                    });
                                }
                            }
                        }
                    }
                    return {
                        diagnostic: "aru-upload-attribution-v1",
                        state: this.registry.full ? "capacity" : "active",
                        selected: this.selected,
                        metadataReady: this.readyCount,
                        captionsInserted: this.inserted,
                        blocked,
                        editorOrder: order,
                        events: this.events.slice(),
                        limits: "Selection, metadata completion and DOM order only. No upload request/response capture, file names, source URLs, content, credentials or storage.",
                    };
                }
                finally {
                    finish?.();
                }
            }
            report() {
                metrics?.gauge("registry.records", this.registry.records.length);
                metrics?.gauge("upload.candidates", this.candidates.size);
                metrics?.gauge("upload.roots", this.roots.size);
                const snapshot = this.snapshot();
                this.onStatus(snapshot);
            }
            destroy() {
                this.closed = true;
                this.observer.disconnect();
                this.imageListeners.abort();
                for (const observer of this.rootObservers.values()) {
                    observer.disconnect();
                }
                this.rootObservers.clear();
                this.candidates.clear();
                this.roots.clear();
                this.registry.clear();
                this.events.length = 0;
                this.parseJobs = new WeakMap();
                for (const job of this.parseQueue.splice(0)) {
                    job.resolve({ status: "cancelled" });
                }
                for (const job of this.activeJobs) {
                    job.resolve({ status: "cancelled" });
                }
                this.activeJobs.clear();
            }
        }
        attribution = Object.freeze({ Registry, Controller });
    };
    initializeAttributionCore(environment);
    return {
        attribution: selectModuleExports(attribution, ["Registry", "Controller"]),
    };
}
