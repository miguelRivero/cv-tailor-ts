/**
 * Job title extraction module.
 * Prompt text and model settings live in src/core/prompts/extractTitle.ts.
 */

import OpenAI from 'openai';
import {
  TITLE_SYSTEM_PROMPT,
  TITLE_MODEL,
  TITLE_TEMPERATURE,
  TITLE_MAX_TOKENS,
  buildTitleUserMessage,
  normalizeJobTitle,
} from '../../core/prompts/extractTitle.js';

/**
 * Extract and normalize job title from offer text
 */
export async function extractJobTitle(offerText: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await client.chat.completions.create({
      model: TITLE_MODEL,
      temperature: TITLE_TEMPERATURE,
      max_tokens: TITLE_MAX_TOKENS,
      messages: [
        { role: 'system', content: TITLE_SYSTEM_PROMPT },
        { role: 'user', content: buildTitleUserMessage(offerText) },
      ],
    });

    const title = completion.choices[0].message.content?.trim() || 'developer';

    return normalizeJobTitle(title);
  } catch (error) {
    throw new Error(`Failed to extract job title: ${error}`);
  }
}
