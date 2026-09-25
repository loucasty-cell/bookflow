/**
 * ResumeCard: returns the reader to the exact paragraph they left.
 *
 * Renders nothing when there is no honest in-progress book to resume.
 * If the source file is unavailable it says so and offers re-selection,
 * never failing silently.
 */
import { useState } from 'react';
import { BookOpen, ArrowRight, RotateCcw, X } from 'lucide-react';
import { getResumeEntry } from '../lib/libraryStore.js';
import '../library.css';

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.max(0, (Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return 'a while ago';
}

export function ResumeCard({ entry: entryOverride, onResume, onReopen, onDismiss, compact = false }) {
  const [dismissed, setDismissed] = useState(false);
  const entry = entryOverride !== undefined ? entryOverride : getResumeEntry();

  if (dismissed || !entry || !(entry.progress > 0)) return null;

  const clampedChapter = Math.min(Math.max(0, entry.activeChapter), Math.max(0, entry.totalChapters - 1));
  const safeProgress = Math.min(100, Math.max(0, Math.round(entry.progress)));
  const chapterLabel = entry.totalChapters > 1
    ? `Ch. ${clampedChapter + 1}/${entry.totalChapters}`
    : null;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    onDismiss?.(entry);
  };

  return (
    <section
      className={`resume-card notification-bar-card ${compact ? 'is-compact' : ''}`}
      aria-label="Resume reading notification"
    >
      <div className="resume-card-art" aria-hidden="true">
        <BookOpen size={16} />
      </div>

      <div className="resume-card-copy">
        <div className="resume-card-header-line">
          <span className="resume-card-eyebrow">
            <RotateCcw size={10} aria-hidden="true" />
            Pick up where you left off
          </span>
          <span className="resume-card-chip">{safeProgress}% done</span>
        </div>
        <div className="resume-card-body-line">
          <h3 className="resume-card-title">{entry.title}</h3>
          <div className="resume-card-meta">
            {chapterLabel && <span className="resume-meta-item">{chapterLabel}</span>}
            <span className="resume-meta-item">{formatRelative(entry.lastOpenedAt)}</span>
          </div>
        </div>
        <div
          className="resume-card-progress"
          role="progressbar"
          aria-valuenow={safeProgress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`${entry.title} progress`}
        >
          <span className="resume-card-progress-fill" style={{ width: `${safeProgress}%` }} />
        </div>
      </div>

      <div className="resume-card-actions">
        {onResume && (
          <button
            type="button"
            className="resume-card-primary"
            onClick={() => onResume(entry)}
            title="Resume reading"
          >
            <span>Resume</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
        {onReopen && !onResume && (
          <button
            type="button"
            className="resume-card-secondary"
            onClick={() => onReopen(entry)}
            title="Re-open file"
          >
            <span>Resume</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="resume-card-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          title="Dismiss notification"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}