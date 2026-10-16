export interface MetadataImage {
  handle: string;
  index: number;
  id?: string | null;
  src: string;
  alt: string;
  rawTags?: string | null;
  tags: string[];
  error?: string | null;
}
