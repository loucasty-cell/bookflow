import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../../../shared/lib/index.js';
import {
  LENS_BAR_MODES,
  LENS_BAR_STORAGE_KEY,
  readLensBarPreferences,
  useLensBarStore,
} from './lensBarStore.js';

const DEFAULT_RATIO = { fx: 0.5, fy: 1 };

function reset() {
  memoryStorage.clear();
  useLensBarStore.setState({
    open: false,
    collapsed: false,
    ratio: { ...DEFAULT_RATIO },
    mode: 'smart',
    language: 'English',
  });
}

beforeEach(reset);

describe('lensBarStore defaults', () => {
  it('starts closed, centred at the bottom, in smart mode', () => {
    expect(useLensBarStore.getState().open).toBe(false);
    expect(useLensBarStore.getState().collapsed).toBe(false);
    expect(useLensBarStore.getState().mode).toBe('smart');
    expect(useLensBarStore.getState().language).toBe('English');
    expect(useLensBarStore.getState().ratio).toEqual({ fx: 0.5, fy: 1 });
  });

  it('opens and collapses through explicit setters only', () => {
    useLensBarStore.getState().setOpen(true);
    expect(useLensBarStore.getState().open).toBe(true);
    useLensBarStore.getState().setCollapsed(true);
    expect(useLensBarStore.getState().collapsed).toBe(true);
  });

  it('coerces open and collapsed to booleans', () => {
    useLensBarStore.getState().setOpen('yes');
    expect(useLensBarStore.getState().open).toBe(true);
    useLensBarStore.getState().setCollapsed(0);
    expect(useLensBarStore.getState().collapsed).toBe(false);
  });
});

describe('lensBarStore persistence', () => {
  it('persists ratio, mode and language and nothing else', () => {
    useLensBarStore.getState().setRatio({ fx: 0.25, fy: 0.75 });
    useLensBarStore.getState().setMode('translate');
    useLensBarStore.getState().setLanguage('Japanese');

    const stored = JSON.parse(memoryStorage.getItem(LENS_BAR_STORAGE_KEY));
    expect(Object.keys(stored).sort()).toEqual(['language', 'mode', 'ratio']);
    expect(stored.ratio).toEqual({ fx: 0.25, fy: 0.75 });
    expect(stored.mode).toBe('translate');
    expect(stored.language).toBe('Japanese');
  });

  it('never stores an open bar or a question', () => {
    useLensBarStore.getState().setRatio({ fx: 0.3, fy: 0.3 });
    useLensBarStore.getState().setOpen(true);
    const stored = JSON.parse(memoryStorage.getItem(LENS_BAR_STORAGE_KEY));
    expect(stored).not.toHaveProperty('open');
    expect(stored).not.toHaveProperty('question');
    expect(stored).not.toHaveProperty('consent');
  });
});

describe('readLensBarPreferences hostile payloads', () => {
  it('returns nothing for a non-object', () => {
    expect(readLensBarPreferences(null)).toEqual({});
    expect(readLensBarPreferences(undefined)).toEqual({});
    expect(readLensBarPreferences('a string')).toEqual({});
    expect(readLensBarPreferences(42)).toEqual({});
  });

  it('returns nothing for an array', () => {
    expect(readLensBarPreferences([1, 2, 3])).toEqual({});
  });

  it('rejects wrong field types', () => {
    expect(readLensBarPreferences({ ratio: 'left', mode: 7, language: { evil: true } })).toEqual({
      ratio: DEFAULT_RATIO,
      mode: 'smart',
      language: 'English',
    });
  });

  it('rejects NaN and out-of-range ratios', () => {
    expect(readLensBarPreferences({ ratio: { fx: Number.NaN, fy: 0.5 } }).ratio).toEqual(DEFAULT_RATIO);
    expect(readLensBarPreferences({ ratio: { fx: -4, fy: 9 } }).ratio).toEqual({ fx: 0, fy: 1 });
    expect(readLensBarPreferences({ ratio: null }).ratio).toEqual(DEFAULT_RATIO);
  });

  it('accepts a valid in-range ratio', () => {
    expect(readLensBarPreferences({ ratio: { fx: 0.25, fy: 0.75 } }).ratio).toEqual({ fx: 0.25, fy: 0.75 });
  });

  it('rejects an unknown mode', () => {
    expect(readLensBarPreferences({ mode: 'exfiltrate' }).mode).toBe('smart');
  });

  it('accepts every declared mode', () => {
    for (const mode of LENS_BAR_MODES) {
      expect(readLensBarPreferences({ mode }).mode).toBe(mode);
    }
  });

  it('ignores a prototype pollution attempt', () => {
    const parsed = JSON.parse('{"mode":"ask","__proto__":{"polluted":true}}');
    expect(readLensBarPreferences(parsed).mode).toBe('ask');
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });

  it('survives a very large language string', () => {
    expect(readLensBarPreferences({ language: 'x'.repeat(200000) }).language).toHaveLength(40);
  });

  it('rejects a blank language', () => {
    expect(readLensBarPreferences({ language: '   ' }).language).toBe('English');
  });

  it('truncates an over-long language on write too', () => {
    useLensBarStore.getState().setLanguage('y'.repeat(500));
    expect(useLensBarStore.getState().language).toHaveLength(40);
  });
});

describe('lensBarStore setters reject bad input', () => {
  it('ignores an unknown mode', () => {
    useLensBarStore.getState().setMode('not-a-mode');
    expect(useLensBarStore.getState().mode).toBe('smart');
  });

  it('accepts every declared mode', () => {
    for (const mode of LENS_BAR_MODES) {
      useLensBarStore.getState().setMode(mode);
      expect(useLensBarStore.getState().mode).toBe(mode);
    }
  });

  it('clamps a hostile ratio on set', () => {
    useLensBarStore.getState().setRatio({ fx: 12, fy: -3 });
    expect(useLensBarStore.getState().ratio).toEqual({ fx: 1, fy: 0 });
    useLensBarStore.getState().setRatio(undefined);
    expect(useLensBarStore.getState().ratio).toEqual({ fx: 0.5, fy: 1 });
  });

  it('coerces a hostile language to a bounded string', () => {
    useLensBarStore.getState().setLanguage(null);
    expect(useLensBarStore.getState().language).toBe('');
  });
});
