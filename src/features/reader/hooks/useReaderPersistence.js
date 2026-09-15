/**
 * useReaderPersistence: localStorage save/restore for settings and per-document state.
 *
 * Extracted from App.jsx to isolate persistence concerns.
 */
import { useEffect } from "react";
import { useReaderStore } from "../../../store/readerStore.js";
import {
  documentStorageKey,
  setStorageItem,
} from "../../../shared/lib/index.js";

export function useReaderPersistence({ bookId, activeParagraphId, bookmarks, notes, progress, readerRef }) {
  const { settings } = useReaderStore();

  // Persist settings
  useEffect(() => {
    setStorageItem("bookflow:settings", settings);
    if (settings?.theme) {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
  }, [settings]);

  // Persist per-document state
  useEffect(() => {
    if (!bookId) return;

    setStorageItem(
      documentStorageKey(bookId),
      JSON.stringify({
        notes,
        bookmarks,
        progress,
        activeParagraphId,
        scrollTop: readerRef.current?.scrollTop ?? 0,
      })
    );
  }, [activeParagraphId, bookId, bookmarks, notes, progress, readerRef]);
}
