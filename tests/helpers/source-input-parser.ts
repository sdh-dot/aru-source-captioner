import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";
import { transformSync } from "esbuild";
import exifr from "exifr";
import { parsePixivFilenameUrl } from "../../src/source-caption/pixiv-filename.ts";
import * as png from "../../src/source-caption/png-chunks.ts";

export function sourceInputParser(browser: string, input?: string) {
  const text = input ?? fs.readFileSync(new URL(`../../src/platform/${browser}/content.ts`, import.meta.url), "utf8");
  const source = transformSync(text, { loader: "ts", target: "es2022", format: "esm" }).code;
  const names = new Set(["isPngFile", "decodeAruPayloadFromItxtText", "parseAruArchivePngItxt", "extractSourceFromAruArchivePayload", "parseSourceFromFile", "isPixivUserUrl", "extractSourceUrl", "collectFromPossibleAruJson", "collectUrlCandidates", "walkStringFields", "safeJsonParse", "uniqueOrdered"]);
  const constants = new Set(["ARU_ITXT_KEYWORD", "ARU_PAYLOAD_URL_KEYS", "TEXT_FIELDS_FOR_JSON", "WALK_MAX_DEPTH", "URL_PATTERN"]);
  const declarations: string[] = [];
  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    const node = value as {type?: string; id?: {name?: string}; start?: number; end?: number};
    if (node.type === "FunctionDeclaration" && names.has(node.id?.name || "")) declarations.push(source.slice(node.start, node.end));
    if (node.type === "VariableDeclarator" && constants.has(node.id?.name || "")) declarations.push("const " + source.slice(node.start, node.end) + ";");
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  }
  visit(parse(source, { ecmaVersion: "latest", sourceType: "module" }));
  const calls: {name: string; options: object}[] = [];
  const api = vm.runInNewContext(declarations.join("\n") + ";({extractSourceFromAruArchivePayload,collectFromPossibleAruJson,extractSourceUrl,parseSourceFromFile})", {
    ...png, parsePixivFilenameUrl, TextDecoder, TextEncoder, URL, Uint8Array, DataView,
    console: {info(){},warn(){},debug(){}},
    exifr: {parse: async (file: File, options: object) => {
      calls.push({name: file.name, options});
      return exifr.parse(Buffer.from(await file.arrayBuffer()), options);
    }},
  }) as {
    extractSourceFromAruArchivePayload(payload: unknown): {status: string; url: string | null};
    collectFromPossibleAruJson(metadata: object, candidates: string[]): object;
    extractSourceUrl(metadata: object): string[];
    parseSourceFromFile(file: File): Promise<{status: string; url: string | null; reason: string}>;
  };
  return {...api, calls};
}
