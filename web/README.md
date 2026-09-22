# cv-tailor-web

The React frontend for CV Tailor, deployed as a static site to GitHub Pages. Paste a job offer URL
(or its text, if the page can't be fetched automatically), tailor a CV against it through the
[Cloudflare Worker](../worker/), and preview, print, and download the result.

Built with Vite, React 19, Tailwind CSS v4, and [shadcn/ui](https://ui.shadcn.com/) (Radix base, the
Nova preset — Lucide icons, Geist font).

## Local development

```
npm run dev:web     # from the repo root - starts the Vite dev server
```

Open **http://127.0.0.1:5180/cv-tailor-ts/** (or `http://localhost:5180/cv-tailor-ts/`). Vite
listens on both `127.0.0.1` and `::1`, port 5180, and will not fall back to another port. The
`/cv-tailor-ts/` path is required.

or from inside this directory: `npm run dev`. The dev server proxies `/api/*` requests to a worker
running locally on `http://127.0.0.1:8787` (see [`../worker/README.md`](../worker/README.md)), so
there's no CORS to think about in development.

Frontend framing (React / Vue / Agnostic) is shown only for the default base CV. Blank template
and an uploaded HTML file hide it and omit `framework`, so adaptation stays career-neutral. The
blank file is [`../original/cv_template.html`](../original/cv_template.html). Upload is HTML in
that layout, not PDF.

## Shared code

This app imports directly from [`../src/core/`](../src/core/) via the `@core` alias — the same
prompts, types, and HTML helpers the CLI and the worker use. It never imports Node-only code; the
root `tsconfig.json`'s `lib` has no `DOM`, so anything that leaked a browser API into `src/core`
would fail the CLI's own build.

## Scripts

| Script              | What it does                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                                                                    |
| `npm run typecheck` | `tsc -b` — type-checks with no output                                                       |
| `npm run build`     | Production build to `dist/` (run `typecheck` first; `build:web` at the repo root does both) |
| `npm run preview`   | Serve the built `dist/` locally                                                             |

Linting is not a per-workspace script here — `npm run lint` from the repo root runs one ESLint
config across the CLI, the worker, and this app's `src/`, so the same rules apply everywhere. The
one exception is [`src/components/ui/`](src/components/ui/), excluded from both ESLint and Prettier
because it's vendored: `npx shadcn@latest add --overwrite` regenerates those files, so hand-applying
this repo's style to them would just be undone on the next update.

## Deployment

GitHub Pages and the worker deploy from `main`. Setup and the CORS allowlist
(`http://127.0.0.1:5180` and `http://localhost:5180` for local Vite) are in
[`../docs/WEB.md`](../docs/WEB.md).
