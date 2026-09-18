---
title: Privacy Model
type: concept
status: verified
updated: 2026-09-18
tags: [bookflow, architecture, privacy, trust]
source-files: [AGENTS.md, README.md, src/features/document-import/lib/backendOcrFallback.js, backend/main.py, updateOCRdata.md]
---

# Privacy Model

Privacy is a product feature here, not a compliance footnote. It is also the honest answer to
"why not just use a cloud reader".

## The default

```text
Import -> browser memory -> normalize -> render -> local storage of settings only
```

On this path nothing about the document leaves the device. No account, no upload, no
telemetry containing book text.

## What each path does

| Path | Network activity | Content sent |
| --- | --- | --- |
| Native PDF text | None | Nothing |
| Local Tesseract OCR | None (assets served locally) | Nothing |
| EPUB / TXT / Markdown | None | Nothing |
| Backend OCR scan | Only when the user starts it | Page images for pages the browser could not read |
| Social resonance (planned) | Hashes only | SHA-256 paragraph hashes, never text |

## Local OCR asset locality

The `localOcrAssets()` Vite plugin serves Tesseract worker, WASM cores, and English training
data from `node_modules` at `/ocr/...` and copies them into `dist/ocr/`. There is no CDN
dependency, so local OCR works with the network fully off.

Detail: [[Local Tesseract.js]].

## Backend OCR disclosure

When the accelerated path runs, the UI states it plainly through the progress callback:

```text
"Local reading failed, trying the accelerated backend scan..."
"Your file is uploaded only because local parsing could not read it. Cancel anytime."
"Repair-tolerant backend scan in progress. Cancel anytime."
```

The user gets a cancel action, and cancelling calls `POST /api/ocr/cancel/{job_id}` so the
in-memory buffers are released.

Detail: [[SSE Progress Streaming]], [[OCR-Frontend Sync Contract]].

## Backend handling rules

- Zero content persistence. Page text and images live in memory for the job only.
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
- "The remote scan runs only when you start it, and you can cancel it."

Not allowed:

- "Nothing ever leaves your device" when a remote scan is enabled.
- "OCR is 100 percent accurate."
- "Your data is anonymized" without stating exactly what is sent.

Related: [[Ethical Guardrails]], [[Invariants]].