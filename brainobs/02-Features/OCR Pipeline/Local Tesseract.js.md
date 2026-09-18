---
title: Local Tesseract.js
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, ocr, tesseract, local, wasm]
source-files: [src/features/document-import/lib/pdfOcr.js, vite.config.js, package.json, updateOCRdata.md]
---

# Local Tesseract.js

The default OCR path for scanned pages. It runs entirely in the browser using WebAssembly, so
the page image never leaves the device.

## Why it is the default

| Advantage | Detail |
| --- | --- |
| No upload | The page image stays in browser memory |
| No API cost | No per-page inference billing |
| Offline capable | Assets are served locally, so it works with the network off |
| Broad support | Any browser with Web Workers and WASM |

## Worker pool

```js
const workerCount = Math.min(8, navigator.hardwareConcurrency || 2);
```

Tesseract is configured with `createScheduler()` and a pool of workers, so pages are recognized
in parallel without spawning unbounded workers.

More workers is not always faster. Past a point they contend for memory and CPU and can cause
the tab to become unstable, which is why the pool is capped and separate from the page-level
concurrency cap of 4.

Detail: [[PDF Parsing]].

## Asset locality

`localOcrAssets()` in `vite.config.js` is the reason local OCR works offline:

| Asset | Source |
| --- | --- |
| `worker.min.js` | `tesseract.js/dist` |
| LSTM and relaxed-SIMD WASM cores | `tesseract.js-core` |
| `lang/eng.traineddata.gz` | `@tesseract.js-data/eng` |

In dev the plugin serves them from `/ocr/...`. On build it copies them into `dist/ocr/`. There
is no CDN fetch, so a CDN outage cannot break OCR.

Detail: [[Frontend Architecture]].

## Bounded batching

Rendering hundreds of high resolution canvases at once is the classic browser crash. Bookflow
processes OCR pages in bounded batches, sized from device capability and capped at 4, and calls
`page.cleanup()` after passes to release pixel buffers.

Detail: [[Import Scheduler]] and the memory notes in [[Backend Architecture]].

## Cleanup discipline

Workers are terminated when the document completes or the import is cancelled. A cancelled
import must not leave workers running, holding WASM memory in the background.

## Scope limits, stated honestly

| Limit | Consequence |
| --- | --- |
| English trained data only | Other languages are not supported by the bundled model |
| Traditional OCR engine | Not a language model, so it does not reason about layout |
| Quality depends on the image | Photos with glare, shadow, skew, or blur degrade accuracy |
| Slow on long scans | Minutes for a 400 to 600 page book on ordinary hardware |
| Mobile throttling | Background tabs may be throttled or reclaimed by the OS |

Approved wording: "Local English OCR runs in the browser for scanned pages." Do not claim
universal language support or universal accuracy.

## When it hands off

If local OCR cannot produce readable text for a document, the backend path becomes available
with explicit consent. `isBackendFallbackError` identifies the failure that should trigger that
handoff.

Detail: [[OCR-Frontend Sync Contract]], [[OCR Decision Tree]].

Related: [[Privacy Model]], [[Testing Pipeline]].