/**
 * Integration tests for CV Tailor AI
 */

import { parseOfferFromFile } from '../src/node/parsers/parseOffer';
import { extractKeywords } from '../src/node/extractors/extractKeywords';
import { extractJobTitle } from '../src/node/extractors/extractTitle';
import { fileExists } from '../src/node/utils/fileUtils';

describe('Integration Tests', () => {
  // Skip tests if no API key is set
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  describe('End-to-End Workflow', () => {
    it('should parse job offer from file', async () => {
      const offerPath = 'offers/sample_offer.txt';
      const exists = await fileExists(offerPath);

      if (!exists) {
        console.log('Sample offer file not found, skipping test');
        return;
      }

      const offerText = await parseOfferFromFile(offerPath);
      expect(offerText).toBeTruthy();
      expect(offerText.length).toBeGreaterThan(0);
    });

    it('should extract job title from offer', async () => {
      if (!hasApiKey) {
        console.log('No API key, skipping LLM test');
        return;
      }

      const sampleOffer = 'We are hiring a Senior Frontend Developer with React experience.';
      const title = await extractJobTitle(sampleOffer);

      expect(title).toBeTruthy();
      expect(typeof title).toBe('string');
      expect(title).toMatch(/[a-z-]+/);
    }, 30000);

    it('should extract keywords from offer', async () => {
      if (!hasApiKey) {
        console.log('No API key, skipping LLM test');
        return;
      }

      const sampleOffer = `
        Senior Frontend Developer
        
        Requirements:
        - React and TypeScript
        - 5+ years experience
        - Strong communication skills
      `;

      const keywords = await extractKeywords(sampleOffer);

      expect(keywords).toBeTruthy();
      expect(keywords.technologies).toBeDefined();
      expect(keywords.hard_skills).toBeDefined();
    }, 30000);
  });
});
