import { Env } from '../lib/env.js';
import { applyCors } from '../lib/cors.js';
import { jsonError } from '../lib/errors.js';
import { chatCompletion, chatCompletionStream, OpenAiError } from '../lib/openai.js';
import {
  TITLE_SYSTEM_PROMPT,
  TITLE_MODEL,
  TITLE_TEMPERATURE,
  TITLE_MAX_TOKENS,
  buildTitleUserMessage,
  normalizeJobTitle,
} from '../../../src/core/prompts/extractTitle.js';
import {
  KEYWORDS_SYSTEM_PROMPT,
  buildKeywordsUserMessage,
} from '../../../src/core/prompts/extractKeywords.js';
import {
  buildAdaptSystemPrompt,
  buildAdaptUserMessage,
  FrameworkMode,
} from '../../../src/core/prompts/adaptCv.js';
import { Keywords } from '../../../src/core/types/keywords.js';
import { DEFAULT_CORE_CONFIG } from '../../../src/core/config/defaults.js';
import { ApiError, ServerEvent, TailorRequest, TailorResult } from '../../../src/core/types/api.js';

const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini']);
const HEARTBEAT_INTERVAL_MS = 15_000;
const FRAMEWORK_MODES = new Set<FrameworkMode>(['react', 'vue', 'agnostic']);

function isFrameworkMode(value: unknown): value is FrameworkMode {
  return typeof value === 'string' && FRAMEWORK_MODES.has(value as FrameworkMode);
}

function toApiError(error: unknown): Omit<ApiError, 'step'> {
  if (error instanceof OpenAiError) {
    if (error.status === 401 || error.status === 403) {
      // A bad or missing key is a deployment mistake, not something the
      // caller can retry their way out of - and never worth naming the
      // key in the message that reaches the browser.
      return {
        code: 'internal',
        message: 'The server is not configured correctly.',
        retryable: false,
      };
    }
    if (error.status === 429) {
      return {
        code: 'rate_limited',
        message: 'OpenAI is rate limiting the key. Try again in a minute.',
        retryable: true,
      };
    }
    if (error.status >= 500) {
      return {
        code: 'upstream_error',
        message: 'OpenAI is currently unavailable. Please try again.',
        retryable: true,
      };
    }
    return { code: 'upstream_error', message: error.message, retryable: false };
  }
  if (error instanceof SyntaxError) {
    return {
      code: 'upstream_error',
      message: 'The model returned a response that could not be understood.',
      retryable: true,
    };
  }
  return {
    code: 'internal',
    message: 'Something went wrong while tailoring the CV.',
    retryable: true,
  };
}

function validateRequest(
  body: unknown,
  maxOfferChars: number
): { error: string } | { request: TailorRequest } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be a JSON object.' };
  }
  const candidate = body as Partial<TailorRequest>;

  if (!candidate.offerText || typeof candidate.offerText !== 'string') {
    return { error: 'offerText is required.' };
  }
  if (candidate.offerText.length > maxOfferChars) {
    return { error: `offerText exceeds ${maxOfferChars} characters.` };
  }
  if (!candidate.baseHtml || typeof candidate.baseHtml !== 'string') {
    return { error: 'baseHtml is required.' };
  }

  const framework: FrameworkMode = isFrameworkMode(candidate.framework)
    ? candidate.framework
    : 'agnostic';

  return {
    request: {
      offerText: candidate.offerText,
      baseHtml: candidate.baseHtml,
      framework,
      model: candidate.model,
      temperature: candidate.temperature,
    },
  };
}

export async function handleTailor(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  origin: string | null
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(
      400,
      { code: 'bad_request', message: 'Request body must be JSON.', retryable: false },
      origin
    );
  }

  const maxOfferChars = Number(env.MAX_OFFER_CHARS || '24000');
  const validated = validateRequest(rawBody, maxOfferChars);
  if ('error' in validated) {
    return jsonError(
      400,
      { code: 'bad_request', message: validated.error, retryable: false },
      origin
    );
  }
  const tailorRequest = validated.request;

  if (tailorRequest.model && !ALLOWED_MODELS.has(tailorRequest.model)) {
    return jsonError(
      400,
      {
        code: 'model_not_allowed',
        message: `Model "${tailorRequest.model}" is not allowed.`,
        retryable: false,
      },
      origin
    );
  }
  const model =
    tailorRequest.model && ALLOWED_MODELS.has(tailorRequest.model)
      ? tailorRequest.model
      : DEFAULT_CORE_CONFIG.model;
  const temperature =
    typeof tailorRequest.temperature === 'number'
      ? Math.min(Math.max(tailorRequest.temperature, 0), 1)
      : DEFAULT_CORE_CONFIG.temperature;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = (event: ServerEvent): Promise<void> =>
    writer.write(encoder.encode(JSON.stringify(event) + '\n')).catch(() => {
      // The client disconnected mid-stream; nothing more to do here.
    });

  const headers = new Headers({
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  applyCors(headers, origin);

  // The pipeline below runs after this function returns the Response,
  // so it's wrapped in ctx.waitUntil(): without that, the Workers
  // runtime is free to tear down this request's execution context as
  // soon as the (already-returned) Response is considered complete,
  // which for a streaming body can happen well before all of its bytes
  // have actually been written.
  ctx.waitUntil(runPipeline());

  return new Response(readable, { status: 200, headers });

  async function runPipeline(): Promise<void> {
    const heartbeat = setInterval(() => {
      void send({ type: 'heartbeat' });
    }, HEARTBEAT_INTERVAL_MS);

    try {
      await send({ type: 'status', step: 'extract-title', state: 'start' });
      const rawTitle = await chatCompletion(env.OPENAI_API_KEY, {
        model: TITLE_MODEL,
        temperature: TITLE_TEMPERATURE,
        maxTokens: TITLE_MAX_TOKENS,
        messages: [
          { role: 'system', content: TITLE_SYSTEM_PROMPT },
          { role: 'user', content: buildTitleUserMessage(tailorRequest.offerText) },
        ],
      });
      const jobTitle = normalizeJobTitle(rawTitle || 'developer');
      await send({ type: 'status', step: 'extract-title', state: 'done', jobTitle });

      await send({ type: 'status', step: 'extract-keywords', state: 'start' });
      const keywordsRaw = await chatCompletion(env.OPENAI_API_KEY, {
        model,
        temperature,
        messages: [
          { role: 'system', content: KEYWORDS_SYSTEM_PROMPT },
          { role: 'user', content: buildKeywordsUserMessage(tailorRequest.offerText) },
        ],
        jsonObject: true,
      });
      const keywords = JSON.parse(keywordsRaw || '{}') as Keywords;
      await send({ type: 'status', step: 'extract-keywords', state: 'done', keywords });

      await send({ type: 'status', step: 'adapt', state: 'start' });
      const adaptRaw = await chatCompletionStream(
        env.OPENAI_API_KEY,
        {
          model,
          temperature,
          maxTokens: DEFAULT_CORE_CONFIG.maxTokens,
          messages: [
            { role: 'system', content: buildAdaptSystemPrompt(tailorRequest.framework) },
            {
              role: 'user',
              content: buildAdaptUserMessage(tailorRequest.baseHtml, keywords, jobTitle),
            },
            { role: 'system', content: 'Remember to return ONLY valid JSON.' },
          ],
          jsonObject: true,
        },
        (chars) => {
          void send({ type: 'status', step: 'adapt', state: 'delta', chars });
        }
      );
      await send({ type: 'status', step: 'adapt', state: 'done' });

      const parsed = JSON.parse(adaptRaw || '{}') as { html?: string; summary?: string };
      const result: TailorResult = {
        jobTitle,
        keywords,
        html: parsed.html || '',
        summary: parsed.summary || 'No summary available',
      };

      await send({ type: 'result', result });
    } catch (error) {
      const apiError: ApiError = toApiError(error);
      await send({ type: 'error', error: apiError });
    } finally {
      clearInterval(heartbeat);
      await send({ type: 'done' });
      await writer.close().catch(() => {});
    }
  }
}
