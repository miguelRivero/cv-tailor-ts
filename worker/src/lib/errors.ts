import { ApiErrorCode, ServerStepId } from '../../../src/core/types/api.js';
import { applyCors } from './cors.js';

export interface ErrorBody {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  step?: ServerStepId;
}

/** A JSON error response, with CORS applied - used for every failure
 *  that happens before the /api/tailor stream itself has started. */
export function jsonError(status: number, error: ErrorBody, origin: string | null): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  applyCors(headers, origin);
  return new Response(JSON.stringify({ error }), { status, headers });
}

/** A successful JSON response, with CORS applied. */
export function jsonOk<T>(body: T, origin: string | null, status = 200): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  applyCors(headers, origin);
  return new Response(JSON.stringify(body), { status, headers });
}
