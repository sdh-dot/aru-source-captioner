export interface BundleSlave {
  page: number;
  articleId: number;
  images: string[];
  [field: string]: unknown;
}
export interface BundleValue {
  version: number;
  boardId: number;
  name: string;
  mainArticleId: number;
  slaves: BundleSlave[];
  [field: string]: unknown;
}
export interface SourceSummary {
  articleId: number;
  urls: string[];
  title?: string;
  [field: string]: unknown;
}
export interface DraftRow {
  slave: BundleSlave;
  summary: SourceSummary | null;
}
export interface DraftSnapshot {
  format: string;
  version: number;
  base: BundleValue | null;
  name: string;
  rows: DraftRow[];
}
