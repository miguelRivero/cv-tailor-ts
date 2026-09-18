/**
 * Config shape shared by the CLI, the web app and the worker.
 *
 * These fields are camelCase. config.yaml (read only by the CLI, see
 * src/node/config/loadConfig.ts) stays snake_case for backwards
 * compatibility; loadConfig() is the one place that translates between
 * the two.
 */

export type FrameworkMode = 'react' | 'vue' | 'agnostic';

export interface CoreConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  candidateName: string;
  watermarkKeywords: string[];
}
