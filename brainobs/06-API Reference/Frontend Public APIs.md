---
title: Frontend Public APIs
type: reference
status: verified
updated: 2026-09-25
tags: [bookflow, api, frontend, exports]
source-files: [src/features/reader/index.js, src/features/document-import/index.js, src/features/library/index.js, src/components/index.js, src/shared/lib/index.js, src/store/readerStore.js, src/store/uiStore.js, src/features/reader/hooks/useReaderNavigation.js, src/features/document-import/hooks/useDocumentImport.js, src/features/library/hooks/useReadingSession.js]
---

# Frontend Public APIs

What each module may expose to the rest of the app. Import only through these surfaces.

## `src/features/reader/index.js`

```js
// Config
DEFAULT_SETTINGS, FONT_SIZE_MAX, FONT_SIZE_MIN

// Components
ReaderPage, ReaderShell, SelectionTooltip

// Focus and navigation
selectClosestParagraph, selectFocusTarget, selectNextParagraph
isFocusEligibleChapter
FOCUS_RAIL_RATIO, LINE_COOLDOWN, MAX_SCROLL_INPUT, SCROLL_INTENT_THRESHOLD
accumulateScrollIntent, estimateReadingMs, getIntentDirection, getNavigationStep
readingProgress

// Viewport and scroll
ensureSelectedSegmentVisible, getReaderSafeViewport, getSelectedSegmentAlignment
computeScrollMetrics, useScrollPosition

// Text, chapters, and local lookup
formatParagraphText, getFixationLength
countBookWords, enrichChapters, readingMinutes
useChapterWindow, useReaderAnnotations, useReaderNavigation
useReaderPersistence, useReaderSession, useReaderStaticRegion
```

## `src/features/document-import/index.js`

```js
// Parsing and validation
ACCEPTED_FILES, parseDocument
validateBookFile, validateFileDescriptor, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS

// Manifest
createManifest, addUnit
markQueued, markProcessing, markReady, markFailed, markCancelled
getUnitById, getUnitsByStatus, getFirstReadyUnit, manifestProgress
UnitStatus, JobPriority

// Scheduler and progressive coordinators
createImportScheduler, getConcurrency
progressivePdfImport, progressiveEpubImport, progressiveTextImport

// Import session hook
useDocumentImport

// Explicit accelerated OCR seam
scanPdfViaBackend, isBackendFallbackError
```

## `src/features/library/index.js`

```js
LIBRARY_STORAGE_KEY, LIBRARY_VERSION, MAX_LIBRARY_ENTRIES, FINISHED_PROGRESS, SHELVES
getEntries, getEntry, getResumeEntry, readLibrary, normalizeEntry, upsertEntry
setShelf, removeEntry, enforceCap, recordSession, addToReadQueue, clearLibrary

getLibraryStats, getShelfCounts, getTotals
BADGES, MOTIFS, evaluateBadge, evaluateAchievements, findNewlyEarned
readGoals, getGoalProgress, setGoalsEnabled, setAnnualTarget, clearGoals

DB_NAME, DB_VERSION, STORES, isDurableStorageAvailable
saveDocument, loadDocument, saveDocumentUnit, loadDocumentUnit

ResumeCard, SessionRecap, BadgeGallery
useReadingSession
```

The library boundary stores metadata and measured session totals, not book text. The durable
adapter is public for future wiring but is not currently called by the app document lifecycle.

## `src/components/index.js`

```js
OcrUploader
ocrRequestErrorMessage, API_BASE
InterventionModal
VariableRewardCapsule
```

## `src/shared/lib/index.js`

Storage, text, haptics, and performance helpers.

| Group | Exports |
| --- | --- |
| Haptics | `triggerHaptic`, `HAPTIC_PATTERNS` |
| Storage | `documentStorageKey`, `getSafeStorage`, `getStorageItem`, `memoryStorage`, `removeStorageItem`, `safeParse`, `setStorageItem` |
| Text | `classifyParagraph`, `documentId`, `formatClassification`, `normalizeText`, `splitParagraphs`, `splitSentences`, `stripMarkdown`, `wordCount` |
| Focus management | `useModalFocus` |
| Performance | `mark`, `measure`, `getMarks`, `getMeasures`, `clearMarks`, `clearMeasures` |

`splitParagraphs` and `normalizeText` live in `src/shared/lib/text.js` and are imported directly
by the parsers. Performance marks come from `src/shared/lib/perfMarks.js` as `mark`.

## Stores

### `useReaderStore` / `createReaderStore(storage)`

| Field | Type |
| --- | --- |
| `settings` | `DEFAULT_SETTINGS` shaped object |
| `progress` | number |
| `bookmarks` | paragraph id array |
| `notes` | note objects |

| Action | Signature |
| --- | --- |
| `setSettings` | `(updaterOrPartial)` |
| `setProgress` | `(value)` |
| `setBookmarks` | `(array)` |
| `toggleBookmark` | `(id)` |
| `setNotes` | `(array)` |
| `addNote` | `(note)` |
| `deleteNote` | `(id)` |

`createReaderStore` accepts an injected storage implementation for tests.

### `useUIStore` / `createUIStore(initialState)`

Fields: `settingsOpen`, `sidebarOpen`, `sidebarCollapsed`, `notesOpen`, `ocrOpen`,
`showIntervention`, `showEntryIntro`, `dragging`, `loading`, `error`.

Setters mirror the field names with a `set` prefix. Open-state setters accept a boolean or an
updater function. Not persisted.

## Reader hooks

| Hook | Responsibility |
| --- | --- |
| `useReaderSession` | Book state, open/close, resume, and chapter selection |
| `useReaderNavigation` | Focus, alignment, input, and step navigation |
| `useReaderInput` | Keyboard, wheel, touch, and scroll handlers |
| `useReaderMeasurement` | Paragraph measurement and restore alignment |
| `useReaderStaticRegion` | Static-region state and labels |
| `useReaderPersistence` | Per-document session read and write |
| `useReaderAnnotations` | Notes, bookmarks, and copy actions |
| `useChapterWindow` | Long-book chapter windowing and spacer preservation |
| `useDocumentImport` | File validation, progressive/blocking import, terminal progress, and explicit OCR handoff |
| `useReadingSession` | Measured session totals, recap, and achievement state |

## Key signatures

### `parseDocument(file, onProgress)`

Blocking parse. Returns a promise resolving to a normalized book.
`onProgress(percent, label)`.

Detail: [[Normalized Book Contract]].

### `scanPdfViaBackend(file, onProgress, options)`

This is an explicit user-started accelerated OCR call. The default local import path does not invoke
it automatically after a parse error.

```js
scanPdfViaBackend(file, onProgress, { signal, batchSize = 16, ocrProfile = "small" })
```

Returns a promise with a `.cancel()` method. `onProgress(percent, label, detail)`.

Detail: [[OCR-Frontend Sync Contract]].

### `createImportScheduler({ concurrency, onUnitReady, onUnitFailed, onProgress })`

Returns:

```js
{ enqueue, cancelUnit, cancelAll, cancelStale, pause, resume, stats,
  isIdle, isDisposed }
```

Detail: [[Import Scheduler]].

### `getFixationLength(wordLength)`

Pure function returning the fixation character count. Unit tested against boundary values.

Detail: [[Bionic Reading]].

## Boundary rules

| Rule | Reason |
| --- | --- |
| Import via `index.js` only | Features stay independent |
| Never reach into another feature's internals | Prevents hidden coupling |
| Put code in `shared/` only when two or more features use it | Avoids a junk drawer |
| Expose a factory plus an instance for stores | Enables test injection |

Detail: [[File Placement Map]], [[Invariants]].