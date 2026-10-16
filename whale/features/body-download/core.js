// 자동 생성: tools/build-esm.mjs. docs/source/compat 및 .mjs 원본만 수정한다.
(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // docs/source/runtime/module-scope.mjs
  function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
      if (own.includes(name)) scope[name] = resolvers[name]?.();
      else Object.defineProperty(scope, name, { enumerable: true, get: /* @__PURE__ */ __name(() => resolvers[name]?.(), "get") });
    }
    return scope;
  }
  __name(createModuleScope, "createModuleScope");
  function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
  }
  __name(selectModuleExports, "selectModuleExports");

  // docs/source/body-download/core.mjs
  function createDownloadCore({ environment = globalThis, dependencies = {} } = {}) {
    const { URL } = environment;
    let downloads2 = createModuleScope(dependencies.downloads, [], ["HOSTS", "JOB_KEY", "error", "article", "mediaUrl", "safeName", "folder", "originalFilename", "numbered", "streamMedia", "signature", "inspect", "actualName", "localManifest"]);
    const initializeDownloadCore = /* @__PURE__ */ __name(function(root) {
      "use strict";
      const D = downloads2 = downloads2 || {};
      const HOSTS = ["i1.ruliweb.com", "i2.ruliweb.com", "i3.ruliweb.com"];
      const JOB_KEY = "aruBodyDownloadJobV1";
      const error = /* @__PURE__ */ __name((code, message) => Object.assign(new Error(message), { code }), "error");
      function article(url) {
        let u;
        try {
          u = new URL(url);
        } catch (_) {
          throw error("PAGE_URL", "게시글 주소를 확인할 수 없습니다.");
        }
        const match = u.pathname.match(/^\/community\/board\/98\/read\/([1-9]\d{0,14})\/?$/);
        if (u.protocol !== "https:" || !["bbs.ruliweb.com", "m.ruliweb.com"].includes(u.hostname) || u.port || u.username || u.password || !match)
          throw error("PAGE_URL", "아이콘 공유 게시판의 게시글 읽기 페이지에서 실행해 주세요.");
        return { site: "ruliweb", boardId: 98, articleId: match[1], url: u.origin + "/community/board/98/read/" + match[1] };
      }
      __name(article, "article");
      function mediaUrl(value, base) {
        if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) throw error("MEDIA_URL", "안전하지 않은 이미지 주소입니다.");
        let u;
        try {
          u = new URL(value, base);
        } catch (_) {
          throw error("MEDIA_URL", "이미지 주소를 해석할 수 없습니다.");
        }
        if (u.protocol !== "https:" || !HOSTS.includes(u.hostname) || u.username || u.password || u.port || u.hash)
          throw error("MEDIA_URL", "허용된 루리웹 이미지 CDN 주소가 아닙니다.");
        return u.href;
      }
      __name(mediaUrl, "mediaUrl");
      function safeName(value, max = 100) {
        let text = String(value || "").normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "_").replace(/\s+/gu, " ").trim().replace(/^[. ]+|[. ]+$/gu, "");
        if (!text) text = "제목 없음";
        if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(text)) text = "_" + text;
        text = [...text].slice(0, max).join("").replace(/[. ]+$/u, "");
        while (text.length > max) text = [...text].slice(0, -1).join("");
        return text || "제목 없음";
      }
      __name(safeName, "safeName");
      function folder(source, runId) {
        const suffix = String(runId).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30);
        if (!suffix) throw error("RUN_ID", "다운로드 실행 식별자가 없습니다.");
        return "Aru-Icons/" + safeName(source.title, 75) + " (" + source.articleId + ")/" + suffix;
      }
      __name(folder, "folder");
      function originalFilename(url) {
        const value = new URL(url).pathname.split("/").pop();
        try {
          return decodeURIComponent(value);
        } catch (_) {
          return value;
        }
      }
      __name(originalFilename, "originalFilename");
      function numbered(index, ext) {
        return String(index).padStart(3, "0") + "." + ext;
      }
      __name(numbered, "numbered");
      function streamMedia(value, mime = "") {
        const type = String(mime).split(";")[0].trim().toLowerCase();
        if (["application/vnd.apple.mpegurl", "application/x-mpegurl", "audio/mpegurl", "audio/x-mpegurl", "application/dash+xml", "video/mp2t"].includes(type)) return true;
        try {
          return /\.(?:m3u8|mpd|m4s|ts)$/i.test(new URL(value).pathname);
        } catch (_) {
          return false;
        }
      }
      __name(streamMedia, "streamMedia");
      function isoMedia(b) {
        const text = /* @__PURE__ */ __name((p, n) => String.fromCharCode(...b.subarray(p, p + n)), "text");
        const u32 = /* @__PURE__ */ __name((p) => b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3], "u32");
        let budget = 4096, encrypted = false;
        function boxes(start, end, depth = 0) {
          if (depth > 16) throw Error("depth");
          const result2 = [];
          for (let p = start; p < end; ) {
            if (--budget < 0 || p + 8 > end) throw Error("box");
            let size = u32(p), head = 8;
            const type = text(p + 4, 4);
            if (size === 1) {
              if (p + 16 > end) throw Error("large box");
              size = u32(p + 8) * 4294967296 + u32(p + 12);
              head = 16;
            }
            if (size === 0) size = end - p;
            if (!Number.isSafeInteger(size) || size < head || p + size > end) throw Error("size");
            const data = p + head, limit = p + size;
            result2.push({ type, data, end: limit });
            if (["pssh", "encv", "enca", "sinf"].includes(type)) encrypted = true;
            if (["moov", "trak", "mdia", "minf", "stbl", "mvex", "moof", "traf", "sinf", "schi"].includes(type)) boxes(data, limit, depth + 1);
            if (type === "stsd") {
              if (data + 8 > limit) throw Error("stsd");
              boxes(data + 8, limit, depth + 1);
            }
            if (["avc1", "avc3", "hvc1", "hev1", "av01", "vp08", "vp09", "encv"].includes(type) && data + 78 < limit) boxes(data + 78, limit, depth + 1);
            p = limit;
          }
          return result2;
        }
        __name(boxes, "boxes");
        try {
          const top = boxes(0, b.length), ftyp = top.find((x) => x.type === "ftyp");
          if (!ftyp || ftyp.data + 8 > ftyp.end || (ftyp.end - ftyp.data) % 4) return null;
          const brands = [text(ftyp.data, 4)];
          for (let p = ftyp.data + 8; p + 4 <= ftyp.end; p += 4) brands.push(text(p, 4));
          if (brands.some((x) => ["avif", "avis"].includes(x))) return { ext: "avif", mime: "image/avif", mediaKind: "image" };
          if (brands.some((x) => ["qt  ", "heic", "heix", "hevc", "hevx"].includes(x))) return null;
          if (!brands.some((x) => /^(?:isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(x))) return null;
          if (encrypted) return { ext: null, mime: "video/mp4", reason: "encrypted-media" };
          if (!top.some((x) => x.type === "moov") || !top.some((x) => x.type === "mdat" && x.end > x.data)) return null;
          return { ext: "mp4", mime: "video/mp4", mediaKind: "video" };
        } catch (_) {
          return null;
        }
      }
      __name(isoMedia, "isoMedia");
      function webmMedia(b) {
        let budget = 4096, encrypted = false;
        function vint(p, asId = false) {
          if (p >= b.length || !b[p]) throw Error("vint");
          let n = 1, mask = 128;
          while (!(b[p] & mask)) {
            n++;
            mask >>= 1;
          }
          if (n > (asId ? 4 : 8) || p + n > b.length) throw Error("vint length");
          let value = asId ? b[p] : b[p] & mask - 1, unknown = !asId && value === mask - 1;
          for (let i = 1; i < n; i++) {
            value = value * 256 + b[p + i];
            unknown = unknown && b[p + i] === 255;
          }
          if (!unknown && !Number.isSafeInteger(value)) throw Error("vint range");
          return { value, n, unknown };
        }
        __name(vint, "vint");
        function elements(start, end, depth = 0) {
          if (depth > 16) throw Error("depth");
          const list = [];
          for (let p = start; p < end; ) {
            if (--budget < 0) throw Error("budget");
            const id = vint(p, true), size = vint(p + id.n), data = p + id.n + size.n;
            if (size.unknown && ![408125543, 524531317].includes(id.value)) throw Error("unknown size");
            const limit = size.unknown ? end : data + size.value;
            if (data > end || limit > end) throw Error("element size");
            list.push({ id: id.value, data, end: limit });
            if ([28032, 20533].includes(id.value)) encrypted = true;
            if ([408125543, 374648427, 174, 28032, 25152].includes(id.value)) elements(data, limit, depth + 1);
            p = limit;
          }
          return list;
        }
        __name(elements, "elements");
        try {
          const top = elements(0, b.length), header = top[0];
          if (header?.id !== 440786851) return null;
          const doc = elements(header.data, header.end).find((x) => x.id === 17026);
          if (!doc || String.fromCharCode(...b.subarray(doc.data, doc.end)) !== "webm") return null;
          const segment = top.find((x) => x.id === 408125543);
          if (!segment) return null;
          const children = elements(segment.data, segment.end);
          if (encrypted) return { ext: null, mime: "video/webm", reason: "encrypted-media" };
          if (!children.some((x) => x.id === 374648427) || !children.some((x) => x.id === 524531317 && x.end > x.data)) return null;
          return { ext: "webm", mime: "video/webm", mediaKind: "video" };
        } catch (_) {
          return null;
        }
      }
      __name(webmMedia, "webmMedia");
      function signature(bytes) {
        const b = bytes, s = /* @__PURE__ */ __name((start, count) => String.fromCharCode(...b.subarray(start, start + count)), "s");
        if (b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) return { ext: "png", mime: "image/png" };
        if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return { ext: "jpg", mime: "image/jpeg" };
        if (b.length >= 6 && ["GIF87a", "GIF89a"].includes(s(0, 6))) return { ext: "gif", mime: "image/gif" };
        if (b.length >= 12 && s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return { ext: "webp", mime: "image/webp" };
        if (b.length >= 8 && ["ftyp", "free", "skip", "wide"].includes(s(4, 4))) return isoMedia(b) || { ext: null, mime: "unknown" };
        if (b.length >= 4 && [26, 69, 223, 163].every((v, i) => b[i] === v)) return webmMedia(b) || { ext: null, mime: "unknown" };
        return { ext: null, mime: "unknown" };
      }
      __name(signature, "signature");
      function inspect(bytes, mime, url) {
        const detected = signature(bytes), declared = String(mime || "").split(";")[0].trim().toLowerCase();
        if (!detected.ext) throw error("UNSUPPORTED_MEDIA", detected.reason === "encrypted-media" ? "암호화된 미디어는 지원하지 않습니다." : "지원하는 미디어 파일 구조가 아닙니다 (" + detected.mime + ").");
        if (declared === "text/html" || declared === "application/xhtml+xml") throw error("UNSUPPORTED_MEDIA", "서버가 미디어 대신 HTML을 반환했습니다.");
        if (streamMedia(url, declared)) throw error("UNSUPPORTED_MEDIA", "스트리밍 목록이나 분할 파일은 지원하지 않습니다.");
        const urlExt = new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "";
        const normal = /* @__PURE__ */ __name((x) => x === "jpeg" ? "jpg" : x, "normal");
        const mismatches = [];
        if (normal(urlExt) !== detected.ext) mismatches.push("url-extension");
        if (declared !== detected.mime) mismatches.push("response-mime");
        return { ...detected, mediaKind: detected.mediaKind || "image", responseMimeType: declared, urlExtension: urlExt, mismatches };
      }
      __name(inspect, "inspect");
      function actualName(path) {
        return String(path || "").replace(/\\/g, "/").split("/").pop();
      }
      __name(actualName, "actualName");
      function localManifest(job) {
        return {
          schemaVersion: 1,
          kind: "aru-local-body-download",
          source: job.source,
          runId: job.id,
          createdAt: job.createdAt,
          finishedAt: job.finishedAt || null,
          status: job.status,
          requestedFolder: job.folder,
          bodySelector: job.bodySelector,
          counts: job.counts,
          unsupported: job.unsupported,
          images: job.images.map((x) => ({ ...x, filename: x.status === "complete" ? actualName(x.actualPath) : null })),
          notice: "로컬 저장 기록입니다. 공개 메타데이터나 재배포 허가가 아닙니다."
        };
      }
      __name(localManifest, "localManifest");
      Object.assign(D, { HOSTS, JOB_KEY, error, article, mediaUrl, safeName, folder, originalFilename, numbered, streamMedia, signature, inspect, actualName, localManifest });
    }, "initializeDownloadCore");
    initializeDownloadCore(environment);
    return { "downloads": selectModuleExports(downloads2, ["HOSTS", "JOB_KEY", "error", "article", "mediaUrl", "safeName", "folder", "originalFilename", "numbered", "streamMedia", "signature", "inspect", "actualName", "localManifest"]) };
  }
  __name(createDownloadCore, "createDownloadCore");

  // docs/source/compat/body-download-core.mjs
  var downloads = globalThis.AruBodyDownload = globalThis.AruBodyDownload || {};
  var result = createDownloadCore({ environment: globalThis, dependencies: { downloads: {} } });
  Object.assign(downloads, result.downloads);
})();
