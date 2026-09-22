/**
 * Dual-path adapt prompts: Miguel's framework modes keep the existing
 * frontend emphasis; omitting framework must not fall through to agnostic.
 */

import { buildAdaptSystemPrompt, buildAdaptUserMessage } from '../../src/core/prompts/adaptCv';
import { buildKeywordsSystemPrompt } from '../../src/core/prompts/extractKeywords';
import type { Keywords } from '../../src/core/types/keywords';

const KEYWORDS: Keywords = {
  company_name: 'Acme',
  hard_skills: [],
  soft_skills: [],
  technologies: [],
  responsibilities: [],
  company_culture: [],
  synonyms: { Vue_to_React: [], general: [] },
};

describe('buildAdaptSystemPrompt', () => {
  it('keeps frontend-agnostic emphasis when framework is agnostic', () => {
    const prompt = buildAdaptSystemPrompt('agnostic');
    expect(prompt).toContain('FRAMEWORK EMPHASIS (framework-agnostic)');
    expect(prompt).toContain('frontend frameworks');
    expect(prompt).toContain('You MAY add "React" or "React.js"');
  });

  it('keeps the Vue-to-React ramp-up block for react mode', () => {
    const prompt = buildAdaptSystemPrompt('react');
    expect(prompt).toContain('FRAMEWORK EMPHASIS (React ramp-up)');
    expect(prompt).toContain('primary and most extensive experience is with Vue');
  });

  it('does not allow adding React when the mode is vue', () => {
    const prompt = buildAdaptSystemPrompt('vue');
    expect(prompt).toContain('Do NOT mention React at all');
    expect(prompt).not.toContain('You MAY add "React"');
    expect(prompt).toContain('Do NOT add "Electron"');
  });

  it('does not inject frontend framing when framework is omitted', () => {
    const prompt = buildAdaptSystemPrompt();
    expect(prompt).not.toContain('FRAMEWORK EMPHASIS');
    expect(prompt).not.toContain('frontend frameworks');
    expect(prompt).not.toContain('You MAY add "React" or "React.js"');
    expect(prompt).not.toContain('Do NOT add "Electron"');
    expect(prompt).not.toContain('Nespresso');
    expect(prompt).toContain('STRICTLY FORBIDDEN to add skills');
  });

  it('keeps the default-CV employer example when a framework mode is set', () => {
    expect(buildAdaptSystemPrompt('agnostic')).toContain('Nespresso');
  });
});

describe('buildAdaptUserMessage', () => {
  it('drops framework-mismatch guidance when framework is omitted', () => {
    const withFraming = buildAdaptUserMessage('<html></html>', KEYWORDS, 'engineer', 'agnostic');
    expect(withFraming).toContain('Handle framework mismatches elegantly');

    const withoutFraming = buildAdaptUserMessage('<html></html>', KEYWORDS, 'engineer');
    expect(withoutFraming).not.toContain('Handle framework mismatches elegantly');
  });
});

describe('buildKeywordsSystemPrompt', () => {
  it('keeps Vue_to_React transfer examples on the Miguel path', () => {
    const prompt = buildKeywordsSystemPrompt('agnostic');
    expect(prompt).toContain('composition patterns transferable to React');
  });

  it('does not ask for Vue-to-React fill-ins when framework is omitted', () => {
    const prompt = buildKeywordsSystemPrompt();
    expect(prompt).not.toContain('composition patterns transferable to React');
    expect(prompt).toContain('"Vue_to_React": []');
  });
});
