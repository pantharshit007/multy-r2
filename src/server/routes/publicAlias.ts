import { Hono } from "hono";
import { getPublicAliasHandler, headPublicAliasHandler } from "../controllers/endpointController";
import { normalizeError } from "../errors";
import { corsMiddleware } from "../middleware/cors";
import type { AppEnv } from "../types";

/**
 * Public, read-only short alias for serving objects:
 *
 *   GET|HEAD /cdn/:key                e.g. /cdn/tmp/pfp.webp
 *   GET|HEAD /cdn/:bindingName/:key   e.g. /cdn/BUCKET_A/tmp/pfp.webp
 *
 * This is the shareable URL form. It is mounted at `/cdn` (see app.ts). When a
 * binding name is present it selects that bucket; otherwise it falls back to the
 * default endpoint bucket. No auth (public read); all writes and listing stay
 * on the authenticated `/api/r2` API.
 */
export const publicAliasRoutes = new Hono<AppEnv>({ strict: false });

publicAliasRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  return c.text(message, status);
});

publicAliasRoutes.use("*", corsMiddleware);

publicAliasRoutes.get("/:bindingName/:key{.+}", getPublicAliasHandler);
publicAliasRoutes.on("HEAD", "/:bindingName/:key{.+}", headPublicAliasHandler);
publicAliasRoutes.get("/:key{.+}", getPublicAliasHandler);
publicAliasRoutes.on("HEAD", "/:key{.+}", headPublicAliasHandler);
