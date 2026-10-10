/**
 * ResumeCard: returns the reader to the exact paragraph they left.
 *
 * Renders nothing when there is no honest in-progress book to resume.
 * Bookflow stores metadata only, never the document, so when the source file
 * is unavailable it says so plainly and offers re-selection instead of
 * failing silently or pretending the book is still loaded.
 */
import React, { useState } from 'react';
import { BookOpen, ArrowRight, FolderSearch, RotateCcw, X } from 'lucide-react';
import { getResumeEntry } from '../lib/libraryStore.js';
import {
  canResume,
  clampProgress,
  describeSource,
  formatLastOpened,
  formatProgress,
} from '../lib/librarySelectors.js';
import '../library.css';

export function ResumeCard({ entry: entryOverride, onResume, onReopen, onDismiss, compact = false }) {
  const [dismissed, setDismissed] = useState(false);
  const entry = entryOverride !== undefined ? entryOverride : getResumeEntry();

  if (dismissed || !entry || !(entry.progress > 0)) return null;

  const clampedChapter = Math.min(Math.max(0, entry.activeChapter), Math.max(0, entry.totalChapters - 1));
  const safeProgress = clampProgress(entry.progress);
  const chapterLabel = entry.totalChapters > 1
    ? `Ch. ${clampedChapter + 1}/${entry.totalChapters}`
    : null;
  const relative = formatLastOpened(entry.lastOpenedAt);
  const source = describeSource(entry);
  const resumable = canResume(entry);

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
          <span className="resume-card-chip">{formatProgress(safeProgress)} done</span>
        </div>
        <div className="resume-card-body-line">
          <h3 className="resume-card-title" title={entry.title}>{entry.title}</h3>
          <div className="resume-card-meta">
            {chapterLabel && <span className="resume-meta-item">{chapterLabel}</span>}
            {relative && <span className="resume-meta-item">{relative}</span>}
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
          <span className="resume-card-progress-fill" style={{ width: formatProgress(safeProgress) }} />
        </div>
        {source === 'missing' && (
          <p className="resume-card-note">
            Bookflow kept your progress, not the file. Choose the same file to continue.
          </p>
        )}
      </div>

      <div className="resume-card-actions">
        {resumable && onResume && (
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
        {source === 'missing' && onReopen && (
          <button
            type="button"
            className="resume-card-secondary"
            onClick={() => onReopen(entry)}
            title="Choose the file again to continue"
          >
            <FolderSearch size={13} aria-hidden="true" />
            <span>Locate file</span>
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
