import { Hono } from "hono";
import { API_PREFIX, R2_API_PREFIX, UI_ASSET_PATHS } from "./constants";
import { adminRoutes } from "./routes/admin";
import { endpointRoutes } from "./routes/endpoint";
import { publicAliasRoutes } from "./routes/publicAlias";
import type { AppEnv } from "./types";

/**
 * Root Worker app.
 *
 * Routing precedence (first match wins; static paths beat the `:bindingName`
 * param, so the alias never shadows the routes above it):
 *  1. `GET/HEAD` for SPA shell + static assets -> bundled UI.
 *  2. `/api/r2/*` -> r2 object API (registered before `/api` so it is not
 *     swallowed by the admin catch-all).
 *  3. `/api/*` -> D1 control-plane (admin) API.
 *  4. `GET/HEAD /:bindingName/:key` -> public read-only object alias.
 */
export const app = new Hono<AppEnv>({ strict: false });

app.on(["GET", "HEAD"], [...UI_ASSET_PATHS], (c) => c.env.ASSETS.fetch(c.req.raw));

app.route(R2_API_PREFIX, endpointRoutes);
app.route(API_PREFIX, adminRoutes);
app.route("/:bindingName", publicAliasRoutes);

