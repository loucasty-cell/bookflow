/**
 * ResumeCard: returns the reader to the exact paragraph they left.
 *
 * Renders nothing when there is no honest in-progress book to resume.
 * If the source file is unavailable it says so and offers re-selection,
 * never failing silently.
 */
import { BookOpen, ArrowRight, RotateCcw } from 'lucide-react';
import { getResumeEntry } from '../lib/libraryStore.js';
import '../library.css';

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.max(0, (Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return 'a while ago';
}

export function ResumeCard({ entry: entryOverride, onResume, onReopen, compact = false }) {
  const entry = entryOverride !== undefined ? entryOverride : getResumeEntry();

  if (!entry || !(entry.progress > 0)) return null;

  const clampedChapter = Math.min(Math.max(0, entry.activeChapter), Math.max(0, entry.totalChapters - 1));
  const safeProgress = Math.min(100, Math.max(0, Math.round(entry.progress)));
  const chapterLabel = entry.totalChapters > 1
    ? `Chapter ${clampedChapter + 1} of ${entry.totalChapters}`
    : null;

  return (
    <section className={`resume-card ${compact ? 'is-compact' : ''}`} aria-label="Resume reading">
      <div className="resume-card-art" aria-hidden="true">
        <BookOpen size={compact ? 18 : 24} />
      </div>

      <div className="resume-card-copy">
        <span className="resume-card-eyebrow">
          <RotateCcw size={11} aria-hidden="true" />
          Continue reading
        </span>
        <h3 className="resume-card-title">{entry.title}</h3>
        <div className="resume-card-meta">
          {chapterLabel && <span>{chapterLabel}</span>}
          <span>{safeProgress}% read</span>
          <span>{formatRelative(entry.lastOpenedAt)}</span>
        </div>
        <div className="resume-card-progress" role="progressbar" aria-valuenow={safeProgress} aria-valuemin="0" aria-valuemax="100" aria-label={`${entry.title} progress`}>
          <span className="resume-card-progress-fill" style={{ width: `${safeProgress}%` }} />
        </div>
      </div>

      <div className="resume-card-actions">
        {onResume && (
          <button type="button" className="resume-card-primary" onClick={() => onResume(entry)}>
            <span>Resume</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
        {onReopen && (
          <button type="button" className="resume-card-secondary" onClick={() => onReopen(entry)}>
            Re-select file
          </button>
        )}
      </div>
    </section>
  );
}