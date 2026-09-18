/**
 * Live client for the Cloudflare Worker. Same two function signatures
 * as web/src/lib/api/mock.ts (fetchOffer, tailorStream) so usePipeline
 * can swap imports without changing its control flow.
 *
 * /api/tailor is NDJSON over fetch() + getReader(), not EventSource:
 * EventSource is GET-only and cannot send a body or X-CV-Tailor-Key.
 */

import { consumeNdjson } from '@core/api/ndjson';
import type { ApiError, FetchOfferResponse, ServerEvent, TailorRequest } from '@core/types/api';
import { clientToken, workerBaseUrl } from '@/lib/env';

export type TailorEventHandler = (event: ServerEvent) => void;

export class WorkerHttpError extends Error {
  readonly name = 'WorkerHttpError';
  readonly status: number;
  readonly apiError: ApiError;

  constructor(message: string, status: number, apiError: ApiError) {
    super(message);
    this.status = status;
    this.apiError = apiError;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function readApiError(data: unknown, fallback: string): ApiError {
  if (data && typeof data === 'object' && 'error' in data) {
    const error = (data as { error: Partial<ApiError> }).error;
    if (error && typeof error.message === 'string') {
      return {
        code: error.code ?? 'internal',
        message: error.message,
        retryable: Boolean(error.retryable),
        step: error.step,
      };
    }
  }
  return { code: 'internal', message: fallback, retryable: true };
}

function isFetchOfferResponse(data: unknown): data is FetchOfferResponse {
  return Boolean(data && typeof data === 'object' && 'ok' in data);
}

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`${workerBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CV-Tailor-Key': clientToken,
    },
    body: JSON.stringify(body),
    signal,
  });
}

export async function fetchOffer(url: string, signal?: AbortSignal): Promise<FetchOfferResponse> {
  const response = await postJson('/api/fetch-offer', { url }, signal);
  const data: unknown = await response.json();
  if (isFetchOfferResponse(data) && (response.ok || response.status === 422)) {
    return data;
  }
  throw new WorkerHttpError(
    `Offer fetch failed (${response.status}).`,
    response.status,
    readApiError(data, `Offer fetch failed (${response.status}).`)
  );
}

async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: TailorEventHandler,
  signal?: AbortSignal
): Promise<{ sawDone: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  const onAbort = () => {
    void reader.cancel();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  const dispatch = (event: ServerEvent) => {
    if (event.type === 'heartbeat') {
      return;
    }
    if (event.type === 'done') {
      sawDone = true;
    }
    onEvent(event);
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim().length > 0) {
          const flushed = consumeNdjson(`${buffer}\n`);
          flushed.events.forEach(dispatch);
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const consumed = consumeNdjson(buffer);
      buffer = consumed.rest;
      consumed.events.forEach(dispatch);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }

  return { sawDone };
}

export async function tailorStream(
  request: TailorRequest,
  onEvent: TailorEventHandler,
  signal?: AbortSignal
): Promise<void> {
  const response = await postJson('/api/tailor', request, signal);

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = undefined;
    }
    onEvent({
      type: 'error',
      error: readApiError(data, `Tailor request failed (${response.status}).`),
    });
    onEvent({ type: 'done' });
    return;
  }

  if (!response.body) {
    onEvent({
      type: 'error',
      error: { code: 'internal', message: 'The server returned an empty body.', retryable: true },
    });
    onEvent({ type: 'done' });
    return;
  }

  try {
    const { sawDone } = await readNdjsonStream(response.body, onEvent, signal);
    if (!sawDone) {
      onEvent({ type: 'done' });
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      throw isAbortError(error) ? error : new DOMException('Aborted', 'AbortError');
    }
    onEvent({
      type: 'error',
      error: {
        code: 'internal',
        message: 'The connection dropped before a result arrived.',
        retryable: true,
      },
    });
    onEvent({ type: 'done' });
  }
}
