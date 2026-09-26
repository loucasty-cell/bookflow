import React from "react";
import { BookOpen, LibraryBig, Target } from "lucide-react";
import { WidgetFrame, WidgetMeter, WidgetRing } from "./WidgetFrame.jsx";

export function RingsWidget({ rings = [], size = "small", surface = "dark", gradient, accent, title, meta }) {
  return (
    <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title={title} meta={meta}>
      <div className="widget-rings">
        {rings.map((ring) => (
          <WidgetRing
            key={ring.id}
            ratio={ring.ratio}
            size={size === "small" ? 42 : 60}
            label={ring.label}
            accent={ring.accent}
          />
        ))}
      </div>
    </WidgetFrame>
  );
}

export function StatWidget({ value, caption, size = "small", surface = "dark", gradient, accent, title, meta }) {
  return (
    <WidgetFrame
      size={size}
      surface={surface}
      gradient={gradient}
      accent={accent}
      title={title}
      meta={meta}
      value={value}
      caption={caption}
    />
  );
}

export function GoalWidget({ goal, size = "small", surface = "dark", gradient, accent, title, meta }) {
  if (!goal?.enabled) {
    return (
      <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title={title} meta={meta}>
        <div className="widget-empty">
          <span className="widget-empty__glyph" aria-hidden="true">
            <Target size={18} strokeWidth={1.75} />
          </span>
          <p className="widget-frame__caption">Annual goal is off</p>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title={title} meta={meta}>
      <div className="widget-rings">
        <WidgetRing ratio={goal.ratio} size={size === "small" ? 72 : 84} label={`${goal.percent}%`} />
      </div>
      <WidgetMeter ratio={goal.ratio} />
      <p className="widget-frame__caption">
        {goal.booksFinished} of {goal.target} books in {goal.year}
      </p>
    </WidgetFrame>
  );
}

export function ContinueWidget({ entry, onResume, size = "medium", surface = "dark", gradient, accent }) {
  if (!entry) {
    return (
      <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title="Continue">
        <div className="widget-empty">
          <span className="widget-empty__glyph" aria-hidden="true">
            <BookOpen size={18} strokeWidth={1.75} />
          </span>
          <p className="widget-frame__caption">Nothing in progress. Open a book to begin.</p>
        </div>
      </WidgetFrame>
    );
  }

  const chapter =
    entry.totalChapters > 1
      ? `Chapter ${Math.min(entry.activeChapter + 1, entry.totalChapters)} of ${entry.totalChapters}`
      : null;

  return (
    <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title="Continue" meta={chapter ?? entry.kind}>
      <p className="widget-frame__value">{entry.title}</p>
      <p className="widget-frame__caption">{entry.author || "Unknown author"}</p>
      <WidgetMeter ratio={entry.progress / 100} />
      <p className="widget-frame__caption">{entry.progress}% read</p>
      {onResume ? (
        <button type="button" className="widget-resume" onClick={() => onResume(entry)}>
          Resume
        </button>
      ) : null}
    </WidgetFrame>
  );
}

export function ListWidget({ rows = [], size = "large", surface = "dark", gradient, accent, title, meta, emptyLabel = "Nothing here yet" }) {
  return (
    <WidgetFrame size={size} surface={surface} gradient={gradient} accent={accent} title={title} meta={meta}>
      {rows.length === 0 ? (
        <div className="widget-empty">
          <span className="widget-empty__glyph" aria-hidden="true">
            <LibraryBig size={18} strokeWidth={1.75} />
          </span>
          <p className="widget-frame__caption">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="widget-list">
          {rows.map((row) => (
            <li className="widget-list__row" key={row.id}>
              <span className="widget-list__dot" style={{ background: row.accent ?? undefined }} aria-hidden="true" />
              <span className={row.muted ? "widget-list__text widget-list__text--muted" : "widget-list__text"}>
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
}
