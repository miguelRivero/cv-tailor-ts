/**
 * Configuration loader and type definitions
 */

import fs from 'fs';
import yaml from 'js-yaml';

export interface Config {
  model: string;
  temperature: number;
  max_tokens: number;
  base_cv: string;
  fallback_cv: string;
  output_dir: string;
  offers_dir: string;
  preserve_structure: boolean;
  insert_keywords: boolean;
  handle_framework_mismatch: boolean;
  remove_ai_traces: boolean;
  watermark_keywords: string[];
  candidate_name: string;
  pdf?: {
    enabled: boolean;
    format: string;
    print_background: boolean;
    margin: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  };
}

let cachedConfig: Config | null = null;

/**
 * Load configuration from config.yaml
 */
export function loadConfig(configPath: string = 'config.yaml'): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as Config;

    // Set defaults for PDF if not present
    if (!config.pdf) {
      config.pdf = {
        enabled: true,
        format: 'A4',
        print_background: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      };
    }

    cachedConfig = config;
    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error}`);
  }
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
