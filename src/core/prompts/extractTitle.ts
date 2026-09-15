/**
 * Prompt content and model settings for job-title extraction.
 * Pulled out of src/node/extractors/extractTitle.ts so the same prompt
 * text can be reused by the Cloudflare Worker without duplicating it.
 */

import slugify from 'slugify';

export const TITLE_SYSTEM_PROMPT = `You are an expert at extracting job titles from job postings.
Extract ONLY the job title from the job offer text.
Return ONLY the job title as plain text, nothing else.
Examples:
- "Senior Frontend Developer"
- "React Engineer"
- "Full Stack Developer"`;

export function buildTitleUserMessage(offerText: string): string {
  return `Extract the job title from this job offer:\n\n${offerText}`;
}

// A faster, cheaper model is deliberately used here instead of the
// configured adaptation model - this is a simple extraction task.
export const TITLE_MODEL = 'gpt-3.5-turbo';
export const TITLE_TEMPERATURE = 0.3;
export const TITLE_MAX_TOKENS = 50;

/**
 * Normalize a raw job title (as returned by the LLM) into the slug used
 * for filenames and the header title rewrite.
 */
export function normalizeJobTitle(rawTitle: string): string {
  return slugify(rawTitle, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}
