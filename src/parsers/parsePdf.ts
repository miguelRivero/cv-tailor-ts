/**
 * PDF CV parsing module
 * NEW: Extracts text content from PDF CVs
 */

import fs from 'fs/promises';
import pdf from 'pdf-parse';

/**
 * Parse PDF CV and extract text content
 */
export async function parsePdfCV(pdfPath: string): Promise<string> {
  try {
    // Read PDF file as buffer
    const dataBuffer = await fs.readFile(pdfPath);

    // Parse PDF
    const data = await pdf(dataBuffer);

    // Return extracted text
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF CV: ${error}`);
  }
}

/**
 * Check if a file is a PDF based on extension
 */
export function isPdfFile(filepath: string): boolean {
  return filepath.toLowerCase().endsWith('.pdf');
}
