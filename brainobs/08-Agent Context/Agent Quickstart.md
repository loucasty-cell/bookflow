---
title: Agent Quickstart
type: briefing
status: living
updated: 2026-09-18
tags: [bookflow, agent, briefing]
source-files: [AGENTS.md, package.json, src/App.jsx, backend/main.py]
---

# Agent Quickstart

A single-note briefing. If you read only one note before touching Bookflow, read this one,
then [[Invariants]].

## 1. What this repository is

```text
bookflow/
  src/                        React 19 + Vite 8 frontend
    main.jsx                  Root mount with ErrorBoundary
    App.jsx                   Root feature composer, library and reader state
    styles.css                Semantic CSS tokens and themes
    components/               Lazy modals: OcrUploader, InterventionModal, VariableRewardCapsule
    features/
      reader/                 Core reading engine, focus rail, typography, notes
      document-import/        Client-side parsers, manifest, scheduler, backend OCR fallback
      landing/                Hero intake, drag-and-drop, sample book, opening intro
    shared/lib/               storage.js, text.js, perfMarks.js
    store/                    Zustand stores: readerStore, uiStore
  backend/                    FastAPI + PyMuPDF + PaddleOCR optional accelerator
    main.py                   OCR router, job store, SSE streaming
    app/                      Routers, Pydantic v2 models, services
    tests/                    Pytest suite
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
| `FOCUS_RAIL_RATIO` | `0.42` | `src/features/reader/lib/readingController.js` |
| `MAX_SCROLL_INPUT` | `64` | `src/features/reader/lib/readingController.js` |
| `SCROLL_INTENT_THRESHOLD` | `96` | `src/features/reader/lib/readingController.js` |
| `FONT_SIZE_MIN` / `FONT_SIZE_MAX` | `17` / `24` | `src/features/reader/config.js` |
| Import size ceiling | 50 MB | `src/features/document-import/lib/fileValidation.js` |
| Render DPI (backend) | `96` | `backend/main.py` |
| Backend batch size | `16` pages | `backend/main.py` |
| Max OCR retries | `3` | `backend/main.py` |
| Fast-path word threshold | `>= 15` words | `backend/main.py` |
| SSE keepalive | `8s` | `backend/main.py` |
| Drop-off detection window | `240000` ms | `src/App.jsx` |
| Max upload (backend) | `500` MB | `backend/app/core/config.py` |

Details: [[Focus Rail]], [[Backend OCR Engine]], [[Environment Config]].

## 4. Commands

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

## 5. Where things belong

| Change | Location |
| --- | --- |
| Client-side parser | `src/features/document-import/lib/` |
| Server-side parser | `backend/app/services/document_service.py` |
| Backend route | `backend/app/routers/` |
| Reader component | `src/features/reader/components/` |
| Reader util | `src/features/reader/lib/` |
| Theme or CSS token | `src/styles.css` |
| Reused by 2 or more features | `src/shared/` |
| Frontend test | Beside the file as `*.test.js` |
| Backend test | `backend/tests/test_*.py` |

Full table: [[File Placement Map]].

## 6. Verification before you finish

```bash
npm run lint
npm test
npm run build
pytest backend/tests/
git diff --check
```

For reader, parser, or visual work also verify in a real browser: import a representative
document, confirm focus follows scroll, check notes and bookmarks persist across reload, and
confirm no horizontal overflow at 320px and a 390x844 viewport.

Checklist: [[Verification Checklist]].

## 7. Do not claim

- Native App Store or Google Play readiness.
- Universal ebook or language support. Bundled local OCR targets English.
- Perfect book classification. Structure heuristics are heuristic.
- Guaranteed comprehension gains or "addictive reading".
- That free serverless inference reads a 600 page scan in under two minutes.

## 8. Next hops

- Architecture: [[Full-Stack Overview]], [[Data Flow]]
- Contracts: [[Normalized Book Contract]], [[Storage and Persistence]]
- OCR: [[OCR Decision Tree]], [[SSE Progress Streaming]]
- Design: [[Design Tokens]], [[Responsive Breakpoints]]
- Strategy: [[Atomic Habits Framework]], [[Ethical Guardrails]], [[Current State Matrix]]