import type { Env } from "../env";
import { ApiError } from "../errors";
import { CORS_HEADERS, json } from "../http";
import { BUCKET_PATH_PREFIX, HEALTH_CHECK_MESSAGE, R2_BINDINGS_PATH } from "../constants";
import { authorizeEndpointRequest } from "../middleware/auth";
import { getSelectedEndpointBucket, listEndpointBucketBindings } from "../services/r2Buckets";
import { guessContentTypeFromKey } from "../utils/contentType";
import { sanitizeObjectKey } from "../utils/objectKeys";

function parseBucketPath(pathname: string): { bindingName: string; objectPath: string } | null {
  if (!pathname.startsWith(BUCKET_PATH_PREFIX)) return null;
  const rest = pathname.slice(BUCKET_PATH_PREFIX.length);
  const slashIndex = rest.indexOf("/");
  if (slashIndex < 0) {
    return { bindingName: decodeURIComponent(rest), objectPath: "/" };
  }
  return { bindingName: decodeURIComponent(rest.slice(0, slashIndex)), objectPath: `/${rest.slice(slashIndex + 1)}` };
}

export async function handleEndpointApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();

  if (url.pathname === R2_BINDINGS_PATH && method === "GET") {
    authorizeEndpointRequest(request, env);
    return json(await listEndpointBucketBindings(env));
  }

  if (url.pathname === "/" && method === "GET") {
    return new Response(HEALTH_CHECK_MESSAGE, { headers: CORS_HEADERS });
  }

  // Determine bucket binding and effective path
  const bucketRoute = parseBucketPath(url.pathname);
  const bindingName = bucketRoute?.bindingName ?? url.searchParams.get("bucketBindingName") ?? null;
  const effectivePath = bucketRoute?.objectPath ?? url.pathname;

  const bucket = getSelectedEndpointBucket(env, bindingName);

  if (effectivePath === "/" && method === "PATCH") {
    authorizeEndpointRequest(request, env);
    const listed = await bucket.list({ cursor: url.searchParams.get("cursor") ?? undefined });
    return json({
      objects: listed.objects,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    });
  }

  const key = sanitizeObjectKey(decodeURIComponent(effectivePath.replace(/^\/+/, "")));

  if (method === "HEAD") {
    authorizeEndpointRequest(request, env);
    const object = await bucket.head(key);
    if (!object) throw new ApiError(404, "Object not found");

    const headers = new Headers(CORS_HEADERS);
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(null, { status: 200, headers });
  }

  if (method === "GET") {
    const object = await bucket.get(key);
    if (!object) throw new ApiError(404, "Object not found");

    const headers = new Headers(CORS_HEADERS);
    object.writeHttpMetadata(headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", guessContentTypeFromKey(key));
    }
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  }

  authorizeEndpointRequest(request, env);

  if (method === "PUT") {
    await bucket.put(key, request.body, {
      httpMetadata: {
        contentType: request.headers.get("content-type") ?? guessContentTypeFromKey(key),
      },
    });
    return new Response("Done", { headers: CORS_HEADERS });
  }

  if (method === "DELETE") {
    await bucket.delete(key);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  throw new ApiError(404, "Endpoint route not found");
}
