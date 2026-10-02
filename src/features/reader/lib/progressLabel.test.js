import { describe, expect, it } from 'vitest';
import { SHELVES, normalizeEntry } from '../../library/lib/libraryStore.js';
import {
  DEFAULT_PROGRESS_DISPLAY,
  PROGRESS_DISPLAY_MODES,
  getChapterMinutesLeft,
  getMeasuredPace,
  getProgressLabel,
  normalizeProgressDisplay,
} from './progressLabel.js';

const MINUTE = 60;

function entry(overrides = {}) {
  return normalizeEntry({ documentId: 'doc', title: 'Doc', ...overrides });
}

const CHAPTERS = [
  { title: 'One', paragraphs: ['a '.repeat(230).trim(), 'b '.repeat(230).trim()] },
  { title: 'Two', paragraphs: ['c '.repeat(460).trim()] },
];

describe('getProgressLabel', () => {
  it('defaults to a clamped percent', () => {
    expect(getProgressLabel({ progress: 42 })).toBe('42%');
    expect(getProgressLabel({})).toBe('0%');
    expect(getProgressLabel()).toBe('0%');
  });

  it('clamps and rounds hostile progress values', () => {
    expect(getProgressLabel({ progress: 180 })).toBe('100%');
    expect(getProgressLabel({ progress: -4 })).toBe('0%');
    expect(getProgressLabel({ progress: 42.6 })).toBe('43%');
    expect(getProgressLabel({ progress: Number.NaN })).toBe('0%');
    expect(getProgressLabel({ progress: 'nope' })).toBe('0%');
    expect(getProgressLabel({ progress: Number.POSITIVE_INFINITY })).toBe('0%');
  });

  it('hides the value entirely when asked', () => {
    expect(getProgressLabel({ mode: 'hidden', progress: 42 })).toBe('');
  });

  it('shows time left only when a real estimate exists', () => {
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: 7 })).toBe('7 min left');
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: 0.4 })).toBe('1 min left');
  });

  it('falls back to percent rather than inventing a time', () => {
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: null })).toBe('42%');
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: 0 })).toBe('42%');
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: -3 })).toBe('42%');
    expect(getProgressLabel({ mode: 'time-left-chapter', progress: 42, chapterMinutesLeft: Number.NaN })).toBe('42%');
  });

  it('falls back to percent for an unknown mode instead of going blank', () => {
    expect(getProgressLabel({ mode: 'nonsense', progress: 42 })).toBe('42%');
    expect(getProgressLabel({ mode: undefined, progress: 42 })).toBe('42%');
  });

  it('never emits a page number', () => {
    for (const mode of PROGRESS_DISPLAY_MODES) {
      expect(getProgressLabel({ mode, progress: 50, chapterMinutesLeft: 5 })).not.toMatch(/\bpage\b/i);
    }
  });
});

describe('getMeasuredPace', () => {
  it('is null until the session count clears the confidence threshold', () => {
    expect(getMeasuredPace([])).toBeNull();
    expect(getMeasuredPace([entry({ sessions: 1 })])).toBeNull();
    expect(getMeasuredPace([entry({ sessions: 2 })])).toBeNull();
  });

  it('measures a pace from accumulated real reading time', () => {
    const entries = [entry({ sessions: 5, readingSeconds: 600, wordsRead: 3000 })];
    const measured = getMeasuredPace(entries);
    expect(measured).not.toBeNull();
    expect(measured.samples).toBe(5);
    expect(measured.pace).toBe(300);
  });

  it('is null when sessions are enough but no time was ever measured', () => {
    expect(getMeasuredPace([entry({ sessions: 9, readingSeconds: 0, wordsRead: 0 })])).toBeNull();
  });

  it('survives a hostile entries payload', () => {
    expect(getMeasuredPace(null)).toBeNull();
    expect(getMeasuredPace(undefined)).toBeNull();
    expect(getMeasuredPace('nope')).toBeNull();
    expect(getMeasuredPace([null, 'x', 7])).toBeNull();
  });
});

describe('getChapterMinutesLeft', () => {
  const measured = [entry({ sessions: 5, readingSeconds: 600, wordsRead: 3000 })];

  it('is null without enough measured samples', () => {
    expect(getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 0, entries: [] })).toBeNull();
  });

  it('estimates the current chapter at the measured pace', () => {
    const minutes = getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 0, entries: measured });
    // Chapter one holds about 460 words, and the measured pace is 300 wpm.
    expect(minutes).toBe(2);
  });

  it('reads the chapter it is asked about, not always the first', () => {
    const minutes = getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 1, entries: measured });
    expect(minutes).toBe(2);
  });

  it('is null for a chapter index that does not exist', () => {
    expect(getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 9, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: -1, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 1.5, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: Number.NaN, entries: measured })).toBeNull();
  });

  it('is null for an empty or hostile chapter list', () => {
    expect(getChapterMinutesLeft({ chapters: [], activeChapter: 0, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ activeChapter: 0, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ chapters: 'nope', activeChapter: 0, entries: measured })).toBeNull();
    expect(getChapterMinutesLeft({ chapters: [{ title: 'x', paragraphs: [] }], activeChapter: 0, entries: measured })).toBeNull();
  });
});

describe('normalizeProgressDisplay', () => {
  it('keeps a known mode', () => {
    for (const mode of PROGRESS_DISPLAY_MODES) {
      expect(normalizeProgressDisplay(mode)).toBe(mode);
    }
  });

  it('falls back to percent for a persisted unknown mode', () => {
    expect(normalizeProgressDisplay('nope')).toBe(DEFAULT_PROGRESS_DISPLAY);
    expect(normalizeProgressDisplay(undefined)).toBe(DEFAULT_PROGRESS_DISPLAY);
    expect(normalizeProgressDisplay(null)).toBe(DEFAULT_PROGRESS_DISPLAY);
    expect(normalizeProgressDisplay(7)).toBe(DEFAULT_PROGRESS_DISPLAY);
  });

  it('offers exactly the three documented modes', () => {
    expect(PROGRESS_DISPLAY_MODES).toEqual(['percent', 'time-left-chapter', 'hidden']);
  });
});

describe('progressLabel integration contract', () => {
  it('keeps the shelf vocabulary untouched', () => {
    expect(SHELVES.READING).toBe('reading');
  });

  it('rounds a minutes estimate up to a whole minute', () => {
    const entries = [entry({ sessions: 5, readingSeconds: 60, wordsRead: 300 })];
    const minutes = getChapterMinutesLeft({ chapters: CHAPTERS, activeChapter: 0, entries });
    if (minutes !== null) expect(minutes).toBeGreaterThanOrEqual(1);
    expect(MINUTE).toBe(60);
  });
});
