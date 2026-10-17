export interface MediaSignature {
  ext: string | null;
  mime: string;
  reason?: string;
  mediaKind?: string;
}
export interface DownloadImage {
  index: number;
  originalUrl: string;
  originalFilename?: string;
  status: string;
  actualPath?: string;
  downloadId?: number;
  byteLength?: number;
  requestedFilename?: string;
  filename?: string;
  error?: { code: string; message: string } | null;
  attempts?: number;
  mismatches?: string[];
  [key: string]: unknown;
}
export interface DownloadJob {
  id: string;
  createdAt: string;
  finishedAt?: string;
  source: { title?: string; articleId: string; [key: string]: unknown };
  status: string;
  folder: string;
  bodySelector: string;
  counts: Record<string, number>;
  unsupported: unknown[];
  images: DownloadImage[];
  currentIndex?: number | null;
  error?: string;
  manifest?: {
    status: string;
    actualPath?: string;
    filename?: string;
    filenameMatchesRequest?: boolean;
    error?: string;
  };
}
export interface SavedDownload {
  id: number;
  filename: string;
  mime?: string;
  state: string;
  exists?: boolean;
  fileSize?: number;
  error?: string;
}
