---
title: Agent Quickstart
type: briefing
status: living
updated: 2026-10-02
tags: [bookflow, agent, briefing]
refactor: complete
source-files: [AGENTS.md, package.json, src/App.jsx, src/main.jsx, src/styles.css, src/features/reader/config.js, src/features/reader/lib/readingController.js, src/features/document-import/lib/fileValidation.js, src/features/library/lib/libraryStore.js, backend/main.py, backend/app/core/config.py]
---

# Agent Quickstart

A single-note briefing. If you read only one note before touching Bookflow, read this one,
then [[Invariants]].

## 1. What this repository is

```text
bookflow/
  src/                          React 19 + Vite 8 frontend
    main.jsx                    Root mount; imports ./styles.css at line 5
    App.jsx                     Root feature composer and import/library lifecycle
    styles.css                  13-line @import manifest. Holds NO tokens.
    components/                 Lazy modals and compatibility wrappers
    features/                   Seven features, each with an index.js barrel
      reader/                   Reading engine. components/, hooks/, lib/
      document-import/          Client parsers, manifest, scheduler, coordinator, OCR session
      library/                  Metadata library, stats, goals, resume surfaces, durable adapter
      landing/                  Hero intake, drag-and-drop zone, sample books. components/ only
      lens-bar/                 Reading Lens bar. The only feature with a store/ subfolder
      widgets/                  Home widgets and quality tiers
      scroll/                   Smooth scroll. Flat: no subfolders
    shared/                     Four layers
      lib/                      7 modules + barrel
      components/               5 components + barrel
      motion/                   presets.js
      graphics/                 quality.js
    store/                      readerStore.js, uiStore.js, readerStore.test.js
    styles/                     12 stylesheets; tokens live in tokens.css
  backend/                      FastAPI + PyMuPDF + PaddleOCR optional accelerator
    main.py                     613 lines. The app Docker actually serves.
    app/                        Routers, Pydantic v2 schemas, services
      main.py                   82 lines. A SECOND app; the one the tests import.
    tests/                      Pytest suite, 75 tests across 11 test modules
```

Two facts that cause real errors:

- **Design tokens live in `src/styles/tokens.css`, not `src/styles.css`.** The root
  `styles.css` is an import manifest whose lines 1-13 fix the cascade order of the twelve
  stylesheets in `src/styles/`.
- **`backend/` contains two apps.** `backend/tests/conftest.py` imports `app.main`, so
  `pytest backend/tests/` does not exercise the app `backend/Dockerfile` serves.

## 2. Hard rules (violating these fails the task)

1. Book text stays local. Never send contents to a cloud service without explicit approval.
2. Render book text through React text nodes. Never `dangerouslySetInnerHTML` for book contents.
3. Do not add dependencies without explicit approval.
4. Do not add code comments unless asked.
5. Do not use emojis in code, commits, or development output.
6. No `Co-Authored-By` trailers in commits.
7. Do not describe planned features as implemented.
8. Read a file before editing it. Follow neighbouring patterns.
9. Put code in the right feature folder. Import via each feature's `index.js`.
10. Keep the reader calm. Behavioral features are opt-in and never block reading.
11. Never write a vault note with a shell write. A BOM breaks `npm run check:vault`.
12. Reading Lens egress is opt-in per session. No selection means no request.

Detail: [[Invariants]].

## 3. Constants you will need

| Constant | Value | File |
| --- | --- | --- |
| `FOCUS_RAIL_RATIO` | `0.38` | `src/features/reader/lib/readingController.js:1` |
| `MAX_SCROLL_INPUT` | `64` | `src/features/reader/lib/readingController.js:2` |
| `SCROLL_INTENT_THRESHOLD` | `96` | `src/features/reader/lib/readingController.js:3` |
| `LINE_COOLDOWN` | `240` ms | `src/features/reader/lib/readingController.js:4` |
| `FONT_SIZE_MIN` / `FONT_SIZE_MAX` | `17` / `24` | `src/features/reader/config.js:1` |
| Import size ceiling | 50 MB | `src/features/document-import/lib/fileValidation.js` |
| Render DPI (backend) | `96` | `backend/main.py` |
| Backend default batch size | `16` pages | `backend/main.py:88` |
| Max OCR retries | `3` | `backend/main.py:89` |
| Max upload (backend) | `50` MB | `backend/main.py:90`, `backend/app/core/config.py:91` |
| Max batch images (config) | `32` | `backend/app/core/config.py:92` |
| Max PDF pages OCR | `1000` | `backend/app/core/config.py:93` |
| HF response token cap | `2048` | `backend/main.py:78` |
| Library metadata key | `bookflow:library` | `src/features/library/lib/libraryStore.js:13` |
| Library entry cap | `60` | `src/features/library/lib/libraryStore.js:15` |
| Durable storage database | `bookflow-durable` | `src/features/library/lib/durableStorage.js:1` |
| Lens passage bound | `24000` chars | `backend/app/core/config.py:84` |
| Lens timeout | `12.0` s | `backend/app/core/config.py:82` |
| Vault note cap | none | Enforced by convention, not code |

Details: [[Focus Rail]], [[Backend OCR Engine]], [[Environment Config]].

## 4. Default-off reader flags

`src/features/reader/config.js` `DEFAULT_SETTINGS`: `bionic`, `showRewardCapsules`,
`showInterventionModals`, `showSessionRecap`, `showAchievements`, `showDefinitionLookup`, and
`enableAnnualGoal` are all `false`. `showResumeCard` and `useProgressiveImport` are `true`. New
reader-facing flags default to `false` unless explicitly requested.

## 5. Current refactor status

Complete for its scope.

- Seven features exist under `src/features/`, each with an `index.js` barrel.
- Reader session, navigation, input, measurement, persistence, annotations, static-region, and
  chapter-window logic live in `src/features/reader/hooks/`.
- Document import has feature-local parser, manifest, scheduler, and coordinator modules.
- The metadata library has its own public `index.js`. The durable adapter exists but does not
  imply that document text is persisted.
- `src/App.jsx` is a root composer at 11,807 bytes holding application state and composition.
  Import, session, annotation, static-region, and view concerns are in feature hooks and
  components. Keep extracted internals out of the root.
- `backend/main.py` remains the runnable OCR entrypoint alongside the modular `backend/app/`
  routers and services.

One known boundary violation exists, in test code only:
`src/features/reader/lib/progressLabel.test.js:2` deep-imports
`../../library/lib/libraryStore.js`, bypassing the library barrel.

## 6. Commands

```bash
npm run lint                       # eslint .
npm test                           # vitest run
npm run build                      # prebuild runs scripts/copy-assets.js, then vite build
npm run check:vault                # run from the repository root
npm run test:e2e                   # playwright; see the Windows channel note
node scripts/security/contrast.mjs # WCAG gate, not wired to an npm script
pytest backend/tests/ -v
```

There is **no `format` script and no Prettier dependency**, so `.prettierignore` is inert.
There is no `typecheck` script.

On Windows, set the Playwright channel before running e2e:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
```

E2E tests run against a production preview build on port 4175, not the dev server. Run
`npm run build` first or you will test the previous `dist/`.

## 7. Where things belong

| Change | Location |
| --- | --- |
| Client-side parser | `src/features/document-import/lib/` |
| Server-side parser | `backend/app/services/document_service.py` |
| Backend route | `backend/app/routers/` |
| Reader component | `src/features/reader/components/` |
| Reader util | `src/features/reader/lib/` |
| Library metadata and durable adapter | `src/features/library/` |
| Reading Lens bar | `src/features/lens-bar/` |
| Design token value | `src/styles/tokens.css` |
| Theme value | `src/styles/themes.css` |
| Reused by 2 or more features | `src/shared/` |
| Frontend test | Beside the file as `*.test.js` |
| Backend test | `backend/tests/test_*.py` |
| E2E test | `tests/e2e/*.spec.js` |

Full table: [[File Placement Map]].

## 8. Verification before you finish

```bash
npm run lint
npm test
npm run build
npm run check:vault
pytest backend/tests/ -v
git diff --check
```

For reader, parser, or visual work also verify in a real browser: import a representative
document, confirm focus follows scroll, check notes and bookmarks persist across reload, and
confirm no horizontal overflow at 320px and a 390x844 viewport.

CI runs only `lint`, `test`, `build`, and `pytest`. It does **not** run e2e, the vault check,
the contrast gate, or pyright, so a green CI badge is not evidence for those.

Checklist: [[Verification Checklist]].

## 9. Do not claim

- Native App Store or Google Play readiness.
- Universal ebook or language support. Bundled local OCR targets English.
- Perfect book classification. Structure heuristics are heuristic.
- Guaranteed comprehension gains or "addictive reading".
- That free serverless inference reads a 600 page scan in under two minutes.
- That `pyright` currently passes. It was not re-verified on 2026-10-02.

## 10. Next hops

- Architecture: [[Full-Stack Overview]], [[Data Flow]], [[Frontend Architecture]]
- Contracts: [[Normalized Book Contract]], [[Storage and Persistence]]
- OCR: [[OCR Decision Tree]], [[SSE Progress Streaming]]
- Design: [[Design Tokens]], [[Responsive Breakpoints]], [[Figma Inspection Evidence]]
- Strategy: [[Atomic Habits Framework]], [[Ethical Guardrails]], [[Current State Matrix]]