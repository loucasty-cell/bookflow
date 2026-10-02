---
title: OCR Decision Tree
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, ocr, decision, pipeline]
source-files: [src/features/document-import/lib/pdfParser.js, src/features/document-import/lib/pdfOcr.js, src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/hooks/useOcrSession.js, src/features/document-import/components/OcrUploader.jsx, backend/main.py, backend/app/services/ocr_providers.py]
---

# OCR Decision Tree

The decision tree that decides where a page gets read. This is the single most important OCR concept
in the project: OCR is a repair mechanism that runs only where text is missing, and remote OCR is an
explicit user choice rather than an automatic fallback.

## The ladder

```text
1  Is the PDF readable at all?
   no  -> report a clear local error and offer the explicit optional OCR action

2  Does the page have selectable text?
   yes -> native text extraction, done
   no  -> continue

3  Can the browser OCR it locally?
   yes -> Tesseract.js WASM, page stays on device, done
   no  -> report the local failure; do not upload automatically

4  Did the user explicitly start Optional accelerated OCR?
   yes -> POST /api/ocr/scan, SSE progress, page images leave the device
   no  -> remain local and keep the actionable error visible
```

## Tier 1: native text fast path

A page with a usable text layer is never rasterized. The backend makes this explicit in the provider
ladder: `call_ocr_with_retry` returns immediately with native text when `word_count >= 15`
(`ocr_providers.py:298-306`), and returns native text again when no image was produced
(`:308-316`). The rendering fast path makes the same decision earlier, keeping a page as text when
`word_count >= 15` and `force_ocr` is false (`ocr_rendering.py:74`).

Why this matters:

- It is the highest quality result available, since it is the publisher's own text.
- It avoids burning GPU or inference budget on pages that do not need it.
- It keeps the default path fully private even when the backend is running.

Detail: [[PDF Parsing]], [[Backend OCR Engine]].

## Tier 2: local Tesseract.js

For image-only pages, local WASM OCR runs in the browser. This is the privacy-preserving repair path
and the default for scanned English pages.

Costs to state honestly:

- Clean printed pages work well. Photos with perspective, glare, or blur degrade.
- A 400 to 600 page scan takes minutes, not seconds, on typical hardware.
- The bundled model targets English.

Detail: [[Local Tesseract.js]].

## Tier 3: explicit backend OCR

The accelerated path does not activate merely because local reading failed. After a local failure the
user must open `Optional accelerated OCR` and press Start.

Inside the backend, the provider order is **PaddleOCR first, Hugging Face second**:

| Order | Condition | Behaviour |
| --- | --- | --- |
| 1 | Native text has at least 15 words | Return immediately, no OCR call (`ocr_providers.py:298-306`) |
| 2 | No `image_b64` available | Return native text (`ocr_providers.py:308-316`) |
| 3 | PaddleOCR reachable | Called **first** (`ocr_providers.py:341-357`) |
| 4 | PaddleOCR returned nothing **and** `model_id` is non-empty | Hugging Face vision (`ocr_providers.py:359-401`) |
| 5 | No `model_id` configured | A clear failure message instead of a hung request (`ocr_providers.py:359-367`) |
| 6 | Retries exhausted | Fall back to native text when it has at least 3 words (`ocr_providers.py:448-457`) |

Profiles: requesting `medium` uses `["medium"]`; requesting `small` uses `["small", "medium"]`
(`ocr_providers.py:229`), so a small request auto-retries upward to medium rather than giving up.

A per-page failure inside PaddleOCR is logged and the page continues (`:272-278`). One bad page never
fails the job.

The scan is cancellable at any time and cancellation frees the server-side buffers.

Detail: [[Backend OCR Engine]], [[SSE Progress Streaming]].

## Tier 4: honest failure

If every option fails, the user gets a specific message naming the address and the failure mode.
Naming what failed is the difference between a dead end and a fixable problem.

## Failure handling inside the backend

A page failure does not fail the job. Unreadable pages are collected into `failed_pages` and returned
to the client, which surfaces them as `skippedPages`. Only when no page succeeds does the job fail, and
then the message lists the page numbers.

Detail: [[Backend Architecture]].

## Decision inputs at a glance

| Input | Default path |
| --- | --- |
| Digital PDF | Native text extraction |
| Scanned PDF | Render image-only pages, then local OCR |
| Camera photo of a page | Image preprocessing, then OCR |
| Mixed PDF | Per-page decision: native where available, OCR where not |

## What is never done

- OCRing a page that already has good text.
- Rendering an entire book into memory at once.
- Discarding a page that failed to parse without reporting it.
- Uploading a document as a whole by default.
- Treating a local parse error as permission to call the backend automatically.

Related: [[Invariants]], [[Privacy Model]], [[Backlog P0-P1-P2]], [[OCR-Frontend Sync Contract]].