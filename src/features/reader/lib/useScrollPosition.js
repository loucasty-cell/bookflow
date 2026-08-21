import { useCallback, useEffect, useRef, useState } from "react";
import { FOCUS_RAIL_RATIO } from "./readingController.js";
import { selectClosestParagraph } from "./focusRail.js";

export function computeScrollMetrics(scrollTop, clientHeight, scrollHeight) {
  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
  const safeClientHeight = Math.max(0, Number(clientHeight) || 0);
  const safeScrollHeight = Math.max(0, Number(scrollHeight) || 0);
  const maxScroll = Math.max(0, safeScrollHeight - safeClientHeight);
  const progress = maxScroll > 0 ? Math.min(100, Math.max(0, Math.round((safeScrollTop / maxScroll) * 100))) : 0;
  return {
    scrollTop: safeScrollTop,
    clientHeight: safeClientHeight,
    scrollHeight: safeScrollHeight,
    maxScroll,
    progress,
  };
}

export function useScrollPosition(containerRef, options = {}) {
  const {
    focusRailRatio = FOCUS_RAIL_RATIO,
    onScroll = null,
    onParagraphChange = null,
    disabled = false,
  } = options;

  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    progress: 0,
    direction: "idle",
    velocity: 0,
    isScrolling: false,
    activeParagraphId: "",
  });

  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const scrollSettleTimeoutRef = useRef(null);
  const rafIdRef = useRef(null);
  const activeParagraphIdRef = useRef("");

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const metrics = computeScrollMetrics(
      container.scrollTop,
      container.clientHeight,
      container.scrollHeight
    );

    const now = performance.now();
    const timeDelta = Math.max(1, now - (lastScrollTimeRef.current || now));
    const distanceDelta = metrics.scrollTop - lastScrollTopRef.current;
    const velocity = Math.abs(distanceDelta / timeDelta);
    const direction = distanceDelta > 0.5 ? "down" : distanceDelta < -0.5 ? "up" : "idle";

    lastScrollTopRef.current = metrics.scrollTop;
    lastScrollTimeRef.current = now;

    // Detect paragraph at focus rail
    const anchorY = metrics.scrollTop + metrics.clientHeight * focusRailRatio;
    const paragraphElements = container.querySelectorAll("[data-paragraph-id]");
    const containerRect = container.getBoundingClientRect();

    let closestId = "";
    if (paragraphElements.length > 0) {
      const paragraphItems = Array.from(paragraphElements).map((el, index) => {
        const rect = el.getBoundingClientRect();
        return {
          id: el.dataset.paragraphId,
          chapter: Number(el.dataset.chapter) || 0,
          index,
          top: rect.top - containerRect.top + metrics.scrollTop,
          bottom: rect.bottom - containerRect.top + metrics.scrollTop,
        };
      });

      const closest = selectClosestParagraph(paragraphItems, anchorY, activeParagraphIdRef.current);
      if (closest?.id) {
        closestId = closest.id;
      }
    }

    const isDifferentParagraph = closestId && closestId !== activeParagraphIdRef.current;
    if (isDifferentParagraph) {
      activeParagraphIdRef.current = closestId;
      if (onParagraphChange) {
        onParagraphChange(closestId);
      }
    }

    const newInfo = {
      ...metrics,
      direction,
      velocity,
      isScrolling: true,
      activeParagraphId: closestId || activeParagraphIdRef.current,
    };

    setScrollInfo(newInfo);
    if (onScroll) {
      onScroll(newInfo);
    }

    if (scrollSettleTimeoutRef.current) {
      window.clearTimeout(scrollSettleTimeoutRef.current);
    }
    scrollSettleTimeoutRef.current = window.setTimeout(() => {
      setScrollInfo((prev) => ({
        ...prev,
        isScrolling: false,
        direction: "idle",
        velocity: 0,
      }));
    }, 150);
  }, [containerRef, disabled, focusRailRatio, onParagraphChange, onScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return undefined;

    const handleScroll = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(updateScrollState);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollState();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (scrollSettleTimeoutRef.current) window.clearTimeout(scrollSettleTimeoutRef.current);
    };
  }, [containerRef, disabled, updateScrollState]);

  const scrollToParagraph = useCallback(
    (paragraphId, options = {}) => {
      const container = containerRef.current;
      if (!container || !paragraphId) return;

      const element = container.querySelector(`[data-paragraph-id="${paragraphId}"]`);
      if (!element) return;

      const behavior = options.behavior || "smooth";
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const effectiveBehavior = prefersReduced ? "auto" : behavior;

      element.scrollIntoView({
        behavior: effectiveBehavior,
        block: options.block || "center",
      });
    },
    [containerRef],
  );

  const scrollToChapter = useCallback(
    (chapterIndex, options = {}) => {
      const container = containerRef.current;
      if (!container || chapterIndex === undefined || chapterIndex === null) return;

      const element = container.querySelector(`#chapter-${chapterIndex}`);
      if (!element) return;

      const behavior = options.behavior || "smooth";
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const effectiveBehavior = prefersReduced ? "auto" : behavior;

      element.scrollIntoView({
        behavior: effectiveBehavior,
        block: options.block || "start",
      });
    },
    [containerRef],
  );

  const scrollToTop = useCallback(
    (options = {}) => {
      const container = containerRef.current;
      if (!container) return;

      const behavior = options.behavior || "smooth";
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const effectiveBehavior = prefersReduced ? "auto" : behavior;

      container.scrollTo({
        top: 0,
        behavior: effectiveBehavior,
      });
    },
    [containerRef],
  );

  return {
    ...scrollInfo,
    scrollToParagraph,
    scrollToChapter,
    scrollToTop,
    recalculate: updateScrollState,
  };
}
