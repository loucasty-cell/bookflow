---
title: Frontend Architecture
type: concept
status: verified
updated: 2026-09-18
tags: [bookflow, architecture, frontend, react]
source-files: [src/App.jsx, src/main.jsx, vite.config.js, src/store/readerStore.js, src/store/uiStore.js, src/shared/lib/storage.js, src/features/landing/components/LivingShelf.jsx, src/features/landing/components/ThreeDBookCard.jsx]
---

# Frontend Architecture

## Framework layer

| Piece | Version | Role |
| --- | --- | --- |
| React | 19 | Component tree, concurrent rendering |
| Vite | 8 | Dev server, HMR, production bundling |
| Zustand | 5 | Global state with persisted settings |
| Framer Motion | 13 | Spring physics and `AnimatePresence` |
| SWR | 2 | Reactive fetch and cache for remote endpoints |
| Lucide React | 0.468 | Icon set |

`base: './'` in `vite.config.js` keeps asset paths relative so the build runs from any
subdirectory. Build target is `es2022`.

## Feature boundaries

```text
src/
  App.jsx                  Root composer: book state, session hooks, reader wiring
  main.jsx                 Root mount wrapped in ErrorBoundary
  styles.css               Semantic CSS tokens and theme definitions
  components/              Cross-feature lazy modals
  features/
    landing/               LandingPage, BookOpeningIntro
    reader/                Components, lib, hooks, config, public index.js
    document-import/       Parsers, manifest, scheduler, coordinator, OCR fallback
  shared/
    lib/                   storage.js, text.js, perfMarks.js
    components/            ErrorBoundary and shared UI
  store/                   readerStore.js, uiStore.js
```

Rules:

- A feature keeps its internals private and exposes a public API through `index.js`.
- Nothing imports another feature's internal files.
- `src/shared/` is only for code two or more features actually use.
- `App.jsx` owns application state and feature composition, not feature internals.

Detail: [[File Placement Map]].

## Reader feature internals

```text
src/features/reader/
  config.js                         DEFAULT_SETTINGS, FONT_SIZE_MIN, FONT_SIZE_MAX
  index.js                          Public API
  components/
    ReaderPage.jsx
    ReaderShell.jsx                 Layout composition, capsules, interventions
    SettingsPanel.jsx
    NotesPanel.jsx
    ContentsPanel.jsx
    SelectionTooltip.jsx
    SaccadicGuide.jsx
  lib/
    readingController.js            FOCUS_RAIL_RATIO, scroll intent, readingProgress
    focusRail.js                    selectClosestParagraph, selectFocusTarget
    focusEligibility.js             isFocusEligibleChapter
    readerViewport.js               Viewport and alignment helpers
    useScrollPosition.js            Scroll metrics hook
    textFormatter.js                formatParagraphText, getFixationLength
    salienceFormatter.js            Salience weighting
  hooks/
    useReaderSession.js
    useReaderNavigation.js
    useReaderPersistence.js
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

- `OcrUploader` in `App.jsx`
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

`src/shared/lib/perfMarks.js` emits named measures consumed by the benchmark process:
`bookflow:import-selected`, `bookflow:validation-done`, `bookflow:native-text-done`,
`bookflow:ocr-start`, `bookflow:ocr-done`, `bookflow:chapters-done`,
`bookflow:reader-mounted`.

Detail: [[Success Metrics]], [[Testing Pipeline]].

## Resilience

- `ErrorBoundary` wraps the app root and the reader subtree with a reset action.
- `getSafeStorage()` probes `localStorage` and falls back to an in-memory `Map`, so private
  browsing and blocked storage do not crash the app.
- Import has a graceful path: progressive first, blocking parse fallback, then backend OCR
  fallback for unreadable PDFs.

Related: [[Storage and Persistence]], [[Import Scheduler]], [[Data Flow]].