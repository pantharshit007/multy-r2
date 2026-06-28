export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  AUTH_KEY_SECRET?: string;
  PRIVATE_LINK_SECRET: string;
  [binding: string]: unknown;
}
