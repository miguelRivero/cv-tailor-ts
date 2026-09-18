/**
 * Talks to OpenAI's Chat Completions API directly over fetch, rather
 * than through the openai SDK. The SDK targets Node (it pulls in
 * Node-specific stream and form-data shims) for no benefit here: the
 * worker only ever makes three well-typed requests, and hand-rolling
 * them keeps the bundle free of anything that needs nodejs_compat.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  temperature: number;
  maxTokens?: number;
  messages: ChatMessage[];
  jsonObject?: boolean;
}

export class OpenAiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = 'OpenAiError';
  }
}

async function describeErrorResponse(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

function toOpenAiError(response: Response, message: string): OpenAiError {
  const retryable = response.status === 429 || response.status >= 500;
  return new OpenAiError(message, response.status, retryable);
}

function requestBody(options: ChatCompletionOptions, stream: boolean): string {
  return JSON.stringify({
    model: options.model,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    messages: options.messages,
    stream,
    ...(options.jsonObject ? { response_format: { type: 'json_object' } } : {}),
  });
}

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

/** A single non-streaming chat completion. Used for title and keyword
 *  extraction, which are short enough that streaming buys nothing. */
export async function chatCompletion(
  apiKey: string,
  options: ChatCompletionOptions
): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: requestBody(options, false),
  });

  if (!response.ok) {
    throw toOpenAiError(response, await describeErrorResponse(response));
  }

  const data = (await response.json()) as { choices: { message: { content: string | null } }[] };
  return data.choices[0]?.message?.content ?? '';
}

/**
 * A streaming chat completion. Used only for the ~30-90s adapt call, so
 * onDelta(totalCharsSoFar) can be forwarded to the browser as progress
 * and - just as importantly - so bytes keep moving on the wire, which
 * is what actually prevents Cloudflare's edge from timing out an
 * otherwise-silent connection.
 *
 * OpenAI's own stream is itself `data: {...}` / `data: [DONE]` framing;
 * this parses that inner protocol. It has nothing to do with the
 * worker's own NDJSON protocol to the browser (src/core/types/api.ts) -
 * two unrelated wire formats that happen to both be described as
 * "streaming".
 */
export async function chatCompletionStream(
  apiKey: string,
  options: ChatCompletionOptions,
  onDelta: (totalChars: number) => void
): Promise<string> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: requestBody(options, true),
  });

  if (!response.ok || !response.body) {
    throw toOpenAiError(response, await describeErrorResponse(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let lastReportedAt = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // last element may be a partial line

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;

      const payload = line.slice('data:'.length).trim();
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          // Reporting every delta would mean one NDJSON line to the
          // browser per token; batch instead.
          if (content.length - lastReportedAt >= 200) {
            lastReportedAt = content.length;
            onDelta(content.length);
          }
        }
      } catch {
        // A malformed SSE line from OpenAI shouldn't abort an otherwise
        // fine stream - skip it and keep reading.
      }
    }
  }

  onDelta(content.length);
  return content;
}
