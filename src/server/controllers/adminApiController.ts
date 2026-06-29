import type {
  BucketInput,
  BucketPatchInput,
  MessageResponse,
  ObjectListResponse,
  PrivateLinkResponse,
} from "../../shared";
import { joinUrl } from "../../shared";
import { DEFAULT_PRIVATE_LINK_TTL_SECONDS } from "../../shared/constants";
import {
  DEFAULT_OBJECT_LIST_LIMIT,
  MAX_OBJECT_LIST_LIMIT,
  MAX_PRIVATE_LINK_TTL_SECONDS,
  MIN_OBJECT_LIST_LIMIT,
  MIN_PRIVATE_LINK_TTL_SECONDS,
  SIGNED_OBJECT_CACHE_CONTROL,
} from "../constants";
import type { Env } from "../env";
import { ApiError } from "../errors";
import { json, readJson } from "../http";
import {
  createBucket,
  deleteBucket,
  getBucket,
  listBuckets,
  updateBucket,
} from "../repositories/bucketRepository";
import { createPrivateObjectLink, signPrivateLink } from "../services/privateLinks";
import { getBoundBucket } from "../services/r2Buckets";
import { constantTimeEqual } from "../utils/crypto";
import { decodeKey, sanitizeObjectKey } from "../utils/objectKeys";
import { clampNumber, isFile, trimToNull } from "../utils/request";
import { splitApiPath } from "../routes/paths";

export async function handleAdminApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const parts = splitApiPath(url.pathname);

  if (method === "GET" && isBucketCollectionRoute(parts)) {
    return json(await listBuckets(env));
  }

  if (method === "POST" && isBucketCollectionRoute(parts)) {
    return json(await createBucket(env, await readJson<BucketInput>(request)), 201);
  }

  if (parts[0] !== "buckets" || parts.length < 2) {
    throw new ApiError(404, "API route not found");
  }

  const bucketId = decodeURIComponent(parts[1]);

  if (method === "PATCH" && parts.length === 2) {
    return json(await updateBucket(env, bucketId, await readJson<BucketPatchInput>(request)));
  }

  if (method === "DELETE" && parts.length === 2) {
    await deleteBucket(env, bucketId);
    return json<MessageResponse>({ ok: true });
  }

  if (method === "GET" && parts.length === 3 && parts[2] === "objects") {
    return listObjects(env, bucketId, url);
  }

  if (method === "POST" && parts.length === 3 && parts[2] === "upload") {
    return uploadObject(request, env, bucketId);
  }

  if (method === "DELETE" && parts.length >= 4 && parts[2] === "objects") {
    return deleteObject(env, bucketId, parts.slice(3));
  }

  if (method === "GET" && parts.length >= 4 && parts[2] === "private-link") {
    return createPrivateLink(env, bucketId, parts.slice(3), url);
  }

  if (method === "GET" && parts.length >= 4 && parts[2] === "signed") {
    return getSignedObject(env, bucketId, parts.slice(3), url);
  }

  throw new ApiError(404, "API route not found");
}

function isBucketCollectionRoute(parts: string[]): boolean {
  return parts.length === 1 && parts[0] === "buckets";
}

async function listObjects(env: Env, bucketId: string, url: URL): Promise<Response> {
  const bucket = await getBucket(env, bucketId);
  const r2 = getBoundBucket(env, bucket);
  const limit = clampNumber(Number(url.searchParams.get("limit") ?? DEFAULT_OBJECT_LIST_LIMIT), MIN_OBJECT_LIST_LIMIT, MAX_OBJECT_LIST_LIMIT);
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

async function uploadObject(request: Request, env: Env, bucketId: string): Promise<Response> {
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

async function deleteObject(env: Env, bucketId: string, keyParts: string[]): Promise<Response> {
  const bucket = await getBucket(env, bucketId);
  const r2 = getBoundBucket(env, bucket);
  await r2.delete(decodeKey(keyParts));
  return json<MessageResponse>({ ok: true });
}

async function createPrivateLink(env: Env, bucketId: string, keyParts: string[], url: URL): Promise<Response> {
  const bucket = await getBucket(env, bucketId);
  getBoundBucket(env, bucket);
  const key = decodeKey(keyParts);
  const ttlSeconds = clampNumber(Number(url.searchParams.get("expires") ?? DEFAULT_PRIVATE_LINK_TTL_SECONDS), MIN_PRIVATE_LINK_TTL_SECONDS, MAX_PRIVATE_LINK_TTL_SECONDS);
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const privateUrl = await createPrivateObjectLink(env, bucket.id, key, expires, url.origin);

  return json<PrivateLinkResponse>({
    url: privateUrl,
    expiresAt: new Date(expires * 1000).toISOString(),
  });
}

async function getSignedObject(env: Env, bucketId: string, keyParts: string[], url: URL): Promise<Response> {
  const bucket = await getBucket(env, bucketId);
  const r2 = getBoundBucket(env, bucket);
  const key = decodeKey(keyParts);
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
  headers.set("cache-control", SIGNED_OBJECT_CACHE_CONTROL);
  return new Response(object.body, { headers });
}
