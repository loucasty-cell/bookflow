import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BASE_UNIT,
  ELEVATION,
  GOLDEN_RATIO,
  HIT_TARGET,
  RADIUS,
  RADIUS_PILL,
  SPACING,
  TYPE_SCALE,
  Z_INDEX,
  expectedTokens,
} from './geometry.ts';

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(resolve(here, '../styles/tokens.css'), 'utf8');

/**
 * Reads the :root block only. Theme blocks are allowed to redeclare a token,
 * but the base scale must be declared exactly once, here.
 */
function parseRootBlock(css) {
  const start = css.indexOf(':root');
  if (start === -1) throw new Error('tokens.css has no :root block');
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open + 1, close);
}

function declaredTokens(block) {
  const found = new Map();
  // The unit is captured, not assumed: z-index tokens are unitless while every
  // length token must carry px. Asserting that separately is the point.
  const pattern = /(--[a-z0-9-]+)\s*:\s*(-?\d+(?:\.\d+)?)(px)?\s*;/gi;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    found.set(match[1], {
      value: Number.parseFloat(match[2]),
      unit: match[3] ?? '',
    });
  }
  return found;
}

const declared = declaredTokens(parseRootBlock(tokensCss));

describe('geometry', () => {
  it('is a whole-multiple spacing scale', () => {
    for (const [name, value] of Object.entries(SPACING)) {
      expect(value % BASE_UNIT, `${name} must be a multiple of ${BASE_UNIT}`).toBe(0);
      expect(value).toBeGreaterThan(0);
    }
  });

  it('keeps the spacing scale ascending', () => {
    const values = Object.values(SPACING);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('keeps the radius scale ascending and inside the documented range', () => {
    const values = Object.values(RADIUS);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(values.every((value) => value >= 6 && value <= 28)).toBe(true);
  });

  it('uses the documented type scale exactly', () => {
    // Minor third (1.2) anchored at 16px, rounded to whole px. Rounding is
    // what compresses the small steps: the documented run's tightest ratio is
    // 16/14 = 1.143, so a strict 1.2 floor would fail the spec's own numbers.
    expect(Object.values(TYPE_SCALE).map((step) => step.size)).toEqual([
      12, 14, 16, 19, 23, 28, 33,
    ]);
  });

  it('keeps the type scale ascending and ratios at or above the rounded floor', () => {
    const steps = Object.values(TYPE_SCALE);
    const sizes = steps.map((step) => step.size);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);

    for (let i = 1; i < sizes.length; i += 1) {
      const ratio = sizes[i] / sizes[i - 1];
      expect(ratio, `step ${i} ratio ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(1.14);
    }
  });

  it('keeps every type line-height on the 4px grid', () => {
    for (const [name, step] of Object.entries(TYPE_SCALE)) {
      expect(step.lineHeight % BASE_UNIT, `${name} line-height must sit on the grid`).toBe(0);
      expect(step.lineHeight).toBeGreaterThanOrEqual(step.size);
    }
  });

  it('keeps the z scale strictly ascending with no duplicate values', () => {
    const values = Object.values(Z_INDEX);
    const sorted = [...values].sort((a, b) => a - b);
    expect(sorted).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });

  it('holds the documented invariants', () => {
    expect(BASE_UNIT).toBe(4);
    expect(HIT_TARGET).toBeGreaterThanOrEqual(44);
    expect(RADIUS_PILL).toBeGreaterThan(RADIUS['--radius-xl']);
    expect(GOLDEN_RATIO).toBeCloseTo(1.618, 3);
    expect(Object.keys(ELEVATION)).toEqual(['flat', 'card', 'popover', 'sheet']);
  });
});

describe('geometry and tokens.css agree', () => {
  const expected = expectedTokens();

  it('declares every geometry token in :root', () => {
    const missing = Object.keys(expected).filter((name) => !declared.has(name));
    expect(missing, `tokens.css is missing: ${missing.join(', ')}`).toEqual([]);
  });

  it('matches every value exactly', () => {
    const drifted = [];
    for (const [name, value] of Object.entries(expected)) {
      const actual = declared.get(name);
      if (!actual || actual.value !== value) {
        drifted.push(`${name}: geometry ${value} vs css ${actual?.value ?? 'undefined'}`);
      }
    }
    expect(drifted, `token drift:\n${drifted.join('\n')}`).toEqual([]);
  });

  it('declares z-index tokens unitless and every length token in px', () => {
    const wrong = [];
    for (const [name, entry] of declared) {
      const isZ = Object.prototype.hasOwnProperty.call(Z_INDEX, name);
      if (isZ && entry.unit !== '') wrong.push(`${name} must be unitless, found "${entry.unit}"`);
      if (!isZ && entry.unit !== 'px') wrong.push(`${name} must be px, found "${entry.unit}"`);
    }
    expect(wrong, `unit errors:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('uses no z-index literal outside the scale', () => {
    const literals = tokensCss.match(/z-index:\s*(-?\d+)/g) ?? [];
    expect(literals, 'z-index in tokens.css must use a token').toEqual([]);
  });
});