import { FOLDER_CONTENT_TYPE } from "../../shared/constants";
import { isDirectoryContentType } from "../../shared/utils/objectKeys";
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

function objectKeyParam(c: AppContext): string {
  const key = sanitizeObjectKey(c.req.param("key") ?? "");

  // Hono's non-strict router removes a trailing slash from `:key`, but it is
  // meaningful for R2 folder placeholders. Preserve it for every object
  // operation so GET, HEAD, PUT, and DELETE target the same key.
  return new URL(c.req.url).pathname.endsWith("/") && !key.endsWith("/") ? `${key}/` : key;
}

export async function listBindingsHandler(c: AppContext): Promise<Response> {
  return c.json(await listEndpointBucketBindings(c.env));
}

export function healthCheckHandler(c: AppContext): Response {
  return c.text(HEALTH_CHECK_MESSAGE);
}

export async function listObjectsHandler(c: AppContext): Promise<Response> {
  const bucket = resolveBucket(c);
  const listed = await bucket.list({
    cursor: c.req.query("cursor") ?? undefined,
    include: ["httpMetadata"],
  });
  return c.json({
    objects: listed.objects.map((object) => {
      const contentType = object.httpMetadata?.contentType ?? null;
      return {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        etag: object.etag,
        httpEtag: object.httpEtag,
        contentType,
        isFolder: object.key.endsWith("/") || isDirectoryContentType(contentType),
      };
    }),
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
  let key = objectKeyParam(c);
  const contentType = c.req.header("content-type") ?? guessContentTypeFromKey(key);

  // Folder clients may use a normalized URL that loses the final slash. Keep
  // the content type as a fallback so placeholders are still stored correctly.
  if (contentType.split(";")[0].trim().toLowerCase() === FOLDER_CONTENT_TYPE && !key.endsWith("/")) {
    key = `${key}/`;
  }

  await bucket.put(key, c.req.raw.body, {
    httpMetadata: {
      contentType,
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
