import { handleAdminApi } from "../controllers/adminApiController";
import { handleEndpointApi } from "../controllers/endpointController";
import type { Env } from "../env";
import { corsPreflightResponse, jsonErrorResponse, textErrorResponse } from "../http";
import { authorizeAdminApiRequest } from "../middleware/auth";
import { API_PREFIX, LOCAL_ENDPOINT_PREFIX, normalizeEndpointUrl, shouldServeUiAssets } from "./paths";

export async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpointUrl = normalizeEndpointUrl(url);
  const isLocalEndpointRequest = url.pathname.startsWith(LOCAL_ENDPOINT_PREFIX);

  if (endpointUrl.pathname.startsWith(`${API_PREFIX}/`)) {
    if (isOptionsRequest(request)) return corsPreflightResponse();

    try {
      authorizeAdminApiRequest(request, env, endpointUrl);
      return await handleAdminApi(request, env, endpointUrl);
    } catch (error) {
      return jsonErrorResponse(error);
    }
  }

  if (!isLocalEndpointRequest && shouldServeUiAssets(url)) {
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
