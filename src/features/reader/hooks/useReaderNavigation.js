/**
 * useReaderNavigation: keyboard, scroll, wheel, touch input handling and paragraph alignment.
 *
 * Extracted from App.jsx to separate input/alignment logic from session state.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  FOCUS_RAIL_RATIO,
  MAX_SCROLL_INPUT,
  SCROLL_INTENT_THRESHOLD,
  accumulateScrollIntent,
  ensureSelectedSegmentVisible,
  getIntentDirection,
  selectClosestParagraph,
  selectNextParagraph,
} from "../index.js";
import { useReaderStore } from "../../../store/readerStore.js";

export function useReaderNavigation({
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
  setReaderState,
  setActiveParagraphIsLarge,
  setPinnedId,
  updateStaticRegion,
  updateStaticScrollState,
  clearTimers,
  commitFocus,
  alignParagraphRef,
  navigationRef,
  measureKey = "",
}) {
  const frameRef = useRef(null);
  const alignTimerRef = useRef(null);
  const scrollSettleTimerRef = useRef(null);
  const wheelIdleTimerRef = useRef(null);
  const alignmentDelayRef = useRef(null);
  const programmaticScrollRef = useRef(false);
  const lastProgrammaticScrollTimeRef = useRef(0);
  const lastNavigationAtRef = useRef(0);
  const wheelRef = useRef({
    accumulated: 0,
    burstCount: 0,
    lastAt: 0,
    rollCount: 0,
  });
  const touchStartRef = useRef(null);
  const readerSizeRef = useRef({ width: 0, height: 0 });

  const finishAlignment = useCallback(() => {
    programmaticScrollRef.current = false;
    lastProgrammaticScrollTimeRef.current = performance.now();
    setReaderState(pinnedIdRef.current ? "paused" : "focused");
  }, [setReaderState, pinnedIdRef]);

  const alignParagraph = useCallback(
    (paragraph, behavior = "smooth", preserveLargePosition = false, forceAlignment = false) => {
      const reader = readerRef.current;
      if (!reader || !paragraph) return;

      const paragraphElement = reader.querySelector(`[data-paragraph-id="${paragraph.id}"]`);
      if (!paragraphElement) return;

      const bottomOverlay = reader.parentElement?.querySelector("[data-reader-bottom-overlay]");
      const alignment = ensureSelectedSegmentVisible(paragraphElement, reader, bottomOverlay);
      activeParagraphIsLargeRef.current = alignment.isLarge;
      setActiveParagraphIsLarge(alignment.isLarge);
      reader.style.setProperty("--reader-safe-top", `${alignment.safeTop}px`);
      reader.style.setProperty("--reader-safe-bottom", `${alignment.safeBottom}px`);

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

      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
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
    [readerRef, clearTimers, finishAlignment, setReaderState, setActiveParagraphIsLarge, activeParagraphIsLargeRef, pinnedIdRef, userScrollingRef]
  );

  const queueParagraphAlignment = useCallback(
    (paragraph, behavior = "smooth", preserveLargePosition = false, forceAlignment = false) => {
      if (!paragraph) return;
      if (alignmentDelayRef.current) window.clearTimeout(alignmentDelayRef.current);
      alignmentDelayRef.current = window.setTimeout(() => {
        alignmentDelayRef.current = null;
        alignParagraph(paragraph, behavior, preserveLargePosition, forceAlignment);
      }, 190);
    },
    [alignParagraph]
  );

  const setSelectedParagraph = useCallback(
    (paragraph, behavior = "smooth") => {
      if (!paragraph) return;
      commitFocus(paragraph);
      queueParagraphAlignment(paragraph, behavior, false, true);
    },
    [commitFocus, queueParagraphAlignment]
  );

  const navigateBy = useCallback(
    (direction, options = {}) => {
      if (pinnedIdRef.current) return;

      const currentIndex = paragraphsRef.current.findIndex(
        (paragraph) => paragraph.id === activeParagraphIdRef.current
      );
      const reader = readerRef.current;
      const railAnchor = reader
        ? reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO
        : 0;
      const currentParagraph =
        currentIndex >= 0
          ? paragraphsRef.current[currentIndex]
          : selectClosestParagraph(
              paragraphsRef.current,
              railAnchor,
              activeParagraphIdRef.current
            );
      const currentId = currentParagraph?.id ?? activeParagraphIdRef.current;
      const target = selectNextParagraph(
        paragraphsRef.current,
        currentId,
        direction,
        options.step ?? 1
      );

      if (!target || target.id === currentParagraph?.id) return;

      lastNavigationAtRef.current = performance.now();
      setReaderState(options.rapid ? "skimming" : "transitioning");
      setSelectedParagraph(target);
    },
    [setSelectedParagraph, setReaderState, readerRef, activeParagraphIdRef, paragraphsRef, pinnedIdRef]
  );

  const moveFocus = useCallback(
    (direction) => {
      if (!direction) return;
      pinnedIdRef.current = "";
      setPinnedId("");
      navigateBy(direction, { step: 1, rapid: true, source: "focus-card" });
    },
    [navigateBy, setPinnedId, pinnedIdRef]
  );

  // Expose navigation/alignment via refs
  useEffect(() => {
    navigationRef.current = navigateBy;
    alignParagraphRef.current = (paragraphId, behavior = "smooth") => {
      const paragraph = paragraphsRef.current.find((c) => c.id === paragraphId);
      if (paragraph) queueParagraphAlignment(paragraph, behavior);
    };

    return () => {
      navigationRef.current = null;
      alignParagraphRef.current = null;
    };
  }, [navigateBy, queueParagraphAlignment, alignParagraphRef, navigationRef, paragraphsRef]);

  // Paragraph measurement (ResizeObserver)
  useEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;
    let disposed = false;

    const measureParagraphs = () => {
      if (disposed) return;

      const isInitialMeasurement = !hasMeasuredBookRef.current;
      const shouldStartAtDocumentTop =
        isInitialMeasurement &&
        useReaderStore.getState().settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        reader?.querySelector(".reading-section")?.dataset.focusEligible === "false";
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
      const nextParagraphs = [...reader.querySelectorAll("[data-paragraph-id]")].map(
        (element, index) => {
          const bounds = element.getBoundingClientRect();
          return {
            id: element.dataset.paragraphId,
            chapter: Number(element.dataset.chapter),
            index,
            top: bounds.top - readerBounds.top + reader.scrollTop,
            bottom: bounds.bottom - readerBounds.top + reader.scrollTop,
            left: bounds.left,
          };
        }
      );

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

      if (!isInitialMeasurement) {
        if (readerSizeChanged && useReaderStore.getState().settings.mode === "focus") {
          const existing = nextParagraphs.find(
            (paragraph) => paragraph.id === activeParagraphIdRef.current
          );
          if (existing) queueParagraphAlignment(existing, "auto");
        }
        return;
      }

      const restored = nextParagraphs.find(
        (paragraph) => paragraph.id === pendingRestoreParagraphRef.current
      );
      const existing = nextParagraphs.find(
        (paragraph) => paragraph.id === activeParagraphIdRef.current
      );
      const target = restored ?? existing ?? nextParagraphs[0];
      const targetElement = reader.querySelector(`[data-paragraph-id="${target.id}"]`);

      if (targetElement) {
        const bottomOverlay = reader.parentElement?.querySelector("[data-reader-bottom-overlay]");
        const alignment = ensureSelectedSegmentVisible(targetElement, reader, bottomOverlay);
        activeParagraphIsLargeRef.current = alignment.isLarge;
        setActiveParagraphIsLarge(alignment.isLarge);
        reader.style.setProperty("--reader-safe-top", `${alignment.safeTop}px`);
        reader.style.setProperty("--reader-safe-bottom", `${alignment.safeBottom}px`);
      }

      pendingRestoreParagraphRef.current = "";
      commitFocus(target);
      if (
        useReaderStore.getState().settings.mode === "focus" &&
        !hasRestorePositionRef.current &&
        (staticRegion.isStatic || shouldStartAtDocumentTop)
      ) {
        if (staticRegion.isStatic) {
          updateStaticScrollState(reader, staticRegion.section);
          setReaderState("reading");
        }
      } else if (useReaderStore.getState().settings.mode === "focus")
        queueParagraphAlignment(target, "auto", false, true);
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
    measureKey,
    commitFocus,
    queueParagraphAlignment,
    updateStaticRegion,
    updateStaticScrollState,
    setReaderState,
    setActiveParagraphIsLarge,
    activeParagraphIdRef,
    activeParagraphIsLargeRef,
    hasMeasuredBookRef,
    hasRestorePositionRef,
    paragraphsRef,
    pendingRestoreParagraphRef,
    readerRef,
  ]);

  // Scroll/wheel/key/touch event handlers
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
        if (useReaderStore.getState().settings.mode === "focus") setReaderState("reading");
        if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = window.setTimeout(() => {
          userScrollingRef.current = false;
        }, 180);
        return;
      }

      if (wasStatic) {
        userScrollingRef.current = true;
        const target = selectClosestParagraph(
          paragraphsRef.current,
          anchorY,
          activeParagraphIdRef.current
        );
        if (target) {
          const targetElement = reader.querySelector(`[data-paragraph-id="${target.id}"]`);
          if (targetElement) {
            const bottomOverlay = reader.parentElement?.querySelector(
              "[data-reader-bottom-overlay]"
            );
            const alignment = ensureSelectedSegmentVisible(targetElement, reader, bottomOverlay);
            activeParagraphIsLargeRef.current = alignment.isLarge;
            setActiveParagraphIsLarge(alignment.isLarge);
          }
          commitFocus(target);
        }
      }

      if (useReaderStore.getState().settings.mode === "normal") {
        if (!pinnedIdRef.current) {
          const target = selectClosestParagraph(
            paragraphsRef.current,
            anchorY,
            activeParagraphIdRef.current
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
        if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = window.setTimeout(() => {
          userScrollingRef.current = false;
        }, 180);
        return;
      }

      if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = window.setTimeout(() => {
        userScrollingRef.current = false;
        const target = selectClosestParagraph(
          paragraphsRef.current,
          reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO,
          activeParagraphIdRef.current
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
      if (useReaderStore.getState().settings.mode !== "focus") return;
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
      if (pinnedIdRef.current) return;
      event.preventDefault();

      const now = performance.now();
      const elapsed = now - wheelRef.current.lastAt;
      const delta = Math.max(-MAX_SCROLL_INPUT, Math.min(MAX_SCROLL_INPUT, event.deltaY));
      const direction = Math.sign(delta);
      if (!direction) return;

      const isSameDirection =
        wheelRef.current.accumulated &&
        direction === Math.sign(wheelRef.current.accumulated) &&
        elapsed < 420;
      const rollCount = isSameDirection ? wheelRef.current.rollCount + 1 : 1;
      const burstCount = elapsed < 420 ? wheelRef.current.burstCount + 1 : 1;

      wheelRef.current = {
        accumulated: accumulateScrollIntent(wheelRef.current.accumulated, delta),
        burstCount,
        rollCount,
        lastAt: now,
      };

      if (wheelIdleTimerRef.current) window.clearTimeout(wheelIdleTimerRef.current);
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
        SCROLL_INTENT_THRESHOLD
      );
      if (
        !intentDirection ||
        now - lastNavigationAtRef.current < useReaderStore.getState().settings.focusPace ||
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
      const target = event.target instanceof Element ? event.target : null;
      if (useReaderStore.getState().settings.mode !== "focus" || target?.closest("button, input, textarea, select"))
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
        if (pinnedIdRef.current) {
          pinnedIdRef.current = "";
          setPinnedId("");
          setReaderState("focused");
        } else if (activeParagraphIdRef.current) {
          pinnedIdRef.current = activeParagraphIdRef.current;
          setPinnedId(activeParagraphIdRef.current);
          setReaderState("paused");
        }
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
      if (useReaderStore.getState().settings.mode !== "focus") return;
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
      if (useReaderStore.getState().settings.mode === "focus" && updateStaticRegion().isStatic) {
        userScrollingRef.current = true;
        setReaderState("reading");
        return;
      }
      if (useReaderStore.getState().settings.mode === "focus" && activeParagraphIsLargeRef.current)
        userScrollingRef.current = true;
    };

    const handleTouchEnd = (event) => {
      if (
        useReaderStore.getState().settings.mode !== "focus" ||
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

      const step = Math.abs(distance) > 180 ? 3 : Math.abs(distance) > 90 ? 2 : 1;
      navigationRef.current?.(distance > 0 ? 1 : -1, {
        step,
        rapid: step > 1,
        source: "touch",
      });
    };

    reader.addEventListener("scroll", handleScroll, { passive: true });
    reader.addEventListener("wheel", handleWheel, { passive: false });
    reader.addEventListener("keydown", handleKeyDown);
    reader.addEventListener("pointerdown", handlePointerDown, { passive: true });
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
  }, [book, clearTimers, commitFocus, setSelectedParagraph, setReaderState, setActiveParagraphIsLarge, updateStaticRegion, updateStaticScrollState, activeParagraphIdRef, activeParagraphIsLargeRef, navigationRef, overStaticRegionRef, paragraphsRef, pinnedIdRef, readerRef, setPinnedId, userScrollingRef]);

  const settingsMode = useReaderStore((state) => state.settings.mode);
  // Mode-change alignment
  useEffect(() => {
    if (settingsMode !== "focus" || !activeParagraphIdRef.current) return undefined;
    const align = window.setTimeout(() => {
      if (updateStaticRegion().isStatic) {
        userScrollingRef.current = true;
        setReaderState("reading");
        return;
      }
      alignParagraphRef.current?.(activeParagraphIdRef.current, "auto");
    }, 0);
    return () => window.clearTimeout(align);
  }, [settingsMode, setReaderState, updateStaticRegion, activeParagraphIdRef, alignParagraphRef, userScrollingRef]);

  return {
    navigateBy,
    moveFocus,
    setSelectedParagraph,
    alignParagraph,
    queueParagraphAlignment,
    clearAllTimers: () => {
      if (alignTimerRef.current) window.clearTimeout(alignTimerRef.current);
      if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
      if (wheelIdleTimerRef.current) window.clearTimeout(wheelIdleTimerRef.current);
      if (alignmentDelayRef.current) window.clearTimeout(alignmentDelayRef.current);
      alignTimerRef.current = null;
      scrollSettleTimerRef.current = null;
      wheelIdleTimerRef.current = null;
      alignmentDelayRef.current = null;
    },
    lastNavigationAtRef,
  };
}
