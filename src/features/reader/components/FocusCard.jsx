import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Focus,
  X,
} from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";

export function FocusCard({
  focusedParagraph,
  pinnedId,
  isBookmarked,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  resumeFlow,
}) {
  const [isHidden, setIsHidden] = useState(false);

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
          aria-label="Show focus card"
          title="Show focus card"
        >
          <span
            className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
            aria-hidden="true"
          />
          <Focus size={13} />
          <span>Focus</span>
        </button>
      </section>
    );
  }

  return (
    <section
      className="focus-card"
      data-reader-bottom-overlay
      aria-label="Paragraph in focus"
    >
      <div className="focus-card-label">
        <span
          className={`focus-status-indicator ${pinnedId ? "is-paused" : "is-live"}`}
          aria-hidden="true"
        />
        <Focus size={13} />
        <span>{pinnedId ? "Held in focus" : "In focus"}</span>
        <small>{pinnedId ? "Paused" : "Live"}</small>
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
      <p>{focusedParagraph.text}</p>
      <div className="focus-card-actions">
        <button
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
          className="focus-card-primary"
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.MEDIUM);
            toggleBookmark();
          }}
          aria-pressed={isBookmarked}
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {isBookmarked ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
            copyFocusedParagraph();
          }}
        >
          <Copy size={16} /> Copy
        </button>
        {pinnedId && (
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              resumeFlow();
            }}
          >
            <Check size={16} /> Resume flow
          </button>
        )}
      </div>
    </section>
  );
}
