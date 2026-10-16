export interface IconOrigin {
  sourceId?: string;
  articleId?: string | number;
  originalIndex?: number;
}
export interface Icon {
  id?: string;
  iconId?: string;
  name?: string;
  keywords?: string[];
  sourceId?: string;
  origin?: IconOrigin;
  ref?: { index?: number };
  mediaKind?: string;
  tagIds?: string[];
  categoryIds?: string[];
  sortOrder?: number;
  url?: string;
  imageMetadata?: { id?: string; tags?: string[] };
}
export interface IconCategory {
  id: string;
  name?: string;
  aliases?: string[];
}
export interface IconSource {
  sourceId: string;
  title?: string;
  articleId?: string | number;
}
export interface IconTag {
  id: string;
  name: string;
}
export interface IconPack<T extends Icon = Icon> {
  icons?: T[];
  categories?: IconCategory[];
  sources?: IconSource[];
  tags?: IconTag[];
}
export interface SearchState {
  query?: string;
  selectedTagIds?: string[];
  categoryFilterIds?: string[];
  sourceFilterIds?: string[];
  tagMatch?: string;
  sort?: string;
}
export interface SearchEntry<T extends Icon = Icon> {
  icon: T;
  id: string;
  position: number;
  sourceId: string;
  tagIds: Set<string>;
  fields: string[];
}
export interface IndexedGroup<T extends Icon = Icon> {
  id: string;
  name?: string;
  aliases: string[];
  sourceId?: string;
  entries: SearchEntry<T>[];
  seen: Set<string>;
  fields: string[];
}
export interface SearchGroup<T extends Icon = Icon> {
  id: string;
  name?: string;
  aliases?: string[];
  sourceId?: string;
  icons: T[];
  count?: number;
}
export interface SearchResult<T extends Icon = Icon> {
  groups: SearchGroup<T>[];
  uniqueCount: number;
  membershipCount: number;
  active: boolean;
}

export interface ArticleReference {
  boardId: string | number;
  articleId: string | number;
  title?: string;
  source?: string;
  sources?: string[];
}

export interface LibraryMembership {
  packKey: string;
  title?: string;
  position: number;
  kind?: string;
  sources: string[];
  titles: string[];
}
export interface LibraryRow {
  identity: string;
  icon: Icon;
  tags: string[];
  tagLabels: string[];
  memberships: LibraryMembership[];
  order: number;
  acquiredAt: number;
}
export interface LibraryState {
  scope: string;
  currentKey: string | null;
  query: string;
  textMatch: string;
  selectedTags: string[];
  tagMatch: string;
  [key: string]: string | string[] | null | undefined;
}
export interface LibraryProgress {
  status: string;
  total: number;
  cached?: number;
  loaded: number;
  failed: number;
  errors: { packKey: string; code: string }[];
  [key: string]: unknown;
}
export interface LoadedPack {
  pack: IconPack & { kind?: string; name?: string; title?: string };
  acquiredAt?: number;
  stale?: boolean;
}
export interface LibraryReader {
  getCached(
    ref: ArticleReference,
    options?: { signal?: AbortSignal },
  ): Promise<LoadedPack | null>;
  load(
    ref: ArticleReference,
    options?: { signal?: AbortSignal; forceRead?: boolean },
  ): Promise<LoadedPack>;
  invalidate(
    ref: ArticleReference,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}
export interface CatalogEntry extends ArticleReference {
  key?: string;
  url?: string;
  source?: string;
  title?: string;
  thumbnail?: string | null;
  expectedKind?: string | null;
  knownIconCount?: number;
  [key: string]: unknown;
}
export interface MediaJob {
  node: HTMLImageElement | HTMLVideoElement;
  url: string;
  onTimeout?: () => void;
  canStart: () => boolean;
  completion: { events: string[]; isReady: () => boolean } | null;
  finish: (() => void) | null;
}
