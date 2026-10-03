import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FocusBarAmbient } from "./FocusBarAmbient.jsx";
import {
  AlignLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Focus,
  GripHorizontal,
  Landmark,
  Languages,
  Lightbulb,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
  triggerHaptic,
  HAPTIC_PATTERNS,
} from "../../../shared/lib/index.js";
import {
  LENS_ACTIONS,
  LENS_KEYBOARD_STEP,
  LENS_KEYBOARD_STEP_LARGE,
  LENS_POSITION_STORAGE_KEY,
  clampLensPosition,
  lensKeyboardDelta,
  lensStateAttribute,
  parseLensPosition,
  quickActionStatus,
  serializeLensPosition,
} from "../hooks/useReadingLens.js";
import { useUIStore } from "../../../store/uiStore.js";

const HIT_AREA_PX = 44;

const ACTION_ICONS = {
  "align-left": AlignLeft,
  lightbulb: Lightbulb,
  languages: Languages,
  landmark: Landmark,
};

function hitAreaStyle(extra = {}) {
  return { minWidth: `${HIT_AREA_PX}px`, minHeight: `${HIT_AREA_PX}px`, ...extra };
}

function forcedHitAreaStyle(extra = {}) {
  return {
    minWidth: `${HIT_AREA_PX}px`,
    minHeight: `${HIT_AREA_PX}px`,
    ...extra,
  };
}

export function FocusCard({
  focusedParagraph,
  pinnedId,
  isBookmarked,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  resumeFlow,
  selectedText = "",
  initiallyCollapsed = true,
  onClearSelection,
  onAddNoteFromSelection,
  lensOpenRequest = 0,
  onLensOpened,
  surface = "reader",
  chapterTitle = "",
  chapterText = "",
  lens,
}) {
  const isGlobal = surface === "global";
  const [isHidden, setIsHidden] = useState(initiallyCollapsed);
  const [isDismissed, setIsDismissed] = useState(false);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [activeAction, setActiveAction] = useState("");

  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const targetRef = useRef(null);
  const promptInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const handledOpenRequestRef = useRef(0);
  const consentHintId = useId();
  const chapterHintId = useId();
  const statusId = useId();

  const focusedId = focusedParagraph?.id;

  const {
    messages,
    status,
    statusLabel,
    isLoading,
    error,
    provider,
    usedFallback,
    isExpanded,
    setIsExpanded,
    activePassage,
    consentGranted,
    setConsentGranted,
    includeChapterContext,
    setIncludeChapterContext,
    canIncludeChapterContext,
    ask,
    retryMessage,
    toggleFeedback,
    cancel,
    clear,
  } = lens;

  const passageFallback = useMemo(() => {
    if (selectedText && selectedText.trim()) return selectedText.trim();
    if (activePassage && activePassage.trim()) return activePassage.trim();
    if (focusedParagraph?.text && focusedParagraph.text.trim()) return focusedParagraph.text.trim();
    if (chapterText && chapterText.trim()) return chapterText.trim().slice(0, 1000);
    if (chapterTitle && chapterTitle.trim()) return `Chapter: ${chapterTitle.trim()}`;
    if (isGlobal) return "Bookflow Reading Assistant: Focus, comprehension, and reading flow.";
    return "";
  }, [selectedText, activePassage, focusedParagraph, chapterText, chapterTitle, isGlobal]);

  const hasSelection = Boolean(selectedText.trim());
  const hasPassage = Boolean(passageFallback);
  const mountedRef = useRef(false);

  /**
   * The card starts folded to its pill so entering a book shows the text, not a
   * panel. Selecting new text brings it straight back, and scrolling to a new
   * paragraph folds it away again, so the only two resting states are "reading"
   * and "pinned to this passage".
   */
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setIsHidden(true);
    onClearSelection?.();
  }, [focusedId, onClearSelection]);

  useEffect(() => {
    if (!hasSelection) return;
    setIsHidden(false);
  }, [hasSelection, selectedText]);

  useEffect(() => {
    if (!isLoading) setActiveAction("");
  }, [isLoading]);

  useEffect(() => {
    if (!lensOpenRequest || lensOpenRequest === handledOpenRequestRef.current) return;
    handledOpenRequestRef.current = lensOpenRequest;
    setIsHidden(false);
    setIsDismissed(false);
    setIsExpanded(true);
    promptInputRef.current?.focus();
    onLensOpened?.();
  }, [lensOpenRequest, onLensOpened, setIsExpanded]);

  useEffect(() => {
    if (hasSelection) {
      setIsDismissed(false);
    }
  }, [hasSelection]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const clampToBounds = useCallback(
    (desired, size) => {
      const margin = 8;
      const viewportWidth = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 320);
      const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 480);
      return clampLensPosition({
        left: desired.left,
        top: desired.top,
        width: size.width,
        height: size.height,
        viewportWidth,
        viewportHeight,
        margin,
      });
    },
    [],
  );

  const applyTarget = useCallback((next) => {
    targetRef.current = next;
    setPosition((current) => {
      if (!current) return next;
      if (Math.abs(next.left - current.left) < 0.5 && Math.abs(next.top - current.top) < 0.5) {
        return current;
      }
      return next;
    });
  }, []);

  const syncPosition = useCallback(() => {
    const target = targetRef.current;
    const card = cardRef.current;
    if (!target || !card) return;
    const rect = card.getBoundingClientRect();
    const next = clampToBounds({ left: target.left, top: target.top }, {
      width: rect.width,
      height: rect.height,
    });
    applyTarget(next);
  }, [applyTarget, clampToBounds]);

  useEffect(() => {
    const stored = parseLensPosition(getStorageItem(LENS_POSITION_STORAGE_KEY));
    if (stored) targetRef.current = stored;
    syncPosition();
  }, [syncPosition]);

  useEffect(() => {
    syncPosition();
  }, [isExpanded, isHidden, syncPosition]);

  useEffect(() => {
    const handleViewportChange = () => syncPosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [syncPosition]);

  const resetPosition = useCallback(() => {
    targetRef.current = null;
    setPosition(null);
    removeStorageItem(LENS_POSITION_STORAGE_KEY);
    const card = cardRef.current;
    if (card) {
      card.style.left = "";
      card.style.top = "";
      card.style.bottom = "";
      card.style.right = "";
    }
  }, []);

  const persistPosition = useCallback((next) => {
    const value = serializeLensPosition(next);
    if (!value) return;
    setStorageItem(LENS_POSITION_STORAGE_KEY, value);
  }, []);

  const justDraggedRef = useRef(false);

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const card = cardRef.current;
      if (!card) return;

      const deltaX = event.clientX - drag.startPointer.x;
      const deltaY = event.clientY - drag.startPointer.y;

      if (!drag.hasMoved) {
        if (Math.hypot(deltaX, deltaY) < 3) return;
        drag.hasMoved = true;
        setIsDragging(true);
        card.classList.add("is-dragging");
        card.style.willChange = "left, top";
        try {
          card.setPointerCapture?.(event.pointerId);
        } catch {
          /* capture is best effort */
        }
      }

      event.preventDefault?.();

      const next = clampToBounds(
        {
          left: drag.rect.left + deltaX,
          top: drag.rect.top + deltaY,
        },
        { width: drag.rect.width, height: drag.rect.height },
      );

      targetRef.current = next;

      // Direct DOM style updates prevent laggy re-renders during active drag
      card.style.left = `${next.left}px`;
      card.style.top = `${next.top}px`;
      card.style.bottom = "auto";
      card.style.right = "auto";
    },
    [clampToBounds],
  );

  const endDrag = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
      const card = cardRef.current;
      if (card) {
        card.classList.remove("is-dragging");
        card.style.willChange = "";
        try {
          card.releasePointerCapture?.(drag.pointerId);
        } catch {
          /* capture release is best effort */
        }
      }
      const moved = drag.hasMoved;
      dragRef.current = null;
      setIsDragging(false);
      if (moved) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 120);
        if (targetRef.current) {
          setPosition(targetRef.current);
          persistPosition(targetRef.current);
        }
      }
    },
    [persistPosition],
  );

  const startDrag = useCallback(
    (event) => {
      if (event.button != null && event.button !== 0) return;
      const target = event.target;
      if (
        target.closest(
          "input, textarea, select, [contenteditable='true'], .focus-card-dismiss-btn, .lens-pill-close, .focus-card-icon-btn, .focus-chat-copy-btn, .lens-feedback-btn, .focus-card-send-btn, .lens-consent-toggle, .focus-quick-pill, .lens-chapter-toggle, .focus-card-chat-messages"
        )
      ) {
        return;
      }
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        startPointer: { x: event.clientX, y: event.clientY },
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        hasMoved: false,
      };
      targetRef.current = { left: rect.left, top: rect.top };

      const onWindowPointerMove = (e) => {
        if (e.pointerId === event.pointerId) {
          handlePointerMove(e);
        }
      };
      const onWindowPointerUp = (e) => {
        if (e.pointerId === event.pointerId) {
          window.removeEventListener("pointermove", onWindowPointerMove);
          window.removeEventListener("pointerup", onWindowPointerUp);
          window.removeEventListener("pointercancel", onWindowPointerUp);
          endDrag(e);
        }
      };
      window.addEventListener("pointermove", onWindowPointerMove, { passive: false });
      window.addEventListener("pointerup", onWindowPointerUp);
      window.addEventListener("pointercancel", onWindowPointerUp);
    },
    [handlePointerMove, endDrag],
  );

  const handleDoubleClick = useCallback(
    (event) => {
      const target = event.target;
      if (
        target.closest(
          "button:not(.lens-head-toggle):not(.focus-card-drag-pill), input, textarea, a, select"
        )
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      resetPosition();
    },
    [resetPosition],
  );

  const handleHandleKeyDown = useCallback(
    (event) => {
      if (event.key === "Home" || event.key === "r" || event.key === "R") {
        event.preventDefault();
        event.stopPropagation();
        resetPosition();
        return;
      }
      const delta = lensKeyboardDelta(event.key, event.shiftKey ? LENS_KEYBOARD_STEP_LARGE : LENS_KEYBOARD_STEP);
      if (!delta) return;
      const card = cardRef.current;
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      const current = targetRef.current ?? { left: rect.left, top: rect.top };
      const next = clampToBounds(
        { left: current.left + delta.x, top: current.top + delta.y },
        { width: rect.width, height: rect.height },
      );
      applyTarget(next);
      persistPosition(next);
    },
    [applyTarget, clampToBounds, persistPosition, resetPosition],
  );

  const handlePromptSubmit = useCallback(
    (event) => {
      event?.preventDefault();
      const value = inputPrompt.trim();
      if (!value || isLoading || !hasPassage) return;
      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
      setInputPrompt("");
      setActiveAction("");
      setIsExpanded(true);
      ask(value, { passage: passageFallback });
    },
    [ask, hasPassage, inputPrompt, isLoading, passageFallback, setIsExpanded],
  );

  const handleQuickAction = useCallback(
    (actionId) => {
      if (isLoading || !hasPassage) return;
      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
      setActiveAction(actionId);
      setInputPrompt("");
      setIsExpanded(true);
      ask("", { action: actionId, passage: passageFallback });
    },
    [ask, hasPassage, isLoading, passageFallback, setIsExpanded],
  );

  const handleCardKeyDown = useCallback(
    (event) => {
      const target = event.target;
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      if (event.key === "Escape") {
        event.stopPropagation();
        if (inputPrompt) {
          setInputPrompt("");
          return;
        }
        if (isExpanded) {
          setIsExpanded(false);
          return;
        }
        setIsHidden(true);
        onClearSelection?.();
        return;
      }
      if (event.key === "Home" || event.key === "r" || event.key === "R" || event.key.startsWith("Arrow")) {
        handleHandleKeyDown(event);
      }
    },
    [handleHandleKeyDown, inputPrompt, isExpanded, onClearSelection, setIsExpanded],
  );

  const handleDismiss = useCallback(() => {
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    if (isHidden) {
      setIsDismissed(true);
      if (isGlobal) {
        useUIStore.getState().setFocusBarOpen(false);
      }
    } else {
      setIsHidden(true);
    }
    onClearSelection?.();
  }, [isHidden, isGlobal, onClearSelection]);

  if (isDismissed && !hasSelection) return null;
  if (!focusedParagraph && !isGlobal) return null;

  const overlayProps = isGlobal
    ? { "data-focus-bar-surface": "global" }
    : { "data-reader-bottom-overlay": true };

  const activePosition = position || (isDragging ? targetRef.current : null);
  const positionStyle = activePosition
    ? {
        left: `${activePosition.left}px`,
        top: `${activePosition.top}px`,
        right: "auto",
        bottom: "auto",
        marginLeft: "0px",
        animation: "none",
      }
    : isHidden
    ? {
        left: "20px",
        top: "auto",
        right: "auto",
        bottom: "calc(20px + var(--safe-bottom))",
        marginLeft: "0px",
        animation: "none",
      }
    : {
        left: "12px",
        top: "calc(var(--safe-top) + 76px)",
        right: "auto",
        bottom: "auto",
        marginLeft: "0px",
        animation: "none",
      };

  if (isHidden) {
    return (
      <div
        ref={cardRef}
        className={`focus-card is-collapsed${isGlobal ? " focus-card--global" : ""}${isDragging ? " is-dragging" : ""}`}
        {...overlayProps}
        aria-label="Reading Lens collapsed"
        style={positionStyle}
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleHandleKeyDown}
        onClick={(event) => {
          if (justDraggedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (event.target.closest(".focus-card-dismiss-btn, .lens-pill-close")) return;
          triggerHaptic(HAPTIC_PATTERNS.LIGHT);
          setIsHidden(false);
        }}
      >
        <button
          type="button"
          className="lens-pill-toggle"
          onPointerDown={startDrag}
          onClick={(event) => {
            if (justDraggedRef.current) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            setIsHidden(false);
          }}
          onKeyDown={handleHandleKeyDown}
          aria-label="Show Reading Lens. Drag to move, or use arrow keys."
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home R"
          title="Drag to move, tap to open, or use arrow keys."
          style={hitAreaStyle({ minWidth: "0", minHeight: "44px" })}
        >
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <span className="lens-pill-text">
            <span className="lens-pill-title">Reading Lens</span>
            <span className="lens-pill-sub">{pinnedId ? "Held" : "Tap to open"}</span>
          </span>
        </button>
        <button
          type="button"
          className="focus-card-dismiss-btn lens-header-btn lens-pill-close"
          onClick={handleDismiss}
          aria-label="Hide Reading Lens"
          title="Hide Reading Lens"
          style={forcedHitAreaStyle()}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`focus-card${isGlobal ? " focus-card--global" : ""}${isExpanded ? " is-chat-expanded" : ""}${isDragging ? " is-dragging" : ""}`}
      {...overlayProps}
      data-lens-state={lensStateAttribute(status)}
      data-lens-dragging={isDragging ? "true" : "false"}
      aria-label="Reading Lens Assistant"
      aria-busy={isLoading}
      style={positionStyle}
      onPointerDown={startDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCardKeyDown}
    >
      {isExpanded ? (
        <span className="focus-card__ambient" aria-hidden="true">
          <FocusBarAmbient />
        </span>
      ) : null}
      <div className="focus-card-header" onPointerDown={startDrag} onDoubleClick={handleDoubleClick}>
        <button
          type="button"
          className="lens-head-toggle"
          onPointerDown={startDrag}
          onClick={(event) => {
            if (justDraggedRef.current) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse Reading Lens" : "Expand Reading Lens"}
          title={isExpanded ? "Collapse" : "Expand"}
          style={hitAreaStyle({ minWidth: "0", minHeight: "44px" })}
        >
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <span className="lens-head-text">
            <span className="lens-head-title">Reading Lens</span>
            <span className="lens-head-sub" id={consentHintId}>
              {isGlobal
                ? "Open a book to ground Lens."
                : hasSelection
                ? `${selectedText.trim().length} chars · on device`
                : "Select text to ask Lens."}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="focus-card-drag-pill lens-drag-handle"
          aria-label="Move Reading Lens panel. Use arrow keys to move, Home or R to reset."
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home R"
          title="Drag to move, or use arrow keys. Home resets the position."
          style={{ touchAction: "none" }}
          onPointerDown={startDrag}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleHandleKeyDown}
        >
          <GripHorizontal size={14} aria-hidden="true" />
        </button>

        <div className="focus-card-header-actions">
          <button
            type="button"
            className="focus-card-icon-btn lens-header-btn"
            onClick={resetPosition}
            aria-label="Reset Reading Lens position"
            title="Reset position (Home)"
            style={forcedHitAreaStyle()}
          >
            <RotateCcw size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="focus-card-dismiss-btn lens-header-btn"
            onClick={handleDismiss}
            aria-label="Hide Reading Lens"
            title="Hide Reading Lens"
            style={forcedHitAreaStyle()}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="focus-card-middle-bar">
        <form onSubmit={handlePromptSubmit} className="focus-card-input-form">
          <button
            type="button"
            className={`lens-consent-toggle lens-consent-dot ${consentGranted ? "is-granted" : ""}`}
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              setConsentGranted(!consentGranted);
            }}
            aria-pressed={consentGranted}
            aria-label={consentGranted ? "Stop sending passages to Lens" : "Allow sending this passage to Lens"}
            aria-describedby={consentHintId}
            title={consentGranted ? "Sending on" : "Local only. Tap to allow sending."}
            style={forcedHitAreaStyle()}
          >
            <ShieldCheck size={14} aria-hidden="true" />
          </button>
          <input
            ref={promptInputRef}
            type="text"
            className="focus-card-prompt-input lens-prompt-input"
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            placeholder={!hasPassage ? "Select text to ask Lens…" : consentGranted ? "Ask about this passage…" : "Local only…"}
            disabled={isLoading || !hasPassage}
            name="reading-lens-prompt"
            autoComplete="off"
            aria-busy={isLoading}
            aria-describedby={`${consentHintId} ${statusId}`}
            aria-label="Ask Reading Lens a question about the passage"
          />
          <button
            type="submit"
            className="focus-card-send-btn lens-send-btn"
            disabled={!inputPrompt.trim() || isLoading}
            aria-label="Send question to Reading Lens"
            title="Send question"
            style={forcedHitAreaStyle()}
          >
            <Send size={13} aria-hidden="true" />
          </button>
        </form>
      </div>

      <div
        className="focus-card-quick-pills lens-quick-actions"
        role="group"
        aria-label="Reading Lens quick actions"
        data-lens-state={lensStateAttribute(status)}
      >
        {LENS_ACTIONS.map((action) => {
          const Icon = ACTION_ICONS[action.icon] || Sparkles;
          const actionStatus = quickActionStatus({
            status,
            activeAction,
            actionId: action.id,
            consentGranted,
          });
          return (
            <button
              key={action.id}
              type="button"
              className="focus-quick-pill lens-quick-action"
              data-lens-action={action.id}
              data-lens-action-status={actionStatus.toLowerCase()}
              onClick={() => handleQuickAction(action.id)}
              disabled={isLoading || !hasPassage}
              aria-label={`${action.label} this passage`}
              title={
                consentGranted
                  ? `${action.label}: sends only this passage`
                  : `${action.label}: local only until you allow sending`
              }
              style={hitAreaStyle({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0px",
              })}
            >
              <span className="lens-quick-action-icon" aria-hidden="true">
                <Icon size={15} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="lens-chapter-scope">
        <button
          type="button"
          className={`lens-chapter-toggle ${includeChapterContext ? "is-on" : ""}`}
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            setIncludeChapterContext(!includeChapterContext);
          }}
          disabled={!canIncludeChapterContext}
          aria-pressed={includeChapterContext}
          aria-describedby={chapterHintId}
          aria-label="Include the current chapter as context"
          title="Include the current chapter as context"
          style={forcedHitAreaStyle()}
        >
          <BookOpen size={14} aria-hidden="true" />
        </button>
        <span className="visually-hidden" id={chapterHintId}>
          {canIncludeChapterContext
            ? "Adds the current chapter text to the request."
            : "Chapter text is not available here, so only the passage can be sent."}
        </span>
      </div>

      <p
        className="lens-status focus-card-lens-status"
        id={statusId}
        role="status"
        aria-live="polite"
        data-lens-status={lensStateAttribute(status)}
      >
        {statusLabel}
        {usedFallback && provider ? ` (fallback: ${provider})` : ""}
        {error ? ` ${error}` : ""}
      </p>

      {isExpanded && (
        <div className="focus-card-chat-space">
          <div className="focus-card-chat-header">
            <span className="focus-card-chat-title lens-chat-title">Conversation</span>
            <div className="lens-chat-actions">
              {isLoading && (
                <button
                  type="button"
                  className="focus-card-chat-clear lens-chat-btn"
                  onClick={cancel}
                  aria-label="Stop the Reading Lens request"
                  title="Stop request"
                  style={hitAreaStyle()}
                >
                  Stop
                </button>
              )}
              {messages.length > 0 && (
                <button
                  type="button"
                  className="focus-card-chat-clear lens-chat-btn"
                  onClick={clear}
                  aria-label="Clear the Reading Lens conversation"
                  title="Clear conversation"
                  style={hitAreaStyle()}
                >
                  <Trash2 size={12} aria-hidden="true" /> Clear
                </button>
              )}
            </div>
          </div>

          <div
            ref={chatScrollRef}
             className="focus-card-chat-messages lens-transcript"
             aria-label="Reading Lens answers"
             aria-live="polite"
             aria-relevant="additions text"
          >
            {messages.length === 0 && !error && (
              <div className="focus-card-empty-state lens-empty-state">
                <Sparkles size={20} aria-hidden="true" />
                <p>
                  {consentGranted
                    ? "Ask a question or pick a quick action to inspect this passage."
                    : "Local only. Allow sending to get an answer, or keep reading offline."}
                </p>
                {hasPassage && (
                  <div className="lens-suggested-chips" role="group" aria-label="Suggested questions">
                    {["Summarize key points", "Explain core concept", "Explore background"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="lens-suggested-chip"
                        onClick={() => {
                          triggerHaptic(HAPTIC_PATTERNS.LIGHT);
                          ask(suggestion, { passage: passageFallback });
                        }}
                        disabled={isLoading}
                        aria-label={`Ask: ${suggestion}`}
                        style={hitAreaStyle({ minHeight: "36px", height: "auto" })}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`focus-chat-bubble lens-message ${message.role === "user" ? "is-user" : "is-assistant"}`}
                data-lens-role={message.role}
                data-lens-local={message.isLocal ? "true" : "false"}
              >
                {message.role === "assistant" && (
                  <span className="lens-message-avatar" aria-hidden="true">
                    <Sparkles size={14} />
                  </span>
                )}
                <div className="focus-chat-bubble-content lens-response-text">
                  {message.text || (message.isStreaming ? "Reading…" : "")}
                </div>
                {message.role === "assistant" && message.text && !message.isStreaming && (
                  <div className="lens-message-actions">
                    <button
                      type="button"
                      className="focus-chat-copy-btn lens-copy-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText?.(message.text);
                        triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
                      }}
                      aria-label="Copy this answer"
                      title="Copy answer"
                      style={hitAreaStyle()}
                    >
                      <Copy size={11} aria-hidden="true" />
                    </button>
                    {toggleFeedback && (
                      <button
                        type="button"
                        className={`lens-feedback-btn ${message.feedback === "positive" ? "is-active" : ""}`}
                        onClick={() => {
                          triggerHaptic(HAPTIC_PATTERNS.LIGHT);
                          toggleFeedback(message.id, "positive");
                        }}
                        aria-label="Helpful answer"
                        title="Helpful"
                        style={hitAreaStyle()}
                      >
                        <ThumbsUp size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
                {message.isError && retryMessage && (
                  <button
                    type="button"
                    className="lens-retry-btn"
                    onClick={() => {
                      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
                      retryMessage(message.id);
                    }}
                    aria-label="Retry reading lens answer"
                    title="Retry"
                    style={hitAreaStyle()}
                  >
                    <RotateCcw size={11} aria-hidden="true" /> Retry
                  </button>
                )}
              </div>
            ))}

            {error && (
              <div className="focus-chat-error lens-error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {!isGlobal && (
        <div className="focus-card-actions">
        <button
          type="button"
          className="focus-card-step"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            moveFocus(-1);
          }}
          aria-label="Previous paragraph"
          title="Previous paragraph"
          style={forcedHitAreaStyle({ flex: "0 0 44px !important", maxWidth: "44px !important" })}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="focus-card-step"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            moveFocus(1);
          }}
          aria-label="Next paragraph"
          title="Next paragraph"
          style={forcedHitAreaStyle({ flex: "0 0 44px !important", maxWidth: "44px !important" })}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="focus-card-primary focus-card-bookmark"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.MEDIUM);
            toggleBookmark();
          }}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? "Remove bookmark for this paragraph" : "Bookmark this paragraph"}
          style={hitAreaStyle()}
        >
          {isBookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
          {isBookmarked ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          className="focus-card-copy"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
            copyFocusedParagraph();
          }}
          aria-label="Copy this paragraph"
          title="Copy paragraph"
          style={hitAreaStyle()}
        >
          <Copy size={14} aria-hidden="true" /> Copy
        </button>
        {selectedText && (
          <button
            type="button"
            className="focus-card-note"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              onAddNoteFromSelection?.(selectedText);
            }}
            aria-label="Add a note from the selected passage"
            title="Note selection"
            style={hitAreaStyle()}
          >
            <MessageSquareText size={14} aria-hidden="true" /> Note
          </button>
        )}
        {pinnedId && (
          <button
            type="button"
            className="focus-card-flow"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              resumeFlow();
            }}
            aria-label="Resume guided reading flow"
            title="Resume flow"
            style={hitAreaStyle()}
          >
            <Check size={14} aria-hidden="true" /> Flow
          </button>
        )}
        </div>
      )}
      </div>
  );
}
