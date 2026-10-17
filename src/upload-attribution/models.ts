export interface SourceResult {
  status: string;
  url?: string | null;
  reason?: string;
  fileName?: string;
  [key: string]: unknown;
}
// 파일명·메타데이터 판독 결과와 큐의 cancelled 상태를 구분해 출처 없는 성공 결과를 막는다.
export type ParsedSourceResult =
  | { status: "ok"; url: string; reason: string }
  | { status: "missing" | "error"; url: null; reason: string };

export interface SourceFile {
  name?: string;
  size?: number;
  lastModified?: number;
}
export interface SourceRecord {
  id: string;
  batch: string;
  index: number;
  name: string;
  size?: number;
  modified?: number;
  root: object;
  ordinal: number;
  created: number;
  state: string;
  consumed: boolean;
  info: SourceResult | null;
}
export type SourceMatch =
  | {
      status: "matched";
      url: string;
      record: SourceRecord;
      evidence: string;
      possibleIds: string[];
    }
  | {
      status:
        | "capacity"
        | "expired"
        | "unidentified"
        | "waiting"
        | "source-missing"
        | "ambiguous";
    };
