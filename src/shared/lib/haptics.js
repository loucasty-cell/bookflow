/**
 * Safe, lightweight web haptic feedback utilities.
 * Uses navigator.vibrate when available on supported devices/browsers.
 */

export function triggerHaptic(pattern = 30) {
  const valid = Array.isArray(pattern)
    ? pattern.every((value) => Number.isFinite(value) && value >= 0)
    : Number.isFinite(pattern) && pattern >= 0;
  if (!valid) return false;
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

export const HAPTIC_PATTERNS = {
  LIGHT: 15,
  MEDIUM: 35,
  HEAVY: 50,
  SUCCESS: [20, 30, 40],
  WARNING: [40, 40, 40],
  SELECTION: 10,
};
