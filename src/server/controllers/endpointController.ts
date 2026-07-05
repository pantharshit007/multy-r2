import { HEALTH_CHECK_MESSAGE } from "../constants";
import { ApiError } from "../errors";
import { getEndpointBucketBinding, getSelectedEndpointBucket, listEndpointBucketBindings } from "../services/r2Buckets";
import type { AppContext } from "../types";
import { guessContentTypeFromKey } from "../utils/contentType";
import { sanitizeObjectKey } from "../utils/objectKeys";

/**
 * Resolves the R2 bucket for an endpoint request. The binding comes from the
 * `/bucket/:bindingName` path scope; the default scope falls back to the
 * Worker's default endpoint bucket.
 */
function resolveBucket(c: AppContext): R2Bucket {
  return getSelectedEndpointBucket(c.env, c.req.param("bindingName") ?? null);
}

const objectKeyParam = (c: AppContext): string => sanitizeObjectKey(c.req.param("key") ?? "");

export async function listBindingsHandler(c: AppContext): Promise<Response> {
  return c.json(await listEndpointBucketBindings(c.env));
}

export function healthCheckHandler(c: AppContext): Response {
  return c.text(HEALTH_CHECK_MESSAGE);
}

export async function listObjectsHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  const listed = await bucket.list({ cursor: c.req.query("cursor") ?? undefined });
  return c.json({
    objects: listed.objects,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : undefined,
  });
}

export async function headObjectHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  const object = await bucket.head(objectKeyParam(c));
  if (!object) throw new ApiError(404, "Object not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(null, { status: 200, headers });
}

export async function headPublicAliasHandler(c: AppContext): Promise<Response> {
  const { bucket, key } = resolvePublicAlias(c);
  const object = await bucket.head(key);
  if (!object) throw new ApiError(404, "Object not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(null, { status: 200, headers });
}

export async function getObjectHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  const key = objectKeyParam(c);
  const object = await bucket.get(key);
  if (!object) throw new ApiError(404, "Object not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", guessContentTypeFromKey(key));
  }
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function getPublicAliasHandler(c: AppContext): Promise<Response> {
  const { bucket, key } = resolvePublicAlias(c);
  const object = await bucket.get(key);
  if (!object) throw new ApiError(404, "Object not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", guessContentTypeFromKey(key));
  }
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function putObjectHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  const key = objectKeyParam(c);
  await bucket.put(key, c.req.raw.body, {
    httpMetadata: {
      contentType: c.req.header("content-type") ?? guessContentTypeFromKey(key),
    },
  });
  return c.text("Done");
}

export async function deleteObjectHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  await bucket.delete(objectKeyParam(c));
  return c.body(null, 204);
}

function resolvePublicAlias(c: AppContext): { bucket: R2Bucket; key: string } {
  const bindingName = c.req.param("bindingName") ?? null;
  const routeKey = c.req.param("key") ?? "";
  const explicitBucket = bindingName ? getEndpointBucketBinding(c.env, bindingName) : null;

  if (explicitBucket) {
    return {
      bucket: explicitBucket,
      key: sanitizeObjectKey(routeKey),
    };
  }

  return {
    bucket: getSelectedEndpointBucket(c.env, null),
    key: sanitizeObjectKey(bindingName ? `${bindingName}/${routeKey}` : routeKey),
  };
}
