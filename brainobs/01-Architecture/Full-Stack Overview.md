---
title: Full-Stack Overview
type: concept
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, fullstack]
source-files: [src/App.jsx,src/components/AppLandingView.jsx,src/components/AppReaderView.jsx,src/components/ocrErrors.js,src/features/document-import/hooks/useDocumentImport.js,src/features/document-import/lib/backendOcrFallback.js,src/features/reader/hooks/useReaderSession.js,src/features/library/hooks/useReadingSession.js,src/features/reader/hooks/useReadingLens.js,backend/main.py,backend/app/main.py,backend/routers/social.py,vite.config.js,package.json]
---

# Full-Stack Overview

## Two roles, one product

Bookflow splits into a browser application and an optional Python service. The split is not for
architecture fashion. It exists because document parsing is private work a browser can already do,
while heavy visual OCR is not something a browser should brute-force for hundreds of pages.

| Role | Runs in | Responsibility |
| --- | --- | --- |
| Primary | Browser | Import, parse, normalize, render, focus, notes, persistence |
| Accelerator | FastAPI service, optional | Scanned-page visual OCR with high concurrency and streaming progress |

A user who never touches the backend gets the complete reading experience for digital PDFs, EPUB,
TXT, and Markdown. The accelerated path is optional and user-started; its PDF upload ceiling is
50 MB on both sides.

## Boundary diagram

```text
+-----------------------------------------------------------------------+
| Browser (React 19 + Vite 8)                                           |
|                                                                       |
|  AppLandingView ------> LandingPage ---> ambient layer, drag and drop |
|       |                        |                                      |
|       |                        +--> document-import (barrel)          |
|       |                             |-- parsers, manifest, scheduler    |
|       |                             |-- importCoordinator, scheduler   |
|       |                             |-- backendOcrFallback             |
|       |                             +-- pdfOcr.js (Tesseract WASM)      |
|       |                                                              |
|       +--> WidgetGrid (barrel) --> library (barrel)                    |
|                                                                       |
|  AppReaderView ------> ReaderShell --> ReaderPage                     |
|                              |                |                      |
|                              |                +--> scroll (barrel)    |
|                              +--> lens-bar (barrel) + useReadingLens  |
|                                                                       |
|  localStorage x13 | sessionStorage x1 | IndexedDB + OPFS (dormant)    |
+---------------------------|-------------------------------------------+
                            | /api proxy in dev
                            v
+-----------------------------------------------------------------------+
| FastAPI service (optional). backend/main.py builds THIS app.          |
|                                                                       |
|  POST /api/ocr/scan -------> job created, background pipeline         |
|  GET  /api/ocr/progress/{id} -> SSE per-page progress, 8 s heartbeat  |
|  GET  /api/ocr/result/{id} --> markdown, or 202 while processing      |
|  POST /api/ocr/cancel/{id} --> abort and free buffers                 |
|  GET  /health  /api/health  /api/info                                 |
|  /api/ocr/{models,image,batch,pdf,stream/pdf}  (app/ router)          |
|  /api/documents/{validate,parse}  (app/ router)                       |
|  /api/reading-lens (SSE)  /api/reader/*  (app/ router)                |
|  /api/social/*  (mock, uncalled)                                      |
|                                                                       |
|  PyMuPDF render (ThreadPoolExecutor) -> PaddleOCR -> HF vision       |
+-----------------------------------------------------------------------+
```

## Why the frontend is authoritative

1. Privacy. The default path never leaves the device.
2. Availability. No account, no network, and no server required to read.
3. Cost. Zero inference spend on documents the browser can already read.
4. Determinism. Local parsers produce stable, inspectable output.

The frontend wires manifest-first progressive import to PDFs, but the reader opens only after the
PDF coordinator reports a terminal `100%`. EPUB, TXT, and Markdown remain on the blocking parser
until their progressive coordinators are routed from `handleFile`.

## Why the backend exists

1. Scanned books. Image-only pages need real visual recognition.
2. Concurrency. Python rasterizes and dispatches pages far faster than a browser tab.
3. Batching. Fixed 16-page batches keep memory bounded on 500+ page books.
4. Streaming. SSE gives page-by-page feedback instead of a blocking wait.
5. Key custody. Provider credentials stay server-side; the browser never holds one.

## The two integration seams

There are exactly two, and both are narrow on purpose.

### Seam 1: accelerated OCR

```js
scanPdfViaBackend(file, onProgress, { signal, batchSize = 16, ocrProfile = "small" })
```

Uploads the PDF, streams progress, and resolves to a normalized book with `chapters` derived from
`Page N` labels plus `ocrPageCount`, `totalWords`, and `skippedPages`. Because the shape matches
local parser output, the reader does not branch on origin.

The base URL comes from `VITE_API_URL` when set, otherwise from the dev proxy path.
`src/components/ocrErrors.js` exports the same resolution and an error mapper that distinguishes
"backend unreachable" from "backend returned an error".

### Seam 2: Reading Lens

```text
POST /api/reading-lens   SSE, consent-gated
```

`useReadingLens` composes a bounded passage (24,000 chars maximum), sets `consent: true`, and reads a
stream that always terminates with exactly one `completed` or `error` event. With consent withheld
the client answers locally and never calls `fetch`; the backend independently 403s the request.

These two are the **only** places frontend and backend exchange book-derived data. A search of
`src/` for `/api/` returns exactly four live endpoint references:

| Endpoint | Called from |
| --- | --- |
| `POST /api/ocr/scan` | `backendOcrFallback.js:113`, `useOcrSession.js:333` |
| `GET /api/ocr/progress/{id}` | `backendOcrFallback.js:187`, `useOcrSession.js:229` |
| `POST /api/ocr/cancel/{id}` | `backendOcrFallback.js:86` and `:139`, `useOcrSession.js:50` |
| `POST /api/reading-lens` | `useReadingLens.js:9`, as `LENS_ENDPOINT` |

Everything else the backend serves is currently uncalled by the frontend: `/api/ocr/result`,
`/api/ocr/job`, `/api/ocr/models`, `/api/ocr/image`, `/api/ocr/batch`, `/api/ocr/pdf`,
`/api/ocr/stream/pdf`, `/api/documents/validate`, `/api/documents/parse`, `/api/reader/segment`,
`/api/reader/reading-time`, `/api/reader/notes/export`, `/api/reader/notes/import`, `/api/info`,
and both `/api/social` mocks.

Detail: [[OCR-Frontend Sync Contract]], [[Normalized Book Contract]], [[Reading Lens]].

## The backend is not one app

Stated plainly because it changes how you debug a failing endpoint:

| | `backend/main.py` | `backend/app/main.py` |
| --- | --- | --- |
| Builds | `app` at line 131 | a **second** `app` at line 28 |
| Runs | yes. `Dockerfile`, `backend/Dockerfile`, `backend/run.py` all run `uvicorn main:app` | no launch path targets it |
| Tested | no | yes, `backend/tests/conftest.py:8` |

`backend/main.py` mounts the `app/` routers at lines 599-607 inside `except ImportError: pass`, so
the served app *does* expose the router routes. But it defines its own `/api/health` at line 412
first, and FastAPI matches in registration order, so the inline handler wins and the router's
version is dead in the served app. That inline payload has no `timestamp`, which is why
`backend/tests/test_health.py:9` can only pass against the app the tests use.

Detail: [[Backend Architecture]].

## Degradation behaviour

| Situation | Behaviour |
| --- | --- |
| Backend not running | Local parsing continues. The backend path raises a typed, actionable error naming the base URL and suggesting `docker compose up --build` |
| Local PDF parse fails | An actionable local error. The user may explicitly start optional accelerated OCR; nothing auto-uploads |
| Import never reaches terminal | `useDocumentImport.js:229` throws `Local import did not reach a complete terminal state.` with `importTerminal = true`, so the progressive path is not retried silently |
| Backend scan cancelled or over ten minutes | Buffers released server-side; the local error message says so |
| Backend scan finds no readable text | A clear failure naming the PDF, not a silent empty book |
| `localStorage` blocked | `getSafeStorage()` returns the in-memory `Map`; the app runs, session persistence is empty |
| Component throws | `ErrorBoundary` isolates the subtree with a reset action |
| Reduced motion requested | `getGraphicsQuality` short-circuits to `STATIC` before any hardware probe |

## Dev wiring

- Vite serves on port 3000 with `host: 0.0.0.0` and `allowedHosts: true`, so a phone on the LAN can
  load the dev server.
- `/api` proxies to `http://127.0.0.1:8000` with `changeOrigin`.
- `base: './'` means the built app works from any static host subpath.
- `npm run build` runs `prebuild` (`node scripts/copy-assets.js`) first.
- The Tesseract plugin serves eight OCR assets at `/ocr/...` in dev and copies them into `dist/ocr/`.
- Playwright runs against `npm run preview` on port 4175, not the dev server, so browser tests
  exercise the production bundle.

Details: [[Dev Setup]], [[Environment Config]], [[Frontend Architecture]], [[Backend Architecture]].