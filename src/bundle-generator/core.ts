import type { DynamicApi, RuntimeEnvironment } from "../runtime/contracts.ts";
import type { Icon } from "../ruliweb-icons/models.ts";
import {
  defaultEnvironment,
  type FactoryOptions,
} from "../runtime/contracts.ts";
import type {
  BundleValue,
  SourceSummary,
  DraftRow,
  DraftSnapshot,
} from "./models.ts";
// 통합팩의 원문·알 수 없는 필드·참조 순서를 보존하며 변경 계획을 만든다.
import {
  createModuleScope,
  selectModuleExports,
} from "../runtime/module-scope.ts";

export function createBundleCore({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const { TextEncoder, TextDecoder, URL } = environment;

  const fetch =
    typeof environment.fetch === "function"
      ? (...args: Parameters<RuntimeEnvironment["fetch"]>) =>
          environment.fetch(...args)
      : undefined;

  let bundle = createModuleScope(
    dependencies.bundle,
    [],
    [
      "fail",
      "clone",
      "articleUrl",
      "validate",
      "existing",
      "encode",
      "preserveUnknown",
      "Draft",
      "readPublicDocument",
      "SourceReader",
    ],
  );
  let icons = createModuleScope(
    dependencies.icons,
    ["Metadata", "SiteAdapter"],
    [],
  );

  const initializeBundleCore = function (g: typeof defaultEnvironment) {
    "use strict";
    const B = (bundle = bundle || {}),
      M = icons.Metadata;
    const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
    function fail(code: string, message: string): never {
      throw Object.assign(new Error(message), { code });
    }
    function articleUrl(value: string) {
      if (
        typeof value !== "string" ||
        value.length > 2048 ||
        /[\u0000-\u0020\u007f\\]/u.test(value)
      ) {
        fail("URL_INVALID", "공개 아이콘 게시글 URL을 입력해 주세요.");
      }
      let u;
      try {
        u = new URL(value);
      } catch (_) {
        fail("URL_INVALID", "올바른 게시글 URL이 아닙니다.");
      }
      if (
        u.protocol !== "https:" ||
        !["bbs.ruliweb.com", "m.ruliweb.com"].includes(u.hostname) ||
        u.username ||
        u.password ||
        u.port
      ) {
        fail("URL_INVALID", "루리웹 HTTPS 공개 게시글만 지원합니다.");
      }
      const match = u.pathname.match(
        /^\/community\/board\/98\/read\/([1-9]\d*)\/?$/,
      );
      if (!match || !Number.isSafeInteger(Number(match[1]))) {
        fail(
          "BOARD_UNSUPPORTED",
          "ruricon:v1 통합팩은 아이콘 공유 게시판(98)의 글만 참조할 수 있습니다.",
        );
      }
      const articleId = Number(match[1]);
      return { boardId: 98, articleId, url: M.publicArticleUrl(articleId) };
    }
    function validate(value: BundleValue) {
      M.validateV1(value, { allowUnbound: true });
      if (
        new Set(value.slaves.map((s) => s.articleId)).size !==
        value.slaves.length
      ) {
        fail(
          "DUPLICATE_REFERENCE",
          "동일 글을 여러 페이지로 나눈 기존 통합팩은 안전한 편집을 지원하지 않습니다. 원본을 유지합니다.",
        );
      }
      if (value.slaves.some((s) => s.articleId === value.mainArticleId)) {
        fail("SELF_REFERENCE", "대표 게시글을 원본으로 참조할 수 없습니다.");
      }
      return value;
    }
    function existing(root: ParentNode) {
      const markers = [...root.querySelectorAll("[data-meta]")].filter((n) =>
        /^(ruricon|aru-icons):/.test(n.getAttribute("data-meta")!),
      );
      if (markers.some((n) => n.getAttribute("data-meta") !== "ruricon:v1")) {
        fail(
          "FORMAT_UNSUPPORTED",
          "v2 또는 알 수 없는 메타데이터가 있습니다. 기존 필드를 보존하기 위해 적용을 중단합니다.",
        );
      }
      const carriers = M.readDocumentCarriers(root);
      if (!markers.length) {
        return null;
      }
      if (markers.length !== 1 || carriers.v1.length !== 1) {
        fail(
          "CARRIER_DUPLICATE",
          "BUNDLE 메타데이터가 중복되거나 불완전합니다. 자동으로 합치지 않습니다.",
        );
      }
      return validate(M.decodeCarrier(carriers.v1[0]).value);
    }
    function encode(value: BundleValue) {
      validate(value);
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      if (bytes.length > M.LIMITS.decodedBytes) {
        fail(
          "RESOURCE_LIMIT",
          "통합팩 메타데이터가 v1의 1MB 상한을 넘었습니다.",
        );
      }
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return g
        .btoa(binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
    }
    function preserveUnknown(before: BundleValue | null, after: BundleValue) {
      const known = new Set([
        "version",
        "name",
        "boardId",
        "mainArticleId",
        "slaves",
      ]);
      for (const key of Object.keys(before || {})) {
        if (
          !known.has(key) &&
          JSON.stringify(before![key]) !== JSON.stringify(after[key])
        ) {
          fail(
            "UNKNOWN_FIELD_CHANGED",
            "알 수 없는 기존 최상위 필드를 변경할 수 없습니다: " + key,
          );
        }
      }
      for (const old of before?.slaves || []) {
        const next = after.slaves.find((s) => s.articleId === old.articleId);
        if (!next) {
          continue;
        }
        if (next.page !== old.page) {
          fail("PAGE_CHANGED", "기존 참조의 page 식별값을 변경할 수 없습니다.");
        }
        for (const key of Object.keys(old)) {
          if (
            !["page", "articleId", "images"].includes(key) &&
            JSON.stringify(old[key]) !== JSON.stringify(next[key])
          ) {
            fail(
              "UNKNOWN_FIELD_CHANGED",
              "알 수 없는 기존 참조 필드를 변경할 수 없습니다: " + key,
            );
          }
        }
      }
    }
    class Draft {
      declare base: BundleValue | null;
      declare name: string;
      declare rows: DraftRow[];
      constructor(value: BundleValue | null = null) {
        this.base = value ? clone(validate(value)) : null;
        this.name = value?.name || "";
        this.rows = (value?.slaves || []).map((s) => ({
          slave: clone(s),
          summary: null,
        }));
      }
      add(summary: SourceSummary) {
        if (this.rows.some((r) => r.slave.articleId === summary.articleId)) {
          fail(
            "DUPLICATE_REFERENCE",
            "이미 추가한 게시글입니다. PC·모바일 주소는 같은 글로 처리합니다.",
          );
        }
        if (this.rows.length >= M.LIMITS.sources) {
          fail("RESOURCE_LIMIT", "참조 글은 최대 512개입니다.");
        }
        if (this.base?.mainArticleId === summary.articleId) {
          fail("SELF_REFERENCE", "대표 게시글을 원본으로 참조할 수 없습니다.");
        }
        const used = new Set(this.rows.map((r) => r.slave.page));
        let page = 1;
        while (used.has(page)) {
          page++;
        }
        this.rows.push({
          slave: {
            page,
            articleId: summary.articleId,
            images: [...summary.urls],
          },
          summary: clone(summary),
        });
      }
      remove(index: number) {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= this.rows.length
        ) {
          fail("ROW_INVALID", "참조 항목이 바뀌었습니다.");
        }
        this.rows.splice(index, 1);
      }
      move(from: number, to: number) {
        if (
          !Number.isInteger(from) ||
          !Number.isInteger(to) ||
          from < 0 ||
          to < 0 ||
          from >= this.rows.length ||
          to >= this.rows.length
        ) {
          fail("ROW_INVALID", "이동할 참조를 확인해 주세요.");
        }
        const row = this.rows.splice(from, 1)[0];
        this.rows.splice(to, 0, row);
      }
      refresh(summary: SourceSummary) {
        const row = this.rows.find(
          (r) => r.slave.articleId === summary.articleId,
        );
        if (!row) {
          fail("ROW_INVALID", "제거된 참조입니다.");
        }
        row.summary = clone(summary);
        row.slave.images = [...summary.urls];
      }
      value(mainArticleId: number | null) {
        if (
          mainArticleId === null &&
          (this.base?.mainArticleId as number) > 0
        ) {
          fail(
            "ARTICLE_ID_PENDING",
            "다른 대표 글의 구성은 해당 글의 수정 화면에서 적용해 주세요.",
          );
        }
        if (mainArticleId === null) {
          mainArticleId = 0;
        }
        if (!Number.isSafeInteger(mainArticleId) || mainArticleId < 0) {
          fail("ARTICLE_ID_PENDING", "대표 글 번호를 확인할 수 없습니다.");
        }
        if (
          (this.base?.mainArticleId as number) > 0 &&
          this.base!.mainArticleId !== mainArticleId
        ) {
          fail(
            "ARTICLE_ID_MISMATCH",
            "현재 수정 글과 기존 메타데이터의 대표 글 번호가 다릅니다.",
          );
        }
        const value = this.base
          ? clone(this.base)
          : ({ version: 1, boardId: 98 } as BundleValue);
        value.name = this.name.trim();
        value.mainArticleId = mainArticleId;
        value.slaves = this.rows.map((r) => clone(r.slave));
        validate(value);
        preserveUnknown(this.base, value);
        return value;
      }
      snapshot() {
        return {
          format: "aru-bundle-local-draft",
          version: 1,
          base: clone(this.base),
          name: this.name,
          rows: clone(this.rows),
        };
      }
      static restore(saved: DraftSnapshot) {
        if (
          saved?.format !== "aru-bundle-local-draft" ||
          saved.version !== 1 ||
          !Array.isArray(saved.rows) ||
          saved.rows.length > M.LIMITS.sources
        ) {
          fail("DRAFT_INVALID", "저장한 초안 형식을 확인할 수 없습니다.");
        }
        const draft = new Draft(saved.base);
        draft.name = String(saved.name || "");
        draft.rows = clone(saved.rows);
        const probe = {
          version: 1,
          boardId: 98,
          name: draft.name.trim() || "초안",
          mainArticleId: draft.base?.mainArticleId || Number.MAX_SAFE_INTEGER,
          slaves: draft.rows.map((r) => r.slave),
        };
        if (probe.slaves.length) {
          validate(probe);
        }
        return draft;
      }
    }
    // 조회한 HTML은 문서에 붙이지 않는 template 안에서 파싱한다.
    // 미디어·iframe 요청이 시작되지 않도록 template 내용을 페이지에 연결하지 않는다.
    async function readPublicDocument(
      articleId: number,
      {
        signal,
        origin = g.location.origin,
        fetchFn = g.fetch,
        timeoutMs = 10000,
      }: {
        signal?: AbortSignal;
        origin?: string;
        fetchFn?: typeof fetch;
        timeoutMs?: number;
      } = {},
    ) {
      const url = icons.SiteAdapter.readPath(articleId, origin, "98"),
        controller = new g.AbortController(),
        abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) {
        abort();
      }
      const timer = g.setTimeout(abort, timeoutMs);
      try {
        const response = await fetchFn(url, {
          method: "GET",
          credentials: "same-origin",
          mode: "same-origin",
          redirect: "error",
          cache: "no-cache",
          signal: controller.signal,
        });
        if (response.redirected || (response.url && response.url !== url)) {
          fail("READ_REDIRECT", "공개 글 주소가 변경되어 조회를 중단했습니다.");
        }
        if (!response.ok) {
          fail(
            [401, 403, 429].includes(response.status)
              ? "ACCESS_DENIED"
              : "READ_FAILED",
            "원본 글 조회 실패 (HTTP " +
              response.status +
              "). 삭제·접근 제한 여부를 원본에서 확인해 주세요.",
          );
        }
        const limit = 3 * 1024 * 1024;
        if (Number(response.headers?.get("content-length")) > limit) {
          fail("RESOURCE_LIMIT", "공개 본문 응답이 3MB 상한을 넘었습니다.");
        }
        let html = "";
        if (response.body?.getReader) {
          const reader = response.body.getReader(),
            decoder = new TextDecoder();
          let bytes = 0;
          try {
            while (true) {
              const r = await reader.read();
              if (r.done) {
                break;
              }
              bytes += r.value.byteLength;
              if (bytes > limit) {
                await reader.cancel();
                fail(
                  "RESOURCE_LIMIT",
                  "공개 본문 응답이 3MB 상한을 넘었습니다.",
                );
              }
              html += decoder.decode(r.value, { stream: true });
            }
            html += decoder.decode();
          } finally {
            reader.releaseLock();
          }
        } else {
          html = await response.text();
          if (new TextEncoder().encode(html).length > limit) {
            fail("RESOURCE_LIMIT", "공개 본문 응답이 3MB 상한을 넘었습니다.");
          }
        }
        const template = g.document.createElement("template");
        template.innerHTML = html;
        if (
          !template.content.querySelector(
            '.view_content[itemprop="articleBody"],.view_content article',
          )
        ) {
          fail(
            "READ_UNAVAILABLE",
            "공개 본문이 없습니다. 삭제·로그인 요구·접근 제한 여부를 원본에서 확인해 주세요.",
          );
        }
        return template.content;
      } catch (e) {
        if (controller.signal.aborted) {
          fail(
            signal?.aborted ? "ABORTED" : "TIMEOUT",
            signal?.aborted
              ? "조회를 취소했습니다."
              : "조회 시간이 초과되었습니다.",
          );
        }
        throw e;
      } finally {
        g.clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    }
    class SourceReader {
      declare site: DynamicApi;
      declare origin: string;
      declare readDocument: typeof readPublicDocument;
      declare pending: Map<
        number,
        { promise: Promise<SourceSummary>; controller: AbortController }
      >;
      declare stopped: boolean;
      constructor({
        site = icons.SiteAdapter,
        origin = g.location.origin,
        readDocument = readPublicDocument,
      } = {}) {
        this.site = site;
        this.origin = origin;
        this.readDocument = readDocument;
        this.pending = new Map();
        this.stopped = false;
      }
      read(url: string, { signal }: { signal?: AbortSignal } = {}) {
        if (this.stopped) {
          return Promise.reject(
            Object.assign(new Error("생성기를 다시 열어 주세요."), {
              code: "ABORTED",
            }),
          );
        }
        const ref = articleUrl(url);
        if (this.pending.has(ref.articleId)) {
          return this.pending.get(ref.articleId)!.promise;
        }
        const controller = new g.AbortController(),
          abort = () => controller.abort();
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) {
          abort();
        }
        const readSourceDocument = async () => {
          const doc = await this.readDocument(ref.articleId, {
            origin: this.origin,
            signal: controller.signal,
          });
          if (controller.signal.aborted) {
            fail("ABORTED", "조회를 취소했습니다.");
          }
          const body = this.site.findArticleBody(doc).element;
          const parsed = await M.parseDocument(body, {
            articleId: ref.articleId,
            boardId: 98,
          });
          if (parsed.kind === "BUNDLE" || parsed.limited) {
            fail(
              "SOURCE_UNSUPPORTED",
              "통합팩이나 잘못된 메타데이터를 원본으로 중첩 참조할 수 없습니다. 개별 NORMAL 글을 사용해 주세요.",
            );
          }
          const titleNode =
            doc.querySelector(".subject_text") ||
            doc.querySelector(".subject") ||
            body.querySelector("h1");
          const title =
            titleNode?.textContent?.trim().slice(0, 120) ||
            "원본 글 " + ref.articleId;
          const result = this.site.readArticlePack(
              doc,
              ref.articleId,
              title,
              "98",
            ),
            icons: (Icon & { url: string })[] = result.pack.icons;
          if (!icons.length) {
            fail("SOURCE_EMPTY", "다운로드 가능한 아이콘이 없는 게시글입니다.");
          }
          const urls = icons.map((x) => x.url);
          const imageIcons = icons.filter((x: Icon) => x.mediaKind !== "video"),
            videoIcons = icons.filter((x) => x.mediaKind === "video");
          return {
            ...ref,
            title,
            urls,
            icons: icons.length,
            images: imageIcons.length,
            videos: videoIcons.length,
            bodyImages: body.querySelectorAll("img").length,
            bodyVideos: body.querySelectorAll("video").length,
            hasMetadata: !!body.querySelector(
              "[data-aru-id],[data-aru-tags],[data-meta]",
            ),
            taggedIcons: icons.filter((x) => x.imageMetadata?.tags?.length)
              .length,
            thumbnail: imageIcons[0]?.url || null,
            excluded: result.counts.excluded,
            duplicates: result.counts.duplicates,
          };
        };
        const promise = readSourceDocument().finally(() => {
          this.pending.delete(ref.articleId);
          signal?.removeEventListener("abort", abort);
        });
        this.pending.set(ref.articleId, { promise, controller });
        return promise;
      }
      cancel() {
        for (const p of this.pending.values()) {
          p.controller.abort();
        }
      }
      destroy() {
        this.stopped = true;
        this.cancel();
      }
    }
    Object.assign(B, {
      fail,
      clone,
      articleUrl,
      validate,
      existing,
      encode,
      preserveUnknown,
      Draft,
      readPublicDocument,
      SourceReader,
    });
  };
  initializeBundleCore(environment);

  return {
    bundle: selectModuleExports(bundle, [
      "fail",
      "clone",
      "articleUrl",
      "validate",
      "existing",
      "encode",
      "preserveUnknown",
      "Draft",
      "readPublicDocument",
      "SourceReader",
    ]),
  };
}
