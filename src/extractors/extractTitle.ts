/**
 * Job title extraction module
 * Migrated from extract_title.py
 */

import OpenAI from 'openai';
import slugify from 'slugify';

/**
 * Extract and normalize job title from offer text
 */
export async function extractJobTitle(offerText: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = `You are an expert at extracting job titles from job postings.
Extract ONLY the job title from the job offer text.
Return ONLY the job title as plain text, nothing else.
Examples:
- "Senior Frontend Developer"
- "React Engineer"
- "Full Stack Developer"`;

  const userMessage = `Extract the job title from this job offer:\n\n${offerText}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use faster model for simple extraction
      temperature: 0.3,
      max_tokens: 50,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const title = completion.choices[0].message.content?.trim() || 'developer';

    // Normalize using slugify
    const normalized = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    return normalized;
  } catch (error) {
    throw new Error(`Failed to extract job title: ${error}`);
  }
}
