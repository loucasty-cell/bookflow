import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Focus,
  GripHorizontal,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";
import { useReadingLens } from "../hooks/useReadingLens.js";

export function FocusCard({
  focusedParagraph,
  pinnedId,
  isBookmarked,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  resumeFlow,
  selectedText = "",
}) {
  const [isHidden, setIsHidden] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const cardRef = useRef(null);
  const chatScrollRef = useRef(null);

  const focusedId = focusedParagraph?.id;
  const paragraphText = focusedParagraph?.text || "";

  const {
    messages,
    isLoading,
    error,
    isExpanded,
    setIsExpanded,
    askLens,
    clearMessages,
  } = useReadingLens({
    currentParagraphText: paragraphText,
    selectedText,
  });

  useEffect(() => {
    setIsHidden(false);
  }, [focusedId]);

  // Scroll to bottom of chat when new message or chunk arrives
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Dragging logic
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  }, [position]);

  const handleTouchStart = useCallback((e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) {
      return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      
      const newX = dragStartRef.current.posX + dx;
      const newY = dragStartRef.current.posY + dy;

      // Smart boundary clamping relative to window
      const maxOffset = Math.min(window.innerWidth / 2 - 120, 400);
      const minOffset = -maxOffset;
      const maxYOffset = window.innerHeight - 150;
      const minYOffset = -30;

      setPosition({
        x: Math.max(minOffset, Math.min(maxOffset, newX)),
        y: Math.max(minYOffset, Math.min(maxYOffset, newY)),
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;

      const newX = dragStartRef.current.posX + dx;
      const newY = dragStartRef.current.posY + dy;

      const maxOffset = Math.min(window.innerWidth / 2 - 100, 300);
      const minOffset = -maxOffset;
      const maxYOffset = window.innerHeight - 150;
      const minYOffset = -30;

      setPosition({
        x: Math.max(minOffset, Math.min(maxOffset, newX)),
        y: Math.max(minYOffset, Math.min(maxYOffset, newY)),
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const handlePromptSubmit = (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    askLens(inputPrompt);
    setInputPrompt("");
  };

  const handleQuickAction = (action) => {
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    askLens("", { action });
  };

  if (!focusedParagraph) return null;

  if (isHidden) {
    return (
      <section
        className="focus-card is-collapsed"
        data-reader-bottom-overlay
        aria-label="Paragraph in focus"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <button
          type="button"
          className="focus-card-pill-btn"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.LIGHT);
            setIsHidden(false);
          }}
          aria-label="Show focus card"
          title="Show focus card"
        >
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <Focus size={13} />
          <span>Lens Focus</span>
        </button>
      </section>
    );
  }

  const transformStyle = {
    transform: `translate(${position.x}px, ${position.y}px)`,
  };

  return (
    <section
      ref={cardRef}
      className={`focus-card ${isExpanded ? "is-chat-expanded" : ""} ${isDragging ? "is-dragging" : ""}`}
      data-reader-bottom-overlay
      aria-label="Reading Lens Assistant"
      style={transformStyle}
    >
      {/* Top Header & Drag Handle */}
      <div
        className="focus-card-header"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="focus-card-label">
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <Sparkles size={13} className="text-amber-400" />
          <span className="font-semibold">Reading Lens</span>
          <small>{pinnedId ? "Held" : "Live"}</small>
          {selectedText && (
            <span className="focus-selection-tag" title={selectedText}>
              Selection
            </span>
          )}
        </div>

        <div className="focus-card-drag-pill" title="Drag to move across screen">
          <GripHorizontal size={14} />
        </div>

        <div className="focus-card-header-actions">
          <button
            type="button"
            className="focus-card-icon-btn"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
            title={isExpanded ? "Collapse chat" : "Expand chat"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <MessageSquare size={14} />}
          </button>
          <button
            type="button"
            className="focus-card-dismiss-btn"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              setIsHidden(true);
            }}
            aria-label="Hide focus card"
            title="Hide focus card"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Paragraph snippet preview */}
      <p className="focus-card-passage-preview">
        {selectedText ? `“${selectedText.slice(0, 120)}${selectedText.length > 120 ? "…" : ""}”` : paragraphText}
      </p>

      {/* Middle Textbar / Input Bar */}
      <div className="focus-card-middle-bar">
        <form onSubmit={handlePromptSubmit} className="focus-card-input-form">
          <input
            type="text"
            className="focus-card-prompt-input"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Lens about this passage, summarize, translate..."
            disabled={isLoading}
            aria-label="Ask Lens a question about passage"
          />
          <button
            type="submit"
            className="focus-card-send-btn"
            disabled={!inputPrompt.trim() || isLoading}
            aria-label="Send question to AI assistant"
            title="Send question"
          >
            <Send size={13} />
          </button>
        </form>
      </div>

      {/* Quick Action Pills */}
      <div className="focus-card-quick-pills">
        <button
          type="button"
          className="focus-quick-pill"
          onClick={() => handleQuickAction("summarize")}
          disabled={isLoading}
        >
          Summarize
        </button>
        <button
          type="button"
          className="focus-quick-pill"
          onClick={() => handleQuickAction("explain")}
          disabled={isLoading}
        >
          Explain
        </button>
        <button
          type="button"
          className="focus-quick-pill"
          onClick={() => handleQuickAction("translate")}
          disabled={isLoading}
        >
          Translate
        </button>
        <button
          type="button"
          className="focus-quick-pill"
          onClick={() => handleQuickAction("trivia")}
          disabled={isLoading}
        >
          Trivia
        </button>
      </div>

      {/* Expandable Chat Box Space */}
      {isExpanded && (
        <div className="focus-card-chat-space">
          <div className="focus-card-chat-header">
            <span className="text-xs font-medium text-slate-300">Conversation</span>
            {messages.length > 0 && (
              <button
                type="button"
                className="focus-card-chat-clear"
                onClick={clearMessages}
                title="Clear conversation"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          <div ref={chatScrollRef} className="focus-card-chat-messages">
            {messages.length === 0 && !error && (
              <div className="focus-card-empty-state">
                <Sparkles size={20} className="text-amber-400 opacity-80" />
                <p>Ask a question or click a quick action pill above to inspect this passage.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`focus-chat-bubble ${msg.role === "user" ? "is-user" : "is-assistant"}`}
              >
                <div className="focus-chat-bubble-content">
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert">
                      {msg.text || (msg.isStreaming ? "Thinking..." : "")}
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
                {msg.role === "assistant" && msg.text && (
                  <button
                    type="button"
                    className="focus-chat-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
                    }}
                    title="Copy response"
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="focus-chat-loading-indicator">
                <span className="pulse-dot" />
                <span className="pulse-dot" />
                <span className="pulse-dot" />
              </div>
            )}

            {error && (
              <div className="focus-chat-error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standard Reader Navigation & Bookmark Actions */}
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
        >
          <ChevronLeft size={16} />
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
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="focus-card-primary"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.MEDIUM);
            toggleBookmark();
          }}
          aria-pressed={isBookmarked}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {isBookmarked ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
            copyFocusedParagraph();
          }}
        >
          <Copy size={14} /> Copy
        </button>
        {pinnedId && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              resumeFlow();
            }}
          >
            <Check size={14} /> Flow
          </button>
        )}
      </div>
    </section>
  );
}
