import { Hono } from "hono";
import {
  createBucketHandler,
  createPrivateLinkHandler,
  deleteBucketHandler,
  deleteObjectHandler,
  getSignedObjectHandler,
  listBucketsHandler,
  listObjectsHandler,
  updateBucketHandler,
  uploadObjectHandler,
} from "../controllers/adminController";
import { ApiError, normalizeError } from "../errors";
import { adminAuth } from "../middleware/auth";
import { applyCorsHeaders, corsMiddleware } from "../middleware/cors";
import type { AppEnv } from "../types";

/**
 * Control-plane API for D1-backed buckets. Mounted at `/api`.
 *
 * Every route requires the admin API key except the signed-link reader, which
 * is registered before {@link adminAuth} so it stays publicly reachable.
 */
export const adminRoutes = new Hono<AppEnv>({ strict: false });

adminRoutes.onError((error, c) => {
  const { status, message } = normalizeError(error);
  const response = c.json({ error: message }, status);
  applyCorsHeaders(response.headers, c.req.header("Origin"));
  return response;
});

adminRoutes.use("*", corsMiddleware);

// Public: signed private-link reader (validated by HMAC signature, not the key).
adminRoutes.get("/buckets/:bucketId/signed/:key{.+}", getSignedObjectHandler);

// Everything below requires the admin API key.
adminRoutes.use("*", adminAuth);

adminRoutes.get("/buckets", listBucketsHandler);
adminRoutes.post("/buckets", createBucketHandler);
adminRoutes.patch("/buckets/:bucketId", updateBucketHandler);
adminRoutes.delete("/buckets/:bucketId", deleteBucketHandler);
adminRoutes.get("/buckets/:bucketId/objects", listObjectsHandler);
adminRoutes.post("/buckets/:bucketId/upload", uploadObjectHandler);
adminRoutes.delete("/buckets/:bucketId/objects/:key{.+}", deleteObjectHandler);
adminRoutes.get("/buckets/:bucketId/private-link/:key{.+}", createPrivateLinkHandler);

adminRoutes.all("*", () => {
  throw new ApiError(404, "API route not found");
});
