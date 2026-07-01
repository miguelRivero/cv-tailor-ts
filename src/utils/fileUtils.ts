/**
 * File utility functions
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Load base CV HTML file
 */
export async function loadBaseCV(cvPath: string): Promise<string> {
  try {
    const content = await fs.readFile(cvPath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Base CV not found: ${cvPath}`, { cause: error });
  }
}

/**
 * Save adapted CV to file
 */
export async function saveAdaptedCV(content: string, outputPath: string): Promise<void> {
  try {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(outputPath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save adapted CV: ${error}`);
  }
}

/**
 * Generate output filename based on job title
 */
export function generateOutputFilename(
  jobTitle: string,
  candidateName: string = 'Miguel-Rivero-Lopez',
  extension: string = 'html'
): string {
  return `${candidateName}-${jobTitle}.${extension}`;
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
