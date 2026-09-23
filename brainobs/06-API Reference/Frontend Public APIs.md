---
title: Frontend Public APIs
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, api, frontend, exports]
source-files: [src/features/reader/index.js, src/features/document-import/index.js, src/components/index.js, src/shared/lib/index.js, src/store/readerStore.js, src/store/uiStore.js]
---

# Frontend Public APIs

What each module may expose to the rest of the app. Import only through these surfaces.

## `src/features/reader/index.js`

```js
// Config
DEFAULT_SETTINGS, FONT_SIZE_MAX, FONT_SIZE_MIN

// Components
ReaderPage, SelectionTooltip

// Focus
selectClosestParagraph, selectFocusTarget, selectNextParagraph
isFocusEligibleChapter

// Viewport
ensureSelectedSegmentVisible, getReaderSafeViewport, getSelectedSegmentAlignment

// Reading controller
FOCUS_RAIL_RATIO, LINE_COOLDOWN, MAX_SCROLL_INPUT, SCROLL_INTENT_THRESHOLD
accumulateScrollIntent, estimateReadingMs, getIntentDirection, getNavigationStep
readingProgress

// Scroll
computeScrollMetrics, useScrollPosition

// Text
formatParagraphText, getFixationLength
```

## `src/features/document-import/index.js`

```js
// Parsing
ACCEPTED_FILES, parseDocument

// Manifest
createManifest, addUnit
markQueued, markProcessing, markReady, markFailed, markCancelled
getUnitById, getUnitsByStatus, getFirstReadyUnit, manifestProgress
UnitStatus, JobPriority

// Scheduler
createImportScheduler, getConcurrency

// Progressive coordinators
progressivePdfImport, progressiveEpubImport, progressiveTextImport

// Backend OCR fallback
scanPdfViaBackend, isBackendFallbackError
```

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
| Text | `classifyParagraph`, `documentId`, `formatClassification`, `splitSentences`, `wordCount` |

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
| `useReaderSession` | Book session assembly and enrichment |
| `useReaderNavigation` | Focus, scroll, keyboard, and step navigation |
| `useReaderPersistence` | Per-document session read and write |

## Key signatures

### `parseDocument(file, onProgress)`

Blocking parse. Returns a promise resolving to a normalized book.
`onProgress(percent, label)`.

Detail: [[Normalized Book Contract]].

### `scanPdfViaBackend(file, onProgress, options)`

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