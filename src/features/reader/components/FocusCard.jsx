import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Focus,
} from "lucide-react";
import { triggerHaptic, HAPTIC_PATTERNS } from "../../../shared/lib/index.js";
import "./resonance.css";

export function FocusCard({
  focusedParagraph,
  pinnedId,
  isBookmarked,
  toggleBookmark,
  copyFocusedParagraph,
  moveFocus,
  resumeFlow,
}) {
  if (!focusedParagraph) return null;

  return (
    <section
      className="focus-card"
      data-reader-bottom-overlay
      aria-label="Paragraph in focus"
    >
      <div className="focus-card-label">
        <Focus size={14} />
        <span>{pinnedId ? "Held in focus" : "In focus"}</span>
        <small>{pinnedId ? "Paused" : "Live"}</small>
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
        <button
          className="resonance-indicator"
          title="2 thoughtful reflections from the community"
          onClick={() => triggerHaptic(HAPTIC_PATTERNS.SELECTION)}
        >
          <span className="resonance-dot"></span>
          Resonance
        </button>
      </div>
    </section>
  );
}
