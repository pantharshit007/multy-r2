export type AccessMode = "public" | "private" | "signed-link";

export type BucketConnectionMode = "binding" | "endpoint" | "unconfigured";

export interface Bucket {
  id: string;
  name: string;
  bindingName: string | null;
  endpoint: string | null;
  customDomain: string | null;
  accessMode: AccessMode;
  sortOrder: number;
  publicBaseUrl: string | null;
  connectionMode: BucketConnectionMode;
  createdAt: string;
  updatedAt: string;
}

export interface BucketInput {
  name: string;
  bindingName?: string | null;
  endpoint?: string | null;
  customDomain?: string | null;
  accessMode?: AccessMode;
  sortOrder?: number;
}

export interface BucketPatchInput {
  name?: string;
  bindingName?: string | null;
  endpoint?: string | null;
  customDomain?: string | null;
  accessMode?: AccessMode;
  sortOrder?: number;
}

export interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded: string | null;
  etag: string;
  publicUrl: string | null;
}

export interface EndpointRecord {
  id: string;
  endPoint: string;
  apiKey: string;
  customDomain: string;
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

export function joinUrl(base: string, key: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanKey = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${cleanBase}/${cleanKey}`;
}
