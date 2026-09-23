/**
 * libraryStore: local-only library index for resume, shelves, and derived stats.
 *
 * Stores metadata only. Document text is never persisted here.
 */
import {
  getSafeStorage,
  removeStorageItem,
  safeParse,
  setStorageItem,
} from '../../../shared/lib/index.js';

export const LIBRARY_STORAGE_KEY = 'bookflow:library';
export const LIBRARY_VERSION = 1;
export const MAX_LIBRARY_ENTRIES = 60;
export const FINISHED_PROGRESS = 98;

export const SHELVES = {
  READING: 'reading',
  FINISHED: 'finished',
  TO_READ: 'to-read',
};

const SHELF_VALUES = Object.values(SHELVES);

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonNegativeInt(value) {
  return Math.max(0, Math.round(toFiniteNumber(value, 0)));
}

function toStringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

export function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const documentId = toStringOrEmpty(raw.documentId).trim();
  if (!documentId) return null;

  const now = Date.now();
  const addedAt = toFiniteNumber(raw.addedAt, now);

  return {
    documentId,
    title: toStringOrEmpty(raw.title).trim() || 'Untitled document',
    author: toStringOrEmpty(raw.author).trim(),
    kind: toStringOrEmpty(raw.kind).trim().toUpperCase() || 'FILE',
    fileName: toStringOrEmpty(raw.fileName),
    size: toNonNegativeInt(raw.size),
    lastModified: toFiniteNumber(raw.lastModified, 0),
    progress: Math.min(100, Math.max(0, Math.round(toFiniteNumber(raw.progress, 0)))),
    activeChapter: toNonNegativeInt(raw.activeChapter),
    totalChapters: toNonNegativeInt(raw.totalChapters),
    totalWords: toNonNegativeInt(raw.totalWords),
    wordsRead: toNonNegativeInt(raw.wordsRead),
    readingSeconds: toNonNegativeInt(raw.readingSeconds),
    sessions: toNonNegativeInt(raw.sessions),
    notesCount: toNonNegativeInt(raw.notesCount),
    bookmarksCount: toNonNegativeInt(raw.bookmarksCount),
    activeParagraphId: toStringOrEmpty(raw.activeParagraphId),
    shelf: SHELF_VALUES.includes(raw.shelf) ? raw.shelf : SHELVES.READING,
    addedAt,
    lastOpenedAt: toFiniteNumber(raw.lastOpenedAt, addedAt),
    completedAt: toFiniteNumber(raw.completedAt, 0),
  };
}

export function emptyLibrary() {
  return { version: LIBRARY_VERSION, entries: [] };
}

function byMostRecent(a, b) {
  return b.lastOpenedAt - a.lastOpenedAt;
}

function dedupe(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const existing = seen.get(entry.documentId);
    if (!existing || entry.lastOpenedAt > existing.lastOpenedAt) {
      seen.set(entry.documentId, entry);
    }
  }
  return [...seen.values()];
}

/** Entries beyond the cap are dropped oldest-first, never while marked to-read. */
export function enforceCap(entries, cap = MAX_LIBRARY_ENTRIES) {
  if (entries.length <= cap) return entries;

  const protectedCount = entries.filter((entry) => entry.shelf === SHELVES.TO_READ).length;
  const keepEvictable = Math.max(0, cap - protectedCount);
  const evictable = entries
    .filter((entry) => entry.shelf !== SHELVES.TO_READ)
    .sort(byMostRecent)
    .slice(keepEvictable)
    .map((entry) => entry.documentId);

  return entries.filter((entry) => !evictable.includes(entry.documentId));
}

export function readLibrary() {
  const raw = safeParse(getSafeStorage().getItem(LIBRARY_STORAGE_KEY), null);
  if (!raw || typeof raw !== 'object') return emptyLibrary();
  if (raw.version !== LIBRARY_VERSION) return emptyLibrary();

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map(normalizeEntry).filter(Boolean)
    : [];

  return {
    version: LIBRARY_VERSION,
    entries: enforceCap(dedupe(entries)).sort(byMostRecent),
  };
}

export function writeLibrary(library) {
  setStorageItem(LIBRARY_STORAGE_KEY, library);
}

export function clearLibrary() {
  removeStorageItem(LIBRARY_STORAGE_KEY);
}

export function getEntries() {
  return readLibrary().entries;
}

export function getEntry(documentId) {
  if (!documentId) return null;
  return readLibrary().entries.find((entry) => entry.documentId === documentId) ?? null;
}

/**
 * The single most recently opened entry that is not finished and not merely queued.
 * Returns null when there is nothing honest to resume.
 */
export function getResumeEntry() {
  const candidate = readLibrary()
    .entries.filter((entry) => entry.shelf === SHELVES.READING && entry.progress < FINISHED_PROGRESS)
    .sort(byMostRecent)[0];
  return candidate ?? null;
}

export function upsertEntry(patch) {
  const normalized = normalizeEntry(patch);
  if (!normalized) return readLibrary();

  const library = readLibrary();
  const index = library.entries.findIndex((entry) => entry.documentId === normalized.documentId);
  const previous = index >= 0 ? library.entries[index] : null;

  const patchKeys = patch && typeof patch === 'object' ? new Set(Object.keys(patch)) : new Set();
  const merged = previous
    ? normalizeEntry({
        ...previous,
        ...normalized,
        addedAt: previous.addedAt,
        sessions: patchKeys.has('sessions') ? toNonNegativeInt(normalized.sessions) : previous.sessions,
        readingSeconds: patchKeys.has('readingSeconds') ? toNonNegativeInt(normalized.readingSeconds) : previous.readingSeconds,
        wordsRead: patchKeys.has('wordsRead') ? toNonNegativeInt(normalized.wordsRead) : previous.wordsRead,
        completedAt: previous.completedAt || normalized.completedAt,
      })
    : normalized;

  const entries = index >= 0
    ? library.entries.map((entry, i) => (i === index ? merged : entry))
    : [merged, ...library.entries];

  const next = {
    version: LIBRARY_VERSION,
    entries: enforceCap(dedupe(entries)).sort(byMostRecent),
  };

  writeLibrary(next);
  return next;
}

/** Moves an entry between shelves. Finished entries keep their completion timestamp. */
export function setShelf(documentId, shelf) {
  if (!SHELF_VALUES.includes(shelf)) return readLibrary();

  const library = readLibrary();
  const entries = library.entries.map((entry) => {
    if (entry.documentId !== documentId) return entry;
    return normalizeEntry({
      ...entry,
      shelf,
      completedAt: shelf === SHELVES.FINISHED && !entry.completedAt
        ? Date.now()
        : entry.completedAt,
    });
  });

  const next = { version: LIBRARY_VERSION, entries: enforceCap(entries).sort(byMostRecent) };
  writeLibrary(next);
  return next;
}

export function removeEntry(documentId) {
  const library = readLibrary();
  const next = {
    version: LIBRARY_VERSION,
    entries: enforceCap(
      library.entries.filter((entry) => entry.documentId !== documentId)
    ).sort(byMostRecent),
  };
  writeLibrary(next);
  return next;
}

/**
 * Records a real reading session against an entry.
 * Every number comes from measured activity, never from progress percent alone.
 */
export function recordSession({
  documentId,
  title,
  author,
  kind,
  fileName,
  size,
  lastModified,
  progress = 0,
  activeChapter = 0,
  totalChapters = 0,
  totalWords = 0,
  wordsRead = 0,
  readingSeconds = 0,
  notesCount = 0,
  bookmarksCount = 0,
  activeParagraphId = '',
}) {
  const existing = getEntry(documentId);
  const now = Date.now();
  const clampedProgress = Math.min(100, Math.max(0, Math.round(toFiniteNumber(progress, 0))));
  const isFinished = clampedProgress >= FINISHED_PROGRESS;

  return upsertEntry({
    ...(existing ?? {}),
    documentId,
    title,
    author,
    kind,
    fileName,
    size,
    lastModified,
    progress: clampedProgress,
    activeChapter,
    totalChapters,
    totalWords,
    wordsRead: toNonNegativeInt(existing?.wordsRead) + toNonNegativeInt(wordsRead),
    readingSeconds: toNonNegativeInt(existing?.readingSeconds) + toNonNegativeInt(readingSeconds),
    sessions: toNonNegativeInt(existing?.sessions) + 1,
    notesCount,
    bookmarksCount,
    activeParagraphId,
    shelf: isFinished ? SHELVES.FINISHED : SHELVES.READING,
    addedAt: existing?.addedAt ?? now,
    lastOpenedAt: now,
    completedAt: isFinished ? existing?.completedAt || now : 0,
  });
}

/** Queues a file the reader intends to read, without parsing or copying it. */
export function addToReadQueue(file) {
  if (!file) return readLibrary();

  const id = `${file.name}:${file.size}:${file.lastModified}`;
  const nameParts = String(file.name).split('.');
  const extension = nameParts.length > 1 ? nameParts.pop() : 'file';

  return upsertEntry({
    documentId: id,
    title: String(file.name).replace(/\.[^.]+$/, ''),
    kind: extension.toUpperCase(),
    fileName: String(file.name),
    size: toNonNegativeInt(file.size),
    lastModified: toFiniteNumber(file.lastModified, 0),
    shelf: SHELVES.TO_READ,
    addedAt: Date.now(),
    lastOpenedAt: Date.now(),
  });
}