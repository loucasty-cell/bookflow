import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, MessageSquareText, Bookmark, BookOpen } from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";
import { lookup, loadLicensedDictionary } from "../lib/dictionary.js";

export function SelectionTooltip({
  containerRef,
  onAddNoteFromSelection,
  onBookmarkParagraph,
  activeParagraphId,
  lookupEnabled = false,
}) {
  const [position, setPosition] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraphId, setSelectedParagraphId] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [definition, setDefinition] = useState(null);
  const [lookupMiss, setLookupMiss] = useState(false);
  const timersRef = useRef([]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setPosition(null);
      setSelectedText("");
      setSelectedParagraphId("");
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setPosition(null);
      setSelectedText("");
      setSelectedParagraphId("");
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef?.current;
    if (container && !container.contains(range.commonAncestorContainer)) {
      setPosition(null);
      setSelectedText("");
      setSelectedParagraphId("");
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setPosition(null);
      setSelectedParagraphId("");
      return;
    }

    const anchorNode = selection.anchorNode ?? range.commonAncestorContainer;
    const anchorElement = anchorNode?.nodeType === 1 ? anchorNode : anchorNode?.parentElement;
    const paragraphId = anchorElement?.closest?.("[data-paragraph-id]")?.getAttribute("data-paragraph-id") || "";

    // Position tooltip right above the center of selected range
    const top = Math.max(10, rect.top - 48);
    const left = Math.max(12, Math.min(window.innerWidth - 180, rect.left + rect.width / 2));

    setSelectedText(text);
    setSelectedParagraphId(paragraphId);
    setDefinition(null);
    setLookupMiss(false);
    setCopied(false);
    setCopyFailed(false);
    setPosition({ top, left });
  }, [containerRef]);

  useEffect(() => {
    const later = (fn, ms) => {
      const id = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((timer) => timer !== id);
        fn();
      }, ms);
      timersRef.current.push(id);
    };
    const handleMouseUp = () => {
      later(handleSelectionChange, 20);
    };

    const handleKeyUp = (e) => {
      if (e.key === "Escape") {
        setPosition(null);
        setSelectedText("");
        setSelectedParagraphId("");
      } else {
        later(handleSelectionChange, 20);
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
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };
  }, [containerRef, handleSelectionChange]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedText) return;

    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      setCopyFailed(false);
      triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
      const id = window.setTimeout(() => {
        setCopied(false);
        setPosition(null);
      }, 1200);
      timersRef.current.push(id);
    } catch {
      setCopyFailed(true);
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
    const bookmarkId = selectedParagraphId || activeParagraphId;
    if (onBookmarkParagraph && bookmarkId) {
      onBookmarkParagraph(bookmarkId);
    }
    setPosition(null);
  };

  const handleLookup = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const firstWord = selectedText.trim().split(/\s+/)[0] ?? "";
    if (!firstWord) return;
    await loadLicensedDictionary().catch(() => null);
    const entry = lookup(firstWord);
    if (entry) {
      setDefinition(entry);
      setLookupMiss(false);
    } else {
      setDefinition(null);
      setLookupMiss(true);
    }
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
  };

  if (!position) return null;

  const clampedLeft = Math.max(90, Math.min(window.innerWidth - 90, position.left));
  return (
    <div
      className="sel-tip"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${clampedLeft}px`,
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
        <span>{copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}</span>
      </button>

      {(selectedParagraphId || activeParagraphId) && onBookmarkParagraph && (
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

      {lookupEnabled && (
        <button
          type="button"
          className="sel-tip-btn"
          onClick={handleLookup}
          title="Look up first selected word locally"
          aria-label="Look up word locally"
        >
          <BookOpen size={14} />
          <span>Define</span>
        </button>
      )}
      {lookupEnabled && definition && (
        <div className="sel-tip-definition" role="status">
          <strong>{definition.word}</strong>
          <span> — {definition.definitions[0]}</span>
        </div>
      )}
      {lookupEnabled && lookupMiss && !definition && (
        <div className="sel-tip-definition" role="status">
          <span>No local entry for that word.</span>
        </div>
      )}
    </div>
  );
}
