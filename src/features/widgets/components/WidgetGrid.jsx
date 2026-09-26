import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLibraryStats,
  getGoalProgress,
  getResumeEntry,
  getEntries,
  evaluateAchievements,
} from "../../library/index.js";
import { WIDGET_SURFACES } from "../lib/tokens.js";
import {
  ContinueWidget,
  GoalWidget,
  ListWidget,
  RingsWidget,
  StatWidget,
} from "./BookflowWidgets.jsx";

const RING_MOTIFS = ["move", "focus", "streak", "night", "calm"];

function readAll() {
  const stats = getLibraryStats();
  return {
    stats,
    goal: getGoalProgress({ booksFinished: stats.finished }),
    resume: getResumeEntry(),
    entries: getEntries(),
    badges: evaluateAchievements(stats),
  };
}

export function WidgetGridSkeleton() {
  return (
    <div className="widget-grid" aria-hidden="true">
      <div className="widget-skeleton" style={{ aspectRatio: "155 / 155" }} />
      <div className="widget-skeleton" style={{ aspectRatio: "155 / 155" }} />
      <div className="widget-skeleton" style={{ aspectRatio: "155 / 155" }} />
      <div className="widget-skeleton" style={{ aspectRatio: "155 / 155" }} />
      <div className="widget-skeleton" style={{ aspectRatio: "329 / 155", gridColumn: "1 / -1" }} />
      <div className="widget-skeleton" style={{ aspectRatio: "329 / 345", gridColumn: "1 / -1" }} />
    </div>
  );
}

export function WidgetGrid({ onResume }) {
  const [snapshot, setSnapshot] = useState(readAll);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setSnapshot(readAll());
    window.addEventListener("bookflow:library-change", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("bookflow:library-change", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const { stats, goal, resume, entries, badges } = snapshot;

  const rings = useMemo(
    () =>
      badges
        .filter((badge) => badge.ratio > 0 && badge.ratio < 1)
        .slice(0, 3)
        .map((badge, index) => ({
          id: badge.id,
          ratio: badge.ratio,
          label: `${Math.round(badge.ratio * 100)}%`,
          accent: RING_MOTIFS[index % RING_MOTIFS.length],
        })),
    [badges],
  );

  const shelfRows = useMemo(
    () => [
      { id: "reading", label: `${stats.shelves.reading} reading` },
      { id: "finished", label: `${stats.shelves.finished} finished` },
      { id: "to-read", label: `${stats.shelves['to-read']} to read`, muted: true },
    ],
    [stats.shelves],
  );

  const topBooks = useMemo(
    () =>
      entries.slice(0, 4).map((entry) => ({
        id: entry.documentId,
        label: entry.title,
        muted: entry.shelf !== "reading",
      })),
    [entries],
  );

  const handleResume = useCallback(
    (entry) => {
      if (typeof onResume === "function") onResume(entry);
    },
    [onResume],
  );

  return (
    <div className="widget-grid">
      {rings.length > 0 ? (
        <RingsWidget
          size="small"
          surface="dark"
          title="In progress"
          meta={`${badges.length - rings.length} earned`}
          rings={rings}
        />
      ) : (
        <StatWidget
          size="small"
          surface="dark"
          title="Sessions"
          value={stats.formatted.sessions}
          caption="Read a paragraph to start earning rings."
        />
      )}

      <StatWidget
        size="small"
        surface="dark"
        title="Time reading"
        value={stats.formatted.timeReading}
        caption={`${stats.formatted.wordsRead} words across ${stats.formatted.books} books`}
      />

      <GoalWidget
        size="small"
        gradient={WIDGET_SURFACES.todoistRed}
        accent={WIDGET_SURFACES.amber}
        title="Annual goal"
        meta={goal.enabled ? String(goal.year) : "off"}
        goal={goal}
      />

      <StatWidget
        size="small"
        gradient={WIDGET_SURFACES.today}
        title="Notes"
        value={stats.formatted.notes}
        caption={`${stats.formatted.bookmarks} bookmarks, ${stats.formatted.nightSessions} night sessions`}
      />

      <ContinueWidget
        size="medium"
        gradient={WIDGET_SURFACES.blue}
        entry={resume}
        onResume={handleResume}
      />

      <ListWidget size="medium" surface="paper" title="Shelves" rows={shelfRows} />

      <ListWidget
        size="large"
        surface="dark"
        title="Library"
        meta={`${entries.length} total`}
        rows={topBooks}
        emptyLabel="No books in your library yet."
      />
    </div>
  );
}
