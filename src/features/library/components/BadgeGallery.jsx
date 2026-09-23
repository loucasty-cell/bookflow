/**
 * BadgeGallery: an opt-in gallery of deterministic reading milestones.
 *
 * Renders nothing when the feature is off or there is no data. Honest progress
 * is shown as a partial ring, never as a locked mystery, and earned badges are
 * announced once. No randomness, no expiry, no loss state.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award } from 'lucide-react';
import { BadgeGlyph } from './BadgeGlyph.jsx';
import '../library.css';
import {
  evaluateAchievements,
  findNewlyEarned,
} from '../lib/achievements.js';
import { getLibraryStats } from '../lib/readingStats.js';
import { triggerHaptic, HAPTIC_PATTERNS } from '../../../shared/lib/index.js';

function ProgressRing({ ratio, earned }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className="badge-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" className="badge-ring-track" strokeWidth="2" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        className="badge-ring-fill"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, ratio))}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
      {earned && <circle cx="32" cy="32" r={r + 2} fill="none" className="badge-ring-earned" strokeWidth="1" />}
    </svg>
  );
}

function BadgeCard({ badge, isNew }) {
  const { title, subtitle, latin, earnedBy, ratio, current, goal, earned, motif, unit } = badge;

  return (
    <li className={`badge-card ${earned ? 'is-earned' : ''} ${isNew ? 'is-new' : ''}`}>
      <div className="badge-medallion" aria-hidden="true">
        <ProgressRing ratio={ratio} earned={earned} />
        <div className="badge-glyph-layer">
          <BadgeGlyph motif={motif} earned={earned} title={title} />
        </div>
        {isNew && <span className="badge-new-dot" aria-label="Newly earned" />}
      </div>
      <div className="badge-copy">
        <span className="badge-latin">{latin}</span>
        <h3 className="badge-title">{title}</h3>
        <p className="badge-subtitle">{subtitle}</p>
        <p className="badge-earned-by">{earnedBy}</p>
        <span className="badge-progress-label">
          {earned
            ? 'Earned'
            : `${current.toLocaleString()} of ${goal.toLocaleString()} ${unit}`}
        </span>
      </div>
    </li>
  );
}

export function BadgeGallery({ enabled = false, stats: statsOverride, awarded = [], onAward }) {
  const [dismissed, setDismissed] = useState(false);

  const stats = useMemo(() => {
    if (statsOverride && typeof statsOverride === 'object') {
      return {
        sessions: 0,
        wordsRead: 0,
        readingSeconds: 0,
        finished: 0,
        notes: 0,
        bookmarks: 0,
        nightSessions: 0,
        books: 0,
        ...statsOverride,
      };
    }
    return getLibraryStats();
  }, [statsOverride]);

  const badges = useMemo(() => evaluateAchievements(stats), [stats]);
  const newlyEarned = useMemo(() => findNewlyEarned(stats, awarded), [stats, awarded]);

  if (!enabled || dismissed) return null;

  const hasAnyProgress = stats.sessions > 0 || stats.wordsRead > 0;
  if (!hasAnyProgress) return null;

  const newIds = new Set(newlyEarned.map((badge) => badge.id));
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <AnimatePresence>
      <motion.section
        className="badge-gallery"
        aria-label="Reading milestones"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <header className="badge-gallery-header">
          <div className="badge-gallery-heading">
            <Award size={15} aria-hidden="true" />
            <div>
              <h2 className="badge-gallery-title">Milestones</h2>
              <p className="badge-gallery-subtitle">
                Earned by reading, never bought. {earnedCount} of {badges.length} reached.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="badge-gallery-dismiss"
            aria-label="Dismiss milestones"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.LIGHT);
              setDismissed(true);
            }}
          >
            <X size={16} />
          </button>
        </header>

        <ul className="badge-gallery-grid">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              isNew={newIds.has(badge.id)}
            />
          ))}
        </ul>

        {newlyEarned.length > 0 && onAward && (
          <button
            type="button"
            className="badge-gallery-award"
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.SUCCESS);
              onAward(newlyEarned.map((badge) => badge.id));
            }}
          >
            Keep {newlyEarned.length === 1 ? 'this milestone' : `these ${newlyEarned.length} milestones`}
          </button>
        )}
      </motion.section>
    </AnimatePresence>
  );
}