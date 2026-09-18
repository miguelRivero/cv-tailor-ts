/**
 * Unit tests for CV structure validation
 */

import fs from 'fs/promises';
import {
  validateBaseCvStructure,
  normalizeOutputHtml,
  updateJobTitleInHtml,
  inlineStylesheet,
} from '../src/core/html/cvStructure';

describe('CV Structure Validation', () => {
  it('accepts the base CV paragraph layout', async () => {
    const html = await fs.readFile('original/MR_cv_base.html', 'utf-8');
    expect(() => validateBaseCvStructure(html)).not.toThrow();
  });

  it('rejects deprecated cv-container layout', () => {
    const html = `
      <html><head><link rel="stylesheet" href="shared.css"></head>
      <body>
        <div class="content"></div>
        <div class="cv-container"><div class="experience-item"></div></div>
      </body></html>
    `;

    expect(() => validateBaseCvStructure(html)).toThrow(/deprecated layout/i);
  });

  it('rejects HTML without .content root', () => {
    const html = `
      <html><head><link rel="stylesheet" href="shared.css"></head>
      <body><main><p>Hello</p></main></body></html>
    `;

    expect(() => validateBaseCvStructure(html)).toThrow(/content/i);
  });

  it('normalizes stylesheet href to shared.css', () => {
    const html =
      '<html><head><link rel="stylesheet" href="../original/shared.css"></head><body></body></html>';
    const normalized = normalizeOutputHtml(html);

    expect(normalized).toContain('href="shared.css"');
  });

  it('updates only the header job title paragraph', async () => {
    const html = await fs.readFile('original/MR_cv_base.html', 'utf-8');
    const updated = updateJobTitleInHtml(html, 'Platform Engineer');

    expect(updated).toContain('<p>Platform Engineer</p>');
    expect(updated).toContain('PROFESSIONAL SUMMARY');
    expect(updated).not.toContain('<section class="title">Platform Engineer</section>');
  });

  it('inlines shared.css for PDF generation', () => {
    const html =
      '<html><head><link rel="stylesheet" href="shared.css"></head><body><div class="content"></div></body></html>';
    const css = '.content { background: white; }';
    const inlined = inlineStylesheet(html, css);

    expect(inlined).toContain('<style>.content { background: white; }</style>');
    expect(inlined).not.toContain('href="shared.css"');
  });
});
