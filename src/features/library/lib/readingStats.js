import { SHELVES, getEntries } from './libraryStore.js';
import { countNightSessions } from './achievements.js';

function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function formatWords(words) {
  const total = Math.max(0, Math.round(Number(words) || 0));
  if (total < 1000) return `${total}`;
  if (total < 999500) return `${(total / 1000).toFixed(1)}k`;
  return `${(total / 1000000).toFixed(2)}M`;
}

export function getTotals(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];

  return safeEntries.reduce(
    (totals, entry) => ({
      wordsRead: totals.wordsRead + (Number(entry.wordsRead) || 0),
      readingSeconds: totals.readingSeconds + (Number(entry.readingSeconds) || 0),
      sessions: totals.sessions + (Number(entry.sessions) || 0),
      notes: totals.notes + (Number(entry.notesCount) || 0),
      bookmarks: totals.bookmarks + (Number(entry.bookmarksCount) || 0),
      finished: entry.shelf === SHELVES.FINISHED ? totals.finished + 1 : totals.finished,
      books: totals.books + 1,
    }),
    { wordsRead: 0, readingSeconds: 0, sessions: 0, notes: 0, bookmarks: 0, finished: 0, books: 0 }
  );
}

export function getShelfCounts(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];

  return safeEntries.reduce(
    (counts, entry) => {
      if (counts[entry.shelf] !== undefined) counts[entry.shelf] += 1;
      return counts;
    },
    {
      [SHELVES.READING]: 0,
      [SHELVES.FINISHED]: 0,
      [SHELVES.TO_READ]: 0,
    }
  );
}

export function getLibraryStats({ entries = getEntries() } = {}) {
  const totals = getTotals(entries);
  const nightSessions = countNightSessions(entries);

  return {
    ...totals,
    nightSessions,
    shelves: getShelfCounts(entries),
    formatted: {
      wordsRead: formatWords(totals.wordsRead),
      timeReading: formatMinutes(totals.readingSeconds / 60),
      books: `${totals.books}`,
      finished: `${totals.finished}`,
      notes: `${totals.notes}`,
      bookmarks: `${totals.bookmarks}`,
      sessions: `${totals.sessions}`,
      nightSessions: `${nightSessions}`,
    },
  };
}

export { formatMinutes, formatWords };
