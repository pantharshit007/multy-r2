import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
  }
}

export interface NormalizedError {
  status: ContentfulStatusCode;
  message: string;
}

/**
 * Normalizes any thrown value into an HTTP status + safe message, logging
 * anything that is not a deliberate {@link ApiError}.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message };
  }

  console.error(error);
  return { status: 500, message: "Unexpected server error" };
}
