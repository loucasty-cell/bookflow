/**
 * SessionRecap: a quiet close-of-session summary.
 *
 * Shown only when the session passed a meaningful threshold. Every number is
 * derived from real activity, never inflated, and a single dismiss closes it.
 * No share nag, no rating request, no notification opt-in.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Clock, FileText, Bookmark } from 'lucide-react';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../../shared/lib/index.js';
import { formatMinutes } from '../lib/readingStats.js';
import '../library.css';

export const MIN_WORDS_FOR_RECAP = 80;

function Sparkline({ points }) {
  const clean = Array.isArray(points) ? points.filter((value) => Number.isFinite(value) && value >= 0) : [];
  if (clean.length < 2) return null;
  const max = Math.max(...clean, 1);
  const width = 100;
  const height = 28;
  const step = width / (clean.length - 1);
  const path = clean
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${(index * step).toFixed(1)} ${(height - (value / max) * (height - 4) - 2).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="session-recap-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <li className="session-recap-stat">
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      <div>
        <span className="session-recap-stat-value">{value}</span>
        <span className="session-recap-stat-label">{label}</span>
      </div>
    </li>
  );
}

export function SessionRecap({ session, onClose }) {
  const dismissRef = useRef(null);
  const handleClose = () => {
    triggerHaptic(HAPTIC_PATTERNS.LIGHT);
    onClose?.();
  };

  useEffect(() => {
    if (!session) return undefined;
    dismissRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        triggerHaptic(HAPTIC_PATTERNS.LIGHT);
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [session, onClose]);

  if (!session) return null;

  const {
    bookTitle,
    wordsRead = 0,
    activeMs = 0,
    notesAdded = 0,
    bookmarksAdded = 0,
    paceSamples = [],
  } = session;

  if (wordsRead < MIN_WORDS_FOR_RECAP) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="session-recap-backdrop"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.section
          className="session-recap"
          role="dialog"
          aria-modal="true"
          aria-label="Reading session summary"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="session-recap-close" aria-label="Close summary" onClick={handleClose}>
            <X size={16} />
          </button>

          <span className="session-recap-eyebrow">Session complete</span>
          <h2 className="session-recap-title">{bookTitle}</h2>

          {paceSamples.length > 1 && <Sparkline points={paceSamples} />}

          <ul className="session-recap-grid">
            <Stat icon={BookOpen} label="words read" value={wordsRead.toLocaleString()} />
            <Stat icon={Clock} label="time in flow" value={formatMinutes(activeMs / 60000)} />
            {notesAdded > 0 && <Stat icon={FileText} label="notes" value={notesAdded} />}
            {bookmarksAdded > 0 && <Stat icon={Bookmark} label="bookmarks" value={bookmarksAdded} />}
          </ul>

          <button ref={dismissRef} type="button" className="session-recap-dismiss" onClick={handleClose}>
            Return to the shelf
          </button>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}