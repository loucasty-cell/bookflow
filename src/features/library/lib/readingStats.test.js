import { beforeEach, describe, expect, it } from 'vitest';
import { memoryStorage } from '../../../shared/lib/index.js';
import {
  getLibraryStats,
  getShelfCounts,
  getTotals,
} from './readingStats.js';
import { recordSession, SHELVES } from './libraryStore.js';
import {
  BADGES,
  MOTIFS,
  evaluateBadge,
  findNewlyEarned,
  isNightHour,
} from './achievements.js';
import {
  getGoalProgress,
  goalMessage,
  normalizeGoals,
  rollOverIfNeeded,
  setAnnualTarget,
  setGoalsEnabled,
} from './readingGoals.js';

beforeEach(() => {
  memoryStorage.clear();
});

describe('readingStats', () => {
  it('aggregates totals across entries', () => {
    const entries = [
      { wordsRead: 1000, readingSeconds: 600, sessions: 2, notesCount: 3, bookmarksCount: 1, shelf: SHELVES.FINISHED },
      { wordsRead: 500, readingSeconds: 300, sessions: 1, notesCount: 1, bookmarksCount: 2, shelf: SHELVES.READING },
    ];
    const totals = getTotals(entries);
    expect(totals.wordsRead).toBe(1500);
    expect(totals.readingSeconds).toBe(900);
    expect(totals.sessions).toBe(3);
    expect(totals.notes).toBe(4);
    expect(totals.bookmarks).toBe(3);
    expect(totals.finished).toBe(1);
  });

  it('counts shelves correctly', () => {
    const entries = [
      { shelf: SHELVES.READING },
      { shelf: SHELVES.READING },
      { shelf: SHELVES.FINISHED },
      { shelf: SHELVES.TO_READ },
    ];
    expect(getShelfCounts(entries)).toEqual({ reading: 2, finished: 1, 'to-read': 1 });
  });

  it('rejects continuity streaks entirely', () => {
    recordSession({ documentId: 'a', title: 'A', progress: 100, wordsRead: 5000, readingSeconds: 3600, notesCount: 2 });
    const stats = getLibraryStats({});
    expect(stats).not.toHaveProperty('continuity');
    expect(stats).not.toHaveProperty('activeDays');
    expect(JSON.stringify(stats)).not.toMatch(/streak|continuity/i);
  });

  it('produces a formatted snapshot with no fabricated numbers', () => {
    recordSession({ documentId: 'b', title: 'B', progress: 100, wordsRead: 5000, readingSeconds: 3600, notesCount: 2 });
    const stats = getLibraryStats({});
    expect(stats.finished).toBe(1);
    expect(stats.wordsRead).toBe(5000);
    expect(stats.formatted.timeReading).toBe('1 hr');
    expect(stats.formatted.wordsRead).toBe('5.0k');
  });

  it('ignores unknown shelves instead of leaking keys', () => {
    expect(getShelfCounts([{ shelf: 'mystery' }, { shelf: SHELVES.READING }])).toEqual({
      reading: 1,
      finished: 0,
      'to-read': 0,
    });
  });

  it('rolls large word counts into millions', () => {
    recordSession({ documentId: 'w', title: 'W', progress: 100, wordsRead: 999500, readingSeconds: 60 });
    expect(getLibraryStats({}).formatted.wordsRead).toBe('1.00M');
  });
});

describe('achievements', () => {
  const stats = {
    sessions: 3,
    wordsRead: 12000,
    readingSeconds: 3700,
    finished: 1,
    notes: 25,
    bookmarks: 12,
    nightSessions: 0,
    books: 3,
  };

  it('defines only deterministic badges', () => {
    expect(BADGES.length).toBeGreaterThan(8);
    for (const badge of BADGES) {
      expect(typeof badge.progress).toBe('function');
      expect(badge.goal).toBeGreaterThan(0);
    }
  });

  it('evaluates a badge from real stats', () => {
    const first = BADGES.find((b) => b.id === 'first-page');
    expect(evaluateBadge(first, stats).earned).toBe(true);

    const longStudy = BADGES.find((b) => b.id === 'hundred-thousand-words');
    const result = evaluateBadge(longStudy, stats);
    expect(result.earned).toBe(false);
    expect(result.ratio).toBeCloseTo(0.12);
  });

  it('never awards the same badge twice', () => {
    const newly = findNewlyEarned(stats, []);
    expect(newly.some((b) => b.id === 'first-page')).toBe(true);
    const again = findNewlyEarned(stats, newly.map((b) => b.id));
    expect(again).toHaveLength(0);
  });

  it('detects night hours for the lamplight badge', () => {
    const night = new Date();
    night.setHours(23, 0, 0, 0);
    const day = new Date();
    day.setHours(14, 0, 0, 0);
    expect(isNightHour(night.getTime())).toBe(true);
    expect(isNightHour(day.getTime())).toBe(false);
    expect(isNightHour(0)).toBe(false);
  });

  it('includes every motif reference as a valid constant', () => {
    const motifs = new Set(BADGES.map((b) => b.motif));
    for (const motif of motifs) {
      expect(Object.values(MOTIFS)).toContain(motif);
    }
  });
});

describe('readingGoals', () => {
  it('normalizes goals and rejects invalid versions', () => {
    expect(normalizeGoals(null).enabled).toBe(false);
    expect(normalizeGoals({ version: 99 }).enabled).toBe(false);
    const goals = normalizeGoals({ version: 1, annualTarget: 5000, enabled: true });
    expect(goals.annualTarget).toBe(500);
    expect(goals.enabled).toBe(true);
  });

  it('is opt-in and off by default', () => {
    expect(getGoalProgress().enabled).toBe(false);
    setGoalsEnabled(true);
    expect(getGoalProgress().enabled).toBe(true);
  });

  it('clamps the target to a sane range', () => {
    setAnnualTarget(10000);
    expect(getGoalProgress().target).toBe(500);
    setAnnualTarget(0);
    expect(getGoalProgress().target).toBe(1);
  });

  it('reports progress as information, never a loss state', () => {
    setGoalsEnabled(true);
    setAnnualTarget(10);
    const progress = getGoalProgress({ booksFinished: 3 });
    expect(progress.remaining).toBe(7);
    expect(progress.percent).toBe(30);
    expect(progress.isMet).toBe(false);
    expect(goalMessage(progress)).not.toMatch(/behind|failed|missed/i);
  });

  it('celebrates a met goal without inflating it', () => {
    setGoalsEnabled(true);
    const progress = getGoalProgress({ booksFinished: 12 });
    expect(progress.isMet).toBe(true);
    expect(goalMessage(progress)).toMatch(/goal met/i);
  });

  it('archives only the ended year, never the in-progress one', () => {
    const now = new Date('2026-09-23T12:00:00').getTime();
    const ended = new Date('2026-09-23T12:00:00').getFullYear() - 1;
    const archived = rollOverIfNeeded(7, now);
    expect(archived.history).toEqual([{ year: ended, booksFinished: 7 }]);
    const again = rollOverIfNeeded(9, now);
    expect(again.history).toEqual([{ year: ended, booksFinished: 7 }]);
    expect(rollOverIfNeeded(3, now, 2030)).toEqual(archived);
  });
});