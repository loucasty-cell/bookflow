export const FONT_SIZE_MIN = 17
export const FONT_SIZE_MAX = 24

export const DEFAULT_SETTINGS = {
  fontSize: 19,
  lineHeight: 1.9,
  columnWidth: 1040,
  focusPace: 240,
  focus: 'soft',
  mode: 'focus',
  theme: 'paper',
  bionic: false,
  fontFamily: 'serif',
  letterSpacing: 'normal',
  showRewardCapsules: false,
  showInterventionModals: false,
  useProgressiveImport: true,
  showResumeCard: true,
  showSessionRecap: false,
  showAchievements: false,
  showDefinitionLookup: false,
  enableAnnualGoal: false,
  annualGoalTarget: 12,
  // TODO(backlog-16): readingMoods presets (Morning, Deep Work, Night, Gentle
  // on Eyes) mapping theme + fontFamily + fontSize + lineHeight +
  // letterSpacing + focus in src/features/reader/lib/readingMoods.js. Store
  // preset id + custom flag in settings. All opt-in, default off.
  // TODO(backlog-19): auto night theme following prefers-color-scheme when the
  // reader opts in. Never flip the theme mid-paragraph without warning.
}
