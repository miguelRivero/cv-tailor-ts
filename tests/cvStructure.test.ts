/**
 * Unit tests for CV structure validation
 */

import fs from 'fs/promises';
import { buildDownloadFiles } from '../src/core/preview/download';
import {
  validateBaseCvStructure,
  normalizeOutputHtml,
  updateJobTitleInHtml,
  inlineStylesheet,
  resolveRunCandidateName,
} from '../src/core/html/cvStructure';

describe('CV Structure Validation', () => {
  it('accepts the base CV paragraph layout', async () => {
    const html = await fs.readFile('original/MR_cv_base.html', 'utf-8');
    expect(() => validateBaseCvStructure(html)).not.toThrow();
  });

  it('keeps the blank template as a layout skeleton, not a copy of the default CV', async () => {
    const html = await fs.readFile('original/cv_template.html', 'utf-8');
    expect(() => validateBaseCvStructure(html)).not.toThrow();
    expect(html).not.toContain('Miguel Rivero');
    expect(html).not.toMatch(/Vue\s*3/i);
  });

  it('does not tell the model to invent content in the blank template', async () => {
    const html = await fs.readFile('original/cv_template.html', 'utf-8');
    expect(html).not.toMatch(/the tailor/i);
    expect(html).not.toMatch(/replace this/i);
    expect(html).not.toMatch(/real achievement/i);
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

  it('uses the uploaded CV header for the title and filename, not the default candidate', () => {
    const html = `<html><head><title>Old</title>
      <link rel="stylesheet" href="shared.css"></head>
      <body><div class="content"><p>Ada Lovelace</p><p>Engineer</p></div></body></html>`;

    const name = resolveRunCandidateName({
      useConfiguredName: false,
      configuredName: 'Miguel Rivero López',
      baseHtml: html,
    });
    const updated = updateJobTitleInHtml(html, 'Platform Engineer', name);
    const [file] = buildDownloadFiles({
      html: updated,
      css: '',
      jobTitle: 'platform-engineer',
      candidateName: name,
      inlineCss: true,
    });

    expect(name).toBe('Ada Lovelace');
    expect(updated).toContain('<title>Ada Lovelace - Platform Engineer</title>');
    expect(file.filename).toBe('Ada-Lovelace-platform-engineer.html');
  });

  it('keeps the configured name for the default CV', () => {
    const html = `<html><head><title>Old</title></head>
      <body><div class="content"><p>Your Name</p><p>Job Title</p></div></body></html>`;

    expect(
      resolveRunCandidateName({
        useConfiguredName: true,
        configuredName: 'Miguel Rivero López',
        baseHtml: html,
      })
    ).toBe('Miguel Rivero López');
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
