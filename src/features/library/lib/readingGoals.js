/**
 * readingGoals: an optional annual reading goal.
 *
 * Modelled on the yearly challenge horizon rather than a daily streak: a missed
 * week does not end the goal, so there is nothing to lose and no reason to avoid
 * the app after a gap. No penalty copy, no countdown, no freeze purchases.
 */
import {
  getSafeStorage,
  removeStorageItem,
  safeParse,
  setStorageItem,
} from '../../../shared/lib/index.js';

export const GOALS_STORAGE_KEY = 'bookflow:goals';
export const GOALS_VERSION = 1;
export const DEFAULT_ANNUAL_TARGET = 12;
export const MIN_ANNUAL_TARGET = 1;
export const MAX_ANNUAL_TARGET = 500;

function currentYear(now = Date.now()) {
  return new Date(now).getFullYear();
}

export function emptyGoals() {
  return { version: GOALS_VERSION, annualTarget: DEFAULT_ANNUAL_TARGET, enabled: false, history: [] };
}

export function normalizeGoals(raw) {
  if (!raw || typeof raw !== 'object') return emptyGoals();
  if (raw.version !== GOALS_VERSION) return emptyGoals();

  const history = Array.isArray(raw.history)
    ? raw.history
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
          year: Number(entry.year) || 0,
          booksFinished: Math.max(0, Math.round(Number(entry.booksFinished) || 0)),
        }))
        .filter((entry) => entry.year > 0)
    : [];

  const target = Number(raw.annualTarget);
  const safeTarget = Number.isFinite(target) ? Math.round(target) : DEFAULT_ANNUAL_TARGET;

  return {
    version: GOALS_VERSION,
    annualTarget: Math.min(MAX_ANNUAL_TARGET, Math.max(MIN_ANNUAL_TARGET, safeTarget)),
    enabled: raw.enabled === true,
    history,
  };
}

export function readGoals() {
  return normalizeGoals(safeParse(getSafeStorage().getItem(GOALS_STORAGE_KEY), null));
}

export function writeGoals(goals) {
  setStorageItem(GOALS_STORAGE_KEY, goals);
}

export function clearGoals() {
  removeStorageItem(GOALS_STORAGE_KEY);
}

export function setAnnualTarget(target, now = Date.now()) {
  const goals = readGoals(now);
  const parsed = Number(target);
  const safeTarget = Number.isFinite(parsed) ? Math.round(parsed) : DEFAULT_ANNUAL_TARGET;

  const next = {
    ...goals,
    annualTarget: Math.min(MAX_ANNUAL_TARGET, Math.max(MIN_ANNUAL_TARGET, safeTarget)),
  };
  writeGoals(next);
  return next;
}

/** Opt-in only. The goal is never shown unless the reader turns it on. */
export function setGoalsEnabled(enabled, now = Date.now()) {
  const goals = readGoals(now);
  const next = { ...goals, enabled: enabled === true };
  writeGoals(next);
  return next;
}

/**
 * Archives the just-ended year into history once. The in-progress year is
 * never snapshotted, so mid-year calls are a no-op. A past year is a record,
 * never a failure state.
 */
export function rollOverIfNeeded(finishedCount, now = Date.now(), forYear = currentYear(now) - 1) {
  const goals = readGoals(now);
  const endedYear = Math.round(Number(forYear) || 0);
  if (!(endedYear > 0) || endedYear >= currentYear(now)) return goals;

  if (goals.history.some((entry) => entry.year === endedYear)) return goals;

  const pastYears = goals.history.filter((entry) => entry.year < endedYear);
  const next = {
    ...goals,
    history: [...pastYears, { year: endedYear, booksFinished: Math.max(0, Math.round(finishedCount) || 0) }],
  };

  writeGoals(next);
  return next;
}

/**
 * Goal progress for display. `booksFinished` comes from derived stats only.
 * Never shows a deficit as a punishment; the remaining count is informational.
 */
export function getGoalProgress({ goals = readGoals(), booksFinished = 0, now = Date.now() } = {}) {
  const normalized = normalizeGoals(goals);
  const finished = Math.max(0, Math.round(Number(booksFinished) || 0));
  const target = normalized.annualTarget;
  const ratio = Math.min(1, finished / target);

  return {
    enabled: normalized.enabled,
    year: currentYear(now),
    target,
    booksFinished: finished,
    remaining: Math.max(0, target - finished),
    ratio,
    percent: Math.round(ratio * 100),
    isMet: finished >= target,
    history: normalized.history,
  };
}

/**
 * Encouraging copy only. No guilt, no urgency, no "you're behind".
 * Returns null when there is nothing worth saying.
 */
export function goalMessage(progress) {
  if (!progress?.enabled) return null;

  if (progress.isMet) {
    return `Goal met for ${progress.year}. Keep reading at your own pace.`;
  }
  if (progress.booksFinished === 0) {
    return `A quiet goal of ${progress.target} ${progress.target === 1 ? 'book' : 'books'} for ${progress.year}. No deadline.`;
  }
  if (progress.ratio >= 0.5) {
    return `${progress.booksFinished} of ${progress.target} books this year. More than halfway.`;
  }
  return `${progress.booksFinished} of ${progress.target} books this year. Progress is progress.`;
}