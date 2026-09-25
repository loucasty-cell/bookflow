import { useEffect, useRef } from "react";
import { ensureSelectedSegmentVisible } from "../lib/readerViewport.js";

export function useReaderWindowEffects({
  book,
  chapterCount,
  layoutKey,
  readerRef,
  chapterWindow,
}) {
  const windowed = chapterWindow?.windowed === true;
  const winStart = windowed ? chapterWindow.winStart : 0;
  const winEnd = windowed ? chapterWindow.winEnd : chapterCount - 1;
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const prevWinStartRef = useRef(winStart);
  const invalidateChapterHeights = chapterWindow?.invalidateHeights;
  const cacheHeights = chapterWindow?.cacheHeights;
  const pendingJumpRef = chapterWindow?.pendingJumpRef;
  const expandUp = chapterWindow?.expandUp;
  const expandDown = chapterWindow?.expandDown;

  useEffect(() => {
    if (!windowed) return undefined;
    invalidateChapterHeights?.();
  }, [windowed, book, layoutKey, invalidateChapterHeights]);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const entries = new Map();
      for (let index = winStart; index <= winEnd; index += 1) {
        const section = reader.querySelector(`#chapter-${index}`);
        if (section) entries.set(index, Math.round(section.offsetHeight));
      }
      cacheHeights(entries);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [windowed, winStart, winEnd, book, layoutKey, readerRef, cacheHeights]);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    if (prevWinStartRef.current === winStart) {
      prevWinStartRef.current = winStart;
      return undefined;
    }
    const previousStart = prevWinStartRef.current;
    prevWinStartRef.current = winStart;
    if (winStart >= previousStart) return undefined;
    const oldHeight = reader.scrollHeight;
    const frame = window.requestAnimationFrame(() => {
      reader.scrollTop += reader.scrollHeight - oldHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [windowed, winStart, readerRef]);

  useEffect(() => {
    if (!windowed) return undefined;
    const pending = pendingJumpRef?.current;
    if (!pending) return undefined;
    const reader = readerRef?.current;
    if (!reader) return undefined;
    pendingJumpRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      if (pending.paragraphId) {
        const element = reader.querySelector(`[data-paragraph-id="${pending.paragraphId}"]`);
        if (element) {
          const bottomOverlay = reader.parentElement?.querySelector(
            "[data-reader-bottom-overlay]",
          );
          const alignment = ensureSelectedSegmentVisible(
            element,
            reader,
            bottomOverlay,
          );
          reader.scrollTo({
            top: alignment.targetScrollTop,
            behavior: "auto",
          });
          return;
        }
      }
      const chapterElement = reader.querySelector(`#chapter-${pending.chapterIndex}`);
      if (chapterElement) {
        const containerRect = reader.getBoundingClientRect();
        const elementRect = chapterElement.getBoundingClientRect();
        reader.scrollTo({
          top: Math.max(0, elementRect.top - containerRect.top + reader.scrollTop),
          behavior: "auto",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [windowed, winStart, winEnd, readerRef, pendingJumpRef]);

  useEffect(() => {
    if (!windowed) return undefined;
    const reader = readerRef?.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;
    if (!reader || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (!entry.isIntersecting) continue;
          if (entry.target === topSentinel) expandUp();
          else if (entry.target === bottomSentinel) expandDown();
        }
      },
      { root: reader, rootMargin: "600px 0px" },
    );
    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);
    return () => observer.disconnect();
  }, [windowed, winStart, winEnd, readerRef, expandUp, expandDown]);

  return {
    windowed,
    winStart,
    winEnd,
    topSentinelRef,
    bottomSentinelRef,
  };
}
