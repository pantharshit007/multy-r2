import type { AccessMode, Bucket, BucketInput, BucketPatchInput } from "../../shared";
import { BINDING_NAME_REGEX } from "../../shared/constants";
import { ACCESS_MODES, DEFAULT_BUCKET_ACCESS_MODE, DEFAULT_BUCKET_SORT_ORDER } from "../constants";
import type { Env } from "../env";
import { ApiError } from "../errors";
import { trimToNull } from "../utils/request";

interface DbBucket {
  id: string;
  name: string;
  binding_name: string | null;
  endpoint: string | null;
  custom_domain: string | null;
  access_mode: AccessMode;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const ACCESS_MODE_SET = new Set<AccessMode>(ACCESS_MODES);

export async function listBuckets(env: Env): Promise<Bucket[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM buckets ORDER BY sort_order ASC, name COLLATE NOCASE ASC",
  ).all<DbBucket>();

  return (result.results ?? []).map(toBucket);
}

export async function createBucket(env: Env, input: BucketInput): Promise<Bucket> {
  const parsed = parseBucketInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO buckets (id, name, binding_name, endpoint, custom_domain, access_mode, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      parsed.name,
      parsed.bindingName,
      parsed.endpoint,
      parsed.customDomain,
      parsed.accessMode,
      parsed.sortOrder,
      now,
      now,
    )
    .run();

  return getBucket(env, id);
}

export async function getBucket(env: Env, id: string): Promise<Bucket> {
  const row = await env.DB.prepare("SELECT * FROM buckets WHERE id = ?").bind(id).first<DbBucket>();

  if (!row) {
    throw new ApiError(404, "Bucket not found");
  }

  return toBucket(row);
}

export async function updateBucket(env: Env, bucketId: string, input: BucketPatchInput): Promise<Bucket> {
  const current = await getBucket(env, bucketId);
  const patch = parseBucketPatchInput(input);
  const next = { ...current, ...patch };
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE buckets
     SET name = ?, binding_name = ?, endpoint = ?, custom_domain = ?, access_mode = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      next.name,
      next.bindingName,
      next.endpoint,
      next.customDomain,
      next.accessMode,
      next.sortOrder,
      now,
      bucketId,
    )
    .run();

  return getBucket(env, bucketId);
}

export async function deleteBucket(env: Env, bucketId: string): Promise<void> {
  await getBucket(env, bucketId);
  await env.DB.prepare("DELETE FROM buckets WHERE id = ?").bind(bucketId).run();
}

function toBucket(row: DbBucket): Bucket {
  const publicBaseUrl = normalizeUrl(row.custom_domain) ?? normalizeUrl(row.endpoint);
  const connectionMode = row.binding_name ? "binding" : row.endpoint || row.custom_domain ? "endpoint" : "unconfigured";

  return {
    id: row.id,
    name: row.name,
    bindingName: row.binding_name,
    endpoint: normalizeUrl(row.endpoint),
    customDomain: normalizeUrl(row.custom_domain),
    accessMode: row.access_mode,
    sortOrder: row.sort_order,
    publicBaseUrl,
    connectionMode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseBucketInput(input: BucketInput): Required<BucketInput> {
  const name = trimToNull(input.name);

  if (!name) {
    throw new ApiError(400, "Bucket name is required");
  }

  return {
    name,
    bindingName: normalizeBindingName(input.bindingName),
    endpoint: normalizeUrl(input.endpoint),
    customDomain: normalizeUrl(input.customDomain),
    accessMode: normalizeAccessMode(input.accessMode ?? DEFAULT_BUCKET_ACCESS_MODE),
    sortOrder: normalizeSortOrder(input.sortOrder),
  };
}

function parseBucketPatchInput(input: BucketPatchInput): BucketPatchInput {
  const patch: BucketPatchInput = {};

  if ("name" in input) {
    const name = trimToNull(input.name);
    if (!name) {
      throw new ApiError(400, "Bucket name is required");
    }
    patch.name = name;
  }

  if ("bindingName" in input) patch.bindingName = normalizeBindingName(input.bindingName);
  if ("endpoint" in input) patch.endpoint = normalizeUrl(input.endpoint);
  if ("customDomain" in input) patch.customDomain = normalizeUrl(input.customDomain);
  if ("accessMode" in input) patch.accessMode = normalizeAccessMode(input.accessMode);
  if ("sortOrder" in input) patch.sortOrder = normalizeSortOrder(input.sortOrder);

  return patch;
}

function normalizeBindingName(value: unknown): string | null {
  const binding = trimToNull(value);
  if (!binding) return null;
  if (!BINDING_NAME_REGEX.test(binding)) {
    throw new ApiError(400, "Binding name must be a valid R2 binding name (letters, digits, underscores)");
  }
  return binding;
}

function normalizeAccessMode(value: unknown): AccessMode {
  if (typeof value !== "string" || !ACCESS_MODE_SET.has(value as AccessMode)) {
    throw new ApiError(400, "Access mode must be public, private, or signed-link");
  }
  return value as AccessMode;
}

function normalizeSortOrder(value: unknown): number {
  if (value === undefined || value === null || value === "") return DEFAULT_BUCKET_SORT_ORDER;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new ApiError(400, "Sort order must be an integer");
  }
  return number;
}

function normalizeUrl(value: unknown): string | null {
  const raw = trimToNull(value);
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new ApiError(400, "URL fields must be valid URLs or domains");
  }
}
