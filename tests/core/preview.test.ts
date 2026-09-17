/**
 * Unit tests for the preview/download helpers the web app uses:
 * A4 page-count, the iframe sandbox tokens, and the download packing
 * that must match the CLI's filenames.
 */

import { inlineStylesheet } from '../../src/core/html/cvStructure';
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  CV_IFRAME_SANDBOX,
  countA4Pages,
} from '../../src/core/preview/frame';
import { buildDownloadFiles } from '../../src/core/preview/download';

const SAMPLE_HTML =
  '<html><head><link rel="stylesheet" href="shared.css"></head>' +
  '<body><div class="content"><p>Miguel Rivero López</p></div></body></html>';
const SAMPLE_CSS = '* { margin: 0; } body { font-family: Geist, sans-serif; }';

describe('A4 frame metrics', () => {
  it('is A4 at 96 dpi', () => {
    expect(A4_WIDTH_PX).toBe(794);
    expect(A4_HEIGHT_PX).toBe(1123);
  });
});

describe('countA4Pages', () => {
  it('counts a document that fits one page as 1', () => {
    expect(countA4Pages(A4_HEIGHT_PX)).toBe(1);
    expect(countA4Pages(800)).toBe(1);
  });

  it('rounds up as soon as content overflows one page', () => {
    expect(countA4Pages(A4_HEIGHT_PX + 1)).toBe(2);
    expect(countA4Pages(A4_HEIGHT_PX * 2)).toBe(2);
    expect(countA4Pages(A4_HEIGHT_PX * 2 + 1)).toBe(3);
  });

  it('treats empty or non-finite heights as one page', () => {
    expect(countA4Pages(0)).toBe(1);
    expect(countA4Pages(-10)).toBe(1);
    expect(countA4Pages(Number.NaN)).toBe(1);
  });
});

describe('CV_IFRAME_SANDBOX', () => {
  it('allows same-origin reads and print dialogs, and never scripts', () => {
    const tokens = CV_IFRAME_SANDBOX.split(/\s+/).sort();
    expect(tokens).toEqual(['allow-modals', 'allow-same-origin']);
    expect(tokens).not.toContain('allow-scripts');
  });
});

describe('buildDownloadFiles', () => {
  const base = {
    html: SAMPLE_HTML,
    css: SAMPLE_CSS,
    jobTitle: 'senior-frontend-developer',
    candidateName: 'Miguel Rivero López',
  };

  it('names the HTML file the same way the CLI does', () => {
    const [file] = buildDownloadFiles({ ...base, inlineCss: true });
    expect(file.filename).toBe('Miguel-Rivero-Lopez-senior-frontend-developer.html');
  });

  it('inlines shared.css into a single self-contained HTML file', () => {
    const files = buildDownloadFiles({ ...base, inlineCss: true });
    expect(files).toHaveLength(1);
    expect(files[0].mimeType).toBe('text/html;charset=utf-8');
    expect(files[0].contents).toBe(inlineStylesheet(SAMPLE_HTML, SAMPLE_CSS));
    expect(files[0].contents).not.toContain('href="shared.css"');
    expect(files[0].contents).toContain('<style>');
    expect(files[0].contents).toContain(SAMPLE_CSS);
  });

  it('emits HTML plus a sibling shared.css, matching saveAdaptedCV', () => {
    const files = buildDownloadFiles({ ...base, inlineCss: false });
    expect(files.map((file) => file.filename)).toEqual([
      'Miguel-Rivero-Lopez-senior-frontend-developer.html',
      'shared.css',
    ]);
    expect(files[0].contents).toContain('href="shared.css"');
    expect(files[0].contents).not.toContain('<style>');
    expect(files[1]).toEqual({
      filename: 'shared.css',
      contents: SAMPLE_CSS,
      mimeType: 'text/css;charset=utf-8',
    });
  });
});
