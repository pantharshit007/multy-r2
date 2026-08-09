# Multy R2

Personal multi-endpoint Cloudflare R2 dashboard. Client (Pages) and server (Worker) deploy independently — point the shared UI at any compatible Worker via URL + API key.

## Architecture

| Piece | Host | Role |
| --- | --- | --- |
| Client | Cloudflare Pages | SPA; endpoint records in localStorage |
| Server | Cloudflare Worker | R2 object API, admin API, public `/cdn` aliases |

Each endpoint record stores `endPoint`, `apiKey`, and optional `customDomain`. The UI sends `apiKey` as `x-api-key` to that Worker only. Multiple Workers are supported; no binding config is required in the endpoint form.

## Features

- List, upload, and delete objects on a selected Worker endpoint
- Multi-bucket support via R2 bindings (`/api/r2/bucket/:binding/...`)
- Public share URLs via Worker `/cdn/...` aliases
- Optional custom domain for generated public links
- In-app setup guide at `/setup-guide`

## Local development

```bash
pnpm install
pnpm dev      # UI (Vite)
pnpm wr:dev   # Worker (needs R2 binding + secrets)
```

### Local Worker endpoint

1. Bind a bucket as `R2_BUCKET` or `BUCKET_A` in `wrangler.jsonc`.
2. Set `AUTH_KEY_SECRET` (and `PRIVATE_LINK_SECRET` if using private links) in `.dev.vars`.
3. Run `pnpm wr:dev` and `pnpm dev`.
4. In the UI, add endpoint `http://localhost:8787` with API key matching `AUTH_KEY_SECRET`.

Binding names are the identifiers used in multi-bucket URLs. Friendly labels come from `wrangler.jsonc` at build time (`pnpm gen:bindings`). Prefer `UPPER_SNAKE_CASE` names.

## Deploy

**Worker**

```bash
# Configure R2 + D1 in wrangler.jsonc
# Set secrets: AUTH_KEY_SECRET, PRIVATE_LINK_SECRET
pnpm deploy:worker
```

**Pages**

```bash
pnpm deploy:pages   # builds client, deploys dist/ as project multy-r2
```

Or connect the repo in Cloudflare Pages: build command `pnpm build:client`, output directory `dist`.

### Worker bundle (shared UI users)

Paste the multi-bucket Worker from the rolling [worker](https://github.com/pantharshit007/multy-r2/releases/tag/worker) release, bind R2 + secrets, then add the Worker URL and API key in the UI. Full walkthrough: `/setup-guide` in the app.

- Raw: https://raw.githubusercontent.com/pantharshit007/multy-r2/release-worker-js/worker.js
- Local build: `pnpm build:worker-bundle` → `dist-worker/index.js` (do not deploy the Vite SPA `dist/` as a Worker)

## API

Full Worker route reference: [docs/api.md](docs/api.md).

- `apiKey` is the Worker secret; the UI stores it in localStorage and sends `x-api-key`.
- `customDomain` is only for generated public URLs; if empty, public URLs use `endPoint`.
- Public aliases live on the Worker (`/cdn/...`), not on Pages.

## Credits

Original idea and inspiration: [R2 Uploader](https://github.com/jw-12138/r2-uploader) by [jw-12138](https://github.com/jw-12138) — browser-based R2 management with API-key auth.

When I was looking a way to manage my R2 his worked came in first, but I find it hard to use with multiple bucket setup (you have to spin separate worker for each) and UI was not upto my liking, Understandable. So, that's why I created **Multy**.
