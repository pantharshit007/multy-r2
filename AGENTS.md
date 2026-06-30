# AGENTS.md

## Project

Multy R2 is a React UI for managing multiple r2-uploader-compatible Worker endpoints.

## Current Model

- Endpoint records live in browser localStorage.
- Each record has `endPoint`, `apiKey`, and optional `customDomain`.
- The UI sends `apiKey` as `x-api-key` to the selected endpoint.
- Multiple Worker endpoints are supported.
- Do not require Worker bindings in the UI endpoint form.

## Routing

- The Worker is a single first-party app served by Hono (`src/server/app.ts`).
- `GET /`, `/assets/*`, `/buckets/*` serve the bundled SPA.
- `/api/*` is the D1 control-plane (admin) API (JSON errors).
- `/api/r2/*` is the r2 object API (text errors). It supports
  `GET /api/r2/bindings`, `PATCH /api/r2` (list), and `GET|HEAD|PUT|DELETE /api/r2/:key`.
- A binding can be selected with the `/api/r2/bucket/:bindingName/...` path scope.
- `GET|HEAD /:bindingName/:key` is a public, read-only short alias for sharing
  objects (e.g. `/BUCKET_A/tmp/pfp.webp`). Writes/listing stay on `/api/r2`.

## Local Worker

- `src/server/index.ts` can act as a local endpoint for testing.
- It expects an R2 binding named `R2_BUCKET` or `BUCKET_A`.
- It expects `AUTH_KEY_SECRET` in `.dev.vars` for local auth.

## Commands

- Install: `pnpm install`
- UI dev: `pnpm dev`
- Worker dev: `pnpm wr:dev`
- Build: `pnpm build`

## Rules

- Keep dependencies pinned.
- Use Tailwind CSS v4 for UI styling.
- Keep docs lean and direct.
- If something is constant or is changeable like a timeout of iteration number, it should be defined in `constants.ts`.
- Types should be defined in `types/` folder.
- If something is reusable logical unit, it should be defined in `lib/` folder.
- Move all the utility functions to `utils/` folder.
- Don't clutter a single file with too many functions, move them to there respective folder (ex: utils, services, controllers).
