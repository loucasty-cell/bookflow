export { LensBar } from './components/LensBar.jsx';
export { LensBarLauncher } from './components/LensBarLauncher.jsx';
export { LensBarMenu, LENS_MENU_MODES } from './components/LensBarMenu.jsx';
export { useLensConsent, LENS_CONSENT_CHOICES } from './hooks/useLensConsent.js';
export { detectLensTheme, useLensTheme } from './hooks/useLensTheme.js';
export { useSelectionMemory, LENS_SELECTION_MEMORY_LIMIT } from './hooks/useSelectionMemory.js';
export { useDraggableBar } from './hooks/useDraggableBar.js';
export {
  MAX_CONTEXT,
  MAX_QUESTION,
  MODE_ACTIONS,
  buildLensCall,
  toLensStatus,
  useLensRequest,
} from './hooks/useLensRequest.js';
export { toPlain } from './lib/plain.js';
export {
  DEFAULT_RATIO,
  MARGIN,
  clampPx,
  snapPx,
  toPixels,
  toRatio,
} from './lib/position.js';
export {
  LENS_BAR_MODES,
  LENS_BAR_STORAGE_KEY,
  readLensBarPreferences,
  useLensBarStore,
} from './store/lensBarStore.js';
