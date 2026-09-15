/**
 * Keyword extraction module using LLM.
 * Prompt text lives in src/core/prompts/extractKeywords.ts.
 */

import OpenAI from 'openai';
import { loadConfig } from '../config/loadConfig.js';
import { Keywords } from '../../core/types/keywords.js';
import {
  KEYWORDS_SYSTEM_PROMPT,
  buildKeywordsUserMessage,
} from '../../core/prompts/extractKeywords.js';

export type { Keywords };

/**
 * Extract relevant keywords from job offer using LLM
 */
export async function extractKeywords(offerText: string): Promise<Keywords> {
  const config = loadConfig();
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: KEYWORDS_SYSTEM_PROMPT },
        { role: 'user', content: buildKeywordsUserMessage(offerText) },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '{}';
    const keywords = JSON.parse(responseText) as Keywords;
    return keywords;
  } catch (error) {
    throw new Error('Failed to extract keywords', { cause: error });
  }
}
