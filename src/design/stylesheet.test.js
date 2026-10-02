import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const aggregator = readFileSync(join(SRC, 'styles.css'), 'utf8');
const a11y = readFileSync(join(SRC, 'styles/a11y.css'), 'utf8');

/**
 * Style sheet contract guard.
 *
 * Import order and the global fallback layer are load-bearing, and both are the
 * kind of thing that breaks silently: a reordered @import or an edited fallback
 * still renders, just wrongly, with no test failing anywhere else.
 *
 * The typography floor lives in typography.test.js. These are the two rules that
 * nothing else in the suite would catch.
 */

function imports() {
  return [...aggregator.matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
}

describe('style sheet import order', () => {
  it('imports a11y.css last so its fallbacks win at equal specificity', () => {
    const list = imports();
    expect(list.length).toBeGreaterThan(0);
    expect(list[list.length - 1]).toContain('a11y.css');
  });

  it('imports tailwind before tokens so the radius scale is not overridden', () => {
    const list = imports();
    const tailwind = list.findIndex((p) => p.includes('tailwind.css'));
    const tokens = list.findIndex((p) => p.includes('tokens.css'));
    expect(tailwind).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(tailwind, 'tailwind must be imported before tokens').toBeLessThan(tokens);
  });
});

describe('accessibility fallback layer', () => {
  it('strips every backdrop blur under reduced transparency', () => {
    // A global universal selector is the only thing that keeps this honest as
    // new glass surfaces are added, so assert the guarantee structurally rather
    // than trying to enumerate the surfaces by hand. The selector is matched
    // literally: `*::after` means the unprefixed `* {` shorthand pattern would
    // never match, and `-webkit-backdrop-filter` would satisfy a loose search on
    // its own, so both are pinned here.
    const block = a11y.match(/@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/);
    expect(block, 'a11y.css must define a prefers-reduced-transparency block').not.toBeNull();
    expect(block[1]).toMatch(
      /^\s*\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?\n\s*backdrop-filter:\s*none\s*!important/m,
    );
  });

  it('restores a solid surface wherever a blurred one was carrying text', () => {
    const block = a11y.match(/@media \(prefers-reduced-transparency: reduce\) \{([\s\S]*?)\n\}/);
    expect(block[1]).toContain('--chrome-solid');
  });

  it('strips blur under forced colors and borrows the system highlight', () => {
    const block = a11y.match(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/);
    expect(block, 'a11y.css must define a forced-colors block').not.toBeNull();
    expect(block[1]).toMatch(/^\s*\*,\s*\*::before,\s*\*::after\s*\{/m);
    expect(block[1]).toContain('Highlight');
  });

  it('strengthens the hairline under prefers-contrast', () => {
    const block = a11y.match(/@media \(prefers-contrast: more\) \{([\s\S]*?)\n\}/);
    expect(block, 'a11y.css must define a prefers-contrast block').not.toBeNull();
    expect(block[1]).toContain('--hairline');
  });
});