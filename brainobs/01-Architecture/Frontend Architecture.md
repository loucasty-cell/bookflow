---
title: Frontend Architecture
type: concept
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, frontend, react]
source-files: [src/App.jsx,src/main.jsx,src/styles.css,vite.config.js,vitest.config.js,playwright.config.js,eslint.config.js,src/store/readerStore.js,src/store/uiStore.js,src/shared/lib/index.js,src/shared/components/index.js,src/shared/graphics/quality.js,src/shared/motion/presets.js,src/features/reader/index.js,src/features/document-import/index.js,src/features/library/index.js,src/features/landing/index.js,src/features/lens-bar/index.js,src/features/widgets/index.js,src/features/scroll/index.js]
---

# Frontend Architecture

Measured 2026-10-02 against `main` at tree `cb3c71f`. Every claim below cites a file that was read
during this pass.

## Framework layer

| Piece | Version | Role |
| --- | --- | --- |
| React | 19.0.0 | Component tree, concurrent rendering |
| Vite | 8.2.2 | Dev server, HMR, production bundling |
| Zustand | 5.0.15 | Global state; one persisted store, one ephemeral store |
| Framer Motion | 13.1.1 | Spring physics and `AnimatePresence` |
| SWR | 2.5.1 | Installed but unused by any current source path |
| Three.js | 0.186.0 | Ambient dust layer only, lazily imported |
| Tailwind CSS | 4.3.3 | Utility-only Vite layer without preflight; semantic CSS stays authoritative |
| Lucide React | 0.468.0 | Icon set |

`base: './'` in `vite.config.js` keeps asset paths relative. `build.target` is `es2022`.
There are **no path aliases**: every cross-directory import is a relative path.

## Repository shape

```text
src/
  main.jsx                  Root DOM mount, wrapped in ErrorBoundary, imports ./styles.css
  App.jsx                   Root composer: app state, import, session, feature wiring
  styles.css                13-line @import manifest, no tokens of its own
  styles/                   12 imported stylesheets
  components/               Cross-feature compat facades, view split, capsule/intervention CSS
  features/                 Seven features, each with a public index.js barrel
  shared/                   lib, components, motion, graphics
  store/                    readerStore.js, uiStore.js
  assets/                   bookflow-quill.png, bookflow-opening-intro.mp4
```

`main.jsx` is the only place the stylesheet graph enters the bundle:

```js
import './styles.css'
```

`App.jsx` renders `AppLandingView` and `AppReaderView` from `src/components/`, and imports only
through feature barrels plus `src/store/`.

## Seven features

Every feature exposes a public API from `src/features/<name>/index.js`. Internal files are private.

| Feature | Subfolders | Feature-root files | Barrel exports |
| --- | --- | --- | --- |
| `reader` | `components/`, `hooks/`, `lib/` | `config.js`, `index.js` | `ReaderShell`, `ReaderPage`, `SelectionTooltip`, `CommandPalette`, `FocusBarHost`, `FocusBarAmbient`, all reader hooks, `DEFAULT_SETTINGS`, `FOCUS_RAIL_RATIO`, focus-rail and viewport helpers, formatters, `useScrollPosition` |
| `document-import` | `components/`, `hooks/`, `lib/` | `index.js` | `parseDocument`, `ACCEPTED_FILES`, validation, the full manifest API, `createImportScheduler`, `getConcurrency`, all three progressive coordinators, `scanPdfViaBackend`, `isBackendFallbackError`, `useDocumentImport` |
| `library` | `components/`, `hooks/`, `lib/` | `index.js`, `library.css` | `libraryStore` API, selectors, reading speed and stats, achievements, goals, the durable adapter, `ResumeCard`, `RecentShelf`, `SessionRecap`, `BadgeGallery`, `useReadingSession` |
| `landing` | `components/` only | `index.js`, `sampleBook.js` | `LandingPage`, `BookOpeningIntro`, `ThreeDBookCard`, `LivingShelf` |
| `lens-bar` | `components/`, `hooks/`, `lib/`, `store/` | `index.js`, `lens-bar.css` | `LensBar`, `LensBarLauncher`, `LensBarMenu`, `useLensConsent`, `useLensTheme`, `useSelectionMemory`, `useDraggableBar`, `useLensRequest`, position and plain-text helpers, `useLensBarStore` |
| `widgets` | `components/`, `lib/` incl `lib/spec/` | `index.js` | `WidgetFrame`, `WidgetMeter`, `WidgetRing`, five `BookflowWidgets`, `WidgetGrid`, `WidgetGridSkeleton`, widget tokens, `widgetSpec` lookup |
| `scroll` | none, flat | `index.js`, `smoothScroll.js`, `useReaderSmoothScroll.js` | `startSmoothScroll`, `stopSmoothScroll`, `startReaderSmoothScroll`, `stopReaderSmoothScroll`, `stopAllSmoothScroll`, `scrollContainerTo`, `getSmoothScroll`, `isSmoothScrollActive`, `isNestedScroller`, `SMOOTH_SCROLL_REASON`, `useReaderSmoothScroll` |

Two structural consequences worth naming:

- `lens-bar` is the **only** feature with its own `store/` directory. It deliberately keeps its
  own Zustand store rather than widening `src/store/`.
- `scroll` has no subfolders at all. It is three files and a barrel.
- `landing` has no `lib/`. `sampleBook.js` sits at the feature root.

### The boundary rule and its one violation

Cross-feature imports must go through the other feature's `index.js`. There are exactly seven
cross-feature import sites in `src/features/`, and six of them respect the rule:

| Site | Target | Through barrel |
| --- | --- | --- |
| `landing/components/LandingPage.jsx:13` | `../../document-import/index.js` | yes |
| `landing/components/LandingPage.jsx:14` | `../../library/index.js` | yes |
| `reader/components/ReaderOverlays.jsx:3` | `../../lens-bar/index.js` | yes |
| `reader/components/ReaderPage.jsx:6` | `../../scroll/index.js` | yes |
| `reader/lib/useScrollPosition.js:4` | `../../scroll/index.js` | yes |
| `reader/lib/progressLabel.js:17` | `../../library/index.js` | yes |
| `widgets/components/WidgetGrid.jsx:8` | `../../library/index.js` | yes |
| `reader/lib/progressLabel.test.js:2` | `../../library/lib/libraryStore.js` | **no** |

The single violation is in test code and is currently the only one. Nothing enforces the rule:
`eslint.config.js` has no import-boundary plugin and does no type-aware linting.

## State management

Two Zustand stores under `src/store/`, both written as factories so tests can inject storage.

### `readerStore.js` (80 lines)

Exports `createReaderStore(storage)` and `useReaderStore`. Wrapped in `persist` with
`name: 'bookflow-reader-storage'` and `createJSONStorage(getSafeStorage)`.

| Field | Persisted | Purpose |
| --- | --- | --- |
| `settings` | yes | Reading preferences merged over `DEFAULT_SETTINGS` |
| `progress` | no | Reading progress, clamped 0-100 and rounded |
| `bookmarks` | no | Bookmarked paragraph ids |
| `notes` | no | Margin notes |

Actions: `setSettings`, `setProgress`, `setBookmarks`, `toggleBookmark`, `setNotes`, `addNote`
(prepends), `deleteNote`.

**The partialize decision is the one to understand.** `readerStore.js:72-74`:

```js
partialize: (state) => ({
  settings: state.settings
})
```

`progress`, `bookmarks`, and `notes` exist in the store but are deliberately excluded from the
persisted payload. They are per-document, and `useReaderPersistence` re-hydrates them from
`bookflow:document:{id}` on open. Without `partialize` the single global key would hold the last
book's notes and hand them to the next book.

Two more guards:

- `merge` (lines 59-71) re-applies `DEFAULT_SETTINGS` on rehydrate, so a settings object saved by
  an older build gains new keys automatically with no migration.
- `merge` also normalises `bookmarks` and `notes` through `normalizeArray`, so a hand-edited or
  poisoned `localStorage` payload cannot inject a non-array into state.

`setProgress` coerces to a finite number, clamps to `0..100`, and rounds. Non-finite input becomes `0`.

### `uiStore.js` (67 lines)

Exports `createUIStore(initialState)` and `useUIStore`. **No `persist` middleware.** Every value
resets on reload by design; this store is transient UI state.

State: `settingsOpen`, `sidebarOpen`, `sidebarCollapsed`, `notesOpen`, `ocrOpen`,
`showIntervention`, `showEntryIntro`, `dragging`, `loading`, `error`, `focusBarOpen` (default `true`).

Actions: `setSettingsOpen`, `setSidebarOpen`, `setSidebarCollapsed`, `setNotesOpen`, `setOcrOpen`,
`setShowIntervention`, `setShowEntryIntro`, `setDragging`, `setFocusBarOpen`, `setLoading`,
`setError`. The boolean setters accept a boolean or an updater function; `setError` accepts a
string or an `Error`.

### Third store, inside a feature

`lens-bar/store/lensBarStore.js` is a hand-rolled Zustand store. It reads and writes
`bookflow:lens-bar` itself through `getSafeStorage`/`safeParse`/`setStorageItem`, not the
`persist` middleware. It stores ratio, mode, and target language only, and its module comment
states why consent is absent: consent belongs to the Reading Lens hook, and duplicating it would
give the reader two disagreeing answers about whether a passage may leave the device.

## Four shared layers

`src/shared/` exists because two or more features actually use the code.

### `shared/lib/` (barrel at `index.js`)

| Module | Exports |
| --- | --- |
| `haptics.js` | `triggerHaptic`, `HAPTIC_PATTERNS` |
| `storage.js` | `memoryStorage`, `getSafeStorage`, `getStorageItem`, `setStorageItem`, `removeStorageItem`, `safeParse`, `documentStorageKey` |
| `text.js` | `normalizeText`, `splitSentences`, `splitParagraphs`, `wordCount`, `stripMarkdown`, `documentId`, `formatClassification`, `classifyParagraph` |
| `perfMarks.js` | `mark`, `measure`, `getMarks`, `getMeasures`, `clearMarks`, `clearMeasures` |
| `focusManagement.js` | `useModalFocus` - the single focus-trap implementation |
| `usePointerCssVars.js` | writes `--pointer-x` / `--pointer-y` |
| `useProximityCssVars.js` | configurable `properties`, `format`, `reachY` 320, `reachXPadding` 120 |

`getSafeStorage()` writes and deletes a `__bf_storage_test__` probe key inside `try`/`catch` and
returns `memoryStorage` (an in-memory `Map` with the same interface) when storage is blocked.
`perfMarks.js` namespaces every name with the `bookflow:` prefix and swallows exceptions, so a
missing `performance` API cannot break a read.

### `shared/components/`

`Brand`, `LoadingOverlay`, `ErrorBoundary`, `ThreeDButton`, and `AmbientDustCanvas`.

`AmbientDustCanvas` is **intentionally absent from the barrel**. The file says so in a comment: it
is the only module that imports `three`, and a static re-export would pull three back into the
entry graph. `LandingPage.jsx:24` therefore lazy-imports it directly by module path.

At 42,485 bytes it is the largest JavaScript module under `src/`.

### `shared/motion/presets.js`

`motionPresets` (`springSoft`, `springSheet`, `fade`, `page`) and `reducedTransition =
{ duration: 0.01 }`. The file comment states values mirror `src/styles/tokens.css` so JS and CSS
stay in step, and that call sites must not inline new easings.

### `shared/graphics/quality.js`

One pure decision, free of Three.js and React, so it is testable with a fake window.
`getGraphicsQuality(win)` returns `{ tier, dpr, particles, glyphs, targetFps }`.

| Tier | dpr | particles | glyphs | targetFps |
| --- | --- | --- | --- | --- |
| `STATIC` | 1 | 0 | 12 | 0 |
| `BALANCED` | 1.25 | 18 | 22 | 30 |
| `FULL` | 1.75 | 32 | 38 | 60 |

Decision order:

1. No `window`, or `prefers-reduced-motion: reduce` -> `STATIC`. **Reduced motion short-circuits
   before any hardware probe is read.**
2. Narrow (`max-width: 720px`, `GRAPHICS_BREAKPOINT = 720`), touch (`navigator.maxTouchPoints > 0`),
   or weak (`hardwareConcurrency <= 4` or `deviceMemory <= 4`) -> `BALANCED`.
3. Otherwise `FULL`.

`dpr` is then clamped to the tier ceiling. Detail: [[Graphics Quality Tiers]].

## Storage keys

Fifteen keys plus two non-localStorage stores. Every one was located by search on 2026-10-02.

| Key | Backend | Defined at | Holds |
| --- | --- | --- | --- |
| `bookflow-reader-storage` | zustand `persist` | `src/store/readerStore.js:57` | `settings` only, per `partialize` |
| `bookflow:settings` | `localStorage` | `src/features/reader/hooks/useReaderPersistence.js:22` | the same settings object, mirrored |
| `bookflow:document:{id}` | `localStorage` | `src/shared/lib/storage.js:65` | per-document `progress`, `activeParagraphId`, `bookmarks`, `notes`, `scrollTop` |
| `bookflow:quick-notes:{bookId}` | `localStorage` | `useReaderPersistence.js:44` and `:71`, `useReaderSession.js:90`, `NotesPanel.jsx:203` | the notes array alone, for fast rehydration |
| `bookflow:library` | `localStorage` | `src/features/library/lib/libraryStore.js:13` | metadata index, `LIBRARY_VERSION` 1 |
| `bookflow:goals` | `localStorage` | `src/features/library/lib/readingGoals.js:15` | annual reading goal state |
| `bookflow:awarded-badges` | `localStorage` | `src/features/library/hooks/useReadingSession.js:11` | awarded achievement ids |
| `bookflow:lens-bar` | `localStorage` | `src/features/lens-bar/store/lensBarStore.js:15` | lens bar ratio, mode, language |
| `bookflow:lens_quota` | `localStorage` | `src/features/reader/hooks/useReadingLens.js:10` | client-side quota mirror |
| `bookflow:lens_position` | `localStorage` | `src/features/reader/hooks/useReadingLens.js:11` | lens panel position |
| `bookflow:notes-view-mode` | `localStorage` | `src/features/reader/components/NotesPanel.jsx:38` | notes list/grid toggle |
| `bookflow:notes-bold-preference` | `localStorage` | `NotesPanel.jsx:39` | notes bold-text preference |
| `bookflow:entry-intro-seen` | **`sessionStorage`** | `src/App.jsx:23`, written `:300`, read `:313` | first-visit intro flag, dies with the tab |
| `bookflow-durable` v1 | **IndexedDB** | `src/features/library/lib/durableStorage.js:1-7` | stores `DOCUMENTS` and `UNITS` |
| `bookflow-units` | **OPFS** directory | `durableStorage.js:138` | fallback when IndexedDB is unavailable |

`bookflow:library` carries its own limits: `LIBRARY_VERSION` 1, `MAX_LIBRARY_ENTRIES` 60,
`FINISHED_PROGRESS` 98, and `SHELVES = { READING, FINISHED, TO_READ }`.

`WidgetGrid.jsx:52` also listens for a `bookflow:library-change` window event. That is a custom
event, not a storage key.

Detail: [[Storage and Persistence]].

## The stylesheet map

`src/styles.css` is a 13-line `@import` manifest. It holds **no tokens of its own** and is 463
bytes. Import order, which is also cascade order:

```text
 1  lenis/dist/lenis.css      node_modules, first so local rules can override
 2  styles/tokens.css         semantic design tokens
 3  styles/tailwind.css       utility layer
 4  styles/landing.css
 5  styles/themes.css         paper, dusk, kyoto, monocodex, remix
 6  styles/reader.css         largest, 47,116 bytes
 7  styles/responsive.css
 8  styles/motion.css
 9  styles/components.css
10  styles/themes-overrides.css
11  styles/landing-components.css
12  styles/reader-extras.css
13  styles/reading-lens.css
```

Five themes are defined: `paper`, `dusk`, `kyoto`, `monocodex`, `remix`.

Feature-local CSS is imported by the component that owns it, not by the manifest:
`library.css` (imported by `ResumeCard`, `RecentShelf`, `SessionRecap`, `BadgeGallery`),
`lens-bar.css` (by `LensBar.jsx`), `widgets/lib/widgets.css` (by `WidgetFrame.jsx`),
`components/capsule.css`, `components/intervention.css`.

Total under `src/`: **18 CSS files, 224,505 bytes**.

Detail: [[Design Tokens]], [[Themes and Atmospheres]].

## Code splitting

`manualChunks` in `vite.config.js` fires only for `node_modules` paths:

| Chunk | Packages |
| --- | --- |
| `vendor-three` | `three` |
| `vendor-motion` | `framer-motion` |
| `vendor-icons` | `lucide-react` |
| `vendor-react` | `react`, `react-dom` |
| `vendor-state` | `zustand`, `swr` |

There is **no chunk for `gsap`, `lenis`, `pdf-lib`, `animejs`, or `@splinetool/runtime`**. Those ride
the entry chunk.

Lazy loading happens at three levels:

- `React.lazy` for cross-feature surfaces: `OcrUploader` and `WidgetGrid` in
  `src/components/AppLandingView.jsx`.
- `React.lazy` for `AmbientDustCanvas`, imported by module path so three stays out of the entry graph.
- Dynamic `import()` inside `document-import` for parsers: PDF.js only for PDFs, JSZip only for
  EPUB, Tesseract only for scanned pages.

`src/components/OcrUploader.jsx` is a four-line compatibility facade over the feature-owned
component. It exists because the barrel convention moved ownership without moving every caller.

### Local OCR asset plugin

`localOcrAssets()` at `vite.config.js:46-77` serves **eight** Tesseract assets from `node_modules`
at `/ocr/...` in dev via middleware, and copies the same eight into `dist/ocr/` on `writeBundle`:
`worker.min.js`, the LSTM, SIMD-LSTM, and relaxed-SIMD-LSTM WASM cores in both `.js` and `.wasm`
forms, and `lang/eng.traineddata.gz` from `@tesseract.js-data/eng`. No CDN, so local OCR works
with the network off.

## Reader constants

| Constant | Value | File |
| --- | --- | --- |
| `FOCUS_RAIL_RATIO` | 0.38 | `reader/lib/readingController.js:1` |
| `MAX_SCROLL_INPUT` | 64 | `readingController.js:2` |
| `SCROLL_INTENT_THRESHOLD` | 96 | `readingController.js:3` |
| `LINE_COOLDOWN` | 240 | `readingController.js:4` |
| `FONT_SIZE_MIN` / `FONT_SIZE_MAX` | 17 / 24 | `reader/config.js:1-2` |
| `LONG_BOOK_PARAGRAPH_THRESHOLD` | 1500 | `reader/hooks/useChapterWindow.js:3` |
| `WINDOW_RADIUS` | 1 | `useChapterWindow.js:4` |
| `ESTIMATED_PARAGRAPH_PX` | 34 | `useChapterWindow.js:5` |
| `ESTIMATED_CHAPTER_CHROME_PX` | 170 | `useChapterWindow.js:6` |
| `MAX_FILE_SIZE` | 50 MiB | `document-import/lib/fileValidation.js:1` |
| `SUPPORTED_EXTENSIONS` | pdf, epub, txt, md, markdown | `fileValidation.js:2` |
| `IMPORT_COMPLETE_DELAY` | 480 ms | `document-import/hooks/useDocumentImport.js:8` |

`DEFAULT_SETTINGS` in `reader/config.js` has **20 keys**. The existing vault copy that listed 19
had dropped `progressDisplay`.

Two open TODOs live in that same file: `backlog-16` reading-mood presets targeting
`src/features/reader/lib/readingMoods.js`, **which does not exist**, and `backlog-19` an automatic
night theme from `prefers-color-scheme`.

`importScheduler.js:14-20` computes concurrency: `1` on a mobile user agent,
`min(3, max(1, floor(hardwareConcurrency / 2)))` on desktop, `2` when `navigator` is absent.

Detail: [[Focus Rail]], [[Import Scheduler]], [[Validation Rules]], [[Typography System]].

## The no-DOM test constraint

`vitest.config.js` is seven lines and its only option is
`test.include: ["src/**/*.test.{js,jsx}"]`. There is **no `environment`, no `setupFiles`, and no
`globals`**, and neither `jsdom` nor `@testing-library` is installed.

Consequences the tests are written around:

- Component tests render with `renderToStaticMarkup` from `react-dom/server`, so there is no
  `document`, no effects, and no interaction. `widgets/widgets.test.jsx:150` reads its own CSS
  with `readFileSync` to assert token values instead.
- Hook tests use a hand-rolled harness that `vi.mock`s `react` outright.
- Any test needing a DOM is a Playwright test, not a unit test.

`playwright.config.js` runs against a production preview build, not the dev server:
`baseURL http://localhost:4175`, `webServer` is `npm run preview -- --port 4175 --strictPort`
with `reuseExistingServer: true`, `channel` is `process.env.PLAYWRIGHT_CHANNEL || undefined`,
`testDir tests/e2e`, `timeout 60000`, `fullyParallel false`, reporter `list`, no `projects` block.

`eslint.config.js` ignores `dist/**`, `.next/**`, `public/**`, `**/.venv/**`,
`**/__pycache__/**`, `backend/build/**`, `backend/dist/**`. Rules are `@eslint/js` recommended,
react-hooks recommended, `no-unused-vars` with `varsIgnorePattern ^(?:[A-Z_]|motion$)`, and
`react-refresh/only-export-components` as a warning with `allowConstantExport`.

## Measured baseline, 2026-10-02

| Command | Result |
| --- | --- |
| `npm run lint` | 0 errors, 1 warning (`CommandPalette.jsx:12`, `react-refresh`) |
| `npm test` | 52 files, 506 tests passing |
| `npm run check:vault` | PASS |
| `npm run build` | 10.53s; chunk-size warnings over 500 kB, plus one `INEFFECTIVE_DYNAMIC_IMPORT` warning for `FocusCard.jsx` |
| `node scripts/security/contrast.mjs` | PASS, 63 pairs checked, 11 skipped as token-absent |
| `pytest backend/tests` | 75 passed, 1 Starlette deprecation warning |
| `npx pyright` | **not re-run**; last known result was 2 environment warnings |

The `INEFFECTIVE_DYNAMIC_IMPORT` warning for `FocusCard.jsx` is a real finding: a dynamic import
that cannot split. Detail: [[Testing Pipeline]].

## Resilience

- `ErrorBoundary` wraps the app root in `main.jsx`; the reader subtree also isolates.
- `getSafeStorage()` falls back to an in-memory `Map`, so private browsing and blocked storage
  cannot crash the app.
- Import degrades in a defined order: native text, then local Tesseract, then a clear local error
  with an optional backend OCR action the user must start. A local error never auto-uploads.

Detail: [[Data Flow]], [[Privacy Model]], [[Invariants]].