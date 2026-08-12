import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseDocument } from "./features/document-import/index.js";
import { LandingPage } from "./features/landing/index.js";
import {
  DEFAULT_SETTINGS,
  FOCUS_RAIL_RATIO,
  MAX_SCROLL_INPUT,
  ReaderPage,
  SCROLL_INTENT_THRESHOLD,
  accumulateScrollIntent,
  getIntentDirection,
  isFocusEligibleChapter,
  readingProgress,
  selectClosestParagraph,
  selectNextParagraph,
} from "./features/reader/index.js";
import {
  documentId,
  documentStorageKey,
  safeParse,
  wordCount,
} from "./shared/lib/index.js";

const IMPORT_COMPLETE_DELAY = 480;

function readSettings() {
  const saved = safeParse(localStorage.getItem("bookflow:settings"), {});
  const savedPace = Number(saved.focusPace);

  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    columnWidth:
      saved.columnWidth === 720
        ? DEFAULT_SETTINGS.columnWidth
        : (saved.columnWidth ?? DEFAULT_SETTINGS.columnWidth),
    focusPace:
      savedPace >= 180 && savedPace <= 420
        ? savedPace
        : DEFAULT_SETTINGS.focusPace,
    mode: saved.mode === "normal" ? "normal" : DEFAULT_SETTINGS.mode,
  };
}

function App() {
  const [book, setBook] = useState(null);
  const [bookId, setBookId] = useState("");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeParagraphId, setActiveParagraphId] = useState("");
  const [pinnedId, setPinnedId] = useState("");
  const [activeChapter, setActiveChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [readerState, setReaderState] = useState("focused");
  const fileInputRef = useRef(null);
  const readerRef = useRef(null);
  const paragraphsRef = useRef([]);
  const activeParagraphIdRef = useRef("");
  const pinnedIdRef = useRef("");
  const pendingRestoreParagraphRef = useRef("");
  const frameRef = useRef(null);
  const alignTimerRef = useRef(null);
  const scrollSettleTimerRef = useRef(null);
  const wheelIdleTimerRef = useRef(null);
  const programmaticScrollRef = useRef(false);
  const lastNavigationAtRef = useRef(0);
  const wheelRef = useRef({
    accumulated: 0,
    burstCount: 0,
    lastAt: 0,
    rollCount: 0,
  });
  const touchStartRef = useRef(null);
  const navigationRef = useRef(null);
  const alignParagraphRef = useRef(null);

  const chapters = useMemo(() => {
    if (!book) return [];

    return book.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      focusEligible: isFocusEligibleChapter(
        chapter,
        chapterIndex,
        book.chapters.length,
      ),
      paragraphs: chapter.paragraphs.map((paragraph, paragraphIndex) => ({
        id: `paragraph-${chapterIndex}-${paragraphIndex}`,
        text: paragraph,
        chapterIndex,
        paragraphIndex,
      })),
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
        0,
      ) ?? 0,
    [book],
  );
  const minutes = Math.max(1, Math.ceil(totalWords / 230));
  const focusId = pinnedId || activeParagraphId;
  const focusedParagraph = paragraphMap.get(focusId);
  const isBookmarked = focusId ? bookmarks.includes(focusId) : false;

  const clearTimers = useCallback(() => {
    if (alignTimerRef.current) window.clearTimeout(alignTimerRef.current);
    if (scrollSettleTimerRef.current)
      window.clearTimeout(scrollSettleTimerRef.current);
    if (wheelIdleTimerRef.current)
      window.clearTimeout(wheelIdleTimerRef.current);
    alignTimerRef.current = null;
    scrollSettleTimerRef.current = null;
    wheelIdleTimerRef.current = null;
  }, []);

  const commitFocus = useCallback((paragraph) => {
    if (!paragraph) return;

    activeParagraphIdRef.current = paragraph.id;
    setActiveParagraphId(paragraph.id);
    setActiveChapter(paragraph.chapter);
    setProgress(readingProgress(paragraph.index, paragraphsRef.current.length));
  }, []);

  const finishAlignment = useCallback(() => {
    programmaticScrollRef.current = false;
    setReaderState(pinnedIdRef.current ? "paused" : "focused");
  }, []);

  const alignParagraph = useCallback(
    (paragraph, behavior = "smooth") => {
      const reader = readerRef.current;
      if (!reader || !paragraph) return;

      const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight);
      const anchor = reader.clientHeight * FOCUS_RAIL_RATIO;
      const paragraphCenter = (paragraph.top + paragraph.bottom) / 2;
      const targetScrollTop = Math.min(
        maximum,
        Math.max(0, paragraphCenter - anchor),
      );
      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      )?.matches;
      const shouldAnimate = behavior === "smooth" && !reducedMotion;

      clearTimers();
      programmaticScrollRef.current = true;
      setReaderState(pinnedIdRef.current ? "paused" : "transitioning");
      reader.scrollTo({
        top: targetScrollTop,
        behavior: shouldAnimate ? "smooth" : "auto",
      });

      if (!shouldAnimate) {
        finishAlignment();
        return;
      }

      alignTimerRef.current = window.setTimeout(finishAlignment, 360);
    },
    [clearTimers, finishAlignment],
  );

  const setSelectedParagraph = useCallback(
    (paragraph, behavior = "smooth") => {
      if (!paragraph) return;
      commitFocus(paragraph);

      if (settings.mode === "focus") {
        alignParagraph(paragraph, behavior);
        return;
      }

      const paragraphElement = [
        ...(readerRef.current?.querySelectorAll("[data-paragraph-id]") ?? []),
      ].find((element) => element.dataset.paragraphId === paragraph.id);
      paragraphElement?.scrollIntoView({ behavior, block: "center" });
    },
    [alignParagraph, commitFocus, settings.mode],
  );

  const navigateBy = useCallback(
    (direction, options = {}) => {
      if (pinnedIdRef.current) return;

      const currentIndex = paragraphsRef.current.findIndex(
        (paragraph) => paragraph.id === activeParagraphIdRef.current,
      );
      const currentParagraph =
        currentIndex >= 0
          ? paragraphsRef.current[currentIndex]
          : selectClosestParagraph(
              paragraphsRef.current,
              readerRef.current?.scrollTop +
                readerRef.current?.clientHeight * FOCUS_RAIL_RATIO,
              activeParagraphIdRef.current,
            );
      const currentId = currentParagraph?.id ?? activeParagraphIdRef.current;
      const target = selectNextParagraph(
        paragraphsRef.current,
        currentId,
        direction,
        options.step ?? 1,
      );

      if (!target || target.id === currentParagraph?.id) return;

      lastNavigationAtRef.current = performance.now();
      setReaderState(options.rapid ? "skimming" : "transitioning");
      setSelectedParagraph(target);
    },
    [setSelectedParagraph],
  );

  useEffect(() => {
    navigationRef.current = navigateBy;
    alignParagraphRef.current = (paragraphId, behavior = "smooth") => {
      const paragraph = paragraphsRef.current.find(
        (candidate) => candidate.id === paragraphId,
      );
      if (paragraph) alignParagraph(paragraph, behavior);
    };

    return () => {
      navigationRef.current = null;
      alignParagraphRef.current = null;
    };
  }, [alignParagraph, navigateBy, setSelectedParagraph]);

  useEffect(() => {
    localStorage.setItem("bookflow:settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!bookId) return;

    localStorage.setItem(
      documentStorageKey(bookId),
      JSON.stringify({
        notes,
        bookmarks,
        progress,
        activeParagraphId,
        scrollTop: readerRef.current?.scrollTop ?? 0,
      }),
    );
  }, [activeParagraphId, bookId, bookmarks, notes, progress]);

  useLayoutEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;
    let disposed = false;

    const measureParagraphs = () => {
      if (disposed) return;

      const readerBounds = reader.getBoundingClientRect();
      const nextParagraphs = [
        ...reader.querySelectorAll("[data-paragraph-id]"),
      ].map((element, index) => {
        const bounds = element.getBoundingClientRect();
        return {
          id: element.dataset.paragraphId,
          chapter: Number(element.dataset.chapter),
          index,
          top: bounds.top - readerBounds.top + reader.scrollTop,
          bottom: bounds.bottom - readerBounds.top + reader.scrollTop,
          left: bounds.left,
        };
      });

      paragraphsRef.current = nextParagraphs;

      if (!nextParagraphs.length) return;

      const restored = nextParagraphs.find(
        (paragraph) => paragraph.id === pendingRestoreParagraphRef.current,
      );
      const existing = nextParagraphs.find(
        (paragraph) => paragraph.id === activeParagraphIdRef.current,
      );
      const target = restored ?? existing ?? nextParagraphs[0];

      pendingRestoreParagraphRef.current = "";
      commitFocus(target);
      if (settings.mode === "focus") alignParagraph(target, "auto");
    };

    const scheduleMeasurement = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measureParagraphs();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(reader);
    const readingColumn = reader.querySelector(".reading-column");
    if (readingColumn) resizeObserver.observe(readingColumn);
    scheduleMeasurement();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      paragraphsRef.current = [];
    };
  }, [
    alignParagraph,
    book,
    commitFocus,
    paragraphMap,
    settings.columnWidth,
    settings.fontSize,
    settings.lineHeight,
    settings.mode,
  ]);

  useEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;
    const handleScroll = () => {
      const anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO;

      if (settings.mode === "normal") {
        if (!pinnedIdRef.current) {
          const target = selectClosestParagraph(
            paragraphsRef.current,
            anchorY,
            activeParagraphIdRef.current,
          );
          if (target) commitFocus(target);
        }
        return;
      }

      if (programmaticScrollRef.current || pinnedIdRef.current) return;

      if (scrollSettleTimerRef.current)
        window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = window.setTimeout(() => {
        const target = selectClosestParagraph(
          paragraphsRef.current,
          reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO,
          activeParagraphIdRef.current,
        );
        if (target) {
          setReaderState("snapping");
          setSelectedParagraph(target);
        }
      }, 180);
    };

    const handleWheel = (event) => {
      if (settings.mode !== "focus") return;
      event.preventDefault();
      if (pinnedIdRef.current) return;

      const now = performance.now();
      const elapsed = now - wheelRef.current.lastAt;
      const delta = Math.max(
        -MAX_SCROLL_INPUT,
        Math.min(MAX_SCROLL_INPUT, event.deltaY),
      );
      const direction = Math.sign(delta);
      if (!direction) return;

      const isSameDirection =
        wheelRef.current.accumulated &&
        direction === Math.sign(wheelRef.current.accumulated) &&
        elapsed < 420;
      const rollCount = isSameDirection ? wheelRef.current.rollCount + 1 : 1;
      const burstCount = elapsed < 420 ? wheelRef.current.burstCount + 1 : 1;

      wheelRef.current = {
        accumulated: accumulateScrollIntent(
          wheelRef.current.accumulated,
          delta,
        ),
        burstCount,
        rollCount,
        lastAt: now,
      };

      if (wheelIdleTimerRef.current)
        window.clearTimeout(wheelIdleTimerRef.current);
      wheelIdleTimerRef.current = window.setTimeout(() => {
        wheelRef.current = {
          accumulated: 0,
          burstCount: 0,
          lastAt: 0,
          rollCount: 0,
        };
        if (!pinnedIdRef.current) setReaderState("focused");
      }, 260);

      const intentDirection = getIntentDirection(
        wheelRef.current.accumulated,
        SCROLL_INTENT_THRESHOLD,
      );
      if (
        !intentDirection ||
        now - lastNavigationAtRef.current < settings.focusPace ||
        (rollCount < 2 && Math.abs(delta) < 56)
      )
        return;

      wheelRef.current.accumulated = 0;
      wheelRef.current.rollCount = 0;
      navigationRef.current?.(intentDirection, {
        step: 1,
        rapid: false,
        source: "wheel",
      });
    };

    const handleKeyDown = (event) => {
      if (
        settings.mode !== "focus" ||
        event.target.closest("button, input, textarea, select")
      )
        return;

      const keyActions = {
        ArrowDown: { direction: 1, step: 1 },
        j: { direction: 1, step: 1 },
        J: { direction: 1, step: 1 },
        ArrowUp: { direction: -1, step: 1 },
        k: { direction: -1, step: 1 },
        K: { direction: -1, step: 1 },
        PageDown: { direction: 1, step: 3, rapid: true },
        PageUp: { direction: -1, step: 3, rapid: true },
      };

      if (event.key === "Escape") {
        clearTimers();
        if (activeParagraphIdRef.current) {
          pinnedIdRef.current = activeParagraphIdRef.current;
          setPinnedId(activeParagraphIdRef.current);
        }
        setReaderState("paused");
        return;
      }

      if (event.key === " " || keyActions[event.key]) {
        event.preventDefault();
        if (pinnedIdRef.current) return;
        const action =
          event.key === " "
            ? { direction: event.shiftKey ? -1 : 1, step: 1 }
            : keyActions[event.key];
        navigationRef.current?.(action.direction, action);
      }
    };

    const handleTouchStart = (event) => {
      if (settings.mode !== "focus" || pinnedIdRef.current) return;
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      if (
        settings.mode !== "focus" ||
        pinnedIdRef.current ||
        touchStartRef.current === null
      )
        return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const distance = touchStartRef.current - endY;
      touchStartRef.current = null;
      if (Math.abs(distance) < 36) return;

      const step =
        Math.abs(distance) > 180 ? 3 : Math.abs(distance) > 90 ? 2 : 1;
      navigationRef.current?.(distance > 0 ? 1 : -1, {
        step,
        rapid: step > 1,
        source: "touch",
      });
    };

    reader.addEventListener("scroll", handleScroll, { passive: true });
    reader.addEventListener("wheel", handleWheel, { passive: false });
    reader.addEventListener("keydown", handleKeyDown);
    reader.addEventListener("touchstart", handleTouchStart, { passive: true });
    reader.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      reader.removeEventListener("scroll", handleScroll);
      reader.removeEventListener("wheel", handleWheel);
      reader.removeEventListener("keydown", handleKeyDown);
      reader.removeEventListener("touchstart", handleTouchStart);
      reader.removeEventListener("touchend", handleTouchEnd);
      clearTimers();
    };
  }, [
    book,
    clearTimers,
    commitFocus,
    setSelectedParagraph,
    settings.focusPace,
    settings.mode,
  ]);

  useEffect(() => {
    if (settings.mode !== "focus" || !activeParagraphIdRef.current)
      return undefined;
    const align = window.setTimeout(
      () => alignParagraphRef.current?.(activeParagraphIdRef.current, "auto"),
      0,
    );
    return () => window.clearTimeout(align);
  }, [settings.mode]);

  const openBook = useCallback(
    (nextBook, id) => {
      const saved = safeParse(localStorage.getItem(documentStorageKey(id)), {});
      clearTimers();
      const fallbackParagraph = String(saved.activeId ?? "").match(
        /^(\d+)-(\d+)-\d+$/,
      )
        ? `paragraph-${RegExp.$1}-${RegExp.$2}`
        : "";
      pendingRestoreParagraphRef.current =
        saved.activeParagraphId ?? fallbackParagraph;
      const restoredActive = saved.activeParagraphId ?? fallbackParagraph;
      setBook(nextBook);
      setBookId(id);
      setNotes(saved.notes ?? []);
      setBookmarks(saved.bookmarks ?? []);
      setProgress(saved.progress ?? 0);
      setActiveParagraphId(restoredActive);
      setPinnedId("");
      setReaderState("focused");
      activeParagraphIdRef.current = restoredActive;
      pinnedIdRef.current = "";
      paragraphsRef.current = [];
      setActiveChapter(0);
      setSidebarOpen(false);
      setError("");
      document.title = `${nextBook.title} - Bookflow`;
    },
    [clearTimers],
  );

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;

      setError("");
      setLoading({
        name: file.name,
        percent: 5,
        label: "Checking your document",
        detail: "Confirming the file type and readable book content locally.",
      });

      try {
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
          detail: `${parsed.chapters.length} ${parsed.chapters.length === 1 ? "section" : "sections"} checked and ready to read.`,
        });
        await new Promise((resolve) =>
          window.setTimeout(resolve, IMPORT_COMPLETE_DELAY),
        );
        openBook(parsed, documentId(file));
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Bookflow could not open this document.",
        );
      } finally {
        setLoading(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [openBook],
  );

  const closeBook = () => {
    clearTimers();
    setBook(null);
    setBookId("");
    setNotesOpen(false);
    setSettingsOpen(false);
    setSidebarOpen(false);
    setPinnedId("");
    setActiveParagraphId("");
    activeParagraphIdRef.current = "";
    pinnedIdRef.current = "";
    paragraphsRef.current = [];
    document.title = "Bookflow - Read in your rhythm";
  };

  const jumpToChapter = (index) => {
    const targetParagraph = paragraphsRef.current.find(
      (paragraph) => paragraph.chapter === index,
    );
    if (settings.mode === "focus" && targetParagraph) {
      setSelectedParagraph(targetParagraph, "smooth");
    } else {
      document
        .getElementById(`chapter-${index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveChapter(index);
    }
    setSidebarOpen(false);
  };

  const focusParagraph = (id) => {
    const targetParagraph = paragraphsRef.current.find(
      (paragraph) => paragraph.id === id,
    );
    if (targetParagraph) setSelectedParagraph(targetParagraph, "smooth");

    const nextPinnedId = pinnedIdRef.current === id ? "" : id;
    pinnedIdRef.current = nextPinnedId;
    setPinnedId(nextPinnedId);
    setReaderState(nextPinnedId ? "paused" : "focused");
  };

  const resumeFlow = () => {
    clearTimers();
    pinnedIdRef.current = "";
    setPinnedId("");
    setReaderState("focused");
    alignParagraphRef.current?.(activeParagraphIdRef.current, "smooth");
  };

  const toggleBookmark = () => {
    if (!focusId) return;
    setBookmarks((current) =>
      current.includes(focusId)
        ? current.filter((id) => id !== focusId)
        : [...current, focusId],
    );
  };

  const copyFocusedParagraph = async () => {
    if (!focusedParagraph) return;
    await navigator.clipboard?.writeText(focusedParagraph.text).catch(() => {});
  };

  const addNote = () => {
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
  };

  if (!book) {
    return (
      <LandingPage
        dragging={dragging}
        setDragging={setDragging}
        fileInputRef={fileInputRef}
        handleFile={handleFile}
        openBook={openBook}
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
    );
  }

  return (
    <ReaderPage
      book={book}
      settings={settings}
      setSettings={setSettings}
      chapters={chapters}
      activeChapter={activeChapter}
      progress={progress}
      readerState={readerState}
      notes={notes}
      setNotes={setNotes}
      bookmarks={bookmarks}
      bookmarkCount={bookmarks.length}
      noteDraft={noteDraft}
      setNoteDraft={setNoteDraft}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
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
      closeBook={closeBook}
      jumpToChapter={jumpToChapter}
      focusParagraph={focusParagraph}
      toggleBookmark={toggleBookmark}
      copyFocusedParagraph={copyFocusedParagraph}
      addNote={addNote}
      resumeFlow={resumeFlow}
    />
  );
}

export default App;
