// Route paths
export { R2_API_PREFIX, PUBLIC_ALIAS_PREFIX } from "../../shared/constants";
export const API_PREFIX = "/api";
export const BUCKET_SCOPE_BASE = "/bucket/:bindingName";

// CORS
export const CORS_ALLOWED_METHODS = ["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"] as const;
export const CORS_ALLOWED_HEADERS = ["content-type", "x-api-key"] as const;
export const CORS_MAX_AGE_SECONDS = 86_400;

// Object list limits
export const DEFAULT_OBJECT_LIST_LIMIT = 100;
export const MIN_OBJECT_LIST_LIMIT = 1;
export const MAX_OBJECT_LIST_LIMIT = 1000;

// Private link TTLs
export const MIN_PRIVATE_LINK_TTL_SECONDS = 60;
export const MAX_PRIVATE_LINK_TTL_SECONDS = 604_800;
export const SIGNED_OBJECT_CACHE_CONTROL = "private, max-age=0";

// R2 bindings
export const DEFAULT_R2_BINDING_NAMES = ["R2_BUCKET", "BUCKET_A"] as const;
export const R2_PROBE_LIMIT = 1;
export const DEFAULT_BUCKET_ACCESS_MODE = "public" as const;
export const DEFAULT_BUCKET_SORT_ORDER = 0;
export const ACCESS_MODES = ["public", "private", "signed-link"] as const;

// Misc
export const HEALTH_CHECK_MESSAGE = "Multy R2 endpoint worker";
