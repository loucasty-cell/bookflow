import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const LONG_BOOK_PARAGRAPH_THRESHOLD = 1500;
export const WINDOW_RADIUS = 1;
const ESTIMATED_PARAGRAPH_PX = 34;
const ESTIMATED_CHAPTER_CHROME_PX = 170;

export function findChapterForParagraph(chapters, paragraphId) {
  if (!paragraphId || !Array.isArray(chapters)) return -1;
  return chapters.findIndex((chapter) =>
    chapter?.paragraphs?.some((paragraph) => paragraph?.id === paragraphId),
  );
}

export function countParagraphs(chapters) {
  if (!Array.isArray(chapters)) return 0;
  return chapters.reduce(
    (total, chapter) => total + (chapter?.paragraphs?.length ?? 0),
    0,
  );
}

export function estimateChapterHeight(chapter) {
  const paragraphs = chapter?.paragraphs?.length ?? 0;
  return paragraphs * ESTIMATED_PARAGRAPH_PX + ESTIMATED_CHAPTER_CHROME_PX;
}

export function initialWindow(chapters, activeChapter, focusId) {
  const total = Array.isArray(chapters) ? chapters.length : 0;
  if (!total) return { start: 0, end: -1 };
  const focusChapter = findChapterForParagraph(chapters, focusId);
  const center = focusChapter >= 0 ? focusChapter : Math.min(Math.max(0, activeChapter), total - 1);
  return {
    start: Math.max(0, center - WINDOW_RADIUS),
    end: Math.min(total - 1, center + WINDOW_RADIUS),
  };
}

export function useChapterWindow({ docKey, chapters, activeChapter, focusId }) {
  const totalParagraphs = useMemo(() => countParagraphs(chapters), [chapters]);
  const windowed = totalParagraphs > LONG_BOOK_PARAGRAPH_THRESHOLD;

  const [win, setWin] = useState(() => initialWindow(chapters, activeChapter, focusId));
  const [heightCache, setHeightCache] = useState(() => new Map());
  const pendingJumpRef = useRef(null);
  const docKeyRef = useRef(docKey);

  useEffect(() => {
    if (docKeyRef.current === docKey) return;
    docKeyRef.current = docKey;
    pendingJumpRef.current = null;
    setWin(initialWindow(chapters, activeChapter, focusId));
    setHeightCache(new Map());
  }, [docKey, chapters, activeChapter, focusId]);

  const chapterCount = chapters?.length ?? 0;
  useEffect(() => {
    if (!chapterCount) {
      setWin({ start: 0, end: -1 });
      return;
    }
    setWin((current) => {
      const start = Math.min(Math.max(0, current.start), chapterCount - 1);
      const end = Math.min(Math.max(start, current.end), chapterCount - 1);
      if (start === current.start && end === current.end) return current;
      return { start, end };
    });
  }, [chapterCount, windowed]);

  const cacheHeights = useCallback((entries) => {
    if (!entries?.size) return;
    setHeightCache((current) => {
      let changed = false;
      const next = new Map(current);
      for (const [index, height] of entries) {
        if (next.get(index) !== height) {
          next.set(index, height);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const invalidateHeights = useCallback(() => {
    setHeightCache(new Map());
  }, []);

  const heightOf = useCallback(
    (index) => heightCache.get(index) ?? estimateChapterHeight(chapters?.[index]),
    [heightCache, chapters],
  );

  const { topSpacer, bottomSpacer } = useMemo(() => {
    if (!windowed) return { topSpacer: 0, bottomSpacer: 0 };
    let top = 0;
    for (let i = 0; i < win.start; i += 1) top += heightOf(i);
    let bottom = 0;
    const total = chapters?.length ?? 0;
    for (let i = win.end + 1; i < total; i += 1) bottom += heightOf(i);
    return { topSpacer: Math.round(top), bottomSpacer: Math.round(bottom) };
  }, [windowed, win, heightOf, chapters]);

  const expandUp = useCallback(() => {
    setWin((current) => {
      if (current.start <= 0) return current;
      return { start: current.start - 1, end: current.end };
    });
  }, []);

  const expandDown = useCallback(() => {
    setWin((current) => {
      const total = Array.isArray(chapters) ? chapters.length : 0;
      if (current.end >= total - 1) return current;
      return { start: current.start, end: current.end + 1 };
    });
  }, [chapters]);

  const requestJump = useCallback(
    (index, paragraphId = null) => {
      const total = Array.isArray(chapters) ? chapters.length : 0;
      if (!total) return;
      const clamped = Math.min(Math.max(0, index), total - 1);
      const next = {
        start: Math.max(0, clamped - WINDOW_RADIUS),
        end: Math.min(total - 1, clamped + WINDOW_RADIUS),
      };
      const pending = pendingJumpRef.current;
      if (
        pending &&
        pending.chapterIndex === clamped &&
        pending.paragraphId === paragraphId
      ) {
        return;
      }
      pendingJumpRef.current = { chapterIndex: clamped, paragraphId };
      setWin((current) => {
        if (current.start === next.start && current.end === next.end) return current;
        return next;
      });
    },
    [chapters],
  );

  return useMemo(
    () => ({
      windowed,
      totalParagraphs,
      winStart: windowed ? win.start : 0,
      winEnd: windowed ? win.end : chapterCount - 1,
      topSpacer,
      bottomSpacer,
      pendingJumpRef,
      cacheHeights,
      invalidateHeights,
      expandUp,
      expandDown,
      requestJump,
    }),
    [
      windowed,
      totalParagraphs,
      win.start,
      win.end,
      chapterCount,
      topSpacer,
      bottomSpacer,
      cacheHeights,
      invalidateHeights,
      expandUp,
      expandDown,
      requestJump,
    ],
  );
}
