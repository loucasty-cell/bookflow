import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_SELECTION = {
  text: "",
  paragraphId: "",
  quote: "",
  bookId: "",
};

const SELECTION_DEBOUNCE_MS = 40;
const PRESERVE_SELECTION_MS = 750;
const MIN_SELECTION_CHARS = 2;

function toRect(rect) {
  if (!rect) return null;
  const { top, left, width, height } = rect;
  if (![top, left, width, height].every((value) => Number.isFinite(value))) return null;
  if (width <= 0 || height <= 0) return null;
  return { top, left, width, height };
}

function resolveParagraphId(selection, range) {
  const anchorNode = selection.anchorNode ?? range?.commonAncestorContainer;
  const element = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
  return (
    element?.closest?.("[data-paragraph-id]")?.getAttribute("data-paragraph-id") || ""
  );
}

export function useReaderSelection({ containerRef, activeParagraphId, bookId }) {
  const [selection, setSelectionState] = useState(EMPTY_SELECTION);
  const [anchorRect, setAnchorRect] = useState(null);
  const [containerNode, setContainerNode] = useState(null);
  const timersRef = useRef(new Set());
  const preserveUntilRef = useRef(0);
  const fallbackParagraphIdRef = useRef(activeParagraphId || "");
  const bookIdRef = useRef(bookId || "");

  useEffect(() => {
    const node = containerRef?.current ?? null;
    setContainerNode((current) => (current === node ? current : node));
  }, [containerRef]);

  useEffect(() => {
    fallbackParagraphIdRef.current = activeParagraphId || "";
  }, [activeParagraphId]);

  useEffect(() => {
    bookIdRef.current = bookId || "";
  }, [bookId]);

  const clearNativeSelection = useCallback(() => {
    try {
      window.getSelection?.()?.removeAllRanges?.();
    } catch {
      /* selection APIs can throw in restricted contexts */
    }
  }, []);

  const clearSelection = useCallback(
    ({ native = true } = {}) => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current.clear();
      preserveUntilRef.current = 0;
      if (native) clearNativeSelection();
      setSelectionState(EMPTY_SELECTION);
      setAnchorRect(null);
    },
    [clearNativeSelection],
  );

  const readSelection = useCallback(() => {
    const container = containerRef?.current;
    if (!container || typeof window === "undefined") return null;
    const live = window.getSelection?.();
    if (!live || live.isCollapsed || live.rangeCount === 0) return null;

    const text = live.toString().trim();
    if (!text || text.length < MIN_SELECTION_CHARS) return null;

    const range = live.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return null;

    const rect = toRect(range.getBoundingClientRect());
    if (!rect) return null;

    return {
      text,
      paragraphId: resolveParagraphId(live, range) || fallbackParagraphIdRef.current || "",
      bookId: bookIdRef.current,
      quote: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
      rect,
    };
  }, [containerRef]);

  const refreshSelection = useCallback(() => {
    const snapshot = readSelection();
    if (!snapshot) {
      if (preserveUntilRef.current > Date.now()) return null;
      setSelectionState((current) => (current.text ? EMPTY_SELECTION : current));
      setAnchorRect((current) => (current ? null : current));
      return null;
    }
    preserveUntilRef.current = 0;
    setSelectionState({
      text: snapshot.text,
      paragraphId: snapshot.paragraphId,
      bookId: snapshot.bookId,
      quote: snapshot.quote,
    });
    setAnchorRect(snapshot.rect);
    return snapshot;
  }, [readSelection]);

  const remeasureSelection = useCallback(() => {
    setAnchorRect(readSelection()?.rect ?? null);
  }, [readSelection]);

  const selectText = useCallback((text, paragraphId) => {
    const value = String(text ?? "").trim();
    if (!value) return;
    preserveUntilRef.current = Date.now() + PRESERVE_SELECTION_MS;
    setSelectionState({
      text: value,
      paragraphId: paragraphId || fallbackParagraphIdRef.current || "",
      bookId: bookIdRef.current,
      quote: value.slice(0, 120) + (value.length > 120 ? "…" : ""),
    });
  }, []);

  useEffect(() => {
    if (!containerNode) return undefined;
    const timers = timersRef.current;

    const scheduleRefresh = () => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        refreshSelection();
      }, SELECTION_DEBOUNCE_MS);
      timers.add(id);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      const isTextField =
        typeof target?.closest === "function" &&
        Boolean(target.closest("input, textarea, [contenteditable='true']"));
      if (isTextField) return;
      clearSelection();
    };

    document.addEventListener("selectionchange", scheduleRefresh);
    document.addEventListener("keydown", handleKeyDown);
    containerNode.addEventListener("scroll", remeasureSelection, { passive: true });

    return () => {
      document.removeEventListener("selectionchange", scheduleRefresh);
      document.removeEventListener("keydown", handleKeyDown);
      containerNode.removeEventListener("scroll", remeasureSelection);
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, [clearSelection, containerNode, remeasureSelection, refreshSelection]);

  return {
    selection,
    anchorRect,
    hasSelection: Boolean(selection.text),
    clearSelection,
    selectText,
    refreshSelection,
  };
}
