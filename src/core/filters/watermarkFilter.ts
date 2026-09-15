/**
 * AI watermark detection and removal.
 *
 * Unlike the original module, this one takes its keyword list as an
 * argument instead of reading config.yaml off disk - there is no
 * filesystem in a browser or at the edge. Every function defaults to
 * DEFAULT_CORE_CONFIG.watermarkKeywords, so existing callers that pass
 * nothing keep exactly the current behaviour.
 */

import { DEFAULT_CORE_CONFIG } from '../config/defaults.js';

/**
 * Build the list of regex patterns to detect and remove, from a list of
 * watermark keywords.
 */
export function getWatermarkPatterns(
  watermarkKeywords: string[] = DEFAULT_CORE_CONFIG.watermarkKeywords
): RegExp[] {
  const patterns: RegExp[] = [];

  // Convert keywords to regex patterns (case-insensitive)
  for (const keyword of watermarkKeywords) {
    // Escape special regex characters
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Create case-insensitive word boundary pattern
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    patterns.push(pattern);
  }

  // Additional sentence-level patterns
  const sentencePatterns = [
    /this\s+(?:cv|resume)\s+(?:has\s+been|was)\s+(?:adapted|generated|created|modified)\s+(?:using|with|by)\s+(?:ai|an?\s+ai|artificial\s+intelligence|language\s+model)/gi,
    /generated\s+by\s+(?:ai|an?\s+ai|artificial\s+intelligence|language\s+model)/gi,
    /as\s+an?\s+(?:ai|language)\s+(?:model|assistant)/gi,
  ];

  patterns.push(...sentencePatterns);

  return patterns;
}

/**
 * Detect potential AI watermarks in text
 */
export function detectWatermarks(
  text: string,
  watermarkKeywords: string[] = DEFAULT_CORE_CONFIG.watermarkKeywords
): string[] {
  const patterns = getWatermarkPatterns(watermarkKeywords);
  const detections: string[] = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      detections.push(...matches);
    }
  }

  return detections;
}

/**
 * Remove AI watermarks from HTML content
 */
export function removeWatermarks(
  htmlContent: string,
  watermarkKeywords: string[] = DEFAULT_CORE_CONFIG.watermarkKeywords
): string {
  const patterns = getWatermarkPatterns(watermarkKeywords);
  let cleaned = htmlContent;

  for (const pattern of patterns) {
    // Remove matching text
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up multiple spaces left by removal
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Clean up empty paragraphs or list items
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<li>\s*<\/li>/g, '');

  return cleaned;
}

/**
 * Validate that HTML content contains no AI watermarks
 */
export function validateNoWatermarks(
  htmlContent: string,
  watermarkKeywords: string[] = DEFAULT_CORE_CONFIG.watermarkKeywords
): boolean {
  const detections = detectWatermarks(htmlContent, watermarkKeywords);
  return detections.length === 0;
}
