export const FOCUS_RAIL_RATIO = 0.42;
export const MAX_SCROLL_INPUT = 64;
export const SCROLL_INTENT_THRESHOLD = 96;
export const LINE_COOLDOWN = 240;

export function accumulateScrollIntent(
  current,
  delta,
  maxInput = MAX_SCROLL_INPUT,
) {
  const safeDelta = Math.max(-maxInput, Math.min(maxInput, Number(delta) || 0));
  if (!safeDelta) return current;
  if (current && Math.sign(current) !== Math.sign(safeDelta)) return safeDelta;
  return current + safeDelta;
}

export function getIntentDirection(
  intent,
  threshold = SCROLL_INTENT_THRESHOLD,
) {
  if (intent >= threshold) return 1;
  if (intent <= -threshold) return -1;
  return 0;
}

export function getNavigationStep() {
  return 1;
}

export function readingProgress(index, total) {
  if (total <= 1 || index < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((index / (total - 1)) * 100)));
}

export function estimateReadingMs(text, wordsPerMinute = 220) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  let duration = (words / wordsPerMinute) * 60000;

  if (/[.!?]["')\]]?$/.test(String(text).trim())) duration += 300;
  if (/[,;:]["')\]]?$/.test(String(text).trim())) duration += 150;

  return Math.min(8000, Math.max(900, Math.round(duration)));
}
