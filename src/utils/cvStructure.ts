/**
 * Validates that base CV HTML matches the shared.css paragraph layout.
 */

import * as cheerio from 'cheerio';

const DEPRECATED_SELECTORS = ['.cv-container', '.main-content', '.experience-item'];

export function validateBaseCvStructure(html: string): void {
  const $ = cheerio.load(html);

  if ($('.content').length === 0) {
    throw new Error(
      'Base CV must use a <div class="content"> root layout. ' +
        'See original/cv_template.html for the expected structure.'
    );
  }

  for (const selector of DEPRECATED_SELECTORS) {
    if ($(selector).length > 0) {
      throw new Error(
        `Base CV uses deprecated layout selector "${selector}". ` +
          'Revert to the .content paragraph layout used by shared.css.'
      );
    }
  }

  const stylesheet = $('link[rel="stylesheet"]')
    .toArray()
    .map((link) => $(link).attr('href') || '')
    .find((href) => href.includes('shared.css'));

  if (!stylesheet) {
    throw new Error('Base CV must include <link rel="stylesheet" href="shared.css">.');
  }
}

export function normalizeOutputHtml(html: string): string {
  const $ = cheerio.load(html);

  $('link[rel="stylesheet"]').each((_, link) => {
    const href = $(link).attr('href') || '';
    if (href.includes('shared.css')) {
      $(link).attr('href', 'shared.css');
    }
  });

  return $.html();
}

export function updateJobTitleInHtml(
  html: string,
  formattedTitle: string,
  candidateName?: string
): string {
  const $ = cheerio.load(html);

  if ($('title').length > 0) {
    const name = candidateName?.trim() || $('.content > p').first().text().trim() || 'CV';
    $('title').text(`${name} - ${formattedTitle}`);
  }

  const jobTitleParagraph = $('.content > p').eq(1);
  if (jobTitleParagraph.length > 0) {
    jobTitleParagraph.text(formattedTitle);
  }

  return $.html();
}

export function inlineStylesheet(html: string, cssContent: string): string {
  const $ = cheerio.load(html);

  $('link[rel="stylesheet"]').each((_, link) => {
    const href = $(link).attr('href') || '';
    if (href.includes('shared.css')) {
      $(link).remove();
    }
  });

  $('head').append(`<style>${cssContent}</style>`);

  return $.html();
}
