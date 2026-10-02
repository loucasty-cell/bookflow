/**
 * WCAG contrast gate for the Bookflow token layer.
 *
 * Reads the real theme token files instead of a duplicated table, so a token
 * change that breaks legibility fails the build rather than shipping.
 *
 * Run: node scripts/security/contrast.mjs
 * Exit: 0 when every measured pair meets its threshold, 1 otherwise.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SOURCES = [
  'src/styles/tokens.css',
  'src/styles/themes.css',
  'src/styles/themes-overrides.css',
];

const BODY_MIN = 4.5;
const LARGE_MIN = 3.0;

const WHITE = { r: 255, g: 255, b: 255, a: 1 };

/**
 * The lens bar is portaled to <body> and themes itself, so its contrast has to
 * be measured from its own block rather than from the app theme layer.
 */
const LENS_SOURCES = ['src/features/lens-bar/lens-bar.css'];
const LENS_PAIRS = [
  { name: 'lens ink on lens bg', fg: '--lens-ink', bg: '--lens-bg', min: BODY_MIN },
  { name: 'lens ink 2 on lens bg', fg: '--lens-ink-2', bg: '--lens-bg', min: BODY_MIN },
  { name: 'lens ink 3 on lens bg', fg: '--lens-ink-3', bg: '--lens-bg', min: BODY_MIN },
  { name: 'lens send ink on send bg', fg: '--lens-send-ink', bg: '--lens-send-bg', min: BODY_MIN },
  { name: 'lens focus on lens raised', fg: '--lens-focus', bg: '--lens-raised', min: LARGE_MIN },
  { name: 'lens ink on lens raised', fg: '--lens-ink', bg: '--lens-raised', min: BODY_MIN },
  { name: 'lens ink 2 on lens raised', fg: '--lens-ink-2', bg: '--lens-raised', min: BODY_MIN },
];

/** Foreground, background, the opaque surface behind it, and the threshold. */
const PAIRS = [
  { name: 'app text on app background', fg: '--app-text', bg: '--app-bg', min: BODY_MIN },
  { name: 'app text on app surface', fg: '--app-text', bg: '--app-surface', min: BODY_MIN },
  { name: 'muted app text on app surface', fg: '--app-text-muted', bg: '--app-surface', min: BODY_MIN },
  { name: 'reader text on reader card', fg: '--reader-text', bg: '--reader-card-bg', min: BODY_MIN },
  { name: 'reader text on reader background', fg: '--reader-text', bg: '--reader-bg', min: BODY_MIN },
  { name: 'muted reader text on reader background', fg: '--reader-muted', bg: '--reader-bg', min: BODY_MIN },
  { name: 'sidebar text on sidebar background', fg: '--sidebar-text', bg: '--sidebar-bg', min: BODY_MIN },
  { name: 'muted sidebar text on sidebar background', fg: '--sidebar-muted', bg: '--sidebar-bg', min: BODY_MIN },
  { name: 'accent on app background', fg: '--accent', bg: '--app-bg', min: LARGE_MIN },
  { name: 'focus edge on focus background', fg: '--focus-edge', bg: '--focus-bg', min: LARGE_MIN },
];

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function readVar(fallback, name) {
  if (typeof fallback !== 'string') return '';
  const match = fallback.match(new RegExp(`var\\(\\s*${name}(?:\\s*,\\s*([^)]*))?\\)`, 'i'));
  return match ? (match[1] ?? '').trim() : '';
}

/** Unwraps a single `var(--token, fallback)` so an alias still resolves to a colour. */
function unwrapVar(raw) {
  if (!raw.includes('var(')) return raw.trim().replace(/!important$/i, '').trim();
  return readVar(raw, '--[a-z0-9-]+').replace(/!important$/i, '').trim();
}

function parseColor(raw) {
  if (typeof raw !== 'string') return null;
  const value = unwrapVar(raw);
  if (!value || value === 'inherit' || value === 'none' || value === 'transparent') return null;

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    const expand = (part) => (part.length === 1 ? part + part : part);
    const pairs = digits.length <= 4 ? digits.split('').map(expand) : (digits.match(/../g) ?? []);
    const [r = 0, g = 0, b = 0, a] = pairs;
    return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16), a: a === undefined ? 1 : parseInt(a, 16) / 255 };
  }

  const fn = value.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const parts = fn[1].split(/[,\s/]+/).filter(Boolean);
    const channel = (part) => (part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part));
    const alpha = parts[3] === undefined ? 1 : parseFloat(parts[3]);
    return {
      r: Math.round(channel(parts[0] ?? '0')),
      g: Math.round(channel(parts[1] ?? '0')),
      b: Math.round(channel(parts[2] ?? '0')),
      a: Number.isFinite(alpha) ? alpha : 1,
    };
  }

  return null;
}

/** Flattens a translucent colour onto an opaque backdrop. */
function flatten(foreground, backdrop) {
  const base = backdrop && backdrop.a > 0 ? backdrop : WHITE;
  if (foreground.a >= 1) return { ...foreground, a: 1 };
  const mix = (f, b) => Math.round(f * foreground.a + b * base.a * (1 - foreground.a));
  return { r: mix(foreground.r, base.r), g: mix(foreground.g, base.g), b: mix(foreground.b, base.b), a: 1 };
}

function luminance({ r, g, b }) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * A translucent token is only meaningful once it is painted over something
 * opaque, so `parent` must be the real surface behind it. Compositing onto
 * white would silently overstate contrast for dark themes.
 */
function ratio(foreground, backdrop, parent = WHITE) {
  const opaqueBackdrop = flatten(backdrop, parent);
  const flatForeground = flatten(foreground, opaqueBackdrop);
  const a = luminance(flatForeground);
  const b = luminance(opaqueBackdrop);
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

function collectBlocks(css) {
  const blocks = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockPattern.exec(css)) !== null) {
    const selector = match[1].trim();
    const vars = {};
    const varPattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let varMatch;
    while ((varMatch = varPattern.exec(match[2])) !== null) {
      vars[varMatch[1]] = varMatch[2].trim();
    }
    blocks.push({ selector, vars });
  }
  return blocks;
}

function themeName(selector) {
  const match = selector.match(/\[data-theme=["']([^"']+)["']\]/);
  return match ? match[1] : null;
}

const layers = new Map();

for (const source of SOURCES) {
  const css = stripComments(readFileSync(join(ROOT, source), 'utf8'));
  for (const block of collectBlocks(css)) {
    const theme = themeName(block.selector);
    const target = theme ?? '__root__';
    if (!layers.has(target)) layers.set(target, {});
    Object.assign(layers.get(target), block.vars);
  }
}

const results = [];
const skipped = [];

for (const [theme, vars] of [...layers.entries()].sort()) {
  for (const pair of PAIRS) {
    const fgRaw = vars[pair.fg];
    const bgRaw = vars[pair.bg];
    const fg = parseColor(fgRaw);
    const bg = parseColor(bgRaw);

    if (!fgRaw || !bgRaw) {
      skipped.push(`${theme} :: ${pair.name} (token absent)`);
      continue;
    }

    if (!fg || !bg) {
      skipped.push(`${theme} :: ${pair.name} (unresolved colour: fg=${fgRaw} bg=${bgRaw})`);
      continue;
    }

    const parent = parseColor(vars['--app-bg']) ?? WHITE;
    const measured = ratio(fg, bg, parent);
    results.push({
      theme,
      pair: pair.name,
      ratio: measured,
      min: pair.min,
      pass: measured >= pair.min,
      fg: fgRaw,
      bg: bgRaw,
    });
  }
}

const failures = results.filter((row) => !row.pass);

// The lens bar themes itself, so light and dark are checked as two palettes.
for (const source of LENS_SOURCES) {
  const css = stripComments(readFileSync(join(ROOT, source), 'utf8'));
  const light = {};
  const dark = {};
  for (const block of collectBlocks(css)) {
    const target = /\[data-lens-theme=["']dark["']\]/.test(block.selector) ? dark : light;
    if (block.selector.startsWith('.lens-bar')) Object.assign(target, block.vars);
  }

  for (const [label, vars] of [['lens-light', light], ['lens-dark', dark]]) {
    const parent = parseColor(vars['--lens-bg']) ?? WHITE;
    for (const pair of LENS_PAIRS) {
      const fg = parseColor(vars[pair.fg]);
      const bg = parseColor(vars[pair.bg]);
      if (!fg || !bg) {
        skipped.push(`${label} :: ${pair.name} (unresolved)`);
        continue;
      }
      const measured = ratio(fg, bg, parent);
      results.push({
        theme: label,
        pair: pair.name,
        ratio: measured,
        min: pair.min,
        pass: measured >= pair.min,
        fg: vars[pair.fg],
        bg: vars[pair.bg],
      });
    }
  }
}

const allFailures = results.filter((row) => !row.pass);
const vacuous = results.length === 0;

console.log('WCAG contrast gate');
console.log(`sources: ${SOURCES.join(', ')}`);
console.log(`themes measured: ${[...layers.keys()].filter((key) => key !== '__root__').sort().join(', ')}`);
console.log(`pairs checked: ${results.length}, skipped: ${skipped.length}`);
console.log('');

for (const row of results) {
  const mark = row.pass ? 'PASS' : 'FAIL';
  console.log(
    `${mark}  ${row.theme.padEnd(10)} ${row.pair.padEnd(42)} ` +
      `${row.ratio.toFixed(2)}:1  (min ${row.min.toFixed(1)})  ` +
      `${row.fg} on ${row.bg}`
  );
}

if (skipped.length) {
  console.log('');
  console.log('skipped (token absent in this theme):');
  for (const entry of skipped) console.log(`  - ${entry}`);
}

console.log('');
if (vacuous) {
  console.log('FAIL: no token pairs could be measured. The gate must never pass vacuously.');
} else if (allFailures.length === 0) {
  console.log(`PASS: ${results.length} token pairs meet their WCAG threshold.`);
} else {
  console.log(`FAIL: ${allFailures.length} token pair(s) below threshold.`);
}

process.exit(vacuous || allFailures.length === 0 ? (vacuous ? 1 : 0) : 1);
