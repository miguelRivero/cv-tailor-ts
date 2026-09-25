/**
 * Each browser keeps one saved CV. The store is injected so tests
 * do not touch a real localStorage.
 */

import type { FrameworkMode } from '../../src/core/config/types';
import {
  SAVED_BASE_CV_KEY,
  applyBaseCvUpload,
  clearSavedBaseCv,
  initialBaseCvChoice,
  readSavedBaseCv,
  replaceSavedBaseCv,
  resolveActiveBaseCv,
  writeSavedBaseCv,
  type KeyValueStore,
  type SavedBaseCv,
} from '../../src/core/savedBaseCv';

function memoryStore(
  initial: Record<string, string> = {}
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

const SAVED: SavedBaseCv = {
  html: '<html><body><div class="content"><p>Ada Lovelace</p></div></body></html>',
  fileName: 'ada.html',
  showFramework: true,
  framework: 'react',
};

describe('saved base CV store', () => {
  it('reads null when this browser has nothing saved', () => {
    expect(readSavedBaseCv(memoryStore())).toBeNull();
  });

  it('round-trips a saved CV', () => {
    const store = memoryStore();
    writeSavedBaseCv(store, SAVED);
    expect(readSavedBaseCv(store)).toEqual(SAVED);
    expect(store.data[SAVED_BASE_CV_KEY]).toContain('Ada Lovelace');
  });

  it('reads null when the stored JSON is corrupt or incomplete', () => {
    expect(readSavedBaseCv(memoryStore({ [SAVED_BASE_CV_KEY]: '{' }))).toBeNull();
    expect(readSavedBaseCv(memoryStore({ [SAVED_BASE_CV_KEY]: '{"html":"x"}' }))).toBeNull();
    expect(
      readSavedBaseCv(
        memoryStore({
          [SAVED_BASE_CV_KEY]: JSON.stringify({ ...SAVED, framework: 'Angular' }),
        })
      )
    ).toBeNull();
  });

  it('clears only this browser record', () => {
    const store = memoryStore();
    writeSavedBaseCv(store, SAVED);
    clearSavedBaseCv(store);
    expect(readSavedBaseCv(store)).toBeNull();
  });
});

describe('saved base CV selection', () => {
  const blank = '<html><body><div class="content"><p>Your Name</p></div></body></html>';

  it('starts on the saved CV when one exists, otherwise the blank template', () => {
    expect(initialBaseCvChoice(SAVED)).toBe('saved');
    expect(initialBaseCvChoice(null)).toBe('blank');
  });

  it('stores the first upload and leaves frontend framing off', () => {
    const result = applyBaseCvUpload(null, { html: '<p>New</p>', fileName: 'new.pdf' });
    expect(result.choice).toBe('saved');
    expect(result.saved).toEqual({
      html: '<p>New</p>',
      fileName: 'new.pdf',
      showFramework: false,
      framework: 'agnostic' satisfies FrameworkMode,
    });
  });

  it('keeps a later upload as this session only', () => {
    const result = applyBaseCvUpload(SAVED, { html: '<p>Try</p>', fileName: 'try.html' });
    expect(result.choice).toBe('custom');
    expect(result.saved).toEqual(SAVED);
    expect(result.customHtml).toBe('<p>Try</p>');
    expect(result.customFileName).toBe('try.html');
  });

  it('replaces the saved CV and keeps the framing preference', () => {
    const replaced = replaceSavedBaseCv(SAVED, { html: '<p>Updated</p>', fileName: 'updated.pdf' });
    expect(replaced).toEqual({
      html: '<p>Updated</p>',
      fileName: 'updated.pdf',
      showFramework: true,
      framework: 'react',
    });
  });

  it('sends framework only for a saved CV with framing on', () => {
    const withFraming = resolveActiveBaseCv({
      choice: 'saved',
      saved: SAVED,
      blankHtml: blank,
    });
    expect(withFraming.framework).toBe('react');
    expect(withFraming.useConfiguredName).toBe(false);
    expect(withFraming.html).toBe(SAVED.html);

    const withoutFraming = resolveActiveBaseCv({
      choice: 'saved',
      saved: { ...SAVED, showFramework: false },
      blankHtml: blank,
    });
    expect(withoutFraming.framework).toBeUndefined();
  });

  it('omits framework for the blank template and a session upload', () => {
    const blankChoice = resolveActiveBaseCv({ choice: 'blank', saved: SAVED, blankHtml: blank });
    expect(blankChoice.html).toBe(blank);
    expect(blankChoice.framework).toBeUndefined();
    expect(blankChoice.useConfiguredName).toBe(false);

    const custom = resolveActiveBaseCv({
      choice: 'custom',
      saved: SAVED,
      blankHtml: blank,
      customHtml: '<p>Session</p>',
    });
    expect(custom.html).toBe('<p>Session</p>');
    expect(custom.framework).toBeUndefined();
  });

  it('falls back to the blank template when the saved record is missing', () => {
    const active = resolveActiveBaseCv({ choice: 'saved', saved: null, blankHtml: blank });
    expect(active.html).toBe(blank);
    expect(active.framework).toBeUndefined();
  });
});
