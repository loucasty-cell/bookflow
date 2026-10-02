import { describe, expect, it } from 'vitest';

import {
  PANEL_LEGACY_WIDTH,
  PANEL_MAX_PX,
  PANEL_MIN_PX,
  PANEL_RATIO_DEFAULT,
  PANEL_RATIO_MAX,
  PANEL_RATIO_MIN,
  PANEL_REFERENCE_WIDTH,
  clampPanelRatio,
  ratioFromPointer,
  ratioToPercent,
  ratioToPx,
} from './panelRatio.js';

describe('panelRatio bounds', () => {
  it('renders at the width the panel has always used, at the reference width', () => {
    // The whole point of picking a ratio over a pixel count: at the width this
    // was tuned against, it must be indistinguishable from the fixed 294px it
    // replaces. If this fails, the default is wrong, not the test.
    expect(ratioToPx(PANEL_RATIO_DEFAULT, PANEL_REFERENCE_WIDTH)).toBe(PANEL_LEGACY_WIDTH);
  });

  it('keeps min below max and the default inside the domain', () => {
    expect(PANEL_RATIO_MIN).toBeLessThan(PANEL_RATIO_DEFAULT);
    expect(PANEL_RATIO_DEFAULT).toBeLessThan(PANEL_RATIO_MAX);
  });

  it('keeps the CSS guardrails ordered and inside a sane pixel range', () => {
    expect(PANEL_MIN_PX).toBeLessThan(PANEL_LEGACY_WIDTH);
    expect(PANEL_LEGACY_WIDTH).toBeLessThan(PANEL_MAX_PX);
  });

  it('floors wide enough that the navigator does not truncate its own labels', () => {
    // Measured at a 1440 viewport: below this the three-up stats row clips
    // "Bookmarks" and "Sections" to roughly 48px. If this number moves, re-measure
    // rather than trusting the arithmetic.
    expect(PANEL_MIN_PX).toBeGreaterThanOrEqual(280);
  });

  it('agrees with the CSS clamp at the reference width', () => {
    // If the ratio domain and the pixel domain disagree, some viewport exists
    // where the ratio is legal but the pixels are not, or the reverse.
    const minRatioPx = ratioToPx(PANEL_RATIO_MIN, PANEL_REFERENCE_WIDTH);
    const maxRatioPx = ratioToPx(PANEL_RATIO_MAX, PANEL_REFERENCE_WIDTH);
    expect(minRatioPx).toBeLessThan(PANEL_MIN_PX);
    expect(maxRatioPx).toBeGreaterThan(PANEL_MAX_PX);
  });
});

describe('clampPanelRatio', () => {
  it('passes an in-range value through untouched', () => {
    expect(clampPanelRatio(0.25)).toBe(0.25);
    expect(clampPanelRatio(PANEL_RATIO_MIN)).toBe(PANEL_RATIO_MIN);
    expect(clampPanelRatio(PANEL_RATIO_MAX)).toBe(PANEL_RATIO_MAX);
  });

  it('clamps out-of-range values to the nearest bound, not to the default', () => {
    // Dragging past the edge must settle on the edge. Snapping back to the
    // default would make the panel jump while the pointer is still moving.
    expect(clampPanelRatio(0)).toBe(PANEL_RATIO_MIN);
    expect(clampPanelRatio(-3)).toBe(PANEL_RATIO_MIN);
    expect(clampPanelRatio(0.99)).toBe(PANEL_RATIO_MAX);
    expect(clampPanelRatio(42)).toBe(PANEL_RATIO_MAX);
  });

  it('falls back to the default for anything that is not a number', () => {
    for (const bad of [undefined, null, '', 'abc', {}, [], NaN, Infinity, -Infinity, true]) {
      expect(clampPanelRatio(bad), `input ${JSON.stringify(bad)}`).toBe(PANEL_RATIO_DEFAULT);
    }
  });

  it('accepts a numeric string, because storage round-trips as one', () => {
    expect(clampPanelRatio('0.25')).toBe(0.25);
    expect(clampPanelRatio('0')).toBe(PANEL_RATIO_MIN);
    expect(clampPanelRatio('  0.3  ')).toBe(0.3);
  });
});

describe('ratioFromPointer', () => {
  it('maps a pointer position to the fraction of the layout it occupies', () => {
    expect(ratioFromPointer(360, 1440)).toBeCloseTo(0.25, 6);
  });

  it('clamps a drag that runs past either edge of the layout', () => {
    expect(ratioFromPointer(-200, 1440)).toBe(PANEL_RATIO_MIN);
    expect(ratioFromPointer(99999, 1440)).toBe(PANEL_RATIO_MAX);
  });

  it('falls back to the default when the layout width is unusable', () => {
    for (const bad of [0, -1, NaN, undefined, null, 'wide']) {
      expect(ratioFromPointer(300, bad), `width ${bad}`).toBe(PANEL_RATIO_DEFAULT);
    }
  });
});

describe('ratioToPercent', () => {
  it('emits a bare percentage so it can be dropped into calc()', () => {
    expect(ratioToPercent(0.25)).toBe('25%');
  });

  it('clamps before formatting, so the string is always legal CSS', () => {
    expect(ratioToPercent(5)).toBe(`${PANEL_RATIO_MAX * 100}%`);
    expect(ratioToPercent('nope')).toBe(`${PANEL_RATIO_DEFAULT * 100}%`);
  });
});

describe('ratioToPx', () => {
  it('rounds, because the readout is for a human and for assistive tech', () => {
    expect(ratioToPx(0.2045, 1440)).toBe(294);
  });

  it('reports 0 rather than NaN for an unusable layout width', () => {
    expect(ratioToPx(0.25, 0)).toBe(0);
    expect(ratioToPx(0.25, undefined)).toBe(0);
  });
});