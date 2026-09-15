import { Env } from '../lib/env.js';
import { validateOfferUrl } from '../lib/urlGuard.js';
import { extractVisibleText } from '../lib/htmlText.js';
import { jsonError, jsonOk } from '../lib/errors.js';
import {
  FetchOfferRequest,
  FetchOfferResponse,
  OfferUnreadableReason,
} from '../../../src/core/types/api.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB - a job posting is never this large
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function offerUnreadable(
  reason: OfferUnreadableReason,
  httpStatus: number | undefined,
  origin: string | null
): Response {
  const body: FetchOfferResponse = {
    ok: false,
    code: 'OFFER_UNREADABLE',
    reason,
    httpStatus,
    message: messageFor(reason),
  };
  // 422: fetched (or attempted) fine, but the result isn't usable. This
  // is the *expected* failure path - the UI reveals a paste textarea in
  // response to it, so it's a 2xx-adjacent outcome, not a server error.
  return jsonOk(body, origin, 422);
}

function messageFor(reason: OfferUnreadableReason): string {
  switch (reason) {
    case 'login_wall':
      return 'This site requires signing in to view the listing. Paste the job description instead.';
    case 'bot_check':
      return 'This site blocks automated readers. Paste the job description instead.';
    case 'empty':
      return 'No readable text was found on that page. Paste the job description instead.';
    case 'too_large':
      return 'That page is too large to read automatically. Paste the job description instead.';
    case 'timeout':
      return 'That page took too long to respond. Try again, or paste the job description instead.';
    case 'blocked_host':
      return 'That URL cannot be fetched. Paste the job description instead.';
    case 'bad_scheme':
      return 'That does not look like a valid web address.';
    case 'http_error':
      return 'That page could not be read. Paste the job description instead.';
  }
}

export async function handleFetchOffer(
  request: Request,
  env: Env,
  origin: string | null,
  workerHostname: string
): Promise<Response> {
  let body: FetchOfferRequest;
  try {
    body = (await request.json()) as FetchOfferRequest;
  } catch {
    return jsonError(
      400,
      { code: 'bad_request', message: 'Request body must be JSON.', retryable: false },
      origin
    );
  }

  if (!body.url || typeof body.url !== 'string') {
    return jsonError(
      400,
      { code: 'bad_request', message: 'url is required.', retryable: false },
      origin
    );
  }

  let currentUrl = body.url;
  let response: Response;
  let redirects = 0;

  for (;;) {
    const guard = validateOfferUrl(currentUrl, workerHostname);
    if (!guard.ok) {
      return offerUnreadable(guard.reason, undefined, origin);
    }

    try {
      response = await fetch(guard.url.toString(), {
        redirect: 'manual',
        signal: timeoutSignal(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      return offerUnreadable('timeout', undefined, origin);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (!location || redirects >= MAX_REDIRECTS) {
        return offerUnreadable('http_error', response.status, origin);
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirects++;
      continue;
    }

    break;
  }

  // LinkedIn documents returning 999 to requests it judges automated;
  // this is a best-effort heuristic, not a guarantee - most sites that
  // block bots just 403 instead, which "login_wall" also covers.
  if (response.status === 999) {
    return offerUnreadable('bot_check', response.status, origin);
  }
  if (response.status === 401 || response.status === 403) {
    return offerUnreadable('login_wall', response.status, origin);
  }
  if (!response.ok) {
    return offerUnreadable('http_error', response.status, origin);
  }

  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (contentLength > MAX_RESPONSE_BYTES) {
    return offerUnreadable('too_large', response.status, origin);
  }

  const maxChars = Number(env.MAX_OFFER_CHARS || '24000');
  const { text, truncated } = await extractVisibleText(response, maxChars);

  if (text.length === 0) {
    return offerUnreadable('empty', response.status, origin);
  }

  const finalUrl = response.url || currentUrl;
  const success: FetchOfferResponse = {
    ok: true,
    text,
    finalUrl,
    sourceHost: new URL(finalUrl).hostname,
    charCount: text.length,
    truncated,
  };

  return jsonOk(success, origin);
}
