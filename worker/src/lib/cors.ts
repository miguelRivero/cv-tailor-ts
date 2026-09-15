/**
 * CORS handling for the two allowed frontends: the deployed GitHub
 * Pages site and the local Vite dev server.
 *
 * An origin is scheme + host only - never a path, never a trailing
 * slash - so "https://miguelrivero.github.io" is correct and
 * "https://miguelrivero.github.io/cv-tailor-ts" is not, even though the
 * site itself lives under that path. Getting this wrong is the most
 * common cause of "CORS works in curl but not the browser".
 */
const ALLOWED_ORIGINS = new Set([
  'https://miguelrivero.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Returns the request's Origin header if (and only if) it's allowed. */
export function resolveOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

/**
 * Applies CORS headers to an in-progress response. Called on every
 * response this worker sends - success, error, and the NDJSON stream
 * alike - because a missing header on an error response makes the
 * browser report a generic CORS failure instead of surfacing the
 * actual error to the user.
 */
export function applyCors(headers: Headers, origin: string | null): void {
  // Cloudflare's cache must not serve a response with one origin's
  // ACAO header to a request from a different origin.
  headers.set('Vary', 'Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
}

/**
 * Handles an OPTIONS preflight request. Returns null for anything else,
 * so callers can just do `return handlePreflight(request) ?? ...`.
 */
export function handlePreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = resolveOrigin(request);
  if (!origin) {
    return new Response(null, { status: 403 });
  }

  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    // X-CV-Tailor-Key must be listed here, or the browser refuses to
    // send it: a custom header is exactly what makes this a
    // non-simple request that needs a preflight in the first place.
    'Access-Control-Allow-Headers': 'Content-Type, X-CV-Tailor-Key',
    // Capped at 7200s by Chrome regardless of this value, but still
    // saves a round trip per step within that window.
    'Access-Control-Max-Age': '86400',
  });
  applyCors(headers, origin);

  return new Response(null, { status: 204, headers });
}
