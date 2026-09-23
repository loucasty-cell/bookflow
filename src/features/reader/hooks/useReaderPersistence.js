/**
 * useReaderPersistence: localStorage save/restore for settings and per-document state.
 *
 * Extracted from App.jsx to isolate persistence concerns.
 */
import { useEffect, useRef } from "react";
import { useReaderStore } from "../../../store/readerStore.js";
import {
  documentStorageKey,
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

  // Persist per-document state (throttled: progress ticks on every scroll)
  const lastPersistRef = useRef(0);
  const bookIdRef = useRef(bookId);
  bookIdRef.current = bookId;
  useEffect(() => {
    if (!bookId) return undefined;

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
