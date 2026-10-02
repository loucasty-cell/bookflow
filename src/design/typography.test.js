import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { TYPE_SCALE } from './geometry.ts';

const SRC = join(process.cwd(), 'src');

/** The floor. geometry.ts is the single source, so read it rather than repeat it. */
const FLOOR_PX = TYPE_SCALE['--ui-caption'].size;

const FLOOR_TOKEN = 'var(--ui-caption)';

/**
 * Typography floor guard.
 *
 * There were 146 hardcoded font sizes at or below the 12px floor across 11
 * stylesheets, from 8px to 12px, including fractional 8.5/9.5/10.5/11.5px
 * values. They are all the --ui-caption token now, which is the bottom of the
 * documented scale. This test exists so the count cannot climb again: the
 * floor is a ratchet, not a suggestion.
 */

function collectCss(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectCss(full));
    } else if (entry.endsWith('.css')) {
      found.push(full);
    }
  }
  return found;
}

function findBelowFloor() {
  const offenders = [];
  for (const file of collectCss(SRC)) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      // Only explicit font-size declarations. A `font:` shorthand is left alone
      // here so this test cannot misread a shorthand as a separate declaration.
      const matches = line.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g);
      for (const match of matches) {
        const value = Number.parseFloat(match[1]);
        if (value < FLOOR_PX) {
          offenders.push(`${relative(SRC, file)}:${index + 1}  ${value}px`);
        }
      }
    });
  }
  return offenders;
}

describe('typography floor', () => {
  it('declares a floor token equal to the smallest step of the scale', () => {
    expect(FLOOR_PX).toBe(12);
  });

  it('has no font-size below the floor anywhere in src', () => {
    const offenders = findBelowFloor();
    expect(
      offenders,
      `font sizes below ${FLOOR_PX}px must use ${FLOOR_TOKEN}:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('uses the floor token rather than repeating the number', () => {
    const raw = [];
    for (const file of collectCss(SRC)) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, index) => {
        if (/font-size:\s*12px/.test(line)) {
          raw.push(`${relative(SRC, file)}:${index + 1}`);
        }
      });
    }
    expect(
      raw,
      `12px is the scale floor, declare it as ${FLOOR_TOKEN}:\n${raw.join('\n')}`,
    ).toEqual([]);
  });
});