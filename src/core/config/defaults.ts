/**
 * The single source of truth for default model settings and the
 * watermark keyword list.
 *
 * The CLI's config.yaml may override these (see src/node/config/loadConfig.ts).
 * The web app and the Cloudflare Worker use them as-is, since there is no
 * config.yaml to read in a browser or at the edge.
 */

import type { CoreConfig } from './types.js';

export const DEFAULT_CORE_CONFIG: CoreConfig = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
  candidateName: 'Miguel Rivero López',
  watermarkKeywords: [
    'AI',
    'artificial intelligence',
    'generated',
    'assistant',
    'LLM',
    'large language model',
    'as an AI',
    'as a model',
    'this CV has been adapted using',
    'automatically generated',
  ],
};
