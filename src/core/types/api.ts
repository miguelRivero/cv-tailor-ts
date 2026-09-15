/**
 * Wire types shared between the web app and the Cloudflare Worker.
 *
 * Defining these once here - rather than once in web/ and once in
 * worker/ - is what keeps the two sides of the HTTP boundary from
 * drifting apart independently. The worker imports this file directly;
 * the web app's API client (web/src/lib/api/client.ts) translates raw
 * HTTP/SSE traffic into these shapes before anything else sees them.
 */

import { FrameworkMode } from '../config/types.js';
import { Keywords } from './keywords.js';

export type { FrameworkMode };

// ---------------------------------------------------------------------------
// POST /api/fetch-offer - a plain JSON request/response, separate from the
// tailor call because it is the one step that fails by design (job boards
// blocking automated readers) and needs its own recovery path in the UI.
// ---------------------------------------------------------------------------

export interface FetchOfferRequest {
  url: string;
}

export interface FetchOfferSuccess {
  ok: true;
  text: string;
  finalUrl: string;
  sourceHost: string;
  charCount: number;
  truncated: boolean;
}

/**
 * Why the fetch could not produce usable offer text. Distinct from a
 * generic error: this is the *expected* failure mode, and its reason is
 * specific enough to explain to the user without exposing internals.
 */
export type OfferUnreadableReason =
  | 'login_wall'
  | 'bot_check'
  | 'empty'
  | 'too_large'
  | 'timeout'
  | 'blocked_host'
  | 'bad_scheme'
  | 'http_error';

export interface FetchOfferFailure {
  ok: false;
  code: 'OFFER_UNREADABLE';
  reason: OfferUnreadableReason;
  httpStatus?: number;
  message: string;
}

export type FetchOfferResponse = FetchOfferSuccess | FetchOfferFailure;

// ---------------------------------------------------------------------------
// POST /api/tailor - Server-Sent Events. Runs title extraction, keyword
// extraction and adaptation server-side in one request, since the OpenAI
// key never reaches the browser.
// ---------------------------------------------------------------------------

export interface TailorRequest {
  offerText: string;
  baseHtml: string;
  framework: FrameworkMode;
  /** Advisory only - the worker allowlists models and clamps this. */
  model?: string;
  temperature?: number;
}

export interface TailorUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface TailorResult {
  /** The slugified job title, e.g. "senior-frontend-developer". */
  jobTitle: string;
  keywords: Keywords;
  /** Raw adapted HTML, before applyPostProcessing has run on it. */
  html: string;
  summary: string;
  usage?: TailorUsage;
}

/** The five steps shown in the UI's progress list. */
export type PipelineStepId =
  'fetch-offer' | 'extract-title' | 'extract-keywords' | 'adapt' | 'post-process';

/** The subset of steps the worker itself reports progress on over SSE -
 *  fetch-offer is a separate REST call, and post-process runs entirely
 *  in the browser after the worker's response arrives. */
export type ServerStepId = 'extract-title' | 'extract-keywords' | 'adapt';

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'model_not_allowed'
  | 'rate_limited'
  | 'timeout'
  | 'upstream_error'
  | 'internal';

export interface ApiError {
  code: ApiErrorCode;
  step?: ServerStepId;
  message: string;
  retryable: boolean;
}

/**
 * One line of the newline-delimited JSON (NDJSON) stream from
 * /api/tailor: one JSON object per line, `Content-Type:
 * application/x-ndjson`. Plain NDJSON rather than textbook
 * `event:`/`data:` SSE framing, since the payload is already a
 * discriminated union - wrapping it in a second layer of framing would
 * only add a parser to write on both ends for no benefit. It still
 * can't use the browser's EventSource API regardless of framing, since
 * that API is GET-only and can't send a body or an auth header; the
 * client reads this with fetch() and response.body.getReader() either
 * way (see web/src/lib/api/client.ts once it exists).
 *
 * Once the first byte of the stream is flushed the HTTP status code is
 * fixed at 200, so a failure past that point has to travel as an
 * `error` event rather than a status code - and must always be followed
 * by `done`, so a client that never sees `result` can tell the run
 * failed rather than hanging forever. `heartbeat` lines keep the
 * connection alive through Cloudflare's edge and any intermediate
 * proxy buffering during the ~30-90s adapt call; the client ignores
 * them.
 */
export type ServerEvent =
  | { type: 'status'; step: ServerStepId; state: 'start' }
  | { type: 'status'; step: 'extract-title'; state: 'done'; jobTitle: string }
  | { type: 'status'; step: 'extract-keywords'; state: 'done'; keywords: Keywords }
  | { type: 'status'; step: 'adapt'; state: 'delta'; chars: number }
  | { type: 'status'; step: 'adapt'; state: 'done' }
  | { type: 'result'; result: TailorResult }
  | { type: 'error'; error: ApiError }
  | { type: 'heartbeat' }
  | { type: 'done' };
