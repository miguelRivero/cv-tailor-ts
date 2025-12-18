/**
 * CV adaptation module using LLM
 * Migrated from adapt_cv.py
 * CRITICAL: Preserves all original prompts and rules exactly
 */

import OpenAI from 'openai';
import { loadConfig } from '../utils/config.js';
import { Keywords } from '../extractors/extractKeywords.js';

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
  jobTitle: string = ''
): Promise<AdaptationResult> {
  const config = loadConfig();
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Check if React is required
  const isReactRequired = checkIfReactRequired(keywords);

  const reactInstruction = isReactRequired
    ? `5. FRAMEWORK TRANSLATION (React/Vue):
   - React is EXPLICITLY REQUIRED for this position
   - If the candidate only has Vue experience:
     Use this EXACT phrase: "While my primary experience is with Vue 3, the component-driven architecture I apply transfers seamlessly to React."
   - Emphasize transferable concepts: components, hooks/composition, state management, reactive patterns
   - Do NOT claim direct React experience if it doesn't exist
`
    : `5. FRAMEWORK REQUIREMENT:
   - React is NOT required for this position
   - DO NOT mention React, React-compatible concepts, or React translations
   - Focus ONLY on the candidate's actual experience (Vue, TypeScript, etc.)
   - Do NOT try to translate or map Vue skills to React
`;

  const systemPrompt = `You are an expert CV rewriter specialized in tailoring resumes for specific job opportunities.

CRITICAL RULES:

1. LANGUAGE REQUIREMENT:
   - The ENTIRE CV output MUST be in ENGLISH
   - ALL sections, descriptions, and content MUST be written in English
   - Do NOT use Spanish, Catalan, or any other language
   - This is a MANDATORY requirement - any non-English content is an error

2. STRUCTURE PRESERVATION:
   - Do NOT modify HTML structure, tags, classes, IDs, or layout
   - Do NOT change the number of sections
   - Do NOT add or remove <div>, <section>, <ul>, <li> elements
   - Do NOT alter CSS classes or styling
   - ONLY rewrite text content inside existing HTML tags

3. COMPANY NAMES (PRESERVE):
   - Keep original company names from the base CV (e.g. Nespresso).
   - Do NOT anonymize or change references to past employers.

4. KEYWORD INTEGRATION:
   - Naturally incorporate provided keywords into descriptions
   - Prioritize hard_skills and technologies from the keywords
   - Match the language and terminology used in the job offer
   - Ensure keywords appear in relevant sections (skills, experience)

5. NO TARGET COMPANY MENTION:
   - Do NOT mention the name of the company offering the job (the target company) anywhere in the text.
   - Do NOT write phrases like "I am excited to join [Company Name]".
   - The CV is a resume, not a cover letter. It must be professional and company-agnostic regarding the future employer.
${reactInstruction}
6. AUTHENTICITY & TRUTH (CRITICAL):
   - STRICTLY FORBIDDEN to add skills, tools, or experience NOT present in the original CV.
   - SPECIFIC PROHIBITIONS: Do NOT add "Electron", "Backend", "Node.js", "Java", or "Python" unless they are explicitly in the base CV text.
   - EXCEPTION: You MAY add "React" or "React.js" if the candidate has strong Vue.js experience, but frame it as "Adaptable to React due to strong Vue expertise".
   - If the job requires a skill that is NOT in the base CV, DO NOT include it.
   - Only reframe and emphasize experience that ACTUALLY EXISTS in the base CV.
   - It is better to omit a requirement than to lie about having it.

7. NO AI WATERMARKS:
   - Do NOT include any phrases that reveal AI generation
   - Avoid: "generated", "as an AI", "assistant", "model", "this CV has been adapted"
   - Write naturally as if the candidate wrote it themselves

8. OUTPUT FORMAT:
   - Return valid JSON with two fields:
     1. "html": The complete adapted HTML document
     2. "summary": A concise summary of changes made, keywords prioritized, and strategy used.
   - Ensure the HTML is valid and complete.

9. JOB TITLE ALIGNMENT:
   - In the "Professional Summary" section, start by identifying yourself with the EXACT job title from the offer.

10. LENGTH & FORMATTING CONSTRAINTS (CRITICAL):
    - PROFESSIONAL SUMMARY: Optimal length 6-7 lines to fill A4 page (approx 80-100 words).
    - Avoid redundancy: Do not repeat lists of skills in the summary that are already in Core Competencies.
    - Focus on years of experience, primary framework, and key soft/hard skill match.
    - The output must fit ideally on a single A4 page, so be efficient with words.

Rewrite the CV to align with these extracted keywords while following ALL rules above.
`;

  const keywordsJson = JSON.stringify(keywords, null, 2);

  const userMessage = `Adapt this CV for a job opportunity with these requirements:

EXTRACTED KEYWORDS:
${keywordsJson}

${jobTitle ? `JOB TITLE: ${jobTitle}` : ''}

ORIGINAL CV HTML:
${baseHtml}

Remember:
- Keep exact HTML structure
- Keep original company names from base CV (past employers)
- DO NOT mention the target company name
- Integrate keywords naturally
- Handle framework mismatches elegantly
- No AI traces
- Return JSON with "html" and "summary" fields
`;

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
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
    throw new Error(`Failed to adapt CV: ${error}`);
  }
}

/**
 * Check if React is required based on keywords
 */
function checkIfReactRequired(keywords: Keywords): boolean {
  const allKeywords: string[] = [];

  // Collect all keywords from various categories
  for (const value of Object.values(keywords)) {
    if (Array.isArray(value)) {
      allKeywords.push(...value.map((k) => String(k).toLowerCase()));
    }
  }

  // Check if any keyword contains "react"
  return allKeywords.some((k) => k.includes('react'));
}
