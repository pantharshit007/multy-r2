export interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded: string | null;
  etag: string;
  publicUrl: string | null;
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
