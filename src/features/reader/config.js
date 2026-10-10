import { PANEL_RATIO_DEFAULT } from './lib/panelRatio.js'

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
  keepBooksOnDevice: true,
  showSessionRecap: false,
  showAchievements: false,
  showDefinitionLookup: false,
  progressDisplay: 'percent',
  // Navigator width as a fraction of the reader layout, not a pixel width, so
  // the panel keeps its proportion when the window changes size. Bounds live in
  // lib/panelRatio.js and the absolute px guardrails live in reader.css.
  panelRatio: PANEL_RATIO_DEFAULT,
  enableAnnualGoal: false,
  annualGoalTarget: 12,
  // TODO(backlog-16): readingMoods presets (Morning, Deep Work, Night, Gentle
  // on Eyes) mapping theme + fontFamily + fontSize + lineHeight +
  // letterSpacing + focus in src/features/reader/lib/readingMoods.js. Store
  // preset id + custom flag in settings. All opt-in, default off.
  // TODO(backlog-19): auto night theme following prefers-color-scheme when the
  // reader opts in. Never flip the theme mid-paragraph without warning.
}
