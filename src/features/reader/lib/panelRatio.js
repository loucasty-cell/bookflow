/**
 * panelRatio: the navigator width as a fraction of the reader layout.
 *
 * A ratio rather than a pixel width, because a splitter that stores pixels
 * cannot survive a window resize: the same 294px is a comfortable sidebar on a
 * 1280 display and a sliver on a 2560 one. macOS panes behave this way, and the
 * reader is trying to behave like a macOS window.
 *
 * The default is chosen so the panel renders at its historical 294px at the
 * 1440px reference width. It is deliberately not expressed as 294/1440 in the
 * call sites: the reference width is documented here, once, so that changing
 * the default is a single edit rather than a search.
 *
 * CSS applies the absolute guardrails. `clamp()` in reader.css floors the panel
 * at PANEL_MIN_PX and caps it at PANEL_MAX_PX so a saved ratio can never crush
 * the chapter list or swallow the reading column, whatever the viewport or
 * whatever a hostile storage value contains. This module owns the ratio domain;
 * CSS owns the pixel domain. Neither duplicates the other.
 */

/** The width the default ratio was tuned against, in CSS px. */
export const PANEL_REFERENCE_WIDTH = 1440;

/** The width the panel has always rendered at, in CSS px. */
export const PANEL_LEGACY_WIDTH = 294;

export const PANEL_RATIO_MIN = 0.15;
export const PANEL_RATIO_MAX = 0.34;

/** 294 / 1440. See PANEL_REFERENCE_WIDTH for why it is written this way. */
export const PANEL_RATIO_DEFAULT =
  Math.round((PANEL_LEGACY_WIDTH / PANEL_REFERENCE_WIDTH) * 1000) / 1000;

/**
 * Absolute pixel guardrails, applied by clamp() in reader.css.
 *
 * The floor is 280 rather than a rounder number because that is what the
 * navigator's own content needs: the three-up stats row puts "Bookmarks" in a
 * cell about 85px wide, and anything below roughly 280 truncates it to
 * "Bookm...". A floor that lets the panel truncate its own labels is not a
 * guardrail, it is a bug with a lower bound.
 */
export const PANEL_MIN_PX = 280;
export const PANEL_MAX_PX = 480;

/** One arrow keypress. Home resets to the default, not to an extreme. */
export const PANEL_KEYBOARD_STEP = 0.02;

/** Below this many pixels of travel the pointer is clicking, not dragging. */
export const PANEL_DRAG_THRESHOLD_PX = 4;

/**
 * Coerces any input to a usable ratio. Storage is untrusted: a persisted value
 * can be a string, null, NaN, or a number written by an older build with
 * different bounds. Every one of those has to resolve to something the layout
 * can use, and an out-of-range number has to resolve to the nearest bound
 * rather than to the default, or dragging past the edge would snap it back.
 */
export function clampPanelRatio(value) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return PANEL_RATIO_DEFAULT;
  if (numeric < PANEL_RATIO_MIN) return PANEL_RATIO_MIN;
  if (numeric > PANEL_RATIO_MAX) return PANEL_RATIO_MAX;
  return numeric;
}

/**
 * Converts a pointer x position into a ratio of the layout width.
 * `availableWidth` is the layout box, not the viewport: the panel is a flex
 * sibling of the canvas, so the canvas is part of what it competes with.
 */
export function ratioFromPointer(clientX, availableWidth) {
  const width = Number(availableWidth);
  if (!Number.isFinite(width) || width <= 0) return PANEL_RATIO_DEFAULT;
  return clampPanelRatio(clientX / width);
}

/** Ratio to a percentage string for a CSS custom property. */
export function ratioToPercent(value) {
  return `${clampPanelRatio(value) * 100}%`;
}

/** Ratio to a pixel width, used for the ARIA value readout. */
export function ratioToPx(value, availableWidth) {
  const width = Number(availableWidth);
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.round(clampPanelRatio(value) * width);
}