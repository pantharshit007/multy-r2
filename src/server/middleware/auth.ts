import type { MiddlewareHandler } from "hono";
import { API_KEY_HEADER } from "../../shared/constants";
import type { Env } from "../env";
import { ApiError } from "../errors";
import type { AppEnv } from "../types";
import { constantTimeEqual } from "../utils/crypto";

function requireApiKey(request: Request, env: Env, missingSecretMessage: string): void {
  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, missingSecretMessage);
  }

  const provided = request.headers.get(API_KEY_HEADER) ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}

/** Guards control-plane (admin) routes that mutate or read D1-backed buckets. */
export const adminAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  requireApiKey(c.req.raw, c.env, "AUTH_KEY_SECRET must be configured before using the admin API");
  await next();
};

/** Guards r2-uploader endpoint routes that mutate or list bucket objects. */
export const endpointAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  requireApiKey(c.req.raw, c.env, "AUTH_KEY_SECRET must be configured on this endpoint Worker");
  await next();
};
