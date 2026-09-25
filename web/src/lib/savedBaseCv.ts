/**
 * localStorage binding for the shared saved-CV helpers.
 * One record per browser profile on this origin.
 */

import {
  clearSavedBaseCv,
  readSavedBaseCv,
  writeSavedBaseCv,
  type SavedBaseCv,
} from '@core/savedBaseCv';

const browserStore = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export function loadSavedBaseCv(): SavedBaseCv | null {
  try {
    return readSavedBaseCv(browserStore);
  } catch {
    return null;
  }
}

export function persistSavedBaseCv(cv: SavedBaseCv): void {
  writeSavedBaseCv(browserStore, cv);
}

export function forgetSavedBaseCv(): void {
  clearSavedBaseCv(browserStore);
}
