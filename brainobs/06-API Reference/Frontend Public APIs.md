---
title: Frontend Public APIs
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, api, frontend, barrel, contract, architecture]
source-files: [src/features/reader/index.js, src/features/document-import/index.js, src/features/library/index.js, src/features/landing/index.js, src/features/lens-bar/index.js, src/features/widgets/index.js, src/features/scroll/index.js, src/components/index.js, src/shared/components/index.js, src/shared/lib/index.js, src/store/readerStore.js, src/store/uiStore.js]
---

# Frontend Public APIs

Every barrel a feature or shared layer publishes, and the one rule that governs them. Read this
before adding an export or reaching for a deep import.

Status: **verified** against `src/` on 2026-10-02.

## The rule

Cross-feature imports go through the feature's `index.js`. No exceptions for production code.

```js
// correct
import { useReaderSmoothScroll } from "../../scroll/index.js";

// wrong, and lint will not catch it
import { useReaderSmoothScroll } from "../../scroll/useReaderSmoothScroll.js";
```

There is **no** path alias configured in `vite.config.js`, so every cross-directory import is
relative. That is a deliberate choice: aliases would make the barrel rule optional.

`eslint.config.js` has no import-boundary rule and no type-aware linting, so **nothing enforces
this for you**. It is a convention you maintain by review.

### The one current violation

`src/features/reader/lib/progressLabel.test.js:2` deep-imports
`../../library/lib/libraryStore.js`, bypassing the library barrel. It is test code, so the
bundler never sees it. It is also the only cross-feature deep import in the repository.

## Feature barrels

Seven features, seven barrels. All seven exist and are consumed.

### `src/features/reader/index.js`

```js
// config
DEFAULT_SETTINGS, FONT_SIZE_MAX, FONT_SIZE_MIN
// components
CommandPalette, filterCommands, ReaderPage, ReaderShell, SelectionTooltip, FocusBarHost,
FocusBarAmbient, SPLINE_SCENE_CONFIGURED
// lib
selectClosestParagraph, selectFocusTarget, selectNextParagraph
isFocusEligibleChapter
ensureSelectedSegmentVisible, getReaderSafeViewport, getSelectedSegmentAlignment
FOCUS_RAIL_RATIO, LINE_COOLDOWN, MAX_SCROLL_INPUT, SCROLL_INTENT_THRESHOLD,
accumulateScrollIntent, estimateReadingMs, getIntentDirection, getNavigationStep, readingProgress
computeScrollMetrics, useScrollPosition
formatParagraphText, getFixationLength
countBookWords, enrichChapters, readingMinutes
// hooks
useChapterWindow, useReaderAnnotations, useReaderNavigation, useReaderPersistence,
useReaderSession, useReaderStaticRegion
```

**Not exported**, so reachable only by deep path: `ContentsPanel`, `FocusCard`,
`FocusBarBackdrop`, `HorizonTeaser`, `NotesPanel`, `ReaderCanvas`, `ReaderHeader`,
`ReaderOverlays`, `SaccadicGuide`, `SettingsPanel`, `dictionary`, `notesExport`,
`notesPdfExport`, `progressLabel`, `readingTime`, `salienceFormatter`, `staticRegion`,
`useReaderInput`, `useReaderMeasurement`, `useReaderSelection`, `useReaderWindowEffects`,
`useReadingLens`.

That list is long. It is a real trade-off, not an oversight: the reader feature has many
internal components that only its own tree needs, and publishing them would make the barrel a
second, unenforced API. When you add a reader export, ask whether a feature outside `reader/`
genuinely needs it.

### `src/features/document-import/index.js`

`ACCEPTED_FILES`, `parseDocument`, `validateBookFile`, `validateFileDescriptor`,
`MAX_FILE_SIZE`, `SUPPORTED_EXTENSIONS`, `createManifest`, `addUnit`, `markQueued`,
`markProcessing`, `markReady`, `markFailed`, `markCancelled`, `requeueUnit`, `getUnitById`,
`getUnitsByStatus`, `getFirstReadyUnit`, `manifestProgress`, `UnitStatus`, `JobPriority`,
`createImportScheduler`, `getConcurrency`, `progressivePdfImport`, `progressiveEpubImport`,
`progressiveTextImport`, `scanPdfViaBackend`, `isBackendFallbackError`, `useDocumentImport`.

**Not exported**: `useOcrSession`, `OcrUploader`, `OcrResultViewer`, `manifestToBook`,
`ocrResultToBook`.

### `src/features/library/index.js`

The largest barrel, six lib groups plus components and a hook.

```js
// libraryStore
FINISHED_PROGRESS, LIBRARY_STORAGE_KEY, LIBRARY_VERSION, MAX_LIBRARY_ENTRIES, SHELVES,
addToReadQueue, clearLibrary, documentIdForFile, enforceCap, emptyLibrary, getEntries,
getEntry, getResumeEntry, normalizeEntry, readLibrary, recordSession, removeEntry, setShelf,
upsertEntry
// librarySelectors
clampProgress, formatLastOpened, formatProgress, hasReopenableSource, selectContinueReading,
selectFinished, selectRecent, selectToRead
// readingSpeed
DEFAULT_WORDS_PER_MINUTE, IDLE_GAP_MS, MAX_MEASURED_WORDS_PER_MINUTE,
MIN_MEASURED_WORDS_PER_MINUTE, MIN_SAMPLES_FOR_CONFIDENCE, blendPace, computeWordsPerMinute,
createSpeedTracker, minutesForWords
// readingStats
getLibraryStats, getShelfCounts, getTotals
// achievements
BADGES, MOTIFS, countNightSessions, evaluateAchievements, evaluateBadge, findNewlyEarned,
getBadgeDefinition, isNightHour
// readingGoals
DEFAULT_ANNUAL_TARGET, GOALS_STORAGE_KEY, GOALS_VERSION, MAX_ANNUAL_TARGET,
MIN_ANNUAL_TARGET, clearGoals, emptyGoals, getGoalProgress, goalMessage, normalizeGoals,
readGoals, rollOverIfNeeded, setAnnualTarget, setGoalsEnabled, writeGoals
// durableStorage
DB_NAME, DB_VERSION, STORES, clearAllDurable, clearDocumentUnits, getDurableKind,
getDurableStore, isDurableStorageAvailable, loadDocument, loadDocumentUnit,
resetDurableStoreCache, saveDocument, saveDocumentUnit
// components + hook
BadgeGallery, RecentShelf, ResumeCard, SessionRecap, useReadingSession
```

**Not exported**: `BadgeGlyph` and its `GLYPHS` map. `BadgeGallery.jsx` imports them
internally. Export the component or the glyphs if a second surface ever needs them.

### `src/features/landing/index.js`

`BookOpeningIntro`, `LandingPage`, `ThreeDBookCard`, `LivingShelf`.

**Not exported**: `SAMPLE_BOOK` (`sampleBook.js`). `src/components/AppLandingView.jsx:4`
imports it directly. `landing/` is the only feature with no `hooks/`, `lib/`, or `store/`
subfolder.

### `src/features/lens-bar/index.js`

```js
// components
LensBar, LensBarLauncher, LensBarMenu, LENS_MENU_MODES
// hooks
useLensConsent, LENS_CONSENT_CHOICES
detectLensTheme, useLensTheme
useSelectionMemory, LENS_SELECTION_MEMORY_LIMIT
useDraggableBar
MAX_CONTEXT, MAX_QUESTION, MODE_ACTIONS, buildLensCall, toLensStatus, useLensRequest
// lib
toPlain
DEFAULT_RATIO, MARGIN, clampPx, snapPx, toPixels, toRatio
// store
LENS_BAR_MODES, LENS_BAR_STORAGE_KEY, readLensBarPreferences, useLensBarStore
```

`LensBarPanel` and the module-local `clamp` in `position.js` are intentionally **not** exported.
`LensBarPanel` is kept out so it can be rendered by `renderToStaticMarkup` in a test to verify
HTML escaping without mounting the portal.

### `src/features/widgets/index.js`

```js
// components
WidgetFrame, WidgetMeter, WidgetRing
ContinueWidget, GoalWidget, ListWidget, RingsWidget, StatWidget
WidgetGrid, WidgetGridSkeleton
// tokens
WIDGET_RADIUS, WIDGET_SCALES, WIDGET_SIZES, WIDGET_SOURCE_URL, WIDGET_SURFACES, WIDGET_TYPE,
widgetBox
// spec
findWidgetById, widgetSpec, widgetsBySize
```

**Not exported**: `WIDGET_FILE_KEY`, `WIDGET_ROOT_NODE`, `WIDGET_INK` (all in `lib/tokens.js`),
the four raw spec arrays in `lib/spec/` (they are concatenated by `lib/specIndex.js`, which
itself is not re-exported by the barrel), and `AnimatedValue`/`AnimatedRing`.

`src/features/widgets/components/AnimatedValue.jsx` is **dead code with a broken import**. It
imports `./widgetMotion.js` at line 3, but that file lives at `lib/widgetMotion.js`, so the
specifier does not resolve. Nothing imports `AnimatedValue` or `AnimatedRing`. It survives
because no bundler ever walks it. Do not add an import of it; fix or delete it.

The widget test lives at the feature root as `widgets.test.jsx`, not under `components/`.

### `src/features/scroll/index.js`

```js
// smoothScroll.js
SMOOTH_SCROLL_REASON, getSmoothScroll, isNestedScroller, isSmoothScrollActive, scrollContainerTo,
startReaderSmoothScroll, startSmoothScroll, stopAllSmoothScroll, stopReaderSmoothScroll,
stopSmoothScroll
// useReaderSmoothScroll.js
useReaderSmoothScroll
```

`scroll/` is flat: three files, no subfolders. The single-ticker rule these exports enforce is
documented in [[Sentence-Paced Scroll]].

## Shared barrels

### `src/shared/components/index.js`

`Brand`, `LoadingOverlay`, `ErrorBoundary`, `ThreeDButton`.

**Deliberately absent: `AmbientDustCanvas`.** The barrel carries this comment:

```js
// AmbientDustCanvas is intentionally not re-exported here. It is the only module
// that pulls in Three, and a static re-export would put Three back in the entry
// graph. Import it directly, lazily, where it is used.
```

`src/features/landing/components/LandingPage.jsx` honours this with a direct dynamic import.
Adding the export back would return `vendor-three` to the entry chunk. Verify with
`npm run build`.

### `src/shared/lib/index.js`

`triggerHaptic`, `HAPTIC_PATTERNS`; `documentStorageKey`, `getSafeStorage`, `getStorageItem`,
`memoryStorage`, `removeStorageItem`, `safeParse`, `setStorageItem`; `classifyParagraph`,
`documentId`, `formatClassification`, `normalizeText`, `splitParagraphs`, `splitSentences`,
`stripMarkdown`, `wordCount`; `clearMarks`, `clearMeasures`, `getMarks`, `getMeasures`, `mark`,
`measure`; `useModalFocus`; `usePointerCssVars`; `useProximityCssVars`.

The two CSS-var hooks are exported as **named** exports. Both files also carry a default export
at their own module path; prefer the named form through the barrel.

### Shared modules with no barrel

Two shared modules are imported by their own path and are not in any barrel:

| Module | Exports | Note |
| --- | --- | --- |
| `src/shared/motion/presets.js` | `motionPresets`, `reducedTransition = { duration: 0.01 }` | 7 unit tests |
| `src/shared/graphics/quality.js` | `QUALITY_TIERS`, `getGraphicsQuality`, `GRAPHICS_BREAKPOINT` | 12 unit tests; deliberately free of React and Three |

`quality.js` is separate from `shared/lib/` because it is a rendering decision, not a utility.
See [[Graphics Quality Tiers]].

## Stores

| Module | Exports | Persisted |
| --- | --- | --- |
| `src/store/readerStore.js` | `createReaderStore(storage)`, `useReaderStore` | zustand `persist` as `bookflow-reader-storage`, **`partialize` to `settings` only** (`readerStore.js:72-74`) |
| `src/store/uiStore.js` | `createUIStore(initialState)`, `useUIStore` | none — ephemeral, resets on reload |
| `src/features/lens-bar/store/lensBarStore.js` | `useLensBarStore`, `LENS_BAR_MODES`, `LENS_BAR_STORAGE_KEY` | hand-rolled read/write to `bookflow:lens-bar`, **not** zustand `persist` |

The `partialize` decision is counter-intuitive and deliberate: `progress`, `bookmarks`, and
`notes` exist in store state but are excluded from the persisted payload and re-hydrated per
document by `useReaderPersistence`. Persisting them globally would let one book's notes leak
into another's session. See [[Storage and Persistence]].

Both `src/store/` files use a factory plus a default singleton so tests can inject state and
storage.

## Component wrappers, `src/components/index.js`

`OcrUploader` (a re-export wrapper over the feature-local component), `ocrRequestErrorMessage`,
`API_BASE` (both from `ocrErrors.js`), `InterventionModal`, `VariableRewardCapsule`.

`src/components/AppLandingView.jsx` and `src/components/AppReaderView.jsx` are **not** in this
barrel; `src/App.jsx` imports them directly as the root composition boundary.

## What is verified versus what is not

Every export name above was read from the barrel source on 2026-10-02. Counts of files inside
each feature subfolder are deliberately omitted, because they rot on the next commit and a stale
number is worse than no number. Behaviour is in the per-feature notes, not here.

## Related

- [[Architecture MOC]] and [[Frontend Architecture]] for placement
- [[Storage and Persistence]] for every storage key
- [[File Placement Map]] for where a new module goes
- [[Reading Lens Bar]] for the lens-bar barrel in practice
- [[Home Widgets]] for the widget spec system
- [[Command Palette]] for the one pure function deliberately exported next to a component
- [[API Reference MOC]]