/**
 * Unit tests for the NDJSON line splitter used by the web client's
 * /api/tailor stream reader, and for resolving the worker base URL.
 */

import { consumeNdjson } from '../../src/core/api/ndjson';
import { isWorkerUrlMissing, resolveWorkerBaseUrl } from '../../src/core/api/workerUrl';
import type { ServerEvent } from '../../src/core/types/api';

function line(event: ServerEvent): string {
  return JSON.stringify(event);
}

describe('consumeNdjson', () => {
  it('parses complete events and leaves a partial last line in rest', () => {
    const start: ServerEvent = { type: 'status', step: 'extract-title', state: 'start' };
    const done: ServerEvent = {
      type: 'status',
      step: 'extract-title',
      state: 'done',
      jobTitle: 'senior-frontend-developer',
    };
    const { events, rest } = consumeNdjson(`${line(start)}\n${line(done)}\n{"type":"stat`);

    expect(events).toEqual([start, done]);
    expect(rest).toBe('{"type":"stat');
  });

  it('resumes from rest when the next chunk completes the line', () => {
    const heartbeat: ServerEvent = { type: 'heartbeat' };
    const first = consumeNdjson('{"type":"heart');
    expect(first.events).toEqual([]);
    const second = consumeNdjson(first.rest + 'beat"}\n');
    expect(second.events).toEqual([heartbeat]);
    expect(second.rest).toBe('');
  });

  it('skips blank lines and malformed JSON rather than throwing', () => {
    const done: ServerEvent = { type: 'done' };
    const { events, rest } = consumeNdjson(`\nnot-json\n${line(done)}\n\n`);
    expect(events).toEqual([done]);
    expect(rest).toBe('');
  });

  it('ignores SSE comment lines if a proxy injects them', () => {
    const done: ServerEvent = { type: 'done' };
    const { events } = consumeNdjson(`: heartbeat\n${line(done)}\n`);
    expect(events).toEqual([done]);
  });
});

describe('resolveWorkerBaseUrl', () => {
  it('is empty in development so the Vite /api proxy is used', () => {
    expect(resolveWorkerBaseUrl(false, 'https://example.workers.dev')).toBe('');
  });

  it('uses VITE_WORKER_URL in production, without a trailing slash', () => {
    expect(resolveWorkerBaseUrl(true, 'https://example.workers.dev/')).toBe(
      'https://example.workers.dev'
    );
  });

  it('treats a production build with no URL as misconfigured', () => {
    expect(isWorkerUrlMissing(true, undefined)).toBe(true);
    expect(isWorkerUrlMissing(true, '  ')).toBe(true);
    expect(isWorkerUrlMissing(false, undefined)).toBe(false);
    expect(isWorkerUrlMissing(true, 'https://example.workers.dev')).toBe(false);
  });
});
