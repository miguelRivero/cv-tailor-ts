/**
 * Unit tests for parsers
 */

import { parseOfferFromFile } from '../src/node/parsers/parseOffer';
import { isPdfFile } from '../src/node/parsers/parsePdf';

describe('Parser Tests', () => {
  describe('parseOfferFromFile', () => {
    it('should throw error for non-existent file', async () => {
      await expect(parseOfferFromFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('isPdfFile', () => {
    it('should return true for PDF files', () => {
      expect(isPdfFile('document.pdf')).toBe(true);
      expect(isPdfFile('DOCUMENT.PDF')).toBe(true);
      expect(isPdfFile('/path/to/file.pdf')).toBe(true);
    });

    it('should return false for non-PDF files', () => {
      expect(isPdfFile('document.html')).toBe(false);
      expect(isPdfFile('document.txt')).toBe(false);
      expect(isPdfFile('document')).toBe(false);
    });
  });
});
