import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppLandingView } from "./components/AppLandingView.jsx";
import { AppReaderView } from "./components/AppReaderView.jsx";
import { useModalFocus } from "./shared/lib/index.js";
import { useDocumentImport } from "./features/document-import/index.js";
import { useReaderStore } from "./store/readerStore.js";
import { useUIStore } from "./store/uiStore.js";
import {
  countBookWords,
  enrichChapters,
  readingMinutes,
  readingProgress,
  useChapterWindow,
  useReaderAnnotations,
  useReaderNavigation,
  useReaderPersistence,
  useReaderSession,
  useReaderStaticRegion,
} from "./features/reader/index.js";
import { useReadingSession } from "./features/library/index.js";
import { FocusBarHost } from "./features/reader/index.js";

const ENTRY_INTRO_STORAGE_KEY = "bookflow:entry-intro-seen";

function App() {
  const {
    settingsOpen,
    setSettingsOpen,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    notesOpen,
    setNotesOpen,
    ocrOpen,
    setOcrOpen,
    showIntervention,
    setShowIntervention,
    showEntryIntro,
    setShowEntryIntro,
    dragging,
    setDragging,
    loading,
    setLoading,
    error,
    setError,
  } = useUIStore();

  const { settings, setSettings, progress, setProgress, bookmarks, setBookmarks, notes, setNotes } =
    useReaderStore();

  useEffect(() => {
    const theme = settings?.theme || "paper";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [settings?.theme]);

  const fileInputRef = useRef(null);
  const readerRef = useRef(null);
  const navigationRef = useRef(null);
  const alignParagraphRef = useRef(null);
  const navigationHookRef = useRef(null);
  const ocrDialogRef = useRef(null);
  const ocrCloseButtonRef = useRef(null);

  const clearTimers = useCallback(() => {
    navigationHookRef.current?.clearAllTimers();
  }, []);

  // --- Session state ---
  const session = useReaderSession({
    clearTimers,
  });

  const {
    book,
    bookId,
    activeParagraphId,
    pinnedId,
    activeChapter,
    readerState,
    activeParagraphIsLarge,
    overStaticRegion,
    staticRegionLabel,
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
    jumpToChapter: rawJumpToChapter,
    focusParagraph: rawFocusParagraph,
    resumeFlow: rawResumeFlow,
    setBook: setSessionBook,
    setActiveParagraphId: setSessionActiveParagraphId,
    setActiveChapter: setSessionActiveChapter,
    setOverStaticRegion: setSessionOverStaticRegion,
    setStaticRegionLabel: setSessionStaticRegionLabel,
  } = session;

  const {
    cancelActiveImport,
    handleFile,
    handleOcrDocumentLoaded,
    jumpToUnit,
  } = useDocumentImport({
    fileInputRef,
    openBook,
    setBook: setSessionBook,
    setLoading,
    setError,
    setOcrOpen,
    useProgressiveImport: settings.useProgressiveImport,
  });

  const { updateStaticRegion, updateStaticScrollState } = useReaderStaticRegion({
    readerRef,
    overStaticRegionRef,
    setOverStaticRegion: setSessionOverStaticRegion,
    setStaticRegionLabel: setSessionStaticRegionLabel,
    setActiveChapter: setSessionActiveChapter,
    setProgress,
  });

  // --- Navigation ---
  const commitFocus = useCallback(
    (paragraph) => {
      if (!paragraph) return;

      const measuredParagraph = paragraphsRef.current.find(
        (candidate) => candidate.id === paragraph.id
      );
      const chapterIndex = paragraph.chapter ?? paragraph.chapterIndex;
      const paragraphIndex = Number(
        paragraph.globalIndex ??
          measuredParagraph?.globalIndex ??
          paragraph.index ??
          measuredParagraph?.index,
      );
      const totalParagraphs = Number(
        paragraph.totalParagraphs ??
          measuredParagraph?.totalParagraphs ??
          book?.chapters?.reduce(
            (total, chapter) => total + (chapter?.paragraphs?.length ?? 0),
            0,
          ) ??
          0,
      );
      activeParagraphIdRef.current = paragraph.id;
      setSessionActiveParagraphId(paragraph.id);
      if (Number.isFinite(chapterIndex)) setSessionActiveChapter(chapterIndex);
      if (Number.isFinite(paragraphIndex) && totalParagraphs > 0) {
        setProgress(readingProgress(paragraphIndex, totalParagraphs));
      }
    },
    [setProgress, setSessionActiveParagraphId, setSessionActiveChapter, paragraphsRef, activeParagraphIdRef, book]
  );

  const resumeFlow = useCallback(
    () => rawResumeFlow(alignParagraphRef),
    [rawResumeFlow, alignParagraphRef]
  );

  // --- Derived state ---
  const chapters = useMemo(() => enrichChapters(book), [book]);

  const paragraphMap = useMemo(() => {
    const entries = chapters.flatMap((chapter) => chapter.paragraphs);
    return new Map(entries.map((paragraph) => [paragraph.id, paragraph]));
  }, [chapters]);

  const totalWords = useMemo(() => countBookWords(book), [book]);
  const minutes = readingMinutes(totalWords);
  const focusId = pinnedId || activeParagraphId;
  const focusedParagraph = paragraphMap.get(focusId);
  const isBookmarked = focusId ? bookmarks.includes(focusId) : false;

  // --- Long-book chapter windowing (renders a window, spacers hold scroll) ---
  const chapterWindow = useChapterWindow({ docKey: bookId, chapters, activeChapter, focusId });

  useEffect(() => {
    if (!chapterWindow.windowed || !book) return;
    const restoreId = pendingRestoreParagraphRef.current;
    if (!restoreId) return;
    const paragraph = paragraphMap.get(restoreId);
    if (!paragraph) return;
    const mounted = paragraphsRef.current.some((measured) => measured.id === restoreId);
    if (mounted) return;
    if (paragraph.chapterIndex < chapterWindow.winStart || paragraph.chapterIndex > chapterWindow.winEnd) {
      chapterWindow.requestJump(paragraph.chapterIndex, restoreId);
    }
  }, [book, bookId, chapters, paragraphMap, chapterWindow, pendingRestoreParagraphRef, paragraphsRef]);

  const nav = useReaderNavigation({
    book,
    readerRef,
    activeParagraphIdRef,
    pinnedIdRef,
    paragraphsRef,
    userScrollingRef,
    activeParagraphIsLargeRef,
    hasMeasuredBookRef,
    pendingRestoreParagraphRef,
    pendingRestoreScrollTopRef,
    hasRestorePositionRef,
    overStaticRegionRef,
    setReaderState: session.setReaderState,
    setActiveParagraphIsLarge: session.setActiveParagraphIsLarge,
    setPinnedId: session.setPinnedId,
    updateStaticRegion,
    updateStaticScrollState,
    clearTimers,
    commitFocus,
    alignParagraphRef,
    navigationRef,
    measureKey: chapterWindow.windowed ? `${chapterWindow.winStart}:${chapterWindow.winEnd}` : "",
  });

  useEffect(() => {
    navigationHookRef.current = nav;
  }, [nav]);

  const jumpToChapter = useCallback(
    (index) => {
      jumpToUnit(index);
      if (chapterWindow.windowed) chapterWindow.requestJump(index);
      rawJumpToChapter(index, nav.setSelectedParagraph);
    },
    [jumpToUnit, rawJumpToChapter, nav.setSelectedParagraph, chapterWindow]
  );

  const focusParagraph = useCallback(
    (id) => {
      if (chapterWindow.windowed) {
        const paragraph = paragraphMap.get(id);
        if (paragraph && !paragraphsRef.current.some((measured) => measured.id === id)) {
          chapterWindow.requestJump(paragraph.chapterIndex, id);
        }
      }
      rawFocusParagraph(id, nav.setSelectedParagraph);
    },
    [rawFocusParagraph, nav.setSelectedParagraph, chapterWindow, paragraphMap, paragraphsRef]
  );

  // --- Persistence ---
  useReaderPersistence({
    bookId,
    activeParagraphId,
    bookmarks,
    notes,
    progress,
    readerRef,
  });

  const {
    sessionRecap,
    setSessionRecap,
    awardedBadges,
    awardBadges,
    finalizeSession,
  } = useReadingSession({
    book,
    bookId,
    progress,
    activeChapter,
    totalWords,
    activeParagraphId,
    focusId,
    paragraphMap,
    settings,
    notes,
    bookmarks,
  });

  // --- Intervention timer (opt-in only, default off) ---
  const lastNavigationAtRef = nav.lastNavigationAtRef;
  useEffect(() => {
    if (!book) return;
    if (settings.showInterventionModals !== true) return;
    const interval = setInterval(() => {
      if (lastNavigationAtRef.current && performance.now() - lastNavigationAtRef.current > 240000) {
        if (!showIntervention) {
          setShowIntervention(true);
          lastNavigationAtRef.current = performance.now();
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [book, setShowIntervention, showIntervention, lastNavigationAtRef, settings.showInterventionModals]);

  // --- Entry intro ---
  const completeEntryIntro = useCallback(() => {
    try {
      sessionStorage.setItem(ENTRY_INTRO_STORAGE_KEY, "true");
    } catch {
      // The intro remains optional when session storage is unavailable.
    }
    setShowEntryIntro(false);
  }, [setShowEntryIntro]);

  useEffect(() => {
    if (book) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(ENTRY_INTRO_STORAGE_KEY) === "true";
    } catch {
      alreadySeen = false;
    }
    if (reduceMotion || alreadySeen) return undefined;

    setShowEntryIntro(true);
    return undefined;
  }, [book, setShowEntryIntro]);

  useModalFocus({
    open: ocrOpen,
    containerRef: ocrDialogRef,
    onClose: () => setOcrOpen(false),
    initialFocusRef: ocrCloseButtonRef,
  });

  const handleCloseBook = useCallback(() => {
    cancelActiveImport();
    finalizeSession();
    closeBook();
  }, [cancelActiveImport, finalizeSession, closeBook]);

  const {
    noteDraft,
    setNoteDraft,
    toggleBookmark,
    addNote,
    copyFocusedParagraph,
  } = useReaderAnnotations({
    focusId,
    focusedParagraph,
    setBookmarks,
    setNotes,
    setError,
  });

  // --- Landing view ---
  const landingViewProps = {
    showEntryIntro, completeEntryIntro, settings, setSettings, sessionRecap,
    setSessionRecap, awardedBadges, awardBadges, fileInputRef, dragging,
    setDragging, handleFile, openBook, setOcrOpen, error, loading, ocrOpen,
    ocrDialogRef, ocrCloseButtonRef, handleOcrDocumentLoaded,
  };

  if (!book)
    return (
      <>
        <AppLandingView {...landingViewProps} />
        <FocusBarHost />
      </>
    );

  // --- Reader view ---
  const readerViewProps = {
    book, bookId, handleCloseBook, showIntervention, settings, setSettings,
    setShowIntervention, chapters, activeChapter, progress, readerState,
    activeParagraphIsLarge, overStaticRegion, staticRegionLabel, notes, setNotes,
    bookmarks, noteDraft, setNoteDraft, sidebarOpen, setSidebarOpen,
    sidebarCollapsed, setSidebarCollapsed, notesOpen, setNotesOpen,
    settingsOpen, setSettingsOpen, focusId, focusedParagraph, pinnedId,
    isBookmarked, minutes, totalWords, readerRef, jumpToChapter, focusParagraph,
    toggleBookmark, copyFocusedParagraph, moveFocus: nav.moveFocus, addNote,
    resumeFlow, chapterWindow,
  };

  return <AppReaderView {...readerViewProps} />;
}

export default App;
