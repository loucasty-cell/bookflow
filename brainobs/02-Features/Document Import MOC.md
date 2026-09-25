---
title: Document Import MOC
type: MOC
status: living
updated: 2026-09-25
tags: [bookflow, import, moc]
---

# Document Import MOC

Everything between a file on disk and a readable book in the reader.

## Notes

- [[PDF Parsing]] - native text first, damaged file tolerance, memory cleanup
- [[EPUB Parsing]] - archive structure, spine order, one subheading level
- [[TXT and Markdown]] - heading normalization and paragraph grouping
- [[Validation Rules]] - extensions, size ceiling, untrusted input
- [[Import Scheduler]] - manifest, unit lifecycle, bounded concurrency, cancellation
- [[Paragraph Classification]] - the seven-category heuristic

## The import promise

```text
local work stays in source order,
progress is monotonic and reaches a terminal 100%,
unreadable content is reported rather than dropped,
and cancelling actually stops the work before the reader opens
```

The PDF coordinator can mark an early unit ready internally, but the app waits for the terminal
100% state before mounting the reader. EPUB, TXT, and Markdown still wait for the blocking parser.

## Pipeline

```text
validate -> PDF: manifest -> scheduler -> per-unit parse or failed -> terminal 100% -> open reader
        -> EPUB/TXT/Markdown: blocking parse -> terminal 100% -> open reader
                                  -> report failures
```

## Public API

From `src/features/document-import/index.js`:

| Export | Purpose |
| --- | --- |
| `parseDocument`, `ACCEPTED_FILES` | Blocking parse path |
| `createManifest`, `addUnit`, `mark*`, `getUnitById`, `manifestProgress`, `UnitStatus`, `JobPriority` | Manifest state |
| `createImportScheduler`, `getConcurrency` | Bounded priority queue |
| `progressivePdfImport`, `progressiveEpubImport`, `progressiveTextImport` | Progressive coordinators; only the PDF coordinator is wired into `handleFile` |
| `scanPdfViaBackend`, `isBackendFallbackError` | Explicit optional accelerated OCR seam; not an automatic frontend fallback |

Detail: [[Frontend Public APIs]].

Related: [[OCR Pipeline MOC]], [[Data Flow]], [[Normalized Book Contract]].