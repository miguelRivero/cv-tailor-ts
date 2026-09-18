/**
 * Trigger one or more file downloads via Blob + temporary <a download>.
 * Multiple files are staggered: browsers often ignore a second
 * click() in the same tick.
 */

import type { DownloadFile } from '@core/preview/download';

const STAGGER_MS = 100;

function downloadOne(file: DownloadFile): void {
  const blob = new Blob([file.contents], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function triggerDownloads(files: DownloadFile[]): void {
  files.forEach((file, index) => {
    window.setTimeout(() => downloadOne(file), index * STAGGER_MS);
  });
}

/**
 * Open inlined HTML in a new tab. The blob URL is revoked after a
 * minute so the tab has time to load; earlier revocation can blank it.
 */
export function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
