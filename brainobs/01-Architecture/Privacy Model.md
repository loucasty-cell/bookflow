---
title: Privacy Model
type: concept
status: verified
updated: 2026-09-25
tags: [bookflow, architecture, privacy, trust]
source-files: [AGENTS.md, README.md, src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/hooks/useOcrSession.js, src/features/document-import/components/OcrUploader.jsx, src/features/library/lib/durableStorage.js, backend/main.py, updateOCRdata.md]
---

# Privacy Model

Privacy is a product feature here, not a compliance footnote. It is also the honest answer to
"why not just use a cloud reader".

## The default

```text
Import -> browser memory -> normalize -> render -> local metadata only
```

On this default path, document text stays in browser memory. Bookflow stores settings, progress,
bookmarks, notes, and library metadata locally; the active lifecycle does not send book contents
to a server. No account, no upload, and no telemetry containing book text.

## What each path does

| Path | Network activity | Content sent |
| --- | --- | --- |
| Native PDF text | None | Nothing |
| Local Tesseract OCR | None (assets served locally) | Nothing |
| EPUB / TXT / Markdown | None | Nothing |
| Backend OCR scan | Only after the user explicitly starts the optional scan | Page images for the submitted PDF; the local import error does not auto-upload |
| Social resonance (planned) | Hashes only | SHA-256 paragraph hashes, never text |

## Local OCR asset locality

The `localOcrAssets()` Vite plugin serves Tesseract worker, WASM cores, and English training
data from `node_modules` at `/ocr/...` and copies them into `dist/ocr/`. There is no CDN
dependency, so local OCR works with the network fully off.

Detail: [[Local Tesseract.js]].

## Backend OCR disclosure

When the user explicitly starts the accelerated path, the UI states the boundary plainly:

```text
"Scanned PDF pages are sent only after you start this optional scan"
"Ingesting PDF in memory..."
"Scanning Page N of M"
"Use private on-device OCR"
```

A local parse error is reported with a choice to open the optional OCR action. It never starts
that action or uploads the file by itself.

The user gets a cancel action, and cancelling calls `POST /api/ocr/cancel/{job_id}` so the
in-memory buffers are released.

Detail: [[SSE Progress Streaming]], [[OCR-Frontend Sync Contract]].

## Backend handling rules

- Zero server-side content persistence. Page text and images live in memory for the job only.
- The browser library is metadata-only; its OPFS/IndexedDB adapter is public but is not wired into
  the current document lifecycle.
- Buffers are cleared on completion, failure, and cancellation.
- Image bytes, page text, and authorization headers are never logged.
- `HF_TOKEN` and provider keys stay in backend secrets, never in the browser bundle.
- MIME type, dimensions, decompression size, and page count are validated before processing.
- Jobs are pruned by TTL so nothing accumulates.

Detail: [[Backend Architecture]], [[Environment Config]].

## Anonymity by construction in the social layer

The planned asynchronous marginalia layer matches readers by hashing paragraph text. The
server receives a hash and a reaction, not the paragraph. Someone who has the same book can
derive the same hash and see community reflections, and nobody has to upload a library.

Detail: [[Social Resonance]].

## What Bookflow must never do

- Send book contents to analytics, logs, or third-party AI without explicit approval.
- Persist document text server-side.
- Require an account to read a local file.
- Hide when content leaves the device.

## Claim discipline

Approved wording:

- "Processes imported documents on your device by default."
- "Uses native PDF text when available and OCR only when needed."
- "Optional local OCR acceleration is available."
- "The remote scan runs only after you explicitly start it, and you can cancel it."

Not allowed:

- "Nothing ever leaves your device" when a remote scan is enabled.
- "OCR is 100 percent accurate."
- "Your data is anonymized" without stating exactly what is sent.

Related: [[Ethical Guardrails]], [[Invariants]].