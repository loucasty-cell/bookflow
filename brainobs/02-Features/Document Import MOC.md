---
title: Document Import MOC
type: MOC
status: living
updated: 2026-09-18
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
first readable unit appears fast, in source order,
unreadable content is reported rather than dropped,
and cancelling actually stops the work
```

That promise is what separates Bookflow from a viewer that freezes on page one of a 600 page
scan.

## Pipeline

```text
validate -> manifest -> scheduler -> per-unit parse or skipped -> normalize -> open reader
                                  -> report failures
```

## Public API

From `src/features/document-import/index.js`:

| Export | Purpose |
| --- | --- |
| `parseDocument`, `ACCEPTED_FILES` | Blocking parse path |
| `createManifest`, `addUnit`, `mark*`, `getUnitById`, `manifestProgress`, `UnitStatus`, `JobPriority` | Manifest state |
| `createImportScheduler`, `getConcurrency` | Bounded priority queue |
| `progressivePdfImport`, `progressiveEpubImport`, `progressiveTextImport` | Progressive entry points |
| `scanPdfViaBackend`, `isBackendFallbackError` | Backend OCR fallback |

Detail: [[Frontend Public APIs]].

Related: [[OCR Pipeline MOC]], [[Data Flow]], [[Normalized Book Contract]].