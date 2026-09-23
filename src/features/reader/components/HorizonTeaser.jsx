import { BookOpen, ArrowRight } from "lucide-react";
import { wordCount } from "../../../shared/lib/index.js";

export function HorizonTeaser({ nextChapter, onJumpToNext, estimatedMinutes = null }) {
  if (!nextChapter) return null;

  const rawParagraph =
    nextChapter.paragraphs?.[0] ??
    nextChapter.sections?.[0]?.paragraphs?.[0];
  const firstParagraphText =
    typeof rawParagraph === "string"
      ? rawParagraph
      : (typeof rawParagraph?.text === "string" ? rawParagraph.text : "");
  const rawSentence = firstParagraphText
    ? firstParagraphText.split(/[.!?…]["'’”)]?\s+/)[0]?.trim() || ""
    : "";
  const firstSentence = rawSentence.length > 140 ? `${rawSentence.slice(0, 140).trimEnd()}…` : rawSentence;
  // TODO(backlog-8 follow-up): prefer the live readingSpeed estimate over the
  // fixed 230 WPM divisor once the session has enough samples; keep 230 as the
  // fallback so the number stays derived, never fabricated.
  const minutes = estimatedMinutes ?? Math.max(1, Math.ceil(
    wordCount((nextChapter.paragraphs ?? []).map((p) => (typeof p === "string" ? p : p?.text ?? "")).join(" ")) / 230,
  ));

  return (
    <aside className="horizon-teaser" aria-label="Upcoming chapter preview">
      <div className="horizon-badge">
        <BookOpen size={13} />
        <span>Next chapter • ~{minutes} min read</span>
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
