import type {
  AccessMode,
  Bucket,
  BucketInput,
  BucketPatchInput,
  MessageResponse,
  ObjectListResponse,
  PrivateLinkResponse,
} from "../shared";
import { joinUrl } from "../shared";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  AUTH_KEY_SECRET?: string;
  PRIVATE_LINK_SECRET: string;
  [binding: string]: unknown;
}

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

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,x-api-key",
};

const ACCESS_MODES = new Set<AccessMode>(["public", "private", "signed-link"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method.toUpperCase() === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      try {
        authorizeApiRequest(request, env, url);
        return await handleApi(request, env, url);
      } catch (error) {
        if (!(error instanceof ApiError)) console.error(error);
        const message = error instanceof ApiError ? error.message : "Unexpected server error";
        const status = error instanceof ApiError ? error.status : 500;
        return json({ error: message }, status);
      }
    }

    if (request.method.toUpperCase() === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      return await handleEndpointApi(request, env, url);
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(error);
      const message = error instanceof ApiError ? error.message : "Unexpected server error";
      const status = error instanceof ApiError ? error.status : 500;
      return new Response(message, { status, headers: CORS_HEADERS });
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleEndpointApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const bucket = getDefaultEndpointBucket(env);

  if (url.pathname === "/" && method === "GET") {
    return new Response("Multy R2 endpoint worker", { headers: CORS_HEADERS });
  }

  if (url.pathname === "/" && method === "PATCH") {
    authorizeEndpointRequest(request, env);
    const listed = await bucket.list({ cursor: url.searchParams.get("cursor") ?? undefined });
    return json({
      objects: listed.objects,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    });
  }

  const key = sanitizeObjectKey(decodeURIComponent(url.pathname.replace(/^\/+/, "")));

  if (method === "GET") {
    const object = await bucket.get(key);
    if (!object) throw new ApiError(404, "Object not found");

    const headers = new Headers(CORS_HEADERS);
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  }

  authorizeEndpointRequest(request, env);

  if (method === "PUT") {
    await bucket.put(key, request.body, {
      httpMetadata: { contentType: request.headers.get("content-type") ?? undefined },
    });
    return new Response("Done", { headers: CORS_HEADERS });
  }

  if (method === "DELETE") {
    await bucket.delete(key);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  throw new ApiError(404, "Endpoint route not found");
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const parts = splitPath(url.pathname);

  if (method === "GET" && parts.length === 1 && parts[0] === "buckets") {
    const result = await env.DB.prepare(
      "SELECT * FROM buckets ORDER BY sort_order ASC, name COLLATE NOCASE ASC",
    ).all<DbBucket>();

    return json((result.results ?? []).map(toBucket));
  }

  if (method === "POST" && parts.length === 1 && parts[0] === "buckets") {
    const input = parseBucketInput(await readJson<BucketInput>(request));
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO buckets (id, name, binding_name, endpoint, custom_domain, access_mode, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        input.name,
        input.bindingName,
        input.endpoint,
        input.customDomain,
        input.accessMode,
        input.sortOrder,
        now,
        now,
      )
      .run();

    const bucket = await getBucket(env, id);
    return json(bucket, 201);
  }

  if (parts[0] !== "buckets" || parts.length < 2) {
    throw new ApiError(404, "API route not found");
  }

  const bucketId = decodeURIComponent(parts[1]);

  if (method === "PATCH" && parts.length === 2) {
    const current = await getBucket(env, bucketId);
    const input = parseBucketPatchInput(await readJson<BucketPatchInput>(request));
    const next = { ...current, ...input };
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

    return json(await getBucket(env, bucketId));
  }

  if (method === "DELETE" && parts.length === 2) {
    await getBucket(env, bucketId);
    await env.DB.prepare("DELETE FROM buckets WHERE id = ?").bind(bucketId).run();
    return json<MessageResponse>({ ok: true });
  }

  if (method === "GET" && parts.length === 3 && parts[2] === "objects") {
    const bucket = await getBucket(env, bucketId);
    const r2 = getBoundBucket(env, bucket);
    const limit = clampNumber(Number(url.searchParams.get("limit") ?? 100), 1, 1000);
    const listed = await r2.list({
      prefix: url.searchParams.get("prefix") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit,
    });

    return json<ObjectListResponse>({
      objects: listed.objects.map((object) => ({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded?.toISOString() ?? null,
        etag: object.etag,
        publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, object.key) : null,
      })),
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : null,
    });
  }

  if (method === "POST" && parts.length === 3 && parts[2] === "upload") {
    const bucket = await getBucket(env, bucketId);
    const r2 = getBoundBucket(env, bucket);
    const form = await request.formData();
    const file = form.get("file");

    if (!isFile(file)) {
      throw new ApiError(400, "Expected a multipart file field named 'file'");
    }

    const requestedKey = trimToNull(form.get("key"));
    const key = sanitizeObjectKey(requestedKey ?? file.name);
    await r2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || undefined },
      customMetadata: { originalName: file.name },
    });

    return json({
      key,
      publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, key) : null,
    }, 201);
  }

  if (method === "DELETE" && parts.length >= 4 && parts[2] === "objects") {
    const bucket = await getBucket(env, bucketId);
    const r2 = getBoundBucket(env, bucket);
    const key = decodeKey(parts.slice(3));
    await r2.delete(key);
    return json<MessageResponse>({ ok: true });
  }

  if (method === "GET" && parts.length >= 4 && parts[2] === "private-link") {
    const bucket = await getBucket(env, bucketId);
    getBoundBucket(env, bucket);
    const key = decodeKey(parts.slice(3));
    const ttlSeconds = clampNumber(Number(url.searchParams.get("expires") ?? 3600), 60, 60 * 60 * 24 * 7);
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = await signPrivateLink(env, bucket.id, key, expires);
    const privateUrl = new URL(`/api/buckets/${encodeURIComponent(bucket.id)}/signed/${encodeKey(key)}`, url.origin);
    privateUrl.searchParams.set("expires", String(expires));
    privateUrl.searchParams.set("signature", signature);

    return json<PrivateLinkResponse>({
      url: privateUrl.toString(),
      expiresAt: new Date(expires * 1000).toISOString(),
    });
  }

  if (method === "GET" && parts.length >= 4 && parts[2] === "signed") {
    const bucket = await getBucket(env, bucketId);
    const r2 = getBoundBucket(env, bucket);
    const key = decodeKey(parts.slice(3));
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") ?? "";

    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
      throw new ApiError(401, "Private link has expired");
    }

    const expected = await signPrivateLink(env, bucket.id, key, expires);
    if (!constantTimeEqual(signature, expected)) {
      throw new ApiError(401, "Invalid private link signature");
    }

    const object = await r2.get(key);
    if (!object) {
      throw new ApiError(404, "Object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=0");
    return new Response(object.body, { headers });
  }

  throw new ApiError(404, "API route not found");
}

async function getBucket(env: Env, id: string): Promise<Bucket> {
  const row = await env.DB.prepare("SELECT * FROM buckets WHERE id = ?").bind(id).first<DbBucket>();

  if (!row) {
    throw new ApiError(404, "Bucket not found");
  }

  return toBucket(row);
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
    accessMode: normalizeAccessMode(input.accessMode ?? "public"),
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
  if (!/^[A-Z][A-Z0-9_]*$/.test(binding)) {
    throw new ApiError(400, "Binding name must look like BUCKET_A");
  }
  return binding;
}

function normalizeAccessMode(value: unknown): AccessMode {
  if (typeof value !== "string" || !ACCESS_MODES.has(value as AccessMode)) {
    throw new ApiError(400, "Access mode must be public, private, or signed-link");
  }
  return value as AccessMode;
}

function normalizeSortOrder(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
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

function getBoundBucket(env: Env, bucket: Bucket): R2Bucket {
  if (!bucket.bindingName) {
    throw new ApiError(400, "This bucket needs a Worker R2 binding for file operations");
  }

  const binding = env[bucket.bindingName];
  if (!isR2Bucket(binding)) {
    throw new ApiError(400, `R2 binding '${bucket.bindingName}' is not configured on this Worker`);
  }

  return binding;
}

function getDefaultEndpointBucket(env: Env): R2Bucket {
  const bucket = env.R2_BUCKET ?? env.BUCKET_A;
  if (!isR2Bucket(bucket)) {
    throw new ApiError(500, "Configure an R2 binding named R2_BUCKET or BUCKET_A for endpoint mode");
  }

  return bucket;
}

function authorizeEndpointRequest(request: Request, env: Env): void {
  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, "AUTH_KEY_SECRET must be configured on this endpoint Worker");
  }

  const provided = request.headers.get("x-api-key") ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return Boolean(
    value &&
      typeof value === "object" &&
      "list" in value &&
      "put" in value &&
      "get" in value &&
      "delete" in value,
  );
}

function isFile(value: unknown): value is File {
  return Boolean(value && typeof value === "object" && "name" in value && "stream" in value);
}

function sanitizeObjectKey(value: string): string {
  const key = value.replace(/^\/+/, "").trim();
  if (!key || key === "." || key.includes("..")) {
    throw new ApiError(400, "Object key is invalid");
  }
  return key;
}

function decodeKey(parts: string[]): string {
  return sanitizeObjectKey(parts.map((part) => decodeURIComponent(part)).join("/"));
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function signPrivateLink(env: Env, bucketId: string, key: string, expires: number): Promise<string> {
  if (!env.PRIVATE_LINK_SECRET || env.PRIVATE_LINK_SECRET.startsWith("replace-with")) {
    throw new ApiError(500, "PRIVATE_LINK_SECRET must be configured before generating private links");
  }

  const encoder = new TextEncoder();
  const secret = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.PRIVATE_LINK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", secret, encoder.encode(`${bucketId}:${key}:${expires}`));
  return base64Url(signature);
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function splitPath(pathname: string): string[] {
  return pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

function authorizeApiRequest(request: Request, env: Env, url: URL): void {
  if (url.pathname.includes("/signed/")) return;

  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, "AUTH_KEY_SECRET must be configured before using the admin API");
  }

  const provided = request.headers.get("x-api-key") ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}

function trimToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Expected a JSON request body");
  }
}

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
