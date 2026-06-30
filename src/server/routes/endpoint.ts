import { Hono } from "hono";
import {
  deleteObjectHandler,
  getObjectHandler,
  headObjectHandler,
  healthCheckHandler,
  listBindingsHandler,
  listObjectsHandler,
  putObjectHandler,
} from "../controllers/endpointController";
import { BUCKET_SCOPE_BASE } from "../constants";
import { ApiError, normalizeError } from "../errors";
import { endpointAuth } from "../middleware/auth";
import { corsMiddleware } from "../middleware/cors";
import type { AppEnv } from "../types";

/**
 * Registers object routes onto an app instance. Used for both the default scope
 * (`/api/r2/...`, the Worker's default bucket) and the per-binding scope
 * (`/api/r2/bucket/:bindingName/...`) so one Worker can expose multiple R2
 * bindings with identical behavior.
 */
function defineBucketRoutes(app: Hono<AppEnv>): void {
  app.get("/", healthCheckHandler);
  app.patch("/", endpointAuth, listObjectsHandler);
  app.get("/:key{.+}", getObjectHandler);
  app.on("HEAD", "/:key{.+}", endpointAuth, headObjectHandler);
  app.put("/:key{.+}", endpointAuth, putObjectHandler);
  app.delete("/:key{.+}", endpointAuth, deleteObjectHandler);
}

/**
 * r2 object API. Mounted at `/api/r2`.
 *
 *   GET    /api/r2/bindings                       list R2 bindings (auth)
 *   GET    /api/r2                                health check
 *   PATCH  /api/r2                                list objects (auth)
 *   GET    /api/r2/:key                           download object (public)
 *   HEAD   /api/r2/:key                           object metadata (auth)
 *   PUT    /api/r2/:key                           upload object (auth)
 *   DELETE /api/r2/:key                           delete object (auth)
 *   ...and the same object routes under /api/r2/bucket/:bindingName.
 */
export const endpointRoutes = new Hono<AppEnv>({ strict: false });

endpointRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  return c.text(message, status);
});

endpointRoutes.use("*", corsMiddleware);

// Worker-wide binding discovery (not scoped to a single bucket).
endpointRoutes.get("/bindings", endpointAuth, listBindingsHandler);

// Per-binding scope: `/bucket/:bindingName/...` selects an explicit R2 binding.
const bucketScopedRoutes = new Hono<AppEnv>({ strict: false });
defineBucketRoutes(bucketScopedRoutes);
endpointRoutes.route(BUCKET_SCOPE_BASE, bucketScopedRoutes);

// Default scope: the Worker's default bucket.
defineBucketRoutes(endpointRoutes);

endpointRoutes.all("*", () => {
  throw new ApiError(404, "Endpoint route not found");
});
