export { DEFAULT_SETTINGS } from './config.js'
export { ReaderPage } from './components/ReaderPage.jsx'
export { selectClosestParagraph, selectFocusTarget, selectNextParagraph } from './lib/focusRail.js'
export { isFocusEligibleChapter } from './lib/focusEligibility.js'
export {
  FOCUS_RAIL_RATIO,
  LINE_COOLDOWN,
  MAX_SCROLL_INPUT,
  SCROLL_INTENT_THRESHOLD,
  accumulateScrollIntent,
  estimateReadingMs,
  getIntentDirection,
  getNavigationStep,
  readingProgress,
} from './lib/readingController.js'
