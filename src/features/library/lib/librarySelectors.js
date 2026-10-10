/**
 * librarySelectors: pure reads over library metadata.
 *
 * The store already owns normalisation, dedupe, capping and recency ordering.
 * These selectors only shape that output for display, so no view needs to
 * re-derive shelf rules or invent a second time format.
 *
 * Document text is never present on an entry, so nothing here can leak a book.
 */
import { FINISHED_PROGRESS, SHELVES } from './libraryStore.js';

const DEFAULT_RECENT_LIMIT = 5;
const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const MONTH_MS = 30 * DAY_MS;

function clampProgress(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export { clampProgress };

function entryList(entries) {
  return Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object') : [];
}

function byMostRecent(a, b) {
  return (Number(b?.lastOpenedAt) || 0) - (Number(a?.lastOpenedAt) || 0);
}

function onShelf(entries, shelf) {
  return entryList(entries).filter((entry) => entry.shelf === shelf).sort(byMostRecent);
}

/** In-progress books, most recently opened first. */
export function selectRecent(entries, limit = DEFAULT_RECENT_LIMIT) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : DEFAULT_RECENT_LIMIT;
  return entryList(entries)
    .filter((entry) => entry.shelf === SHELVES.READING && clampProgress(entry.progress) < FINISHED_PROGRESS)
    .sort(byMostRecent)
    .slice(0, safeLimit);
}

export function selectToRead(entries, limit = DEFAULT_RECENT_LIMIT) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : DEFAULT_RECENT_LIMIT;
  return onShelf(entries, SHELVES.TO_READ).slice(0, safeLimit);
}

export function selectFinished(entries, limit = DEFAULT_RECENT_LIMIT) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : DEFAULT_RECENT_LIMIT;
  return onShelf(entries, SHELVES.FINISHED).slice(0, safeLimit);
}

/** The single book worth resuming, or null when nothing is honest to resume. */
export function selectContinueReading(entries) {
  return selectRecent(entries, 1)[0] ?? null;
}

/** One clamped percentage, used for both the number and the aria value. */
export function formatProgress(progress) {
  return `${clampProgress(progress)}%`;
}

/**
 * The single relative-time vocabulary in the app. Replaces the copy that used
 * to live privately inside ResumeCard so the shelf and the card never disagree.
 */
export function formatLastOpened(timestamp, now = Date.now()) {
  const opened = Number(timestamp);
  if (!Number.isFinite(opened) || opened <= 0) return '';

  const elapsed = Math.max(0, (Number(now) || 0) - opened);
  if (elapsed < MINUTE_MS) return 'just now';

  const minutes = Math.round(elapsed / MINUTE_MS);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (elapsed < MONTH_MS) return `${days}d ago`;
  return 'a while ago';
}

/**
 * How an entry can be reached again.
 *
 * `file`     a real document whose file the reader must re-pick.
 * `bundled`  ships with the app, so it is always openable and needs no file.
 * `device`   a private copy is kept in this browser, so it reopens instantly.
 * `missing`  a real document whose stored file is gone; only metadata remains.
 */
export function describeSource(entry) {
  if (!entry || typeof entry !== 'object') return 'missing';
  if (entry.kind === 'SAMPLE' || entry.documentId === 'bookflow-sample') return 'bundled';
  if (entry.offline === true) return 'device';
  return entry.fileName ? 'file' : 'missing';
}

/** True when a real file was recorded and can be offered for re-selection. */
export function hasReopenableSource(entry) {
  return describeSource(entry) === 'file';
}

/**
 * True when the book can be opened again at all. The bundled sample always can,
 * which is why it must not be described as a lost file.
 */
export function canResume(entry) {
  return describeSource(entry) !== 'missing';
}
