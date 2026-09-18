/**
 * Split a newline-delimited JSON stream into ServerEvent objects.
 *
 * /api/tailor writes one JSON object per line (Content-Type:
 * application/x-ndjson). The browser cannot use EventSource for this:
 * that API is GET-only and cannot send a body or the X-CV-Tailor-Key
 * header. The client reads fetch() + getReader() and feeds chunks here.
 *
 * A chunk may end mid-line (TCP/HTTP framing is not message-oriented),
 * so the caller must keep `rest` and prepend it to the next chunk.
 */

import type { ServerEvent } from '../types/api.js';

export function consumeNdjson(buffer: string): { events: ServerEvent[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const events: ServerEvent[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(':')) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'type' in parsed &&
        typeof parsed.type === 'string'
      ) {
        events.push(parsed as ServerEvent);
      }
    } catch {
      // A garbled line is skipped rather than killing the whole run.
      // The reducer's `done` with no `result` still fails the pipeline.
    }
  }

  return { events, rest };
}
