import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, MessageSquareText, Bookmark, BookOpen, Sparkles } from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";
import { lookup, loadLicensedDictionary } from "../lib/dictionary.js";

const TOOLBAR_OFFSET = 48;
const TOOLBAR_EDGE = 12;
const TOOLBAR_HALF_WIDTH = 90;
const COPY_FEEDBACK_MS = 1200;

function resolvePosition(anchorRect) {
  if (!anchorRect) return null;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const left = Math.max(
    TOOLBAR_EDGE,
    Math.min(viewportWidth - TOOLBAR_HALF_WIDTH * 2 - TOOLBAR_EDGE, anchorRect.left + anchorRect.width / 2),
  );
  return { top: Math.max(TOOLBAR_EDGE, anchorRect.top - TOOLBAR_OFFSET), left };
}

export function SelectionTooltip({
  anchorRect,
  selectedText = "",
  selectedParagraphId = "",
  onAddNoteFromSelection,
  onBookmarkParagraph,
  onAskLens,
  onDismiss,
  activeParagraphId,
  lookupEnabled = false,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [definition, setDefinition] = useState(null);
  const [lookupMiss, setLookupMiss] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setDismissed(false);
    setCopied(false);
    setCopyFailed(false);
    setDefinition(null);
    setLookupMiss(false);
  }, [selectedText, selectedParagraphId, anchorRect?.top, anchorRect?.left]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const hide = useCallback(
    (preserveSelection = false) => {
      setDismissed(true);
      if (!preserveSelection) onDismiss?.();
    },
    [onDismiss],
  );

  const close = useCallback(() => hide(false), [hide]);

  const handleCopy = useCallback(
    async (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!selectedText) return;
      try {
        if (!navigator.clipboard) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(selectedText);
        setCopied(true);
        setCopyFailed(false);
        triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          close();
        }, COPY_FEEDBACK_MS);
      } catch {
        setCopyFailed(true);
      }
    },
    [close, selectedText],
  );

  const handleNote = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!selectedText) return;
      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
      onAddNoteFromSelection?.(selectedText);
      close();
    },
    [close, onAddNoteFromSelection, selectedText],
  );

  const handleBookmark = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      triggerHaptic(HAPTIC_PATTERNS.MEDIUM);
      const bookmarkId = selectedParagraphId || activeParagraphId;
      if (bookmarkId) onBookmarkParagraph?.(bookmarkId);
      close();
    },
    [activeParagraphId, close, onBookmarkParagraph, selectedParagraphId],
  );

  const handleAskLens = useCallback(
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
      onAskLens?.(selectedText, selectedParagraphId);
      hide(true);
    },
    [hide, onAskLens, selectedParagraphId, selectedText],
  );

  const handleLookup = useCallback(
    async (event) => {
      event.stopPropagation();
      event.preventDefault();
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
    },
    [selectedText],
  );

  const position = dismissed ? null : resolvePosition(anchorRect);
  if (!position || !selectedText) return null;

  return (
    <div
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
      {onAskLens && (
        <button
          type="button"
          className="sel-tip-btn"
          onClick={handleAskLens}
          title="Ask Reading Lens about this selection"
          aria-label="Ask Reading Lens about this selection"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Lens</span>
        </button>
      )}

      <button
        type="button"
        className="sel-tip-btn"
        onClick={handleNote}
        title="Add margin note from selection"
        aria-label="Add margin note"
      >
        <MessageSquareText size={14} aria-hidden="true" />
        <span>Note</span>
      </button>

      <button
        type="button"
        className="sel-tip-btn"
        onClick={handleCopy}
        title="Copy selected text"
        aria-label="Copy selected text"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
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
          <Bookmark size={14} aria-hidden="true" />
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
          <BookOpen size={14} aria-hidden="true" />
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
