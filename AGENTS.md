# AGENTS.md

## Project

Multy R2 is a React UI for managing multiple r2-uploader-compatible Worker endpoints.

## Current Model

- Endpoint records live in browser localStorage.
- Each record has `endPoint`, `apiKey`, and optional `customDomain`.
- The UI sends `apiKey` as `x-api-key` to the selected endpoint.
- Multiple Worker endpoints are supported.
- Do not require Worker bindings in the UI endpoint form.

## Local Worker

- `src/worker/index.ts` can act as a local endpoint for testing.
- It expects an R2 binding named `R2_BUCKET` or `BUCKET_A`.
- It expects `AUTH_KEY_SECRET` in `.dev.vars` for local auth.
- It supports `PATCH /`, `PUT /:key`, `DELETE /:key`, and `GET /:key`.

## Commands

- Install: `pnpm install`
- UI dev: `pnpm dev`
- Worker dev: `pnpm wr:dev`
- Build: `pnpm build`

## Rules

- Keep dependencies pinned.
- Use Tailwind CSS v4 for UI styling.
- Keep docs lean and direct.
