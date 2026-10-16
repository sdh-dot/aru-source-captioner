export interface SourceResult {
  status: string;
  url?: string | null;
  reason?: string;
  fileName?: string;
  [key: string]: unknown;
}
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
