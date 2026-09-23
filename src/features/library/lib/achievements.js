/**
 * achievements: deterministic reading milestones.
 *
 * Every badge is earned from measured activity only. There is no randomness,
 * no variable-ratio reward, no purchase, no expiry, and no loss state.
 * Badges are opt-in and off by default; nothing here ever blocks reading.
 */
export const MOTIFS = {
  VITRUVIAN: 'vitruvian',
  CODEX: 'codex',
  ORBIT: 'orbit',
  QUILL: 'quill',
  LAMP: 'lamp',
  BRIDGE: 'bridge',
  COMPASS: 'compass',
  VESSEL: 'vessel',
  SPIRAL: 'spiral',
  LAUREL: 'laurel',
  HOURGLASS: 'hourglass',
  EYE: 'eye',
};

/**
 * Each badge declares exactly how it is earned. `progress` returns 0 to 1
 * so the gallery can show honest partial progress rather than a locked mystery.
 */
export const BADGES = [
  {
    id: 'first-page',
    motif: MOTIFS.QUILL,
    title: 'The First Page',
    subtitle: 'A book was opened',
    latin: 'Initium',
    earnedBy: 'Opening any document',
    goal: 1,
    progress: (stats) => Math.min(stats.sessions, 1),
  },
  {
    id: 'sustained-hour',
    motif: MOTIFS.HOURGLASS,
    title: 'The Sustained Hour',
    subtitle: 'One hour of real reading',
    latin: 'Hora Continua',
    earnedBy: 'Reading for a cumulative hour',
    goal: 3600,
    unit: 'seconds',
    progress: (stats) => stats.readingSeconds,
  },
  {
    id: 'ten-thousand-words',
    motif: MOTIFS.CODEX,
    title: 'Ten Thousand Words',
    subtitle: 'A short book absorbed',
    latin: 'Decem Milia',
    earnedBy: 'Reading 10,000 words',
    goal: 10000,
    unit: 'words',
    progress: (stats) => stats.wordsRead,
  },
  {
    id: 'hundred-thousand-words',
    motif: MOTIFS.SPIRAL,
    title: 'The Long Study',
    subtitle: 'One hundred thousand words',
    latin: 'Studium Longum',
    earnedBy: 'Reading 100,000 words',
    goal: 100000,
    unit: 'words',
    progress: (stats) => stats.wordsRead,
  },
  {
    id: 'first-finished',
    motif: MOTIFS.LAUREL,
    title: 'A Book Completed',
    subtitle: 'Read to the end',
    latin: 'Finis Coronat',
    earnedBy: 'Finishing one book',
    goal: 1,
    unit: 'books',
    progress: (stats) => stats.finished,
  },
  {
    id: 'five-finished',
    motif: MOTIFS.VITRUVIAN,
    title: 'The Vitruvian Reader',
    subtitle: 'Five books completed',
    latin: 'Quinque Opera',
    earnedBy: 'Finishing five books',
    goal: 5,
    unit: 'books',
    progress: (stats) => stats.finished,
  },
  {
    id: 'annotator',
    motif: MOTIFS.EYE,
    title: 'The Annotator',
    subtitle: 'Twenty notes kept',
    latin: 'Marginalia',
    earnedBy: 'Saving 20 notes',
    goal: 20,
    unit: 'notes',
    progress: (stats) => stats.notes,
  },
  {
    id: 'marker',
    motif: MOTIFS.COMPASS,
    title: 'The Marker of Places',
    subtitle: 'Ten passages bookmarked',
    latin: 'Signa Loci',
    earnedBy: 'Bookmarking 10 passages',
    goal: 10,
    unit: 'bookmarks',
    progress: (stats) => stats.bookmarks,
  },
  {
    id: 'thirty-sessions',
    motif: MOTIFS.BRIDGE,
    title: 'The Returning Reader',
    subtitle: 'Thirty sessions opened',
    latin: 'Reditus',
    earnedBy: 'Opening 30 reading sessions',
    goal: 30,
    unit: 'sessions',
    progress: (stats) => stats.sessions,
  },
  {
    id: 'night-reader',
    motif: MOTIFS.LAMP,
    title: 'By Lamplight',
    subtitle: 'Ten sessions after dusk',
    latin: 'Sub Lampade',
    earnedBy: 'Reading 10 sessions between 9pm and 5am',
    goal: 10,
    unit: 'sessions',
    progress: (stats) => stats.nightSessions,
  },
  {
    id: 'library-keeper',
    motif: MOTIFS.VESSEL,
    title: 'The Keeper of Shelves',
    subtitle: 'Ten books on the shelf',
    latin: 'Custos Librorum',
    earnedBy: 'Having 10 books in the library',
    goal: 10,
    unit: 'books',
    progress: (stats) => stats.books,
  },
];

const BADGE_MAP = new Map(BADGES.map((badge) => [badge.id, badge]));

/** Whether a timestamp falls in the lamplight window (21:00 to 05:00). */
export function isNightHour(timestamp) {
  if (!timestamp) return false;
  const hour = new Date(timestamp).getHours();
  return hour >= 21 || hour < 5;
}

/** Counts sessions that occurred during night hours, from recorded opens. */
export function countNightSessions(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  return safeEntries.filter((entry) => isNightHour(entry.lastOpenedAt)).length;
}

export function evaluateBadge(badge, stats) {
  const current = Math.max(0, Number(badge.progress(stats)) || 0);
  const goal = Math.max(1, Number(badge.goal) || 1);

  return {
    id: badge.id,
    motif: badge.motif,
    title: badge.title,
    subtitle: badge.subtitle,
    latin: badge.latin,
    earnedBy: badge.earnedBy,
    unit: badge.unit ?? 'count',
    goal,
    current: Math.min(current, goal),
    ratio: Math.min(1, current / goal),
    earned: current >= goal,
  };
}

/** The full evaluated gallery, sorted earned-first then by progress. */
export function evaluateAchievements(stats) {
  return BADGES.map((badge) => evaluateBadge(badge, stats))
    .sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return b.ratio - a.ratio;
    });
}

/**
 * Which badges are newly earned. `alreadyAwarded` is the persisted set, so a
 * badge can only be announced once and can never be revoked.
 */
export function findNewlyEarned(stats, alreadyAwarded = []) {
  const awarded = new Set(Array.isArray(alreadyAwarded) ? alreadyAwarded : []);
  return evaluateAchievements(stats).filter((badge) => badge.earned && !awarded.has(badge.id));
}

export function getBadgeDefinition(id) {
  return BADGE_MAP.get(id) ?? null;
}