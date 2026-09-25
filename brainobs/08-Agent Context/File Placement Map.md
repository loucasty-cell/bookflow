---
title: File Placement Map
type: reference
status: verified
refactor: complete
updated: 2026-09-24
tags: [bookflow, agent, structure, placement]
source-files: [structure.md, AGENTS.md, src/features/document-import/index.js, src/features/reader/index.js]
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
| Library metadata or durable adapter | `src/features/library/` |
| Server-side parser | `backend/app/services/document_service.py` |
| OCR provider integration | `backend/app/services/` |
| Backend API route | `backend/app/routers/` |
| Backend schema | `backend/app/models/` |
| Backend setting | `backend/app/core/config.py`, `.env.example` |
| Remote OCR model or endpoint | `.env` (`OCR_MODEL`, `HF_INFERENCE_URL`) |
| Reader visual component | `src/features/reader/components/` |
| Reader-specific logic | `src/features/reader/lib/` |
| Reader session hook | `src/features/reader/hooks/` |
| Reader default setting | `src/features/reader/config.js` |
| Theme or CSS token | `src/styles.css` |
| Landing component | `src/features/landing/` |
| Cross-feature lazy modal | `src/components/` |
| Used by two or more features | `src/shared/` |
| Global store | `src/store/` |
| Build configuration | `vite.config.js` |
| Frontend test | Beside the file as `*.test.js` |
| Backend test | `backend/tests/test_*.py` |

## Boundary rules

```text
1  A feature keeps internals private and exposes an index.js public API
2  Never import another feature's internal files
3  src/shared/ only when two or more features actually use the code
4  App.jsx stays focused on state and feature composition
5  Keep parsing inside document-import, reader logic inside reader
```

## Refactor status

The reader session, navigation, input, measurement, persistence, annotations, static-region, and chapter-window logic now live in `src/features/reader/hooks/`; import coordination, OCR UI, and the metadata library have their own feature boundaries. `App.jsx` is the root composer and lifecycle owner. Keep extracted internals out of the root.

Detail: [[Frontend Public APIs]], [[Frontend Architecture]].

## Where not to put things

| Anti-pattern | Why |
| --- | --- |
| Parser code in `App.jsx` | Breaks feature isolation |
| Reader logic in `shared/` | It is used by one feature |
| Importing `reader/lib/*` from another feature | Use the public API |
| New store for one component's state | Use local state or `uiStore` |
| A new CSS file per component | Use tokens in `styles.css` unless the modal pattern applies |

## Naming conventions

| Kind | Convention | Example |
| --- | --- | --- |
| React component | PascalCase file and export | `ReaderShell.jsx` |
| Hook | `use` prefix camelCase | `useReaderNavigation.js` |
| Pure lib module | camelCase | `readingController.js` |
| Constants | SCREAMING_SNAKE_CASE | `FOCUS_RAIL_RATIO` |
| Test | Beside the file, `*.test.js` | `textFormatter.test.js` |
| Python module | snake_case | `ocr_service.py` |
| Python test | `test_*.py` | `test_ocr.py` |

## Adding a new feature

```text
1  Create src/features/<name>/ with components/, lib/, and index.js
2  Export only the public surface from index.js
3  Add tests beside the logic
4  Consume it from App.jsx or from the owning feature
5  Move anything shared into src/shared/ only when a second consumer appears
6  Add a note in this vault and link it from the relevant MOC
```

## Adding a new backend route

```text
1  Add the router in backend/app/routers/
2  Add Pydantic v2 models in backend/app/models/ with aliases and populate_by_name
3  Wire the router in the app
4  Add a test in backend/tests/
5  Document the endpoint in [[Backend Endpoints]]
```

Detail: [[Invariants]], [[Testing Pipeline]], [[Context Sync Protocol]].