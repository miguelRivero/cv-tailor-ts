/**
 * One saved base CV per browser. The page passes localStorage; tests
 * pass a memory store. Nothing here is sent to the worker until Generate.
 */

import type { FrameworkMode } from './config/types.js';

const FRAMEWORK_MODES = new Set<FrameworkMode>(['react', 'vue', 'agnostic']);

export const SAVED_BASE_CV_KEY = 'cv-tailor.savedBaseCv';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedBaseCv {
  html: string;
  fileName: string;
  showFramework: boolean;
  framework: FrameworkMode;
}

export type WebBaseCvChoice = 'saved' | 'blank' | 'custom';

export interface BaseCvUpload {
  html: string;
  fileName: string;
}

function isFrameworkMode(value: unknown): value is FrameworkMode {
  return typeof value === 'string' && FRAMEWORK_MODES.has(value as FrameworkMode);
}

function isSavedBaseCv(value: unknown): value is SavedBaseCv {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<SavedBaseCv>;
  return (
    typeof candidate.html === 'string' &&
    candidate.html.length > 0 &&
    typeof candidate.fileName === 'string' &&
    candidate.fileName.length > 0 &&
    typeof candidate.showFramework === 'boolean' &&
    isFrameworkMode(candidate.framework)
  );
}

export function readSavedBaseCv(store: KeyValueStore): SavedBaseCv | null {
  const raw = store.getItem(SAVED_BASE_CV_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSavedBaseCv(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSavedBaseCv(store: KeyValueStore, cv: SavedBaseCv): void {
  store.setItem(SAVED_BASE_CV_KEY, JSON.stringify(cv));
}

export function clearSavedBaseCv(store: KeyValueStore): void {
  store.removeItem(SAVED_BASE_CV_KEY);
}

export function initialBaseCvChoice(saved: SavedBaseCv | null): WebBaseCvChoice {
  return saved ? 'saved' : 'blank';
}

/**
 * The first upload in a browser becomes the saved CV, with frontend
 * framing off. A later upload stays on this session until the visitor
 * replaces the saved CV.
 */
export function applyBaseCvUpload(
  saved: SavedBaseCv | null,
  upload: BaseCvUpload
): {
  choice: 'saved' | 'custom';
  saved: SavedBaseCv | null;
  customHtml?: string;
  customFileName?: string;
} {
  if (!saved) {
    return {
      choice: 'saved',
      saved: {
        html: upload.html,
        fileName: upload.fileName,
        showFramework: false,
        framework: 'agnostic',
      },
    };
  }
  return {
    choice: 'custom',
    saved,
    customHtml: upload.html,
    customFileName: upload.fileName,
  };
}

export function replaceSavedBaseCv(
  previous: SavedBaseCv | null,
  upload: BaseCvUpload
): SavedBaseCv {
  return {
    html: upload.html,
    fileName: upload.fileName,
    showFramework: previous?.showFramework ?? false,
    framework: previous?.framework ?? 'agnostic',
  };
}

export function resolveActiveBaseCv(input: {
  choice: WebBaseCvChoice;
  saved: SavedBaseCv | null;
  blankHtml: string;
  customHtml?: string;
}): { html: string; framework?: FrameworkMode; useConfiguredName: false } {
  if (input.choice === 'custom' && input.customHtml) {
    return { html: input.customHtml, useConfiguredName: false };
  }
  if (input.choice === 'saved' && input.saved) {
    return {
      html: input.saved.html,
      framework: input.saved.showFramework ? input.saved.framework : undefined,
      useConfiguredName: false,
    };
  }
  return { html: input.blankHtml, useConfiguredName: false };
}
