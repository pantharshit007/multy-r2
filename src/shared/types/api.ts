export interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded: string | null;
  etag: string;
  publicUrl: string | null;
  /** True when this key is a folder placeholder (`…/` or directory content-type). */
  isFolder: boolean;
  /** Object Content-Type when known from list metadata; null if omitted. */
  contentType: string | null;
}

export interface ObjectListResponse {
  objects: R2ObjectSummary[];
  truncated: boolean;
  cursor: string | null;
}

export interface PrivateLinkResponse {
  url: string;
  expiresAt: string;
}

export interface ApiErrorBody {
  error: string;
}

export interface MessageResponse {
  ok: true;
}
