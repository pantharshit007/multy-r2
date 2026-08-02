import { Hono } from "hono";
import { API_PREFIX, HEALTH_CHECK_MESSAGE, PUBLIC_ALIAS_PREFIX, R2_API_PREFIX } from "./constants";
import { applyCorsHeaders, corsMiddleware } from "./middleware/cors";
import { adminRoutes } from "./routes/admin";
import { endpointRoutes } from "./routes/endpoint";
import { publicAliasRoutes } from "./routes/publicAlias";
import type { AppEnv } from "./types";

/**
 * Root Worker app (API only; the SPA is hosted separately on Pages).
 *
 * Routing precedence (first match wins; static paths beat the `:bindingName`
 * param, so the alias never shadows the routes above it):
 *  1. `GET /` -> health check.
 *  2. `/api/r2/*` -> r2 object API (registered before `/api` so it is not
 *     swallowed by the admin catch-all).
 *  3. `/api/*` -> D1 control-plane (admin) API.
 *  4. `GET/HEAD /cdn/:key` and `/cdn/:bindingName/:key` -> public read-only
 *     object aliases. The `/cdn` prefix keeps arbitrary two-segment paths
 *     (e.g. `/foo/bar`) from being parsed as a binding, so they 404 instead of
 *     erroring as a bad binding lookup.
 */
export const app = new Hono<AppEnv>({ strict: false });

// Root-level CORS so every path (including unmatched / preflight) gets headers.
// Sub-apps also mount corsMiddleware; applying twice is harmless.
app.use("*", corsMiddleware);

app.onError((error, c) => {
  console.error(error);
  const response = c.text(error instanceof Error ? error.message : "Internal Server Error", 500);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});

app.get("/", (c) => c.text(HEALTH_CHECK_MESSAGE));

app.route(R2_API_PREFIX, endpointRoutes);
app.route(API_PREFIX, adminRoutes);
app.route(PUBLIC_ALIAS_PREFIX, publicAliasRoutes);
