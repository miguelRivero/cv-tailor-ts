import { Env } from '../lib/env.js';
import { jsonOk } from '../lib/errors.js';

/**
 * Unauthenticated, unrate-limited: lets a deploy be smoke-tested with a
 * plain curl or browser request. Never reflects the key itself, only
 * whether one is configured.
 */
export function handleHealth(env: Env, origin: string | null): Response {
  return jsonOk({ ok: true, hasKey: Boolean(env.OPENAI_API_KEY) }, origin);
}
