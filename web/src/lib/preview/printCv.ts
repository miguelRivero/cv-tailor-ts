/**
 * Print a tailored CV through a throwaway off-screen iframe.
 *
 * Printing the iframe's own document is what applies shared.css's
 * `@page { size: A4; margin: 0 }` rather than the app's page rules.
 * Waiting on `fonts.ready` is not optional: Geist loads from Google
 * Fonts, and printing against fallback metrics breaks the one-page
 * pagination the adapt prompt targets.
 *
 * Cleanup listens for `afterprint` and also a 60s timeout, because
 * Safari does not fire `afterprint` reliably.
 */

import { A4_HEIGHT_PX, A4_WIDTH_PX, CV_IFRAME_SANDBOX } from '@core/preview/frame';

export const PRINT_CLEANUP_TIMEOUT_MS = 60_000;

export function printHtmlDocument(srcDoc: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', CV_IFRAME_SANDBOX);
  iframe.setAttribute('title', 'Print CV');
  iframe.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${A4_WIDTH_PX}px`,
    `height:${A4_HEIGHT_PX}px`,
    'border:0',
    'opacity:0',
    'pointer-events:none',
  ].join(';');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  let printed = false;
  const onLoad = async () => {
    if (printed) return;
    printed = true;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      cleanup();
      return;
    }

    try {
      await doc.fonts.ready;
    } catch {
      // Still print rather than hang if the Font Loading API rejects.
    }

    win.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, PRINT_CLEANUP_TIMEOUT_MS);
    win.print();
  };

  iframe.addEventListener(
    'load',
    () => {
      void onLoad();
    },
    { once: true }
  );

  // Set srcdoc before insert so the iframe fires load once, with the
  // real document, rather than once for about:blank and again for srcdoc
  // (which would open two print dialogs).
  iframe.srcdoc = srcDoc;
  document.body.appendChild(iframe);
}
