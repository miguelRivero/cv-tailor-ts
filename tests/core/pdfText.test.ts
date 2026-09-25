/**
 * PDF text becomes the same .content HTML the tailor already accepts.
 */

import { pdfTextToBaseHtml } from '../../src/core/html/pdfText';
import { validateBaseCvStructure } from '../../src/core/html/cvStructure';

describe('pdfTextToBaseHtml', () => {
  it('wraps non-empty lines in the shared paragraph layout', () => {
    const html = pdfTextToBaseHtml('Ada Lovelace\n\nEngineer\r\nLondon');

    expect(() => validateBaseCvStructure(html)).not.toThrow();
    expect(html).toContain('<p>Ada Lovelace</p>');
    expect(html).toContain('<p>Engineer</p>');
    expect(html).toContain('<p>London</p>');
    expect(html).not.toMatch(/<p>\s*<\/p>/);
  });

  it('escapes text so a PDF cannot inject markup', () => {
    const html = pdfTextToBaseHtml('Skills: <script>alert(1)</script> & more');

    expect(html).toContain('<p>Skills: &lt;script&gt;alert(1)&lt;/script&gt; &amp; more</p>');
    expect(html).not.toContain('<script>');
  });

  it('rejects a PDF with no extractable text', () => {
    expect(() => pdfTextToBaseHtml('   \n\t')).toThrow(/no extractable text/i);
  });
});
