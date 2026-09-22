/**
 * CV adaptation module using LLM.
 * Prompt text lives in src/core/prompts/adaptCv.ts.
 */

import OpenAI from 'openai';
import { loadConfig } from '../config/loadConfig.js';
import { Keywords } from '../../core/types/keywords.js';
import {
  FrameworkMode,
  buildAdaptSystemPrompt,
  buildAdaptUserMessage,
} from '../../core/prompts/adaptCv.js';

export type { FrameworkMode };

export interface AdaptationResult {
  html: string;
  summary: string;
}

/**
 * Adapt HTML CV based on extracted keywords
 */
export async function adaptHTML(
  baseHtml: string,
  keywords: Keywords,
  jobTitle: string = '',
  framework: FrameworkMode = 'agnostic'
): Promise<AdaptationResult> {
  const config = loadConfig();
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = buildAdaptSystemPrompt(framework);
  const userMessage = buildAdaptUserMessage(baseHtml, keywords, jobTitle, framework);

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
        { role: 'system', content: 'Remember to return ONLY valid JSON.' },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '{}';
    const responseData = JSON.parse(responseText);

    return {
      html: responseData.html || '',
      summary: responseData.summary || 'No summary available',
    };
  } catch (error) {
    throw new Error('Failed to adapt CV', { cause: error });
  }
}
