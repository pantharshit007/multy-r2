import type {
  BucketInput,
  BucketPatchInput,
  MessageResponse,
  ObjectListResponse,
  PrivateLinkResponse,
} from "../../shared";
import { joinUrl } from "../../shared";
import { DEFAULT_PRIVATE_LINK_TTL_SECONDS } from "../../shared/constants";
import { isDirectoryContentType } from "../../shared/utils/objectKeys";
import {
  DEFAULT_OBJECT_LIST_LIMIT,
  MAX_OBJECT_LIST_LIMIT,
  MAX_PRIVATE_LINK_TTL_SECONDS,
  MIN_OBJECT_LIST_LIMIT,
  MIN_PRIVATE_LINK_TTL_SECONDS,
  SIGNED_OBJECT_CACHE_CONTROL,
} from "../constants";
import { ApiError } from "../errors";
import {
  createBucket,
  deleteBucket,
  getBucket,
  listBuckets,
  updateBucket,
} from "../repositories/bucketRepository";
import { createPrivateObjectLink, signPrivateLink } from "../services/privateLinks";
import { getBoundBucket } from "../services/r2Buckets";
import type { AppContext } from "../types";
import { constantTimeEqual } from "../utils/crypto";
import { readJsonBody } from "../utils/http";
import { sanitizeObjectKey } from "../utils/objectKeys";
import { clampNumber, isFile, trimToNull } from "../utils/request";

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

const bucketIdParam = (c: AppContext): string => c.req.param("bucketId") ?? "";
const objectKeyParam = (c: AppContext): string => sanitizeObjectKey(c.req.param("key") ?? "");

export async function listBucketsHandler(c: AppContext): Promise<Response> {
  return c.json(await listBuckets(c.env));
}

export async function createBucketHandler(c: AppContext): Promise<Response> {
  const bucket = await createBucket(c.env, await readJsonBody<BucketInput>(c));
  return c.json(bucket, 201);
}

export async function updateBucketHandler(c: AppContext): Promise<Response> {
  const input = await readJsonBody<BucketPatchInput>(c);
  return c.json(await updateBucket(c.env, bucketIdParam(c), input));
}

export async function deleteBucketHandler(c: AppContext): Promise<Response> {
  await deleteBucket(c.env, bucketIdParam(c));
  return c.json<MessageResponse>({ ok: true });
}

export async function listObjectsHandler(c: AppContext): Promise<Response> {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const limit = clampNumber(
    Number(c.req.query("limit") ?? DEFAULT_OBJECT_LIST_LIMIT),
    MIN_OBJECT_LIST_LIMIT,
    MAX_OBJECT_LIST_LIMIT,
  );
  const listed = await r2.list({
    prefix: c.req.query("prefix") ?? undefined,
    cursor: c.req.query("cursor") ?? undefined,
    limit,
    include: ["httpMetadata"],
  });

  return c.json<ObjectListResponse>({
    objects: listed.objects.map((object) => {
      const contentType = object.httpMetadata?.contentType ?? null;
      return {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded?.toISOString() ?? null,
        etag: object.etag,
        publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, object.key) : null,
        contentType,
        isFolder: object.key.endsWith("/") || isDirectoryContentType(contentType),
      };
    }),
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : null,
  });
}

export async function uploadObjectHandler(c: AppContext): Promise<Response> {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const form = await c.req.raw.formData();
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

  return c.json(
    {
      key,
      publicUrl: bucket.publicBaseUrl ? joinUrl(bucket.publicBaseUrl, key) : null,
    },
    201,
  );
}

export async function deleteObjectHandler(c: AppContext): Promise<Response> {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  await r2.delete(objectKeyParam(c));
  return c.json<MessageResponse>({ ok: true });
}

export async function createPrivateLinkHandler(c: AppContext): Promise<Response> {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  getBoundBucket(c.env, bucket);
  const key = objectKeyParam(c);
  const ttlSeconds = clampNumber(
    Number(c.req.query("expires") ?? DEFAULT_PRIVATE_LINK_TTL_SECONDS),
    MIN_PRIVATE_LINK_TTL_SECONDS,
    MAX_PRIVATE_LINK_TTL_SECONDS,
  );
  const expires = nowInSeconds() + ttlSeconds;
  const privateUrl = await createPrivateObjectLink(c.env, bucket.id, key, expires, new URL(c.req.url).origin);

  return c.json<PrivateLinkResponse>({
    url: privateUrl,
    expiresAt: new Date(expires * 1000).toISOString(),
  });
}

export async function getSignedObjectHandler(c: AppContext): Promise<Response> {
  const bucket = await getBucket(c.env, bucketIdParam(c));
  const r2 = getBoundBucket(c.env, bucket);
  const key = objectKeyParam(c);
  const expires = Number(c.req.query("expires"));
  const signature = c.req.query("signature") ?? "";

  if (!Number.isInteger(expires) || expires < nowInSeconds()) {
    throw new ApiError(401, "Private link has expired");
  }

  const expected = await signPrivateLink(c.env, bucket.id, key, expires);
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
