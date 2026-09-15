/**
 * CLI configuration loader.
 *
 * config.yaml is the CLI's override layer on top of DEFAULT_CORE_CONFIG
 * (src/core/config/defaults.ts): any field present in the YAML wins,
 * anything absent falls back to the shared default so the CLI, the web
 * app and the worker cannot silently drift apart. This is the one place
 * that translates the YAML's snake_case keys into the camelCase
 * CoreConfig shape used everywhere else.
 */

import fs from 'fs';
import yaml from 'js-yaml';
import { CoreConfig } from '../../core/config/types.js';
import { DEFAULT_CORE_CONFIG } from '../../core/config/defaults.js';

export interface PdfConfig {
  enabled: boolean;
  format: string;
  printBackground: boolean;
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

export interface NodeConfig extends CoreConfig {
  baseCv: string;
  sharedCss: string;
  fallbackCv: string;
  outputDir: string;
  offersDir: string;
  pdf: PdfConfig;
}

interface RawYamlConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  base_cv?: string;
  shared_css?: string;
  fallback_cv?: string;
  output_dir?: string;
  offers_dir?: string;
  watermark_keywords?: string[];
  candidate_name?: string;
  pdf?: {
    enabled?: boolean;
    format?: string;
    print_background?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };
}

const DEFAULT_PDF: PdfConfig = {
  enabled: true,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
};

let cachedConfig: NodeConfig | null = null;
let cachedConfigPath: string | null = null;

/**
 * Load configuration from config.yaml, merged over DEFAULT_CORE_CONFIG.
 */
export function loadConfig(configPath: string = 'config.yaml'): NodeConfig {
  if (cachedConfig && cachedConfigPath === configPath) {
    return cachedConfig;
  }

  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const raw = (yaml.load(fileContents) || {}) as RawYamlConfig;

    const config: NodeConfig = {
      model: raw.model ?? DEFAULT_CORE_CONFIG.model,
      temperature: raw.temperature ?? DEFAULT_CORE_CONFIG.temperature,
      maxTokens: raw.max_tokens ?? DEFAULT_CORE_CONFIG.maxTokens,
      candidateName: raw.candidate_name ?? DEFAULT_CORE_CONFIG.candidateName,
      watermarkKeywords: raw.watermark_keywords ?? DEFAULT_CORE_CONFIG.watermarkKeywords,
      baseCv: raw.base_cv ?? 'original/MR_cv_base.html',
      sharedCss: raw.shared_css ?? 'original/shared.css',
      fallbackCv: raw.fallback_cv ?? 'original/MR_cv_athenailabs.html',
      outputDir: raw.output_dir ?? 'output',
      offersDir: raw.offers_dir ?? 'offers',
      pdf: raw.pdf
        ? {
            enabled: raw.pdf.enabled ?? DEFAULT_PDF.enabled,
            format: raw.pdf.format ?? DEFAULT_PDF.format,
            printBackground: raw.pdf.print_background ?? DEFAULT_PDF.printBackground,
            margin: {
              top: raw.pdf.margin?.top ?? DEFAULT_PDF.margin.top,
              right: raw.pdf.margin?.right ?? DEFAULT_PDF.margin.right,
              bottom: raw.pdf.margin?.bottom ?? DEFAULT_PDF.margin.bottom,
              left: raw.pdf.margin?.left ?? DEFAULT_PDF.margin.left,
            },
          }
        : DEFAULT_PDF,
    };

    cachedConfig = config;
    cachedConfigPath = configPath;
    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${configPath}`, {
      cause: error,
    });
  }
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}
