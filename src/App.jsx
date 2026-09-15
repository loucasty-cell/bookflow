import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { parseDocument, progressivePdfImport, scanPdfViaBackend, isBackendFallbackError } from "./features/document-import/index.js";
import { BookOpeningIntro, LandingPage } from "./features/landing/index.js";
import { ErrorBoundary } from "./shared/components/index.js";
import { useReaderStore } from "./store/readerStore.js";
import { useUIStore } from "./store/uiStore.js";
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FOCUS_RAIL_RATIO,
  ReaderPage,
  isFocusEligibleChapter,
  readingProgress,
} from "./features/reader/index.js";
import { useReaderSession } from "./features/reader/hooks/useReaderSession.js";
import { useReaderNavigation } from "./features/reader/hooks/useReaderNavigation.js";
import { useReaderPersistence } from "./features/reader/hooks/useReaderPersistence.js";
import { ReaderShell } from "./features/reader/components/ReaderShell.jsx";
import {
  documentId,
  wordCount,
} from "./shared/lib/index.js";
import { mark } from "./shared/lib/perfMarks.js";

const OcrUploader = lazy(() =>
  import("./components/OcrUploader.jsx").then((module) => ({
    default: module.OcrUploader,
  }))
);

const IMPORT_COMPLETE_DELAY = 480;
const ENTRY_INTRO_STORAGE_KEY = "bookflow:entry-intro-seen";

function sectionAtFocusRail(reader) {
  if (!reader) return null;

  const bounds = reader.getBoundingClientRect();
  const anchorY = bounds.top + reader.clientHeight * FOCUS_RAIL_RATIO;
  const anchorX = bounds.left + bounds.width / 2;
  const element = document.elementFromPoint(anchorX, anchorY);
  const directSection = element?.closest?.(".reading-section");
  if (directSection && reader.contains(directSection)) return directSection;

  const sections = [...reader.querySelectorAll(".reading-section")];
  const containingSection = sections.find((section) => {
    const sectionBounds = section.getBoundingClientRect();
    return anchorY >= sectionBounds.top && anchorY <= sectionBounds.bottom;
  });
  if (containingSection) return containingSection;

  const firstSection = sections[0];
  if (
    firstSection &&
    anchorY < firstSection.getBoundingClientRect().top &&
    firstSection.dataset.focusEligible === "false"
  )
    return firstSection;

  return null;
}

function staticRegionName(section) {
  const title = section?.querySelector("h2")?.textContent ?? "";
  return /appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author/i.test(
    title
  )
    ? "Reading the end matter"
    : "Reading the intro";
}

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

  const fileInputRef = useRef(null);
  const readerRef = useRef(null);
  const navigationRef = useRef(null);
  const alignParagraphRef = useRef(null);
  const navigationHookRef = useRef(null);
  const importHandleRef = useRef(null);
  const backendCancelRef = useRef(null);

  const cancelActiveImport = useCallback(() => {
    try {
      importHandleRef.current?.cancel();
    } catch {
      // Import already settled — safe to ignore.
    }
    importHandleRef.current = null;
    try {
      backendCancelRef.current?.();
    } catch {
      // Backend scan already settled — safe to ignore.
    }
    backendCancelRef.current = null;
  }, []);

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

  // --- Static region helpers ---
  const updateStaticRegion = useCallback(() => {
    const reader = readerRef.current;
    const section = sectionAtFocusRail(reader);
    const isStatic = section?.dataset.focusEligible === "false";
    if (overStaticRegionRef.current !== isStatic) {
      overStaticRegionRef.current = isStatic;
      setSessionOverStaticRegion(isStatic);
    }
    if (isStatic) setSessionStaticRegionLabel(staticRegionName(section));
    return { isStatic, section };
  }, [setSessionOverStaticRegion, setSessionStaticRegionLabel, overStaticRegionRef]);

  const updateStaticScrollState = useCallback(
    (reader, section) => {
      if (section?.dataset.chapterIndex) setSessionActiveChapter(Number(section.dataset.chapterIndex));
      const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight);
      setProgress(maximum ? Math.round((reader.scrollTop / maximum) * 100) : 0);
    },
    [setProgress, setSessionActiveChapter]
  );

  // --- Navigation ---

  const commitFocus = useCallback(
    (paragraph) => {
      if (!paragraph) return;

      const measuredParagraph = paragraphsRef.current.find(
        (candidate) => candidate.id === paragraph.id
      );
      const chapterIndex = paragraph.chapter ?? paragraph.chapterIndex;
      const paragraphIndex = paragraph.index ?? measuredParagraph?.index;
      activeParagraphIdRef.current = paragraph.id;
      setSessionActiveParagraphId(paragraph.id);
      if (Number.isFinite(chapterIndex)) setSessionActiveChapter(chapterIndex);
      if (Number.isFinite(paragraphIndex)) {
        setProgress(readingProgress(paragraphIndex, paragraphsRef.current.length));
      }
    },
    [setProgress, setSessionActiveParagraphId, setSessionActiveChapter, paragraphsRef, activeParagraphIdRef]
  );

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
  });

  useEffect(() => {
    navigationHookRef.current = nav;
  }, [nav]);

  const jumpToChapter = useCallback(
    (index) => {
      try {
        importHandleRef.current?.jumpToUnit(index);
      } catch {
        // Background import already settled — chapter jump still works via paragraphs.
      }
      rawJumpToChapter(index, nav.setSelectedParagraph);
    },
    [rawJumpToChapter, nav.setSelectedParagraph]
  );

  const focusParagraph = useCallback(
    (id) => rawFocusParagraph(id, nav.setSelectedParagraph),
    [rawFocusParagraph, nav.setSelectedParagraph]
  );

  const resumeFlow = useCallback(
    () => rawResumeFlow(alignParagraphRef),
    [rawResumeFlow, alignParagraphRef]
  );

  // --- Derived state ---
  const chapters = useMemo(() => {
    if (!book) return [];

    return book.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      focusEligible: isFocusEligibleChapter(chapter, chapterIndex, book.chapters.length),
      paragraphs: chapter.paragraphs.map((paragraph, paragraphIndex) => ({
        id: `paragraph-${chapterIndex}-${paragraphIndex}`,
        text: paragraph,
        chapterIndex,
        paragraphIndex,
      })),
      sections: (() => {
        const flatParagraphs = chapter.paragraphs.map((paragraph, paragraphIndex) => ({
          id: `paragraph-${chapterIndex}-${paragraphIndex}`,
          text: paragraph,
          chapterIndex,
          paragraphIndex,
        }));
        const rawSections = chapter.subheadings?.length
          ? chapter.subheadings
          : [{ title: null, paragraphs: chapter.paragraphs }];
        let paragraphOffset = 0;
        return rawSections.map((section) => {
          const enrichedParagraphs = section.paragraphs.map(() => {
            const paragraph = flatParagraphs[paragraphOffset];
            paragraphOffset += 1;
            return paragraph;
          });
          return { ...section, paragraphs: enrichedParagraphs };
        });
      })(),
    }));
  }, [book]);

  const paragraphMap = useMemo(() => {
    const entries = chapters.flatMap((chapter) => chapter.paragraphs);
    return new Map(entries.map((paragraph) => [paragraph.id, paragraph]));
  }, [chapters]);

  const totalWords = useMemo(
    () =>
      book?.chapters.reduce(
        (total, chapter) => total + wordCount(chapter.paragraphs.join(" ")),
        0
      ) ?? 0,
    [book]
  );
  const minutes = Math.max(1, Math.ceil(totalWords / 230));
  const focusId = pinnedId || activeParagraphId;
  const focusedParagraph = paragraphMap.get(focusId);
  const isBookmarked = focusId ? bookmarks.includes(focusId) : false;

  // --- Persistence ---
  useReaderPersistence({
    bookId,
    activeParagraphId,
    bookmarks,
    notes,
    progress,
    readerRef,
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

  // --- OCR escape ---
  useEffect(() => {
    if (!ocrOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOcrOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ocrOpen, setOcrOpen]);

  // --- File import (progressive PDF default-on, blocking fallback) ---
  const manifestToBook = useCallback((manifest) => {
    const readyUnits = [...(manifest?.units ?? [])]
      .filter((u) => u.status === "READY" && u.paragraphs?.length)
      .sort((a, b) => (a.sourcePage ?? 0) - (b.sourcePage ?? 0));
    return {
      title: manifest.title,
      author: manifest.author ?? "",
      kind: manifest.kind,
      chapters: readyUnits.map((u) => ({
        title: u.label,
        paragraphs: u.paragraphs,
      })),
      ocrPageCount: readyUnits.filter((u) => u.ocrStatus === "ocr-ready").length,
    };
  }, []);

  const openProgressivePdf = useCallback(
    async (file) => {
      const handle = await progressivePdfImport(file, ({ manifest, phase, unit, progress }) => {
        if (phase === "manifest-ready") {
          setLoading({
            name: file.name,
            percent: 8,
            label: `Found ${manifest.totalUnits} ${manifest.totalUnits === 1 ? "page" : "pages"}`,
            detail: "Opening the first page now; the rest prepares in the background.",
          });
          return;
        }
        if (phase === "unit-ready" && unit) {
          const readyCount = manifest.units.filter((u) => u.status === "READY").length;
          setLoading({
            name: file.name,
            percent: Math.min(96, Math.max(10, Math.round(progress ?? 0))),
            label: `Reading page ${unit.sourcePage} now`,
            detail: `${readyCount} of ${manifest.totalUnits} pages ready. Your book stays on this device.`,
          });
          if (readyCount > 1) {
            setSessionBook(manifestToBook(manifest));
          }
          return;
        }
        if (phase === "unit-failed" && unit) {
          setLoading({
            name: file.name,
            percent: Math.min(96, Math.max(10, Math.round(progress ?? 0))),
            label: `OCR failed on page ${unit.sourcePage}`,
            detail: "Already-ready pages stay readable; retry or use the original layout.",
          });
        }
      });
      importHandleRef.current = handle;

      const book = manifestToBook(handle.manifest);
      if (!book.chapters.length) {
        throw new Error(
          "Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy.",
        );
      }
      setLoading({
        name: file.name,
        percent: 100,
        label: "First page ready",
        detail:
          handle.getProgress() >= 100
            ? "All pages ready."
            : "First page ready — remaining pages keep preparing in the background.",
      });
      await new Promise((resolve) => window.setTimeout(resolve, IMPORT_COMPLETE_DELAY));
      mark("reader-mounted");
      openBook(book, documentId(file));
      if (handle.getProgress() >= 100) {
        handle.dispose();
        if (importHandleRef.current === handle) importHandleRef.current = null;
      }
    },
    [manifestToBook, openBook, setLoading, setSessionBook]
  );

  const openBlockingDocument = useCallback(
    async (file) => {
      const parsed = await parseDocument(file, (percent, label) => {
        setLoading({
          name: file.name,
          percent: Math.min(96, Math.max(10, Math.round(percent))),
          label,
          detail: "Your book stays on this device while Bookflow prepares it.",
        });
      });
      setLoading({
        name: file.name,
        percent: 100,
        label: "Book ready",
        detail: parsed.ocrPageCount
          ? `${parsed.ocrPageCount} ${parsed.ocrPageCount === 1 ? "scanned page" : "scanned pages"} recovered privately and kept in the original page order.`
          : `${parsed.chapters.length} ${parsed.chapters.length === 1 ? "section" : "sections"} checked and ready to read.`,
      });
      await new Promise((resolve) => window.setTimeout(resolve, IMPORT_COMPLETE_DELAY));
      mark("reader-mounted");
      openBook(parsed, documentId(file));
    },
    [openBook, setLoading]
  );

  const openBackendFallback = useCallback(
    async (file) => {
      const controller = new AbortController();
      const scan = scanPdfViaBackend(
        file,
        (percent, label, detail) => {
          setLoading({
            name: file.name,
            percent: Math.min(99, Math.max(3, Math.round(percent))),
            label,
            detail,
          });
        },
        { signal: controller.signal },
      );
      backendCancelRef.current = () => {
        try {
          scan.cancel();
        } catch {
          // Scan already settled — safe to ignore.
        }
        try {
          controller.abort();
        } catch {
          // Controller already settled — safe to ignore.
        }
      };
      try {
        const parsed = await scan;
        const skipped = parsed.skippedPages?.length
          ? ` Skipped unreadable page(s): ${parsed.skippedPages.join(", ")}.`
          : "";
        setLoading({
          name: file.name,
          percent: 100,
          label: "Backend scan ready",
          detail: `${parsed.chapters.length} ${parsed.chapters.length === 1 ? "section" : "sections"} recovered by the repair-tolerant backend scan.${skipped}`,
        });
        await new Promise((resolve) => window.setTimeout(resolve, IMPORT_COMPLETE_DELAY));
        mark("reader-mounted");
        openBook(parsed, documentId(file));
      } finally {
        backendCancelRef.current = null;
      }
    },
    [openBook, setLoading]
  );

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;

      cancelActiveImport();
      setError("");
      setLoading({
        name: file.name,
        percent: 5,
        label: "Checking your document",
        detail: "Confirming the file type and readable book content locally.",
      });

      const isPdf = /\.pdf$/i.test(file.name || "");
      const progressiveEnabled = settings.useProgressiveImport !== false;

      const shouldTryBackend = (firstError, secondError) =>
        isPdf &&
        (isBackendFallbackError(firstError) ||
          isBackendFallbackError(secondError));

      try {
        if (isPdf && progressiveEnabled) {
          try {
            await openProgressivePdf(file);
          } catch (progressiveError) {
            cancelActiveImport();
            try {
              await openBlockingDocument(file);
            } catch (blockingError) {
              if (shouldTryBackend(progressiveError, blockingError)) {
                await openBackendFallback(file);
              } else {
                throw blockingError;
              }
            }
          }
        } else {
          try {
            await openBlockingDocument(file);
          } catch (blockingError) {
            if (isPdf && isBackendFallbackError(blockingError)) {
              await openBackendFallback(file);
            } else {
              throw blockingError;
            }
          }
        }
      } catch (caught) {
        cancelActiveImport();
        setError(
          caught instanceof Error ? caught.message : "Bookflow could not open this document."
        );
      } finally {
        setLoading(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [cancelActiveImport, openBackendFallback, openBlockingDocument, openProgressivePdf, setError, setLoading, settings.useProgressiveImport]
  );

  const handleCloseBook = useCallback(() => {
    cancelActiveImport();
    closeBook();
  }, [cancelActiveImport, closeBook]);

  // --- Annotations ---
  const toggleBookmark = useCallback(() => {
    if (!focusId) return;
    setBookmarks((current) =>
      current.includes(focusId) ? current.filter((id) => id !== focusId) : [...current, focusId]
    );
  }, [focusId, setBookmarks]);

  const [noteDraft, setNoteDraft] = useState("");

  const addNote = useCallback(() => {
    const text = noteDraft.trim();
    if (!text || !focusId) return;

    setNotes((current) => [
      {
        id: crypto.randomUUID(),
        paragraphId: focusId,
        quote: focusedParagraph?.text ?? "",
        text,
      },
      ...current,
    ]);
    setNoteDraft("");
  }, [noteDraft, focusId, focusedParagraph, setNotes]);

  const copyFocusedParagraph = useCallback(async () => {
    if (!focusedParagraph) return;
    await navigator.clipboard?.writeText(focusedParagraph.text).catch(() => {});
  }, [focusedParagraph]);

  // --- OCR document loaded ---
  const handleOcrDocumentLoaded = useCallback(
    (ocrResult) => {
      if (!ocrResult || !ocrResult.pages || ocrResult.pages.length === 0) return;
      const docChapters = ocrResult.pages.map((p) => {
        const rawText = p.text || "";
        const lines = rawText
          .split("\n\n")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        let title = `Page ${p.page_number}`;
        if (lines.length > 0 && lines[0].startsWith("# ")) {
          title = lines[0].replace(/^#+\s*/, "");
        }
        return {
          title,
          paragraphs: lines.length > 0 ? lines : [rawText || `Page ${p.page_number}`],
        };
      });
      const bookDoc = {
        title: ocrResult.title || "OCR Document",
        author: "Hugging Face OCR",
        kind: "PDF",
        chapters: docChapters,
      };
      setOcrOpen(false);
      openBook(bookDoc, `ocr-${Date.now()}`);
    },
    [openBook, setOcrOpen]
  );

  // --- Landing view ---
  if (!book) {
    return (
      <>
        {showEntryIntro && <BookOpeningIntro onComplete={completeEntryIntro} />}
        <LandingPage
          dragging={dragging}
          setDragging={setDragging}
          fileInputRef={fileInputRef}
          handleFile={handleFile}
          openBook={openBook}
          onOpenOcr={() => setOcrOpen(true)}
          error={error}
          loading={loading}
          theme={settings.theme}
          toggleTheme={() =>
            setSettings((current) => ({
              ...current,
              theme: current.theme === "dusk" ? "paper" : "dusk",
            }))
          }
        />
        {ocrOpen && (
          <div
            className="ocr-modal-overlay"
            onClick={() => setOcrOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="ocr-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="ocr-modal-header">
                <button
                  className="ocr-modal-close"
                  type="button"
                  onClick={() => setOcrOpen(false)}
                  aria-label="Close OCR scanner"
                >
                  <X size={20} />
                </button>
              </div>
              <Suspense fallback={null}>
                <OcrUploader
                  onDocumentLoaded={handleOcrDocumentLoaded}
                  onUseLocalOcr={(file) => {
                    setOcrOpen(false);
                    handleFile(file);
                  }}
                />
              </Suspense>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- Reader view ---
  const rewardChapterTitle = chapters[activeChapter]?.title ?? book?.title;
  return (
    <ReaderShell
      book={book}
      closeBook={handleCloseBook}
      showIntervention={showIntervention && settings.showInterventionModals === true}
      setShowIntervention={setShowIntervention}
      showRewardCapsules={settings.showRewardCapsules === true}
      rewardChapterTitle={rewardChapterTitle}
    >
      <ReaderPage
        book={book}
        settings={settings}
        setSettings={setSettings}
        chapters={chapters}
        activeChapter={activeChapter}
        progress={progress}
        readerState={readerState}
        activeParagraphIsLarge={activeParagraphIsLarge}
        overStaticRegion={overStaticRegion}
        staticRegionLabel={staticRegionLabel}
        notes={notes}
        setNotes={setNotes}
        bookmarks={bookmarks}
        bookmarkCount={bookmarks.length}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        notesOpen={notesOpen}
        setNotesOpen={setNotesOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        focusId={focusId}
        focusedParagraph={focusedParagraph}
        pinnedId={pinnedId}
        isBookmarked={isBookmarked}
        minutes={minutes}
        totalWords={totalWords}
        readerRef={readerRef}
        closeBook={handleCloseBook}
        jumpToChapter={jumpToChapter}
        focusParagraph={focusParagraph}
        toggleBookmark={toggleBookmark}
        copyFocusedParagraph={copyFocusedParagraph}
        moveFocus={nav.moveFocus}
        addNote={addNote}
        resumeFlow={resumeFlow}
      />
    </ReaderShell>
  );
}

export default App;
