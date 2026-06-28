import { API_KEY_HEADER } from "../../shared/constants";
import type { Env } from "../env";
import { ApiError } from "../errors";
import { constantTimeEqual } from "../utils/crypto";

export function authorizeAdminApiRequest(request: Request, env: Env, url: URL): void {
  if (url.pathname.includes("/signed/")) return;

  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, "AUTH_KEY_SECRET must be configured before using the admin API");
  }

  const provided = request.headers.get(API_KEY_HEADER) ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}

export function authorizeEndpointRequest(request: Request, env: Env): void {
  if (!env.AUTH_KEY_SECRET) {
    throw new ApiError(500, "AUTH_KEY_SECRET must be configured on this endpoint Worker");
  }

  const provided = request.headers.get(API_KEY_HEADER) ?? "";
  if (!constantTimeEqual(provided, env.AUTH_KEY_SECRET)) {
    throw new ApiError(401, "Unauthorized");
  }
}
