/**
 * Resolve the Cloudflare Worker origin the web app talks to.
 *
 * In development the Vite proxy already forwards `/api` to
 * wrangler on 8787, so the base URL must be the empty string
 * (same-origin relative requests). In production it is the
 * absolute `*.workers.dev` origin from VITE_WORKER_URL.
 * That variable is baked in at build time and is therefore
 * public - it must never be treated as a secret.
 */

export function resolveWorkerBaseUrl(prod: boolean, workerUrl: string | undefined): string {
  if (!prod) {
    return '';
  }
  return (workerUrl ?? '').trim().replace(/\/+$/, '');
}

export function isWorkerUrlMissing(prod: boolean, workerUrl: string | undefined): boolean {
  return resolveWorkerBaseUrl(prod, workerUrl) === '' && prod;
}
