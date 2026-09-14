import { BookOpen, ArrowRight } from "lucide-react";

export function HorizonTeaser({ nextChapter, onJumpToNext, estimatedMinutes = 3 }) {
  if (!nextChapter) return null;

  // Extract first opening sentence as a preview
  const rawParagraph =
    nextChapter.paragraphs?.[0] ??
    nextChapter.sections?.[0]?.paragraphs?.[0];
  const firstParagraphText =
    typeof rawParagraph === "string"
      ? rawParagraph
      : (typeof rawParagraph?.text === "string" ? rawParagraph.text : "");
  const firstSentence = firstParagraphText
    ? firstParagraphText.split(/[.!?…]["'’”)]?\s+/)[0]?.trim() || ""
    : "";

  return (
    <aside className="horizon-teaser" aria-label="Upcoming chapter preview">
      <div className="horizon-badge">
        <BookOpen size={13} />
        <span>Next chapter • ~{estimatedMinutes} min read</span>
      </div>
      <h3 className="horizon-title">{nextChapter.title}</h3>
      {firstSentence && (
        <p className="horizon-hook">
          &ldquo;{firstSentence}...&rdquo;
        </p>
      )}
      <button
        type="button"
        className="horizon-action-btn"
        onClick={onJumpToNext}
      >
        <span>Continue to {nextChapter.title}</span>
        <ArrowRight size={15} />
      </button>
    </aside>
  );
}
