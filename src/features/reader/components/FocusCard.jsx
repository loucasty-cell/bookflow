import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlignLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Focus,
  GripHorizontal,
  Landmark,
  Languages,
  Lightbulb,
  MessageSquare,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
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
  useReadingLens,
} from "../hooks/useReadingLens.js";

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
    minWidth: `${HIT_AREA_PX}px !important`,
    minHeight: `${HIT_AREA_PX}px !important`,
    width: `${HIT_AREA_PX}px !important`,
    height: `${HIT_AREA_PX}px !important`,
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
  boundsRef = null,
  chapterTitle = "",
  chapterText = "",
  onClearSelection,
  onAddNoteFromSelection,
  lensOpenRequest = 0,
  onLensOpened,
}) {
  const [isHidden, setIsHidden] = useState(false);
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
  const consentId = useId();
  const consentHintId = useId();
  const chapterHintId = useId();
  const statusId = useId();

  const focusedId = focusedParagraph?.id;
  const paragraphText = focusedParagraph?.text || "";

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
    askAction,
    cancel,
    clear,
  } = useReadingLens({
    selectedText,
    chapterTitle,
    chapterText,
  });

  const hasSelection = Boolean(selectedText.trim());
  const passageSource = hasSelection ? "Selected passage" : "No selection";
  const hasPassage = Boolean(activePassage);

  useEffect(() => {
    setIsHidden(false);
  }, [focusedId]);

  useEffect(() => {
    if (!isLoading) setActiveAction("");
  }, [isLoading]);

  useEffect(() => {
    if (!lensOpenRequest || lensOpenRequest === handledOpenRequestRef.current) return;
    handledOpenRequestRef.current = lensOpenRequest;
    setIsHidden(false);
    setIsExpanded(true);
    promptInputRef.current?.focus();
    onLensOpened?.();
  }, [lensOpenRequest, onLensOpened, setIsExpanded]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const resolveBounds = useCallback(() => {
    const viewportWidth = window.innerWidth || 0;
    const viewportHeight = window.innerHeight || 0;
    const node = boundsRef?.current ?? null;
    if (node && typeof node.getBoundingClientRect === "function") {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          left: rect.left,
          top: rect.top,
          viewportWidth: rect.width,
          viewportHeight: rect.height,
        };
      }
    }
    return { left: 0, top: 0, viewportWidth, viewportHeight };
  }, [boundsRef]);

  const clampToBounds = useCallback(
    (desired, size) => {
      const bounds = resolveBounds();
      const clamped = clampLensPosition({
        left: desired.left - bounds.left,
        top: desired.top - bounds.top,
        width: size.width,
        height: size.height,
        viewportWidth: bounds.viewportWidth,
        viewportHeight: bounds.viewportHeight,
      });
      return { left: clamped.left + bounds.left, top: clamped.top + bounds.top };
    },
    [resolveBounds],
  );

  const applyTarget = useCallback((next, originRect) => {
    targetRef.current = next;
    const deltaLeft = next.left - originRect.left;
    const deltaTop = next.top - originRect.top;
    setPosition((current) => {
      const base = current ?? { left: 0, top: 0 };
      if (Math.abs(deltaLeft) < 0.5 && Math.abs(deltaTop) < 0.5) return base;
      return { left: base.left + deltaLeft, top: base.top + deltaTop };
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
    applyTarget(next, rect);
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
  }, []);

  const persistPosition = useCallback((next) => {
    const value = serializeLensPosition(next);
    if (!value) return;
    setStorageItem(LENS_POSITION_STORAGE_KEY, value);
  }, []);

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button != null && event.button !== 0) return;
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        pointer: { x: event.clientX, y: event.clientY },
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
      targetRef.current = { left: rect.left, top: rect.top };
      setIsDragging(true);
      event.currentTarget.focus?.();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const next = clampToBounds(
        {
          left: drag.rect.left + (event.clientX - drag.pointer.x),
          top: drag.rect.top + (event.clientY - drag.pointer.y),
        },
        { width: drag.rect.width, height: drag.rect.height },
      );
      applyTarget(next, drag.rect);
    },
    [applyTarget, clampToBounds],
  );

  const endDrag = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
      event?.currentTarget?.releasePointerCapture?.(drag.pointerId);
      dragRef.current = null;
      setIsDragging(false);
      persistPosition(targetRef.current);
    },
    [persistPosition],
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
      applyTarget(next, rect);
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
      ask(value);
    },
    [ask, hasPassage, inputPrompt, isLoading],
  );

  const handleQuickAction = useCallback(
    (actionId) => {
      if (isLoading || !hasPassage) return;
      triggerHaptic(HAPTIC_PATTERNS.LIGHT);
      setActiveAction(actionId);
      setInputPrompt("");
      askAction(actionId);
    },
    [askAction, hasPassage, isLoading],
  );

  const handleCardKeyDown = useCallback(
    (event) => {
      if (event.key !== "Escape") return;
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
    },
    [inputPrompt, isExpanded, onClearSelection, setIsExpanded],
  );

  const handleDismiss = useCallback(() => {
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    setIsHidden(true);
    onClearSelection?.();
  }, [onClearSelection]);

  if (!focusedParagraph) return null;

  if (isHidden) {
    return (
      <section
        className="focus-card is-collapsed"
        data-reader-bottom-overlay
        aria-label="Paragraph in focus"
      >
        <button
          type="button"
          className="focus-card-pill-btn"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            setIsHidden(false);
          }}
          aria-label="Show Reading Lens"
          title="Show Reading Lens"
          style={forcedHitAreaStyle()}
        >
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <Focus size={13} aria-hidden="true" />
          <span>Lens Focus</span>
        </button>
      </section>
    );
  }

  const positionStyle = {
    left: `${position?.left ?? 12}px`,
    top: position?.top == null ? "calc(var(--safe-top) + 76px)" : `${position.top}px`,
    marginLeft: "0px",
    animation: "none",
  };

  return (
    <section
      ref={cardRef}
      className={`focus-card${isExpanded ? " is-chat-expanded" : ""}${isDragging ? " is-dragging" : ""}`}
      data-reader-bottom-overlay
      data-lens-state={lensStateAttribute(status)}
      data-lens-dragging={isDragging ? "true" : "false"}
      aria-label="Reading Lens Assistant"
      aria-busy={isLoading}
      style={positionStyle}
      onKeyDown={handleCardKeyDown}
    >
      <div className="focus-card-header">
        <div className="focus-card-label">
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <Sparkles size={13} aria-hidden="true" />
          <span>Reading Lens</span>
          <small>{pinnedId ? "Held" : "Live"}</small>
        </div>

        <button
          type="button"
          className="focus-card-drag-pill lens-drag-handle"
          aria-label="Move Reading Lens panel. Use arrow keys to move, Home or R to reset."
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home R"
          title="Drag to move, or use arrow keys. Home resets the position."
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
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
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? "Collapse Reading Lens answers" : "Expand Reading Lens answers"}
            aria-expanded={isExpanded}
            title={isExpanded ? "Collapse answers" : "Expand answers"}
            style={forcedHitAreaStyle()}
          >
            {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <MessageSquare size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="focus-card-icon-btn lens-header-btn"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              resetPosition();
            }}
            aria-label="Reset Reading Lens position"
            title="Reset position"
            style={forcedHitAreaStyle()}
          >
            <RotateCcw size={14} aria-hidden="true" />
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

      <figure className="lens-passage-figure">
        <figcaption className="lens-passage-caption">
          {passageSource}
          {hasPassage ? ` · ${activePassage.length} characters` : ""}
        </figcaption>
        {hasPassage ? (
          <blockquote
            className="focus-card-passage-preview lens-passage"
            data-lens-passage={passageSource}
            title={activePassage}
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "7.5em", overflowY: "auto" }}
          >
            {activePassage}
          </blockquote>
        ) : (
          <div className="lens-focus-preview" data-lens-passage="none">
            <span>Focused paragraph stays local until you select text.</span>
            <p>{paragraphText}</p>
          </div>
        )}
      </figure>

      <div className="focus-card-consent lens-consent" data-lens-consent={consentGranted ? "granted" : "local-only"}>
        <input
          id={consentId}
          type="checkbox"
          className="lens-consent-toggle"
          checked={consentGranted}
          onChange={(event) => setConsentGranted(event.target.checked)}
          aria-describedby={consentHintId}
          style={hitAreaStyle({ minWidth: "20px", minHeight: "20px" })}
        />
        <label className="lens-consent-label" htmlFor={consentId}>
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Send passage to Lens</span>
        </label>
        <p className="lens-consent-hint" id={consentHintId}>
          {!hasPassage
            ? "Select text in the reader before sending anything to Reading Lens."
            : consentGranted
            ? `Only the ${passageSource.toLowerCase()} above is sent to your Reading Lens service.`
            : "Local only. Nothing is sent until you allow it."}
        </p>
      </div>

      <div className="focus-card-middle-bar">
        <form onSubmit={handlePromptSubmit} className="focus-card-input-form">
          <input
            ref={promptInputRef}
            type="text"
            className="focus-card-prompt-input lens-prompt-input"
            value={inputPrompt}
            onChange={(event) => setInputPrompt(event.target.value)}
            placeholder={!hasPassage ? "Select text to enable Reading Lens…" : consentGranted ? "Ask about this passage…" : "Local only until you allow sending…"}
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
                gap: "6px",
                whiteSpace: "normal",
              })}
            >
              <span className="lens-quick-action-icon" aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="lens-quick-action-text">
                <span className="lens-quick-action-title">{action.label}</span>
                <span className="lens-quick-action-status" aria-hidden="true">
                  {actionStatus}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="lens-chapter-scope">
        <label className="lens-chapter-label" htmlFor={`${consentId}-chapter`}>
          <input
            id={`${consentId}-chapter`}
            type="checkbox"
            className="lens-chapter-toggle"
            checked={includeChapterContext}
            disabled={!canIncludeChapterContext}
            onChange={(event) => setIncludeChapterContext(event.target.checked)}
            aria-describedby={chapterHintId}
            style={hitAreaStyle({ minWidth: "20px", minHeight: "20px" })}
          />
          <span>Include chapter context</span>
        </label>
        <p className="lens-chapter-hint" id={chapterHintId}>
          {canIncludeChapterContext
            ? "Opt-in only. Adds the current chapter text to the request."
            : "Chapter text is not available here, so only the passage can be sent."}
        </p>
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
                  <button
                    type="button"
                    className="focus-chat-copy-btn lens-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(message.text);
                      triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
                    }}
                    aria-label="Copy this answer"
                    title="Copy answer"
                    style={hitAreaStyle()}
                  >
                    <Copy size={11} aria-hidden="true" />
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
    </section>
  );
}
