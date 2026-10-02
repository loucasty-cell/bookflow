/**
 * geometry: the single numeric source for Bookflow's UI geometry.
 *
 * Every key below is a CSS custom property name, and src/styles/tokens.css
 * declares the matching value. `geometry.test.js` parses tokens.css and fails
 * if any pair drifts, so the two files cannot silently disagree.
 *
 * Keys are CSS variable names rather than friendly aliases on purpose: it
 * removes the mapping layer that is where a token and its stylesheet value
 * usually fall out of sync.
 *
 * Scope note: this covers interface chrome only. The reading column width and
 * reading line-height are reader ergonomics, governed by DEFAULT_SETTINGS in
 * src/features/reader/config.js, and are deliberately NOT encoded here.
 */

/** Base unit. Every spacing value is a whole multiple of this. */
export const BASE_UNIT = 4;

/** Spacing scale, multiples of BASE_UNIT. Keys are the token names. */
export const SPACING = {
  '--space-1': 4,
  '--space-2': 8,
  '--space-3': 12,
  '--space-4': 16,
  '--space-5': 20,
  '--space-6': 24,
  '--space-8': 32,
  '--space-10': 40,
  '--space-12': 48,
  '--space-16': 64,
} as const;

/**
 * UI type scale, 1.2 minor third anchored at 16px, rounded to whole px.
 * Line heights sit on a 4px grid so text lands on the same rhythm as spacing.
 */
export const TYPE_SCALE = {
  '--ui-caption': { size: 12, lineHeight: 16 },
  '--ui-small': { size: 14, lineHeight: 20 },
  '--ui-text': { size: 16, lineHeight: 24 },
  '--ui-title': { size: 19, lineHeight: 28 },
  '--ui-heading': { size: 23, lineHeight: 32 },
  '--ui-title-3': { size: 28, lineHeight: 36 },
  '--ui-display': { size: 33, lineHeight: 40 },
} as const;

/** Roles kept for the three type tokens the stylesheets already consume. */
export const TYPE_ROLE_ALIASES = {
  '--ui-label': '--ui-caption',
  '--ui-text': '--ui-text',
  '--ui-title': '--ui-title',
} as const;

/** Corner radius scale. Nested radius is outer minus padding. */
export const RADIUS = {
  '--radius-xs': 6,
  '--radius-sm': 10,
  '--radius-md': 14,
  '--radius-lg': 20,
  '--radius-xl': 28,
} as const;

/** The card radius is an alias of the medium step, not a separate value. */
export const RADIUS_ALIASES = {
  '--radius-card': '--radius-md',
} as const;

/** Full-bleed pill. Outside the scale because it is derived, not chosen. */
export const RADIUS_PILL = 999;

/** Apple HIG minimum hit target, in CSS px. Visual size may be smaller. */
export const HIT_TARGET = 44;

/**
 * Layering scale. Values are chosen, not derived: each stop reserves the gap
 * above it so a new surface slots in without renumbering anything beneath.
 * Must stay ascending.
 */
export const Z_INDEX = {
  '--z-decor': 0,
  '--z-content': 1,
  '--z-raised': 2,
  '--z-texture': 3,
  '--z-edge': 10,
  '--z-label': 12,
  '--z-layer': 20,
  '--z-float': 25,
  '--z-sticky': 30,
  '--z-scrim': 35,
  '--z-panel': 40,
  '--z-overlay': 45,
  '--z-modal': 60,
  '--z-popover': 70,
  '--z-drawer': 80,
  '--z-menu': 90,
  '--z-palette': 95,
  '--z-palette-panel': 100,
  '--z-blocking': 1000,
} as const;

/**
 * Hairline width. The colour is a separate token, `--hairline`, which mixes
 * from currentColor so it tracks the theme's ink without a per-theme override.
 */
export const HAIRLINE_WIDTH = 1;

/** Depth levels. Dark mode relies on border and surface, not on shadow. */
export const ELEVATION = {
  flat: 0,
  card: 1,
  popover: 2,
  sheet: 3,
} as const;

/** Fixed bar inset reserved for the reader chrome, in px, below the safe area. */
export const READER_CHROME_INSET = 24;

/** Golden ratio for layout proportions only. Not a legibility claim. */
export const GOLDEN_RATIO = 1.618;

/**
 * Flattened expectations, used by the agreement test to compare against the
 * parsed stylesheet. Aliases are resolved so the stylesheet is only ever
 * required to declare the canonical token.
 */
export function expectedTokens(): Record<string, number> {
  const out: Record<string, number> = {};

  for (const [name, value] of Object.entries(SPACING)) out[name] = value;
  for (const [name, value] of Object.entries(RADIUS)) out[name] = value;
  out['--radius-full'] = RADIUS_PILL;
  out['--radius-card'] = RADIUS['--radius-md'] as number;
  for (const [name, value] of Object.entries(Z_INDEX)) out[name] = value;
  out['--control-size'] = HIT_TARGET;
  out['--hairline-width'] = HAIRLINE_WIDTH;
  out['--reader-chrome-inset'] = READER_CHROME_INSET;

  for (const [name, step] of Object.entries(TYPE_SCALE)) {
    out[name] = step.size;
    out[`${name}-line-height`] = step.lineHeight;
  }
  for (const [name, target] of Object.entries(TYPE_ROLE_ALIASES)) {
    const step = TYPE_SCALE[target as keyof typeof TYPE_SCALE];
    out[name] = step.size;
  }

  return out;
}