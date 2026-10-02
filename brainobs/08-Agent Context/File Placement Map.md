---
title: File Placement Map
type: reference
status: verified
refactor: complete
updated: 2026-10-02
tags: [bookflow, agent, structure, placement]
source-files: [structure.md, AGENTS.md, src/styles.css, src/features/reader/index.js, src/features/document-import/index.js, src/features/library/index.js, src/features/lens-bar/index.js, src/features/widgets/index.js, src/features/scroll/index.js, src/shared/lib/index.js, src/store/readerStore.js, src/features/reader/lib/progressLabel.test.js]
---

# File Placement Map

Where each kind of change belongs. Following this keeps the architecture intact as the project
grows.

## Change to location

| Change | Location |
| --- | --- |
| Client-side parser | `src/features/document-import/lib/` |
| Import validation rule | `src/features/document-import/lib/` |
| Import scheduler or manifest change | `src/features/document-import/lib/` |
| Import UI, OCR uploader, import coordinator hook | `src/features/document-import/components/`, `src/features/document-import/hooks/` |
| Library metadata or durable adapter | `src/features/library/` |
| Reading-session accounting hook | `src/features/library/hooks/` |
| Server-side parser | `backend/app/services/document_service.py` |
| OCR provider integration | `backend/app/services/` |
| Backend API route | `backend/app/routers/` |
| Backend schema | `backend/app/models/` |
| Backend setting | `backend/app/core/config.py`, `.env.example` |
| Remote OCR model or endpoint | `.env` (`OCR_MODEL`, `HF_INFERENCE_URL`) |
| Reading Lens consent, request, or bar UI | `src/features/lens-bar/` |
| Lens bar UI state | `src/features/lens-bar/store/lensBarStore.js` |
| Reader visual component | `src/features/reader/components/` |
| Reader-specific logic | `src/features/reader/lib/` |
| Reader session hook | `src/features/reader/hooks/` |
| Reader default setting | `src/features/reader/config.js` |
| Smooth scroll or scroll intent | `src/features/scroll/` |
| Home widget surface | `src/features/widgets/` |
| Landing component | `src/features/landing/components/` |
| Design token value | `src/styles/tokens.css` |
| Theme value | `src/styles/themes.css`, then `src/styles/themes-overrides.css` |
| Reader surface styling | `src/styles/reader.css` |
| Cross-feature lazy modal | `src/components/` |
| Used by two or more features | `src/shared/` |
| Global store | `src/store/` |
| Build configuration | `vite.config.js` |
| Frontend test | Beside the file as `*.test.js` or `*.test.jsx` |
| Backend test | `backend/tests/test_*.py` |
| E2E test | `tests/e2e/*.spec.js` |

## Current feature layout

Seven features under `src/features/`. Every one has an `index.js` barrel.

| Feature | Subfolders | Notes |
| --- | --- | --- |
| `reader/` | `components/`, `hooks/`, `lib/` | The reading engine: shell, page, focus card, panels, tooltip, sessions, navigation, measurement, persistence, annotations, chapter window |
| `document-import/` | `components/`, `hooks/`, `lib/` | Client parsers, manifest, scheduler, coordinator, OCR session |
| `library/` | `components/`, `hooks/`, `lib/` | Metadata library, stats, goals, achievements, resume surfaces, durable adapter |
| `landing/` | `components/` | Hero intake, drag-and-drop zone, sample books |
| `lens-bar/` | `components/`, `hooks/`, `lib/`, `store/` | The only feature with a `store/` subfolder |
| `widgets/` | `components/`, `lib/` | Home widgets and quality-tier surfaces |
| `scroll/` | none | Flat: `index.js`, `smoothScroll.js`, `smoothScroll.test.js`, `useReaderSmoothScroll.js` |

Do not assume a feature has `lib/`. `landing/` has no `lib/`, and `scroll/` has no subfolders
at all. Check before adding a folder.

## Shared, store, and styles

```text
src/shared/            four layers
  lib/                 7 modules + index.js barrel + text.test.js
  components/          5 components + index.js barrel
  motion/              presets.js + presets.test.js
  graphics/            quality.js + quality.test.js

src/store/             readerStore.js, uiStore.js, readerStore.test.js

src/styles.css         13-line @import manifest. Holds NO tokens.
src/styles/            12 stylesheets, import order fixed in styles.css lines 1-13
```

`src/styles.css` is an import manifest only. **Design tokens live in `src/styles/tokens.css`.**
Any instruction to edit tokens in `src/styles.css` is wrong. The only CSS import in the entry
point is `import './styles.css'` at `src/main.jsx:5`, so the manifest order in `src/styles.css`
lines 1-13 determines cascade order. Reordering those lines changes rendered output.

`src/store/` holds two stores, `readerStore.js` and `uiStore.js`, plus `readerStore.test.js`.
A new global store needs a reason it cannot live in `uiStore` or as feature-local state.

## Boundary rules

```text
1  A feature keeps internals private and exposes an index.js public API
2  Never import another feature's internal files
3  src/shared/ only when two or more features actually use the code
4  App.jsx stays focused on state and feature composition
5  Keep parsing inside document-import, reader logic inside reader
6  Design tokens go in src/styles/tokens.css, never in the styles.css manifest
```

## Known boundary violation

There is exactly one, and it is in test code:

```text
src/features/reader/lib/progressLabel.test.js:2
  imports ../../library/lib/libraryStore.js
```

That deep import bypasses the `library` barrel. Production code does not do this. Treat this as a
known exception, not a pattern, and do not copy it.

## Refactor status

The refactor is complete for its scope. All seven features exist, each with a barrel. Reader
session, navigation, input, measurement, persistence, annotations, static-region, and
chapter-window logic live in `src/features/reader/hooks/`. Import, session, annotation,
static-region, and view concerns live in feature hooks and components. `src/App.jsx` is a root
composer at 11,807 bytes and holds application state and composition only. Keep extracted
internals out of the root.

Detail: [[Frontend Public APIs]], [[Frontend Architecture]], [[Agent Quickstart]].

## Where not to put things

| Anti-pattern | Why |
| --- | --- |
| Parser code in `App.jsx` | Breaks feature isolation |
| Reader logic in `shared/` | It is used by one feature |
| Importing `reader/lib/*` from another feature | Use the public API |
| Importing another feature's internal file in a test | Same rule as production code |
| New store for one component's state | Use local state or `uiStore` |
| A new CSS file per component | Extend an existing stylesheet in `src/styles/`, or the feature-local CSS the modal pattern uses |
| A token value in `src/styles.css` | The manifest holds imports only |

## Naming conventions

| Kind | Convention | Example |
| --- | --- | --- |
| React component | PascalCase file and export | `ReaderShell.jsx` |
| Hook | `use` prefix camelCase | `useReaderNavigation.js` |
| Pure lib module | camelCase | `readingController.js` |
| Constants | SCREAMING_SNAKE_CASE | `FOCUS_RAIL_RATIO` |
| Test | Beside the file, `*.test.js` or `*.test.jsx` | `textFormatter.test.js` |
| Stylesheet | kebab-case in `src/styles/` | `reader-extras.css` |
| Python module | snake_case | `ocr_service.py` |
| Python test | `test_*.py` | `test_ocr.py` |

## Adding a new feature

```text
1  Create src/features/<name>/ with an index.js barrel
2  Add components/, lib/, or hooks/ only when the feature needs them
3  Export only the public surface from index.js
4  Add tests beside the logic
5  Consume it from App.jsx or from the owning feature
6  Move anything shared into src/shared/ only when a second consumer appears
7  Add a note in this vault and link it from the relevant MOC
```

## Adding a new backend route

```text
1  Add the router in backend/app/routers/
2  Add Pydantic v2 models in backend/app/models/ with aliases and populate_by_name
3  Wire the router in the app
4  Add a test in backend/tests/
5  Document the endpoint in [[Backend Endpoints]]
```

`backend/tests/conftest.py` imports the app from `app.main`, so a route added only to
`backend/main.py` is not covered by `pytest backend/tests/`. See [[Verification Checklist]] for
which app each gate exercises.

Detail: [[Invariants]], [[Testing Pipeline]], [[Context Sync Protocol]].