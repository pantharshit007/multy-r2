## Goal

Build a personal Cloudflare-based R2 admin UI where you can:

- manage multiple buckets from one interface
- upload and delete assets
- copy each bucket's public URL
- optionally generate private signed links with expiry
- support per-bucket custom domains when available

---

## Current Direction

Your preferred shape is:

- **UI** on Pages or Worker assets
- **one Worker** for API and bucket operations
- **multiple R2 bucket bindings** configured in Cloudflare dashboard
- **bucket access decided per bucket**: public, private, or signed-link mode
- **custom domain optional**, not required

This is a good personal-project scope.

---

## Hybrid Architecture

The app should support two bucket connection styles under one UI:

### 1. Worker binding mode

- user binds bucket A, B, C to one Worker in Cloudflare dashboard
- the app talks to those buckets through the Worker

### 2. Endpoint mode

- user stores a bucket endpoint or custom domain in the app
- the app can switch between multiple endpoints, similar to `r2-uploader`

### Result

- one central UI
- multiple buckets
- one control plane
- flexible bucket setup for personal use

This is the cleanest mix of `R2-Manager-Worker` and `r2-uploader`.

---

## Recommended Tech Stack

- UI: `Vite + React + TanStack Router`
- Backend: `Cloudflare Worker`
- Storage/metadata: `Cloudflare D1`
- Auth: `Cloudflare Access` later if needed
- Styling/UI primitives: whatever is light and fast for you, keep it simple at first

Why this stack:

- the app is a dashboard, not an SEO site
- TanStack Start is optional, but not necessary for v1
- Vite + React + Router is simpler and lower-risk for a personal tool
- Worker + D1 fits the bucket management and signed-link logic well

---

## Best Repo to Learn From

If you want one repo to study most closely, use `R2-Manager-Worker` as the main technical reference.

Why:

- it already has a real admin/control-plane architecture
- it already handles uploads, navigation, move/copy/delete, and file listing
- it is closer to a unified multi-bucket tool than the other two repos

What not to copy wholesale:

- the extra features you do not need right now
- the heavy backend surface area

---

## Repo Verdict

### `neverinfamous/R2-Manager-Worker`

- best overall architecture reference
- strongest match for one interface managing many buckets
- too feature-heavy to fork without cleanup

### `james-elicx/cloudy`

- best UI/reference for a cleaner explorer
- bucket discovery is binding-based, not your preferred control model
- good inspiration, not best base

### `jw-12138/r2-uploader`

- good endpoint/domain UX
- supports multiple endpoints in the UI
- syncs endpoint config to the user's account via GitHub login
- but each endpoint is still effectively a separate bucket/worker target
- useful inspiration, not the base

---

## Platform Choice

Use a **Worker** for the control plane.

Reason:

- needs secrets / auth / bucket ops
- easier to keep one place for URL generation and access mode logic
- fits better than Pages-only for the backend side

Pages is still fine for the UI if you want a separate frontend build.

---

## Domain Model

### Public URL

Each bucket can have its own public URL:

- custom domain if the user connects one
- otherwise the bucket can still be public through whatever access mode you allow

### Private Link

For private buckets, expose a Worker-generated signed link with expiry.

### Admin App

The admin app should only:

- store the mapping
- show the current URL
- copy the URL
- generate private links when requested

It should not sit in the middle of normal public delivery.

---

## How Multiple Buckets Work

If you have bucket A, bucket B, and bucket C, the setup is:

1. Bind all three buckets to the same Worker in Cloudflare dashboard.
2. Store one metadata row per bucket in D1.
3. Use that row to map:
   - display name
   - binding name
   - custom domain
   - access mode
   - sort order
4. The UI loads the bucket list from D1.
5. When you open a bucket, the Worker uses the saved binding name to access the correct R2 bucket.

Example:

- `bucket-a` -> binding `BUCKET_A`
- `bucket-b` -> binding `BUCKET_B`
- `bucket-c` -> binding `BUCKET_C`

This gives you:

- one interface
- one Worker
- many buckets
- separate URLs per bucket when configured

This also works with the hybrid model above, where some buckets may be bound directly and others may be stored as endpoints/custom domains in metadata.

Important:

- the buckets themselves are still configured in Cloudflare
- the app is the manager and URL copier
- the Worker is the execution layer

---

## What the App Should Do

### Bucket management

- show all configured buckets
- let user mark bucket metadata as public/private
- let user store the bucket's custom domain

### File management

- browse files/folders
- upload files
- delete files
- copy public URL
- copy signed private link if enabled

### Optional later

- rename/move/copy
- folder tools
- bulk upload
- bulk delete
- search

---

## Important Clarification

Your idea is **not** to proxy all public bucket traffic through the Worker.

Instead:

- public traffic should go directly to the bucket's public URL / custom domain
- the Worker should be the management layer
- private access can be handled by signed links from the Worker

This keeps the architecture simpler and avoids forcing all reads through the Worker.

---

## MVP Plan

1. Build the UI shell
2. Connect one Worker API
3. Support multiple R2 bucket bindings in Cloudflare dashboard
4. Show bucket list in the UI
5. Browse files in a selected bucket
6. Upload/delete files
7. Store bucket custom domain in app metadata
8. Add `Copy public URL`
9. Add optional `Copy private link` with expiry
10. Add public/private toggle per bucket

Do not start with complex extras.

---

## Notes On Bucket Access

- if a bucket is public, show its public URL directly
- if a bucket has a custom domain, prefer that URL
- if a bucket is private, show a signed link option only
- if a bucket has no custom domain yet, the app should still work

---

## Implementation Strategy

### Control plane

- one Worker project
- one D1 database for metadata
- Cloudflare dashboard bindings for the buckets
- a small D1 table that stores the bucket list and their binding names

### UI

- a clean bucket sidebar
- a file browser pane
- copy buttons for URLs
- a simple access-mode control per bucket

### Later improvements

- add auth
- add better UX polish
- add search and bulk operations
- add more storage metadata

---

## Decision

For your personal use case:

- **one interface**: yes
- **one Worker**: yes
- **multiple buckets**: yes
- **custom domain per bucket**: optional but supported
- **public URL copy**: yes
- **private signed links**: yes
- **upload/download URL features**: not needed as a core MVP

This is a clean and practical scope.

---

## Reference Links

- `R2-Manager-Worker`: https://github.com/neverinfamous/R2-Manager-Worker
- `cloudy`: https://github.com/james-elicx/cloudy
- `r2-uploader`: https://github.com/jw-12138/r2-uploader
- `r2-uploader-example-worker`: https://github.com/jw-12138/r2-uploader-example-worker
