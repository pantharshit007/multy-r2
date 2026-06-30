import { Hono } from "hono";
import { getObjectHandler, headObjectHandler } from "../controllers/endpointController";
import { normalizeError } from "../errors";
import { corsMiddleware } from "../middleware/cors";
import type { AppEnv } from "../types";

/**
 * Public, read-only short alias for serving objects:
 *
 *   GET|HEAD /:bindingName/:key   e.g. /BUCKET_A/tmp/pfp.webp
 *
 * This is the shareable URL form. It is mounted at `/:bindingName` so the
 * binding is exposed as a route param and reuses the endpoint object readers.
 * No auth (public read); all writes and listing stay on the authenticated
 * `/api/r2` API.
 */
export const publicAliasRoutes = new Hono<AppEnv>({ strict: false });

publicAliasRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  return c.text(message, status);
});

publicAliasRoutes.use("*", corsMiddleware);

publicAliasRoutes.get("/:key{.+}", getObjectHandler);
publicAliasRoutes.on("HEAD", "/:key{.+}", headObjectHandler);
