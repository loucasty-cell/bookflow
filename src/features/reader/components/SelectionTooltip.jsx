import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, MessageSquareText, Bookmark } from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";

export function SelectionTooltip({
  containerRef,
  onAddNoteFromSelection,
  onBookmarkParagraph,
  activeParagraphId,
}) {
  const [position, setPosition] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [copied, setCopied] = useState(false);
  const tooltipRef = useRef(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef?.current;
    if (container && !container.contains(range.commonAncestorContainer)) {
      setPosition(null);
      setSelectedText("");
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setPosition(null);
      return;
    }

    // Position tooltip right above the center of selected range
    const top = Math.max(10, rect.top - 48);
    const left = Math.max(12, Math.min(window.innerWidth - 180, rect.left + rect.width / 2));

    setSelectedText(text);
    setPosition({ top, left });
  }, [containerRef]);

  useEffect(() => {
    const handleMouseUp = () => {
      // Delay slightly so selection is finalized
      setTimeout(handleSelectionChange, 20);
    };

    const handleKeyUp = (e) => {
      if (e.key === "Escape") {
        setPosition(null);
        setSelectedText("");
      } else {
        setTimeout(handleSelectionChange, 20);
      }
    };

    const handleScroll = () => {
      // Reposition or dismiss on scroll
      handleSelectionChange();
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    
    const container = containerRef?.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [containerRef, handleSelectionChange]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedText) return;

    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
      setTimeout(() => {
        setCopied(false);
        setPosition(null);
      }, 1200);
    } catch {
      // fallback if clipboard fails
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setPosition(null);
      }, 1000);
    }
  };

  const handleNote = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedText) return;

    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    if (onAddNoteFromSelection) {
      onAddNoteFromSelection(selectedText);
    }
    setPosition(null);
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic(HAPTIC_PATTERNS.MEDIUM);
    if (onBookmarkParagraph && activeParagraphId) {
      onBookmarkParagraph(activeParagraphId);
    }
    setPosition(null);
  };

  if (!position) return null;

  return (
    <div
      ref={tooltipRef}
      className="sel-tip"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
        zIndex: 1000,
      }}
      role="toolbar"
      aria-label="Text selection tools"
    >
      <button
        type="button"
        className="sel-tip-btn"
        onClick={handleNote}
        title="Add margin note from selection"
        aria-label="Add margin note"
      >
        <MessageSquareText size={14} />
        <span>Note</span>
      </button>

      <button
        type="button"
        className="sel-tip-btn"
        onClick={handleCopy}
        title="Copy selected text"
        aria-label="Copy selected text"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>

      {activeParagraphId && onBookmarkParagraph && (
        <button
          type="button"
          className="sel-tip-btn"
          onClick={handleBookmark}
          title="Bookmark paragraph"
          aria-label="Bookmark paragraph"
        >
          <Bookmark size={14} />
          <span>Save</span>
        </button>
      )}
    </div>
  );
}
