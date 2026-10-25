import { parsePixivFilenameUrl } from "../../source-caption/pixiv-filename.ts";
import type { ParsedSourceResult } from "../../upload-attribution/models.ts";
import type { DefaultValues } from "../../runtime/contracts.ts";
import {
  hasPngSignature,
  parsePngItxtChunks,
  parseItxtChunk,
} from "../../source-caption/png-chunks.ts";
import type { CodedError } from "../../runtime/contracts.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../../runtime/contracts.ts";
// 브라우저별 기존 초기화·저장 키·사용자 설정과 이벤트 계약을 유지한다.
import { createModuleScope } from "../../runtime/module-scope.ts";

export function installFirefoxContent({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const window = environment.window ?? environment;
  const {
    document,
    location,
    navigator,
    chrome,
    MutationObserver,
    HTMLElement,
    TextDecoder,
    URL,
    exifr,
    console,
  } = environment;
  const setTimeout =
    typeof environment.setTimeout === "function"
      ? (...args: Parameters<RuntimeEnvironment["setTimeout"]>) =>
          environment.setTimeout(...args)
      : undefined;
  const setInterval =
    typeof environment.setInterval === "function"
      ? (...args: Parameters<RuntimeEnvironment["setInterval"]>) =>
          environment.setInterval(...args)
      : undefined;
  const clearInterval =
    typeof environment.clearInterval === "function"
      ? (...args: Parameters<RuntimeEnvironment["clearInterval"]>) =>
          environment.clearInterval(...args)
      : undefined;

  let attribution = createModuleScope(
    dependencies.attribution,
    ["Controller"],
    [],
  );

  // 파일 선택의 출처와 작성기 이미지의 대응 근거가 확인된 경우에만 캡션을 삽입한다.
  // 브라우저별 판독 우선순위와 기존 설정·저장 태그 정책은 각 판독 경계에서 유지한다.
  //
  // 절대 규칙:
  //   - innerHTML / outerHTML / insertAdjacentHTML 사용 금지.
  //   - eval / new Function 사용 금지.
  //   - "출처 없음" placeholder 절대 삽입 금지.
  //   - 페이지 상단의 출처 입력란은 절대 건드리지 않는다.
  //   - 파일별 대응 또는 가능한 모든 출처의 일치를 확인한다. img.src나 업로드 순서로 추측하지 않는다.
  //   - URL이 없거나 unsafe면 본문에 아무것도 삽입하지 않는다.

  const runBootstrap1 = function bootstrap() {
    "use strict";

    // 동기 boot 로그 — async init() 이전에 즉시 실행.
    // Console에 이 로그가 없으면 manifest content_scripts.matches/host_permissions 누락이 원인.
    console.log("[Aru Source Captioner] content script loaded", {
      href: location.href,
    });

    const DEFAULT_OPTIONS = Object.freeze({
      enabled: true,
      allowHttp: false,
      strictAllowlist: false,
      allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
      ruliwebAiRevealMode: "off",
      ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
      ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"],
    });
    type Options = DefaultValues<typeof DEFAULT_OPTIONS>;

    const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

    const TEXT_FIELDS_FOR_JSON = [
      "UserComment",
      "userComment",
      "Comment",
      "Description",
      "ImageDescription",
    ];

    const WALK_MAX_DEPTH = 10;

    let uploadAttribution: {
      select: (arg0: any, arg1: any) => any;
      destroy: () => any;
    } | null = null;
    const handledFileEvents = new WeakSet();

    function isMobileAutoInsertEnvironment() {
      try {
        return (
          /Android/i.test(navigator.userAgent || "") ||
          (window.innerWidth < 768 &&
            window.matchMedia?.("(pointer: coarse)").matches === true)
        );
      } catch (_) {
        return false;
      }
    }

    // 저장소 가용성이나 callback 오류 때문에 기존 기본값의 초기화까지 중단하지 않는다.

    // chrome.storage.sync 가용성 검증 — 모든 체인을 명시적 &&로 검증한다.
    // optional chaining(`?.`)만으로는 일부 환경(특히 content script가 격리된
    // realm에서 chrome 객체가 frozen / partial인 경우)에서 placement에 따라
    // 여전히 throw할 수 있다는 보고가 있어, 한 단계씩 typeof + 명시적 &&로
    // 검증하여 어느 한 단계라도 missing이면 false를 반환한다.
    function isChromeStorageSyncAvailable() {
      try {
        if (typeof chrome === "undefined") {
          return false;
        }
        if (!chrome) {
          return false;
        }
        if (!chrome.storage) {
          return false;
        }
        if (!chrome.storage.sync) {
          return false;
        }
        if (typeof chrome.storage.sync.get !== "function") {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    function loadConfig(): Promise<Options> {
      return new Promise<Options>((resolve) => {
        // 권한 회수·확장 재로드 중에는 storage가 없을 수 있어 기본값으로 나머지 기능의 초기화를 유지한다.

        try {
          if (!isChromeStorageSyncAvailable()) {
            console.warn(
              "[Aru Source Captioner] chrome.storage.sync unavailable — using default options",
            );
            resolve({ ...DEFAULT_OPTIONS });
            return;
          }
          chrome.storage.sync.get(null, (items: Record<string, unknown>) => {
            // chrome이 inject한 callback 내부에서 throw가 새어나가면 unhandled
            // promise/error로 page에 노출되므로 callback 전체를 try/catch로 감싼다.
            try {
              // chrome.runtime이 없는 경우(예: extension context invalidated)에도
              // throw하지 않도록 명시적 &&로 검증한다.
              if (
                typeof chrome !== "undefined" &&
                chrome &&
                chrome.runtime &&
                chrome.runtime.lastError
              ) {
                console.warn(
                  "[Aru Source Captioner] storage.get failed, falling back to defaults:",
                  chrome.runtime.lastError.message,
                );
                resolve({ ...DEFAULT_OPTIONS });
                return;
              }
              const merged: Options & Record<string, unknown> = {
                ...DEFAULT_OPTIONS,
              };
              const safeItems = items && typeof items === "object" ? items : {};
              for (const key of Object.keys(DEFAULT_OPTIONS)) {
                if (key in safeItems) {
                  merged[key] = safeItems[key];
                }
              }
              resolve(merged);
            } catch (callbackErr) {
              console.warn(
                "[Aru Source Captioner] storage.get callback threw, falling back to defaults:",
                callbackErr,
              );
              resolve({ ...DEFAULT_OPTIONS });
            }
          });
        } catch (err) {
          console.warn(
            "[Aru Source Captioner] loadConfig threw, falling back to defaults:",
            err,
          );
          resolve({ ...DEFAULT_OPTIONS });
        }
      });
    }

    // ---------------- 파일 입력 감지 ----------------

    function publishUploadStatus(snapshot: {
      state: string;
      selected: number;
    }) {
      const value = JSON.stringify(snapshot);
      if (document.documentElement.dataset.aruUploadDiagnostic !== value) {
        document.documentElement.dataset.aruUploadDiagnostic = value;
      }
    }

    function attachFileInputListeners(_config: Options) {
      document.addEventListener(
        "change",
        async (ev) => {
          const target = ev.target;
          if (
            !(target instanceof HTMLInputElement) ||
            target.type !== "file" ||
            !target.files?.length
          ) {
            return;
          }
          if (handledFileEvents.has(ev)) {
            return;
          }
          handledFileEvents.add(ev);
          const images = Array.from(target.files).filter((file) =>
            file?.type?.startsWith("image/"),
          );
          if (!images.length) {
            return;
          }
          await handleSelectedImageFiles(images, target);
        },
        true,
      );
    }

    async function handleSelectedImageFiles(
      files: string | any[],
      input: HTMLInputElement,
    ) {
      if (uploadAttribution) {
        await uploadAttribution.select(files, input);
      } else {
        publishUploadStatus({
          state: "editor-unavailable",
          selected: files.length,
        });
      }
    }
    const ARU_ITXT_KEYWORD = "AruArchive";
    const ARU_PAYLOAD_URL_KEYS = ["artwork_url", "source_url", "artworkUrl"];

    function isPngFile(file: { type: string; name: string }) {
      if (!file) {
        return false;
      }
      if (typeof file.type === "string" && file.type === "image/png") {
        return true;
      }
      if (typeof file.name === "string" && /\.png$/i.test(file.name)) {
        return true;
      }
      return false;
    }

    function decodeAruPayloadFromItxtText(
      textBytes: Uint8Array,
    ): ParsedSourceResult {
      let jsonText;
      try {
        jsonText = new TextDecoder("utf-8", { fatal: false }).decode(textBytes);
      } catch {
        return { status: "error", url: null, reason: "png_itxt_invalid_chunk" };
      }

      let payload;
      try {
        payload = JSON.parse(jsonText);
      } catch {
        return {
          status: "error",
          url: null,
          reason: "png_itxt_json_parse_failed",
        };
      }

      return extractSourceFromAruArchivePayload(payload);
    }

    async function parseAruArchivePngItxt(
      file: File,
    ): Promise<ParsedSourceResult> {
      let buffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        return { status: "error", url: null, reason: "arraybuffer_failed" };
      }

      if (!hasPngSignature(buffer)) {
        return {
          status: "missing",
          url: null,
          reason: "png_itxt_invalid_signature",
        };
      }

      for (const chunkBytes of parsePngItxtChunks(buffer)) {
        const itxt = parseItxtChunk(chunkBytes);
        if (!itxt) {
          continue;
        }
        if (itxt.keyword !== ARU_ITXT_KEYWORD) {
          continue;
        }

        if (itxt.compressionFlag !== 0) {
          return {
            status: "missing",
            url: null,
            reason: "png_itxt_compressed_unsupported",
          };
        }

        return decodeAruPayloadFromItxtText(itxt.textBytes);
      }

      return { status: "missing", url: null, reason: "png_itxt_missing" };
    }

    function extractSourceFromAruArchivePayload(payload: {
      [x: string]: any;
      artwork_id: any;
    }): ParsedSourceResult {
      if (!payload || typeof payload !== "object") {
        return { status: "missing", url: null, reason: "png_itxt_no_url" };
      }

      for (const key of ARU_PAYLOAD_URL_KEYS) {
        const v = payload[key];
        if (typeof v === "string" && v.trim().length > 0) {
          const t = v.trim();
          // /users/ URL은 작가 페이지 — 작품 출처로 사용하지 않는다.
          if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
            return { status: "ok", url: t, reason: "png_itxt_source_found" };
          }
        }
      }

      // artwork_id가 숫자 Pixiv ID면 작품 URL 생성.
      const artworkId = (payload.artwork_id || "").trim();
      if (/^\d{6,12}$/.test(artworkId)) {
        return {
          status: "ok",
          url: `https://www.pixiv.net/artworks/${artworkId}`,
          reason: "png_itxt_artwork_id_fallback",
        };
      }

      return { status: "missing", url: null, reason: "png_itxt_no_url" };
    }

    // ---------------- 메타데이터 파싱 ----------------

    async function parseSourceFromFile(
      file: File,
      { allowLooseFilenameFallback = true } = {},
    ): Promise<ParsedSourceResult> {
      // PNG 우선: Aru Archive 데스크톱 앱이 PNG에 비표준 iTXt(keyword="AruArchive")로
      // JSON 메타데이터를 저장하는데, exifr는 이를 인식하지 못한다. PNG 파일이면
      // 직접 파서를 먼저 시도하고, 성공 시 즉시 반환한다. 실패(missing/error)는
      // silent fallback으로 기존 exifr 흐름을 그대로 탄다.
      if (isPngFile(file)) {
        const aruResult = await parseAruArchivePngItxt(file);
        if (aruResult.status === "ok") {
          return aruResult;
        }
        if (aruResult.status === "error") {
          console.debug(
            "[Aru Source Captioner] png itxt fallback to exifr:",
            file.name,
            aruResult.reason,
          );
        }
      }

      // Android의 숫자 임시 파일명을 작품 ID로 오인하지 않도록 Pixiv 표식이 있는 이름만 우선 판독한다.
      {
        const filenameUrl = parsePixivFilenameUrl(file.name);
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename parsed (priority 2)", {
            fileName: file.name,
            url: filenameUrl,
          });
          return { status: "ok", url: filenameUrl, reason: "filename_parsed" };
        }
      }

      if (
        typeof exifr === "undefined" ||
        !exifr ||
        typeof exifr.parse !== "function"
      ) {
        const filenameUrl = allowLooseFilenameFallback
          ? parsePixivFilenameUrl(file.name)
          : null;
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
            fileName: file.name,
            url: filenameUrl,
            reason: "exifr_unavailable",
          });
          return {
            status: "ok",
            url: filenameUrl,
            reason: "filename_fallback",
          };
        }
        return { status: "error", url: null, reason: "exifr_unavailable" };
      }

      // WebP의 메타데이터 파싱 실패는 출처 없음으로 처리해 다른 이미지의 캡션 흐름을 유지한다.
      const isWebp =
        (typeof file.type === "string" && file.type === "image/webp") ||
        (typeof file.name === "string" && /\.webp$/i.test(file.name));

      let metadata;
      try {
        // Firefox의 FileReader 결과는 다른 realm의 ArrayBuffer일 수 있어 exifr의 청크 instanceof 검사와 충돌한다.
        // 전체 읽기는 공식 BlobReader 경로를 유지하면서 해당 청크 복사 단계를 거치지 않는다.
        metadata = await exifr.parse(file, {
          chunked: false,
          xmp: true,
          exif: true,
          iptc: true,
          userComment: true,
        });
      } catch (err) {
        console.warn(
          "[Aru Source Captioner] exifr.parse failed —",
          `name=${file.name} type=${file.type || "unknown"} size=${file.size}B isWebp=${isWebp}`,
          (err as CodedError).message || err,
        );
        const filenameUrl = allowLooseFilenameFallback
          ? parsePixivFilenameUrl(file.name)
          : null;
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
            fileName: file.name,
            url: filenameUrl,
            reason: "exifr_parse_failed",
          });
          return {
            status: "ok",
            url: filenameUrl,
            reason: "filename_fallback",
          };
        }
        if (isWebp) {
          return { status: "missing", url: null, reason: "webp_no_exif" };
        }
        return { status: "error", url: null, reason: "metadata_parse_failed" };
      }

      if (!metadata || typeof metadata !== "object") {
        const filenameUrl = allowLooseFilenameFallback
          ? parsePixivFilenameUrl(file.name)
          : null;
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
            fileName: file.name,
            url: filenameUrl,
            reason: "no_metadata",
          });
          return {
            status: "ok",
            url: filenameUrl,
            reason: "filename_fallback",
          };
        }
        return { status: "missing", url: null, reason: "no_metadata" };
      }

      const candidates = extractSourceUrl(metadata);
      if (candidates.length === 0) {
        const filenameUrl = allowLooseFilenameFallback
          ? parsePixivFilenameUrl(file.name)
          : null;
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
            fileName: file.name,
            url: filenameUrl,
            reason: "no_url_candidates",
          });
          return {
            status: "ok",
            url: filenameUrl,
            reason: "filename_fallback",
          };
        }
        return { status: "missing", url: null, reason: "no_url_candidates" };
      }

      return { status: "ok", url: candidates[0], reason: "ok" };
    }

    // Pixiv 작가 페이지 URL 여부 판정.
    // /users/{id} 경로는 작품 출처로 쓸 수 없다 — 작가 페이지일 뿐이다.
    function isPixivUserUrl(s: string) {
      if (typeof s !== "string") {
        return false;
      }
      try {
        const u = new URL(s);
        return (
          (u.hostname === "www.pixiv.net" || u.hostname === "pixiv.net") &&
          /^\/users\/\d+/.test(u.pathname)
        );
      } catch {
        return false;
      }
    }

    function extractSourceUrl(metadata: { [x: string]: any }) {
      if (!metadata || typeof metadata !== "object") {
        return [];
      }
      const candidates: string[] = [];

      // 우선순위 1·2·3: AruArchive JSON (artwork_url / source_url / artwork_id)
      collectFromPossibleAruJson(metadata, candidates);

      // 우선순위 4: XMP dc:Source — URL 형식이고 /users/ 가 아닌 경우만 허용
      for (const key of ["Source", "source"]) {
        const v = metadata[key];
        if (typeof v === "string") {
          const t = v.trim();
          if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
            candidates.push(t);
          }
        }
      }

      // 우선순위 5: XMP dc:Identifier — URL 형식이거나 숫자 Pixiv ID면 허용.
      // bare hash / 일반 문자열은 제외한다.
      for (const key of ["Identifier", "identifier"]) {
        const v = metadata[key];
        if (typeof v === "string") {
          const t = v.trim();
          if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
            candidates.push(t);
          } else if (/^\d{6,12}$/.test(t)) {
            // 숫자 Pixiv artwork_id를 Identifier로 기록한 경우 URL 생성
            candidates.push(`https://www.pixiv.net/artworks/${t}`);
          }
          // else: hash / 기타 비URL 문자열 → 무시
        } else if (Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === "string") {
              const t = item.trim();
              if (/^https?:\/\//.test(t) && !isPixivUserUrl(t)) {
                candidates.push(t);
              }
            }
          }
        }
      }

      // 우선순위 6: 텍스트 필드를 raw URL로 직접 사용 (https?:// 시작만)
      collectUrlCandidates(metadata, candidates);

      // 우선순위 7: 모든 문자열 필드에서 https?:// 패턴 fallback.
      // /users/ URL은 작가 페이지이므로 작품 출처에서 제외.
      const rawAll: string[] = [];
      walkStringFields(metadata, rawAll, 0);
      for (const u of rawAll) {
        if (!isPixivUserUrl(u)) {
          candidates.push(u);
        }
      }

      return uniqueOrdered(candidates);
    }

    function collectFromPossibleAruJson(
      metadata: { [x: string]: any },
      candidates: any[],
    ) {
      for (const field of TEXT_FIELDS_FOR_JSON) {
        const v = metadata[field];
        if (typeof v !== "string") {
          continue;
        }
        const obj = safeJsonParse(v);
        if (!obj || typeof obj !== "object") {
          continue;
        }

        // artwork_url / source_url / artworkUrl: URL 형식이고 /users/ 아닌 경우만
        for (const key of ["artwork_url", "source_url", "artworkUrl"]) {
          const urlVal = (obj[key] || "").trim();
          if (
            urlVal &&
            /^https?:\/\//.test(urlVal) &&
            !isPixivUserUrl(urlVal)
          ) {
            candidates.push(urlVal);
          } else if (urlVal && isPixivUserUrl(urlVal)) {
            console.debug(
              "[Aru Source Captioner] source candidate skipped (artist url):",
              { key, urlVal },
            );
          }
        }

        // artwork_id가 숫자 Pixiv ID → 작품 URL 생성
        const artworkId = (obj.artwork_id || "").trim();
        if (/^\d{6,12}$/.test(artworkId)) {
          candidates.push(`https://www.pixiv.net/artworks/${artworkId}`);
        }

        // original_filename이 Pixiv 패턴이면 URL 생성
        const origFilename = obj.original_filename;
        if (typeof origFilename === "string") {
          const filenameUrl = parsePixivFilenameUrl(origFilename);
          if (filenameUrl) {
            candidates.push(filenameUrl);
          }
        }
      }
    }

    function collectUrlCandidates(
      metadata: { [x: string]: any },
      candidates: string[],
    ) {
      for (const field of TEXT_FIELDS_FOR_JSON) {
        const v = metadata[field];
        if (typeof v !== "string") {
          continue;
        }
        const trimmed = v.trim();
        if (/^https?:\/\//.test(trimmed)) {
          candidates.push(trimmed);
        }
      }
    }

    function walkStringFields(
      value: unknown,
      candidates: string[],
      depth: number,
    ) {
      if (depth > WALK_MAX_DEPTH) {
        return;
      }
      if (typeof value === "string") {
        const matches = value.match(URL_PATTERN);
        if (matches) {
          for (const m of matches) {
            candidates.push(m);
          }
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          walkStringFields(item, candidates, depth + 1);
        }
        return;
      }
      if (value && typeof value === "object") {
        for (const k of Object.keys(value)) {
          walkStringFields(
            (value as Record<string, unknown>)[k],
            candidates,
            depth + 1,
          );
        }
      }
    }

    function safeJsonParse(text: string) {
      if (typeof text !== "string") {
        return null;
      }
      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return null;
      }
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        // non-fatal — Python dict / trailing comma / single-quote JSON은 정상 실패.
        // Firefox UTF-16LE 디코딩 오류도 이 경로를 탄다. filename fallback은 계속된다.
        console.warn(
          "[Aru Source Captioner] JSON parse failed; fallback continues",
          {
            parser: "aru_json",
            error: String(err),
            sample: String(text).slice(0, 160),
          },
        );
        return null;
      }
    }

    function uniqueOrdered(arr: any[]) {
      const seen = new Set();
      const out = [];
      for (const item of arr) {
        if (!seen.has(item)) {
          seen.add(item);
          out.push(item);
        }
      }
      return out;
    }

    // ---------------- URL 보안 검증 ----------------

    function sanitizeSourceUrl(rawUrl: string, config: Options) {
      if (typeof rawUrl !== "string") {
        return null;
      }
      const trimmed = rawUrl.trim();
      if (trimmed.length === 0) {
        return null;
      }

      let parsed;
      try {
        parsed = new URL(trimmed);
      } catch {
        return null;
      }

      const protocol = parsed.protocol;
      if (protocol === "https:") {
        // 통과
      } else if (protocol === "http:") {
        if (!config.allowHttp) {
          return null;
        }
      } else {
        // javascript: / data: / vbscript: / file: / chrome: / chrome-extension: / about: 등 모두 차단
        return null;
      }

      if (config.strictAllowlist) {
        if (!isAllowedByPolicy(parsed.hostname, config)) {
          return null;
        }
      }

      return parsed.toString();
    }

    function isAllowedByPolicy(hostname: string, config: Options) {
      if (typeof hostname !== "string" || hostname.length === 0) {
        return false;
      }
      if (!Array.isArray(config.allowedHosts)) {
        return false;
      }
      const h = hostname.toLowerCase();
      for (const allowed of config.allowedHosts) {
        if (typeof allowed !== "string") {
          continue;
        }
        const a = allowed.trim().toLowerCase();
        if (a.length === 0) {
          continue;
        }
        if (h === a) {
          return true;
        }
        if (h.endsWith("." + a)) {
          return true;
        }
      }
      return false;
    }

    // ---------------- DOM 감시 ----------------

    function startEditorObserver(config: Options) {
      const Controller = attribution?.Controller;
      if (!Controller) {
        return null;
      } // 대응 모듈이 없으면 파일 선택 순서만으로 출처를 추정하지 않는다.
      uploadAttribution = new Controller({
        document,
        parse: (file: File) =>
          parseSourceFromFile(file, {
            allowLooseFilenameFallback: !isMobileAutoInsertEnvironment(),
          }),
        sanitize: (url: string) => sanitizeSourceUrl(url, config),
        caption: createSourceCaption,
        anchor: findImageParagraph,
        existing: hasExistingSourceCaption,
        onStatus: publishUploadStatus,
      });
      window.addEventListener("pagehide", () => uploadAttribution?.destroy(), {
        once: true,
      });
      return uploadAttribution;
    }

    function findImageParagraph(img: HTMLImageElement) {
      return img.closest<HTMLParagraphElement>("p") || img;
    }

    function hasExistingSourceCaption(img: HTMLImageElement) {
      const anchor = findImageParagraph(img);
      const next = anchor.nextElementSibling;
      if (!next) {
        return false;
      }
      if (
        next instanceof HTMLElement &&
        next.dataset?.aruSourceCaption === "1"
      ) {
        return true;
      }
      const text = (next.textContent || "").trim();
      if (text.startsWith("출처:")) {
        const a = next.querySelector?.("a[href]");
        if (a) {
          return true;
        }
      }
      return false;
    }

    function createSourceCaption(url: string | null) {
      const p = document.createElement("p");
      p.className = "aru-source-caption";
      p.style.textAlign = "center";
      p.dataset.aruSourceCaption = "1";

      p.appendChild(document.createTextNode("출처: "));

      const a = document.createElement("a");
      a.href = url!;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = url;

      p.appendChild(a);
      return p;
    }

    // ---------------- 페이지 종류 감지 ----------------
    //
    // 글쓰기 페이지(write)와 일반 게시글 조회 페이지(read)는 manifest matches가 모두
    // 매칭되지만 동작이 다르다. URL pathname으로 명확히 분기한다.
    //
    //   write: /community/board/{boardId}/write 등

    //
    // read 페이지에서는 write용 file input / editor observer를 띄우지 않고,
    // 댓글 영역에 "출처 추가" 버튼만 주입한다.

    const READ_PATH_PATTERN = /^\/community\/board\/[^/]+\/read\/[^/?]+/;

    function isReadPage() {
      try {
        return READ_PATH_PATTERN.test(location.pathname);
      } catch {
        return false;
      }
    }

    // 글쓰기 페이지는 별도 selector 검사 없이 isReadPage()의 음수로 정의한다.
    // (manifest matches가 이미 루리웹 게시판으로 좁혀져 있다.)

    // ---------------- 댓글 영역 출처 버튼 (read 페이지) ----------------
    //
    // 댓글 textarea(textarea[name="comment_input"])를 가진 .border_box.after_clear
    // wrapper를 찾아 .common_img_button 바로 다음에 "출처 추가" 버튼을 주입한다.
    //
    // 정책:
    //   - 출처 URL은 사용자가 댓글에 첨부한 이미지의 Aru Archive metadata에서 추출한
    //     artwork_url(또는 source_url / Source / Identifier 등 write 페이지와 동일
    //     우선순위)을 사용한다. 게시글의 location.href는 절대 fallback으로 쓰지 않는다
    //     (search_type / #cmt 등 변동 fragment를 출처로 박는 사고 방지).
    //   - 파일 첨부 시 file input의 change 이벤트를 addEventListener로만 hook해서
    //     첫 번째 image의 metadata를 parseSourceFromFile + sanitizeSourceUrl로 검증한 뒤
    //     wrapperSourceMap에 저장하고 textarea에 자동 삽입한다.
    //     기존 onchange inline 핸들러(app.comment_img / app.comment_img_drop)는 가로채지 않는다.
    //   - "출처 추가" 버튼은 저장된 source가 있으면 그 값으로 재삽입(중복 시 skip)을
    //     시도하고, 없으면 alert으로 안내만 한다 (page URL fallback 금지).
    //   - 삽입 텍스트 형식: "출처: {url}\n\n" — 마지막 빈 줄을 두어 사용자가 그 아래
    //     댓글 본문을 바로 이어 작성할 수 있게 한다.
    //   - 빈 textarea: 출처 텍스트만 삽입.
    //   - 기존 내용 있음: existing.trimEnd() + "\n\n" + 출처 텍스트.
    //   - 동일 출처가 이미 있으면 skip (중복 방지).
    //   - 다른 출처 라인("출처: ..." 다른 URL)이 이미 있으면 skip (자동 덮어쓰기 금지).
    //   - textarea.maxLength 초과 시 skip.
    //   - 커서를 마지막 빈 줄에 위치시키고 input/change 이벤트 dispatch.
    //   - 한 wrapper당 한 번만 주입 (data-aru-source-comment-bound guard).
    //   - 한 file input당 한 번만 hook (data-aru-source-file-bound guard).
    //   - 기존 onclick / onchange / onkeydown / .common_img_button 이벤트는 절대 손대지 않는다.

    // 일반 댓글: textarea[name="comment_input"] / textarea#comment_input
    // 대댓글(reply): name/id가 comment_input_<commentId> 또는 re_comment_input_*
    // 형태로 들어오는 경우가 있어, prefix 매칭과 class 부분 매칭을 함께 사용한다.
    // .common_img_button 위치 기준으로 button을 주입하므로 게시글 본문 textarea 등이
    // 잘못 매칭되더라도 wrapper에 .common_img_button이 없으면 영향 적다.
    const COMMENT_TEXTAREA_SELECTOR = [
      // 일반 댓글
      'textarea[name="comment_input"]',
      'textarea[id="comment_input"]',
      'textarea[class~="comment_input"]',
      'textarea[name^="comment_input"]', // comment_input_<id>
      'textarea[id^="comment_input"]',
      'textarea[class*="comment_input"]', // class에 comment_input 부분 매칭
      // 대댓글 (Ruliweb: name="reply_input", class="common_input reply_input")
      'textarea[name="reply_input"]',
      'textarea[name^="reply_input"]', // reply_input_<id>
      'textarea[class~="reply_input"]',
      'textarea[class*="reply_input"]',
      // 다른 변형 패턴 (보존)
      'textarea[name^="re_comment_input"]',
      'textarea[id^="re_comment_input"]',
      'textarea[class*="re_comment"]',
    ].join(", ");
    const COMMENT_IMG_BUTTON_SELECTOR = ".common_img_button";
    const COMMENT_FILE_INPUT_SELECTOR =
      "input.common_img_input, input[type='file']";

    const COMMENT_FILE_BOUND_DATASET_KEY = "aruSourceFileBound";

    const COMMENT_SOURCE_PREFIX = "출처:";

    // wrapper(HTMLElement) -> 가장 최근에 추출/검증 통과한 source URL(string).
    // 파일 input이 다시 변경되면 갱신된다. Map이 아니라 WeakMap이라 wrapper가
    // DOM에서 사라지면 자동으로 GC된다.
    const wrapperSourceMap = new WeakMap();
    const commentFileSelections = new WeakMap<
      HTMLInputElement,
      { revision: number; wrapper: HTMLElement; listener: EventListener }
    >();

    // read 페이지에서 init() 이후 setup/observer/poll/click handler가 모두 같은
    // config를 사용해야 한다. 매 호출마다 config를 다시 로드하지 않도록 모듈 스코프에
    // 캐시한다 (DEFAULT_OPTIONS와 동일한 shape — sanitizeSourceUrl이 사용하는
    // allowHttp / strictAllowlist / allowedHosts만 의미가 있다).
    let readPageConfig: unknown = null;

    // init()에서 로드한 config를 캐시한다.
    // 글쓰기 페이지의 파일 change 이벤트는 attachFileInputListeners(config) 클로저 안에
    // config를 가지지만, 모바일 직접 삽입 경로는 handleSelectedImageFiles 스코프에서
    // config가 필요하다. 여기에 캐시해 두어 항상 유효한 config를 참조할 수 있게 한다.

    // textarea로부터 외곽 wrapper(.common_img_button을 sibling으로 가진 컨테이너)를
    // 우선순위대로 단계별 closest()로 찾는다. closest()를 OR로 묶으면 .common_input_wrapper
    // 같은 직계 부모에서 멈춰 .common_img_button(외곽 wrapper의 자식이며 inner wrapper의
    // sibling)을 놓치는 문제가 있어 단계 분리가 필요하다.
    function resolveCommentWrapperForTextarea(textarea: HTMLTextAreaElement) {
      // 1순위: .border_box.after_clear (이미지 버튼을 포함하는 외곽 wrapper).
      const outer = textarea.closest(".border_box.after_clear");
      if (outer) {
        return outer;
      }

      // 2순위: .border_box (after_clear 변형 — Ruliweb 일부 보드).
      const borderBox = textarea.closest(".border_box");
      if (borderBox) {
        return borderBox;
      }

      // 3순위: form/fieldset (다른 댓글 form 구조).
      const formish = textarea.closest("form, fieldset");
      if (formish) {
        return formish;
      }

      // 4순위: .common_input_wrapper의 부모 (image button이 sibling일 가능성).
      const innerWrapper = textarea.closest(".common_input_wrapper");
      if (innerWrapper?.parentElement) {
        return innerWrapper.parentElement;
      }

      // 5순위: textarea 자체의 grandparent / parent.
      return (
        textarea.parentElement?.parentElement || textarea.parentElement || null
      );
    }

    // 단일 wrapper를 검증하고 진단 로그를 남긴 뒤 result에 추가한다.
    // textarea의 name/id/className을 함께 로그로 찍어 일반 댓글 / 대댓글 wrapper를
    // 사용자가 콘솔에서 구분할 수 있도록 한다 (selector 적합성 검증 용도).
    function classifyAndPushWrapper(wrapper: HTMLElement, result: any[]) {
      const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
      if (!(textarea instanceof HTMLTextAreaElement)) {
        return;
      }
      const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);
      result.push(wrapper);
      const textareaInfo = {
        name: textarea.name,
        id: textarea.id,
        className: textarea.className,
      };
      if (imgButton) {
        console.log(
          "[Aru Source Captioner] scan: wrapper OK (has textarea + .common_img_button)",
          { wrapper, textarea: textareaInfo },
        );
      } else {
        console.log(
          "[Aru Source Captioner] scan: wrapper has textarea but no .common_img_button — will use textarea position",
          { wrapper, textarea: textareaInfo },
        );
      }
    }

    function findCommentInputWrappers() {
      const textareas = document.querySelectorAll(COMMENT_TEXTAREA_SELECTOR);
      console.log(
        `[Aru Source Captioner] scan: found ${textareas.length} comment textarea candidates`,
      );

      const wrappers = new Set();
      for (const textarea of textareas) {
        if (!(textarea instanceof HTMLTextAreaElement)) {
          continue;
        }
        const wrapper = resolveCommentWrapperForTextarea(textarea);
        if (wrapper instanceof HTMLElement) {
          wrappers.add(wrapper);
        }
      }

      const result: string | any[] = [];
      for (const wrapper of wrappers) {
        classifyAndPushWrapper(wrapper as HTMLElement, result);
      }

      console.log(
        `[Aru Source Captioner] scan: ${result.length} comment wrappers identified`,
      );
      return result;
    }

    function buildCommentSourceText(sourceUrl: any) {
      // 출처 줄 뒤에 줄바꿈 1번만 추가 — 사용자가 빈 줄 없이 바로 다음 줄에 댓글 본문을 작성.
      return `${COMMENT_SOURCE_PREFIX} ${sourceUrl}\n`;
    }

    function logCommentInsertSkip(
      reason: string,
      detail?: { maxLen: any; newLen: any } | undefined,
    ) {
      // 사용자 페이지 콘솔 오염을 피하기 위해 console.debug만 사용한다.
      console.debug(
        "[Aru Source Captioner] comment insert skipped:",
        reason,
        detail || "",
      );
    }

    function focusTextareaSafe(textarea: { focus: () => void }) {
      try {
        textarea.focus();
      } catch {
        /* noop */
      }
    }

    // 정상 케이스가 아닌 경우 (중복/다른 출처/길이 초과)를 검사하고
    // 각각의 결과 문자열을 반환한다. null이면 정상 진행 가능.
    function checkInsertSkipReason(
      textarea: HTMLTextAreaElement,
      existing: string,
      sourceLine: any,
      newValue: string,
    ) {
      if (existing.includes(sourceLine)) {
        focusTextareaSafe(textarea);
        console.log(
          "[Aru Source Captioner] insert: same source already present — focus only",
        );
        logCommentInsertSkip("duplicate_source_line");
        return "duplicate";
      }
      if (/(^|\n)\s*출처\s*:\s*\S/.test(existing)) {
        focusTextareaSafe(textarea);
        console.log(
          "[Aru Source Captioner] insert: different source already present — skipped",
        );
        logCommentInsertSkip("other_source_present");
        return "different-source";
      }
      const maxLen =
        typeof textarea.maxLength === "number" ? textarea.maxLength : -1;
      if (maxLen > 0 && newValue.length > maxLen) {
        console.warn(
          "[Aru Source Captioner] insert: maxLength exceeded — skipped",
          {
            newLength: newValue.length,
            maxLength: maxLen,
          },
        );
        logCommentInsertSkip("maxlength_exceeded", {
          maxLen,
          newLen: newValue.length,
        });
        return "too-long";
      }
      return null;
    }

    function buildMergedTextareaValue(existing: string, sourceText: string) {
      if (existing.trim().length === 0) {
        return sourceText;
      }
      return existing.replace(/\s+$/u, "") + "\n\n" + sourceText;
    }

    function applyTextareaValue(
      textarea: HTMLTextAreaElement,
      newValue: string,
    ) {
      textarea.value = newValue;

      // 사이트가 textarea setter를 가로채는지(예: framework state 동기화) 검증한다.
      console.log("[Aru Source Captioner] insert: value set", {
        actualValue:
          typeof textarea.value === "string"
            ? textarea.value.slice(0, 50)
            : null,
        valueMatches: textarea.value === newValue,
        valueLength:
          typeof textarea.value === "string" ? textarea.value.length : -1,
      });

      const cursorPos = newValue.length;
      try {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      } catch {
        // 일부 브라우저/상태에서 setSelectionRange가 throw할 수 있다 — 무시.
      }

      try {
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (err) {
        console.debug("[Aru Source Captioner] event dispatch failed:", err);
      }
    }

    function insertSourceIntoCommentTextarea(
      textarea: Node | null,
      sourceText: string,
    ) {
      if (!(textarea instanceof HTMLTextAreaElement)) {
        console.warn("[Aru Source Captioner] insert: not a textarea element");
        return "not-textarea";
      }

      const existing = typeof textarea.value === "string" ? textarea.value : "";
      const sourceLine = sourceText.split("\n")[0]; // "출처: {url}"

      console.log("[Aru Source Captioner] insert: called", {
        textareaExists: true,
        inDOM: document.contains(textarea),
        currentValue: existing.slice(0, 50),
        maxLength: textarea.maxLength,
      });

      const newValue = buildMergedTextareaValue(existing, sourceText);
      const skip = checkInsertSkipReason(
        textarea,
        existing,
        sourceLine,
        newValue,
      );
      if (skip) {
        return skip;
      }

      applyTextareaValue(textarea, newValue);

      console.log("[Aru Source Captioner] insert: completed successfully");
      return "ok";
    }

    // 첨부된 이미지 file input에서 첫 번째 이미지의 Aru Archive metadata를 파싱하여
    // 안전한 source URL로 정제한 뒤 wrapperSourceMap에 저장하고, textarea에 자동으로
    // 출처 caption을 삽입한다. 글쓰기 페이지의 parseSourceFromFile + sanitizeSourceUrl
    // 경로를 그대로 재사용한다 (재발명 금지).
    //
    // 주의:
    //   - 기존 onchange inline 핸들러(app.comment_img / app.comment_img_drop 트리거)는
    //     절대 가로채지 않는다 — addEventListener("change", ...)로만 추가한다.
    //   - 같은 file input에 중복 hook을 막기 위해 dataset 가드를 사용한다.
    //   - 파일 input이 동적으로 교체될 수 있어 wrapper 단위로 매번 다시 시도한다 —
    //     dataset 가드가 같은 input에 두 번 붙는 것은 막아준다.
    function hookCommentFileInput(wrapper: object, config: Options) {
      if (!(wrapper instanceof HTMLElement)) {
        return false;
      }

      const fileInput = wrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR);
      if (!(fileInput instanceof HTMLInputElement)) {
        console.log(
          "[Aru Source Captioner] file: no file input in wrapper",
          wrapper,
        );
        return false;
      }
      if (fileInput.type !== "file") {
        // common_img_input이 아닌 다른 input이 잡힌 경우 (예: 검색 input).
        return false;
      }
      // 공통 Gate가 없는 기준 형상에서는 이 입력이 설치된 native 컨텍스트의 ID를 보존한다.
      let contextId: string;
      try {
        const id = chrome?.runtime?.id;
        if (typeof id !== "string" || !id) {
          return false;
        }
        contextId = id;
      } catch {
        return false;
      }
      let isContextInvalidated = false;
      const canApplyInContext = () => {
        if (!isContextInvalidated) {
          try {
            isContextInvalidated = chrome?.runtime?.id !== contextId;
          } catch {
            isContextInvalidated = true;
          }
        }
        return !isContextInvalidated;
      };

      const previous = commentFileSelections.get(fileInput);
      if (previous?.wrapper === wrapper) {
        return false;
      }
      // DOM 교체로 같은 input이 다른 wrapper에 연결돼도 이전 작업과 리스너를 넘기지 않는다.
      if (previous) {
        fileInput.removeEventListener("change", previous.listener);
        const replacement = previous.wrapper.querySelector(
          COMMENT_FILE_INPUT_SELECTOR,
        );
        if (!replacement || replacement === fileInput) {
          wrapperSourceMap.delete(previous.wrapper);
        }
      }
      const selection = { revision: 0, wrapper, listener: onFileChange };
      commentFileSelections.set(fileInput, selection);
      wrapperSourceMap.delete(wrapper);
      fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY] = "1";

      const targetInput = fileInput;
      const targetWrapper = wrapper;
      async function onFileChange(event: Event) {
        if (commentFileSelections.get(targetInput) !== selection) {
          return;
        }
        // 빈 선택·비이미지·출처 없음도 이전 선택을 무효화한다. 기존 본문은 지우지 않는다.
        const revision = ++selection.revision;
        if (
          targetWrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR) !==
          targetInput
        ) {
          return;
        }
        wrapperSourceMap.delete(targetWrapper);
        const target = event.target;
        const files = target === targetInput ? targetInput.files : null;
        if (!files || files.length === 0) {
          return;
        }

        // 첫 번째 image file만 source 추출 대상으로 사용한다.
        let imageFile: null | File = null;
        for (const f of files) {
          if (f && typeof f.type === "string" && f.type.startsWith("image/")) {
            imageFile = f;
            break;
          }
        }
        if (!imageFile) {
          console.log("[Aru Source Captioner] file: no image in selection");
          return;
        }

        const textarea = targetWrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
        const isCurrentSelection = () =>
          canApplyInContext() &&
          commentFileSelections.get(targetInput) === selection &&
          revision === selection.revision &&
          targetInput.isConnected &&
          targetWrapper.isConnected &&
          targetInput.ownerDocument === document &&
          targetWrapper.ownerDocument === document &&
          targetWrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR) ===
            targetInput &&
          targetWrapper.querySelector(COMMENT_TEXTAREA_SELECTOR) === textarea &&
          (!textarea || textarea.isConnected) &&
          Array.from(targetInput.files ?? []).find((file) =>
            file.type.startsWith("image/"),
          ) === imageFile;
        if (!isCurrentSelection()) {
          return;
        }

        console.log(
          "[Aru Source Captioner] file: extracting metadata from",
          imageFile.name,
        );

        let sourceInfo;
        try {
          sourceInfo = await parseSourceFromFile(imageFile);
        } catch (err) {
          console.warn(
            "[Aru Source Captioner] file: metadata extraction threw",
            err,
          );
          return;
        }

        if (!isCurrentSelection()) {
          return;
        }
        if (sourceInfo?.status !== "ok" || !sourceInfo.url) {
          console.log(
            "[Aru Source Captioner] file: no Aru source metadata found in image",
            { reason: sourceInfo?.reason },
          );
          return;
        }

        const safeUrl = sanitizeSourceUrl(sourceInfo.url, config);
        if (!isCurrentSelection()) {
          return;
        }
        if (!safeUrl) {
          console.log(
            "[Aru Source Captioner] file: extracted source rejected by sanitizer",
            { rawUrl: sourceInfo.url },
          );
          return;
        }

        console.log("[Aru Source Captioner] file: extracted source =", safeUrl);
        wrapperSourceMap.set(targetWrapper, safeUrl);

        if (textarea instanceof HTMLTextAreaElement) {
          const sourceText = buildCommentSourceText(safeUrl);
          const result = insertSourceIntoCommentTextarea(textarea, sourceText);
          console.log(
            "[Aru Source Captioner] file: auto insertion result =",
            result,
          );
        } else {
          console.log(
            "[Aru Source Captioner] file: source stored, but no textarea found for auto insert",
            targetWrapper,
          );
        }
      }
      fileInput.addEventListener("change", onFileChange);

      console.log("[Aru Source Captioner] file: hooked file input change", {
        wrapper,
        fileInput,
      });
      return true;
    }

    function setupCommentSourceCaptioner(
      config: Options | undefined = undefined,
    ) {
      if (!isReadPage()) {
        return;
      }
      // config 인자가 없으면 init()에서 캐시한 readPageConfig를 사용한다.
      const effectiveConfig = config || readPageConfig;
      const wrappers = findCommentInputWrappers();
      // 자동 삽입 모드: 파일 선택 이벤트에서 바로 출처 캡션을 삽입한다.
      // "출처 추가" 버튼 주입은 기본 비활성화 — injectCommentSourceButton은
      // 정의만 유지하고 호출하지 않는다.
      let hookedFileInputs = 0;
      for (const wrapper of wrappers) {
        if (
          effectiveConfig &&
          hookCommentFileInput(wrapper, effectiveConfig as Options)
        ) {
          hookedFileInputs++;
        }
      }
      if (wrappers.length === 0) {
        console.log(
          "[Aru Source Captioner] setup: no comment wrapper found yet (may load later)",
        );
      } else if (hookedFileInputs > 0) {
        console.log(
          `[Aru Source Captioner] setup: hooked ${hookedFileInputs} new file inputs (auto-insert mode)`,
        );
      }
    }

    let commentObserver: {
      observe: (
        arg0: HTMLElement,
        arg1: { childList: boolean; subtree: boolean },
      ) => void;
    } | null = null;
    let commentObserverScheduled = false;

    function scheduleCommentSetup() {
      if (commentObserverScheduled) {
        return;
      }
      commentObserverScheduled = true;
      // microtask로 모아서 단일 실행 — MutationObserver 폭주 방지.
      Promise.resolve().then(() => {
        commentObserverScheduled = false;
        try {
          setupCommentSourceCaptioner();
        } catch (err) {
          console.debug("[Aru Source Captioner] comment setup failed:", err);
        }
      });
    }

    function startCommentObserver() {
      if (!isReadPage()) {
        return null;
      }
      if (commentObserver) {
        return commentObserver;
      }

      commentObserver = new MutationObserver((mutations) => {
        // 우리가 주입한 버튼 / dataset 변경은 무한 루프 위험이 있으니
        // 단순히 추가 노드 발생 여부만 확인하고 idempotent setup을 schedule한다.
        // dataset.aruSourceCommentBound guard가 중복 주입을 막는다.
        for (const mut of mutations) {
          if (mut.type !== "childList") {
            continue;
          }
          if (mut.addedNodes && mut.addedNodes.length > 0) {
            scheduleCommentSetup();
            return;
          }
        }
      });

      if (document.body) {
        commentObserver!.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      // Polling fallback: MutationObserver만으로는 일부 동적 로딩 케이스에서
      // 댓글 영역을 놓칠 수 있다. 15초 동안 500ms 간격으로 한 번 더 scan을 돌려
      // 네트워크 지연/AJAX 로딩으로 늦게 도착하는 댓글 wrapper를 잡는다.
      // 첫 button 발견 시 polling을 중단하면 일반 댓글에 button이 들어간 직후 폴링이
      // 멈춰 늦게 expand되는 대댓글 wrapper를 놓치게 되므로, 시간 기준(15s)으로만
      // 종료한다. 이후 변화는 MutationObserver가 계속 감지하여 채워준다.
      let attempts = 0;
      const maxAttempts = 30; // 30 * 500ms = 15s
      const pollIntervalId = setInterval!(() => {
        attempts++;
        try {
          setupCommentSourceCaptioner();
        } catch (err) {
          console.debug("[Aru Source Captioner] poll setup failed:", err);
        }
        if (attempts >= maxAttempts) {
          clearInterval!(pollIntervalId);
          console.log(
            "[Aru Source Captioner] poll: stopping after 15s (MutationObserver continues)",
          );
        }
      }, 500);

      console.log(
        "[Aru Source Captioner] observer: started (polling 15s + MutationObserver)",
      );
      return commentObserver;
    }

    // ---------------- 루리웹 AI 제한 게시글 열기 ----------------
    //

    //   "off"          (기본) — 아무것도 하지 않음.
    //   "click_overlay"— #board_read .board_main_view 중앙을 elementFromPoint로
    //                    안전하게 클릭. a/button/input 등 내부면 중단.
    //                    pointerdown→mousedown→pointerup→mouseup→click 순으로 dispatch.
    //                    실패 시 300ms/800ms/1500ms 재시도 + MutationObserver.
    //   "text_fallback"— meta description 텍스트만 복원. 이미지 복원 불가.
    //
    // 동작 원칙:
    //   - isReadPage()가 false인 페이지에서는 절대 실행하지 않는다.
    //   - document 전체 후보 탐색 클릭 금지.
    //   - a, button, input, textarea, select, iframe 클릭 금지.
    //   - .click() 단독 사용 금지.
    //   - 클릭 전후 location.href 비교해 URL 이동 발생 시 오류 로그.

    const RULIWEB_AI_BLIND_SELECTOR = "#board_read.ai_blind";
    const RULIWEB_BOARD_MAIN_VIEW_PRIMARY =
      "#board_read.ai_blind .board_main_view";
    const RULIWEB_BOARD_MAIN_VIEW_FALLBACK = "#board_read .board_main_view";
    const RULIWEB_UNSAFE_CLICK_SELECTOR =
      "a, button, input, textarea, select, iframe";
    const RULIWEB_REVEAL_RETRY_DELAYS_MS = [300, 800, 1500];
    const RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS = 5000;

    function isRuliwebReadPage() {
      return isReadPage();
    }

    function hasRuliwebAiBlind() {
      return !!document.querySelector(RULIWEB_AI_BLIND_SELECTOR);
    }

    function _findBoardMainView() {
      return (
        document.querySelector(RULIWEB_BOARD_MAIN_VIEW_PRIMARY) ||
        document.querySelector(RULIWEB_BOARD_MAIN_VIEW_FALLBACK)
      );
    }

    // CSS pseudo-element(::before 또는 ::after)의 content를 computed style에서 읽는다.
    function getPseudoElementContent(
      el: Element | null,
      pseudo?: string | null | undefined,
    ) {
      try {
        const raw = window
          .getComputedStyle(el!, pseudo)
          .getPropertyValue("content");
        if (!raw || raw === "none" || raw === "normal" || raw === '""') {
          return "";
        }
        return raw
          .replace(/^["']|["']$/g, "")
          .replace(/\\A/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        return "";
      }
    }

    // board_main_view 후보 요소들의 텍스트 + ::before + ::after를 합쳐 반환.
    function getRuliwebRevealOverlayText() {
      const candidates = [
        document.querySelector("#board_read.ai_blind .board_main_view"),
        document.querySelector("#board_read .board_main_view"),
        document.querySelector(".board_main_view"),
      ].filter(Boolean);
      const parts = [];
      for (const el of candidates) {
        const text = ((el! as HTMLElement).innerText || el!.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        if (text) {
          parts.push(text);
        }
        const before = getPseudoElementContent(el, "::before");
        if (before) {
          parts.push(before);
        }
        const after = getPseudoElementContent(el, "::after");
        if (after) {
          parts.push(after);
        }
      }
      return parts.join(" ").replace(/\s+/g, " ").trim();
    }

    // overlay 텍스트를 정규화 (소문자 + 공백 정규화).
    function normalizeRuliwebOverlayText(value: any) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    // 키워드를 정규화 (소문자 + 공백 정규화).
    function normalizeKeyword(value: string) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    // 키워드 배열을 정규화. 문자열이면 단일 키워드 배열로 변환.
    function normalizeKeywordList(keywords: string | string[]) {
      if (!Array.isArray(keywords)) {
        return typeof keywords === "string" && keywords.trim()
          ? [normalizeKeyword(keywords)]
          : [];
      }
      return keywords.map(normalizeKeyword).filter(Boolean);
    }

    // text에 keywords 중 하나라도 포함되면 true.
    function hasKeyword(text: any, keywords: any) {
      const normalizedText = normalizeRuliwebOverlayText(text);
      return normalizeKeywordList(keywords).some(
        (keyword) => keyword && normalizedText.includes(keyword),
      );
    }

    // block 우선 allowlist 판정: allow 매칭 && block 미매칭 시에만 열기.
    function shouldOpenRuliwebOverlayByKeywords(
      overlayText: string,
      config: Options,
    ) {
      const allowKeywords =
        (config && config.ruliwebAiRevealAllowKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
      const blockKeywords =
        (config && config.ruliwebAiRevealBlockKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
      const blocked = hasKeyword(overlayText, blockKeywords);
      const allowed = hasKeyword(overlayText, allowKeywords);
      return { shouldOpen: allowed && !blocked, allowed, blocked };
    }

    function _dispatchPointerMouseSequence(el: Element, x: number, y: number) {
      const hasPointerEvent = typeof PointerEvent === "function";
      const mkMouse = (type: string) =>
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
        });
      const mkPointer = (type: string) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        });
      if (hasPointerEvent) {
        el.dispatchEvent(mkPointer("pointerdown"));
      }
      el.dispatchEvent(mkMouse("mousedown"));
      if (hasPointerEvent) {
        el.dispatchEvent(mkPointer("pointerup"));
      }
      el.dispatchEvent(mkMouse("mouseup"));
      el.dispatchEvent(mkMouse("click"));
    }

    function _tryRuliwebOverlayClickOnce(config: Options) {
      const boardMainView = _findBoardMainView();
      if (!boardMainView) {
        console.debug("[Aru][reveal] .board_main_view not found");
        return false;
      }
      // overlay 키워드 판정 — block 우선 allowlist 방식.
      const overlayText = getRuliwebRevealOverlayText();
      const { shouldOpen, allowed, blocked } =
        shouldOpenRuliwebOverlayByKeywords(overlayText, config);
      const allowKeywords =
        (config && config.ruliwebAiRevealAllowKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
      const blockKeywords =
        (config && config.ruliwebAiRevealBlockKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
      console.info("[Aru][reveal] overlay keyword decision", {
        overlayText: overlayText.slice(0, 200),
        allowKeywords,
        blockKeywords,
        allowed,
        blocked,
        shouldOpen,
      });
      if (!shouldOpen) {
        if (blocked) {
          console.info("[Aru][reveal] skip overlay: blocked keyword matched");
        } else {
          console.info("[Aru][reveal] skip overlay: no allow keyword matched");
        }
        return false;
      }
      const rect = boardMainView.getBoundingClientRect();
      const cx = Math.round(rect.left + rect.width / 2);
      const cy = Math.round(rect.top + Math.min(rect.height * 0.45, 260));
      const pointEl = document.elementFromPoint(cx, cy);
      if (!pointEl) {
        console.debug("[Aru][reveal] elementFromPoint returned null", {
          cx,
          cy,
        });
        return false;
      }
      const unsafe = pointEl.closest(RULIWEB_UNSAFE_CLICK_SELECTOR);
      if (unsafe) {
        console.warn(
          "[Aru][reveal] click aborted — unsafe element at overlay center",
          {
            pointTag: pointEl.tagName,
            unsafeTag: unsafe.tagName,
            unsafeHref: (unsafe as HTMLAnchorElement).href || "(none)",
          },
        );
        return false;
      }
      console.log("[Aru][reveal] overlay click target", {
        x: cx,
        y: cy,
        tag: pointEl.tagName,
        id: pointEl.id || "(none)",
        className: (pointEl.className || "").toString().slice(0, 60),
        href: (pointEl as HTMLAnchorElement).href || "(none)",
      });
      const hrefBefore = location.href;
      _dispatchPointerMouseSequence(pointEl, cx, cy);
      setTimeout!(() => {
        if (location.href !== hrefBefore) {
          console.error("[Aru][reveal] URL changed after overlay click", {
            beforeUrl: hrefBefore,
            afterUrl: location.href,
          });
        }
        const hasAiBlind = hasRuliwebAiBlind();
        const imgCount = document.querySelectorAll(".view_content img").length;
        const viewContent = document.querySelector(".view_content");
        const textLength = viewContent
          ? (viewContent.textContent || "").length
          : 0;
        console.log("[Aru][reveal] after overlay click", {
          hasAiBlind,
          imgCount,
          textLength,
        });
      }, 300);
      return true;
    }

    function _setupRuliwebClickWithRetry(config: Options) {
      let done = false;
      function attempt() {
        if (done) {
          return;
        }
        if (_tryRuliwebOverlayClickOnce(config)) {
          done = true;
        }
      }
      attempt();
      if (done) {
        return;
      }
      RULIWEB_REVEAL_RETRY_DELAYS_MS.forEach((delay) => {
        setTimeout!(attempt, delay);
      });
      const obs = new MutationObserver(() => {
        if (done) {
          obs.disconnect();
          return;
        }
        attempt();
        if (done) {
          obs.disconnect();
        }
      });
      obs.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
      setTimeout!(() => {
        done = true;
        obs.disconnect();
      }, RULIWEB_REVEAL_OBSERVER_TIMEOUT_MS);
    }

    function restoreRuliwebMetaDescription() {
      // 텍스트 전용 복원 — 이미지는 복원되지 않는다.
      const meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        console.debug("[Aru][reveal] text_fallback: no meta description found");
        return false;
      }
      const text = ((meta as HTMLMetaElement).content || "").trim();
      if (!text) {
        console.debug("[Aru][reveal] text_fallback: meta description is empty");
        return false;
      }
      const viewContent = document.querySelector(".view_content");
      if (!viewContent) {
        console.debug("[Aru][reveal] text_fallback: .view_content not found");
        return false;
      }
      const p = document.createElement("p");
      p.textContent = text;
      p.dataset.aruMetaFallback = "1";
      viewContent.prepend(p);
      console.info(
        "[Aru][reveal] text_fallback: meta description prepended (images not restored)",
      );
      return true;
    }

    function setupRuliwebAiReveal(config: Options) {
      const mode = config.ruliwebAiRevealMode ?? "off";
      console.log("[Aru][reveal] setup", {
        mode,
        href: location.href,
        isRead: isRuliwebReadPage(),
        hasBoardRead: !!document.querySelector("#board_read"),
        hasAiBlind: hasRuliwebAiBlind(),
        hasBoardMainView: !!_findBoardMainView(),
      });
      if (mode === "off") {
        return;
      }
      if (!isRuliwebReadPage()) {
        return;
      }
      if (mode === "click_overlay") {
        _setupRuliwebClickWithRetry(config);
        return;
      }
      if (mode === "text_fallback") {
        restoreRuliwebMetaDescription();
        return;
      }
    }

    // ---------------- 부트스트랩 ----------------

    async function init() {
      // Firefox Browser Console(Ctrl+Shift+J)에서 이 로그가 보이면 content script가 실행된 것이다.
      // Chrome/Whale: F12 Console에서 확인. 보이지 않으면 manifest의 content_scripts.matches 확인.
      console.info("[Aru Source Captioner] content loaded", {
        href: location.href,
        userAgent: navigator.userAgent,
        exifrAvailable: typeof exifr !== "undefined",
      });

      const config = await loadConfig();

      if (!config.enabled) {
        console.info(
          "[Aru Source Captioner] disabled — skipping content script",
        );
        return;
      }

      // 페이지 종류별로 분기:
      //   - read 페이지: 댓글 영역 "출처 추가" 버튼만 주입. 글쓰기용 editor / file input 로직은 띄우지 않는다.
      //   - write 페이지(=non-read): 기존 글쓰기 캡션 자동 삽입 동작 그대로 유지.
      if (isReadPage()) {
        // file input change hook이 metadata 추출 후 sanitizeSourceUrl(rawUrl, config)을
        // 호출하므로 read 페이지에서도 config를 반드시 캐시한다.
        readPageConfig = config;
        setupCommentSourceCaptioner(config);
        startCommentObserver();
        setupRuliwebAiReveal(config);
        console.info(
          "[Aru Source Captioner] read page active — comment source button enabled",
          {
            strictAllowlist: config.strictAllowlist,
            allowHttp: config.allowHttp,
          },
        );
        return;
      }

      // exifr가 없어도 filename fallback은 동작한다 — attachFileInputListeners는 반드시 호출.
      // early return으로 listener를 건너뛰면 filename-only 모드도 작동하지 않는다.
      if (typeof exifr === "undefined") {
        console.warn(
          "[Aru Source Captioner] exifr not loaded — running in filename-only fallback mode",
        );
      }

      attachFileInputListeners(config);
      startEditorObserver(config);

      console.info(
        "[Aru Source Captioner] auto-insert mode active — file selection triggers caption insertion",
        {
          strictAllowlist: config.strictAllowlist,
          allowHttp: config.allowHttp,
          mobile: isMobileAutoInsertEnvironment(),
        },
      );
    }

    // 옵션은 초기화 때 조회하므로 변경 후 페이지 새로고침이 필요하다.
    // 즉시 반영을 추가할 때는 Controller의 설정 참조와 리스너 수명을 함께 갱신해야 한다.

    init().catch((err) => {
      console.warn("[Aru Source Captioner] init failed:", err);
    });
  };
  runBootstrap1();

  return {};
}
