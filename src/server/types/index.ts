import type { Context } from "hono";
import type { Env } from "../env";

/**
 * Shared Hono type environment for every app, middleware and handler.
 * `Bindings` are the Cloudflare Worker bindings exposed on `c.env`.
 */
export interface AppEnv {
  Bindings: Env;
}

/** Convenience alias for a request handler bound to {@link AppEnv}. */
export type AppContext = Context<AppEnv>;
