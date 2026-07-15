#!/usr/bin/env node
/**
 * Main orchestration script for CV Tailor AI (TypeScript)
 * Migrated from run.py with PDF support added
 */

import 'dotenv/config';
import { Command, Option } from 'commander';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import { loadConfig } from './utils/config.js';
import { parseOfferFromUrl, parseOfferFromFile } from './parsers/parseOffer.js';
import { parsePdfCV } from './parsers/parsePdf.js';
import { extractKeywords } from './extractors/extractKeywords.js';
import { extractJobTitle } from './extractors/extractTitle.js';
import { adaptHTML } from './adapters/adaptCv.js';
import {
  removeWatermarks,
  validateNoWatermarks,
  detectWatermarks,
} from './filters/watermarkFilter.js';
import { generatePdf } from './generators/pdfGenerator.js';
import {
  loadBaseCV,
  saveAdaptedCV,
  generateOutputFilename,
  fileExists,
} from './utils/fileUtils.js';
import {
  validateBaseCvStructure,
  normalizeOutputHtml,
  updateJobTitleInHtml,
  inlineStylesheet,
} from './utils/cvStructure.js';

interface CliOptions {
  text?: string;
  file?: string;
  url?: string;
  base: string;
  outputDir: string;
  noWatermarkCheck: boolean;
  verbose: boolean;
  pdfInput?: string; // Only set when explicitly provided
  htmlOnly: boolean; // Replaces pdfOutput and pdfOnly
  framework: 'react' | 'vue' | 'agnostic';
}

const FRAMEWORK_MODES = ['react', 'vue', 'agnostic'] as const;

async function main() {
  const program = new Command();

  program
    .name('cv-tailor-ai')
    .description('CV Tailor AI - Automated CV Adaptation System with PDF Support')
    .version('2.0.0');

  // Input source (mutually exclusive)
  program
    .addOption(new Option('--text <text>', 'Job offer text directly').conflicts(['file', 'url']))
    .addOption(
      new Option('--file <path>', 'Path to job offer text file').conflicts(['text', 'url'])
    )
    .addOption(new Option('--url <url>', 'URL of job offer page').conflicts(['text', 'file']))
    .option(
      '--base <path>',
      'Path to base CV HTML file (default: uses PDF)',
      'original/MR_cv_base.html'
    )
    .option(
      '--pdf-input <path>',
      'Path to base CV PDF file (defaults to the HTML base CV when omitted)'
    )
    .option('--output-dir <dir>', 'Output directory', 'output')
    .option('--no-watermark-check', 'Skip watermark detection check')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--html-only', 'Generate only HTML output (no PDF attempt)')
    .option('--framework <mode>', 'Framework emphasis mode: react | vue | agnostic', 'agnostic');

  program.parse();

  const options = program.opts<CliOptions>();

  try {
    // Validate framework mode
    if (!FRAMEWORK_MODES.includes(options.framework)) {
      console.error(
        `❌ Error: Invalid --framework value "${options.framework}". Must be one of: ${FRAMEWORK_MODES.join(', ')}`
      );
      process.exit(1);
    }

    // Validate OpenAI API key early, before running the pipeline
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        '❌ Error: OPENAI_API_KEY is not set. Add it to your environment or .env file.'
      );
      process.exit(1);
    }

    // Load configuration (candidate name, model settings, etc.)
    const config = loadConfig();

    // Validate input source
    if (!options.text && !options.file && !options.url) {
      console.error('❌ Error: Must provide --text, --file, or --url');
      process.exit(1);
    }

    // Step 1: Load job offer
    if (options.verbose) {
      console.log('📄 Loading job offer...');
    }

    let offerText: string;
    if (options.text) {
      offerText = options.text;
    } else if (options.url) {
      offerText = await parseOfferFromUrl(options.url);
    } else if (options.file) {
      offerText = await parseOfferFromFile(options.file);
    } else {
      throw new Error('Must provide --text, --file, or --url');
    }

    if (options.verbose) {
      console.log(`✓ Job offer loaded (${offerText.length} characters)`);
    }

    // Step 2: Extract job title
    if (options.verbose) {
      console.log('🏷️  Extracting job title...');
    }

    const jobTitle = await extractJobTitle(offerText);

    if (options.verbose) {
      console.log(`✓ Job title: ${jobTitle}`);
    }

    // Step 3: Extract keywords
    if (options.verbose) {
      console.log('🔍 Extracting keywords from job offer...');
    }

    const keywords = await extractKeywords(offerText);

    if (options.verbose) {
      console.log(
        `✓ Extracted ${keywords.hard_skills?.length || 0} hard skills, ` +
          `${keywords.technologies?.length || 0} technologies`
      );
    }

    // Step 4: Load base CV
    if (options.verbose) {
      const cvSource = options.pdfInput || options.base;
      console.log(`📋 Loading base CV from ${cvSource}...`);
    }

    let baseHtml: string;

    // Check if using PDF input
    if (options.pdfInput) {
      if (!(await fileExists(options.pdfInput))) {
        throw new Error(`PDF CV not found: ${options.pdfInput}`);
      }

      // Parse PDF to text
      const pdfText = await parsePdfCV(options.pdfInput);

      // For PDF input, we need to wrap the text in a basic HTML structure
      // This is a simplified approach - in production, you might want more sophisticated handling
      baseHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CV</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="shared.css">
</head>
<body>
    <div class="content">
        ${pdfText
          .split('\n')
          .map((line) => `<p>${line}</p>`)
          .join('\n')}
    </div>
</body>
</html>
`;
      validateBaseCvStructure(baseHtml);
    } else {
      baseHtml = await loadBaseCV(options.base);
      validateBaseCvStructure(baseHtml);
    }

    if (options.verbose) {
      console.log('✓ Base CV loaded');
    }

    // Step 5: Adapt CV
    if (options.verbose) {
      console.log('🤖 Adapting CV with LLM...');
    }

    const { html: adaptedHtml, summary: adaptationSummary } = await adaptHTML(
      baseHtml,
      keywords,
      jobTitle,
      options.framework
    );

    if (options.verbose) {
      console.log('✓ CV adapted');
    }

    // Step 6: Remove watermarks
    if (options.verbose) {
      console.log('🧹 Removing AI watermarks...');
    }

    let cleanedHtml = removeWatermarks(adaptedHtml);
    validateBaseCvStructure(cleanedHtml);

    // Check for watermarks
    if (!options.noWatermarkCheck) {
      const detections = detectWatermarks(cleanedHtml);
      if (detections.length > 0) {
        console.log(`⚠️  Warning: Detected potential AI watermarks: ${detections.join(', ')}`);
      } else if (options.verbose) {
        console.log('✓ No watermarks detected');
      }
    }

    // Step 7: Update title tag and header title in HTML
    if (options.verbose) {
      console.log('📝 Updating job titles in HTML...');
    }

    const formattedTitle = jobTitle.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    cleanedHtml = updateJobTitleInHtml(cleanedHtml, formattedTitle, config.candidate_name);
    cleanedHtml = normalizeOutputHtml(cleanedHtml);

    // Post-processing for paragraph-based HTML from PDF
    if (options.pdfInput) {
      const $ = cheerio.load(cleanedHtml);
      const paragraphs = $('.content p');
      const sectionTitles = [
        'PROFESSIONAL SUMMARY',
        'PROFESSIONAL EXPERIENCE',
        'CORE COMPETENCIES',
        'LANGUAGES',
      ];
      const sections: { [key: string]: any[] } = {};
      let currentSection = '';
      let headerParagraphs: any[] = [];

      // Collect paragraphs by section
      paragraphs.each((i, elem) => {
        const text = $(elem).text().trim();

        // First 3 paragraphs are header (name, title, contact)
        if (i < 3) {
          headerParagraphs.push($(elem));
          return;
        }

        // Check if this is a section title
        if (sectionTitles.includes(text)) {
          currentSection = text;
          sections[currentSection] = [];
          // Use section tag with title class matching template
          const sectionTitle = $(`<section class="title">${text}</section>`);
          sections[currentSection].push(sectionTitle);
        } else if (currentSection) {
          // Add CSS classes based on section type
          if (currentSection === 'CORE COMPETENCIES') {
            $(elem).addClass('competency-item');
            // Make competency categories bold (text before colon)
            const html = $(elem).html() || '';
            const boldedHtml = html.replace(/^([^:]+):/g, '<strong>$1</strong>:');
            $(elem).html(boldedHtml);
          } else if (currentSection === 'PROFESSIONAL EXPERIENCE') {
            const text = $(elem).text().trim();

            // formatting logic:
            // 1. Check for header line (contains '•' not just at start)
            // 2. Check for bullet point (starts with '•')

            // Check if there is a '•' NOT at the very start (indicating a separator)
            const hasInternalBullet = text.substring(1).includes('•');

            if (hasInternalBullet) {
              // This is a company/date line
              $(elem).addClass('experience-header');

              // Clean leading bullet if present (fixes "remove bullet at beginning of dates")
              let contentText = text.replace(/^•\s*/, '');

              // Try to apply bolding pattern: "Job Title COMPANY NAME • Date"
              // The regex replaces everything up to the bullet with the bolded company structure
              let boldedHtml = contentText.replace(
                /.*?([A-Z][A-Z\s&]+)\s+•/g,
                (_match: string, company: string) => {
                  return `<strong class="company-name">${company.trim()}</strong> <span class="job-date">`;
                }
              );

              // If regex didn't match (no change), fallback to simple split to ensure bullet is removed
              if (boldedHtml === contentText) {
                const parts = contentText.split('•');
                if (parts.length >= 2) {
                  const datePart = parts.pop()?.trim();
                  const companyPart = parts.join('•').trim();
                  // Fallback formatting: Bold the company part and wrap date
                  boldedHtml = `<strong class="company-name">${companyPart}</strong> <span class="job-date">${datePart}`;
                }
              }

              // Close the date span (detected by regex or fallback)
              if (boldedHtml.includes('<span class="job-date">')) {
                boldedHtml += '</span>';
              }

              $(elem).html(boldedHtml);
            } else if (text.startsWith('•')) {
              $(elem).addClass('experience-bullet');
              // Ensure blank space after bullet
              const spacedText = text.replace(/^•\s*/, '• ');
              $(elem).text(spacedText);
            }
          }
          sections[currentSection].push($(elem));
        }
      });

      // Reorder contact info: email • phone • LinkedIn • Barcelona
      if (headerParagraphs.length >= 3) {
        const contactP = headerParagraphs[2];
        const contactText = contactP.text();

        // Parse contact info
        const parts = contactText.split('•').map((p: string) => p.trim());
        let email = '',
          phone = '',
          location = '';

        parts.forEach((part: string) => {
          if (part.includes('@')) email = part;
          else if (part.includes('+')) phone = part;
          else if (part.includes('Barcelona') || part.includes('Spain')) location = part;
        });

        // Rebuild in new order: email • phone • LinkedIn • location
        const newContactHtml = `${email} • ${phone} • <a href="https://www.linkedin.com/in/miguelriverolopez/" target="_blank" style="color: inherit; text-decoration: underline;">in/miguelriverolopez</a> • ${location}`;
        contactP.html(newContactHtml);
      }

      // Rebuild content in desired order: Header, Summary, Competencies, Experience, Languages
      $('.content').empty();

      // Add header paragraphs
      headerParagraphs.forEach((p) => $('.content').append(p));

      // Add sections in new order
      const orderedSections = [
        'PROFESSIONAL SUMMARY',
        'CORE COMPETENCIES',
        'PROFESSIONAL EXPERIENCE',
        'LANGUAGES',
      ];
      orderedSections.forEach((sectionName) => {
        if (sections[sectionName]) {
          sections[sectionName].forEach((p) => $('.content').append(p));
        }
      });

      cleanedHtml = $.html();
    }

    validateBaseCvStructure(cleanedHtml);

    const sharedCssPath = path.resolve(config.shared_css);
    if (!(await fileExists(sharedCssPath))) {
      throw new Error(`Shared stylesheet not found: ${sharedCssPath}`);
    }

    // Step 8: Save adapted CV
    const candidateSlug = slugify(config.candidate_name, {
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
    const outputFilenameHtml = generateOutputFilename(jobTitle, candidateSlug, 'html');
    const outputFilenamePdf = generateOutputFilename(jobTitle, candidateSlug, 'pdf');
    const outputPathHtml = path.join(options.outputDir, outputFilenameHtml);
    const outputPathPdf = path.join(options.outputDir, outputFilenamePdf);

    // Always save HTML and copy stylesheet for local preview
    await saveAdaptedCV(cleanedHtml, outputPathHtml, sharedCssPath);

    // Generate PDF unless --html-only is specified or PDF is disabled in config
    if (!options.htmlOnly && config.pdf?.enabled !== false) {
      if (options.verbose) {
        console.log('📄 Generating PDF output...');
      }
      const cssContent = await fs.readFile(sharedCssPath, 'utf-8');
      const htmlForPdf = inlineStylesheet(cleanedHtml, cssContent);
      await generatePdf(htmlForPdf, outputPathPdf);
      if (options.verbose) {
        console.log('✓ PDF generated');
      }
    }

    // Get company name from keywords
    const companyName = keywords.company_name || 'Unknown Company';

    // Display success message with summary
    console.log(`\n✅ Success! CV generated:`);
    console.log(`   HTML → ${outputPathHtml}`);
    if (!options.htmlOnly) {
      console.log(`   PDF  → ${outputPathPdf}`);
    }

    console.log(`\n📊 Adaptation Summary for ${companyName}:`);
    console.log('='.repeat(60));
    console.log(adaptationSummary);
    console.log('='.repeat(60));

    if (options.verbose) {
      console.log(`\nOutput details:`);
      console.log(`  - HTML Filename: ${outputFilenameHtml}`);
      if (!options.htmlOnly) {
        console.log(`  - PDF Filename: ${outputFilenamePdf}`);
      }
      console.log(`  - Size: ${cleanedHtml.length} characters`);
      console.log(`  - Watermark-free: ${validateNoWatermarks(cleanedHtml)}`);
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    // Log the actual error object so stack traces and causes survive.
    console.error(error);
    if (error instanceof Error && error.cause) {
      console.error('Caused by:', error.cause);
    }
    process.exit(1);
  }
}

// Run main function
main();
