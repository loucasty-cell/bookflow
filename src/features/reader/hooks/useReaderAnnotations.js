import { useCallback, useState } from "react";

function timestampNoteId() {
  return `note-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function useReaderAnnotations({ focusId, focusedParagraph, setBookmarks, setNotes, setError }) {
  const [noteDraft, setNoteDraft] = useState("");

  const toggleBookmark = useCallback((bookmarkId = focusId) => {
    if (!bookmarkId) return;
    setBookmarks((current) => {
      const bookmarks = Array.isArray(current) ? current : [];
      return bookmarks.includes(bookmarkId)
        ? bookmarks.filter((id) => id !== bookmarkId)
        : [...bookmarks, bookmarkId];
    });
  }, [focusId, setBookmarks]);

  const newNoteId = useCallback(() => {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch {
      return timestampNoteId();
    }
    return timestampNoteId();
  }, []);

  const addNote = useCallback(() => {
    const text = noteDraft.trim();
    if (!text || !focusId) return;

    setNotes((current) => [
      {
        id: newNoteId(),
        paragraphId: focusId,
        quote: focusedParagraph?.text ?? "",
        text,
      },
      ...current,
    ]);
    setNoteDraft("");
  }, [noteDraft, focusId, focusedParagraph, setNotes, newNoteId]);

  const copyFocusedParagraph = useCallback(async () => {
    if (!focusedParagraph) return;
    try {
      await navigator.clipboard?.writeText(focusedParagraph.text);
    } catch {
      setError("Copy is unavailable in this browser. Select the text manually to copy it.");
    }
  }, [focusedParagraph, setError]);

  return {
    noteDraft,
    setNoteDraft,
    toggleBookmark,
    addNote,
    copyFocusedParagraph,
  };
}
