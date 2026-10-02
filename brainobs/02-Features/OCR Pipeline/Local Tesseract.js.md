---
title: Local Tesseract.js
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, ocr, tesseract, local, wasm]
source-files: [src/features/document-import/lib/pdfOcr.js, vite.config.js, scripts/copy-assets.js, package.json]
---

# Local Tesseract.js

The default OCR path for scanned pages. It runs entirely in the browser using WebAssembly, so the
page image never leaves the device.

## Why it is the default

| Advantage | Detail |
| --- | --- |
| No upload | The page image stays in browser memory |
| No API cost | No per-page inference billing |
| Offline capable | Assets are served locally, so it works with the network off |
| Broad support | Any browser with Web Workers and WASM |

## Worker pool

Tesseract is configured with `createScheduler()` and a pool of workers, so pages are recognized in
parallel without spawning unbounded workers.

More workers is not always faster. Past a point they contend for memory and CPU and can cause the
tab to become unstable, which is why the pool is capped and kept separate from the import scheduler's
device-class concurrency, which is `1` on mobile and `min(3, max(1, floor(cores / 2)))` on desktop
(`importScheduler.js:15-19`).

Detail: [[PDF Parsing]], [[Import Scheduler]].

## Asset locality

Local OCR works offline because the Tesseract assets are bundled, not fetched from a CDN.
`vite.config.js` declares an `OCR_ASSETS` map at `:8` with exactly 8 entries, serving them in dev
through middleware at `:51-65` and copying them into `dist/ocr/` on `writeBundle` at `:66-75`:

| Served path | Package |
| --- | --- |
| `worker.min.js` | `tesseract.js` |
| `core/tesseract-core-lstm.wasm.js` / `.wasm` | `tesseract.js-core` |
| `core/tesseract-core-simd-lstm.wasm.js` / `.wasm` | `tesseract.js-core` |
| `core/tesseract-core-relaxedsimd-lstm.wasm.js` / `.wasm` | `tesseract.js-core` |
| `lang/eng.traineddata.gz` | `@tesseract.js-data/eng` |

The three core tiers exist because the same bundle has to run on hardware with and without SIMD.
`vite.config.js` ships explicit `contentTypes` for `.gz`, `.js`, and `.wasm`, so a dev middleware
serves a `.wasm` as `application/wasm` rather than guessing.

`scripts/copy-assets.js` performs the equivalent copy into `public/ocr/` and runs as the npm
`prebuild` script, so the assets are also present for a plain static serve.

There is no CDN fetch, so a CDN outage cannot break OCR.

## Bounded batching

Rendering hundreds of high resolution canvases at once is the classic browser crash. Bookflow
processes OCR pages in bounded batches and calls `page.cleanup()` after passes to release pixel
buffers.

Detail: [[Import Scheduler]] and the memory notes in [[Backend Architecture]].

## Cleanup discipline

Workers are terminated when the document completes or the import is cancelled. A cancelled import
must not leave workers running, holding WASM memory in the background.

## Scope limits, stated honestly

| Limit | Consequence |
| --- | --- |
| English trained data only | Other languages are not supported by the bundled model |
| Traditional OCR engine | Not a language model, so it does not reason about layout |
| Quality depends on the image | Photos with glare, shadow, skew, or blur degrade accuracy |
| Slow on long scans | Minutes for a 400 to 600 page book on ordinary hardware |
| Mobile throttling | Background tabs may be throttled or reclaimed by the OS |

Approved wording: "Local English OCR runs in the browser for scanned pages." Do not claim universal
language support or universal accuracy.

## When it hands off

If local OCR cannot produce readable text for a document, the backend path becomes available with
explicit consent. `isBackendFallbackError` identifies the failure that should prompt that handoff. It
is a classifier, not a trigger: no local error automatically uploads a document.

Detail: [[OCR-Frontend Sync Contract]], [[OCR Decision Tree]].

Related: [[Privacy Model]], [[Testing Pipeline]], [[Document Import MOC]].