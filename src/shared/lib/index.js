export { triggerHaptic, HAPTIC_PATTERNS } from './haptics.js'
export {
  documentStorageKey,
  getSafeStorage,
  getStorageItem,
  memoryStorage,
  removeStorageItem,
  safeParse,
  setStorageItem,
} from './storage.js'
export {
  classifyParagraph,
  documentId,
  formatClassification,
  normalizeText,
  splitParagraphs,
  splitSentences,
  stripMarkdown,
  wordCount,
} from './text.js'
export { clearMarks, clearMeasures, getMarks, getMeasures, mark, measure } from './perfMarks.js'
export { useModalFocus } from './focusManagement.js'

