import type { MiddlewareHandler } from "hono";
import { CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS, CORS_MAX_AGE_SECONDS } from "../constants";

const ALLOW_METHODS = CORS_ALLOWED_METHODS.join(", ");
const ALLOW_HEADERS = CORS_ALLOWED_HEADERS.join(", ");

/**
 * Open CORS for the shared Multy UI (any Pages origin) talking to user Workers.
 * Reflects the request Origin when present so preflight always gets a concrete
 * Allow-Origin header; falls back to `*`.
 *
 * Implemented manually (not hono/cors) so headers are applied after `next()` on
 * success and error responses alike — missing ACAO on preflight/errors is what
 * browsers report as a CORS failure even when the route would otherwise work.
 */
export function applyCorsHeaders(headers: Headers, requestOrigin: string | undefined): void {
  headers.set("Access-Control-Allow-Origin", requestOrigin && requestOrigin.length > 0 ? requestOrigin : "*");
  headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  headers.set("Access-Control-Max-Age", String(CORS_MAX_AGE_SECONDS));
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Origin");
  } else if (!vary.split(",").map((v) => v.trim().toLowerCase()).includes("origin")) {
    headers.append("Vary", "Origin");
  }
}

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const requestOrigin = c.req.header("Origin");

  if (c.req.method === "OPTIONS") {
    const headers = new Headers();
    applyCorsHeaders(headers, requestOrigin);
    return new Response(null, { status: 204, headers });
  }

  await next();
  applyCorsHeaders(c.res.headers, requestOrigin);
};
