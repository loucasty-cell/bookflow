import { useEffect, useRef } from "react";
import { selectClosestParagraph } from "../lib/focusRail.js";
import { ensureSelectedSegmentVisible, getReaderSafeViewport } from "../lib/readerViewport.js";
import {
  FOCUS_RAIL_RATIO,
  MAX_SCROLL_INPUT,
  SCROLL_INTENT_THRESHOLD,
  accumulateScrollIntent,
  getIntentDirection,
} from "../lib/readingController.js";
import { useReaderStore } from "../../../store/readerStore.js";

/**
 * The keydown listener is bound to the reader element, so keyboard navigation
 * only arrives once focus is inside it. On arrival focus is still on the button
 * that opened the book, which no longer exists, so it falls back to the body and
 * the arrows go nowhere. The reader claims focus once the canvas exists.
 *
 * Never steals focus from a real control, and only ever runs once, so an open
 * settings panel or a focused button keeps its place.
 */
export function shouldClaimReaderFocus({ reader, activeElement, body, alreadyClaimed }) {
  if (!reader) return false;
  if (alreadyClaimed) return false;
  if (!body) return false;
  return activeElement === body;
}

export function useReaderInput({
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
}) {
  const hasFocusedReaderRef = useRef(false);

  useEffect(() => {
    if (!book || !readerRef.current) return undefined;

    const reader = readerRef.current;

    if (
      shouldClaimReaderFocus({
        reader,
        activeElement: document.activeElement,
        body: document.body,
        alreadyClaimed: hasFocusedReaderRef.current,
      })
    ) {
      hasFocusedReaderRef.current = true;
      reader.focus({ preventScroll: true });
    }

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
            const alignment = ensureSelectedSegmentVisible(
              targetElement,
              reader,
              bottomOverlay,
              { preserveLargePosition: true },
            );
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
          const targetElement = reader.querySelector(
            `[data-paragraph-id="${target.id}"]`,
          );
          const bottomOverlay = targetElement
            ? reader.parentElement?.querySelector("[data-reader-bottom-overlay]")
            : null;
          const targetViewport = targetElement
            ? getReaderSafeViewport(reader, targetElement, bottomOverlay)
            : null;
          const targetIsLarge =
            target.isLarge === true ||
            (targetElement && targetViewport
              ? targetElement.getBoundingClientRect().height > targetViewport.usableHeight
              : false);
          if (targetIsLarge) {
            activeParagraphIsLargeRef.current = true;
            setActiveParagraphIsLarge(true);
            setReaderState("reading");
            commitFocus(target);
          } else {
            setReaderState("snapping");
            setSelectedParagraph(target);
          }
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
      if (
        useReaderStore.getState().settings.mode !== "focus" ||
        target?.closest("button, input, textarea, select")
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
  }, [
    book,
    clearTimers,
    commitFocus,
    setSelectedParagraph,
    setReaderState,
    setActiveParagraphIsLarge,
    updateStaticRegion,
    updateStaticScrollState,
    activeParagraphIdRef,
    activeParagraphIsLargeRef,
    navigationRef,
    overStaticRegionRef,
    paragraphsRef,
    pinnedIdRef,
    readerRef,
    setPinnedId,
    userScrollingRef,
    programmaticScrollRef,
    lastProgrammaticScrollTimeRef,
    lastNavigationAtRef,
    scrollSettleTimerRef,
    wheelIdleTimerRef,
    wheelRef,
    touchStartRef,
  ]);
}
