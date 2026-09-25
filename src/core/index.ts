/**
 * Barrel export for the browser-safe core.
 *
 * Everything reachable from here has no dependency on fs, path,
 * process, the openai SDK or puppeteer, and is safe to import from the
 * CLI (src/index.ts), the Vite web app, and the Cloudflare Worker alike.
 */

export * from './config/types.js';
export * from './config/defaults.js';
export * from './types/keywords.js';
export * from './types/api.js';
export * from './prompts/adaptCv.js';
export * from './prompts/extractKeywords.js';
export * from './prompts/extractTitle.js';
export * from './html/cvStructure.js';
export * from './html/pdfText.js';
export * from './savedBaseCv.js';
export * from './filters/watermarkFilter.js';
export * from './naming/filenames.js';
export * from './pipeline/postProcess.js';
export * from './pipeline/machine.js';
