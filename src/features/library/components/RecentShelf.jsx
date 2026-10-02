/**
 * RecentShelf: the reader's own books, newest first.
 *
 * Metadata only. Entries carry no document text, and the title is rendered as a
 * React text node so a hostile filename or EPUB title can never execute.
 *
 * Renders nothing at all when the library is empty, so a first-time visitor
 * sees the curated shelf alone.
 */
import React from 'react';
import { BookOpen, FolderSearch } from 'lucide-react';
import { getEntries } from '../lib/libraryStore.js';
import {
  canResume,
  clampProgress,
  formatLastOpened,
  formatProgress,
  selectRecent,
} from '../lib/librarySelectors.js';
import '../library.css';

const DEFAULT_LIMIT = 5;

export function RecentShelf({ entries, limit = DEFAULT_LIMIT, onSelect, onLocateFile, heading = 'Your books' }) {
  const source = Array.isArray(entries) ? entries : getEntries();
  const recent = selectRecent(source, limit);
  if (!recent.length) return null;

  return (
    <section className="recent-shelf" aria-label={heading}>
      <div className="recent-shelf-header">
        <span className="recent-shelf-eyebrow">
          <BookOpen size={14} aria-hidden="true" />
          {heading}
        </span>
      </div>

      <ul className="recent-shelf-list">
        {recent.map((entry) => {
          const resumable = canResume(entry);
          const progressText = formatProgress(entry.progress);
          const relative = formatLastOpened(entry.lastOpenedAt);
          const action = resumable ? 'Resume' : 'Locate file';
          const ActionIcon = resumable ? BookOpen : FolderSearch;

          return (
            <li key={entry.documentId} className="recent-shelf-item">
              <button
                type="button"
                className="recent-shelf-open"
                onClick={() => (resumable ? onSelect?.(entry) : onLocateFile?.(entry))}
                aria-label={`${action} ${entry.title}`}
              >
                <span className="recent-shelf-copy">
                  <span className="recent-shelf-title" title={entry.title}>
                    {entry.title}
                  </span>
                  {relative && <span className="recent-shelf-when">{relative}</span>}
                </span>

                <span
                  className="recent-shelf-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={clampProgress(entry.progress)}
                  aria-label={`${entry.title} progress`}
                >
                  <span className="recent-shelf-progress-fill" style={{ width: progressText }} />
                </span>

                <span className="recent-shelf-action">
                  <ActionIcon size={14} aria-hidden="true" />
                  {action}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
