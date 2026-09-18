---
title: Full-Stack Overview
type: concept
status: verified
updated: 2026-09-18
tags: [bookflow, architecture, fullstack]
source-files: [src/App.jsx, backend/main.py, vite.config.js, package.json]
---

# Full-Stack Overview

## Two roles, one product

Bookflow splits into a browser application and an optional Python service. The split is not
for architecture fashion. It exists because document parsing is private work that a browser
can already do, while heavy visual OCR is not something a browser should brute-force for
hundreds of pages.

| Role | Runs in | Responsibility |
| --- | --- | --- |
| Primary | Browser | Import, parse, normalize, render, focus, notes, persistence |
| Accelerator | FastAPI service | Scanned-page visual OCR with high concurrency and streaming progress |

A user who never touches the backend still gets the complete reading experience for digital
PDFs, EPUB, TXT, and Markdown.

## Boundary diagram

```text
+---------------------------------------------------------------+
| Browser (React 19 + Vite 8)                                   |
|                                                               |
|  LandingPage --> App.jsx --> ReaderShell --> ReaderPage        |
|      |              |                                          |
|      |              +--> document-import                      |
|      |                     |-- documentParsers.js             |
|      |                     |-- documentManifest.js            |
|      |                     |-- importScheduler.js             |
|      |                     |-- importCoordinator.js           |
|      |                     |-- backendOcrFallback.js          |
|      |                     +-- pdfOcr.js (Tesseract WASM)       |
|      |                                                        |
|      +--> localStorage (settings, per-document session)       |
+-------------------------------|-------------------------------+
                                | /api proxy in dev
                                v
+---------------------------------------------------------------+
| FastAPI service (optional)                                    |
|                                                               |
|  POST /api/ocr/scan -------> job created, background pipeline  |
|  GET  /api/ocr/progress/{id} -> SSE per-page progress          |
|  POST /api/ocr/cancel/{id} --> abort and free buffers          |
|  /api/documents/*  /api/reader/*  /api/health                 |
|                                                               |
|  PyMuPDF render (ThreadPoolExecutor) -> PaddleOCR -> HF route  |
+---------------------------------------------------------------+
```

## Why the frontend is authoritative

1. Privacy. The default path never leaves the device.
2. Availability. No account, no network, no server required to read.
3. Cost. Zero inference spend on documents the browser can already read.
4. Determinism. Local parsers produce stable, inspectable output.

## Why the backend exists

1. Scanned books. Image-only pages need real visual recognition.
2. Concurrency. Python can rasterize and dispatch pages far faster than a browser tab.
3. Batching. Fixed-size batches keep memory bounded on 500+ page books.
4. Streaming. SSE gives page-by-page feedback instead of a blocking wait.

## The integration seam

The seam is one function: `scanPdfViaBackend(file, onProgress, { signal, batchSize, ocrProfile })`.
It returns a normalized book with `chapters` derived from `Page N` labels. Because the shape
matches the local parser output, the reader does not branch on origin.

Detail: [[OCR-Frontend Sync Contract]], [[Normalized Book Contract]].

## Degradation behaviour

| Situation | Behaviour |
| --- | --- |
| Backend not running | Local parsing continues; backend path surfaces a clear error |
| Local PDF parse fails | `isBackendFallbackError` routes to the backend scan |
| Backend scan fails | User sees the failure; nothing is silently dropped |
| `localStorage` blocked | `getSafeStorage()` falls back to an in-memory store |
| Component throws | `ErrorBoundary` isolates the subtree with a reset action |

## Dev wiring

- Vite serves on port 3000 and proxies `/api` to `http://127.0.0.1:8000`.
- `apiBase()` reads `import.meta.env.VITE_API_URL` when set, otherwise uses the proxy path.
- `base: './'` means the built app works from any static host subpath.

Details: [[Dev Setup]], [[Environment Config]], [[Frontend Architecture]], [[Backend Architecture]].