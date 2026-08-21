# Bookflow Debugging and Troubleshooting Guide

This guide provides diagnostic workflows, common error resolutions, and verification checklists for both the Bookflow React frontend and the FastAPI backend.

---

## 1. Fast Diagnostic Commands

### Frontend Diagnostics

```bash
# Run automated unit tests
npm run test

# Run ESLint check
npm run lint

# Verify production build compilation
npm run build
```

### Backend Diagnostics

```bash
# Run backend pytest suite (using uv or local venv)
uv run --with-requirements backend/requirements.txt pytest backend/tests/ -v
# Or with active virtual environment:
pytest backend/tests

# Run backend with detailed logging
cd backend
python run.py
```

### Server Health Check

```bash
# Verify backend API availability
curl -s http://127.0.0.1:8000/api/health
```

---

## 2. Hugging Face OCR Debugging

### Symptom: `401 Unauthorized` on OCR Endpoints
- **Root Cause**: Missing or invalid Hugging Face API key.
- **Resolution**:
  1. Generate an API token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
  2. Add `HF_API_KEY=hf_your_token_here` in `backend/.env`.
  3. Alternatively, pass the token in request headers: `X-HF-Token: hf_...` or `Authorization: Bearer hf_...`.

### Symptom: `503 Model is Loading`
- **Root Cause**: Serverless Hugging Face Inference models cold start when called after idle periods.
- **Resolution**: The `HuggingFaceOCRService` automatically reads the `estimated_time` header/payload and retries up to 3 times with exponential backoff.
- **Tip**: For high-volume production, configure a dedicated Inference Endpoint on Hugging Face and set `HF_INFERENCE_URL` to its exact URL.

### Symptom: `429 Rate Limit Exceeded`
- **Root Cause**: Exceeded free-tier inference request quotas.
- **Resolution**:
  1. Reduce concurrency in `MAX_BATCH_IMAGES`.
  2. Use a Hugging Face Pro account or dedicated endpoint token.
  3. Allow requests to fall back to native PDF extraction or client-side Tesseract OCR.

### Symptom: OCR Output is Blank or Low Quality
- **Root Cause**: Poor image contrast, low resolution, or complex multi-column layout.
- **Resolution**:
  1. Ensure the image is right-side up; `HuggingFaceOCRService.preprocess_image()` automatically applies EXIF transpose.
  2. Confirm the model in `OCR_MODEL` is deployed by the selected Inference Provider and supports image-to-text input.
  3. If the provider does not support the model, use private on-device OCR or configure a compatible dedicated endpoint.

---

## 3. Frontend Document Import Debugging

### Symptom: PDF Shows "PDF contains no readable text"
- **Root Cause**: The PDF consists of scanned raster images without an embedded text layer.
- **Resolution**:
  1. If running locally, Bookflow triggers bundled Tesseract.js English OCR.
  2. If using the backend, use `POST /api/ocr/pdf` with `force_ocr=true` to process the pages via Hugging Face OCR.

### Symptom: PDF.js Worker Fails to Load
- **Root Cause**: Path mismatch for `pdf.worker.min.mjs` in Next.js build.
- **Resolution**: Verify `pdfjs-dist` worker configuration in `src/features/document-import/lib/pdfParser.js`. The `scripts/copy-assets.js` script copies the worker to `public/` at build time.

### Symptom: EPUB Parsing Errors
- **Root Cause**: Non-standard EPUB structure or missing `META-INF/container.xml`.
- **Resolution**: Check `src/features/document-import/lib/epubParser.js`. The parser validates the container XML, locates the OPF manifest, and extracts spine items in sequence.

---

## 4. Reader & Focus Rail Debugging

### Symptom: Active Focus Sentence Does Not Move While Scrolling
- **Root Cause**: Reader scroll listener detached or paragraph elements missing `data-paragraph-id`.
- **Resolution**:
  1. Verify the reader container has `overflow-y: auto`.
  2. Check that the element at the 42% viewport rail has `data-focus-eligible="true"`.
  3. If pinned, unpin with Space/Enter or click to resume scroll-driven focus.

### Symptom: Front Matter / Copyright Page Gets Focused
- **Root Cause**: Section has not been classified as front matter by `focusEligibility.js`.
- **Resolution**: Check `isLikelyFrontOrEndMatter` rules in `src/features/reader/lib/focusEligibility.js` or `backend/app/services/text_service.py`. Headings containing "Contents", "Copyright", "Title", or having fewer than 40 words are marked non-eligible by default.

---

## 5. Storage & Persistence Debugging

### Symptom: Notes or Reading Progress Lost on Refresh
- **Root Cause**: Document identity changed or `localStorage` quota exceeded.
- **Resolution**:
  1. Check document identity key format: `bookflow:document:<filename:size:lastModified>`.
  2. Check browser console for `QuotaExceededError`.
  3. Verify safe JSON deserialization via `src/shared/lib/storage.js`.

---

## 6. Pre-Commit / Pre-Release Checklist

- [ ] `npm run lint` passes with 0 warnings/errors.
- [ ] `npm run test` passes all unit tests.
- [ ] `npm run build` generates a clean Next.js production build in `.next/`.
- [ ] `pytest backend/tests` passes all backend test suites.
- [ ] No API keys, credentials, or private documents in source code or `.env`.
- [ ] No emojis in code or commit messages.
- [ ] Responsive layout checked on desktop (1440px), tablet (768px), and mobile (375px).
