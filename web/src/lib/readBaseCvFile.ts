/**
 * HTML is read as text. A PDF is extracted in the browser and wrapped
 * into the same .content HTML the worker already accepts.
 */

import { validateBaseCvStructure } from '@core/html/cvStructure';
import { pdfTextToBaseHtml } from '@core/html/pdfText';

type PdfTextItem = { str: string; hasEOL?: boolean };

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    typeof (item as { str: unknown }).str === 'string'
  );
}

async function extractPdfText(file: File): Promise<string> {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items) {
      if (!isPdfTextItem(item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      } else if (item.str && !line.endsWith(' ')) {
        line += ' ';
      }
    }
    if (line.trim()) lines.push(line.trim());
  }

  return lines.join('\n');
}

export async function readBaseCvFile(file: File): Promise<string> {
  if (isPdf(file)) {
    return pdfTextToBaseHtml(await extractPdfText(file));
  }
  const html = await file.text();
  validateBaseCvStructure(html);
  return html;
}
