import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { parseDocument } from "./features/document-import/index.js";
import {
  BookOpeningIntro,
  LandingPage,
} from "./features/landing/index.js";
import { InterventionModal } from "./components/InterventionModal.jsx";
import { AnimatePresence } from 'framer-motion';
import { useReaderStore } from "./store/readerStore.js";
import { useUIStore } from "./store/uiStore.js";
import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FOCUS_RAIL_RATIO,
  MAX_SCROLL_INPUT,
  ReaderPage,
  SCROLL_INTENT_THRESHOLD,
  accumulateScrollIntent,
  ensureSelectedSegmentVisible,
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

const OcrUploader = lazy(() =>
  import("./components/OcrUploader.jsx").then((module) => ({
    default: module.OcrUploader,
  })),
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
    title,
  )
    ? "Reading the end matter"
    : "Reading the intro";
}

function startsWithStaticRegion(reader) {
  return (
    reader?.querySelector(".reading-section")?.dataset.focusEligible ===
    "false"
  );
}

function App() {
  const [book, setBook] = useState(null);
  const [bookId, setBookId] = useState("");
  const [activeParagraphId, setActiveParagraphId] = useState("");
  const [pinnedId, setPinnedId] = useState("");
  const [activeChapter, setActiveChapter] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [readerState, setReaderState] = useState("focused");
  const [activeParagraphIsLarge, setActiveParagraphIsLarge] = useState(false);
  const [overStaticRegion, setOverStaticRegion] = useState(false);
  const [staticRegionLabel, setStaticRegionLabel] = useState("Reading the intro");

  const {
    settingsOpen, setSettingsOpen,
    sidebarOpen, setSidebarOpen,
    sidebarCollapsed, setSidebarCollapsed,
    notesOpen, setNotesOpen,
    ocrOpen, setOcrOpen,
    showIntervention, setShowIntervention,
    showEntryIntro, setShowEntryIntro,
    dragging, setDragging,
    loading, setLoading,
    error, setError
  } = useUIStore();

  const {
    settings, setSettings,
    progress, setProgress,
    bookmarks, setBookmarks,
    notes, setNotes
  } = useReaderStore();
  const fileInputRef = useRef(null);
  const readerRef = useRef(null);
  const readerSizeRef = useRef({ width: 0, height: 0 });
  const paragraphsRef = useRef([]);
  const activeParagraphIdRef = useRef("");
  const pinnedIdRef = useRef("");
  const pendingRestoreParagraphRef = useRef("");
  const hasRestorePositionRef = useRef(false);
  const overStaticRegionRef = useRef(false);
  const frameRef = useRef(null);
  const alignTimerRef = useRef(null);
  const scrollSettleTimerRef = useRef(null);
  const wheelIdleTimerRef = useRef(null);
  const alignmentDelayRef = useRef(null);
  const programmaticScrollRef = useRef(false);
  const userScrollingRef = useRef(false);
  const activeParagraphIsLargeRef = useRef(false);
  const lastProgrammaticScrollTimeRef = useRef(0);
  const lastNavigationAtRef = useRef(0);
  const wheelRef = useRef({
    accumulated: 0,
    burstCount: 0,
    lastAt: 0,
    rollCount: 0,
  });
  const hasMeasuredBookRef = useRef(false);
  const touchStartRef = useRef(null);
  const navigationRef = useRef(null);
  const alignParagraphRef = useRef(null);

  const completeEntryIntro = useCallback(() => {
    try {
      sessionStorage.setItem(ENTRY_INTRO_STORAGE_KEY, "true");
    } catch {
      // The intro remains optional when session storage is unavailable.
    }
    setShowEntryIntro(false);
  }, []);

  useEffect(() => {
    if (book) return undefined;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(ENTRY_INTRO_STORAGE_KEY) === "true";
    } catch {
      alreadySeen = false;
    }
    if (reduceMotion || alreadySeen) return undefined;

    setShowEntryIntro(true);
    return undefined;
  }, [book]);

  const updateStaticRegion = useCallback(() => {
    const reader = readerRef.current;
    const section = sectionAtFocusRail(reader);
    const isStatic = section?.dataset.focusEligible === "false";
    if (overStaticRegionRef.current !== isStatic) {
      overStaticRegionRef.current = isStatic;
      setOverStaticRegion(isStatic);
    }
    if (isStatic) setStaticRegionLabel(staticRegionName(section));
    return { isStatic, section };
  }, []);

  const updateStaticScrollState = useCallback((reader, section) => {
    if (section?.dataset.chapterIndex)
      setActiveChapter(Number(section.dataset.chapterIndex));
    const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight);
    setProgress(maximum ? Math.round((reader.scrollTop / maximum) * 100) : 0);
  }, []);

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
      sections: (() => {
        const flatParagraphs = chapter.paragraphs.map(
          (paragraph, paragraphIndex) => ({
            id: `paragraph-${chapterIndex}-${paragraphIndex}`,
            text: paragraph,
            chapterIndex,
            paragraphIndex,
          }),
        );
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
    if (alignmentDelayRef.current)
      window.clearTimeout(alignmentDelayRef.current);
    alignTimerRef.current = null;
    scrollSettleTimerRef.current = null;
    wheelIdleTimerRef.current = null;
    alignmentDelayRef.current = null;
  }, []);

  const commitFocus = useCallback((paragraph) => {
    if (!paragraph) return;

    const measuredParagraph = paragraphsRef.current.find(
      (candidate) => candidate.id === paragraph.id,
    );
    const chapterIndex = paragraph.chapter ?? paragraph.chapterIndex;
    const paragraphIndex = paragraph.index ?? measuredParagraph?.index;
    activeParagraphIdRef.current = paragraph.id;
    setActiveParagraphId(paragraph.id);
    if (Number.isFinite(chapterIndex)) setActiveChapter(chapterIndex);
    if (Number.isFinite(paragraphIndex)) {
      setProgress(
        readingProgress(paragraphIndex, paragraphsRef.current.length),
      );
    }
  }, []);

  const finishAlignment = useCallback(() => {
    programmaticScrollRef.current = false;
    lastProgrammaticScrollTimeRef.current = performance.now();
    setReaderState(pinnedIdRef.current ? "paused" : "focused");
  }, []);

  const alignParagraph = useCallback(
    (
      paragraph,
      behavior = "smooth",
      preserveLargePosition = false,
      forceAlignment = false,
    ) => {
      const reader = readerRef.current;
      if (!reader || !paragraph) return;

      const paragraphElement = reader.querySelector(
        `[data-paragraph-id="${paragraph.id}"]`,
      );
      if (!paragraphElement) return;

      const bottomOverlay = reader.parentElement?.querySelector(
        "[data-reader-bottom-overlay]",
      );
      const alignment = ensureSelectedSegmentVisible(
        paragraphElement,
        reader,
        bottomOverlay,
      );
      activeParagraphIsLargeRef.current = alignment.isLarge;
      setActiveParagraphIsLarge(alignment.isLarge);
      reader.style.setProperty(
        "--reader-safe-top",
        `${alignment.safeTop}px`,
      );
      reader.style.setProperty(
        "--reader-safe-bottom",
        `${alignment.safeBottom}px`,
      );

      if (userScrollingRef.current && !forceAlignment) {
        finishAlignment();
        return;
      }

      if (preserveLargePosition && alignment.isLarge) {
        finishAlignment();
        return;
      }

      if (!alignment.shouldScroll) {
        finishAlignment();
        return;
      }

      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      )?.matches;
      const shouldAnimate = behavior === "smooth" && !reducedMotion;

      clearTimers();
      programmaticScrollRef.current = true;
      setReaderState(pinnedIdRef.current ? "paused" : "transitioning");
      reader.scrollTo({
        top: alignment.targetScrollTop,
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

  const queueParagraphAlignment = useCallback(
    (
      paragraph,
      behavior = "smooth",
      preserveLargePosition = false,
      forceAlignment = false,
    ) => {
      if (!paragraph) return;
      if (alignmentDelayRef.current)
        window.clearTimeout(alignmentDelayRef.current);
      alignmentDelayRef.current = window.setTimeout(() => {
        alignmentDelayRef.current = null;
        alignParagraph(
          paragraph,
          behavior,
          preserveLargePosition,
          forceAlignment,
        );
      }, 190);
    },
    [alignParagraph],
  );

  const setSelectedParagraph = useCallback(
    (paragraph, behavior = "smooth") => {
      if (!paragraph) return;
      commitFocus(paragraph);
      queueParagraphAlignment(paragraph, behavior, false, true);
    },
    [commitFocus, queueParagraphAlignment],
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

  const moveFocus = useCallback(
    (direction) => {
      if (!direction) return;
      pinnedIdRef.current = "";
      setPinnedId("");
      navigateBy(direction, { step: 1, rapid: true, source: "focus-card" });
    },
    [navigateBy],
  );

  useEffect(() => {
    navigationRef.current = navigateBy;
    alignParagraphRef.current = (paragraphId, behavior = "smooth") => {
      const paragraph = paragraphsRef.current.find(
        (candidate) => candidate.id === paragraphId,
      );
      if (paragraph) queueParagraphAlignment(paragraph, behavior);
    };

    return () => {
      navigationRef.current = null;
      alignParagraphRef.current = null;
    };
  }, [navigateBy, queueParagraphAlignment, setSelectedParagraph]);


  useEffect(() => {
    if (!book) return;
    const interval = setInterval(() => {
      if (lastNavigationAtRef.current && performance.now() - lastNavigationAtRef.current > 240000) {
        if (!showIntervention) {
           setShowIntervention(true);
           lastNavigationAtRef.current = performance.now();
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [book, showIntervention]);

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

      const isInitialMeasurement = !hasMeasuredBookRef.current;
      const shouldStartAtDocumentTop =
        isInitialMeasurement &&
        settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        startsWithStaticRegion(reader);
      if (shouldStartAtDocumentTop) reader.scrollTo({ top: 0, behavior: "auto" });

      const readerBounds = reader.getBoundingClientRect();
      const previousReaderSize = readerSizeRef.current;
      const readerSizeChanged =
        previousReaderSize.width > 0 &&
        (previousReaderSize.width !== reader.clientWidth ||
          previousReaderSize.height !== reader.clientHeight);
      readerSizeRef.current = {
        width: reader.clientWidth,
        height: reader.clientHeight,
      };
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
      hasMeasuredBookRef.current = true;

      const staticRegion = updateStaticRegion();
      if (!nextParagraphs.length) {
        if (staticRegion.isStatic) {
          reader.scrollTo({ top: 0, behavior: "auto" });
          updateStaticScrollState(reader, staticRegion.section);
          setReaderState("reading");
        }
        return;
      }

      const restored = nextParagraphs.find(
        (paragraph) => paragraph.id === pendingRestoreParagraphRef.current,
      );
      const existing = nextParagraphs.find(
        (paragraph) => paragraph.id === activeParagraphIdRef.current,
      );
      const target = restored ?? existing ?? nextParagraphs[0];
      const targetElement = reader.querySelector(
        `[data-paragraph-id="${target.id}"]`,
      );

      if (targetElement) {
        const bottomOverlay = reader.parentElement?.querySelector(
          "[data-reader-bottom-overlay]",
        );
        const alignment = ensureSelectedSegmentVisible(
          targetElement,
          reader,
          bottomOverlay,
        );
        activeParagraphIsLargeRef.current = alignment.isLarge;
        setActiveParagraphIsLarge(alignment.isLarge);
        reader.style.setProperty(
          "--reader-safe-top",
          `${alignment.safeTop}px`,
        );
        reader.style.setProperty(
          "--reader-safe-bottom",
          `${alignment.safeBottom}px`,
        );
      }

      pendingRestoreParagraphRef.current = "";
      commitFocus(target);
      if (
        isInitialMeasurement &&
        settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        (staticRegion.isStatic || shouldStartAtDocumentTop)
      ) {
        if (staticRegion.isStatic) {
          updateStaticScrollState(reader, staticRegion.section);
          setReaderState("reading");
        }
      } else if (isInitialMeasurement && settings.mode === "focus")
        queueParagraphAlignment(target, "auto", false, true);
      else if (readerSizeChanged && settings.mode === "focus")
        queueParagraphAlignment(target, "auto");
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
      readerSizeRef.current = { width: 0, height: 0 };
    };
  }, [
    book,
    commitFocus,
    paragraphMap,
    queueParagraphAlignment,
    settings.columnWidth,
    settings.fontSize,
    settings.lineHeight,
    settings.mode,
    updateStaticRegion,
    updateStaticScrollState,
  ]);

  useEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;
    const handleScroll = () => {
      const anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO;
      const wasStatic = overStaticRegionRef.current;
      const staticRegion = updateStaticRegion();

      if (staticRegion.isStatic) {
        updateStaticScrollState(reader, staticRegion.section);
        userScrollingRef.current = true;
        if (settings.mode === "focus") setReaderState("reading");
        return;
      }

      if (wasStatic) {
        userScrollingRef.current = true;
        const target = selectClosestParagraph(
          paragraphsRef.current,
          anchorY,
          activeParagraphIdRef.current,
        );
        if (target) {
          const targetElement = reader.querySelector(
            `[data-paragraph-id="${target.id}"]`,
          );
          if (targetElement) {
            const bottomOverlay = reader.parentElement?.querySelector(
              "[data-reader-bottom-overlay]",
            );
            const alignment = ensureSelectedSegmentVisible(
              targetElement,
              reader,
              bottomOverlay,
            );
            activeParagraphIsLargeRef.current = alignment.isLarge;
            setActiveParagraphIsLarge(alignment.isLarge);
          }
          commitFocus(target);
        }
      }

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

      if (
        programmaticScrollRef.current ||
        performance.now() - lastProgrammaticScrollTimeRef.current < 80
      )
        return;

      if (pinnedIdRef.current) {
        if (scrollSettleTimerRef.current)
          window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = window.setTimeout(() => {
          userScrollingRef.current = false;
        }, 180);
        return;
      }

      if (scrollSettleTimerRef.current)
        window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = window.setTimeout(() => {
        userScrollingRef.current = false;
        const target = selectClosestParagraph(
          paragraphsRef.current,
          reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO,
          activeParagraphIdRef.current,
        );
        if (target && target.id !== activeParagraphIdRef.current) {
          setReaderState("snapping");
          setSelectedParagraph(target);
        } else if (!pinnedIdRef.current) {
          setReaderState("focused");
        }
      }, 180);
    };

    const handleWheel = (event) => {
      if (settings.mode !== "focus") return;
      const staticRegion = updateStaticRegion();
      if (staticRegion.isStatic) {
        userScrollingRef.current = true;
        setReaderState("reading");
        return;
      }
      if (activeParagraphIsLargeRef.current) {
        userScrollingRef.current = true;
        setReaderState(pinnedIdRef.current ? "paused" : "reading");
        return;
      }
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

      if (updateStaticRegion().isStatic) {
        userScrollingRef.current = true;
        setReaderState("reading");
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
      if (settings.mode !== "focus") return;
      if (updateStaticRegion().isStatic) {
        userScrollingRef.current = true;
        touchStartRef.current = null;
        setReaderState("reading");
        return;
      }
      if (activeParagraphIsLargeRef.current) {
        userScrollingRef.current = true;
        touchStartRef.current = null;
        return;
      }
      if (pinnedIdRef.current) return;
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const handlePointerDown = () => {
      if (settings.mode === "focus" && updateStaticRegion().isStatic) {
        userScrollingRef.current = true;
        setReaderState("reading");
        return;
      }
      if (
        settings.mode === "focus" &&
        activeParagraphIsLargeRef.current
      )
        userScrollingRef.current = true;
    };

    const handleTouchEnd = (event) => {
      if (
        settings.mode !== "focus" ||
        pinnedIdRef.current ||
        activeParagraphIsLargeRef.current ||
        touchStartRef.current === null
      )
        return;
      if (updateStaticRegion().isStatic) {
        touchStartRef.current = null;
        return;
      }
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
    reader.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    reader.addEventListener("touchstart", handleTouchStart, { passive: true });
    reader.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      reader.removeEventListener("scroll", handleScroll);
      reader.removeEventListener("wheel", handleWheel);
      reader.removeEventListener("keydown", handleKeyDown);
      reader.removeEventListener("pointerdown", handlePointerDown);
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
    updateStaticRegion,
    updateStaticScrollState,
  ]);

  useEffect(() => {
    if (settings.mode !== "focus" || !activeParagraphIdRef.current)
      return undefined;
    const align = window.setTimeout(
      () => {
        if (updateStaticRegion().isStatic) {
          userScrollingRef.current = true;
          setReaderState("reading");
          return;
        }
        alignParagraphRef.current?.(activeParagraphIdRef.current, "auto");
      },
      0,
    );
    return () => window.clearTimeout(align);
  }, [settings.mode, updateStaticRegion]);

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
      hasRestorePositionRef.current = Boolean(
        saved.activeParagraphId || fallbackParagraph || Number(saved.scrollTop) > 0,
      );
      const restoredActive = saved.activeParagraphId ?? fallbackParagraph;
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
          detail: parsed.ocrPageCount
            ? `${parsed.ocrPageCount} ${parsed.ocrPageCount === 1 ? "scanned page" : "scanned pages"} recovered privately and kept in the original page order.`
            : `${parsed.chapters.length} ${parsed.chapters.length === 1 ? "section" : "sections"} checked and ready to read.`,
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
    setSidebarCollapsed(false);
    setPinnedId("");
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
    if (!activeParagraphIsLargeRef.current)
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

  useEffect(() => {
    if (!ocrOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOcrOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ocrOpen]);

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
        title: ocrResult.title || "DeepSeek OCR Book",
        author: "DeepSeek-OCR-2",
        kind: "PDF",
        chapters: docChapters,
      };
      setOcrOpen(false);
      openBook(bookDoc, `ocr-${Date.now()}`);
    },
    [openBook],
  );

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
                <OcrUploader onDocumentLoaded={handleOcrDocumentLoaded} />
              </Suspense>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
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
      closeBook={closeBook}
      jumpToChapter={jumpToChapter}
      focusParagraph={focusParagraph}
      toggleBookmark={toggleBookmark}
      copyFocusedParagraph={copyFocusedParagraph}
      moveFocus={moveFocus}
      addNote={addNote}
      resumeFlow={resumeFlow}
    />
      <AnimatePresence>
        {showIntervention && (
          <InterventionModal onDismiss={() => setShowIntervention(false)} bookTitle={book?.title} />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
