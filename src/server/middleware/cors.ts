import { cors } from "hono/cors";
import { CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS } from "../constants";

/**
 * Permissive CORS policy shared by the admin and endpoint APIs. Hono's `cors`
 * middleware also answers `OPTIONS` preflight requests automatically, so the
 * APIs no longer need bespoke preflight handling.
 */
export const corsMiddleware = cors({
  origin: "*",
  allowMethods: [...CORS_ALLOWED_METHODS],
  allowHeaders: [...CORS_ALLOWED_HEADERS],
});
