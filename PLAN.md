# R2 Admin Plan

## Goal

Build a personal Cloudflare R2 admin UI that can manage multiple buckets from one place, with a better UI than the existing repos.

## Recommended Stack

- Package manager: `pnpm`
- UI: `Vite + React + TanStack Router`
- Backend: `Cloudflare Worker`
- Metadata: `Cloudflare D1`
- Optional auth later: `Cloudflare Access`

Why this stack:

- this is a dashboard, not an SEO app
- TanStack Start is fine, but not required for v1
- Vite + React + Router is simpler and lower-risk
- Worker + D1 fits bucket control, access mode, and signed-link logic

## Architecture

Use one central control plane and keep public bucket delivery direct.

- Admin UI lives in one app
- One Worker handles API actions and signed-link generation
- D1 stores bucket metadata and URL mappings
- Public bucket traffic goes directly to the bucket URL or custom domain
- The Worker should not proxy normal public reads

## Hybrid Bucket Model

The app should support two bucket connection styles under one UI.

### Worker binding mode

- user binds bucket A, B, C to the same Worker in Cloudflare dashboard
- the app talks to those buckets through the Worker bindings

### Endpoint mode

- user stores a bucket endpoint or custom domain in the app
- the app can switch between multiple saved endpoints, like `r2-uploader`

### Result

- one UI
- one control plane
- multiple buckets
- flexible setup for personal use

This is the best mix of `R2-Manager-Worker` and `r2-uploader`.

## How Multiple Buckets Work

If you have bucket A, bucket B, and bucket C:

- each bucket gets one record in D1
- each record stores the display name, binding name or endpoint, custom domain, access mode, and sort order
- the UI loads the bucket list from D1
- selecting a bucket routes actions to the correct binding or endpoint

Example mapping:

- `bucket-a` -> `BUCKET_A`
- `bucket-b` -> `BUCKET_B`
- `bucket-c` -> `BUCKET_C`

This can also work if some buckets are bound directly and others are stored as endpoints or custom domains.

## Bucket Access Modes

Each bucket can be treated as one of these:

- public
- private
- signed-link only

Rules:

- if a bucket is public, show its public URL directly
- if a bucket has a custom domain, prefer that URL
- if a bucket is private, show a signed link option
- if a bucket has no custom domain yet, the app should still work

## Public URLs and Signed Links

- public URL: bucket custom domain or public bucket URL
- private link: Worker-generated signed link with expiry
- the app should mainly support `Copy public URL`
- `Copy private link` is optional but useful

## User Flow

1. User creates buckets in Cloudflare.
2. User either binds buckets to the Worker or saves endpoint/domain records in the UI.
3. The app loads the bucket records.
4. User opens a bucket and manages files.
5. User copies the public URL or an optional signed private link.

## MVP

Build only this first:

- UI shell
- bucket list
- file browser
- upload and delete
- bucket custom domain field
- public/private toggle
- copy public URL
- copy private signed link with expiry

Do not start with:

- search
- bulk operations
- analytics
- webhooks
- lifecycle tools
- advanced permissions

## Auth

For personal use, keep it simple first.

- no full auth system required in v1
- if needed later, put Cloudflare Access in front of the admin UI

## References

- `R2-Manager-Worker`: `https://github.com/neverinfamous/R2-Manager-Worker`
- `cloudy`: `https://github.com/james-elicx/cloudy`
- `r2-uploader`: `https://github.com/jw-12138/r2-uploader`
- `r2-uploader-example-worker`: `https://github.com/jw-12138/r2-uploader-example-worker`

## Implementation Checklist

### 1. Project setup

- create a Vite + React app with `pnpm`
- add TanStack Router
- add Cloudflare Worker support
- add D1 binding

### 2. D1 schema

Create one table for bucket metadata.

Suggested fields:

- `id`
- `name`
- `binding_name`
- `endpoint`
- `custom_domain`
- `access_mode`
- `sort_order`
- `created_at`
- `updated_at`

### 3. Worker API

Suggested routes:

- `GET /api/buckets`
- `POST /api/buckets`
- `PATCH /api/buckets/:id`
- `DELETE /api/buckets/:id`
- `GET /api/buckets/:id/objects`
- `POST /api/buckets/:id/upload`
- `DELETE /api/buckets/:id/objects/:key`
- `GET /api/buckets/:id/private-link/:key`

### 4. UI pages

- bucket list page
- bucket detail / file browser page
- settings drawer or page for access mode and custom domain

### 5. Environment variables

- `ACCOUNT_ID` if you use Cloudflare API calls
- any API token or secret you decide to keep server-side
- optional Access-related values later

### 6. Build order

1. scaffold app
2. connect D1
3. load bucket list
4. browse files
5. upload/delete files
6. copy public URL
7. generate private links
8. polish UI
