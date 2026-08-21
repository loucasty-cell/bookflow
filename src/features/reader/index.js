export { DEFAULT_SETTINGS, FONT_SIZE_MAX, FONT_SIZE_MIN } from './config.js'
export { ReaderPage } from './components/ReaderPage.jsx'
export { SelectionTooltip } from './components/SelectionTooltip.jsx'
export { selectClosestParagraph, selectFocusTarget, selectNextParagraph } from './lib/focusRail.js'
export { isFocusEligibleChapter } from './lib/focusEligibility.js'
export {
  ensureSelectedSegmentVisible,
  getReaderSafeViewport,
  getSelectedSegmentAlignment,
} from './lib/readerViewport.js'
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
export { computeScrollMetrics, useScrollPosition } from './lib/useScrollPosition.js'
