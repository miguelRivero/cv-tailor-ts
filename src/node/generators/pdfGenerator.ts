/**
 * PDF generation module.
 * Converts HTML CVs to PDF format using Puppeteer - Node-only, there is
 * no browser equivalent (see docs/WEB.md for the print-dialog approach
 * the web app uses instead).
 */

import puppeteer from 'puppeteer';
import { loadConfig } from '../config/loadConfig.js';

export interface PdfOptions {
  format?: string;
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Generate PDF from HTML content
 */
export async function generatePdf(
  htmlContent: string,
  outputPath: string,
  options?: PdfOptions
): Promise<void> {
  const config = loadConfig();
  const pdfConfig = config.pdf;

  // Merge options with config
  const finalOptions = {
    format: options?.format || pdfConfig.format,
    printBackground: options?.printBackground ?? pdfConfig.printBackground,
    margin: {
      top: options?.margin?.top || pdfConfig.margin.top,
      right: options?.margin?.right || pdfConfig.margin.right,
      bottom: options?.margin?.bottom || pdfConfig.margin.bottom,
      left: options?.margin?.left || pdfConfig.margin.left,
    },
  };

  let browser;
  try {
    // Launch headless browser with new headless mode
    browser = await puppeteer.launch({
      headless: 'new' as any,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: 60000,
    });

    const page = await browser.newPage();

    // Set content and wait for resources to load
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: finalOptions.format as any,
      printBackground: finalOptions.printBackground,
      margin: finalOptions.margin,
    });
  } catch (error) {
    console.error('PDF Generation Error Details:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error, null, 2);
      console.error('Error object:', errorMessage);
    } else {
      errorMessage = String(error);
    }

    throw new Error(`Failed to generate PDF: ${errorMessage}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
