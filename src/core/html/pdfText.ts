/**
 * Turns extracted PDF text into the .content HTML layout the tailor accepts.
 * Lines stay text. This is not a visual copy of the PDF.
 */

import { validateBaseCvStructure } from './cvStructure.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A line looks like a section heading if it is short, contains only
 * upper-case letters, spaces, and common punctuation, and has no
 * lower-case letters at all (e.g. "PROFESSIONAL SUMMARY", "LANGUAGES").
 * Digit-only lines (years, phone numbers) are excluded.
 */
function isSectionHeading(line: string): boolean {
  if (line.length > 60) return false;
  if (/\d/.test(line)) return false;
  return line === line.toUpperCase() && /[A-Z]/.test(line);
}

export function pdfTextToBaseHtml(pdfText: string): string {
  const paragraphs = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      isSectionHeading(line)
        ? `<section class="title">${escapeHtml(line)}</section>`
        : `<p>${escapeHtml(line)}</p>`
    );

  if (paragraphs.length === 0) {
    throw new Error('PDF has no extractable text.');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CV</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="shared.css">
</head>
<body>
    <div class="content">
        ${paragraphs.join('\n')}
    </div>
</body>
</html>
`;

  validateBaseCvStructure(html);
  return html;
}
