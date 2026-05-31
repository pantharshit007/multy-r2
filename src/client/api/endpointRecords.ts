import type {
  EndpointRecord,
  ObjectListResponse,
  PrivateLinkResponse,
  R2ObjectSummary,
} from "../../shared";
import { joinUrl } from "../../shared";

const ENDPOINTS_STORAGE_KEY = "multy-r2:endpoints";
const LOCAL_ENDPOINT_PROXY_PREFIX = "/local-r2-endpoint";

export function listEndpointRecords(): EndpointRecord[] {
  const raw = localStorage.getItem(ENDPOINTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<EndpointRecord> & { endpoint?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((record) => ({
        id: record.id ?? crypto.randomUUID(),
        endPoint: normalizeEndpoint(record.endPoint ?? record.endpoint ?? ""),
        apiKey: record.apiKey ?? "",
        customDomain: normalizeOptionalEndpoint(record.customDomain ?? ""),
      }))
      .filter((record) => record.endPoint && record.apiKey);
  } catch {
    return [];
  }
}

export function saveEndpointRecord(input: Omit<EndpointRecord, "id"> & { id?: string }): EndpointRecord[] {
  const records = listEndpointRecords();
  const next: EndpointRecord = {
    id: input.id ?? crypto.randomUUID(),
    endPoint: normalizeEndpoint(input.endPoint),
    apiKey: input.apiKey.trim(),
    customDomain: normalizeOptionalEndpoint(input.customDomain),
  };

  if (!next.endPoint || !next.apiKey) {
    throw new Error("Endpoint and API key are required");
  }

  const index = records.findIndex((record) => record.id === next.id);
  const updated = index >= 0 ? records.map((record, recordIndex) => (recordIndex === index ? next : record)) : [...records, next];
  localStorage.setItem(ENDPOINTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteEndpointRecord(id: string): EndpointRecord[] {
  const updated = listEndpointRecords().filter((record) => record.id !== id);
  localStorage.setItem(ENDPOINTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function listEndpointObjects(record: EndpointRecord, cursor?: string | null): Promise<ObjectListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const response = await endpointRequest(record, params.size ? `/?${params}` : "/", { method: "PATCH" });
  const body = (await response.json()) as {
    objects?: Array<{ key: string; size: number; uploaded?: string | Date; etag?: string }>;
    truncated?: boolean;
    cursor?: string;
  };

  return {
    objects: (body.objects ?? []).map((object) => toObjectSummary(record, object)),
    truncated: Boolean(body.truncated),
    cursor: body.cursor ?? null,
  };
}

export async function uploadEndpointObject(record: EndpointRecord, file: File, key: string): Promise<{ key: string; publicUrl: string | null }> {
  const cleanKey = sanitizeKey(key || file.name);
  await endpointRequest(record, `/${encodeKey(cleanKey)}`, {
    method: "PUT",
    headers: { "content-type": file.type || guessContentType(cleanKey) },
    body: file,
  });

  return { key: cleanKey, publicUrl: publicUrlFor(record, cleanKey) };
}

export async function createEndpointFolder(record: EndpointRecord, folder: string): Promise<{ key: string; publicUrl: string | null }> {
  const cleanFolder = sanitizeFolder(folder);
  const key = `${cleanFolder}/`;
  await endpointRequest(record, `/${encodeKey(key)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/x-directory",
    },
    body: new Blob([]),
  });

  return { key, publicUrl: publicUrlFor(record, key) };
}

export async function deleteEndpointObject(record: EndpointRecord, key: string): Promise<void> {
  await endpointRequest(record, `/${encodeKey(key)}`, {
    method: "DELETE",
  });
}

export function publicUrlFor(record: EndpointRecord, key: string): string {
  return joinUrl(record.customDomain || record.endPoint, key);
}

export function createPrivateLink(): Promise<PrivateLinkResponse> {
  return Promise.reject(new Error("Private signed links are only available through the D1 control-plane Worker."));
}

async function endpointRequest(record: EndpointRecord, path: string, init?: RequestInit): Promise<Response> {
  const target = new URL(path, `${record.endPoint}/`);
  const response = await fetch(resolveEndpointUrl(target).toString(), {
    ...init,
    headers: {
      "x-api-key": record.apiKey,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response;
}

function resolveEndpointUrl(target: URL): URL {
  if (import.meta.env.DEV && isLocalWorkerEndpoint(target)) {
    return new URL(`${LOCAL_ENDPOINT_PROXY_PREFIX}${target.pathname}${target.search}`, target.origin);
  }

  return target;
}

function isLocalWorkerEndpoint(url: URL): boolean {
  const isLoopbackHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  return isLoopbackHost && url.port === "8787";
}

function toObjectSummary(
  record: EndpointRecord,
  object: { key: string; size: number; uploaded?: string | Date; etag?: string },
): R2ObjectSummary {
  return {
    key: object.key,
    size: object.size,
    uploaded: object.uploaded ? new Date(object.uploaded).toISOString() : null,
    etag: object.etag ?? "",
    publicUrl: publicUrlFor(record, object.key),
  };
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeOptionalEndpoint(value: string): string {
  return value.trim() ? normalizeEndpoint(value) : "";
}

function sanitizeKey(value: string): string {
  const key = value.trim().replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new Error("Object key is invalid");
  return key;
}

function sanitizeFolder(value: string): string {
  const folder = value.trim().replace(/^\/+|\/+$/g, "");
  if (!folder || folder.includes("..")) throw new Error("Folder name is invalid");
  return folder;
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function guessContentType(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";

  switch (extension) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "css":
      return "text/css; charset=utf-8";
    case "gif":
      return "image/gif";
    case "htm":
    case "html":
      return "text/html; charset=utf-8";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "js":
    case "mjs":
      return "text/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain; charset=utf-8";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
