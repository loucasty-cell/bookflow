---
title: Frontend Architecture
type: concept
status: verified
refactor: complete
updated: 2026-09-25
tags: [bookflow, architecture, frontend, react]
source-files: [src/App.jsx, src/main.jsx, vite.config.js, src/store/readerStore.js, src/store/uiStore.js, src/shared/lib/storage.js, src/features/reader/index.js, src/features/document-import/index.js, src/features/library/index.js, src/features/reader/hooks/useReaderNavigation.js, src/features/document-import/hooks/useDocumentImport.js, src/features/library/hooks/useReadingSession.js, src/features/landing/components/LivingShelf.jsx, src/features/landing/components/ThreeDBookCard.jsx]
---

# Frontend Architecture

## Framework layer

| Piece | Version | Role |
| --- | --- | --- |
| React | 19 | Component tree, concurrent rendering |
| Vite | 8 | Dev server, HMR, production bundling |
| Zustand | 5 | Global state with persisted settings |
| Framer Motion | 13 | Spring physics and `AnimatePresence` |
| SWR | 2 | Available for future remote integrations; current reader/import flows do not depend on it |
| Three.js | 0.186 | Existing isolated ambient dust layer; no text rendering |
| Tailwind CSS | 4.3 | Utility-only Vite layer without preflight; semantic CSS remains authoritative |
| Lucide React | 0.468 | Icon set |

`base: './'` in `vite.config.js` keeps asset paths relative so the build runs from any
subdirectory. Build target is `es2022`.

## Feature boundaries

```text
src/
  App.jsx                  Root composer: book state, session hooks, reader wiring
  main.jsx                 Root mount wrapped in ErrorBoundary
  styles.css               Semantic CSS tokens and theme definitions
  components/              Cross-feature lazy modals and compatibility wrappers
  features/
    landing/               LandingPage, BookOpeningIntro, LivingShelf, ThreeDBookCard
    reader/                Components, hooks, lib, config, public index.js
    document-import/       Components, hooks, parsers, manifest, scheduler, coordinator, OCR session
    library/               Components, hooks, metadata, stats/goals/achievements, resume surfaces, durable adapter
  shared/
    lib/                   storage.js, text.js, haptics.js, focusManagement.js, perfMarks.js
    components/            ErrorBoundary and shared UI
  store/                   readerStore.js, uiStore.js
```

Rules:

- A feature keeps its internals private and exposes a public API through `index.js`.
- Nothing imports another feature's internal files.
- `src/shared/` is only for code two or more features actually use.
- `App.jsx` owns application state and feature composition, not feature internals.

## Refactor status

The reader session, navigation, input, measurement, persistence, annotations, static-region
handling, and long-book windowing are extracted into `src/features/reader/hooks/`. Document import
and the metadata library have their own feature boundaries, components, and hooks. `App.jsx` is the
root composer and lifecycle owner; the current decomposition is complete.

Detail: [[File Placement Map]], [[Agent Quickstart]].

## Reader feature internals

```text
src/features/reader/
  config.js                         DEFAULT_SETTINGS, FONT_SIZE_MIN, FONT_SIZE_MAX
  index.js                          Public API
  components/
    ReaderPage.jsx                  Reader canvas, focus cards, panels, and dictionary selection
    ReaderShell.jsx                 Layout composition, capsules, interventions
    FocusCard.jsx                   Focus status and bookmark/copy actions
    SettingsPanel.jsx
    NotesPanel.jsx
    ContentsPanel.jsx
    SelectionTooltip.jsx
    HorizonTeaser.jsx               Next-chapter preview
    SaccadicGuide.jsx               Experimental guide component; not mounted by ReaderShell
    resonance.css                   Orphaned social-layer asset; no importer
  lib/
    readingController.js            FOCUS_RAIL_RATIO, scroll intent, readingProgress
    focusRail.js                    selectClosestParagraph, selectFocusTarget, selectNextParagraph
    focusEligibility.js             isFocusEligibleChapter
    staticRegion.js                 Static-region detection and labels
    readerViewport.js               Viewport and alignment helpers
    useScrollPosition.js            Scroll metrics hook
    textFormatter.js                formatParagraphText, getFixationLength
    salienceFormatter.js            Salience weighting
    dictionary.js                   Local-only starter lexicon and optional licensed loader
    readingTime.js                  Reading-time formatting
    chapterEnrichment.js            Paragraph ids, word counts, and chapter enrichment
  hooks/
    useReaderSession.js             Book state, open/close, resume, chapter selection
    useReaderNavigation.js          Focus, alignment, input, and step navigation
    useReaderInput.js               Keyboard, wheel, touch, and scroll handlers
    useReaderMeasurement.js         Paragraph measurement and restore alignment
    useReaderStaticRegion.js        Static-region state
    useReaderPersistence.js         Per-document session read and write
    useReaderAnnotations.js         Notes, bookmarks, and copy actions
    useChapterWindow.js             Long-book windowing and spacer preservation
```

## State management

Two Zustand stores, both injectable for tests.

### `readerStore.js`

Persisted with `persist` and `createJSONStorage(getSafeStorage)`.

| Field | Purpose |
| --- | --- |
| `settings` | Reading preferences merged over `DEFAULT_SETTINGS` |
| `progress` | Reading progress |
| `bookmarks` | Bookmarked paragraph ids |
| `notes` | Margin notes |

Actions: `setSettings`, `setProgress`, `setBookmarks`, `toggleBookmark`, `setNotes`,
`addNote`, `deleteNote`.

Two behaviours matter for correctness:

- `setSettings` always re-merges over `DEFAULT_SETTINGS`, so newly added defaults appear for
  existing users without a migration.
- `setBookmarks` and `setNotes` accept either arrays or functional updaters and normalize persisted values to arrays.
- `partialize` persists only `settings`. Progress, bookmarks, and notes are persisted
  per document through the reader persistence hook instead.

### `uiStore.js`

Not persisted. Holds `settingsOpen`, `sidebarOpen`, `sidebarCollapsed`, `notesOpen`, `ocrOpen`,
`showIntervention`, `showEntryIntro`, `dragging`, `loading`, `error`, with matching setters.
Open-state setters accept either a boolean or an updater function.

## Code splitting

`vite.config.js` splits vendor code into `vendor-three`, `vendor-motion`, `vendor-icons`,
`vendor-react`, and `vendor-state`, and ignores PDFs and backend paths during watch.

Heavy UI is lazy-loaded with `React.lazy` and `Suspense`:

- `OcrUploader` compatibility facade in `App.jsx`; the session and viewer are feature-owned.
- `VariableRewardCapsule` in `ReaderShell.jsx`

Heavy parsers are loaded only when their format is used: PDF.js for PDFs, JSZip for EPUB,
Tesseract for scanned pages.

## Local OCR asset plugin

`localOcrAssets()` is a custom Vite plugin that serves Tesseract assets from `node_modules`
at `/ocr/...` in dev and copies them into `dist/ocr/` on build. This keeps OCR fully offline:
no CDN, no external fetch.

Mapped assets: `worker.min.js`, LSTM and relaxed-SIMD WASM cores, and
`lang/eng.traineddata.gz` from `@tesseract.js-data/eng`.

## Shared and landing components

### `src/shared/components/index.js`

```js
Brand                 Brand mark
LoadingOverlay        Import and load overlay
ErrorBoundary         Subtree and root crash isolation with reset
ThreeDButton          Physical press-feedback button
AmbientDustCanvas     Ambient visual layer
```

### `src/features/landing/components/`

```text
LandingPage.jsx       Hero intake, drag-and-drop, format badges, theme toggle
BookOpeningIntro.jsx  First-visit transition, skippable immediately
LivingShelf.jsx       Curated book shelf with a physical plank and proximity physics
ThreeDBookCard.jsx    3D physical book: prism body, spine, page edges, specular sheen
```

`ThreeDBookCard` uses `useMotionValue`, `useSpring`, and `useTransform` for pointer-following
rotation and a specular highlight, so book cards respond like physical objects.

`LivingShelf` renders a curated set of three openable books (the sample book, a Descartes
excerpt, and a Bookflow research essay on saccadic calm) on a plank whose shadow and lift respond
to pointer proximity through CSS custom properties driven by `requestAnimationFrame`. It stores a
`shelf_shadow` preference and returns early under `prefers-reduced-motion`.

Both are landing-only. They never render inside the reading column.

Detail: [[Screen Architectures]], [[Motion and Transitions]].

## Performance marks

`src/shared/lib/perfMarks.js` exposes named marks and measure helpers consumed by performance
tooling:
`bookflow:import-selected`, `bookflow:validation-done`, `bookflow:native-text-done`,
`bookflow:ocr-start`, `bookflow:ocr-done`, `bookflow:chapters-done`,
`bookflow:reader-mounted`.

Detail: [[Success Metrics]], [[Testing Pipeline]].

## Resilience

- `ErrorBoundary` wraps the app root and the reader subtree with a reset action.
- `getSafeStorage()` probes `localStorage` and falls back to an in-memory `Map`, so private
  browsing and blocked storage do not crash the app.
- Import has a graceful path: PDF progressive processing, blocking parse for EPUB/TXT/Markdown, and
  an explicit optional backend OCR action for scans the local path cannot recover. A local error
  never triggers an automatic upload or backend call.

Related: [[Storage and Persistence]], [[Import Scheduler]], [[Data Flow]].