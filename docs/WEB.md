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

# Terminal 2 — Vite on http://127.0.0.1:5180/cv-tailor-ts/
# Leave VITE_WORKER_URL empty so /api is proxied to 8787 (no CORS).
cp web/.env.example web/.env.local             # VITE_CLIENT_TOKEN must match .dev.vars
npm run dev:web
```

Vite listens on `127.0.0.1` and `::1`, port **5180** (`strictPort`). Open
**http://127.0.0.1:5180/cv-tailor-ts/** — the `/cv-tailor-ts/` prefix is
required. `http://127.0.0.1:5180/` alone is not the app.

Generate a local passphrase with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and put the **same** value in `worker/.dev.vars` (`CLIENT_TOKEN`) and
`web/.env.local` (`VITE_CLIENT_TOKEN`). If `web/.env.local` is missing,
the dev client falls back to `dev-local-token`, which matches the
example worker file.

### Base CV and frontend framing

The page starts on **Blank template** (`original/cv_template.html`). The personal
CV file is not part of the Pages bundle. Upload accepts `.html` in that layout,
or a `.pdf`. PDF text is extracted in the browser and wrapped into the same
`.content` HTML. The PDF bytes are not sent to the worker.

The first upload in a browser is stored in that browser's `localStorage` and
selected on the next visit. Each browser keeps its own file. A later upload is
for the session until **Replace saved CV**. **Forget saved CV** deletes the
record in this browser only.

**Frontend framing** stays off until the visitor turns it on for their saved CV.
Generate then sends React / Vue / Agnostic. The blank template, a session
upload, and a saved CV with framing off omit `framework`, so the worker uses
the career-neutral prompts instead of falling back to `agnostic` (which still
talks about frontend frameworks).

## One-time manual setup

Wrangler is Cloudflare’s CLI for Workers (the `wrangler` package in
`worker/`). GitHub Actions cannot create an account, open a browser
login, or type a secret at a prompt. Do these in order, from a
PowerShell in the repo. You do **not** need to add a domain to
Cloudflare — the free `*.workers.dev` subdomain is enough.

Prefer the CLI over hunting in the dashboard. The dashboard layout
moves; `npx wrangler` output does not.

### 1. Create a free Cloudflare account

Sign up at [dash.cloudflare.com](https://dash.cloudflare.com). Skip
adding a site if it asks — Workers do not need one.

Do not look for the Account ID yet. It is no longer in the account-home
sidebar. Step 3 prints it after you log wrangler in.

### 2. Log wrangler in locally

From the `worker/` directory (so you pick up this repo’s Wrangler,
not some other global one):

```powershell
cd worker
npx wrangler login
```

A browser window opens. Approve access. Back in the terminal you
should see something like `Successfully logged in.`

If the browser never appears, copy the URL wrangler printed and open it
yourself. Stay in `worker/` for the rest of these wrangler commands.

### 3. Copy the Account ID with wrangler

```powershell
npx wrangler whoami
```

You get a table. The **Account ID** is the 32-character hex string in
the second column — not your email, not the account name.

```
👋 You are logged in with an OAuth Token, associated with the email you@example.com.
┌──────────────────┬──────────────────────────────────┐
│ Account Name     │ Account ID                       │
├──────────────────┼──────────────────────────────────┤
│ Your account     │ a1b2c3d4e5f67890a1b2c3d4e5f67890 │
└──────────────────┴──────────────────────────────────┘
```

Save that hex string. It becomes GitHub secret `CLOUDFLARE_ACCOUNT_ID`
in step 8.

If `whoami` says you are not logged in, go back to step 2.

**Dashboard fallback** (only if wrangler is unavailable):

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).
   Left nav may say **Workers**, **Compute**, or **Workers & Pages**.
2. On that page, find **Account details** (not the home overview) and
   copy **Account ID**.
3. Or press `Ctrl+K` anywhere in the dashboard, type `Copy account ID`,
   Enter.
4. Or look at the URL after you click into the account:
   `https://dash.cloudflare.com/<ACCOUNT_ID>/...`

### 4. Create the KV namespace and paste the ids

KV is Cloudflare’s small key-value store. This worker uses one
namespace (`RATE_KV`) as a daily request counter. Wrangler prints the
ids; it does **not** write them into `wrangler.jsonc` for you.

Still in `worker/`:

```powershell
npx wrangler kv namespace create RATE_KV
npx wrangler kv namespace create RATE_KV --preview
```

Each command prints a block like:

```
✨  Success!
Add the following to your configuration file:
kv_namespaces = [
  { binding = "RATE_KV", id = "0123456789abcdef0123456789abcdef" }
]
```

The `--preview` run prints a `preview_id` instead of `id`. Open
`worker/wrangler.jsonc` and replace only the two placeholders — keep
the rest of the file:

```jsonc
"kv_namespaces": [
  {
    "binding": "RATE_KV",
    "id": "paste-the-id-from-the-first-command",
    "preview_id": "paste-the-preview_id-from-the-second-command",
  },
],
```

Commit that edit on its own (it is config, not a secret).

Local `npm run dev:worker` simulates KV on disk and ignores these ids,
which is why development worked before this step. A real
`wrangler deploy` will fail until they are real ids.

### 5. First deploy from your machine

This is what creates the worker in your account and assigns the
`*.workers.dev` URL. GitHub Actions will redeploy later; you need that
URL now for the Pages variable.

Still in `worker/`:

```powershell
npx wrangler deploy
```

Success looks like:

```
Uploaded cv-tailor-worker
Published cv-tailor-worker
  https://cv-tailor-worker.<something>.workers.dev
```

Copy that `https://…workers.dev` URL. No trailing slash, no path. It
becomes GitHub variable `VITE_WORKER_URL` in step 8.

If deploy complains about KV ids, finish step 4. If it complains you
are not logged in, finish step 2.

### 6. Dedicated OpenAI project and budget

In the OpenAI dashboard, create a **project** used only by this worker.
Set a hard monthly budget on it, then issue a **project-scoped** key
(`sk-…`). Do this before putting the key anywhere. The client token
ships in the JS bundle and will eventually leak; the budget is the
control that actually bounds spend.

### 7. Worker secrets (OpenAI key + client passphrase)

These live on Cloudflare, not in Git. Wrangler prompts you; the typing
is hidden. Do **not** pipe the values (`echo … | wrangler secret put`)
— that lands in PowerShell history.

Generate the passphrase first and keep it in a password manager. You
need the **same** string in step 8 as `VITE_CLIENT_TOKEN`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then, still in `worker/`:

```powershell
npx wrangler secret put OPENAI_API_KEY
```

Paste the `sk-…` key at the prompt, Enter.

```powershell
npx wrangler secret put CLIENT_TOKEN
```

Paste the hex passphrase, Enter.

### 8. Cloudflare API token for GitHub Actions

This token is what Actions uses to deploy the worker. It is **not**
the OpenAI key, and it is **not** the Account ID.

1. Open [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   (profile icon, top right → **My Profile** → **API Tokens**).
2. **Create Token**.
3. Use the **Edit Cloudflare Workers** template (do not start from a
   blank token).
4. Confirm it includes:
   - Account → Workers Scripts → Edit
   - Account → Account Settings → Read
   - Account → Workers KV Storage → Edit
5. Set the account resource to **this** account.
6. Continue to summary → Create Token.
7. Copy the token **now**. Cloudflare shows it once.

That string becomes GitHub secret `CLOUDFLARE_API_TOKEN`.

### 9. GitHub Actions secrets and variables

In the GitHub repo: **Settings → Secrets and variables → Actions**.

**Secrets** (the Secrets tab — never names starting with `VITE_`):

| Name                    | Value                             |
| ----------------------- | --------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | from step 8                       |
| `CLOUDFLARE_ACCOUNT_ID` | the hex id from `wrangler whoami` |

**Variables** (the Variables tab — public, inlined into the Pages bundle):

| Name                | Value                                        |
| ------------------- | -------------------------------------------- |
| `VITE_WORKER_URL`   | `https://…workers.dev` from step 5, no slash |
| `VITE_CLIENT_TOKEN` | the same hex passphrase as `CLIENT_TOKEN`    |

`VITE_*` is substituted at `vite build` time. Putting either of these
in a secret only redacts the Actions log and suggests they are hidden
from visitors. They are not. The rate limit and the OpenAI monthly cap
are the real backstops.

### 10. Enable GitHub Pages from Actions

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
**no path, no trailing slash**) plus the Vite dev origins
`http://127.0.0.1:5180` and `http://localhost:5180`. Getting the
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
