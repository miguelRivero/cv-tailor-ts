/**
 * cv-tailor-worker: holds the OpenAI key server-side and does the two
 * things a static GitHub Pages site can't do on its own - fetch a
 * cross-origin job offer URL, and call OpenAI without exposing the key
 * to every visitor.
 *
 * See docs/WEB.md for the one-time Cloudflare setup, and worker/README
 * for local development.
 */

import { Env } from './lib/env.js';
import { handlePreflight, resolveOrigin } from './lib/cors.js';
import { checkAuth } from './lib/auth.js';
import { checkAndIncrementDailyLimit } from './lib/rateLimit.js';
import { jsonError } from './lib/errors.js';
import { handleHealth } from './routes/health.js';
import { handleFetchOffer } from './routes/fetchOffer.js';
import { handleTailor } from './routes/tailor.js';

async function requireAuthAndBudget(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response | null> {
  if (!checkAuth(request, env)) {
    return jsonError(
      401,
      { code: 'unauthorized', message: 'Missing or invalid API key.', retryable: false },
      origin
    );
  }

  const limit = Number(env.DAILY_REQUEST_LIMIT || '50');
  const allowed = await checkAndIncrementDailyLimit(env.RATE_KV, limit);
  if (!allowed) {
    return jsonError(
      429,
      {
        code: 'rate_limited',
        message: 'Daily request limit reached. Try again tomorrow.',
        retryable: true,
      },
      origin
    );
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const preflight = handlePreflight(request);
    if (preflight) {
      return preflight;
    }

    const origin = resolveOrigin(request);
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return handleHealth(env, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/fetch-offer') {
      const rejection = await requireAuthAndBudget(request, env, origin);
      if (rejection) return rejection;
      return handleFetchOffer(request, env, origin, url.hostname);
    }

    if (request.method === 'POST' && url.pathname === '/api/tailor') {
      const rejection = await requireAuthAndBudget(request, env, origin);
      if (rejection) return rejection;
      return handleTailor(request, env, ctx, origin);
    }

    return jsonError(404, { code: 'bad_request', message: 'Not found.', retryable: false }, origin);
  },
};
