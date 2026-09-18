---
title: OCR Decision Tree
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, ocr, decision, pipeline]
source-files: [src/features/document-import/lib/pdfParser.js, src/features/document-import/lib/pdfOcr.js, src/features/document-import/lib/backendOcrFallback.js, backend/main.py, updateOCRdata.md]
---

# OCR Decision Tree

The ladder that decides where a page gets read. This is the single most important OCR concept
in the project: OCR is a repair mechanism that runs only where text is missing.

## The ladder

```text
1  Is the PDF readable at all?
   no  -> report a clear error

2  Does the page have selectable text?
   yes -> native text extraction, done (sub-millisecond when >= 15 words)
   no  -> continue

3  Can the browser OCR it locally?
   yes -> Tesseract.js WASM, page stays on device, done
   no  -> continue

4  Is the optional backend reachable?
   yes -> POST /api/ocr/scan, SSE progress, page images leave the device with consent
   no  -> report an actionable error naming the backend address
```

## Tier 1: native text fast path

A page with a usable text layer is never rasterized. The backend applies an explicit threshold:
a page with 15 or more words of selectable text takes the instant path and bypasses visual OCR
entirely.

Why this matters:

- It is the highest quality result available, since it is the publisher's own text.
- It avoids burning GPU or inference budget on pages that do not need it.
- It keeps the default path fully private even when the backend is running.

Detail: [[PDF Parsing]].

## Tier 2: local Tesseract.js

For image-only pages, local WASM OCR runs in the browser. This is the privacy-preserving repair
path and the default for scanned English pages.

Costs to state honestly:

- Clean printed pages work well. Photos with perspective, glare, or blur degrade.
- A 400 to 600 page scan takes minutes, not seconds, on typical hardware.
- The bundled model targets English.

Detail: [[Local Tesseract.js]].

## Tier 3: backend OCR

When local reading fails, the accelerated path activates with explicit user-facing disclosure.
The frontend messages this plainly:

```text
"Local reading failed, trying the accelerated backend scan..."
"Your file is uploaded only because local parsing could not read it. Cancel anytime."
```

The scan is cancellable at any time and cancellation frees the server-side buffers.

Detail: [[Backend OCR Engine]], [[SSE Progress Streaming]].

## Tier 4: honest failure

If every option fails, the user gets a specific message. Two examples of the real wording:

```text
"Cannot reach the OCR backend at http://localhost:8000. Start it, then retry."
"The backend scan finished but found no readable text in this PDF."
```

Naming the address and the failure mode is the difference between a dead end and a fixable
problem.

## Failure handling inside the backend

A page failure does not fail the job. Unreadable pages are collected into `failed_pages` and
returned to the client, which surfaces them as `skippedPages`. Only when no page succeeds does
the job fail, and then the message lists the page numbers.

Detail: [[Backend Architecture]].

## Decision inputs at a glance

| Input | Default path |
| --- | --- |
| Digital PDF | Native text extraction |
| Scanned PDF | Render image-only pages, then OCR |
| Camera photo of a page | Image preprocessing, then OCR |
| Mixed PDF | Per-page decision: native where available, OCR where not |

## What is never done

- OCRing a page that already has good text.
- Rendering an entire book into memory at once.
- Discarding a page that failed to parse without reporting it.
- Uploading a document as a whole by default.

Related: [[Invariants]], [[Privacy Model]], [[Backlog P0-P1-P2]].