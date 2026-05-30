# Multy R2

Personal Cloudflare R2 admin dashboard built with Vite, React, TanStack Router, Tailwind CSS v4, and Cloudflare Workers.

## What is implemented

- r2-uploader-style endpoint records stored in localStorage.
- Each record stores `endPoint`, `apiKey`, and optional `customDomain`.
- Object listing, upload, delete, and public URL copy against the selected endpoint.
- The saved endpoint API key is sent as `x-api-key` for that endpoint only.
- No Worker binding is required when adding an endpoint record.
- Multiple Worker endpoints are supported. Each endpoint has its own URL, API key, and custom domain.

## Local Setup

1. Install dependencies: `pnpm install`
2. Run the UI: `pnpm dev`
3. Add one or more r2-uploader-compatible Worker endpoints in the UI.
4. Use each endpoint Worker API key in that endpoint's API key field.

## Local Worker Test

Use this only when testing the Worker in this repo as an endpoint.

1. In `wrangler.jsonc`, bind your bucket as `R2_BUCKET` or `BUCKET_A`.
2. In `.dev.vars`, set `AUTH_KEY_SECRET` to any local test key.
3. Start the Worker endpoint: `pnpm wr:dev`
4. Start the UI in another terminal: `pnpm dev`
5. In the UI, add endpoint `http://localhost:8787`.
6. In the UI, set API key to the same value as `.dev.vars` `AUTH_KEY_SECRET`.
7. Open that endpoint in the UI and use upload/list/delete.

`AUTH_KEY_SECRET` belongs to the Worker endpoint. The browser does not invent it. For local testing, `.dev.vars` gives the local Worker that secret, and the UI stores the same value per endpoint in localStorage so it can send `x-api-key`.

## Deployment

Build with `pnpm build`. Deploy the static UI however you prefer, or keep using Vite locally.

## Notes

- The endpoint Worker must support the r2-uploader example routes: `PATCH /` list, `PUT /:key` upload, `DELETE /:key` delete.
- `apiKey` is the endpoint Worker secret. The UI stores it in localStorage and sends it as `x-api-key`.
- `customDomain` is used only for generated public URLs. If empty, public URLs use `endPoint`.
- `wrangler.jsonc` bucket/D1 values do not create UI records. Add endpoints in the UI because endpoint records live in browser localStorage.
