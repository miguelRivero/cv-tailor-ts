/**
 * File utility functions.
 * generateOutputFilename moved to src/core/naming/filenames.ts, since it
 * has no filesystem dependency and is needed by the web app too.
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
 * Save adapted CV to file and copy shared stylesheet alongside it.
 */
export async function saveAdaptedCV(
  content: string,
  outputPath: string,
  sharedCssPath?: string
): Promise<void> {
  try {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(outputPath, content, 'utf-8');

    if (sharedCssPath) {
      const cssDest = path.join(dir, 'shared.css');
      await fs.copyFile(sharedCssPath, cssDest);
    }
  } catch (error) {
    throw new Error(`Failed to save adapted CV: ${error}`);
  }
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
