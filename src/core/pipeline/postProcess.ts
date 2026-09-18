/**
 * Post-adaptation processing: watermark removal, structure validation,
 * and the header job-title rewrite that runs after the LLM returns its
 * adapted HTML.
 *
 * This mirrors steps 6 and 7 of the CLI pipeline (src/index.ts), split
 * into pieces so each caller can decide what a broken layout means to
 * it:
 *
 *   - The CLI calls stageRemoveWatermarks(), then rewriteTitleAndNormalize(),
 *     interleaves its own Puppeteer/PDF-input reflow step in between the
 *     latter and a final validateBaseCvStructure() call exactly as
 *     before, and still hard-fails on a broken layout - unchanged from
 *     today.
 *   - The web app and worker call applyPostProcessing(), which runs the
 *     same sequence with no reflow step, and turns a structural failure
 *     into a warning instead of throwing. A tailored CV already cost an
 *     OpenAI call; a layout that came back slightly wrong should still
 *     be shown to the user, not silently discarded.
 */

import { removeWatermarks, detectWatermarks } from '../filters/watermarkFilter.js';
import {
  validateBaseCvStructure,
  updateJobTitleInHtml,
  normalizeOutputHtml,
} from '../html/cvStructure.js';
import { formatJobTitleForHeader } from '../naming/filenames.js';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface RemoveWatermarksOptions {
  watermarkKeywords?: string[];
  /** Mirrors the CLI's --no-watermark-check: when false, watermark
   *  removal still runs, but no detection pass is made afterwards. */
  checkWatermarks?: boolean;
}

export interface RemoveWatermarksResult {
  html: string;
  /** Non-empty when the HTML no longer matches the expected CV layout
   *  after watermark text was stripped out of it. */
  structureWarnings: string[];
  /** False when checkWatermarks was false - distinct from "checked and
   *  found nothing", which is watermarksChecked: true with an empty
   *  watermarkDetections array. */
  watermarksChecked: boolean;
  watermarkDetections: string[];
}

/**
 * Step 6 of the pipeline: strip AI watermark phrasing, then check the
 * result still matches the expected CV layout. A structural failure is
 * returned as a warning rather than thrown, so the caller decides
 * whether that should abort the run (the CLI does) or just be surfaced
 * to the user (the web app does).
 */
export function stageRemoveWatermarks(
  html: string,
  options: RemoveWatermarksOptions = {}
): RemoveWatermarksResult {
  const { watermarkKeywords, checkWatermarks = true } = options;

  const cleaned = removeWatermarks(html, watermarkKeywords);

  const structureWarnings: string[] = [];
  try {
    validateBaseCvStructure(cleaned);
  } catch (error) {
    structureWarnings.push(describeError(error));
  }

  const watermarkDetections = checkWatermarks ? detectWatermarks(cleaned, watermarkKeywords) : [];

  return {
    html: cleaned,
    structureWarnings,
    watermarksChecked: checkWatermarks,
    watermarkDetections,
  };
}

export interface RewriteTitleOptions {
  /** The slugified job title, e.g. "senior-frontend-developer". */
  jobTitle: string;
  candidateName: string;
}

/**
 * Step 7 of the pipeline: rewrite the header job title from the offer
 * and normalize the stylesheet link. Deliberately does not validate:
 * the CLI's --pdf-input mode reflows the HTML (see src/index.ts) after
 * this step and before validating, so the check has to stay a separate,
 * explicit call rather than being folded in here.
 */
export function rewriteTitleAndNormalize(html: string, options: RewriteTitleOptions): string {
  const formattedTitle = formatJobTitleForHeader(options.jobTitle);
  const withTitle = updateJobTitleInHtml(html, formattedTitle, options.candidateName);
  return normalizeOutputHtml(withTitle);
}

/**
 * Validate the final HTML, returning a warning instead of throwing.
 */
export function validateFinalStructure(html: string): string[] {
  try {
    validateBaseCvStructure(html);
    return [];
  } catch (error) {
    return [describeError(error)];
  }
}

export type PostProcessOptions = RemoveWatermarksOptions & RewriteTitleOptions;

export interface PostProcessResult {
  html: string;
  structureWarnings: string[];
  watermarksChecked: boolean;
  watermarkDetections: string[];
}

/**
 * Runs the full step 6+7 pipeline with no PDF-input reflow in between -
 * the shape used by the web app and the worker, which have no PDF base
 * CV to reflow. Never throws: a broken layout comes back as a warning
 * so the caller can still show the preview and enable download.
 */
export function applyPostProcessing(
  adaptedHtml: string,
  options: PostProcessOptions
): PostProcessResult {
  const stage1 = stageRemoveWatermarks(adaptedHtml, options);
  const titled = rewriteTitleAndNormalize(stage1.html, options);
  const finalWarnings = validateFinalStructure(titled);

  return {
    html: titled,
    structureWarnings: [...stage1.structureWarnings, ...finalWarnings],
    watermarksChecked: stage1.watermarksChecked,
    watermarkDetections: stage1.watermarkDetections,
  };
}
