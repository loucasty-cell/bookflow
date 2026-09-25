/**
 * useReaderNavigation: keyboard, scroll, wheel, touch input handling and paragraph alignment.
 *
 * Extracted from App.jsx to separate input/alignment logic from session state.
 */
import { useCallback, useEffect, useRef } from "react";
import { selectClosestParagraph, selectNextParagraph } from "../lib/focusRail.js";
import { ensureSelectedSegmentVisible } from "../lib/readerViewport.js";
import { FOCUS_RAIL_RATIO } from "../lib/readingController.js";
import { useReaderMeasurement } from "./useReaderMeasurement.js";
import { useReaderInput } from "./useReaderInput.js";
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
  pendingRestoreScrollTopRef,
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

  useReaderMeasurement({
    book,
    readerRef,
    activeParagraphIdRef,
    hasMeasuredBookRef,
    pendingRestoreParagraphRef,
    pendingRestoreScrollTopRef,
    hasRestorePositionRef,
    paragraphsRef,
    activeParagraphIsLargeRef,
    setReaderState,
    setActiveParagraphIsLarge,
    updateStaticRegion,
    updateStaticScrollState,
    commitFocus,
    queueParagraphAlignment,
    frameRef,
    readerSizeRef,
    programmaticScrollRef,
    lastProgrammaticScrollTimeRef,
    measureKey,
  });

  // Scroll/wheel/key/touch event handlers
  useReaderInput({
    book,
    readerRef,
    activeParagraphIdRef,
    pinnedIdRef,
    paragraphsRef,
    userScrollingRef,
    activeParagraphIsLargeRef,
    overStaticRegionRef,
    setReaderState,
    setActiveParagraphIsLarge,
    setPinnedId,
    updateStaticRegion,
    updateStaticScrollState,
    clearTimers,
    commitFocus,
    setSelectedParagraph,
    navigationRef,
    programmaticScrollRef,
    lastProgrammaticScrollTimeRef,
    lastNavigationAtRef,
    scrollSettleTimerRef,
    wheelIdleTimerRef,
    wheelRef,
    touchStartRef,
  });

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
