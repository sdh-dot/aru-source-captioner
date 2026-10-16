import type { DynamicApi } from "../runtime/contracts.ts";
import type {
  Icon,
  IconSource,
  LibraryRow,
  LibraryState,
  LoadedPack,
  LibraryProgress,
} from "./models.ts";
export interface PickerActionResult {
  ok?: boolean;
  [key: string]: unknown;
}
export interface PickerOptions {
  anchor?: HTMLElement | null;
  opener?: HTMLElement | null;
  catalogMode?: boolean;
  insertionMode?: boolean;
  debug?: boolean;
  fontURL?: string;
  initialCollapsed?: Map<string, boolean> | Record<string, boolean>;
  targetLabel?: string;
  targetValid?: boolean;
  openCatalogInitially?: boolean;
  librarySearch?: PickerLibrary;
  uiPreferences?: DynamicApi;
  onCatalogCancel?: () => void;
  onCatalogSource?: (
    reference: unknown,
  ) => PickerActionResult | Promise<PickerActionResult> | undefined;
  onDirectSource?: (
    value: string,
    board: string,
  ) => PickerActionResult | Promise<PickerActionResult> | undefined;
  onSource?: (source: string) => unknown;
  onRefresh?: (...args: unknown[]) => unknown;
  onRetry?: (...args: unknown[]) => unknown;
  onStop?: () => void;
  onSelect?: (
    icon: Icon,
  ) =>
    | string
    | { message?: string }
    | void
    | Promise<string | { message?: string } | void>;
  onLibraryScope?: (scope: string) => void;
  [callback: string]: unknown;
}

export interface PickerIcon extends Icon {
  id: string;
  url: string;
  mediaKind?: string;
  ref?: { index?: number };
  libraryMemberships?: import("./models.ts").LibraryMembership[];
  librarySource?: IconSource;
  libraryIdentity?: string;
  [name: string]: unknown;
}
export interface PickerPack {
  icons: PickerIcon[];
  tags?: { id: string; name: string }[];
  categories?: { id: string; name?: string; aliases?: string[] }[];
  sources?: (IconSource & {
    id?: string;
    articleUrl?: string;
    url?: string;
    boardId?: string | number;
  })[];
  id?: string;
  packId?: string;
  mainArticleId?: number;
  articleId?: number;
  boardId?: string | number;
  title?: string;
  name?: string;
  kind?: string;
  packKind?: string;
  representative?: { articleId?: string | number; boardId?: string | number };
  bodyCounts?: { metadata?: Record<string, number>; [key: string]: unknown };
  [name: string]: unknown;
}
export interface PickerGroupContext {
  group: {
    id: string;
    name?: string;
    icons: PickerIcon[];
    count?: number;
    aliases?: string[];
  };
  viewport: HTMLDivElement;
  content: HTMLDivElement;
  columns: number;
  visible: boolean;
  lastWindow: string | number | null;
  forceIndex: number | null;
  rowHeight?: number;
  scrollHandler?: EventListener;
  toggle?: HTMLButtonElement | null;
}
export interface PreviewState {
  iconId: string | null;
  status: string;
  code: string | null;
}

export interface PickerLibraryResult {
  items: LibraryRow[];
  progress: LibraryProgress;
  scopedIndexed: number;
  scopedRegistered: number;
  partial: boolean;
  registered: number;
  indexed: number;
}
export interface PickerLibrary {
  state: LibraryState;
  packs: Map<string | null, LoadedPack & { pack: PickerPack }>;
  rows: LibraryRow[];
  search(): PickerLibraryResult;
  setState(state: Partial<LibraryState>): PickerLibraryResult;
  collect(options: {
    refresh?: boolean;
    onProgress?: () => void;
  }): Promise<unknown>;
  cancel(): void;
  remember(...args: unknown[]): void;
}
export interface PickerProgress {
  status?: string;
  busy?: boolean;
  phase?: string;
  message?: string;
  loaded?: number;
  count?: number;
  total?: number;
  declaredCount?: number;
  verifiedCount?: number;
  fetchedAt?: string | number;
  processed?: number;
  states?: {
    articleId?: number | string;
    page?: number;
    status?: string;
    metadataStatus?: string;
    declared?: number;
    matched?: number;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}
export interface MetadataDiagnostic {
  mediaDetail: { iconId?: string; reason?: string; [key: string]: unknown }[];
  [key: string]: unknown;
}
