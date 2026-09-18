---
title: OCR-Frontend Sync Contract
type: contract
status: verified
updated: 2026-09-18
tags: [bookflow, ocr, contract, integration, critical]
source-files: [src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/lib/importCoordinator.js, src/shared/lib/text.js, src/App.jsx, backend/main.py]
---

# OCR-Frontend Sync Contract

How backend OCR output becomes a readable book without the reader knowing it came from a
server. This is the single most important integration seam in the project.

## The seam

```js
scanPdfViaBackend(file, onProgress, { signal, batchSize = 16, ocrProfile = "small" })
```

Lives in `src/features/document-import/lib/backendOcrFallback.js`, exported from the
document-import public API.

## Signature and options

| Parameter | Type | Default | Meaning |
| --- | --- | --- | --- |
| `file` | `File` | required | The PDF to scan |
| `onProgress` | `(percent, label, detail) => void` | optional | Parsing progress with a human label |
| `options.signal` | `AbortSignal` | optional | Cancels the scan and the job |
| `options.batchSize` | `number` | `16` | Pages per backend batch |
| `options.ocrProfile` | `string` | `"small"` | `small` or `medium` quality profile |

The returned promise also exposes a `.cancel()` method, so callers can cancel without an
`AbortSignal`.

## The conversion step

Backend pages become chapters through one function:

```text
toChapters(pages)
  1  sort pages by page_number
  2  for each successful page with non-empty text:
       split into paragraphs with splitParagraphs(page.text)
       if a paragraph survives, push a chapter { title: "Page N", paragraphs }
  3  return chapters in source order
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

Because the shape matches the local parsers, `ReaderPage` needs no special case. This is the
whole point of the [[Normalized Book Contract]].

## Shared paragraph splitting

Both this path and the backend use paragraph splitting that normalizes to the same units, via
`splitParagraphs` in `src/shared/lib/text.js`. Page text recognized on the server splits the
same way local text does, so paragraphs behave identically in the reader.

## Fallback trigger

```js
isBackendFallbackError(error)
```

Tests the error message for the accelerated-scan hint. `App.jsx` uses it to decide whether a
local parsing failure should become a backend scan attempt rather than a dead end.

```text
local parse fails
  -> isBackendFallbackError(error)?
       yes -> scanPdfViaBackend(...)
       no  -> surface the original error
```

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

Client-side percent is clamped to 4 through 99 during the scan and set to 99 on completion, so
the UI never claims done before assembly finishes and never appears stuck at zero.

## Error contract

| Message | Cause |
| --- | --- |
| "Cannot reach the OCR backend at {base}. Start it, then retry." | Fetch failed, no abort |
| "Backend scan failed with status {n}." | Non-OK response, no detail body |
| `detail` from the response | Non-OK response with a detail payload |
| "Cannot stream backend progress at {base}." | EventSource construction failed |
| "The backend scan finished but found no readable text in this PDF." | Completed with zero chapters |
| "Backend scan was canceled." | Aborted |

`apiBase()` reads `import.meta.env.VITE_API_URL`, or returns an empty string to use the Vite
dev proxy. `displayBase()` falls back to `http://localhost:8000` for human-readable messages.

Detail: [[Environment Config]], [[Dev Setup]].

## Related contracts

- [[SSE Progress Streaming]] - the event shapes this client consumes
- [[Backend OCR Engine]] - the pipeline producing those events
- [[OCR Decision Tree]] - when this path is chosen at all
- [[Data Flow]] - where the fallback sits in the import pipeline
- [[Frontend Public APIs]] - the exported signature