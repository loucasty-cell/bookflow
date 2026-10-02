---
title: OCR-Frontend Sync Contract
type: contract
status: verified
updated: 2026-10-02
tags: [bookflow, ocr, contract, integration, critical]
source-files: [src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/lib/ocrResultToBook.js, src/features/document-import/lib/ocrUploadUtils.js, src/features/document-import/hooks/useOcrSession.js, src/features/document-import/components/OcrUploader.jsx, src/features/document-import/components/OcrResultViewer.jsx, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/lib/importCoordinator.js, src/shared/lib/text.js, src/App.jsx, backend/main.py]
---

# OCR-Frontend Sync Contract

How an explicitly started backend OCR job becomes a readable book without the reader knowing it came
from a server. This is the single most important integration seam in the project.

## The seam

```js
scanPdfViaBackend(file, onProgress, { signal, batchSize = 16, ocrProfile = "small" })
```

Lives in `src/features/document-import/lib/backendOcrFallback.js` and is one of only two exports from
that module, both re-exported from the feature barrel.

## Signature and options

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `file` | `File` | required | The PDF to scan |
| `onProgress` | `(percent, label, detail) => void` | optional | Parsing progress with a human label |
| `options.signal` | `AbortSignal` | optional | Cancels the scan and the job |
| `options.batchSize` | `number` | `16` | Pages per backend batch; the server clamps to `1..32` |
| `options.ocrProfile` | `string` | `"small"` | `small` or `medium`; anything else is HTTP 400 |

The returned promise also exposes a `.cancel()` method, so callers can cancel without an
`AbortSignal`.

`ocrUploadUtils.js` holds the request-construction helpers. `ocrResultToBook.js` is the conversion
step described below. Neither is in the feature barrel.

## The conversion step

Backend pages become chapters through one conversion, in `ocrResultToBook.js`:

```text
sort pages by page_number
for each successful page with non-empty text:
  split into paragraphs with splitParagraphs(page.text)
  if a paragraph survives, push a chapter { title: "Page N", paragraphs }
return chapters in source order
```

The result is the standard contract plus diagnostics:

```json
{
  "title": "Filename without extension",
  "author": "",
  "kind": "PDF",
  "chapters": [{ "title": "Page 1", "paragraphs": ["..."] }],
  "ocrPageCount": 240,
  "totalWords": 96420,
  "skippedPages": [17, 193]
}
```

Because the shape matches the local parsers, `ReaderPage` needs no special case. That is the whole
point of the [[Normalized Book Contract]].

The backend's own model agrees with this shape. `NormalizedBook` at
`backend/app/models/document.py:54` requires `title: str`, `kind: Literal["PDF","EPUB","TEXT","MARKDOWN"]`,
and `chapters: List[Chapter]`; `Chapter` carries an optional `focusEligible` defaulting to `True`,
and `Subheading` (`:7`) carries an optional `title` with `paragraphs: List[str]`. `ParseResponse`
(`:63`) adds `success`, `book`, `message`, `pageCount`, `wordCount`.

## Shared paragraph splitting

Both this path and the backend use paragraph splitting that normalises to the same units, via
`splitParagraphs` in `src/shared/lib/text.js`. Page text recognised on the server splits the same
way local text does, so paragraphs behave identically in the reader.

## Explicit user action

`isBackendFallbackError(error)` tests the local error message for the accelerated-scan hint. It is a
classifier, not an automatic trigger. The current `useDocumentImport` path surfaces the local error
and leaves the backend action to the user; `OcrUploader` calls `scanPdfViaBackend` only after the
user selects a PDF and presses Start.

```text
local parse fails
  -> surface a clear local error
  -> user explicitly opens Optional accelerated OCR and presses Start
  -> scanPdfViaBackend(...)
```

This is a privacy invariant, not a UX preference. See [[Privacy Model]].

## Lifecycle and cleanup

| Situation | Behaviour |
| --- | --- |
| `signal` already aborted | Cancel immediately, no request sent |
| `signal` aborts mid-scan | Close EventSource, POST cancel, settle once |
| Component unmounts | Caller calls the promise's `.cancel()` |
| Stream error frame | Reject with the server message |
| Malformed frame | Ignored, stream continues |
| No readable chapters | Reject with "found no readable text" |

A `settled` flag ensures the promise settles exactly once no matter how many events arrive.

## Progress clamp

Client-side percent is clamped to 2 through 99 during the scan and the uploader commits `100` only
after the completed event and readable-page assembly, so the UI never claims done early. This is the
frontend mirror of the same rule that makes the local import wait for terminal state before opening
the reader.

## Error contract

| Message | Cause |
| --- | --- |
| "Cannot reach the OCR backend at {base}. Start it, then retry." | Fetch failed, no abort |
| "Backend scan failed with status {n}." | Non-OK response, no detail body |
| `detail` from the response | Non-OK response with a detail payload |
| "Cannot stream backend progress at {base}." | EventSource construction failed |
| "The backend scan finished but found no readable text in this PDF." | Completed with zero chapters |
| "Backend scan was canceled." | Aborted |

Every message names what failed and what to do next. This is the standard for import errors in
Bookflow.

`apiBase()` reads `import.meta.env.VITE_API_URL`, or returns an empty string to use the Vite dev
proxy. `displayBase()` falls back to `http://localhost:8000` for human-readable messages. The
distinction matters: the request path may be a relative proxy route while the message must name an
address the reader can actually act on.

Detail: [[Environment Config]], [[Dev Setup]], [[SSE Progress Streaming]].

## Related contracts

- [[SSE Progress Streaming]] - the event shapes this client consumes
- [[Backend OCR Engine]] - the pipeline producing those events
- [[OCR Decision Tree]] - when this path is chosen at all
- [[Data Flow]] - where the fallback sits in the import pipeline
- [[Frontend Public APIs]] - the exported signature