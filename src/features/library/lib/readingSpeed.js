/**
 * readingSpeed: measures the reader's own pace from real active reading time.
 *
 * Local only. Never sent anywhere, and never inflated from progress percent alone.
 */

export const DEFAULT_WORDS_PER_MINUTE = 230;
export const MIN_MEASURED_WORDS_PER_MINUTE = 60;
export const MAX_MEASURED_WORDS_PER_MINUTE = 900;

/** Gaps longer than this are treated as the reader being away, not reading. */
export const IDLE_GAP_MS = 45000;

/** Samples needed before the measured pace replaces the default. */
export const MIN_SAMPLES_FOR_CONFIDENCE = 3;

export function createSpeedTracker(now = () => Date.now()) {
  let lastTick = null;
  let activeMs = 0;
  let words = 0;
  let samples = 0;

  return {
    /** Call on every real navigation event. Idle gaps are discarded, not counted. */
    advance(wordsRead) {
      const timestamp = now();
      const countedWords = Math.max(0, Number(wordsRead) || 0);

      if (lastTick !== null) {
        const gap = timestamp - lastTick;
        if (gap > 0 && gap <= IDLE_GAP_MS) {
          activeMs += gap;
          words += countedWords;
          if (countedWords > 0) samples += 1;
        }
      } else if (countedWords > 0) {
        samples += 1;
      }

      lastTick = timestamp;
    },

    getActiveMs() {
      return activeMs;
    },

    getWords() {
      return words;
    },

    getSampleCount() {
      return samples;
    },
  };
}

/** Converts accumulated active time and words into a words-per-minute pace. */
export function computeWordsPerMinute({ activeMs, words }) {
  const safeMs = Number(activeMs) || 0;
  const safeWords = Math.max(0, Number(words) || 0);

  if (safeMs < 2000 || safeWords < 20) return DEFAULT_WORDS_PER_MINUTE;

  const minutes = safeMs / 60000;
  const pace = safeWords / minutes;

  return Math.min(MAX_MEASURED_WORDS_PER_MINUTE, Math.max(MIN_MEASURED_WORDS_PER_MINUTE, Math.round(pace)));
}

/**
 * Blends a newly measured pace into a stored one, weighted toward history so a
 * single odd session cannot distort the estimate.
 */
export function blendPace(previousPace, measuredPace, sessions) {
  const previous = Number(previousPace) || DEFAULT_WORDS_PER_MINUTE;
  const measured = Number(measuredPace) || DEFAULT_WORDS_PER_MINUTE;
  const count = Math.max(0, Number(sessions) || 0);

  if (count < MIN_SAMPLES_FOR_CONFIDENCE) return DEFAULT_WORDS_PER_MINUTE;

  const weight = Math.min(0.5, 1 / count);
  return Math.round(previous * (1 - weight) + measured * weight);
}

/** Remaining time in minutes for a word count at a given pace. */
export function minutesForWords(words, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE) {
  const safeWords = Math.max(0, Number(words) || 0);
  const safePace = Number(wordsPerMinute) > 0 ? Number(wordsPerMinute) : DEFAULT_WORDS_PER_MINUTE;
  if (!safeWords) return 0;
  return Math.max(1, Math.round(safeWords / safePace));
}
