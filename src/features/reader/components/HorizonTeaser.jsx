import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Zeigarnik Curiosity Horizon Teaser.
 * Renders at the bottom of a chapter to smoothly bridge the reader into the next chapter,
 * reducing the drop-off rate between chapter transitions.
 */
export function HorizonTeaser({ nextChapter, onJumpToNext, estimatedMinutes = 3 }) {
  if (!nextChapter) return null;

  // Extract first opening sentence as an intrigue hook
  const firstParagraph = nextChapter.paragraphs?.[0] || "";
  const firstSentence = firstParagraph.split(/[.!?…]["'’”)]?\s+/)[0] || "";

  return (
    <aside className="horizon-teaser" aria-label="Upcoming chapter preview">
      <div className="horizon-badge">
        <Sparkles size={13} />
        <span>Next Chapter • ~{estimatedMinutes} min read</span>
      </div>
      <h3 className="horizon-title">{nextChapter.title}</h3>
      {firstSentence && (
        <p className="horizon-hook">
          &ldquo;{firstSentence}...&rdquo;
        </p>
      )}
      <button
        type="button"
        className="horizon-action-btn btn-3d-tactile"
        onClick={onJumpToNext}
      >
        <span>Continue to {nextChapter.title}</span>
        <ArrowRight size={15} />
      </button>
    </aside>
  );
}
