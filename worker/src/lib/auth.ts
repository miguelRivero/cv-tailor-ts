/**
 * Shared-passphrase authentication. This is the actual gate that stops
 * a random visitor who finds the worker URL from spending the owner's
 * OpenAI credits - the CORS origin allowlist (cors.ts) only stops
 * casual browser-based requests, since Origin is trivially spoofed by
 * anything that isn't a browser.
 */

/**
 * Constant-time string comparison, so a wrong passphrase doesn't leak
 * how many leading characters were correct via response timing. A
 * length mismatch still short-circuits, but a length mismatch alone
 * carries no information about the passphrase's content.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function checkAuth(request: Request, env: { CLIENT_TOKEN: string }): boolean {
  const provided = request.headers.get('X-CV-Tailor-Key');
  if (!provided || !env.CLIENT_TOKEN) {
    return false;
  }
  return timingSafeEqual(provided, env.CLIENT_TOKEN);
}
