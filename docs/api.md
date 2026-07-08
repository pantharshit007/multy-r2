# Worker API

Multy R2 Worker is an API-only Cloudflare Worker. The SPA is hosted separately (Pages) and talks to this Worker over HTTP.

Base URL examples:

- Local: `http://localhost:8787`
- Deployed: `https://<your-worker>.workers.dev` or a custom domain

## Auth

Authenticated routes require:

```http
x-api-key: <AUTH_KEY_SECRET>
```

`AUTH_KEY_SECRET` is a Worker secret (local: `.dev.vars`). The client stores the key in browser localStorage and sends it only to the configured endpoint.

CORS allows any origin (`*`) with methods `GET`, `HEAD`, `PUT`, `POST`, `PATCH`, `DELETE`, `OPTIONS` and headers `content-type`, `x-api-key`.

## Route map

| Prefix | Role | Errors |
| --- | --- | --- |
| `GET /` | Health | plain text |
| `/api/r2/*` | R2 object API (bindings on this Worker) | plain text body |
| `/api/*` | Admin / D1 control plane | JSON `{ "error": "..." }` |
| `/cdn/*` | Public read-only object aliases | plain text body |

`/api/r2` is registered before `/api` so object routes are not swallowed by the admin mount.

---

## Health

### `GET /`

Worker liveness.

**Auth:** none  
**Response:** `200` plain text, e.g. `Multy R2 endpoint worker`

---

## R2 object API (`/api/r2`)

Operates on R2 bindings attached to this Worker. Used by the client when an endpoint record points at this Worker.

### Bucket scope

| Scope | Path prefix | Bucket |
| --- | --- | --- |
| Default | `/api/r2/...` | First available of `R2_BUCKET` or `BUCKET_A` |
| Explicit | `/api/r2/bucket/:bindingName/...` | `env[bindingName]` |

`:bindingName` is the wrangler/dashboard binding variable name (e.g. `BUCKET_A`).  
`:key` is the full object key (may contain `/`). Hono URL-decodes path params; do not double-decode.

**Reserved path segments on the default scope**

- `bindings` → binding discovery, not an object key
- `bucket/...` → explicit binding scope, not an object key starting with `bucket/`

Objects with those key shapes remain reachable via explicit `/bucket/:bindingName/...` or public `/cdn/...`.

### `GET /api/r2/bindings`

List R2 bindings on this Worker (probes each env value that looks like an R2 bucket).

**Auth:** required  
**Response:** `200` JSON array

```json
[
  {
    "id": "BUCKET_A",
    "name": "shottr-bucket",
    "bindingName": "BUCKET_A"
  }
]
```

`name` is the friendly `bucket_name` from `wrangler.jsonc` when known; otherwise it equals `bindingName`.

### `GET /api/r2`  
### `GET /api/r2/bucket/:bindingName`

Health for the default or scoped bucket API.

**Auth:** none  
**Response:** `200` plain text health message

### `PATCH /api/r2`  
### `PATCH /api/r2/bucket/:bindingName`

List objects.

**Auth:** required  
**Query:**

| Param | Description |
| --- | --- |
| `cursor` | Optional pagination cursor from a previous truncated list |

**Response:** `200` JSON

```json
{
  "objects": [ /* R2 list objects as returned by the binding */ ],
  "truncated": false,
  "cursor": null
}
```

When truncated, `cursor` is a string for the next page; otherwise it is omitted/`undefined` on the wire.

### `GET /api/r2/:key`  
### `GET /api/r2/bucket/:bindingName/:key`

Download object body.

**Auth:** none (public read through the API path)  
**Response:** `200` object body with R2 HTTP metadata + `etag`; guessed `content-type` if missing  
**Errors:** `404` text `Object not found`

### `HEAD /api/r2/:key`  
### `HEAD /api/r2/bucket/:bindingName/:key`

Object metadata only.

**Auth:** required  
**Response:** `200` empty body, metadata headers + `etag`  
**Errors:** `404` text

### `PUT /api/r2/:key`  
### `PUT /api/r2/bucket/:bindingName/:key`

Upload/replace object. Body is the raw object bytes.

**Auth:** required  
**Headers:** `content-type` optional (defaults from key extension)  
**Response:** `200` plain text `Done`

### `DELETE /api/r2/:key`  
### `DELETE /api/r2/bucket/:bindingName/:key`

Delete object.

**Auth:** required  
**Response:** `204` empty body

### Endpoint error shape

R2 API failures return plain text (not JSON), e.g. `401 Unauthorized`, `404 Object not found`.

---

## Public CDN aliases (`/cdn`)

Shareable, read-only URLs. No API key. Writes and listing stay on `/api/r2`.

### `GET|HEAD /cdn/:key`

Default bucket (same default as `/api/r2`).

Example: `/cdn/tmp/pfp.webp`

### `GET|HEAD /cdn/:bindingName/:key`

Explicit binding when the first path segment matches a configured R2 binding name.

Example: `/cdn/BUCKET_A/tmp/pfp.webp`

If the first segment is **not** a binding name, the Worker treats the whole path after `/cdn/` as a default-bucket key (e.g. `/cdn/folder/file.png` → key `folder/file.png`).

**Auth:** none  
**Response:** same as `GET`/`HEAD` on the object API  
**Errors:** plain text

Use a custom domain on the Worker (or client `customDomain` / per-bucket domain) when building public links in the UI; aliases always live on the Worker host, not on Pages.

---

## Admin API (`/api`)

D1-backed control plane for bucket metadata and bound-bucket operations. Mounted at `/api` (not under `/api/r2`).

Unless noted, routes require `x-api-key`. Errors are JSON:

```json
{ "error": "message" }
```

### Buckets (metadata)

#### `GET /api/buckets`

List bucket records.

**Response:** `200` `Bucket[]`

#### `POST /api/buckets`

Create a bucket record.

**Body (JSON):**

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | required |
| `bindingName` | string \| null | Worker R2 binding for file ops |
| `endpoint` | string \| null | optional external endpoint |
| `customDomain` | string \| null | used for public URL base |
| `accessMode` | `"public"` \| `"private"` \| `"signed-link"` | |
| `sortOrder` | number | |

**Response:** `201` `Bucket`

#### `PATCH /api/buckets/:bucketId`

Partial update. Same optional fields as create.

**Response:** `200` `Bucket`

#### `DELETE /api/buckets/:bucketId`

**Response:** `200` `{ "ok": true }`

### Objects (via D1 bucket → binding)

These require the bucket record to have a valid `bindingName` on this Worker.

#### `GET /api/buckets/:bucketId/objects`

**Query:** `prefix`, `cursor`, `limit` (clamped 1–1000, default 100)

**Response:** `200`

```json
{
  "objects": [
    {
      "key": "path/file.png",
      "size": 1234,
      "uploaded": "2026-01-01T00:00:00.000Z",
      "etag": "...",
      "publicUrl": "https://cdn.example/path/file.png"
    }
  ],
  "truncated": false,
  "cursor": null
}
```

#### `POST /api/buckets/:bucketId/upload`

Multipart form:

| Field | Required | Description |
| --- | --- | --- |
| `file` | yes | file part |
| `key` | no | object key; defaults to file name |

**Response:** `201` `{ "key": "...", "publicUrl": "..." | null }`

#### `DELETE /api/buckets/:bucketId/objects/:key`

**Response:** `200` `{ "ok": true }`

### Private / signed links

Requires Worker secret `PRIVATE_LINK_SECRET`.

#### `GET /api/buckets/:bucketId/private-link/:key`

Create a time-limited signed URL.

**Auth:** required  
**Query:** `expires` = TTL seconds (default 3600, min 60, max 604800)

**Response:** `200`

```json
{
  "url": "https://worker.example/api/buckets/<id>/signed/<key>?expires=...&signature=...",
  "expiresAt": "2026-01-01T01:00:00.000Z"
}
```

#### `GET /api/buckets/:bucketId/signed/:key`

Fetch object using a private link.

**Auth:** none (HMAC signature instead)  
**Query:** `expires` (unix seconds), `signature` (base64url HMAC)

**Response:** object body with `cache-control: private, max-age=0`  
**Errors:** `401` expired/invalid signature, `404` missing object

---

## Client usage

The Pages SPA does not call a fixed origin. Each endpoint record stores:

- `endPoint` — Worker base URL
- `apiKey` — value sent as `x-api-key`
- optional `customDomain` / per-bucket domains for public link display

Typical client calls against `endPoint`:

| Action | Request |
| --- | --- |
| Discover bindings | `GET /api/r2/bindings` + key |
| List | `PATCH /api/r2` or `PATCH /api/r2/bucket/:binding` + key |
| Upload | `PUT /api/r2/:key` (or scoped) + key, raw body |
| Delete | `DELETE /api/r2/:key` (or scoped) + key |
| Public share URL | `{origin}/cdn/:key` or `{origin}/cdn/:binding/:key` |

Admin UI config (separate localStorage) uses `apiBase` + key against `/api/buckets...`.

---

## Secrets

| Secret | Used for |
| --- | --- |
| `AUTH_KEY_SECRET` | `x-api-key` for `/api/r2` mutations/lists and `/api` admin routes |
| `PRIVATE_LINK_SECRET` | HMAC for private link create + verify |

Set with `wrangler secret put` (or `.dev.vars` locally). Do not commit values.
