import { describe, expect, it } from 'vitest';
import { SHELVES, normalizeEntry } from './libraryStore.js';
import {
  canResume,
  describeSource,
  formatLastOpened,
  formatProgress,
  hasReopenableSource,
  selectContinueReading,
  selectFinished,
  selectRecent,
  selectToRead,
} from './librarySelectors.js';

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function entry(overrides = {}) {
  const base = normalizeEntry({
    documentId: 'doc',
    title: 'Doc',
    progress: 10,
    lastOpenedAt: NOW - HOUR,
    ...overrides,
  });
  return { ...base, ...overrides };
}

describe('selectRecent', () => {
  it('returns an empty list for missing or hostile input', () => {
    expect(selectRecent(undefined)).toEqual([]);
    expect(selectRecent(null)).toEqual([]);
    expect(selectRecent('nope')).toEqual([]);
    expect(selectRecent({})).toEqual([]);
    expect(selectRecent([null, undefined, 'x', 7])).toEqual([]);
  });

  it('keeps only in-progress reading entries', () => {
    const entries = [
      entry({ documentId: 'a', shelf: SHELVES.READING, progress: 10 }),
      entry({ documentId: 'b', shelf: SHELVES.TO_READ, progress: 10 }),
      entry({ documentId: 'c', shelf: SHELVES.FINISHED, progress: 10 }),
      entry({ documentId: 'd', shelf: SHELVES.READING, progress: 98 }),
      entry({ documentId: 'e', shelf: SHELVES.READING, progress: 99 }),
    ];
    expect(selectRecent(entries).map((item) => item.documentId)).toEqual(['a']);
  });

  it('sorts by lastOpenedAt descending and does not mutate the input', () => {
    const entries = [
      entry({ documentId: 'old', lastOpenedAt: NOW - 10 * DAY }),
      entry({ documentId: 'newest', lastOpenedAt: NOW - MINUTE }),
      entry({ documentId: 'middle', lastOpenedAt: NOW - 5 * HOUR }),
    ];
    const snapshot = entries.map((item) => item.documentId);
    expect(selectRecent(entries).map((item) => item.documentId)).toEqual(['newest', 'middle', 'old']);
    expect(entries.map((item) => item.documentId)).toEqual(snapshot);
  });

  it('honours the limit and survives a hostile limit', () => {
    const entries = Array.from({ length: 9 }, (unused, index) =>
      entry({ documentId: `d${index}`, lastOpenedAt: NOW - index * MINUTE })
    );
    expect(selectRecent(entries, 3)).toHaveLength(3);
    expect(selectRecent(entries, 0)).toHaveLength(0);
    expect(selectRecent(entries, -5)).toHaveLength(0);
    expect(selectRecent(entries, Number.NaN).length).toBeGreaterThan(0);
    expect(selectRecent(entries, 100)).toHaveLength(9);
  });

  it('handles a full sixty-entry library', () => {
    const entries = Array.from({ length: 60 }, (unused, index) =>
      entry({ documentId: `d${index}`, lastOpenedAt: NOW - index * MINUTE })
    );
    expect(selectRecent(entries, 60)).toHaveLength(60);
    expect(selectRecent(entries)).toHaveLength(5);
  });

  it('keeps entries with an empty title rather than dropping them', () => {
    const entries = [entry({ documentId: 'blank', title: '' })];
    expect(selectRecent(entries)).toHaveLength(1);
    expect(selectRecent(entries)[0].documentId).toBe('blank');
  });

  it('carries the store title fallback through untouched', () => {
    const [stored] = selectRecent([normalizeEntry({ documentId: 'blank', title: '   ' })]);
    expect(stored.title).toBe('Untitled document');
  });

  it('treats a future timestamp as the most recent without going negative', () => {
    const entries = [entry({ documentId: 'future', lastOpenedAt: NOW + 5 * DAY })];
    expect(selectRecent(entries)[0].documentId).toBe('future');
    expect(formatLastOpened(NOW + 5 * DAY, NOW)).toBe('just now');
  });
});

describe('selectToRead and selectFinished', () => {
  it('partitions the shelves', () => {
    const entries = [
      entry({ documentId: 'r', shelf: SHELVES.READING }),
      entry({ documentId: 'q1', shelf: SHELVES.TO_READ, lastOpenedAt: NOW - 2 * HOUR }),
      entry({ documentId: 'q2', shelf: SHELVES.TO_READ, lastOpenedAt: NOW - MINUTE }),
      entry({ documentId: 'f', shelf: SHELVES.FINISHED }),
    ];
    expect(selectToRead(entries).map((item) => item.documentId)).toEqual(['q2', 'q1']);
    expect(selectFinished(entries).map((item) => item.documentId)).toEqual(['f']);
    expect(selectToRead(undefined)).toEqual([]);
    expect(selectFinished(null)).toEqual([]);
  });
});

describe('selectContinueReading', () => {
  it('returns the single most recent in-progress entry or null', () => {
    expect(selectContinueReading([])).toBeNull();
    expect(selectContinueReading(undefined)).toBeNull();

    const entries = [
      entry({ documentId: 'a', lastOpenedAt: NOW - 3 * DAY }),
      entry({ documentId: 'b', lastOpenedAt: NOW - MINUTE }),
    ];
    expect(selectContinueReading(entries).documentId).toBe('b');
  });

  it('does not resume a book that already finished', () => {
    const entries = [entry({ documentId: 'done', progress: 100, shelf: SHELVES.FINISHED })];
    expect(selectContinueReading(entries)).toBeNull();
  });
});

describe('formatProgress', () => {
  it('clamps, rounds and survives hostile values', () => {
    expect(formatProgress(42.4)).toBe('42%');
    expect(formatProgress(42.6)).toBe('43%');
    expect(formatProgress(-10)).toBe('0%');
    expect(formatProgress(180)).toBe('100%');
    expect(formatProgress(Number.NaN)).toBe('0%');
    expect(formatProgress(undefined)).toBe('0%');
    expect(formatProgress(null)).toBe('0%');
    expect(formatProgress('55')).toBe('55%');
    expect(formatProgress('not a number')).toBe('0%');
    expect(formatProgress(Number.POSITIVE_INFINITY)).toBe('0%');
  });
});

describe('formatLastOpened', () => {
  it('describes each window without inventing a clock', () => {
    expect(formatLastOpened(NOW - 5 * 1000, NOW)).toBe('just now');
    expect(formatLastOpened(NOW - 5 * MINUTE, NOW)).toBe('5m ago');
    expect(formatLastOpened(NOW - 3 * HOUR, NOW)).toBe('3h ago');
    expect(formatLastOpened(NOW - DAY, NOW)).toBe('yesterday');
    expect(formatLastOpened(NOW - 5 * DAY, NOW)).toBe('5d ago');
    expect(formatLastOpened(NOW - 60 * DAY, NOW)).toBe('a while ago');
  });

  it('returns an empty string rather than a lie for missing or hostile stamps', () => {
    expect(formatLastOpened(0, NOW)).toBe('');
    expect(formatLastOpened(undefined, NOW)).toBe('');
    expect(formatLastOpened(null, NOW)).toBe('');
    expect(formatLastOpened('soon', NOW)).toBe('');
    expect(formatLastOpened(Number.NaN, NOW)).toBe('');
    expect(formatLastOpened(-5, NOW)).toBe('');
  });
});

describe('describeSource and canResume', () => {
  it('names the three honest source states', () => {
    expect(describeSource({ fileName: 'book.pdf', kind: 'PDF' })).toBe('file');
    expect(describeSource({ fileName: '', kind: 'TXT' })).toBe('missing');
    expect(describeSource({ fileName: '', kind: 'SAMPLE' })).toBe('bundled');
    expect(describeSource({ fileName: 'x', kind: 'PDF', documentId: 'bookflow-sample' })).toBe('bundled');
    expect(describeSource(null)).toBe('missing');
    expect(describeSource(undefined)).toBe('missing');
    expect(describeSource('nope')).toBe('missing');
  });

  it('is true only for a real stored file', () => {
    expect(hasReopenableSource({ fileName: 'book.pdf', kind: 'PDF' })).toBe(true);
    expect(hasReopenableSource({ fileName: '' })).toBe(false);
    expect(hasReopenableSource(null)).toBe(false);
    expect(hasReopenableSource({ fileName: '' })).toBe(false);
  });

  it('treats a private on-device copy as resumable without a file', () => {
    expect(describeSource({ documentId: 'ocr-1', fileName: '', offline: true })).toBe('device');
    expect(canResume({ documentId: 'ocr-1', fileName: '', offline: true })).toBe(true);
    expect(hasReopenableSource({ documentId: 'ocr-1', fileName: '', offline: true })).toBe(false);
  });

  it('lets the bundled sample resume even though it has no file', () => {
    expect(canResume({ fileName: '', kind: 'SAMPLE' })).toBe(true);
    expect(canResume({ fileName: '', kind: 'SAMPLE', documentId: 'bookflow-sample' })).toBe(true);
    expect(canResume({ fileName: 'book.pdf' })).toBe(true);
  });

  it('refuses to claim a resume when only metadata survives', () => {
    expect(canResume({ fileName: '', kind: 'TXT' })).toBe(false);
    expect(canResume(null)).toBe(false);
  });
});
