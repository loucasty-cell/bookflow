import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  lookup,
  hasDefinition,
  suggest,
  allWords,
  loadLicensedDictionary,
  getDictionarySource,
  resetDictionaryCache,
} from './dictionary.js';

beforeEach(() => {
  resetDictionaryCache();
  vi.unstubAllGlobals();
});

describe('dictionary starter lexicon', () => {
  it('looks up a known word locally', () => {
    const entry = lookup('focus');
    expect(entry?.word).toBe('focus');
    expect(entry.definitions.length).toBeGreaterThan(0);
  });

  it('returns null for unknown words instead of fabricating', () => {
    expect(lookup('quizzaciously')).toBeNull();
    expect(hasDefinition('quizzaciously')).toBe(false);
  });

  it('suggests by prefix and lists vocabulary in stable order', () => {
    expect(suggest('rea')).toContain('reading');
    const words = allWords();
    expect(words).toEqual([...words].sort());
  });
});

describe('licensed dictionary loader', () => {
  it('merges a licensed payload locally without network leakage', async () => {
    const licensed = [
      { word: 'serendipity', partOfSpeech: 'noun', definitions: ['Finding something good without looking for it.'] },
      { word: '', definitions: [] },
    ];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => licensed })));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(lookup('serendipity')?.definitions[0]).toMatch(/good without looking/);
    expect(lookup('focus')).not.toBeNull();
    expect(getDictionarySource()).toBe('licensed');
  });

  it('falls back to starter when licensed file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(lookup('focus')).not.toBeNull();
    expect(getDictionarySource()).toBe('starter');
  });

  it('rejects malformed licensed entries', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{ word: 'x' }] })));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(lookup('x')).toBeNull();
  });

  it('lets licensed entries correct the starter lexicon', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ word: 'focus', partOfSpeech: 'verb', definitions: ['Licensed verb sense.'] }],
    })));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(lookup('focus')?.partOfSpeech).toBe('verb');
    expect(getDictionarySource()).toBe('licensed');
  });

  it('retries after a failed fetch instead of latching', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(getDictionarySource()).toBe('starter');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ word: 'lumen', partOfSpeech: 'noun', definitions: ['A unit of light.'] }],
    })));
    await loadLicensedDictionary('dictionary/licensed.json');
    expect(lookup('lumen')?.definitions[0]).toMatch(/light/);
  });

  it('finds words despite apostrophes', () => {
    expect(lookup("don't")).toBeNull();
    expect(lookup('focus!')).not.toBeNull();
  });
});
