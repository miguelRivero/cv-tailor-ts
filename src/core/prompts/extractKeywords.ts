/**
 * Prompt content for job offer keyword extraction.
 * Pulled out of src/node/extractors/extractKeywords.ts so the same
 * prompt text can be reused by the Cloudflare Worker without
 * duplicating it.
 */

export const KEYWORDS_SYSTEM_PROMPT = `You are an expert HR analyst. Extract the MOST relevant keywords from this job offer.

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

export function buildKeywordsUserMessage(offerText: string): string {
  return `Extract keywords from this job offer:

--- JOB OFFER TEXT ---
${offerText}
`;
}
