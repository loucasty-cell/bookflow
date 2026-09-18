---
title: PDF Parsing
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, import, pdf, parser]
source-files: [src/features/document-import/lib/pdfParser.js, src/features/document-import/lib/pdfOcr.js, src/features/document-import/lib/documentParsers.js]
---

# PDF Parsing

PDF is the hard format: fixed layout, unreliable text layers, and frequent damage. Bookflow's
approach is native text first, OCR only where text is missing, and never a blocking full-book
wait.

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

The parser is written to tolerate damaged PDFs and missing workers rather than fail outright,
and the import path has explicit commits behind this behaviour:

- `fix: make PDF import tolerant of damaged files and missing worker`
- `feat: fall back to backend OCR scan when local PDF parsing fails`

If local extraction cannot proceed, control moves to the backend scan path rather than
presenting a dead end. `isBackendFallbackError` identifies when a failure should trigger that
handoff.

Detail: [[OCR-Frontend Sync Contract]].

## Concurrency and memory

| Concern | Handling |
| --- | --- |
| Parallel page extraction | Bounded by `Math.min(4, navigator.hardwareConcurrency \|\| 2)` |
| Canvas memory | `page.cleanup()` after extraction and after OCR passes |
| OCR worker pool | Bounded worker count, terminated when the document completes or is cancelled |
| Long books | Bounded batches so the heap does not hold every page image at once |

Rendering hundreds of high resolution canvases simultaneously is the classic way to crash a
browser tab. Batching and explicit cleanup are the mitigation.

Detail: [[Local Tesseract.js]], [[Import Scheduler]].

## Chapter assembly

Pages are grouped into chapters with useful labels, preserving document order. Backend OCR
output uses `Page N` chapter titles. Local native text groups pages into readable sections and
applies the same focus eligibility rules as other formats.

Detail: [[Normalized Book Contract]], [[Focus Rail]].

## What is preserved and what is not

| Preserved | Not preserved |
| --- | --- |
| Reading order | Exact page geometry |
| Paragraph structure | Multi-column layout fidelity |
| Page labels | Figures and tables as structural objects |
| Text content | Embedded image assets |

Multi-column layout sorting is a known gap and a planned improvement.

Detail: [[Backlog P0-P1-P2]], [[Roadmap MOC]].

## Verification

- Import a native-text PDF and confirm extraction without OCR.
- Import a scanned PDF and confirm only image-only pages are OCRed.
- Import a damaged or renamed PDF and confirm a clear error or a successful fallback.
- Confirm page order in the reader matches the source.
- Check console for worker loading errors.

Detail: [[Verification Checklist]], [[Testing Pipeline]].