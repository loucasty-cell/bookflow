/**
 * library feature public API.
 *
 * Other features import from here, never from lib internals.
 */
export {
  FINISHED_PROGRESS,
  LIBRARY_STORAGE_KEY,
  LIBRARY_VERSION,
  MAX_LIBRARY_ENTRIES,
  SHELVES,
  addToReadQueue,
  clearLibrary,
  enforceCap,
  emptyLibrary,
  getEntries,
  getEntry,
  getResumeEntry,
  normalizeEntry,
  readLibrary,
  recordSession,
  removeEntry,
  setShelf,
  upsertEntry,
} from './lib/libraryStore.js';

export {
  DEFAULT_WORDS_PER_MINUTE,
  IDLE_GAP_MS,
  MAX_MEASURED_WORDS_PER_MINUTE,
  MIN_MEASURED_WORDS_PER_MINUTE,
  MIN_SAMPLES_FOR_CONFIDENCE,
  blendPace,
  computeWordsPerMinute,
  createSpeedTracker,
  minutesForWords,
} from './lib/readingSpeed.js';

export {
  getLibraryStats,
  getShelfCounts,
  getTotals,
} from './lib/readingStats.js';

export {
  BADGES,
  MOTIFS,
  countNightSessions,
  evaluateAchievements,
  evaluateBadge,
  findNewlyEarned,
  getBadgeDefinition,
  isNightHour,
} from './lib/achievements.js';

export {
  DEFAULT_ANNUAL_TARGET,
  GOALS_STORAGE_KEY,
  GOALS_VERSION,
  MAX_ANNUAL_TARGET,
  MIN_ANNUAL_TARGET,
  clearGoals,
  emptyGoals,
  getGoalProgress,
  goalMessage,
  normalizeGoals,
  readGoals,
  rollOverIfNeeded,
  setAnnualTarget,
  setGoalsEnabled,
  writeGoals,
} from './lib/readingGoals.js';

export {
  DB_NAME,
  DB_VERSION,
  STORES,
  clearAllDurable,
  clearDocumentUnits,
  getDurableKind,
  getDurableStore,
  isDurableStorageAvailable,
  loadDocument,
  loadDocumentUnit,
  resetDurableStoreCache,
  saveDocument,
  saveDocumentUnit,
} from './lib/durableStorage.js';

export { BadgeGallery } from './components/BadgeGallery.jsx';
export { ResumeCard } from './components/ResumeCard.jsx';
export { SessionRecap } from './components/SessionRecap.jsx';
export { useReadingSession } from './hooks/useReadingSession.js';