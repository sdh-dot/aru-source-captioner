// 자동 생성: src/ruliweb-icons/library-search.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 여러 팩에 속한 같은 이미지는 한 행으로 검색하되 각 출처와 태그 소유 관계를 보존한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createIconsLibrarySearch({ environment = defaultEnvironment, dependencies = {}, metrics = null, } = {}) {
    const { AbortController } = environment;
    let icons = createModuleScope(dependencies.icons, [
        "normalize",
        "CatalogSources",
        "queryTokens",
        "LibrarySearchEngine",
        "libraryIconIdentity",
        "libraryFixedTags",
    ], ["LibrarySearchEngine", "libraryIconIdentity", "libraryFixedTags"]);
    /* 검색 상태와 사용자가 요청한 수집만 다루며 UI·네트워크의 수명은 호출자가 소유한다. */
    const initializeIconsLibrarySearch = function (_g) {
        "use strict";
        const A = (icons = icons || {}), norm = (value) => A.normalize(value), key = (ref) => String(ref.boardId) + ":" + ref.articleId;
        const abort = () => Object.assign(new Error("검색 수집을 중지했습니다."), {
            code: "ABORTED",
        });
        function identity(icon, ref) {
            const article = icon.origin?.articleId || ref.articleId, board = String(ref.boardId);
            return JSON.stringify(icon.imageMetadata?.id
                ? [board, article, "metadata", icon.imageMetadata.id]
                : [
                    board,
                    article,
                    "occurrence",
                    icon.origin?.originalIndex ?? icon.ref?.index ?? icon.id,
                    icon.url,
                ]);
        }
        function tags(icon, dictionary, normalize) {
            return [
                ...new Set([
                    ...(icon.imageMetadata?.tags || []),
                    ...(icon.tagIds || [])
                        .map((id) => dictionary.get(id))
                        .filter(Boolean),
                ]
                    .filter((tag) => typeof tag === "string")
                    .map(normalize)
                    .filter(Boolean)),
            ];
        }
        class LibrarySearchEngine {
            constructor({ reader = null, concurrency = 2, maxPacks = 200, } = {}) {
                this.reader = reader;
                this.concurrency = Math.max(1, Math.min(2, concurrency));
                this.maxPacks = Math.min(200, Math.max(1, maxPacks));
                this.entries = new Map();
                this.packs = new Map();
                this.rows = [];
                this.cache = new Map();
                this.revision = 0;
                this.closed = false;
                this.state = {
                    scope: "current",
                    currentKey: null,
                    query: "",
                    textMatch: "all",
                    selectedTags: [],
                    tagMatch: "any",
                };
                this.progress = {
                    status: "idle",
                    total: 0,
                    cached: 0,
                    loaded: 0,
                    failed: 0,
                    errors: [],
                };
            }
            setEntries(entries) {
                const next = new Map();
                for (const raw of entries) {
                    try {
                        const ref = A.CatalogSources.parseRef(raw.url || String(raw.articleId), String(raw.boardId || "98")), id = key(ref);
                        if (!next.has(id) && next.size >= this.maxPacks) {
                            continue;
                        }
                        const old = next.get(id);
                        next.set(id, {
                            ...ref,
                            title: String(raw.title || raw.name || ""),
                            source: raw.source || "direct",
                            sources: [
                                ...new Set([
                                    ...(old?.sources || []),
                                    ...(raw.sources || []),
                                    raw.source || "direct",
                                ]),
                            ],
                        });
                    }
                    catch (_) {
                        /* Never request invalid URLs. */
                    }
                }
                if (JSON.stringify([...next.keys()]) !==
                    JSON.stringify([...this.entries.keys()])) {
                    this.cancel();
                }
                this.entries = next;
                for (const id of this.packs.keys()) {
                    if (!next.has(id)) {
                        this.packs.delete(id);
                    }
                }
                this.rebuild();
            }
            remember(ref, pack, { acquiredAt = Date.now(), stale = false } = {}) {
                if (this.closed) {
                    return;
                }
                const id = key(ref);
                if (!this.entries.has(id)) {
                    if (this.entries.size >= this.maxPacks) {
                        return;
                    }
                    this.entries.set(id, {
                        ...ref,
                        title: pack.name || pack.title || "",
                        sources: [ref.source || "direct"],
                    });
                }
                this.packs.set(id, { pack, acquiredAt, stale });
                this.rebuild();
            }
            rebuild() {
                const finish = metrics?.start("library.rebuild");
                try {
                    const rows = new Map(), normalized = new Map();
                    let order = 0;
                    // 정규화 결과는 이번 재구성에서만 재사용해 새로 읽은 태그에 이전 팩의 결과가 섞이지 않게 한다.
                    const normalize = (value) => {
                        if (!normalized.has(value)) {
                            normalized.set(value, norm(value));
                        }
                        return normalized.get(value);
                    };
                    for (const [id, ref] of this.entries) {
                        const stored = this.packs.get(id);
                        if (!stored) {
                            continue;
                        }
                        const dictionary = new Map(), displayDictionary = new Map();
                        for (const tag of stored.pack.tags || []) {
                            dictionary.set(tag.id, tag.name);
                            if (!displayDictionary.has(tag.id)) {
                                displayDictionary.set(tag.id, tag.name);
                            }
                        }
                        const baseTitles = [ref.title, stored.pack.name, stored.pack.title]
                            .filter((x) => typeof x === "string" && x.trim())
                            .map(normalize), sourceTitles = new Map();
                        const sourceTitle = (icon) => {
                            const article = icon.origin?.articleId;
                            if (!sourceTitles.has(article)) {
                                sourceTitles.set(article, new Map());
                            }
                            const bySource = sourceTitles.get(article);
                            if (!bySource.has(icon.sourceId)) {
                                bySource.set(icon.sourceId, (stored.pack.sources || []).find((s) => (s.articleId && s.articleId === article) ||
                                    s.sourceId === icon.sourceId)?.title);
                            }
                            return bySource.get(icon.sourceId);
                        };
                        const displayTags = (icon) => [
                            ...new Set([
                                ...(icon.imageMetadata?.tags || []),
                                ...(icon.tagIds || [])
                                    .map((id) => displayDictionary.get(id))
                                    .filter(Boolean),
                            ]),
                        ];
                        for (const [position, icon] of (stored.pack.icons || []).entries()) {
                            const token = identity(icon, ref), source = sourceTitle(icon), titles = baseTitles.concat(typeof source === "string" && source.trim()
                                ? [normalize(source)]
                                : []);
                            const membership = {
                                packKey: id,
                                title: ref.title,
                                position,
                                kind: stored.pack.kind,
                                sources: [...(ref.sources || [ref.source || "direct"])],
                                titles,
                            };
                            const existing = rows.get(token);
                            if (existing) {
                                if (!existing.memberships.some((m) => m.packKey === id)) {
                                    existing.memberships.push(membership);
                                }
                                if (stored.acquiredAt > existing.acquiredAt) {
                                    existing.icon = icon;
                                    existing.tags = tags(icon, dictionary, normalize);
                                    existing.tagLabels = displayTags(icon);
                                    existing.acquiredAt = stored.acquiredAt;
                                }
                            }
                            else {
                                rows.set(token, {
                                    identity: token,
                                    icon,
                                    tags: tags(icon, dictionary, normalize),
                                    tagLabels: displayTags(icon),
                                    memberships: [membership],
                                    order: order++,
                                    acquiredAt: stored.acquiredAt,
                                });
                            }
                        }
                    }
                    this.rows = [...rows.values()];
                    this.cache.clear();
                    metrics?.gauge("library.rows", this.rows.length);
                }
                finally {
                    finish?.();
                }
            }
            setState(state = {}) {
                const next = { ...this.state, ...state };
                next.query = String(next.query || "");
                next.scope = next.scope === "all" ? "all" : "current";
                next.textMatch = next.textMatch === "any" ? "any" : "all";
                next.tagMatch = next.tagMatch === "all" ? "all" : "any";
                next.selectedTags = [...new Set((next.selectedTags || []).map(norm))];
                if (["query", "scope", "currentKey", "textMatch"].some((k) => next[k] !== this.state[k])) {
                    this.cancel();
                }
                this.state = next;
                return this.search();
            }
            search() {
                const finish = metrics?.start("library.search");
                try {
                    const state = this.state, cacheKey = JSON.stringify(state);
                    if (this.cache.has(cacheKey)) {
                        metrics?.count("search.hit");
                        return this.cache.get(cacheKey);
                    }
                    metrics?.count("search.miss");
                    const terms = A.queryTokens(state.query), items = [];
                    for (const row of this.rows) {
                        const memberships = row.memberships.filter((m) => state.scope === "all" || m.packKey === state.currentKey);
                        if (!memberships.length) {
                            continue;
                        }
                        if (state.selectedTags.length) {
                            const matched = state.selectedTags.map((tag) => row.tags.includes(tag));
                            if (!(state.tagMatch === "all"
                                ? matched.every(Boolean)
                                : matched.some(Boolean))) {
                                continue;
                            }
                        }
                        const titles = memberships.flatMap((m) => m.titles), scores = terms.map((term) => row.tags.includes(term)
                            ? 8
                            : row.tags.some((tag) => tag.includes(term))
                                ? 4
                                : titles.some((title) => title === term)
                                    ? 2
                                    : titles.some((title) => title.includes(term))
                                        ? 1
                                        : 0);
                        if (terms.length &&
                            !(state.textMatch === "all"
                                ? scores.every(Boolean)
                                : scores.some(Boolean))) {
                            continue;
                        }
                        items.push({
                            ...row,
                            memberships,
                            order: state.scope === "current" ? memberships[0].position : row.order,
                            score: scores.reduce((a, b) => a + b, 0),
                        });
                    }
                    items.sort((a, b) => (terms.length ? b.score - a.score : 0) || a.order - b.order);
                    const scopedKeys = [...this.entries.keys()].filter((id) => state.scope === "all" || id === state.currentKey);
                    const partial = scopedKeys.some((id) => !this.packs.has(id) || this.packs.get(id).stale) ||
                        this.progress.errors.some((error) => scopedKeys.includes(error.packKey));
                    const result = {
                        items,
                        count: items.length,
                        scope: state.scope,
                        partial,
                        progress: { ...this.progress },
                        registered: this.entries.size,
                        indexed: this.packs.size,
                        scopedRegistered: scopedKeys.length,
                        scopedIndexed: scopedKeys.filter((id) => this.packs.has(id)).length,
                    };
                    if (this.cache.size >= 32) {
                        this.cache.delete(this.cache.keys().next().value);
                    }
                    this.cache.set(cacheKey, result);
                    metrics?.gauge("library.cache", this.cache.size);
                    return result;
                }
                finally {
                    finish?.();
                }
            }
            cancel() {
                this.revision++;
                this.controller?.abort();
                this.controller = null;
                if (this.progress.status === "loading") {
                    this.progress = { ...this.progress, status: "cancelled" };
                    this.cache.clear();
                }
            }
            async collect({ refresh = false, onProgress = () => { }, } = {}) {
                this.cancel();
                if (this.closed || !this.reader) {
                    return this.search();
                }
                const controller = new AbortController();
                this.controller = controller;
                const revision = this.revision, signal = controller.signal;
                const refs = [...this.entries].filter(([id]) => this.state.scope === "all" || id === this.state.currentKey);
                this.progress = {
                    status: "loading",
                    total: refs.length,
                    cached: 0,
                    loaded: 0,
                    failed: 0,
                    errors: [],
                };
                this.cache.clear();
                const ensure = () => {
                    if (this.closed || signal.aborted || revision !== this.revision) {
                        throw abort();
                    }
                };
                const emit = () => {
                    ensure();
                    this.cache.clear();
                    onProgress(this.search());
                };
                const parallel = async (rows, action) => {
                    let cursor = 0;
                    const worker = async () => {
                        while (cursor < rows.length) {
                            ensure();
                            await action(rows[cursor++]);
                        }
                    };
                    await Promise.all(Array.from({ length: Math.min(this.concurrency, rows.length) }, worker));
                };
                // Hydrate all registered cache entries before starting slow public-page reads.
                // Cache unavailability does not make an otherwise public pack inaccessible.
                try {
                    if (!refresh) {
                        await parallel(refs, async ([id, ref]) => {
                            let cached;
                            try {
                                cached = await this.reader.getCached(ref, { signal });
                            }
                            catch (error) {
                                if (error.code === "ABORTED" ||
                                    signal.aborted) {
                                    throw abort();
                                }
                            }
                            ensure();
                            if (cached?.pack) {
                                if (!this.packs.has(id) ||
                                    cached.acquiredAt > this.packs.get(id).acquiredAt) {
                                    this.remember(ref, cached.pack, cached);
                                }
                                this.progress.cached++;
                                emit();
                            }
                        });
                    }
                    const pending = refs.filter(([id]) => refresh || !this.packs.has(id) || this.packs.get(id).stale);
                    await parallel(pending, async ([id, ref]) => {
                        try {
                            ensure();
                            if (refresh) {
                                await this.reader.invalidate(ref, { signal });
                            }
                            ensure();
                            const loaded = await this.reader.load(ref, {
                                signal,
                                forceRead: refresh,
                            });
                            ensure();
                            this.remember(ref, loaded.pack || loaded, { acquiredAt: Date.now(), stale: loaded.stale === true });
                            this.progress.loaded++;
                            emit();
                        }
                        catch (error) {
                            if (error.code === "ABORTED" || signal.aborted) {
                                throw abort();
                            }
                            ensure();
                            this.progress.failed++;
                            this.progress.errors.push({
                                packKey: id,
                                code: error.code || "READ_FAILED",
                            });
                            emit();
                        }
                    });
                    ensure();
                    this.progress.status =
                        this.progress.failed ||
                            refs.some(([id]) => this.packs.get(id)?.stale)
                            ? "partial"
                            : "complete";
                    emit();
                    return this.search();
                }
                catch (error) {
                    if (error.code !== "ABORTED") {
                        throw error;
                    }
                    if (revision === this.revision) {
                        this.progress.status = "cancelled";
                        this.cache.clear();
                    }
                    return { cancelled: true };
                }
                finally {
                    if (this.controller === controller) {
                        this.controller = null;
                    }
                }
            }
            destroy() {
                this.closed = true;
                this.cancel();
                this.entries.clear();
                this.packs.clear();
                this.rows = [];
                this.cache.clear();
            }
        }
        A.LibrarySearchEngine = LibrarySearchEngine;
        A.libraryIconIdentity = identity;
        A.libraryFixedTags = Object.freeze([
            "인사",
            "사과",
            "축하",
            "응원",
            "감사",
            "미소",
            "도발",
            "조토피아",
            "매도",
            "분노",
            "슬픔",
            "당황",
            "놀람",
        ]);
    };
    initializeIconsLibrarySearch(environment);
    return {
        icons: selectModuleExports(icons, [
            "LibrarySearchEngine",
            "libraryIconIdentity",
            "libraryFixedTags",
        ]),
    };
}
