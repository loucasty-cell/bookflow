---
title: Agent Quickstart
type: briefing
status: living
updated: 2026-09-26
tags: [bookflow, agent, briefing]
refactor: partial
source-files: [AGENTS.md, package.json, src/App.jsx, src/features/reader/hooks/useReaderNavigation.js, src/features/document-import/lib/importCoordinator.js, src/features/library/index.js, backend/main.py]
---

# Agent Quickstart

A single-note briefing. If you read only one note before touching Bookflow, read this one,
then [[Invariants]].

## 1. What this repository is

```text
bookflow/
  src/                        React 19 + Vite 8 frontend
    main.jsx                  Root mount with ErrorBoundary
    App.jsx                   Root feature composer and import/library lifecycle
    styles.css                Semantic CSS tokens and themes
    components/               Lazy modals: OcrUploader, InterventionModal, VariableRewardCapsule
    features/
      reader/                 Core reading engine, focus rail, typography, notes
        components/           Reader panels and reader shell
        hooks/                Session, navigation, persistence, chapter window
        lib/                  Text formatting, focus, viewport, scroll helpers
      document-import/        Client-side parsers, manifest, scheduler, backend OCR fallback
      library/                Metadata library, resume/session surfaces, durable adapter
      landing/                Hero intake, drag-and-drop, sample book, opening intro
    shared/lib/               storage.js, text.js, perfMarks.js
    store/                    Zustand stores: readerStore, uiStore
  backend/                    FastAPI + PyMuPDF + PaddleOCR optional accelerator
    main.py                   OCR router, job store, SSE streaming
    app/                      Routers, Pydantic v2 models, services
    tests/                    Pytest suite (75 tests across 10 modules)
```

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

Detail: [[Invariants]].

## 3. Constants you will need

| Constant | Value | File |
| --- | --- | --- |
| `FOCUS_RAIL_RATIO` | `0.38` | `src/features/reader/lib/readingController.js` |
| `MAX_SCROLL_INPUT` | `64` | `src/features/reader/lib/readingController.js` |
| `SCROLL_INTENT_THRESHOLD` | `96` | `src/features/reader/lib/readingController.js` |
| `LINE_COOLDOWN` | `240` ms | `src/features/reader/lib/readingController.js` |
| `FONT_SIZE_MIN` / `FONT_SIZE_MAX` | `17` / `24` | `src/features/reader/config.js` |
| Import size ceiling | 50 MB | `src/features/document-import/lib/fileValidation.js` |
| Progressive app path | PDF only; EPUB, TXT, Markdown use blocking `parseDocument` | `src/App.jsx` |
| Render DPI (backend) | `96` | `backend/main.py` |
| Backend batch size | `16` pages | `backend/main.py` |
| Max OCR retries | `3` | `backend/main.py` |
| Fast-path word threshold | `>= 15` words | `backend/main.py` |
| SSE keepalive | `8s` | `backend/main.py` |
| Drop-off detection window | `240000` ms | `src/App.jsx` |
| Max upload (backend) | `50` MB | `backend/main.py`, `backend/app/core/config.py` |
| Library metadata key | `bookflow:library` | `src/features/library/lib/libraryStore.js` |
| Library entry cap | `60` | `src/features/library/lib/libraryStore.js` |
| Durable storage database | `bookflow-durable` | `src/features/library/lib/durableStorage.js` |

Details: [[Focus Rail]], [[Backend OCR Engine]], [[Environment Config]].

## 4. Current refactor status

- Reader session, navigation, persistence, and long-book windowing are extracted into
  `src/features/reader/hooks/`.
- Document import has feature-local parser, manifest, scheduler, and coordinator modules.
- The metadata library has its own public `index.js`; the durable adapter is not yet wired into
  document persistence.
- `App.jsx` remains the application composer and import/library lifecycle owner. The refactor is
  partial, not a reason to move feature internals back into the root.
- `backend/main.py` remains the runnable OCR entrypoint alongside the modular `backend/app/` routers
  and services.

## 5. Commands

```bash
npm run dev            # Vite dev server on port 3000
npm run lint           # ESLint
npm test               # Vitest
npm run build          # Production build
npm run check:vault    # brainobs vault integrity
pytest backend/tests/  # Backend suite
npx pyright            # Backend type check
```

Backend also starts through `backend/start_backend.bat`. Frontend proxies `/api` to
`http://127.0.0.1:8000` in dev.

## 6. Where things belong

| Change | Location |
| --- | --- |
| Client-side parser | `src/features/document-import/lib/` |
| Server-side parser | `backend/app/services/document_service.py` |
| Backend route | `backend/app/routers/` |
| Reader component | `src/features/reader/components/` |
| Reader util | `src/features/reader/lib/` |
| Library metadata and durable adapter | `src/features/library/` |
| Theme or CSS token | `src/styles.css` |
| Reused by 2 or more features | `src/shared/` |
| Frontend test | Beside the file as `*.test.js` |
| Backend test | `backend/tests/test_*.py` |

Full table: [[File Placement Map]].

## 7. Verification before you finish

```bash
npm run lint
npm test
npm run build
npm run check:vault
pytest backend/tests/
git diff --check
```

For reader, parser, or visual work also verify in a real browser: import a representative
document, confirm focus follows scroll, check notes and bookmarks persist across reload, and
confirm no horizontal overflow at 320px and a 390x844 viewport.

Checklist: [[Verification Checklist]].

## 8. Do not claim

- Native App Store or Google Play readiness.
- Universal ebook or language support. Bundled local OCR targets English.
- Perfect book classification. Structure heuristics are heuristic.
- Guaranteed comprehension gains or "addictive reading".
- That free serverless inference reads a 600 page scan in under two minutes.

## 9. Next hops

- Architecture: [[Full-Stack Overview]], [[Data Flow]]
- Contracts: [[Normalized Book Contract]], [[Storage and Persistence]]
- OCR: [[OCR Decision Tree]], [[SSE Progress Streaming]]
- Design: [[Design Tokens]], [[Responsive Breakpoints]], [[Figma Inspection Evidence]]
- Strategy: [[Atomic Habits Framework]], [[Ethical Guardrails]], [[Current State Matrix]]
