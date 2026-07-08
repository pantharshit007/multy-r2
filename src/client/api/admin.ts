import type { Bucket, ObjectListResponse, PrivateLinkResponse, R2ObjectSummary } from "../../shared";
import { joinUrl } from "../../shared/utils/url";
import { encodeKey } from "../../shared/utils/objectKeys";
import { API_KEY_HEADER, DEFAULT_PRIVATE_LINK_TTL_SECONDS } from "../../shared/constants";
import { resolveApiBase } from "../lib/endpointResolver";
import { ADMIN_STORAGE_KEY } from "../constants";

export interface AdminApiConfig {
  apiBase: string;
  apiKey: string;
}

export function loadAdminApiConfig(): AdminApiConfig {
  const raw = localStorage.getItem(ADMIN_STORAGE_KEY);

  if (!raw) {
    return { apiBase: "", apiKey: "" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminApiConfig>;
    return {
      apiBase: resolveApiBase(parsed.apiBase ?? ""),
      apiKey: parsed.apiKey ?? "",
    };
  } catch {
    return { apiBase: "", apiKey: "" };
  }
}

export function saveAdminApiConfig(input: AdminApiConfig): AdminApiConfig {
  const next: AdminApiConfig = {
    apiBase: resolveApiBase(input.apiBase),
    apiKey: input.apiKey.trim(),
  };

  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function listAdminBuckets(config: AdminApiConfig): Promise<Bucket[]> {
  return await adminRequestJson<Bucket[]>(config, "/api/buckets");
}

export async function listAdminBucketObjects(config: AdminApiConfig, bucketId: string, cursor?: string | null): Promise<ObjectListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return await adminRequestJson<ObjectListResponse>(config, params.size ? `/api/buckets/${encodeURIComponent(bucketId)}/objects?${params}` : `/api/buckets/${encodeURIComponent(bucketId)}/objects`);
}

export async function uploadAdminBucketObject(config: AdminApiConfig, bucketId: string, file: File, key: string): Promise<{ key: string; publicUrl: string | null }> {
  const form = new FormData();
  form.set("file", file);
  form.set("key", key);

  return await adminRequestJson<{ key: string; publicUrl: string | null }>(config, `/api/buckets/${encodeURIComponent(bucketId)}/upload`, {
    method: "POST",
    body: form,
  });
}

export async function deleteAdminBucketObject(config: AdminApiConfig, bucketId: string, key: string): Promise<void> {
  await adminRequest(config, `/api/buckets/${encodeURIComponent(bucketId)}/objects/${encodeKey(key)}`, {
    method: "DELETE",
  });
}

export async function createAdminPrivateLink(config: AdminApiConfig, bucketId: string, key: string, expires = DEFAULT_PRIVATE_LINK_TTL_SECONDS): Promise<PrivateLinkResponse> {
  return await adminRequestJson<PrivateLinkResponse>(config, `/api/buckets/${encodeURIComponent(bucketId)}/private-link/${encodeKey(key)}?expires=${expires}`);
}

export function publicUrlForBucket(bucket: Bucket, key: string): string | null {
  if (!bucket.publicBaseUrl) return null;
  return joinUrl(bucket.publicBaseUrl, key);
}

async function adminRequestJson<T>(config: AdminApiConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await adminRequest(config, path, init);
  return (await response.json()) as T;
}

async function adminRequest(config: AdminApiConfig, path: string, init?: RequestInit): Promise<Response> {
  const apiBase = resolveApiBase(config.apiBase);
  if (!apiBase) {
    throw new Error("Set the worker admin API base first");
  }
  if (!config.apiKey) {
    throw new Error("Set the worker admin key first");
  }

  const response = await fetch(new URL(path, `${apiBase}/`).toString(), {
    ...init,
    headers: {
      [API_KEY_HEADER]: config.apiKey,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response;
}
