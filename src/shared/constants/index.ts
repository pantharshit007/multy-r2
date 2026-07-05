export const API_KEY_HEADER = "x-api-key";
// R2 binding "variable name" as configured on the Worker (wrangler.jsonc or the
// Cloudflare dashboard). Accept any case plus hyphens (e.g. BUCKET_A, shottr,
// myThumbnails, my-super-bucket) so the UI never hides a binding the Worker
// actually exposes on `env`. Names are looked up via bracket access
// (`env["my-super-bucket"]`), so non-identifier hyphenated names are fine.
export const BINDING_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_-]*$/;
export const DEFAULT_PRIVATE_LINK_TTL_SECONDS = 3600;
export const DEFAULT_MIME_TYPE = "application/octet-stream";
export const FOLDER_CONTENT_TYPE = "application/x-directory";

// Base path for the r2 object API, shared by the Worker routes and the UI client.
export const R2_API_PREFIX = "/api/r2";

// Prefix for the public, read-only short alias used to share objects:
//   GET|HEAD /cdn/<key>
//   GET|HEAD /cdn/<bindingName>/<key>
// The leading segment disambiguates the alias from arbitrary two-segment paths
// (e.g. /foo/bar) so unmatched requests get a plain 404 instead of resolving as
// a binding lookup.
export const PUBLIC_ALIAS_PREFIX = "/cdn";
