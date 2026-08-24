# Bookflow OCR architecture and scale plan

This document records a realistic OCR strategy for Bookflow. It covers scanned PDFs and photographs of book pages, local phone and laptop usage, a self-hosted OCR service, optional Hugging Face fallback, Docker deployment, and scaling to many users.

It is a design and capacity plan. It does not promise that every 400–600-page book can be completed in two minutes. That depends on page quality, rendering time, CPU/GPU hardware, model choice, queue depth, and network bandwidth.

## 1. What Bookflow should OCR

Bookflow should not OCR every page automatically.

1. Ask the PDF parser for selectable text.
2. If a page has enough useful text, keep the native PDF text. This is faster and usually more accurate.
3. If the page has no useful text, render that page to an image.
4. OCR only that image page.
5. Preserve the original page number and order.
6. Normalize the page text into Bookflow chapters, paragraphs, and reading units.

This handles three common inputs:

| Input | Default path |
| --- | --- |
| Digital PDF | PDF.js/PyMuPDF native text extraction |
| Scanned PDF | Render only image-only pages, then OCR |
| Camera photos | Image preprocessing, then OCR |

OCR results should be associated with a page identifier, not only concatenated into one string:

```json
{
  "page": 42,
  "status": "completed",
  "text": "Recognized page text...",
  "engine": "tesseract-local",
  "confidence": 0.91
}
```

## 2. OCR options

### 2.1 Local Tesseract.js

Tesseract is a traditional OCR engine. It reads pixels and returns characters; it is not a chat model and does not require a Hugging Face account.

Bookflow already uses Tesseract.js for local English OCR. This is the preferred privacy path because the page image remains on the phone or laptop.

Advantages:

- No OCR API bill.
- No server upload for the default path.
- Works on Windows, macOS, Linux, Android browsers, iOS browsers, and desktop browsers that support Web Workers and WebAssembly.
- Good for clean, printed pages.

Limitations:

- Camera perspective, shadows, glare, blur, and unusual fonts reduce accuracy.
- Mobile browsers may throttle background work or reclaim memory.
- A 400–600-page scan can take many minutes on a phone or ordinary laptop.
- More browser workers do not always improve speed; they can exhaust memory and battery.

Use one or two browser workers on phones and up to four only after measuring a laptop. Terminate workers when a document is complete or cancelled.

### 2.2 Self-hosted OCR service

A self-hosted service is an OCR process that Bookflow runs on infrastructure controlled by the project rather than calling a hosted API for every page. The model weights are downloaded once, then the service exposes an internal HTTP endpoint.

The recommended first self-hosted option is a dedicated OCR engine such as PaddleOCR. A vision-language model can be useful for difficult layouts, but it normally needs more memory or GPU capacity and may be slower or less deterministic than a dedicated OCR engine.

The service should accept one image page at a time or a bounded batch:

```text
POST /ocr
Content-Type: image/jpeg

response:
{
  "text": "...",
  "confidence": 0.94,
  "boxes": []
}
```

Bookflow's FastAPI backend should call this service. The browser should not connect directly to an internal OCR container.

Self-hosting requires:

- Python or Docker runtime.
- Model weights and their licenses.
- Temporary image storage.
- CPU workers, or an NVIDIA GPU with compatible drivers/CUDA for faster processing.
- A queue and concurrency limit.
- Health checks, timeouts, retries, and cancellation.
- Metrics for pages per second, queue wait, failures, and memory use.

Self-hosting does not mean training a model. Training or fine-tuning is a separate project and requires a labeled dataset.

### 2.3 Hugging Face fallback

Hugging Face should be an explicit optional fallback for pages that fail local and self-hosted OCR. The token must stay in the backend environment and must never be placed in browser-exposed variables.

Use a model that currently has an active Inference Provider and an image-capable task such as `image-to-text` or `image-text-to-text`. A normal text-only DeepSeek model cannot read page images. `deepseek-ai/DeepSeek-OCR-2` is an OCR model, but it should not be assumed to be available through serverless providers.

Hugging Face serverless inference is not an unlimited free compute cluster. Free account credits are small and subject to change. A 400–600-page book must not depend on free serverless capacity for completion or for a two-minute service-level promise. Check provider availability and billing before enabling a model in production.

## 3. Camera-photo preprocessing

For photographed pages, preprocessing usually improves accuracy more than switching to a larger model.

Recommended steps:

- Detect and crop the page boundary.
- Correct perspective distortion.
- Rotate and deskew the page.
- Remove dark borders and background objects.
- Correct uneven lighting, shadows, and glare.
- Convert to grayscale when color is not meaningful.
- Apply conservative contrast or adaptive thresholding.
- Resize to a readable resolution; avoid uploading unnecessarily huge images.
- Preserve the original page number and image hash.

Raw binary image upload is preferable to base64 because it avoids roughly 33% base64 size overhead. It does not improve the OCR model's recognition accuracy. Image quality and preprocessing determine accuracy.

Do not send an entire 400–600-page PDF as one OCR request. Render and process pages independently so the job can resume, retry, and stream progress.

## 4. Recommended routing policy

```text
Digital text page
    -> native PDF extraction

Image-only page
    -> local Tesseract.js

Low confidence or failed local page
    -> self-hosted OCR service

Still failed and user opted in to cloud OCR
    -> Hugging Face provider

Failed everywhere
    -> retain page image, report page number, allow retry
```

Do not run all three OCR engines on every page. That multiplies cost and latency without guaranteeing better text.

Use a confidence threshold only as a routing signal. Confidence values from different engines are not directly comparable. Combine confidence with checks such as:

- Too few recognized characters.
- Excessive replacement or unknown characters.
- Abnormally high punctuation or whitespace.
- Language detection failure.
- Text area not covering the expected page region.
- A user-requested manual retry.

## 5. Scaling to phones, laptops, and all platforms

### Phones and tablets

- Prefer local OCR for privacy and offline use.
- Use one worker initially; add a second only after device testing.
- Pause or reduce work when the tab is hidden, battery is low, or memory pressure is detected.
- Upload compressed page images only when the user enables remote OCR.
- Show page-level progress and allow cancellation.
- Never require a 500-page job to stay open in a mobile browser.

### Laptops and desktops

- Use two to four local workers depending on measured memory and CPU.
- Offer the self-hosted backend for large imports.
- Use background jobs so the reader can open already completed pages.
- Prefer a local network OCR service for organizations that do not want book images to leave their network.

### Browser and operating-system compatibility

Keep the browser path based on standard Web Workers, WebAssembly, Fetch, IndexedDB, and Service Worker-safe APIs. Test current Chrome/Edge, Firefox, Safari macOS, Safari iOS, and Android Chrome. Treat browser background throttling and storage quotas as normal behavior, not exceptional failures.

The backend path is platform-independent for users: Windows, macOS, Linux, iOS, and Android clients all call the same HTTPS API. Only the server operator needs Python/Docker/GPU setup.

## 6. Scaling to many users

“500 users” and “500 simultaneous OCR jobs” are different requirements. Design for both explicitly.

The browser-local path can support many users with little server OCR load. The self-hosted path needs admission control so 500 users cannot start unlimited GPU jobs at once.

Recommended server components:

```text
HTTPS reverse proxy
        |
        v
Bookflow FastAPI API
        |
        +-- Redis queue and job state
        +-- OCR workers (CPU or GPU)
        +-- Temporary object/file storage
        +-- Metrics and logs with no page text
```

Controls required for a multi-user deployment:

- Per-user and per-IP rate limits.
- Maximum pages per job, such as 600 initially.
- Maximum page/image size.
- A bounded queue with a clear “queued” state.
- Worker concurrency limits based on measured RAM/VRAM.
- Exponential backoff for provider rate limits.
- Idempotent page jobs keyed by document hash and page number.
- Cancellation that stops queued work and releases temporary files.
- A TTL for uploaded images and OCR results.
- Authentication and authorization for job status and result downloads.
- No page images or full extracted books in ordinary application logs.

For 500 concurrent users, scale the API layer separately from OCR workers. More API containers do not make OCR faster if the GPU queue is already full. Add OCR workers only after measuring queue wait, GPU utilization, and memory.

## 7. Docker deployment

Use separate containers for the web/API layer and OCR workers. Do not put the browser frontend, FastAPI API, Redis, and GPU OCR process into one container.

Example production shape:

```yaml
services:
  web:
    build: ./frontend
    depends_on: [api]

  api:
    build: ./backend
    environment:
      REDIS_URL: redis://redis:6379/0
      OCR_SERVICE_URL: http://ocr-worker:8001
    depends_on: [redis, ocr-worker]

  ocr-worker:
    build: ./ocr-worker
    expose: [8001]
    # Add NVIDIA container runtime only on GPU hosts.

  redis:
    image: redis:7-alpine
```

This is a deployment shape, not a complete production file. Production deployments also need HTTPS, authentication, resource limits, health checks, persistent job metadata, backups for the metadata only, and a controlled temporary storage policy.

For CPU deployment, start with one OCR worker and measure. For GPU deployment, pin the CUDA base image and verify the host driver, model VRAM requirement, worker count, and batch size. A GPU worker that runs out of memory is slower and less reliable than a smaller bounded queue.

Do not expose Redis or the OCR worker directly to the public internet. Only the API/reverse proxy should be public.

## 8. Performance expectations

The minimum throughput for a 500-page book in two minutes is approximately 4.2 completed pages per second, before accounting for rendering, preprocessing, network transfer, retries, and text arrangement.

That is not a realistic universal target for browser Tesseract or free Hugging Face serverless inference. It may be possible on a prepared, high-end GPU pipeline with pre-rendered images, multiple workers, and good page quality, but it must be proven with a representative benchmark.

Measure these separately:

1. PDF rendering time.
2. Image preprocessing time.
3. OCR time per page.
4. Upload/download time.
5. Queue wait time.
6. Text normalization time.
7. End-to-end time to first readable page.
8. End-to-end time to all pages.

The user experience target should be “the first pages become readable quickly and the remainder continues in the background,” not “the browser blocks for two minutes.”

## 9. Privacy and security

Bookflow's default should keep document content local. Remote OCR must be an explicit user choice.

When remote OCR is enabled:

- Tell the user that page images leave the device.
- Send only image-only pages, not the whole book by default.
- Keep `HF_TOKEN` and provider keys only in backend secrets.
- Use short-lived job access tokens or authenticated sessions.
- Delete temporary page images after completion or a short TTL.
- Do not log image bytes, page text, or authorization headers.
- Validate MIME type, dimensions, decompression size, and PDF page count.
- Scan uploads and reject malformed archives or oversized payloads.
- Document the retention policy and provider terms.

## 10. Rollout plan

### Phase 1: Current local path

- Keep native PDF extraction.
- Keep Tesseract.js for local English scanned-page OCR.
- Add page-level progress, cancellation, and resumable local state.
- Benchmark representative camera photos on phone and laptop.

### Phase 2: Self-hosted OCR

- Add a separate PaddleOCR or equivalent service.
- Add a FastAPI queue and bounded worker pool.
- Route only failed or low-confidence local pages.
- Add Docker CPU deployment first.
- Add an optional GPU profile after measuring CPU performance.

### Phase 3: Optional Hugging Face fallback

- Select a model with a currently active image-capable provider.
- Verify provider availability at startup and before a job.
- Enforce per-user page and request quotas.
- Make billing and privacy consent visible.
- Treat provider rate limits and outages as expected failures.

### Phase 4: Multi-user production

- Add Redis-backed queue state.
- Add multiple API replicas and separately scaled OCR workers.
- Add metrics, tracing, alerts, and load tests.
- Test 500 concurrent sessions with a smaller controlled number of OCR jobs.
- Test the maximum accepted 600-page job with cancellation and resume.

## 11. Final recommendation

For Bookflow, use this default:

```text
Native PDF text -> local Tesseract.js -> self-hosted OCR -> optional HF fallback
```

Use local OCR for privacy and ordinary devices. Use self-hosted OCR for difficult pages and large imports. Use Hugging Face only when the user opts in and the selected model/provider is confirmed available. Do not promise that free serverless inference will process every 400–600-page camera book in under two minutes.

Official references:

- [Hugging Face Inference Providers pricing](https://huggingface.co/docs/inference-providers/en/pricing)
- [Hugging Face image-text-to-text task](https://huggingface.co/docs/inference-providers/en/tasks/image-text-to-text)
- [Hugging Face server inference client](https://huggingface.co/docs/huggingface_hub/guides/inference)
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
