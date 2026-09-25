---
title: Debugging Playbook
type: guide
status: verified
updated: 2026-09-25
tags: [bookflow, ops, debugging, troubleshooting]
source-files: [src/shared/components/ErrorBoundary.jsx, src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/hooks/useOcrSession.js, src/features/reader/lib/focusEligibility.js, debugging.md, vite.config.js]
---

# Debugging Playbook

Common failures, their causes, and the fix. Sorted by where the problem appears.

A repository guide already exists at `debugging.md` with symptom-level detail. This note
summarizes it and adds layout, rendering, and performance cases.

## Import failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Unsupported extension message | Wrong file type | Confirm `.pdf`, `.epub`, `.txt`, `.md` |
| Over size limit | File above 50 MB | Reduce the file, or split it |
| Empty reader after import | Parser returned no paragraphs | Test with the sample book, then inspect the file |
| Reader opens but text is garbled | Scanner produced poor OCR | Try the backend scan with a higher profile |
| Import hangs | Large scanned PDF on a slow device | Confirm the scheduler is running and cancel is available |
| PDF fails, no automatic backend scan | This is intentional | Keep the local error visible; the user must explicitly choose optional accelerated OCR |

### "PDF contains no readable text"

Cause: the PDF is scanned raster images with no embedded text layer.

Resolution: locally, the bundled Tesseract.js English OCR triggers. With the backend running,
`POST /api/ocr/scan` routes pages through PaddleOCR and the configured fallback.

### PDF.js worker fails to load

Cause: a path mismatch for `pdf.worker.min.mjs` in the build. `public/pdf.worker.min.mjs` is
served at runtime and copied to `dist/` at build time.

Resolution: verify the worker configuration in `src/features/document-import/lib/pdfParser.js`.

### EPUB parsing errors

Cause: non-standard structure or a missing `META-INF/container.xml`.

Resolution: check `src/features/document-import/lib/epubParser.js`. The parser validates the
container XML, locates the OPF manifest, and extracts spine items in order.

Detail: [[Validation Rules]], [[OCR Decision Tree]].

## OCR failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Failed to fetch` from the uploader | Backend unreachable, or the upload was rejected before a job was created | Start the backend, confirm `/api/health`, check the console for the first HTTP error |
| "Cannot reach the OCR backend at {url}" | Backend not running | Start it, or use local OCR |
| PaddleOCR returns no text | `PADDLEOCR_URL` empty, PaddleX not running, or response shape unexpected | Start PaddleX, set the URL, confirm `paddleocr_configured: true` |
| `401 Unauthorized` on OCR endpoints | Missing or invalid provider token | Add a token in `backend/.env`, or pass `X-HF-Token` |
| `503 Model is Loading` | Serverless cold start | Handled automatically with up to 3 retries and backoff |
| `429 Rate Limit Exceeded` | Provider quota exhausted | Reduce concurrency, use a dedicated endpoint, or fall back to local OCR |
| Blank or low quality OCR output | Poor contrast, low resolution, multi-column layout | Confirm the image is upright, the model supports image-text-to-text, and try PaddleOCR |
| Progress stalls then dies | SSE connection dropped | Confirm the 8s heartbeat is emitting |
| Some pages missing | Pages failed and were reported | Check `skippedPages` and retry those pages |

Inside an explicitly started backend job, the provider fallback chain means a PaddleOCR failure is
not fatal: the backend attempts the configured Hugging Face or vLLM route next. This does not make
the browser upload automatically.

Detail: [[SSE Progress Streaming]], [[Backend OCR Engine]].

## Reader issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| Active focus does not move while scrolling | Scroll listener detached, or paragraphs lack `data-paragraph-id` | Confirm the reader container scrolls and the rail element carries `data-focus-eligible` |
| Front matter or copyright page gets focus | Section not classified as front matter | Check the front and end matter rules; short headings and standard front matter words are non-eligible |
| Focus flickers between two units | Equal-distance paragraphs | Confirm the previous-id bias is applied |
| Jitter on trackpad | Raw delta used instead of accumulator | Confirm `accumulateScrollIntent` and the threshold |
| Focus stuck | Paragraph is pinned | Unpin with `Escape`, or focus the paragraph and use `Enter` or `Space` |
| Notes not persisting | Storage blocked or wrong identity | Confirm the safe storage fallback and the document key |

Front matter detection excludes headings containing words such as Contents, Copyright, or Title,
and sections under roughly 40 words. That logic lives in `focusEligibility.js` and has a backend
counterpart in `text_service.py`.

Detail: [[Focus Rail]], [[Storage and Persistence]], [[Notes and Bookmarks]].

## Storage failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| Notes or progress lost on refresh | Document identity changed, or storage quota exceeded | Check the `bookflow:document:<filename:size:lastModified>` key and console for `QuotaExceededError` |
| Settings reset | Storage blocked | Confirm the in-memory fallback path is active |
| Annotations orphaned | Document re-parsed with shifted order | Expected limitation, see the contract note |

Detail: [[Storage and Persistence]], [[Normalized Book Contract]].

## Layout issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| Horizontal overflow at 320px | Fixed width or long unbroken string | Use `max-width`, percentages, `overflow-wrap` |
| Focus card exceeds viewport | Missing `min()` constraint | Use `min(340px, calc(100vw - 36px))` |
| Touch target too small | Declared size minus margin | Measure the rendered rectangle |
| Controls under the notch | Missing safe area insets | Apply `env(safe-area-inset-*)` |
| Long title breaks the header | No wrapping | Allow wrapping in the topbar title |

Detail: [[Responsive Breakpoints]].

## Rendering failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| White screen | Component threw | Check the ErrorBoundary reset and the console |
| Reader subtree crashed | Reader-specific error | Subtree boundary isolates it; inspect the stack |
| OCR assets 404 | Dev server started without the plugin | Restart Vite |
| Blank after theme switch | Token missing for that theme | Verify every theme defines the token |

Detail: [[Frontend Architecture]], [[Design Tokens]].

## Performance issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| Tab freezes on a large scan | Unbounded rendering or workers | Confirm batch caps and worker termination |
| Memory climbs on a long book | Buffers retained | Confirm cleanup after extraction and OCR |
| Slow first content | Blocking parse on the main path or terminal PDF preparation | Confirm PDF progressive import is enabled and that the reader waits for its terminal 100%; EPUB, TXT, and Markdown currently use the blocking path |
| Janky focus transition | Animating layout properties | Animate opacity and transform only |

Measure with the `bookflow:` performance marks rather than guessing.

Detail: [[Success Metrics]], [[Import Scheduler]].

## Diagnostic commands

```bash
# Frontend checks
npm run lint
npm test
npm run build

# Backend checks
pytest backend/tests/ -v
npx pyright

# Backend reachability
curl http://127.0.0.1:8000/api/health

# OCR worker reachability
curl http://localhost:8080/health

# Repository hygiene
git diff --check
git status --short --branch
```

## Performance mark inspection

```js
performance.getEntriesByType('measure')
  .filter((m) => m.name.startsWith('bookflow:'))
  .map((m) => `${m.name}: ${Math.round(m.duration)}ms`)
```

This is the fastest way to locate which pipeline stage is slow.

## Escalation rule

If a failure is not covered by the existing documentation, reproduce it with the smallest
possible input, capture the exact error text, and then update this note. An undocumented failure
that recurs is a documentation defect.

Detail: [[Context Sync Protocol]], [[Verification Checklist]].