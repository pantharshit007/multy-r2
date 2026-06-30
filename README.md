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
2. In `.dev.vars`, set `AUTH_KEY_SECRET` and `PRIVATE_LINK_SECRET` for local testing.
3. Start the Worker endpoint: `pnpm wr:dev`
4. Start the UI in another terminal: `pnpm dev`
5. In the UI, add endpoint `http://localhost:8787`.
6. In the UI, set API key to the same value as `.dev.vars` `AUTH_KEY_SECRET`.
7. Open that endpoint in the UI and use upload/list/delete.

`AUTH_KEY_SECRET` and `PRIVATE_LINK_SECRET` belong to the Worker endpoint, not the browser. For local testing, `.dev.vars` gives the local Worker those secrets, and the UI stores the endpoint API key in localStorage so it can send `x-api-key`.

### Naming R2 bindings

When you add an R2 bucket binding (in `wrangler.jsonc` or the Cloudflare dashboard) you set two things:

- **Variable name** = the binding name exposed on `env` (e.g. `BUCKET_A`). You choose this; it is what appears in share URLs (`/cdn/<binding>/<key>`).
- **Bucket** = the real R2 bucket the binding points to (e.g. `shottr-bucket`).

The two are independent, and the runtime binding does not expose its bucket name. This app reads the friendly bucket name from `wrangler.jsonc` at build time (`pnpm gen:bindings`) to label the UI dropdown; a binding added only via the dashboard still works but shows its variable name until added to `wrangler.jsonc` and rebuilt.

**Recommended:** name bindings in `UPPER_SNAKE_CASE` (`BUCKET_A`, `THUMBNAILS`). The app accepts any name matching `^[A-Za-z_][A-Za-z0-9_-]*$` (letters, digits, `_`, `-`), but the Cloudflare dashboard and `wrangler deploy` conventionally expect identifier-style names, so hyphenated names like `my-super-bucket` may not be portable to production even though they run in local `wrangler dev`.

For deployed Workers, use Wrangler secrets instead of committing secret values to `wrangler.jsonc`. The config declares the required secret names, and `wrangler deploy` will fail if they are missing.

## Deployment

This project deploys as a single Cloudflare Worker that serves both the built UI assets and the API.

### Option 1: Wrangler from your machine

Build with `pnpm build`, then deploy with `wrangler deploy`.

### Option 2: Cloudflare Workers Builds from GitHub

1. Push the repo to GitHub.
2. In Cloudflare dashboard, go to `Workers & Pages`.
3. Create or open the Worker.
4. Under `Settings` > `Builds`, connect the GitHub repo.
5. Make sure the Worker name in Cloudflare matches the `name` in `wrangler.jsonc`.
6. Set the build command to `pnpm build` and the deploy command to `wrangler deploy`.
7. Add required secrets in Cloudflare, including `AUTH_KEY_SECRET` and `PRIVATE_LINK_SECRET`.
8. Push to the connected branch to trigger automatic builds and deployments.

### Option 3: GitHub Actions

This repo includes an opt-in workflow file at `.github/workflows/deploy-cloudflare.yml.disabled`.

1. Rename it to `.github/workflows/deploy-cloudflare.yml` if you want GitHub Actions deploys.
2. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as GitHub repo secrets.
3. Set `WORKER_DEPLOY_ENABLED` to `true` in the workflow or repository variables if you want the job to run.
4. Push to `main` to deploy.

## Notes

- The endpoint Worker must support the r2-uploader example routes: `PATCH /` list, `PUT /:key` upload, `DELETE /:key` delete.
- `apiKey` is the endpoint Worker secret. The UI stores it in localStorage and sends it as `x-api-key`.
- `customDomain` is used only for generated public URLs. If empty, public URLs use `endPoint`.
- `wrangler.jsonc` bucket/D1 values do not create UI records. Add endpoints in the UI because endpoint records live in browser localStorage.
