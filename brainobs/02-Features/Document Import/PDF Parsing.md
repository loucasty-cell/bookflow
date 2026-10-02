---
title: PDF Parsing
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, import, pdf, parser]
source-files: [src/features/document-import/lib/pdfParser.js, src/features/document-import/lib/pdfOcr.js, src/features/document-import/lib/pdfDocument.js, src/features/document-import/lib/importCoordinator.js, src/features/document-import/lib/manifestToBook.js, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/lib/documentParsers.js]
---

# PDF Parsing

PDF is the hard format: fixed layout, unreliable text layers, and frequent damage. Bookflow's
approach is native text first, OCR only where text is missing, and bounded per-page work with a
truthful terminal progress state before the reader opens.

## Pipeline

```text
1  Open with pdfjs-dist worker (lazy-loaded, local)
2  Read page count and metadata
3  For each page: attempt selectable text extraction
4  If a page yields enough text        -> keep native text, no OCR
5  If a page yields little or no text  -> render and OCR that page
6  Clean up page resources (page.cleanup()) to release pixel buffers
7  Assemble chapters in source page order
```

`pdfDocument.js` owns the `pdfjs-dist` document handle and worker lifecycle; `pdfParser.js` owns
page-level extraction; `pdfOcr.js` owns the local OCR path for pages with no usable text layer.
`manifestToBook.js` turns the finished manifest into the normalized book shape. None of these four
are exported from the feature barrel.

## Progressive is the default path for PDFs

PDF is the one format routed through `progressivePdfImport` in `handleFile`, when
`settings.useProgressiveImport !== false`. EPUB, TXT, and Markdown still use the blocking parser.

The reader opens only at a terminal 100% import state. `tests/e2e/long-import.spec.js` proves this
against a synthesised 420-page native-text PDF: progress reaches 100 before the reader mounts, stays
monotonic, produces zero horizontal overflow at 390x844, and mounts at most 12
`.reading-section` elements because of the reader's chapter window.

Detail: [[Import Scheduler]].

## Why native text wins

| Reason | Detail |
| --- | --- |
| Accuracy | The text layer is the publisher's text, not a guess |
| Speed | Extraction is effectively instant versus rasterize and recognize |
| Searchability | Real characters, not OCR substitutions |
| Selectability | Text can be copied and annotated precisely |

OCR is a repair mechanism, not the default.

Detail: [[OCR Decision Tree]].

## Damaged file tolerance

The local parser and progressive coordinator tolerate recoverable page and worker errors, but they
do not silently route a document to the backend. A local failure produces a clear error and leaves
the user in control. The optional accelerated OCR button is a separate, explicit action; its upload
does not begin until the user presses Start.

`isBackendFallbackError` only classifies the local error hint for that explicit seam. The current
`useDocumentImport` path does not call `scanPdfViaBackend` automatically.

Detail: [[OCR-Frontend Sync Contract]], [[Privacy Model]].

## Concurrency and memory

| Concern | Handling |
| --- | --- |
| Parallel page extraction | Bounded by `Math.min(4, navigator.hardwareConcurrency \|\| 2)` |
| Canvas memory | `page.cleanup()` after extraction and after OCR passes |
| OCR worker pool | Bounded worker count, terminated when the document completes or is cancelled |
| Long books | Bounded batches so the heap does not hold every page image at once |

Rendering hundreds of high resolution canvases simultaneously is the classic way to crash a browser
tab. Batching and explicit cleanup are the mitigation.

The import scheduler adds a second, coarser bound on top of this, so total in-flight page work is
capped by device class as well as by the parser's own limit. Detail: [[Import Scheduler]].

Detail: [[Local Tesseract.js]].

## Chapter assembly

Pages are grouped into chapters with useful labels, preserving document order. Backend OCR output
uses `Page N` chapter titles. Local native text groups pages into readable sections and applies the
same focus eligibility rules as other formats.

Detail: [[Normalized Book Contract]], [[Focus Rail]].

## Multi-column layout: the backend has it, the client does not

This asymmetry is easy to get backwards, so state it precisely.

| Path | Column handling |
| --- | --- |
| Backend, `backend/app/services/document_service.py:231` | Sorts PyMuPDF text blocks by `round(b[1] / 15.0)` then `b[0]`, which avoids column interleaving in two-column PDFs |
| Client, `pdfParser.js` | Reads pdfjs text items in content-stream order. Multi-column layout fidelity is not implemented |

So a two-column PDF imported through the optional backend scan reads in the right order, and the same
file imported locally may interleave columns. This is the largest remaining structural fidelity gap
in the client path.

Detail: [[Paragraph Classification]], [[Backlog P0-P1-P2]].

## What is preserved and what is not

| Preserved | Not preserved |
| --- | --- |
| Reading order | Exact page geometry |
| Paragraph structure | Multi-column layout fidelity in the client path |
| Page labels | Figures and tables as structural objects |
| Text content | Embedded image assets |

## Verification

- Import a native-text PDF and confirm extraction without OCR.
- Import a scanned PDF and confirm only image-only pages are OCRed.
- Import a damaged or renamed PDF and confirm a clear local error; choose optional accelerated OCR
  only when the user intentionally starts it.
- Confirm page order in the reader matches the source.
- Run `npx playwright test tests/e2e/long-import.spec.js` for the 420-page import path.
- Check console for worker loading errors.

Detail: [[Verification Checklist]], [[Testing Pipeline]], [[Document Import MOC]].