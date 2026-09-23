import { beforeEach, describe, expect, it } from 'vitest';
import {
  FINISHED_PROGRESS,
  LIBRARY_STORAGE_KEY,
  MAX_LIBRARY_ENTRIES,
  SHELVES,
  addToReadQueue,
  enforceCap,
  emptyLibrary,
  getEntries,
  getEntry,
  getResumeEntry,
  normalizeEntry,
  readLibrary,
  recordSession,
  removeEntry,
  upsertEntry,
} from './libraryStore.js';
import { memoryStorage, setStorageItem } from '../../../shared/lib/index.js';
import {
  DEFAULT_WORDS_PER_MINUTE,
  createSpeedTracker,
  computeWordsPerMinute,
  blendPace,
  minutesForWords,
  IDLE_GAP_MS,
} from './readingSpeed.js';

function seed(value) {
  setStorageItem(LIBRARY_STORAGE_KEY, value);
}

beforeEach(() => {
  memoryStorage.clear();
});

describe('libraryStore', () => {
  it('returns an empty library for missing or invalid data', () => {
    expect(readLibrary()).toEqual(emptyLibrary());
    seed('not an object');
    expect(readLibrary()).toEqual(emptyLibrary());
    seed({ version: 999, entries: [] });
    expect(readLibrary()).toEqual(emptyLibrary());
  });

  it('normalizes entries and rejects those without a documentId', () => {
    expect(normalizeEntry(null)).toBeNull();
    expect(normalizeEntry({})).toBeNull();
    expect(normalizeEntry({ documentId: '   ' })).toBeNull();

    const entry = normalizeEntry({
      documentId: 'doc:1',
      title: '  ',
      progress: 140,
      wordsRead: -3,
    });
    expect(entry.title).toBe('Untitled document');
    expect(entry.progress).toBe(100);
    expect(entry.wordsRead).toBe(0);
    expect(entry.shelf).toBe(SHELVES.READING);
  });

  it('upserts entries and dedupes by documentId, most recent first', () => {
    upsertEntry({ documentId: 'a', title: 'A', lastOpenedAt: 100 });
    upsertEntry({ documentId: 'b', title: 'B', lastOpenedAt: 200 });
    upsertEntry({ documentId: 'a', title: 'A2', lastOpenedAt: 300 });

    const entries = getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].documentId).toBe('a');
    expect(entries[0].title).toBe('A2');
  });

  it('accumulates reading totals across sessions without resetting them', () => {
    recordSession({ documentId: 'doc', title: 'T', progress: 20, wordsRead: 500, readingSeconds: 120 });
    recordSession({ documentId: 'doc', title: 'T', progress: 40, wordsRead: 300, readingSeconds: 80 });

    const entry = getEntry('doc');
    expect(entry.sessions).toBe(2);
    expect(entry.wordsRead).toBe(800);
    expect(entry.readingSeconds).toBe(200);
  });

  it('marks a book finished at the threshold and keeps its completion time', () => {
    recordSession({ documentId: 'doc', title: 'T', progress: FINISHED_PROGRESS });
    const entry = getEntry('doc');
    expect(entry.shelf).toBe(SHELVES.FINISHED);
    expect(entry.completedAt).toBeGreaterThan(0);
  });

  it('returns the most recent in-progress entry for resume, or null', () => {
    expect(getResumeEntry()).toBeNull();
    recordSession({ documentId: 'done', title: 'D', progress: 100 });
    recordSession({ documentId: 'reading', title: 'R', progress: 30 });
    const resume = getResumeEntry();
    expect(resume.documentId).toBe('reading');
  });

  it('never evicts to-read entries when enforcing the cap', () => {
    const entries = [];
    for (let i = 0; i < MAX_LIBRARY_ENTRIES + 5; i += 1) {
      entries.push(normalizeEntry({
        documentId: `doc-${i}`,
        title: `T${i}`,
        lastOpenedAt: i,
        shelf: i === 0 ? SHELVES.TO_READ : SHELVES.READING,
      }));
    }
    const capped = enforceCap(entries);
    expect(capped.length).toBeLessThanOrEqual(MAX_LIBRARY_ENTRIES + 1);
    expect(capped.some((e) => e.shelf === SHELVES.TO_READ)).toBe(true);
  });

  it('queues a to-read file without parsing it', () => {
    addToReadQueue({ name: 'book.pdf', size: 1000, lastModified: 42 });
    const entry = getEntry('book.pdf:1000:42');
    expect(entry.shelf).toBe(SHELVES.TO_READ);
    expect(entry.kind).toBe('PDF');
  });

  it('removes entries cleanly', () => {
    upsertEntry({ documentId: 'x', title: 'X' });
    removeEntry('x');
    expect(getEntry('x')).toBeNull();
  });

  it('preserves accumulated stats on metadata-only patches', () => {
    recordSession({ documentId: 'doc', title: 'T', progress: 20, wordsRead: 500, readingSeconds: 120 });
    upsertEntry({ documentId: 'doc', title: 'Renamed' });
    const entry = getEntry('doc');
    expect(entry.title).toBe('Renamed');
    expect(entry.wordsRead).toBe(500);
    expect(entry.readingSeconds).toBe(120);
    expect(entry.sessions).toBe(1);
  });

  it('bounds the library even with many to-read entries', () => {
    const entries = [];
    for (let i = 0; i < MAX_LIBRARY_ENTRIES + 10; i += 1) {
      entries.push(normalizeEntry({
        documentId: `q-${i}`,
        title: `Q${i}`,
        lastOpenedAt: i,
        shelf: i % 2 ? SHELVES.TO_READ : SHELVES.READING,
      }));
    }
    const capped = enforceCap(entries);
    expect(capped.length).toBeLessThanOrEqual(MAX_LIBRARY_ENTRIES);
  });
});

describe('readingSpeed', () => {
  it('ignores idle gaps instead of counting them as reading time', () => {
    let t = 0;
    const tracker = createSpeedTracker(() => t);
    tracker.advance(10);
    t += 2000;
    tracker.advance(10);
    const before = tracker.getActiveMs();
    t += IDLE_GAP_MS + 10000;
    tracker.advance(10);
    expect(tracker.getActiveMs()).toBe(before);
  });

  it('falls back to the default pace below the measurement threshold', () => {
    expect(computeWordsPerMinute({ activeMs: 500, words: 5 })).toBe(DEFAULT_WORDS_PER_MINUTE);
    expect(computeWordsPerMinute({ activeMs: 0, words: 1000 })).toBe(DEFAULT_WORDS_PER_MINUTE);
  });

  it('computes and clamps a measured pace', () => {
    expect(computeWordsPerMinute({ activeMs: 60000, words: 300 })).toBe(300);
    expect(computeWordsPerMinute({ activeMs: 60000, words: 100000 })).toBe(900);
    expect(computeWordsPerMinute({ activeMs: 60000, words: 1 })).toBe(DEFAULT_WORDS_PER_MINUTE);
  });

  it('does not replace the default until enough samples exist', () => {
    expect(blendPace(DEFAULT_WORDS_PER_MINUTE, 400, 1)).toBe(DEFAULT_WORDS_PER_MINUTE);
    const blended = blendPace(DEFAULT_WORDS_PER_MINUTE, 400, 5);
    expect(blended).toBeGreaterThan(DEFAULT_WORDS_PER_MINUTE);
    expect(blended).toBeLessThan(400);
  });

  it('estimates minutes from words at the measured pace', () => {
    expect(minutesForWords(0)).toBe(0);
    expect(minutesForWords(460, 230)).toBe(2);
    expect(minutesForWords(100, 230)).toBe(1);
  });

  it('counts samples per advance so confidence is reachable', () => {
    let t = 0;
    const tracker = createSpeedTracker(() => t);
    expect(tracker.getSampleCount()).toBe(0);
    tracker.advance(10);
    t += 2000;
    tracker.advance(10);
    t += 2000;
    tracker.advance(10);
    expect(tracker.getSampleCount()).toBe(3);
    expect(blendPace(DEFAULT_WORDS_PER_MINUTE, 400, tracker.getSampleCount())).toBeGreaterThan(DEFAULT_WORDS_PER_MINUTE);
  });
});