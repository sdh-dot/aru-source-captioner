import type { BundleValue } from "../bundle-generator/models.ts";
export interface Variant {
  role: string;
  url: string;
  articleId?: number;
  [key: string]: unknown;
}
export interface MetadataOrigin {
  sourceId: string;
  articleId: number;
  originalIndex: number;
}
export interface MetadataIcon {
  iconId: string;
  name: string;
  keywords: string[];
  tagIds: string[];
  categoryIds: string[];
  sortOrder: number;
  origin: MetadataOrigin;
  mediaKind: string;
  alsoFrom?: MetadataOrigin[];
  ref?: { page: number; index: number };
  media?: { kind: string; variants: Variant[] };
  variants?: Variant[];
  publishedSlot?: { articleId: number; index: number };
  [key: string]: unknown;
}
export interface MetadataSource {
  sourceId: string;
  articleId: number;
  title: string;
  [key: string]: unknown;
}
export interface MetadataV2 {
  format: string;
  version: number;
  kind: string;
  boardId: number;
  packId: string;
  mainArticleId: number;
  revision: number;
  name: string;
  description?: string;
  v1Digest?: string;
  tags: { id: string; name: string }[];
  categories: { id: string; name: string; aliases?: string[] }[];
  sources: MetadataSource[];
  icons: MetadataIcon[];
}
export interface DecodedCarrier<T> {
  value: T;
  encoded: string;
  decodedText: string;
  decodedBytes: Uint8Array<ArrayBuffer>;
}
export interface CarrierOptions {
  type?: string;
  boardId?: number;
  articleId?: number;
}
export type CarrierInput = Partial<Record<string, string[]>>;
export type { BundleValue };
