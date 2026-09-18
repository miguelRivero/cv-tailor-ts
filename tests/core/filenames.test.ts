/**
 * Unit tests for src/core/naming/filenames.ts
 */

import {
  generateOutputFilename,
  slugifyCandidate,
  formatJobTitleForHeader,
} from '../../src/core/naming/filenames';

describe('slugifyCandidate', () => {
  it('slugifies a candidate name, stripping accents', () => {
    expect(slugifyCandidate('Miguel Rivero López')).toBe('Miguel-Rivero-Lopez');
  });
});

describe('formatJobTitleForHeader', () => {
  it('turns a job-title slug into a title-cased header', () => {
    expect(formatJobTitleForHeader('senior-frontend-developer')).toBe('Senior Frontend Developer');
  });

  it('title-cases a single word', () => {
    expect(formatJobTitleForHeader('developer')).toBe('Developer');
  });
});

describe('generateOutputFilename', () => {
  it('joins candidate slug, job title and extension', () => {
    expect(generateOutputFilename('senior-frontend-developer', 'Miguel-Rivero-Lopez', 'html')).toBe(
      'Miguel-Rivero-Lopez-senior-frontend-developer.html'
    );
  });

  it('defaults the candidate name and extension', () => {
    expect(generateOutputFilename('senior-frontend-developer')).toBe(
      'Miguel-Rivero-Lopez-senior-frontend-developer.html'
    );
  });
});
