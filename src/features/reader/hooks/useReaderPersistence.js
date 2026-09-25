/**
 * useReaderPersistence: localStorage save/restore for settings and per-document state.
 *
 * Extracted from App.jsx to isolate persistence concerns.
 */
import { useEffect, useRef } from "react";
import { useReaderStore } from "../../../store/readerStore.js";
import {
  documentStorageKey,
  getStorageItem,
  safeParse,
  setStorageItem,
} from "../../../shared/lib/index.js";

const PERSIST_THROTTLE_MS = 500;

export function useReaderPersistence({ bookId, activeParagraphId, bookmarks, notes, progress, readerRef }) {
  const { settings } = useReaderStore();

  // Persist settings
  useEffect(() => {
    setStorageItem("bookflow:settings", settings);
    if (settings?.theme) {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
  }, [settings]);

  // Immediate persistence whenever notes change (saves quick notes without waiting for scroll throttle)
  const prevNotesRef = useRef(notes);
  useEffect(() => {
    if (!bookId) return;
    if (prevNotesRef.current !== notes) {
      prevNotesRef.current = notes;
      const docKey = documentStorageKey(bookId);
      const current = safeParse(getStorageItem(docKey), {});
      setStorageItem(docKey, {
        ...(current && typeof current === "object" ? current : {}),
        notes,
        bookmarks,
        progress,
        activeParagraphId,
        scrollTop: readerRef.current?.scrollTop ?? 0,
      });
      setStorageItem(`bookflow:quick-notes:${bookId}`, notes);
    }
  }, [bookId, notes, bookmarks, progress, activeParagraphId, readerRef]);

  // Persist per-document state (throttled: progress ticks on every scroll)
  const lastPersistRef = useRef(0);
  const bookIdRef = useRef(bookId);
  bookIdRef.current = bookId;
  useEffect(() => {
    if (!bookId) return undefined;

    // TODO(improvements-gap-4): harden anchors beyond paragraph ids. Notes and
    // bookmarks keyed `paragraph-{chapter}-{index}` break when OCR retries or
    // parsing changes. Add quote selectors + normalized quote hash with source
    // provenance, resolve by exact location first with prefix/suffix fallback,
    // show "Review location" on ambiguity, and store parser version in the
    // document metadata. Include an anchor repair report after reprocessing.
    const now = Date.now();
    const write = () => {
      lastPersistRef.current = Date.now();
      setStorageItem(documentStorageKey(bookId), {
        notes,
        bookmarks,
        progress,
        activeParagraphId,
        scrollTop: readerRef.current?.scrollTop ?? 0,
      });
      setStorageItem(`bookflow:quick-notes:${bookId}`, notes);
    };
    const elapsed = now - lastPersistRef.current;
    if (elapsed >= PERSIST_THROTTLE_MS) {
      write();
      return undefined;
    }
    const timer = window.setTimeout(write, PERSIST_THROTTLE_MS - elapsed);
    return () => {
      window.clearTimeout(timer);
      if (bookIdRef.current !== bookId) write();
    };
  }, [activeParagraphId, bookId, bookmarks, notes, progress, readerRef]);
}
