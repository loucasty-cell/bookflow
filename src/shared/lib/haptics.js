/**
 * Safe, lightweight web haptic feedback utilities.
 * Uses navigator.vibrate when available on supported devices/browsers.
 */

export function triggerHaptic(pattern = 30) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics fail silently on unsupported platforms or when blocked by permissions
    }
  }
}

export const HAPTIC_PATTERNS = {
  LIGHT: 15,
  MEDIUM: 35,
  HEAVY: 50,
  SUCCESS: [20, 30, 40],
  WARNING: [40, 40, 40],
  SELECTION: 10,
};
