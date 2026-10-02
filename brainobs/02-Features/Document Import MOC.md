---
title: Document Import MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, import, moc]
source-files: [src/features/document-import/index.js, src/features/document-import/lib/importCoordinator.js, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/lib/manifestToBook.js, src/features/document-import/lib/ocrResultToBook.js, src/features/document-import/lib/epubUtils.js, src/features/document-import/lib/ocrUploadUtils.js, src/features/document-import/lib/pdfDocument.js, src/features/document-import/components/OcrUploader.jsx, src/features/document-import/components/OcrResultViewer.jsx, src/features/document-import/hooks/useOcrSession.js]
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

## Which formats use which path

This is the fact most often documented wrongly. The progressive coordinators exist for all three
formats; only one is wired into `handleFile`.

| Format | App path today | Progressive coordinator |
| --- | --- | --- |
| PDF | **Progressive** via `progressivePdfImport` when `settings.useProgressiveImport !== false` | `progressivePdfImport` |
| EPUB | **Blocking** via `parseDocument` | `progressiveEpubImport` (exposed, not wired) |
| TXT | **Blocking** via `parseDocument` | `progressiveTextImport` (exposed, not wired) |
| Markdown | **Blocking** via `parseDocument` | `progressiveTextImport` (exposed, not wired) |

The PDF coordinator may resolve its first ready unit internally. That is a scheduling signal only.
**The app waits for a terminal 100% import state before opening the reader, and the reader is never
mounted pre-terminal.** `useDocumentImport.js:8` holds `IMPORT_COMPLETE_DELAY = 480` ms between
terminal import and reader open.

The 420-page browser probe in `tests/e2e/long-import.spec.js` enforces this: it synthesises a
420-page 612x792 native-text PDF with `pdf-lib` and asserts progress reaches 100 *before* the reader
mounts, that progress is monotonic, that horizontal overflow is zero at 390x844, and that the
mounted `.reading-section` count is at most 12.

## Pipeline

```text
validate
  -> PDF:    manifest -> scheduler -> per-unit parse or failed -> terminal 100% -> open reader
  -> EPUB/TXT/MD: blocking parse -> terminal 100% -> open reader -> report failures
```

## Public API

From `src/features/document-import/index.js`:

| Export | Purpose |
| --- | --- |
| `ACCEPTED_FILES`, `parseDocument` | Blocking parse path and the accepted-extension string |
| `validateBookFile`, `validateFileDescriptor`, `MAX_FILE_SIZE`, `SUPPORTED_EXTENSIONS` | Pre-parse validation |
| `createManifest`, `addUnit`, `markQueued`, `markProcessing`, `markReady`, `markFailed`, `markCancelled`, `requeueUnit`, `getUnitById`, `getUnitsByStatus`, `getFirstReadyUnit`, `manifestProgress`, `UnitStatus`, `JobPriority` | Manifest state |
| `createImportScheduler`, `getConcurrency` | Bounded priority queue |
| `progressivePdfImport`, `progressiveEpubImport`, `progressiveTextImport` | Progressive coordinators; only the PDF one is wired into `handleFile` |
| `scanPdfViaBackend`, `isBackendFallbackError` | Explicit optional accelerated OCR seam; not an automatic frontend fallback |
| `useDocumentImport` | The app-level import hook |

### Modules that exist but are not in the barrel

These five modules and three modules' worth of UI are real and in use, but are **not** re-exported
from `index.js`. Other features must not treat them as public API.

| Module | Role |
| --- | --- |
| `lib/manifestToBook.js` | Converts a completed manifest into the normalized book shape |
| `lib/ocrResultToBook.js` | Converts a backend OCR result into the normalized book shape |
| `lib/epubUtils.js` | EPUB archive helpers shared by the parser |
| `lib/ocrUploadUtils.js` | Upload request construction and validation helpers |
| `lib/pdfDocument.js` | `pdfjs-dist` document handle and worker lifecycle |
| `components/OcrUploader.jsx` | Opt-in accelerated-OCR upload UI |
| `components/OcrResultViewer.jsx` | Review UI for an OCR result |
| `hooks/useOcrSession.js` | OCR session state hook |

Detail: [[Frontend Public APIs]].

## Source of truth order

Native PDF text is the source of truth. OCR is applied only to pages without selectable text, and
the backend OCR path is an explicit user-started action that a local parse failure never triggers.
Detail: [[OCR Decision Tree]].

Related: [[OCR Pipeline MOC]], [[Data Flow]], [[Normalized Book Contract]], [[Validation Rules]].