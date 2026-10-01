/**
 * graphicsQuality: one pure decision about how much atmosphere a device can pay for.
 *
 * Kept free of Three.js and React so it can be unit tested with a fake window.
 * AmbientDustCanvas reads this and adapts; it never re-derives device tiers.
 */

export const QUALITY_TIERS = {
  STATIC: 'static',
  BALANCED: 'balanced',
  FULL: 'full',
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const NARROW_VIEWPORT_QUERY = '(max-width: 720px)';

const NARROW_BREAKPOINT = 720;
const WEAK_CORES = 4;
const WEAK_MEMORY_GB = 4;

const STATIC_QUALITY = { tier: QUALITY_TIERS.STATIC, dpr: 1, particles: 0, glyphs: 12, targetFps: 0 };
const BALANCED_QUALITY = { tier: QUALITY_TIERS.BALANCED, dpr: 1.25, particles: 18, glyphs: 22, targetFps: 30 };
const FULL_QUALITY = { tier: QUALITY_TIERS.FULL, dpr: 1.75, particles: 32, glyphs: 38, targetFps: 60 };

function matches(win, query) {
  try {
    return Boolean(win.matchMedia?.(query)?.matches);
  } catch {
    return false;
  }
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function capDpr(dpr, limit) {
  const safe = readNumber(dpr, 1);
  return Math.max(1, Math.min(safe, limit));
}

function withDpr(tier, dpr) {
  return { ...tier, dpr: capDpr(dpr, tier.dpr) };
}

/**
 * @param {Window|null} win Injectable for tests; defaults to the real window.
 * @returns {{tier: string, dpr: number, particles: number, glyphs: number, targetFps: number}}
 */
export function getGraphicsQuality(win = typeof window === 'undefined' ? null : window) {
  if (!win) return { ...STATIC_QUALITY };

  if (matches(win, REDUCED_MOTION_QUERY)) {
    return { ...STATIC_QUALITY };
  }

  const nav = win.navigator ?? {};
  const touchPoints = readNumber(nav.maxTouchPoints, 0);
  const cores = readNumber(nav.hardwareConcurrency, 8);
  const memoryGb = readNumber(nav.deviceMemory, 8);
  const dpr = readNumber(win.devicePixelRatio, 1);

  const isNarrow = matches(win, NARROW_VIEWPORT_QUERY);
  const isTouch = touchPoints > 0;
  const isWeak = cores <= WEAK_CORES || memoryGb <= WEAK_MEMORY_GB;

  if (isNarrow || isTouch || isWeak) {
    return withDpr(BALANCED_QUALITY, dpr);
  }

  return withDpr(FULL_QUALITY, dpr);
}

export const GRAPHICS_BREAKPOINT = NARROW_BREAKPOINT;
