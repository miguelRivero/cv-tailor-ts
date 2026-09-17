# Web app: GitHub Pages + Cloudflare Worker

The CLI in this repo is unchanged. The web app is a static Vite build hosted on
GitHub Pages, talking to a Cloudflare Worker that holds the OpenAI key and
fetches job-offer URLs (a browser cannot keep a secret or scrape cross-origin
pages).

```
Browser (GitHub Pages)                 Cloudflare Worker
POST /api/fetch-offer  ─────────────►  fetch the job page
POST /api/tailor (NDJSON)  ◄────────►  title → keywords → adapt
```

Local development needs no Cloudflare account. Deploying does. Do the
one-time setup below **before** merging `feat/web-app` to `main`; the
deploy workflows only run on `main`.

## Local development

Two processes, from the repo root:

```bash
# Terminal 1 — worker on http://127.0.0.1:8787
cp worker/.dev.vars.example worker/.dev.vars   # then fill in OPENAI_API_KEY
npm run dev:worker

# Terminal 2 — Vite on http://localhost:5173/cv-tailor-ts/
# Leave VITE_WORKER_URL empty so /api is proxied to 8787 (no CORS).
cp web/.env.example web/.env.local             # VITE_CLIENT_TOKEN must match .dev.vars
npm run dev:web
```

Generate a local passphrase with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and put the **same** value in `worker/.dev.vars` (`CLIENT_TOKEN`) and
`web/.env.local` (`VITE_CLIENT_TOKEN`). If `web/.env.local` is missing,
the dev client falls back to `dev-local-token`, which matches the
example worker file.

## One-time manual setup

Nothing in GitHub Actions can create a Cloudflare account, log you in,
or type a secret at a prompt. Do these in order.

### 1. Cloudflare account

Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
Note the **Account ID** (overview sidebar). You will paste it into GitHub
as `CLOUDFLARE_ACCOUNT_ID`.

### 2. Log wrangler in locally

From the repo, an interactive browser OAuth flow:

```bash
npx wrangler login
```

### 3. Create the KV namespace and paste the ids

The daily rate-limit counter lives in KV. Wrangler prints the ids; it
does **not** write them back into `worker/wrangler.jsonc`.

```bash
cd worker
npx wrangler kv namespace create RATE_KV
npx wrangler kv namespace create RATE_KV --preview
```

Paste the returned `id` and `preview_id` over the `REPLACE_WITH_*`
placeholders in `worker/wrangler.jsonc`. Commit that edit on its own.

Local `wrangler dev` simulates KV on disk regardless of those ids, which
is why development worked before this step.

### 4. First deploy from your machine

This is what actually creates the worker and assigns the `*.workers.dev`
subdomain. You need that URL for the Pages variable in step 8.

```bash
cd worker
npx wrangler deploy
```

Copy the printed URL (no trailing slash, no path), e.g.
`https://cv-tailor-worker.<account>.workers.dev`.

### 5. Dedicated OpenAI project and budget

In the OpenAI dashboard, create a **project** used only by this worker.
Set a hard monthly budget on it, then issue a **project-scoped** key.
Do this before putting the key anywhere. The client token ships in the
JS bundle and will eventually leak; the budget is the control that
actually bounds spend.

### 6. Worker secrets

Type the values at the prompt. Do **not** pipe them — that lands in
PowerShell history.

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CLIENT_TOKEN
```

Generate `CLIENT_TOKEN` with 32 random bytes, hex-encoded:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep that string: GitHub Actions needs the same value as `VITE_CLIENT_TOKEN`
in step 8.

### 7. Cloudflare API token for GitHub Actions

Dashboard → Manage Account → API Tokens → Create Token, start from the
**Edit Cloudflare Workers** template. It needs:

- Workers Scripts: Edit
- Account Settings: Read
- Workers KV Storage: Edit

The token is shown once. You will store it as `CLOUDFLARE_API_TOKEN`.

### 8. GitHub Actions secrets and variables

Repo → Settings → Secrets and variables → Actions.

**Secrets** (never `VITE_`):

| Name                    | Value       |
| ----------------------- | ----------- |
| `CLOUDFLARE_API_TOKEN`  | from step 7 |
| `CLOUDFLARE_ACCOUNT_ID` | from step 1 |

**Variables** (public, inlined into the Pages bundle):

| Name                | Value                                        |
| ------------------- | -------------------------------------------- |
| `VITE_WORKER_URL`   | worker origin from step 4, no trailing slash |
| `VITE_CLIENT_TOKEN` | the same passphrase as `CLIENT_TOKEN`        |

`VITE_*` is substituted at `vite build` time. Putting either of these
in a secret only redacts the Actions log and suggests they are hidden
from visitors. They are not. The rate limit and the OpenAI monthly cap
are the real backstops.

### 9. Enable GitHub Pages from Actions

Repo → Settings → Pages → **Source: GitHub Actions**. Not “Deploy from
a branch”. A branch deploy would publish whatever is on `main` without
the `pages: write` / `id-token: write` flow these workflows use.

## What deploys when

Two workflows, no `needs:` between them. Deploy jobs run only on `main`
(CI has already passed on the pull request). A broken CSS tweak must
not block a prompt fix, and the other way around.

| Workflow                              | Triggers on                      | Does                                                        |
| ------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `.github/workflows/ci.yml`            | every PR / push to `main`        | CLI build, lint, format, tests, worker typecheck, web build |
| `.github/workflows/deploy-pages.yml`  | `web/`, `src/core/`, `original/` | `vite build` with the `VITE_*` vars, then Pages             |
| `.github/workflows/deploy-worker.yml` | `worker/`, `src/core/`           | worker typecheck, then `wrangler deploy`                    |

`src/core/` is on both deploy triggers because prompts ship in the
worker bundle and the pipeline reducer / post-processing ship in the
Pages bundle.

## CORS

The worker allowlists `https://miguelrivero.github.io` (scheme + host,
**no path, no trailing slash**) plus localhost for Vite. Getting the
Pages origin wrong is the most common CORS failure: the site lives at
`https://miguelrivero.github.io/cv-tailor-ts/`, but the Origin header is
still `https://miguelrivero.github.io`. If this repo is ever hosted
under a different GitHub user, update `worker/src/lib/cors.ts` and
redeploy the worker.

## After the first production deploy

On `https://miguelrivero.github.io/cv-tailor-ts/`:

1. The page loads with no 404s. The bundle contains the worker origin
   and **no** `sk-` OpenAI key (`grep -R "sk-" web/dist/` is empty).
2. A pasted offer completes all five steps; Keywords fills in **before**
   adapt finishes (proves NDJSON survived Cloudflare, which is what
   most often works locally and breaks in production).
3. A plain corporate careers URL fetches and tailors in one Generate.
   A LinkedIn / Indeed URL fails before any OpenAI call, explains why
   inline, and focuses the textarea.
4. Preview is one A4 page in Geist. Print → Save as PDF, margins None.
5. The downloaded filename matches the CLI for the same offer.
