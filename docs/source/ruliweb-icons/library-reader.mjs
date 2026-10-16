// 자동 생성: src/ruliweb-icons/library-reader.ts. tools/compile-typescript.mjs로 갱신한다.
import { defaultEnvironment, } from "../runtime/contracts.mjs";
// 공개 게시글에서 실제 태그를 읽으며 캐시 재사용·강제 새로고침의 기존 조건을 유지한다.
import { createModuleScope, selectModuleExports, } from "../runtime/module-scope.mjs";
export function createIconsLibraryReader({ environment = defaultEnvironment, dependencies = {}, metrics = null, } = {}) {
    let icons = createModuleScope(dependencies.icons, [
        "SiteAdapter",
        "BrowserAdapter",
        "feature",
        "Metadata",
        "LibraryPackReader",
    ], ["LibraryPackReader"]);
    /* 기존 공개 본문 reader와 캐시만 사용하며 사이트 비공개 API나 즐겨찾기를 변경하지 않는다. */
    const initializeIconsLibraryReader = function (_g) {
        "use strict";
        const A = (icons = icons || {});
        const fail = (code, message) => Object.assign(new Error(message), { code });
        class LibraryPackReader {
            constructor({ site = A.SiteAdapter, browser = A.BrowserAdapter, isActive = () => A.feature?.enabled === true, maxRequests = 256, } = {}) {
                Object.assign(this, {
                    site,
                    browser,
                    isActive,
                    maxRequests,
                    requests: 0,
                });
            }
            check(signal) {
                if (signal?.aborted) {
                    throw fail("ABORTED", "검색 수집을 중지했습니다.");
                }
                if (!this.isActive()) {
                    throw fail("FEATURE_DISABLED", "아이콘 기능이 비활성화되어 있습니다.");
                }
            }
            args(ref, kind, source = ref.source || "direct") {
                return {
                    boardId: String(ref.boardId),
                    articleId: String(ref.articleId),
                    catalogSource: source,
                    packKind: kind,
                    readerVersion: 2,
                };
            }
            async getCached(ref, { signal } = {}) {
                const finish = metrics?.start("reader.cache");
                try {
                    this.check(signal);
                    for (const source of ref.sources || [ref.source || "direct"]) {
                        for (const kind of ["BUNDLE", "NORMAL"]) {
                            const cached = await this.browser.requestCache("get", this.args(ref, kind, source));
                            this.check(signal);
                            const pack = cached?.snapshot?.pack;
                            if (pack?.icons?.length) {
                                metrics?.count("cache.hit");
                                return {
                                    pack,
                                    acquiredAt: cached.acquiredAt || 0,
                                    stale: cached.stale === true ||
                                        (pack.kind === "NORMAL" &&
                                            pack.bodyCounts?.tagErrors > 0) ||
                                        cached.snapshot?.sourceCheck?.status === "partial" ||
                                        cached.snapshot?.sourceCheck?.states?.some((s) => s.metadataReadError ||
                                            s.tagErrors ||
                                            s.ambiguousMetadata) ||
                                        (pack.kind === "BUNDLE" &&
                                            (pack.attributeReaderVersion !== 2 ||
                                                pack.mediaReaderVersion !== 1)),
                                };
                            }
                        }
                    }
                    metrics?.count("cache.miss");
                    return null;
                }
                finally {
                    finish?.();
                }
            }
            async invalidate(ref, { signal } = {}) {
                for (const source of ref.sources || [ref.source || "direct"]) {
                    for (const kind of ["NORMAL", "BUNDLE"]) {
                        this.check(signal);
                        await this.browser.requestCache("invalidate", this.args(ref, kind, source));
                    }
                }
            }
            async load(ref, { signal, forceRead = false, } = {}) {
                const read = async (articleId, options = {}) => {
                    this.check(signal);
                    if (++this.requests > this.maxRequests) {
                        throw fail("REQUEST_LIMIT", "검색의 공개 글 조회 상한에 도달했습니다.");
                    }
                    const finish = metrics?.start("reader.network");
                    try {
                        const doc = await this.site.getPublicDocument(articleId, {
                            ...options,
                            boardId: String(ref.boardId),
                            signal,
                            forceRead,
                        });
                        this.check(signal);
                        return doc;
                    }
                    finally {
                        finish?.();
                    }
                };
                const doc = await read(ref.articleId), body = doc.querySelector('.view_content[itemprop="articleBody"],.view_content article');
                if (!body) {
                    throw fail("ARTICLE_UNAVAILABLE", "공개 본문을 읽을 수 없습니다.");
                }
                const parsed = String(ref.boardId) === "98"
                    ? await A.Metadata.parseDocument(body, {
                        articleId: ref.articleId,
                        boardId: 98,
                    })
                    : { pack: null };
                this.check(signal);
                let pack = parsed.pack;
                if (pack && parsed.v1Slaves?.length) {
                    const verification = await this.site.verifyReferences(parsed, {
                        signal,
                        readDocument: read,
                    });
                    this.check(signal);
                    if (verification.status !== "complete") {
                        throw fail("REFERENCE_UNAVAILABLE", "일부 원본 글을 확인하지 못했습니다.");
                    }
                    pack = { ...pack, attributeReaderVersion: 2, mediaReaderVersion: 1 };
                }
                const observedTitle = doc
                    .querySelector(".subject_text,.subject,.view_content h1")
                    ?.textContent?.trim()
                    .slice(0, 120);
                if (!pack) {
                    pack = this.site.readArticlePack(doc, ref.articleId, observedTitle || ref.title, String(ref.boardId)).pack;
                }
                this.check(signal);
                if (!pack.icons?.length) {
                    throw fail("EMPTY_PACK", "읽을 수 있는 아이콘이 없습니다.");
                }
                try {
                    await this.browser.requestCache("put", {
                        ...this.args(ref, pack.kind),
                        snapshot: { pack },
                        rawMetadata: parsed.rawMetadata,
                    });
                }
                catch (error) {
                    this.check(signal); /* Cache unavailable: still return the actual public model. */
                }
                return {
                    pack,
                    stale: pack.kind === "NORMAL" && pack.bodyCounts?.tagErrors > 0,
                };
            }
        }
        A.LibraryPackReader = LibraryPackReader;
    };
    initializeIconsLibraryReader(environment);
    return { icons: selectModuleExports(icons, ["LibraryPackReader"]) };
}
