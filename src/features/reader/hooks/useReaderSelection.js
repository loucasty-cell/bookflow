import { useState, useEffect, useCallback } from "react";

export function useReaderSelection({ containerRef, activeParagraphId, bookId }) {
  const [selection, setSelection] = useState({
    text: "",
    paragraphId: "",
    quote: "",
    bookId: "",
  });

  const updateSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 2) return;

    const range = sel.getRangeAt(0);
    const container = containerRef?.current;
    if (container && !container.contains(range.commonAncestorContainer)) {
      return;
    }

    const anchorNode = sel.anchorNode ?? range.commonAncestorContainer;
    const anchorElement = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
    const paragraphId =
      anchorElement?.closest?.("[data-paragraph-id]")?.getAttribute("data-paragraph-id") ||
      activeParagraphId ||
      "";

    setSelection({
      text,
      paragraphId,
      quote: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
      bookId: bookId || "",
    });
  }, [containerRef, activeParagraphId, bookId]);

  const clearSelection = useCallback(() => {
    setSelection({
      text: "",
      paragraphId: "",
      quote: "",
      bookId: "",
    });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(updateSelection, 20);
    };

    const handleKeyUp = (e) => {
      if (e.key === "Escape") {
        clearSelection();
      } else {
        setTimeout(updateSelection, 20);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [updateSelection, clearSelection]);

  return {
    selection,
    setSelection,
    clearSelection,
  };
}
