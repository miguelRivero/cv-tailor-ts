/**
 * Browser-facing env for the Cloudflare Worker.
 *
 * VITE_* values are inlined at build time and are public by definition.
 * VITE_WORKER_URL is the worker origin in production and must be empty
 * in dev (the Vite proxy already forwards `/api` to wrangler on 8787).
 * VITE_CLIENT_TOKEN is the shared passphrase sent as X-CV-Tailor-Key;
 * it ships in the bundle, which is why the worker also rate-limits and
 * the OpenAI project has a monthly cap.
 */

import { isWorkerUrlMissing, resolveWorkerBaseUrl } from '@core/api/workerUrl';

const prod = import.meta.env.PROD;
const configuredUrl = import.meta.env.VITE_WORKER_URL;

export const workerBaseUrl = resolveWorkerBaseUrl(prod, configuredUrl);
export const workerUrlMissing = isWorkerUrlMissing(prod, configuredUrl);

/** Matches worker/.dev.vars.example when the Vite env file is absent. */
const DEV_FALLBACK_TOKEN = 'dev-local-token';

export const clientToken =
  import.meta.env.VITE_CLIENT_TOKEN || (import.meta.env.DEV ? DEV_FALLBACK_TOKEN : '');
