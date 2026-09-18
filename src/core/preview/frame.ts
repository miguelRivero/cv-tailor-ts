/**
 * A4 preview metrics and the iframe sandbox tokens the web app uses.
 *
 * Kept in core so the page-count math and the XSS-guard sandbox string
 * are unit-testable without jsdom, and so a later CLI or worker surface
 * cannot silently diverge from "A4 at 96 dpi".
 */

/** A4 width in CSS pixels at 96 dpi (210mm). */
export const A4_WIDTH_PX = 794;

/** A4 height in CSS pixels at 96 dpi (297mm). */
export const A4_HEIGHT_PX = 1123;

/**
 * Sandbox tokens for the preview and print iframes.
 *
 * `allow-same-origin` lets the parent read scrollHeight for the page-count
 * badge. `allow-modals` lets `contentWindow.print()` open the print dialog.
 * `allow-scripts` is deliberately absent: the HTML is LLM-authored and
 * injected verbatim, so any script it emits must stay inert. Never add
 * `allow-scripts` alongside `allow-same-origin` — together they defeat
 * the sandbox entirely.
 */
export const CV_IFRAME_SANDBOX = 'allow-same-origin allow-modals';

/**
 * How many A4 pages `scrollHeight` would occupy. Empty or non-finite
 * heights count as one page so the badge never shows "0 pages".
 */
export function countA4Pages(scrollHeightPx: number, pageHeightPx = A4_HEIGHT_PX): number {
  if (!Number.isFinite(scrollHeightPx) || scrollHeightPx <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(scrollHeightPx / pageHeightPx));
}
