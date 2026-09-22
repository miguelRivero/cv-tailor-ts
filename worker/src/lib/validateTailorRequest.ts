import type { FrameworkMode } from '../../../src/core/prompts/adaptCv.js';
import type { TailorRequest } from '../../../src/core/types/api.js';

const FRAMEWORK_MODES = new Set<FrameworkMode>(['react', 'vue', 'agnostic']);

function isFrameworkMode(value: unknown): value is FrameworkMode {
  return typeof value === 'string' && FRAMEWORK_MODES.has(value as FrameworkMode);
}

export function validateRequest(
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

  // Missing or null stays career-neutral. Any other non-mode is a client
  // bug: do not quietly drop it onto that path.
  const frameworkField = (body as { framework?: unknown }).framework;
  if (frameworkField != null && !isFrameworkMode(frameworkField)) {
    return { error: 'framework must be one of: react, vue, agnostic.' };
  }
  const framework: FrameworkMode | undefined = isFrameworkMode(frameworkField)
    ? frameworkField
    : undefined;

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
