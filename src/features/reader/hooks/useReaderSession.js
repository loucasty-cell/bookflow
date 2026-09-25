/**
 * useReaderSession: book state, open/close, resume, chapter navigation.
 *
 * Extracted from App.jsx to separate session management from scroll/alignment logic.
 */
import { useCallback, useRef, useState } from "react";
import { useUIStore } from "../../../store/uiStore.js";
import { useReaderStore } from "../../../store/readerStore.js";
import {
  documentStorageKey,
  getStorageItem,
  safeParse,
} from "../../../shared/lib/index.js";

function hasParagraph(book, paragraphId) {
  if (!book || !paragraphId) return false;
  const match = String(paragraphId).match(/^paragraph-(\d+)-(\d+)$/);
  if (!match) return false;
  const chapter = book.chapters?.[Number(match[1])];
  const paragraphIndex = Number(match[2]);
  return (
    Number.isInteger(paragraphIndex) &&
    paragraphIndex >= 0 &&
    Array.isArray(chapter?.paragraphs) &&
    paragraphIndex < chapter.paragraphs.length
  );
}

function savedScrollTop(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function useReaderSession({ clearTimers }) {
  const [book, setBook] = useState(null);
  const [bookId, setBookId] = useState("");
  const [activeParagraphId, setActiveParagraphId] = useState("");
  const [pinnedId, setPinnedId] = useState("");
  const [activeChapter, setActiveChapter] = useState(0);
  const [readerState, setReaderState] = useState("focused");
  const [activeParagraphIsLarge, setActiveParagraphIsLarge] = useState(false);
  const [overStaticRegion, setOverStaticRegion] = useState(false);
  const [staticRegionLabel, setStaticRegionLabel] = useState("Reading the intro");

  const activeParagraphIdRef = useRef("");
  const pinnedIdRef = useRef("");
  const pendingRestoreParagraphRef = useRef("");
  const pendingRestoreScrollTopRef = useRef(0);
  const hasRestorePositionRef = useRef(false);
  const hasMeasuredBookRef = useRef(false);
  const overStaticRegionRef = useRef(false);
  const paragraphsRef = useRef([]);
  const userScrollingRef = useRef(false);
  const activeParagraphIsLargeRef = useRef(false);

  const {
    setSettingsOpen,
    setSidebarOpen,
    setSidebarCollapsed,
    setNotesOpen,
    setError,
  } = useUIStore();

  const { setProgress, setBookmarks, setNotes } = useReaderStore();

  const openBook = useCallback(
    (nextBook, id) => {
      const parsed = safeParse(getStorageItem(documentStorageKey(id)), {});
      const saved =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};
      clearTimers();
      const legacyMatch = String(saved.activeId ?? "").match(/^(\d+)-(\d+)-\d+$/);
      const fallbackParagraph = legacyMatch
        ? `paragraph-${legacyMatch[1]}-${legacyMatch[2]}`
        : "";
      const storedParagraph = saved.activeParagraphId
        ? String(saved.activeParagraphId)
        : fallbackParagraph;
      const restoredActive = hasParagraph(nextBook, storedParagraph)
        ? storedParagraph
        : hasParagraph(nextBook, fallbackParagraph)
          ? fallbackParagraph
          : "";
      const restoreScrollTop = savedScrollTop(saved.scrollTop);
      pendingRestoreParagraphRef.current = restoredActive;
      pendingRestoreScrollTopRef.current = restoreScrollTop;
      hasRestorePositionRef.current = Boolean(restoredActive || restoreScrollTop);
      setBook(nextBook);
      setBookId(id);
      setNotes(saved.notes ?? []);
      setBookmarks(saved.bookmarks ?? []);
      setProgress(saved.progress ?? 0);
      setActiveParagraphId(restoredActive);
      setPinnedId("");
      setReaderState("focused");
      overStaticRegionRef.current = false;
      setOverStaticRegion(false);
      setStaticRegionLabel("Reading the intro");
      activeParagraphIdRef.current = restoredActive;
      pinnedIdRef.current = "";
      paragraphsRef.current = [];
      hasMeasuredBookRef.current = false;
      setActiveChapter(0);
      setSidebarOpen(false);
      setSidebarCollapsed(false);
      setNotesOpen(false);
      setSettingsOpen(false);
      setError("");
      document.title = `${nextBook.title} - Bookflow`;
    },
    [
      clearTimers,
      setBookmarks,
      setError,
      setNotes,
      setNotesOpen,
      setProgress,
      setSettingsOpen,
      setSidebarCollapsed,
      setSidebarOpen,
    ]
  );

  const closeBook = useCallback(() => {
    clearTimers();
    setBook(null);
    setBookId("");
    setNotesOpen(false);
    setSettingsOpen(false);
    setSidebarOpen(false);
    setSidebarCollapsed(false);
    setPinnedId("");
    pendingRestoreParagraphRef.current = "";
    pendingRestoreScrollTopRef.current = 0;
    setActiveParagraphIsLarge(false);
    setOverStaticRegion(false);
    setStaticRegionLabel("Reading the intro");
    setActiveParagraphId("");
    userScrollingRef.current = false;
    activeParagraphIdRef.current = "";
    pinnedIdRef.current = "";
    activeParagraphIsLargeRef.current = false;
    hasRestorePositionRef.current = false;
    hasMeasuredBookRef.current = false;
    overStaticRegionRef.current = false;
    paragraphsRef.current = [];
    document.title = "Bookflow - Read in your rhythm";
  }, [
    clearTimers,
    setNotesOpen,
    setSettingsOpen,
    setSidebarOpen,
    setSidebarCollapsed,
  ]);

  const jumpToChapter = useCallback(
    (index, setSelectedParagraph) => {
      const targetParagraph = paragraphsRef.current.find((p) => p.chapter === index);
      const { settings } = useReaderStore.getState();
      if (settings.mode === "focus" && targetParagraph) {
        setSelectedParagraph(targetParagraph, "smooth");
      } else {
        const chapterElement = document.getElementById(`chapter-${index}`);
        if (chapterElement) {
          const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
          chapterElement.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
        setActiveChapter(index);
      }
      setSidebarOpen(false);
    },
    [setSidebarOpen]
  );

  const focusParagraph = useCallback(
    (id, setSelectedParagraph) => {
      const targetParagraph = paragraphsRef.current.find((p) => p.id === id);
      if (targetParagraph) setSelectedParagraph(targetParagraph, "smooth");

      const nextPinnedId = pinnedIdRef.current === id ? "" : id;
      pinnedIdRef.current = nextPinnedId;
      setPinnedId(nextPinnedId);
      setReaderState(nextPinnedId ? "paused" : "focused");
    },
    []
  );

  const resumeFlow = useCallback(
    (alignParagraphRef) => {
      clearTimers();
      pinnedIdRef.current = "";
      setPinnedId("");
      setReaderState("focused");
      if (!activeParagraphIsLargeRef.current)
        alignParagraphRef.current?.(activeParagraphIdRef.current, "smooth");
    },
    [clearTimers]
  );

  return {
    book,
    setBook,
    bookId,
    setBookId,
    activeParagraphId,
    setActiveParagraphId,
    pinnedId,
    setPinnedId,
    activeChapter,
    setActiveChapter,
    readerState,
    setReaderState,
    activeParagraphIsLarge,
    setActiveParagraphIsLarge,
    overStaticRegion,
    setOverStaticRegion,
    staticRegionLabel,
    setStaticRegionLabel,
    activeParagraphIdRef,
    pinnedIdRef,
    pendingRestoreParagraphRef,
    pendingRestoreScrollTopRef,
    hasRestorePositionRef,
    hasMeasuredBookRef,
    overStaticRegionRef,
    paragraphsRef,
    userScrollingRef,
    activeParagraphIsLargeRef,
    openBook,
    closeBook,
    jumpToChapter,
    focusParagraph,
    resumeFlow,
  };
}
