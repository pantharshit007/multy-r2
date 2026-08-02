# Multy R2

Personal Cloudflare R2 dashboard built with Vite, React, TanStack Router, Tailwind CSS v4, Cloudflare Pages (client), and Cloudflare Workers (API).

## Architecture

Client and server deploy independently:

| Piece | Host | Role |
| --- | --- | --- |
| Client | Cloudflare Pages | Shared SPA; endpoint records in localStorage |
| Server | Cloudflare Worker | R2 object API, admin API, public `/cdn` aliases |

Point the client at any compatible Worker (yours or others) via endpoint URL + API key. The Worker does not serve the UI bundle.

## What is implemented

- Endpoint records stored in localStorage.
- Each record stores `endPoint`, `apiKey`, and optional `customDomain`.
- Object listing, upload, delete, and public URL copy against the selected endpoint.
- The saved endpoint API key is sent as `x-api-key` for that endpoint only.
- No Worker binding is required when adding an endpoint record.
- Multiple Worker endpoints are supported. Each endpoint has its own URL, API key, and custom domain.

## Local Setup

1. Install dependencies: `pnpm install`
2. Run the UI: `pnpm dev`
3. Add one or more Multy R2 Worker endpoints in the UI (see [docs/api.md](docs/api.md)).
4. Use each endpoint Worker API key in that endpoint's API key field.

## Local Worker Test

Use this when testing the Worker in this repo as an endpoint.

1. In `wrangler.jsonc`, bind your bucket as `R2_BUCKET` or `BUCKET_A`.
2. In `.dev.vars`, set `AUTH_KEY_SECRET` and `PRIVATE_LINK_SECRET` for local testing.
3. Start the Worker endpoint: `pnpm wr:dev`
4. Start the UI in another terminal: `pnpm dev`
5. In the UI, add endpoint `http://localhost:8787`.
6. In the UI, set API key to the same value as `.dev.vars` `AUTH_KEY_SECRET`.
7. Open that endpoint in the UI and use upload/list/delete.

`AUTH_KEY_SECRET` and `PRIVATE_LINK_SECRET` belong to the Worker endpoint, not the browser. For local testing, `.dev.vars` gives the local Worker those secrets, and the UI stores the endpoint API key in localStorage so it can send `x-api-key`.

### Naming R2 bindings

When you add an R2 bucket binding (in `wrangler.jsonc` or the Cloudflare dashboard) you set two things:

- **Variable name** = the binding name exposed on `env` (e.g. `BUCKET_A`). You choose this; it appears in multi-bucket share URLs (`/cdn/<binding>/<key>`), while single-bucket mode uses `/cdn/<key>`.
- **Bucket** = the real R2 bucket the binding points to (e.g. `shottr-bucket`).

The two are independent, and the runtime binding does not expose its bucket name. This app reads the friendly bucket name from `wrangler.jsonc` at build time (`pnpm gen:bindings`) to label the UI dropdown; a binding added only via the dashboard still works but shows its variable name until added to `wrangler.jsonc` and rebuilt.

**Recommended:** name bindings in `UPPER_SNAKE_CASE` (`BUCKET_A`, `THUMBNAILS`). The app accepts any name matching `^[A-Za-z_][A-Za-z0-9_-]*$` (letters, digits, `_`, `-`), but the Cloudflare dashboard and `wrangler deploy` conventionally expect identifier-style names, so hyphenated names like `my-super-bucket` may not be portable to production even though they run in local `wrangler dev`.

For deployed Workers, use Wrangler secrets instead of committing secret values to `wrangler.jsonc`. The config declares the required secret names, and `wrangler deploy` will fail if they are missing.

## Deployment

Deploy the Worker and the Pages app separately. The client is shared; each user (or account) runs their own Worker with R2 bindings, domain, and API keys.

### Worker (API)

1. Configure R2 bindings and D1 in `wrangler.jsonc`.
2. Set secrets: `AUTH_KEY_SECRET`, `PRIVATE_LINK_SECRET`.
3. Deploy: `pnpm deploy:worker` (or `wrangler deploy` after `pnpm gen:bindings`).

### Client (Pages)

1. Build: `pnpm build:client` (writes to `dist/`).
2. Deploy: `pnpm deploy:pages` (uses Wrangler Pages + project name `multy-r2`).
3. Or connect the GitHub repo in Cloudflare Pages with build command `pnpm build:client` and output directory `dist`.

After deploy, open the Pages URL and add Worker endpoint URLs + API keys in the UI. CORS on the Worker already allows browser origins (`origin: *`).

### Option: GitHub Actions (Worker)

This repo includes an opt-in workflow file at `.github/workflows/deploy-cloudflare.yml.disabled`.

1. Rename it to `.github/workflows/deploy-cloudflare.yml` if you want GitHub Actions deploys.
2. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as GitHub repo secrets.
3. Set `WORKER_DEPLOY_ENABLED` to `true` in the workflow or repository variables if you want the job to run.
4. Push to `main` to deploy the Worker only (not Pages).

## Setup guide (users)

In-app guide: open `/setup-guide` on the deployed Pages UI (or local `pnpm dev`).

**How users should get the Worker:**

1. **Recommended:** paste Multy’s multi-bucket Worker bundle from the rolling GitHub Release tag `worker` (published on every push to `main` via `.github/workflows/release-worker-bundle.yml`):
   - Release: https://github.com/pantharshit007/multy-r2/releases/tag/worker
   - Download: https://github.com/pantharshit007/multy-r2/releases/download/worker/worker.js
   - Paste into Workers → Edit code, bind R2 + secrets (type **Secret**), then add Worker URL + API key in the shared UI.
2. **CLI:** clone/fork → edit `wrangler.jsonc` → set secrets → `pnpm deploy:worker`.
3. **Full ownership:** fork and deploy both Worker (`pnpm deploy:worker`) and Pages (`pnpm deploy:pages`).

Local bundle: `pnpm build:worker-bundle` → `dist-worker/index.js`. Do not ship the Vite SPA `dist/` as a Worker — it has no R2 bindings.

## Notes

- Full Worker route reference: [docs/api.md](docs/api.md).
- `apiKey` is the endpoint Worker secret. The UI stores it in localStorage and sends it as `x-api-key`.
- `customDomain` is used only for generated public URLs. If empty, public URLs use `endPoint`.
- `wrangler.jsonc` bucket/D1 values do not create UI records. Add endpoints in the UI because endpoint records live in browser localStorage.
- Public object aliases stay on the Worker at `/cdn/...`; they are not part of the Pages app.
