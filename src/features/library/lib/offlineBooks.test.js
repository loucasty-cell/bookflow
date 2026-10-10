import { beforeEach, describe, expect, it, vi } from 'vitest';

const durable = vi.hoisted(() => ({
  documents: new Map(),
  kind: 'indexeddb',
  failSave: false,
}));

vi.mock('./durableStorage.js', () => ({
  getDurableStore: async () => ({ kind: durable.kind }),
  getDurableKind: () => durable.kind,
  saveDocument: async (id, document) => {
    if (durable.failSave) throw new Error('QuotaExceededError');
    durable.documents.set(id, document);
    return true;
  },
  loadDocument: async (id) => durable.documents.get(id) ?? null,
  deleteDocument: async (id) => {
    durable.documents.delete(id);
    return true;
  },
  listDocumentIds: async () => [...durable.documents.keys()],
}));

import {
  SAMPLE_DOCUMENT_ID,
  fileMetaFromDocumentId,
  forgetOfflineBooks,
  isReadableBook,
  keepBookOnDevice,
  loadOfflineBook,
  pruneOfflineBooks,
  touchLibraryEntry,
} from './offlineBooks.js';
import { SHELVES, clearLibrary, getEntry, recordSession, upsertEntry } from './libraryStore.js';

const BOOK = {
  title: 'Night Notes',
  author: 'A. Writer',
  kind: 'EPUB',
  chapters: [{ title: 'One', paragraphs: ['First line.', 'Second line.'] }],
};
const FILE_ID = 'night-notes.epub:2048:1700000000000';

beforeEach(() => {
  durable.documents.clear();
  durable.kind = 'indexeddb';
  durable.failSave = false;
  clearLibrary();
});

describe('offlineBooks', () => {
  it('parses the canonical file id back into file metadata', () => {
    expect(fileMetaFromDocumentId(FILE_ID)).toEqual({
      fileName: 'night-notes.epub',
      size: 2048,
      lastModified: 1700000000000,
    });
    expect(fileMetaFromDocumentId('a:b:c.pdf:10:5')).toEqual({ fileName: 'a:b:c.pdf', size: 10, lastModified: 5 });
    expect(fileMetaFromDocumentId('ocr-123')).toEqual({ fileName: '', size: 0, lastModified: 0 });
  });

  it('rejects values that are not a readable book', () => {
    expect(isReadableBook(BOOK)).toBe(true);
    expect(isReadableBook(null)).toBe(false);
    expect(isReadableBook({ chapters: [] })).toBe(false);
    expect(isReadableBook({ chapters: [{ title: 'x' }] })).toBe(false);
  });

  it('records an opened book on the shelf without inventing session totals', () => {
    touchLibraryEntry(FILE_ID, BOOK, { totalWords: 4, now: 1000 });
    const entry = getEntry(FILE_ID);
    expect(entry).toMatchObject({
      title: 'Night Notes',
      fileName: 'night-notes.epub',
      totalChapters: 1,
      totalWords: 4,
      shelf: SHELVES.READING,
      sessions: 0,
      wordsRead: 0,
      lastOpenedAt: 1000,
    });
  });

  it('keeps measured progress and a finished shelf when a book is reopened', () => {
    recordSession({ documentId: FILE_ID, title: 'Night Notes', progress: 100, wordsRead: 50, readingSeconds: 60 });
    touchLibraryEntry(FILE_ID, BOOK, { now: 5000 });
    const entry = getEntry(FILE_ID);
    expect(entry.progress).toBe(100);
    expect(entry.shelf).toBe(SHELVES.FINISHED);
    expect(entry.sessions).toBe(1);
    expect(entry.lastOpenedAt).toBe(5000);
  });

  it('keeps the recorded file name when a session omits it', () => {
    touchLibraryEntry(FILE_ID, BOOK);
    recordSession({ documentId: FILE_ID, title: 'Night Notes', progress: 30, wordsRead: 40 });
    expect(getEntry(FILE_ID)).toMatchObject({ fileName: 'night-notes.epub', size: 2048, author: 'A. Writer' });
  });

  it('moves a queued book to the reading shelf once opened', () => {
    upsertEntry({ documentId: FILE_ID, title: 'Night Notes', shelf: SHELVES.TO_READ });
    touchLibraryEntry(FILE_ID, BOOK);
    expect(getEntry(FILE_ID).shelf).toBe(SHELVES.READING);
  });

  it('saves a private copy and reopens it without the file', async () => {
    touchLibraryEntry(FILE_ID, BOOK);
    expect(await keepBookOnDevice(FILE_ID, BOOK)).toBe(true);
    expect(getEntry(FILE_ID).offline).toBe(true);
    expect(await loadOfflineBook(FILE_ID)).toEqual(BOOK);
  });

  it('never stores the bundled sample', async () => {
    touchLibraryEntry(SAMPLE_DOCUMENT_ID, BOOK);
    expect(await keepBookOnDevice(SAMPLE_DOCUMENT_ID, BOOK)).toBe(false);
    expect(durable.documents.size).toBe(0);
  });

  it('does not promise an offline copy when only memory storage exists', async () => {
    durable.kind = 'memory';
    touchLibraryEntry(FILE_ID, BOOK);
    expect(await keepBookOnDevice(FILE_ID, BOOK)).toBe(false);
    expect(getEntry(FILE_ID).offline).toBe(false);
  });

  it('clears the flag when saving fails or the copy disappears', async () => {
    touchLibraryEntry(FILE_ID, BOOK);
    durable.failSave = true;
    expect(await keepBookOnDevice(FILE_ID, BOOK)).toBe(false);
    expect(getEntry(FILE_ID).offline).toBe(false);

    durable.failSave = false;
    await keepBookOnDevice(FILE_ID, BOOK);
    durable.documents.clear();
    expect(await loadOfflineBook(FILE_ID)).toBeNull();
    expect(getEntry(FILE_ID).offline).toBe(false);
  });

  it('prunes copies beyond the most recent books and orphaned copies', async () => {
    for (let index = 0; index < 3; index += 1) {
      const id = `book-${index}.txt:1:${index}`;
      touchLibraryEntry(id, BOOK, { now: 1000 + index });
      await keepBookOnDevice(id, BOOK);
    }
    durable.documents.set('orphan', BOOK);
    expect(await pruneOfflineBooks(2)).toBe(2);
    expect([...durable.documents.keys()].sort()).toEqual(['book-1.txt:1:1', 'book-2.txt:1:2']);
    expect(getEntry('book-0.txt:1:0').offline).toBe(false);
  });

  it('forgets every copy while keeping reading progress', async () => {
    recordSession({ documentId: FILE_ID, title: 'Night Notes', progress: 40, wordsRead: 50 });
    await keepBookOnDevice(FILE_ID, BOOK);
    await forgetOfflineBooks();
    expect(durable.documents.size).toBe(0);
    expect(getEntry(FILE_ID)).toMatchObject({ offline: false, progress: 40 });
  });
});
