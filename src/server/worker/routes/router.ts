import { handleAdminApi } from "../controllers/adminApiController";
import { handleEndpointApi } from "../controllers/endpointController";
import type { Env } from "../env";
import { corsPreflightResponse, jsonErrorResponse, textErrorResponse } from "../http";
import { authorizeAdminApiRequest } from "../middleware/auth";
import { API_PREFIX, INTERNAL_ENDPOINT_PREFIX, normalizeEndpointUrl, shouldServeUiAssets as shouldServeUiAssetsForPath } from "./paths";

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpointUrl = normalizeEndpointUrl(url);
  const isInternalEndpointRequest = url.pathname.startsWith(INTERNAL_ENDPOINT_PREFIX);

  if (endpointUrl.pathname.startsWith(`${API_PREFIX}/`)) {
    if (isOptionsRequest(request)) return corsPreflightResponse();

    try {
      authorizeAdminApiRequest(request, env, endpointUrl);
      return await handleAdminApi(request, env, endpointUrl);
    } catch (error) {
      return jsonErrorResponse(error);
    }
  }

  if (!isInternalEndpointRequest && isUiAssetRequest(request) && shouldServeUiAssets(request, url)) {
    return env.ASSETS.fetch(request);
  }

  if (isOptionsRequest(request)) return corsPreflightResponse();

  try {
    return await handleEndpointApi(request, env, endpointUrl);
  } catch (error) {
    return textErrorResponse(error);
  }
}

function isOptionsRequest(request: Request): boolean {
  return request.method.toUpperCase() === "OPTIONS";
}

function isUiAssetRequest(request: Request): boolean {
  const method = request.method.toUpperCase();
  return method === "GET" || method === "HEAD";
}

function shouldServeUiAssets(request: Request, url: URL): boolean {
  return shouldServeUiAssetsForPath(url);
}
