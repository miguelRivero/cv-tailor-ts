/**
 * AI watermark detection and removal module
 * Migrated from watermark_filter.py
 */

import { loadConfig } from '../utils/config.js';

/**
 * Get list of watermark patterns to detect and remove
 */
export function getWatermarkPatterns(): RegExp[] {
  const config = loadConfig();
  const keywords = config.watermark_keywords || [];

  const patterns: RegExp[] = [];

  // Convert keywords to regex patterns (case-insensitive)
  for (const keyword of keywords) {
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
export function detectWatermarks(text: string): string[] {
  const patterns = getWatermarkPatterns();
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
export function removeWatermarks(htmlContent: string): string {
  const patterns = getWatermarkPatterns();
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
export function validateNoWatermarks(htmlContent: string): boolean {
  const detections = detectWatermarks(htmlContent);
  return detections.length === 0;
}
