/**
 * offlineBooks: private on-device copies of opened books.
 *
 * A parsed book is kept in durable browser storage (OPFS or IndexedDB) so the
 * library can reopen it instantly instead of asking for the file again. The
 * copy never leaves the device, and the library entry only carries an
 * `offline` flag, never the text.
 */
import {
  deleteDocument,
  getDurableKind,
  getDurableStore,
  listDocumentIds,
  loadDocument,
  saveDocument,
} from './durableStorage.js';
import { SHELVES, getEntry, readLibrary, upsertEntry } from './libraryStore.js';

export const SAMPLE_DOCUMENT_ID = 'bookflow-sample';
export const MAX_OFFLINE_BOOKS = 20;

const FILE_ID_PATTERN = /^(.+):(\d+):(-?\d+(?:\.\d+)?)$/;

export function fileMetaFromDocumentId(documentId) {
  const match = String(documentId ?? '').match(FILE_ID_PATTERN);
  if (!match) return { fileName: '', size: 0, lastModified: 0 };
  return { fileName: match[1], size: Number(match[2]), lastModified: Number(match[3]) };
}

export function isReadableBook(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray(value.chapters) &&
    value.chapters.length > 0 &&
    value.chapters.every((chapter) => chapter && Array.isArray(chapter.paragraphs))
  );
}

function setOfflineFlag(documentId, offline) {
  const existing = getEntry(documentId);
  if (!existing || existing.offline === offline) return;
  upsertEntry({ ...existing, offline });
}

/** Records that a book was opened, without touching measured session totals. */
export function touchLibraryEntry(documentId, book, { totalWords = 0, now = Date.now() } = {}) {
  if (!documentId || !isReadableBook(book)) return null;
  const existing = getEntry(documentId);
  const meta = fileMetaFromDocumentId(documentId);
  const shelf = !existing || existing.shelf === SHELVES.TO_READ ? SHELVES.READING : existing.shelf;
  return upsertEntry({
    ...(existing ?? {}),
    documentId,
    title: book.title || existing?.title || meta.fileName,
    author: book.author || existing?.author || '',
    kind: book.kind || existing?.kind || '',
    fileName: existing?.fileName || meta.fileName,
    size: existing?.size || meta.size,
    lastModified: existing?.lastModified || meta.lastModified,
    totalChapters: book.chapters.length,
    totalWords: totalWords || existing?.totalWords || 0,
    shelf,
    addedAt: existing?.addedAt ?? now,
    lastOpenedAt: now,
  });
}

export async function pruneOfflineBooks(limit = MAX_OFFLINE_BOOKS) {
  const keep = new Set(
    readLibrary().entries.slice(0, Math.max(0, limit)).map((entry) => entry.documentId),
  );
  const stored = await listDocumentIds();
  const stale = stored.filter((id) => !keep.has(id));
  await Promise.all(stale.map((id) => deleteDocument(id)));
  stale.forEach((id) => setOfflineFlag(id, false));
  return stale.length;
}

/** Saves a private copy. Resolves false when durable storage is unavailable. */
export async function keepBookOnDevice(documentId, book) {
  if (!documentId || documentId === SAMPLE_DOCUMENT_ID || !isReadableBook(book)) return false;
  try {
    await getDurableStore();
    if (getDurableKind() === 'memory') return false;
    await saveDocument(documentId, JSON.parse(JSON.stringify(book)));
    setOfflineFlag(documentId, true);
    await pruneOfflineBooks();
    return getEntry(documentId)?.offline === true;
  } catch {
    setOfflineFlag(documentId, false);
    return false;
  }
}

/** Loads a private copy, or null when it is gone or unreadable. */
export async function loadOfflineBook(documentId) {
  if (!documentId) return null;
  try {
    const book = await loadDocument(documentId);
    if (isReadableBook(book)) return book;
  } catch {
    // Fall through: a missing or corrupt copy is treated as no copy.
  }
  setOfflineFlag(documentId, false);
  return null;
}

/** Removes every private copy and clears the flags; progress is kept. */
export async function forgetOfflineBooks() {
  try {
    const stored = await listDocumentIds();
    await Promise.all(stored.map((id) => deleteDocument(id)));
  } catch {
    // Flags are still cleared so the library never promises a missing copy.
  }
  readLibrary()
    .entries.filter((entry) => entry.offline)
    .forEach((entry) => setOfflineFlag(entry.documentId, false));
}
