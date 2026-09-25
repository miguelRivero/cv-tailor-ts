/**
 * Prompt content for CV adaptation - the main LLM call.
 * Pulled out of src/node/adapters/adaptCv.ts so the same prompt text can
 * be reused by the Cloudflare Worker without duplicating it.
 *
 * CRITICAL: these strings are preserved byte-for-byte from the original
 * module, including the pre-existing duplicate "5." rule numbering
 * below (both "NO TARGET COMPANY MENTION" and the injected "FRAMEWORK
 * EMPHASIS" block are numbered 5). That is a pre-existing quirk, not a
 * bug introduced by this move, and it is left untouched: the wording
 * fed to the model must not shift by a single character as part of a
 * pure refactor.
 */

import type { Keywords } from '../types/keywords.js';
import type { FrameworkMode } from '../config/types.js';

export type { FrameworkMode };

/**
 * Build the framework-emphasis instruction block interpolated into the
 * system prompt. Each mode produces distinct guidance.
 */
export function buildFrameworkInstruction(framework: FrameworkMode): string {
  switch (framework) {
    case 'react':
      return `5. FRAMEWORK EMPHASIS (React ramp-up):
   - The candidate's primary and most extensive experience is with Vue, but they also know React.
   - Convey confidently that their strong component-driven, framework experience lets them ramp up on React quickly in a professional setting.
   - Draw an explicit parallel to how they previously transitioned from AngularJS to their current stack: they have done exactly this kind of framework switch before.
   - Emphasize transferable concepts: components, hooks / composition API, state management, and reactive patterns.
   - Do NOT fabricate deep or long-standing React experience; frame it as easy, low-risk ramp-up backed by real component-driven expertise.
`;
    case 'vue':
      return `5. FRAMEWORK EMPHASIS (Vue focus):
   - Emphasize and stress the candidate's Vue experience specifically as a core strength.
   - Do NOT translate, map, or compare their skills to React.
   - Do NOT mention React at all unless the term already appears in the base CV text.
   - Keep the framing centered on their actual Vue expertise.
`;
    case 'agnostic':
    default:
      return `5. FRAMEWORK EMPHASIS (framework-agnostic):
   - Be framework-skeptic and neutral: stress extensive experience with frontend frameworks in general.
   - Do NOT tie the candidate's identity to any single framework.
   - Avoid over-emphasizing React, Vue, or any one framework over the others.
   - Highlight transferable, framework-independent engineering skills (architecture, state management, reactive UI patterns).
`;
  }
}

export function buildAdaptSystemPrompt(framework?: FrameworkMode): string {
  const reactInstruction = framework ? buildFrameworkInstruction(framework) : '';
  const specificProhibitions = framework
    ? `   - SPECIFIC PROHIBITIONS: Do NOT add "Electron", "Backend", "Node.js", "Java", or "Python" unless they are explicitly in the base CV text.\n`
    : '';
  const reactException =
    framework && framework !== 'vue'
      ? `   - EXCEPTION: You MAY add "React" or "React.js" if the candidate has strong Vue.js experience, but frame it as "Adaptable to React due to strong Vue expertise".\n`
      : '';
  const lengthFocus = framework
    ? 'years of experience, primary framework, and key soft/hard skill match'
    : 'years of experience and key skill match with the offer';
  const companyExample = framework ? ' (e.g. Nespresso)' : '';

  return `You are an expert CV rewriter specialized in tailoring resumes for specific job opportunities.

CRITICAL RULES:

1. LANGUAGE REQUIREMENT:
   - The ENTIRE CV output MUST be in ENGLISH
   - ALL sections, descriptions, and content MUST be written in English
   - Do NOT use Spanish, Catalan, or any other language
   - This is a MANDATORY requirement - any non-English content is an error

2. STRUCTURE PRESERVATION:
   - The base CV uses a <div class="content"> paragraph layout styled by shared.css
   - Required patterns: <section class="title"> for section headings, <p class="competency-item"> for skills, <p class="experience-header"> for company/date lines, and bullet paragraphs starting with "•"
   - Do NOT modify HTML structure, tags, classes, IDs, or layout
   - Do NOT change the number of sections
   - Do NOT add or remove <div>, <section>, <p> elements
   - Do NOT introduce deprecated layouts such as cv-container, experience-item, or skills-grid
   - Do NOT alter CSS classes or styling
   - ONLY rewrite text content inside existing HTML tags

2a. SECTION HEADING TAGS (MANDATORY):
   - Every section heading (PROFESSIONAL SUMMARY, CORE COMPETENCIES, PROFESSIONAL EXPERIENCE, LANGUAGES, etc.) MUST be wrapped in <section class="title">HEADING TEXT</section>.
   - This is the ONLY correct tag for section headings. Never use <p>, <h1>, <h2>, <strong>, <b>, or any other tag for a section heading.
   - If the base CV uses a <p> tag for a section heading, CORRECT it to <section class="title"> in your output.
   - The bold styling of section headings comes from shared.css via the .title class. Do NOT add inline styles or <strong>/<b> tags inside a <section class="title">.

2b. HEADER BLOCK (MANDATORY — first 3 children of .content):
   - The first 3 direct children of <div class="content"> MUST always be these exact <p> elements in this order:
     1. <p>Full Name</p>  — styled by shared.css as the large name heading (2.8em)
     2. <p>Job Title</p>  — styled as the subtitle (1.8em); use the EXACT job title from the offer
     3. <p>email • phone • location</p>  — contact line; keep whatever contact details are present in the base CV
   - If the base CV is from a PDF upload the header may be collapsed (e.g. name and contact on one line, or name missing entirely). In that case RECONSTRUCT the 3 lines from any name, email, phone, or location data visible in the base CV text.
   - NEVER merge name + contact into a single <p>. NEVER skip the job-title <p>.
   - After these 3 lines, the first <section class="title"> begins.

3. COMPANY NAMES (PRESERVE):
   - Keep original company names from the base CV${companyExample}.
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
${specificProhibitions}${reactException}   - If the job requires a skill that is NOT in the base CV, DO NOT include it.
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
    - Focus on ${lengthFocus}.
    - The output must fit ideally on a single A4 page, so be efficient with words.

Rewrite the CV to align with these extracted keywords while following ALL rules above.
`;
}

export function buildAdaptUserMessage(
  baseHtml: string,
  keywords: Keywords,
  jobTitle: string = '',
  framework?: FrameworkMode
): string {
  const keywordsJson = JSON.stringify(keywords, null, 2);
  const frameworkHint = framework ? '- Handle framework mismatches elegantly\n' : '';

  return `Adapt this CV for a job opportunity with these requirements:

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
${frameworkHint}- No AI traces
- Return JSON with "html" and "summary" fields
`;
}
