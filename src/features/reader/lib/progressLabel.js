/**
 * progressLabel: how the reader header states progress.
 *
 * Percent stays the default and is always honest. Time-left is offered only
 * once the reader's own measured pace clears the existing confidence
 * threshold, so the header never guesses a number the reader did not earn.
 *
 * No page numbers: the reader has no page concept.
 */
import {
  DEFAULT_WORDS_PER_MINUTE,
  MIN_SAMPLES_FOR_CONFIDENCE,
  computeWordsPerMinute,
  getEntries,
  getTotals,
  minutesForWords,
} from '../../library/index.js';
import { countBookWords } from './chapterEnrichment.js';

export const PROGRESS_DISPLAY_MODES = ['percent', 'time-left-chapter', 'hidden'];
export const DEFAULT_PROGRESS_DISPLAY = 'percent';

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

/** getTotals assumes well-formed entries; a poisoned payload must not reach it. */
function safeEntries(entries) {
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object') : [];
}

/**
 * The reader's measured pace, or null when there is not enough evidence.
 * Reuses the library's own tracker maths rather than estimating here.
 */
export function getMeasuredPace(entries = getEntries()) {
  const totals = getTotals(safeEntries(entries));
  if (totals.sessions < MIN_SAMPLES_FOR_CONFIDENCE) return null;

  const pace = computeWordsPerMinute({
    activeMs: totals.readingSeconds * 1000,
    words: totals.wordsRead,
  });
  if (pace === DEFAULT_WORDS_PER_MINUTE && totals.readingSeconds < 120) return null;

  return { pace, samples: totals.sessions };
}

/**
 * Minutes left in the current chapter, or null when it cannot be known
 * honestly. Never fabricates a chapter index or a page number.
 */
export function getChapterMinutesLeft({ chapters, activeChapter = 0, entries = getEntries() } = {}) {
  const measured = getMeasuredPace(entries);
  if (!measured) return null;

  const list = Array.isArray(chapters) ? chapters : [];
  const index = Number(activeChapter);
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return null;

  const words = countBookWords({ chapters: [list[index]] });
  if (!words) return null;

  return minutesForWords(words, measured.pace);
}

/**
 * @param {object} options
 * @param {string} options.mode One of PROGRESS_DISPLAY_MODES.
 * @param {number} options.progress 0..100.
 * @param {number|null} options.chapterMinutesLeft Null falls back to percent.
 */
export function getProgressLabel({ mode = DEFAULT_PROGRESS_DISPLAY, progress = 0, chapterMinutesLeft = null } = {}) {
  if (mode === 'hidden') return '';

  if (mode === 'time-left-chapter') {
    const minutes = Number(chapterMinutesLeft);
    if (Number.isFinite(minutes) && minutes > 0) {
      return `${Math.max(1, Math.round(minutes))} min left`;
    }
  }

  return `${clampPercent(progress)}%`;
}

export function normalizeProgressDisplay(mode) {
  return PROGRESS_DISPLAY_MODES.includes(mode) ? mode : DEFAULT_PROGRESS_DISPLAY;
}
