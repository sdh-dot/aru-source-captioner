import { contentDispatcher } from "../../runtime/content-dispatcher.ts";
import { createSessionEnvironment } from "../../runtime/session-resources.ts";
import { contextEffectGate } from "../../runtime/context-effect-gate.ts";
import { readSettings } from "../../runtime/settings-read.ts";
import { parsePixivFilenameUrl } from "../../source-caption/pixiv-filename.ts";
import { formatSourceLinkText } from "../../source-caption/link-display.ts";
import type { ParsedSourceResult } from "../../upload-attribution/models.ts";
import type { DefaultValues } from "../../runtime/contracts.ts";
import {
  hasPngSignature,
  parsePngItxtChunks,
  parseItxtChunk,
} from "../../source-caption/png-chunks.ts";
import {
  defaultEnvironment,
  type RuntimeEnvironment,
  type FactoryOptions,
} from "../../runtime/contracts.ts";
// 브라우저별 기존 초기화·저장 키·사용자 설정과 이벤트 계약을 유지한다.
import { createModuleScope } from "../../runtime/module-scope.ts";

export function installWhaleContent({
  environment = defaultEnvironment,
  dependencies = {},
}: FactoryOptions = {}) {
  const effectGate = contextEffectGate(environment);
  if (!effectGate.allows()) {
    return {};
  }
  const dispatcher = contentDispatcher(environment, effectGate);
  if (!dispatcher) {
    return {};
  }
  const scope = createSessionEnvironment(environment, effectGate);
  environment = scope.environment;
  const resources = scope.resources;
  const window = environment.window ?? environment;
  const {
    document,
    location,
    navigator,
    chrome,
    MutationObserver,
    HTMLElement,
    TextDecoder,
    Image,
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
  // 진단은 고정 단계·오류 코드와 건수만 기록하고 파일·URL·본문·예외 원문은 전달하지 않는다.
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

    const DEFAULT_OPTIONS = Object.freeze({
      enabled: true,
      allowHttp: false,
      strictAllowlist: false,
      allowedHosts: ["pixiv.net", "x.com", "twitter.com"],
      ruliwebAiRevealMode: "off",
      ruliwebAiRevealAllowKeywords: ["AI", "노출 제한", "노출이 제한"],
      ruliwebAiRevealBlockKeywords: ["스포일러", "본문 내용 보기"],
      pixelTableMode: "off",
      pixelTableMaxWidth: 800,
      pixelTableMaxHeight: 600,
      pixelTableCellSize: 4,
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

    const EDITOR_ROOT_SELECTORS = [
      '[contenteditable="true"]',
      ".cke_editable",
      ".fr-element",
      ".editor",
    ];

    const WALK_MAX_DEPTH = 10;

    let uploadAttribution: {
      select: (arg0: any, arg1: any) => any;
      destroy: () => any;
    } | null = null;
    const handledFileEvents = new WeakSet();

    // 성공한 빈 응답에만 기존 기본값을 적용한다. 조회 실패는 초기화를 중단한다.
    async function loadConfig(): Promise<Options> {
      const result = await readSettings(environment, null);
      if (result.state !== "success") {
        throw result.error;
      }
      const merged: Options & Record<string, unknown> = { ...DEFAULT_OPTIONS };
      for (const key of Object.keys(DEFAULT_OPTIONS)) {
        if (key in result.values) {
          merged[key] = result.values[key];
        }
      }
      return merged;
    }

    // ---------------- 파일 입력 감지 ----------------

    function publishUploadStatus(snapshot: {
      state: string;
      selected: number;
    }) {
      if (!effectGate.allows()) {
        return;
      }
      const value = JSON.stringify(snapshot);
      if (document.documentElement.dataset.aruUploadDiagnostic !== value) {
        document.documentElement.dataset.aruUploadDiagnostic = value;
      }
    }

    function attachFileInputListeners(config: Options) {
      if (!effectGate.allows()) {
        return;
      }
      dispatcher!.setChange(async (ev) => {
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
        // 사용자가 켠 pixel table 경로와 사이트의 기존 입력 이벤트를 유지한다.
        if ((config.pixelTableMode ?? "off") !== "off") {
          const isMobile = isMobileAutoInsertEnvironment();
          if (shouldUsePixelTableInsert(config, isMobile)) {
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            ev.preventDefault();
            await handlePixelTableInsert(images, config, isMobile);
            return;
          }
        }
        await handleSelectedImageFiles(images, target);
      });
    }

    async function handleSelectedImageFiles(
      files: string | any[],
      input: HTMLInputElement,
    ) {
      if (!effectGate.allows()) {
        return;
      }
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

    function extractSourceFromAruArchivePayload(
      payload: Record<string, unknown>,
    ): ParsedSourceResult {
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

      // 생산자의 문자열 ID만 허용하며 잘못된 외부 값을 출처로 강제 변환하지 않는다.
      const artworkId =
        typeof payload.artwork_id === "string" ? payload.artwork_id.trim() : "";
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
      _options?: { allowLooseFilenameFallback?: boolean },
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
            "PNG_METADATA_FALLBACK",
          );
        }
      }

      if (
        typeof exifr === "undefined" ||
        !exifr ||
        typeof exifr.parse !== "function"
      ) {
        const filenameUrl = parsePixivFilenameUrl(file.name);
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
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
        metadata = await exifr.parse(file, {
          xmp: true,
          exif: true,
          iptc: true,
          userComment: true,
        });
      } catch (err) {
        console.warn(
          "[Aru Source Captioner] exifr.parse failed —",
          "METADATA_PARSE_FAILED",
        );
        const filenameUrl = parsePixivFilenameUrl(file.name);
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
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
        const filenameUrl = parsePixivFilenameUrl(file.name);
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
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
        const filenameUrl = parsePixivFilenameUrl(file.name);
        if (filenameUrl) {
          console.info("[Aru Source Captioner] filename fallback", {
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
      const fallbackMetadata = collectFromPossibleAruJson(metadata, candidates);

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
      collectUrlCandidates(fallbackMetadata, candidates);

      // 우선순위 7: 모든 문자열 필드에서 https?:// 패턴 fallback.
      // /users/ URL은 작가 페이지이므로 작품 출처에서 제외.
      const rawAll: string[] = [];
      walkStringFields(fallbackMetadata, rawAll, 0);
      for (const u of rawAll) {
        if (!isPixivUserUrl(u)) {
          candidates.push(u);
        }
      }

      return uniqueOrdered(candidates);
    }

    function collectFromPossibleAruJson(
      metadata: Record<string, unknown>,
      candidates: string[],
    ) {
      let fallbackMetadata = metadata;
      for (const field of TEXT_FIELDS_FOR_JSON) {
        const v = metadata[field];
        if (typeof v !== "string") {
          continue;
        }
        const obj = safeJsonParse(v);
        if (!obj || typeof obj !== "object") {
          continue;
        }

        // 거절한 JSON 필드 안의 URL이 마지막 텍스트 fallback에서 다시 출처가 되지 않게 한다.
        // 원본 메타데이터와 독립적인 정상 필드는 보존한다.
        const invalidKeys = [...ARU_PAYLOAD_URL_KEYS, "artwork_id"].filter(
          (key) => key in obj && typeof obj[key] !== "string",
        );
        if (invalidKeys.length) {
          const validFields = { ...obj };
          for (const key of invalidKeys) {
            delete validFields[key];
          }
          fallbackMetadata = {
            ...fallbackMetadata,
            [field]: JSON.stringify(validFields),
          };
        }

        // artwork_url / source_url / artworkUrl: URL 형식이고 /users/ 아닌 경우만
        for (const key of ["artwork_url", "source_url", "artworkUrl"]) {
          const urlVal = typeof obj[key] === "string" ? obj[key].trim() : "";
          if (
            urlVal &&
            /^https?:\/\//.test(urlVal) &&
            !isPixivUserUrl(urlVal)
          ) {
            candidates.push(urlVal);
          } else if (urlVal && isPixivUserUrl(urlVal)) {
            console.debug(
              "[Aru Source Captioner] source candidate skipped (artist url):",
              "ARTIST_URL_SKIPPED",
            );
          }
        }

        // 문자열 ID만 판독해 잘못된 ID가 다른 정상 후보 탐색을 중단하지 않게 한다.
        const artworkId =
          typeof obj.artwork_id === "string" ? obj.artwork_id.trim() : "";
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
      return fallbackMetadata;
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
          { parser: "aru_json", code: "JSON_PARSE_FAILED" },
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

    function isMobileAutoInsertEnvironment() {
      try {
        const ua =
          typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
        const isAndroid = /Android/i.test(ua);
        const isCoarsePointer =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(pointer: coarse)").matches;
        const isNarrow =
          typeof window !== "undefined" && window.innerWidth < 768;
        return isAndroid || (isCoarsePointer && isNarrow);
      } catch {
        return false;
      }
    }

    // ---------------- 픽셀 아트 테이블 삽입 (실험) ----------------
    //

    //   "off"         (기본) — 활성화하지 않음.
    //   "manual"      — 항상 픽셀 테이블 삽입.
    //   "auto_android"— 모바일 환경에서만 픽셀 테이블 삽입.
    //
    // 이미지 파일을 canvas로 렌더링하고 getImageData로 픽셀을 추출해
    // <table> DOM으로 삽입한다. innerHTML 사용 금지.
    //
    // 우선순위: pixelTable > base64 > 기존 업로드 흐름
    //
    // 주의: 게시판 sanitizer가 table/style을 제거하면 동작하지 않는다.
    // 실험 기능이므로 기본값은 off다.

    const PIXEL_TABLE_ALLOWED_MIME = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    const PIXEL_TABLE_DEFAULT_MAX_WIDTH = 800;
    const PIXEL_TABLE_DEFAULT_MAX_HEIGHT = 600;
    const PIXEL_TABLE_DEFAULT_CELL_SIZE = 4;
    const PIXEL_TABLE_MAX_CELLS = 50000;

    function shouldUsePixelTableInsert(config: Options, isMobile: boolean) {
      const mode = config.pixelTableMode ?? "off";
      if (mode === "manual") {
        return true;
      }
      if (mode === "auto_android") {
        return isMobile;
      }
      return false;
    }

    function validatePixelTableFile(file: { type: string }) {
      if (!PIXEL_TABLE_ALLOWED_MIME.has(file.type)) {
        return { valid: false, reason: `허용되지 않는 MIME: ${file.type}` };
      }
      return { valid: true };
    }

    async function loadImageBitmap(
      file: File,
    ): Promise<ImageBitmap | (HTMLImageElement & { close?: () => void })> {
      if (typeof createImageBitmap === "function") {
        return await createImageBitmap(file);
      }
      return await new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`이미지 로드 실패: ${file.name}`));
        };
        img.src = objectUrl;
      });
    }

    async function renderPixelTableCanvas(file: any, config: Options) {
      const cellSize = Math.max(
        1,
        config.pixelTableCellSize ?? PIXEL_TABLE_DEFAULT_CELL_SIZE,
      );
      const maxW = config.pixelTableMaxWidth ?? PIXEL_TABLE_DEFAULT_MAX_WIDTH;
      const maxH = config.pixelTableMaxHeight ?? PIXEL_TABLE_DEFAULT_MAX_HEIGHT;
      const maxCols = Math.max(1, Math.floor(maxW / cellSize));
      const maxRows = Math.max(1, Math.floor(maxH / cellSize));

      const bitmapSource = await loadImageBitmap(file);
      const origWidth = bitmapSource.width;
      const origHeight = bitmapSource.height;

      // 원본 크기 그대로 변환 금지 — 항상 maxCols/maxRows 이하로 축소
      const scale = Math.min(1, maxCols / origWidth, maxRows / origHeight);
      const tableWidth = Math.max(1, Math.floor(origWidth * scale));
      const tableHeight = Math.max(1, Math.floor(origHeight * scale));

      if (tableWidth * tableHeight > PIXEL_TABLE_MAX_CELLS) {
        if (typeof bitmapSource.close === "function") {
          bitmapSource.close();
        }
        throw new Error(
          `셀 수 초과: ${tableWidth * tableHeight} > ${PIXEL_TABLE_MAX_CELLS}`,
        );
      }

      const canvas = document.createElement("canvas");
      canvas.width = tableWidth;
      canvas.height = tableHeight;
      const ctx = canvas.getContext("2d");
      ctx!.drawImage(bitmapSource, 0, 0, tableWidth, tableHeight);

      if (typeof bitmapSource.close === "function") {
        bitmapSource.close();
      }

      const imageData = ctx!.getImageData(0, 0, tableWidth, tableHeight);
      return { pixels: imageData.data, tableWidth, tableHeight };
    }

    function buildPixelTable(
      pixels: any[] | ImageDataArray,
      tableWidth: number,
      tableHeight: number,
      config: Options,
    ) {
      const cellSize = Math.max(
        1,
        config.pixelTableCellSize ?? PIXEL_TABLE_DEFAULT_CELL_SIZE,
      );
      const cellPx = `${cellSize}px`;

      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.lineHeight = "0";
      table.dataset.aruPixelTable = "1";

      for (let row = 0; row < tableHeight; row++) {
        const tr = document.createElement("tr");
        for (let col = 0; col < tableWidth; col++) {
          const idx = (row * tableWidth + col) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const a = pixels[idx + 3];

          const td = document.createElement("td");
          td.style.width = cellPx;
          td.style.height = cellPx;
          td.style.padding = "0";
          td.style.border = "none";
          td.style.backgroundColor = `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      return table;
    }

    function insertPixelTableWithCaption(
      editor: Element,
      table: HTMLTableElement,
      sourceUrl: any,
      _fileName: any,
    ) {
      if (!effectGate.allows()) {
        return;
      }
      const wrapper = document.createElement("p");
      wrapper.style.textAlign = "center";
      wrapper.dataset.aruPixelTableWrapper = "1";
      wrapper.appendChild(table);
      editor.appendChild(wrapper);

      if (sourceUrl) {
        editor.appendChild(createSourceCaption(sourceUrl));
      } else {
        console.log(
          "[Aru Source Captioner] pixelTable: no source URL — caption omitted",
        );
      }
    }

    async function handlePixelTableInsert(
      images: File[],
      config: Options,
      _isMobile: boolean,
    ) {
      if (!effectGate.allows()) {
        return;
      }
      const editor = findEditorRoot();
      if (!editor) {
        console.warn(
          "[Aru Source Captioner] pixelTable: no editor found — cannot insert",
        );
        return;
      }

      for (const file of images) {
        const validation = validatePixelTableFile(file);
        if (!validation.valid) {
          console.warn(
            "[Aru Source Captioner] pixelTable: file rejected —",
            "PIXEL_FILE_REJECTED",
          );
          continue;
        }

        let pixels, tableWidth, tableHeight;
        try {
          ({ pixels, tableWidth, tableHeight } = await renderPixelTableCanvas(
            file,
            config,
          ));
        } catch (err) {
          console.warn(
            "[Aru Source Captioner] pixelTable: canvas render failed:",
            "PIXEL_RENDER_FAILED",
          );
          continue;
        }

        const table = buildPixelTable(pixels, tableWidth, tableHeight, config);

        let sourceUrl: null | any = null;
        try {
          const sourceInfo = await parseSourceFromFile(file);
          if (sourceInfo?.status === "ok" && sourceInfo.url) {
            sourceUrl = sanitizeSourceUrl(
              sourceInfo.url,
              config ?? { ...DEFAULT_OPTIONS },
            );
          }
        } catch (err) {
          console.debug(
            "[Aru Source Captioner] pixelTable: parseSourceFromFile failed:",
            "PIXEL_METADATA_FAILED",
          );
        }

        try {
          insertPixelTableWithCaption(editor, table, sourceUrl, file.name);
          console.info("[Aru Source Captioner] pixelTable: inserted", {
            tableWidth,
            tableHeight,
            hasCaption: !!sourceUrl,
          });
        } catch (err) {
          console.warn(
            "[Aru Source Captioner] pixelTable: insert failed:",
            "PIXEL_INSERT_FAILED",
          );
        }
      }
    }

    // ---------------- DOM 감시 ----------------

    function findEditorRoot() {
      for (const selector of EDITOR_ROOT_SELECTORS) {
        const root = document.querySelector(selector);
        if (root instanceof HTMLElement) {
          return root;
        }
      }
      return null;
    }

    function startEditorObserver(config: Options) {
      if (!effectGate.allows()) {
        return;
      }
      const Controller = attribution?.Controller;
      if (!Controller) {
        return null;
      } // 대응 모듈이 없으면 파일 선택 순서만으로 출처를 추정하지 않는다.
      uploadAttribution = new Controller({
        document,
        parse: async (file: File) => {
          if (!effectGate.allows()) {
            return { status: "cancelled" };
          }
          const result = await parseSourceFromFile(file, {
            allowLooseFilenameFallback: !isMobileAutoInsertEnvironment(),
          });
          return effectGate.allows() ? result : { status: "cancelled" };
        },
        sanitize: (url: string) => sanitizeSourceUrl(url, config),
        caption: createSourceCaption,
        anchor: findImageParagraph,
        existing: hasExistingSourceCaption,
        onStatus: publishUploadStatus,
      });
      const controller = uploadAttribution;
      resources.own(() => controller!.destroy(), "upload-controller");
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
      effectGate.assert();
      const p = document.createElement("p");
      p.className = "aru-source-caption";
      p.style.textAlign = "center";
      p.dataset.aruSourceCaption = "1";

      p.appendChild(document.createTextNode("출처: "));

      const a = document.createElement("a");
      a.href = url!;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = formatSourceLinkText(url!);

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
    //   - input별 현재 binding으로 중복 hook을 막고 dataset은 설치 표식으로만 유지한다.
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

    const COMMENT_BOUND_DATASET_KEY = "aruSourceCommentBound";
    const COMMENT_BUTTON_CLASS = "aru-source-caption-comment-button";
    function handleCommentSourceButtonClick(textarea: Node | null) {
      console.log("[Aru Source Captioner] click: button clicked");

      if (!(textarea instanceof HTMLTextAreaElement)) {
        console.warn(
          "[Aru Source Captioner] click: textarea reference is not a textarea",
        );
        return;
      }

      // textarea가 detached됐는지 (DOM에서 사라졌다가 다시 생기는 케이스) 검증한다.
      if (!document.contains(textarea)) {
        console.warn(
          "[Aru Source Captioner] click: textarea is detached from DOM, re-scanning...",
        );
        try {
          setupCommentSourceCaptioner();
        } catch (err) {
          console.debug(
            "[Aru Source Captioner] click: re-scan failed:",
            "COMMENT_RESCAN_FAILED",
          );
        }
        return;
      }

      // 정책: 출처는 첨부 이미지의 Aru Archive 메타데이터(artwork_url 등)에서만 가져온다.
      // 게시글 page URL(location.href)은 fallback으로 사용하지 않는다.
      // (search_type, #cmt 등 변동 fragment를 출처로 박는 사고 방지)
      const wrapper = resolveCommentWrapperForTextarea(textarea);
      const savedSource = wrapper ? wrapperSourceMap.get(wrapper) : null;

      if (!savedSource) {
        console.log(
          "[Aru Source Captioner] click: no extracted source — image not attached or has no Aru metadata",
        );
        try {
          alert(
            "이미지에 출처 metadata가 없습니다.\nAru Archive로 처리한 이미지를 댓글에 첨부해 주세요.",
          );
        } catch {
          /* noop — 일부 브라우저/iframe 환경에서 alert이 차단될 수 있다 */
        }
        return;
      }

      console.log("[Aru Source Captioner] click: stored source ready");
      const sourceText = buildCommentSourceText(savedSource);
      const result = insertSourceIntoCommentTextarea(textarea, sourceText);
      console.log("[Aru Source Captioner] click: insertion result =", result);
    }
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

    // 댓글 대상을 수집하되 DOM 객체와 입력 속성은 지원용 콘솔에 노출하지 않는다.
    function classifyAndPushWrapper(wrapper: HTMLElement, result: any[]) {
      const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
      if (!(textarea instanceof HTMLTextAreaElement)) {
        return;
      }
      const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);
      result.push(wrapper);

      if (imgButton) {
        console.log(
          "[Aru Source Captioner] scan: wrapper OK (has textarea + .common_img_button)",
        );
      } else {
        console.log(
          "[Aru Source Captioner] scan: wrapper has textarea but no .common_img_button — will use textarea position",
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
      _detail?: { maxLen: any; newLen: any } | undefined,
    ) {
      // 건너뛴 이유는 고정 코드만 남긴다. 댓글 본문·출처와 DOM 객체는 콘솔에 전달하지 않는다.
      console.debug(
        "[Aru Source Captioner] comment insert skipped:",
        [
          "duplicate_source_line",
          "other_source_present",
          "maxlength_exceeded",
        ].includes(reason)
          ? reason
          : "COMMENT_INSERT_SKIPPED",
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
        console.debug(
          "[Aru Source Captioner] event dispatch failed:",
          "COMMENT_EVENT_FAILED",
        );
      }
    }

    function insertSourceIntoCommentTextarea(
      textarea: Node | null,
      sourceText: string,
    ) {
      if (!effectGate.allows()) {
        return "context-inactive";
      }
      if (!(textarea instanceof HTMLTextAreaElement)) {
        console.warn("[Aru Source Captioner] insert: not a textarea element");
        return "not-textarea";
      }

      const existing = typeof textarea.value === "string" ? textarea.value : "";
      const sourceLine = sourceText.split("\n")[0]; // "출처: {url}"

      console.log("[Aru Source Captioner] insert: called", {
        textareaExists: true,
        inDOM: document.contains(textarea),
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

    function injectCommentSourceButton(wrapper: {
      dataset: { [x: string]: string };
      querySelector: (arg0: string) => any;
    }) {
      if (!(wrapper instanceof HTMLElement)) {
        return false;
      }

      if (wrapper.dataset[COMMENT_BOUND_DATASET_KEY] === "1") {
        console.log("[Aru Source Captioner] inject: skipped (already bound)");
        return false;
      }

      const textarea = wrapper.querySelector(COMMENT_TEXTAREA_SELECTOR);
      if (!(textarea instanceof HTMLTextAreaElement)) {
        console.log("[Aru Source Captioner] inject: skipped (no textarea)");
        return false;
      }

      // 이미 동일 wrapper에 주입된 적이 있으면 (DOM 재구성 등) 추가 주입 방지.
      // 일반 댓글과 대댓글은 각각 독립된 wrapper를 가지므로 page-level dedupe는
      // 하지 않는다 — 첫 wrapper에 button이 들어가면 대댓글 wrapper가 영원히
      // skip되는 사고를 막기 위함이다. wrapper-level guard만 유지한다.
      if (wrapper.querySelector("." + COMMENT_BUTTON_CLASS)) {
        wrapper.dataset[COMMENT_BOUND_DATASET_KEY] = "1";
        resources.own(() => {
          delete wrapper.dataset[COMMENT_BOUND_DATASET_KEY];
        });
        console.log(
          "[Aru Source Captioner] inject: skipped (button already in this wrapper)",
        );
        return false;
      }

      const imgButton = wrapper.querySelector(COMMENT_IMG_BUTTON_SELECTOR);

      const button = document.createElement("button");
      button.type = "button";
      button.className = COMMENT_BUTTON_CLASS;
      button.textContent = "출처 추가";
      button.title = "현재 게시글 URL을 댓글에 출처로 추가합니다";
      button.dataset.aruSourceCommentButton = "1";
      resources.own(() => button.remove());

      resources.listen(button, "click", (ev) => {
        // 사이트의 form submit / 다른 핸들러 트리거를 막는다.
        try {
          ev.preventDefault();
        } catch {
          /* noop */
        }
        try {
          ev.stopPropagation();
        } catch {
          /* noop */
        }
        handleCommentSourceButtonClick(textarea);
      });

      try {
        // 1순위: .common_img_button 옆에 삽입.
        // 2순위: textarea 직후에 삽입 (Ruliweb DOM 변형 대응).
        if (imgButton instanceof HTMLElement) {
          imgButton.after(button);
        } else {
          textarea.after(button);
          console.log(
            "[Aru Source Captioner] inject: used textarea fallback (no .common_img_button)",
          );
        }
      } catch (err) {
        console.debug(
          "[Aru Source Captioner] comment button insert failed:",
          "COMMENT_BUTTON_FAILED",
        );
        return false;
      }

      console.log("[Aru Source Captioner] inject: button added");
      return true;
    }

    // 첨부된 이미지 file input에서 첫 번째 이미지의 Aru Archive metadata를 파싱하여
    // 안전한 source URL로 정제한 뒤 wrapperSourceMap에 저장하고, textarea에 자동으로
    // 출처 caption을 삽입한다. 글쓰기 페이지의 parseSourceFromFile + sanitizeSourceUrl
    // 경로를 그대로 재사용한다 (재발명 금지).
    //
    // 주의:
    //   - 기존 onchange inline 핸들러(app.comment_img / app.comment_img_drop 트리거)는
    //     절대 가로채지 않는다 — addEventListener("change", ...)로만 추가한다.
    //   - input별 binding으로 중복 hook을 막는다. 복제된 dataset은 리스너 소유 증거가 아니다.
    //   - wrapper가 교체되면 이전 리스너를 해제하고 새 binding만 현재 선택을 승인한다.
    function hookCommentFileInput(wrapper: object, config: Options) {
      if (!effectGate.allows()) {
        return false;
      }
      if (!(wrapper instanceof HTMLElement)) {
        return false;
      }

      const fileInput = wrapper.querySelector(COMMENT_FILE_INPUT_SELECTOR);
      if (!(fileInput instanceof HTMLInputElement)) {
        console.log("[Aru Source Captioner] file: no file input in wrapper");
        return false;
      }
      if (fileInput.type !== "file") {
        // common_img_input이 아닌 다른 input이 잡힌 경우 (예: 검색 input).
        return false;
      }
      // 세션 Gate와 별개로 이 입력이 설치된 native ID도 보존한다. 선택 revision은 문서 epoch와 다르다.
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
      resources.own(() => {
        delete fileInput.dataset[COMMENT_FILE_BOUND_DATASET_KEY];
      });

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
          effectGate.allows() &&
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

        console.log("[Aru Source Captioner] file: metadata parsing started");

        let sourceInfo;
        try {
          sourceInfo = await parseSourceFromFile(imageFile);
        } catch (err) {
          console.warn(
            "[Aru Source Captioner] file: metadata extraction threw",
            "COMMENT_METADATA_FAILED",
          );
          return;
        }

        if (!isCurrentSelection()) {
          return;
        }
        if (sourceInfo?.status !== "ok" || !sourceInfo.url) {
          console.log(
            "[Aru Source Captioner] file: no Aru source metadata found in image",
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
          );
          return;
        }

        console.log("[Aru Source Captioner] file: source validated");
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
          );
        }
      }
      fileInput.addEventListener("change", onFileChange);
      resources.own(() => {
        ++selection.revision;
        fileInput.removeEventListener("change", onFileChange);
      });

      console.log("[Aru Source Captioner] file: hooked file input change");
      return true;
    }

    function setupCommentSourceCaptioner(
      config: Options | undefined = undefined,
    ) {
      if (!effectGate.allows()) {
        return;
      }
      if (!isReadPage()) {
        return;
      }
      // config 인자가 없으면 init()에서 캐시한 readPageConfig를 사용한다.
      // 둘 다 없으면 file input hook은 skip되지만 button 주입은 진행한다.
      const effectiveConfig = config || readPageConfig;
      const wrappers = findCommentInputWrappers();
      let injected = 0;
      let hookedFileInputs = 0;
      for (const wrapper of wrappers) {
        // 출처 추가 button 주입 — 한 wrapper당 1회.
        if (wrapper.dataset[COMMENT_BOUND_DATASET_KEY] !== "1") {
          const ok = injectCommentSourceButton(wrapper);
          if (ok) {
            wrapper.dataset[COMMENT_BOUND_DATASET_KEY] = "1";
            resources.own(() => {
              delete wrapper.dataset[COMMENT_BOUND_DATASET_KEY];
            });
            injected++;
          }
        }
        // file input change hook — wrapper 안의 file input마다 dataset 가드로 1회.
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
      } else if (injected > 0 || hookedFileInputs > 0) {
        console.log(
          `[Aru Source Captioner] setup: injected ${injected} new buttons, hooked ${hookedFileInputs} new file inputs`,
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
          console.debug(
            "[Aru Source Captioner] comment setup failed:",
            "COMMENT_SETUP_FAILED",
          );
        }
      });
    }

    function startCommentObserver() {
      if (!effectGate.allows()) {
        return;
      }
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
          console.debug(
            "[Aru Source Captioner] poll setup failed:",
            "COMMENT_POLL_FAILED",
          );
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
      const _allowKeywords =
        (config && config.ruliwebAiRevealAllowKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealAllowKeywords;
      const _blockKeywords =
        (config && config.ruliwebAiRevealBlockKeywords) ||
        DEFAULT_OPTIONS.ruliwebAiRevealBlockKeywords;
      console.info("[Aru][reveal] overlay keyword decision", {
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
        );
        return false;
      }
      console.log("[Aru][reveal] overlay click target");
      const hrefBefore = location.href;
      _dispatchPointerMouseSequence(pointEl, cx, cy);
      setTimeout!(() => {
        if (location.href !== hrefBefore) {
          console.error(
            "[Aru][reveal] URL changed after overlay click",
            "REVEAL_NAVIGATION_CHANGED",
          );
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
        exifrAvailable: typeof exifr !== "undefined",
      });

      const config = await loadConfig();
      if (!effectGate.allows()) {
        return;
      }

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
            strictAllowlist: config.strictAllowlist === true,
            allowHttp: config.allowHttp === true,
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
        "[Aru Source Captioner] phase 2B active — caption insertion enabled",
        {
          strictAllowlist: config.strictAllowlist === true,
          allowHttp: config.allowHttp === true,
        },
      );
    }

    // 옵션은 초기화 때 조회하므로 변경 후 페이지 새로고침이 필요하다.
    // 즉시 반영을 추가할 때는 Controller의 설정 참조와 리스너 수명을 함께 갱신해야 한다.

    init().catch((_err) => {
      console.warn(
        "[Aru Source Captioner] init failed:",
        "CONTENT_INIT_FAILED",
      );
    });
  };
  runBootstrap1();

  return {};
}
