/**
 * Safe, lightweight web haptic feedback utilities.
 * Uses navigator.vibrate when available on supported devices/browsers.
 */

// TODO(backlog-20): gate on prefers-reduced-motion inside triggerHaptic and
// no-op when set. Currently ungated, which violates the reduced-motion
// invariant for touch users.
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
  // TODO(backlog-23): HEAVY, WARNING, and SELECTION are unused (only LIGHT,
  // MEDIUM, SUCCESS are wired). Either wire SELECTION to text selection or
  // mark the set as reserved with a doc line. No dead exports.
  HEAVY: 50,
  SUCCESS: [20, 30, 40],
  WARNING: [40, 40, 40],
  SELECTION: 10,
};
