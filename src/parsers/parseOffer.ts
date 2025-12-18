/**
 * Job offer parsing module
 * Migrated from parse_offer.py
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

/**
 * Fetch and extract text content from a job offer URL
 */
export async function parseOfferFromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style').remove();

    // Get text
    const text = $('body').text();

    // Break into lines and remove leading/trailing space
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Join with newlines
    return lines.join('\n');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch job offer from URL: ${error.message}`);
    }
    throw new Error(`Failed to parse job offer from URL: ${error}`);
  }
}

/**
 * Read job offer text from a file
 */
export async function parseOfferFromFile(filepath: string): Promise<string> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read job offer file: ${error}`);
  }
}
