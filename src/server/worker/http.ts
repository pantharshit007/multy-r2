import { ApiError } from "./errors";

export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,x-api-key",
};

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Expected a JSON request body");
  }
}

export function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}

export function textErrorResponse(error: unknown): Response {
  logUnexpectedError(error);
  const message = error instanceof ApiError ? error.message : "Unexpected server error";
  const status = error instanceof ApiError ? error.status : 500;
  return new Response(message, { status, headers: CORS_HEADERS });
}

export function jsonErrorResponse(error: unknown): Response {
  logUnexpectedError(error);
  const message = error instanceof ApiError ? error.message : "Unexpected server error";
  const status = error instanceof ApiError ? error.status : 500;
  return json({ error: message }, status);
}

function logUnexpectedError(error: unknown): void {
  if (!(error instanceof ApiError)) console.error(error);
}
