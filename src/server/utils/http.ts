import { ApiError } from "../errors";
import type { AppContext } from "../types";

/** Parses a JSON request body, surfacing a 400 instead of an unhandled throw. */
export async function readJsonBody<T>(c: AppContext): Promise<T> {
  try {
    return (await c.req.json()) as T;
  } catch {
    throw new ApiError(400, "Expected a JSON request body");
  }
}
