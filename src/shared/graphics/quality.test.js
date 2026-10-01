import { describe, expect, it } from 'vitest';
import { GRAPHICS_BREAKPOINT, QUALITY_TIERS, getGraphicsQuality } from './quality.js';

const NARROW_QUERY = `(max-width: ${GRAPHICS_BREAKPOINT}px)`;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const NUMERIC_KEYS = ['dpr', 'particles', 'glyphs', 'targetFps'];

function makeWin({
  reduced = false,
  narrow = false,
  touch = 0,
  cores = 8,
  memory = 8,
  dpr = 2,
} = {}) {
  return {
    devicePixelRatio: dpr,
    navigator: { maxTouchPoints: touch, hardwareConcurrency: cores, deviceMemory: memory },
    matchMedia(query) {
      if (query === REDUCED_QUERY) return { matches: reduced };
      if (query === NARROW_QUERY) return { matches: narrow };
      return { matches: false };
    },
  };
}

describe('getGraphicsQuality', () => {
  it('returns a complete shape for every input', () => {
    const wins = [null, makeWin(), makeWin({ reduced: true }), makeWin({ narrow: true })];
    for (const win of wins) {
      const quality = getGraphicsQuality(win);
      expect(Object.keys(quality).sort()).toEqual(
        ['tier', ...NUMERIC_KEYS].sort()
      );
      expect(typeof quality.tier).toBe('string');
      expect(Object.values(QUALITY_TIERS)).toContain(quality.tier);
      for (const key of NUMERIC_KEYS) {
        expect(typeof quality[key], key).toBe('number');
        expect(Number.isFinite(quality[key]), key).toBe(true);
        expect(quality[key], key).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('falls back to the static tier with no window', () => {
    const quality = getGraphicsQuality(null);
    expect(quality.tier).toBe(QUALITY_TIERS.STATIC);
    expect(quality.targetFps).toBe(0);
    expect(quality.particles).toBe(0);
    expect(quality.dpr).toBe(1);
  });

  it('honours prefers-reduced-motion above every other signal', () => {
    const quality = getGraphicsQuality(
      makeWin({ reduced: true, narrow: false, touch: 0, cores: 16, memory: 16, dpr: 3 })
    );
    expect(quality.tier).toBe(QUALITY_TIERS.STATIC);
    expect(quality.targetFps).toBe(0);
    expect(quality.particles).toBe(0);
    expect(quality.dpr).toBe(1);
  });

  it('drops to balanced on a narrow viewport', () => {
    const quality = getGraphicsQuality(makeWin({ narrow: true }));
    expect(quality.tier).toBe(QUALITY_TIERS.BALANCED);
    expect(quality.targetFps).toBe(30);
    expect(quality.particles).toBe(18);
    expect(quality.glyphs).toBe(22);
  });

  it('drops to balanced on a touch device', () => {
    expect(getGraphicsQuality(makeWin({ touch: 5 })).tier).toBe(QUALITY_TIERS.BALANCED);
  });

  it('drops to balanced on few cores', () => {
    expect(getGraphicsQuality(makeWin({ cores: 2 })).tier).toBe(QUALITY_TIERS.BALANCED);
  });

  it('drops to balanced on low memory', () => {
    expect(getGraphicsQuality(makeWin({ memory: 1 })).tier).toBe(QUALITY_TIERS.BALANCED);
  });

  it('keeps the full tier on a capable device', () => {
    const quality = getGraphicsQuality(makeWin({ cores: 8, memory: 8, dpr: 2 }));
    expect(quality.tier).toBe(QUALITY_TIERS.FULL);
    expect(quality.targetFps).toBe(60);
    expect(quality.particles).toBe(32);
    expect(quality.glyphs).toBe(38);
  });

  it('caps device pixel ratio per tier', () => {
    expect(getGraphicsQuality(makeWin({ dpr: 3 })).dpr).toBe(1.75);
    expect(getGraphicsQuality(makeWin({ narrow: true, dpr: 3 })).dpr).toBe(1.25);
    expect(getGraphicsQuality(makeWin({ dpr: 1 })).dpr).toBe(1);
    expect(getGraphicsQuality(makeWin({ dpr: 1.5 })).dpr).toBe(1.5);
  });

  it('survives hostile navigator values without throwing', () => {
    const hostile = {
      devicePixelRatio: -4,
      navigator: { maxTouchPoints: 'lots', hardwareConcurrency: NaN, deviceMemory: Infinity },
      matchMedia: () => {
        throw new Error('unsupported query');
      },
    };
    const quality = getGraphicsQuality(hostile);
    expect(quality.tier).toBe(QUALITY_TIERS.FULL);
    expect(quality.dpr).toBe(1);
  });

  it('treats a window without matchMedia as capable rather than crashing', () => {
    const quality = getGraphicsQuality({ devicePixelRatio: 2, navigator: {} });
    expect(quality.tier).toBe(QUALITY_TIERS.FULL);
    expect(quality.dpr).toBe(1.75);
  });

  it('never returns a negative or fractional count', () => {
    for (const win of [null, makeWin(), makeWin({ reduced: true }), makeWin({ narrow: true })]) {
      const quality = getGraphicsQuality(win);
      expect(Number.isInteger(quality.particles)).toBe(true);
      expect(Number.isInteger(quality.glyphs)).toBe(true);
      expect(Number.isInteger(quality.targetFps)).toBe(true);
      expect(quality.dpr).toBeGreaterThanOrEqual(1);
    }
  });
});
