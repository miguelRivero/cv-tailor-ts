/**
 * Bindings and vars declared in wrangler.jsonc, plus the two secrets
 * set with `wrangler secret put` (production) or worker/.dev.vars
 * (local dev). Cloudflare injects all of these into the same object;
 * TypeScript can't tell secrets from vars from bindings, so this
 * interface is the one place that distinction is documented.
 */
export interface Env {
  /** Backs the daily request counter - see lib/rateLimit.ts. */
  RATE_KV: KVNamespace;

  // --- secrets ---
  OPENAI_API_KEY: string;
  /** Shared passphrase the web app sends as X-CV-Tailor-Key. */
  CLIENT_TOKEN: string;

  // --- vars (non-secret, see wrangler.jsonc) ---
  ALLOWED_MODELS: string;
  MAX_OFFER_CHARS: string;
  DAILY_REQUEST_LIMIT: string;
}
