/**
 * Keyword extraction module using LLM
 * Migrated from extract_keywords.py
 */

import OpenAI from 'openai';
import { loadConfig } from '../utils/config.js';

export interface Keywords {
  company_name: string;
  hard_skills: string[];
  soft_skills: string[];
  technologies: string[];
  responsibilities: string[];
  company_culture: string[];
  synonyms: {
    Vue_to_React: string[];
    general: string[];
  };
}

/**
 * Extract relevant keywords from job offer using LLM
 */
export async function extractKeywords(offerText: string): Promise<Keywords> {
  const config = loadConfig();
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `You are an expert HR analyst. Extract the MOST relevant keywords from this job offer.

Return ONLY valid JSON with the following structure:

{
  "company_name": "Name of the company (or 'Unknown' if not found)",
  "hard_skills": [],
  "soft_skills": [],
  "technologies": [],
  "responsibilities": [],
  "company_culture": [],
  "synonyms": {
    "Vue_to_React": [
      "component-based architecture",
      "reactive patterns",
      "SPA design principles",
      "composition patterns transferable to React",
      "hooks-style composition API"
    ],
    "general": []
  }
}

Focus on:
- Extracting the exact company name
- Technical skills explicitly mentioned
- Technologies and frameworks required
- Soft skills emphasized
- Key responsibilities
- Do NOT include the company name in any field OTHER than "company_name"
`;

  const userMessage = `Extract keywords from this job offer:

--- JOB OFFER TEXT ---
${offerText}
`;

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
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
