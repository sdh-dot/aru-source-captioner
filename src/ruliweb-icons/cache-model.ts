export interface CachePayload {
  boardId?: string | number;
  articleId?: string | number;
  catalogSource?: string;
  packKind?: string;
  readerVersion?: number;
  snapshot?: Record<string, unknown>;
  rawMetadata?: unknown;
  ttlMs?: number;
  all?: boolean;
}
export interface CacheRecord {
  cacheKey: string;
  snapshot: Record<string, unknown>;
  rawMetadata: unknown;
  acquiredAt: number;
  expiresAt: number;
  lastAccess: number;
  byteSize: number;
}
