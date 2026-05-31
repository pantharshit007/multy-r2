import type { Env } from "../env";
import { ApiError } from "../errors";
import { CORS_HEADERS, json } from "../http";
import { authorizeEndpointRequest } from "../middleware/auth";
import { getDefaultEndpointBucket } from "../services/r2Buckets";
import { guessContentTypeFromKey } from "../utils/contentType";
import { sanitizeObjectKey } from "../utils/objectKeys";

export async function handleEndpointApi(request: Request, env: Env, url: URL): Promise<Response> {
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
    if (!headers.has("content-type")) {
      headers.set("content-type", guessContentTypeFromKey(key));
    }
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  }

  authorizeEndpointRequest(request, env);

  if (method === "PUT") {
    await bucket.put(key, request.body, {
      httpMetadata: { contentType: request.headers.get("content-type") ?? guessContentTypeFromKey(key) },
    });
    return new Response("Done", { headers: CORS_HEADERS });
  }

  if (method === "DELETE") {
    await bucket.delete(key);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  throw new ApiError(404, "Endpoint route not found");
}
