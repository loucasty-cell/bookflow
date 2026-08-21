# PP-OCRv6 Docker setup

Bookflow uses `PP-OCRv6_small_det` with `PP-OCRv6_small_rec` for its default accelerated scan. The higher-quality option uses `PP-OCRv6_medium_det` with `PP-OCRv6_medium_rec`. The small profile automatically retries a page with the medium profile when the small profile returns no text.

No Hugging Face token or model URL is required for these public PaddleOCR models. The model files are downloaded by the OCR container on first startup and cached in the `paddleocr_models` Docker volume.

## 1. Install the manual prerequisites

Install Docker Desktop and enable its WSL 2 engine on Windows. Start Docker Desktop and wait until its engine reports that it is running.

Verify the installation in PowerShell from the repository root:

```powershell
docker version
docker compose version
```

## 2. Create the local environment file

```powershell
Copy-Item .env.example .env
```

The token-free CPU configuration is:

```dotenv
PADDLEOCR_PORT=8080
PADDLEOCR_DEVICE=cpu
PADDLEOCR_PRELOAD_PROFILES=small
PADDLEOCR_MAX_IMAGE_MB=20
OCR_MODEL=
HF_TOKEN=
```

Set `PADDLEOCR_PRELOAD_PROFILES=small,medium` if both profiles should load when the container starts. This increases startup time and memory use but removes the first-request model load for quality mode.

## 3. Build and start the OCR services

```powershell
docker compose up --build
```

The initial startup downloads the selected public model files. Later starts reuse the Docker volume. Keep this terminal open, or use detached mode after the first successful start:

```powershell
docker compose up --build -d
docker compose logs -f bookflow-paddleocr bookflow-fastapi
```

## 4. Verify the service URLs

Open or request both health endpoints:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8000/api/health
```

The worker response should list the `small` and `medium` profiles. The backend response should report `paddleocr_configured` as `true`.

The URLs are:

- OCR worker: `http://localhost:8080/ocr`
- Bookflow backend: `http://localhost:8000`
- Backend scan endpoint: `http://localhost:8000/api/ocr/scan`
- Frontend: `http://localhost:3000`

The frontend talks to the Bookflow backend. Do not expose the OCR worker directly to public clients.

## 5. Start the frontend

In another PowerShell window:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`, choose the accelerated scanner, select a PDF, and choose one of these modes:

- **Balanced and faster** uses the small detector and recognizer. If they return no text for a page, the backend retries that page with medium.
- **Higher quality for difficult scans** sends every scanned page directly to the medium detector and recognizer.

PDF pages containing at least 15 native words bypass visual OCR. Only scanned or sparse-text pages are rendered and sent to the local OCR container.

## 6. Optional Hugging Face fallback

PaddleOCR does not need a token. Configure Hugging Face only if a separate vision-model fallback is wanted:

1. Create a read token at `https://huggingface.co/settings/tokens`.
2. Set `HF_TOKEN` in `.env`.
3. Set `OCR_MODEL` to a vision model available through the selected inference provider.
4. Set `HF_INFERENCE_URL` to that provider's compatible endpoint.
5. Restart with `docker compose up -d --build`.

If `OCR_MODEL` remains empty, a page fails cleanly when both PaddleOCR profiles cannot read it, and the user can switch to Bookflow's private browser OCR.

## 7. Production deployment

Deploy the FastAPI and PaddleOCR images on the same private container network. Only expose FastAPI through HTTPS. Set the public frontend origin in `CORS_ORIGINS`, apply authentication and rate limits at the FastAPI boundary, and keep the OCR worker private.

The current job and SSE state is process-local. Run one FastAPI replica until that state is moved to Redis or another shared job store. Multiple OCR worker replicas can be added behind a private load balancer after measuring CPU or GPU memory and page latency with representative scans.
