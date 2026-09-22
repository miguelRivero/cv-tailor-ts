# cv-tailor-worker

A Cloudflare Worker that holds the OpenAI API key server-side and does the two things the static
web app (`web/`) cannot do on its own from a browser:

- **`POST /api/fetch-offer`** — fetches a job offer URL server-side, sidestepping browser CORS
  entirely, and extracts its visible text with `HTMLRewriter`. Returns `422 OFFER_UNREADABLE` with a
  specific `reason` for the expected failure modes (a login wall, a bot check, a blocked host) — that
  is the signal the web app uses to reveal its "paste the text instead" textarea.
- **`POST /api/tailor`** — runs job-title extraction, keyword extraction and CV adaptation against
  OpenAI, streaming progress back to the browser as newline-delimited JSON (see
  [`src/core/types/api.ts`](../src/core/types/api.ts) for the exact event shapes).

It imports its prompts directly from [`src/core/prompts/`](../src/core/prompts/) — the same source
the CLI uses — so a prompt only ever needs to change in one place.

## Local development

Local `wrangler dev` runs entirely offline: no Cloudflare account or login is needed to develop or
test against it, only to actually deploy (see `docs/WEB.md`, added once the deploy workflow exists).

1. Copy `.dev.vars.example` to `.dev.vars` and fill in a real `OPENAI_API_KEY` and any value for
   `CLIENT_TOKEN` (this is the shared passphrase the web app sends back as `X-CV-Tailor-Key` — generate
   one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
2. From the repo root: `npm run dev:worker` (or `npm run dev` from inside `worker/`). This starts a
   local server on `http://127.0.0.1:8787`, which the web app's Vite dev server proxies `/api/*`
   requests to. Vite itself is on `http://127.0.0.1:5180`. Direct browser calls to this worker
   (not via the proxy) are allowed from `http://127.0.0.1:5180` and `http://localhost:5180`.
   `POST /api/tailor` may omit `framework`; that is the career-neutral prompt path, not `agnostic`.
3. Smoke-test it directly with curl, e.g.:
   ```
   curl http://127.0.0.1:8787/api/health
   curl -X POST http://127.0.0.1:8787/api/fetch-offer \
     -H "Content-Type: application/json" -H "X-CV-Tailor-Key: <your CLIENT_TOKEN>" \
     -d '{"url":"https://example.com"}'
   ```

## Type checking

`npm run typecheck:worker` from the repo root (or `npm run typecheck` from inside `worker/`) runs
`tsc --noEmit`. This also type-checks everything under `src/core/` against the Workers runtime types
instead of Node's — a free cross-check that core has genuinely stayed free of any Node-only API.

## Deploying

See [docs/WEB.md](../docs/WEB.md) for the one-time Cloudflare account setup
(KV namespace ids in `wrangler.jsonc`, `wrangler secret put`, GitHub Actions
secrets and `VITE_*` variables) and for how `.github/workflows/deploy-worker.yml`
deploys this package on pushes to `main` that touch `worker/` or `src/core/`.
