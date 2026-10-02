---
title: Docker OCR
type: guide
status: verified
updated: 2026-10-02
tags: [bookflow, ops, docker, paddleocr, deployment]
source-files: [docker-compose.yml,backend/Dockerfile.ocr,.env.example,backend/backendskills.md,README.md]
---

# Docker OCR

Self-hosted PaddleOCR through Docker. This is the preferred accelerated OCR path because it is
deterministic, stays under project control, and needs no external token.

Container names, ports, mounts, and environment variables below were checked against
`docker-compose.yml` and `backend/Dockerfile.ocr` on 2026-10-02.

## Containers

### `bookflow-paddleocr`

```text
Build       dockerfile: backend/Dockerfile.ocr
Base image  python:3.11-slim with PaddleOCR / PaddleX dependencies
Exposes     8080
Endpoints   /ocr and /health
Volume      paddleocr_models:/root/.paddlex for offline weight caching
```

The volume matters: weights download once and persist, so restarts do not re-fetch models.

### `bookflow-fastapi`

```text
Role     Gateway
Order    Routes to http://bookflow-paddleocr:8080/ocr first,
         then falls back to the Hugging Face or vLLM vision route
```

## Profiles

| Profile | Requirement | Cost |
| --- | --- | --- |
| Small | Default, no token | Self-hosted CPU |
| Medium | Higher quality setting | More compute per page |
| Hugging Face fallback | Token | Per-request billing |

The README states that the Docker workflow starts PP-OCRv6 small and medium profiles without an
API token. The Hugging Face fallback is optional and independently configured.

## Why self-hosted first

| Reason | Detail |
| --- | --- |
| Deterministic | Same input, same output, no provider variance |
| No per-page bill | Cost is the container, not the volume |
| No token | Nothing to leak or rotate |
| Privacy | Content goes to infrastructure the project controls |
| No rate limits | Throughput bounded by hardware, not a quota |

## Health checks

```text
Container probe   /health on port 8080, curl -f against localhost inside the container,
                  every 15s with a 120s start period
Gateway check     /api/health on port 8000
Startup           Confirm the gateway reports the OCR provider as available
```

`bookflow-fastapi` declares `depends_on: bookflow-paddleocr: condition: service_healthy`, so Compose
holds the gateway until the worker passes its healthcheck. That is a container start gate, not a
model-readiness gate: the first scan can still hit a cold model.

Verify provider availability at startup and before a job rather than discovering an outage
mid-scan. The rollout plan in the OCR documentation lists this explicitly.

## Configuration

```text
PADDLEOCR_URL   Gateway-side only. docker-compose.yml already sets it to
                http://bookflow-paddleocr:8080/ocr for the fastapi service
PADDLEOCR_PORT  Host port mapping for the worker, default 8080
PADDLEOCR_DEVICE, PADDLEOCR_PRELOAD_PROFILES, PADDLEOCR_MAX_IMAGE_MB
                Worker-side knobs, defaulting to cpu, small, and 20
OCR_MODEL       Only needed for the Hugging Face fallback
HF_TOKEN        Only needed for the Hugging Face fallback
```

There is no `backend/.env.example`. The template is the repository-root `.env.example`, and
`docker-compose.yml` substitutes from it. The worker-side variables are optional because the
compose file supplies defaults.

Detail: [[Environment Config]].

## Scaling path

From the documented OCR rollout plan:

| Phase | Content |
| --- | --- |
| Phase 1 | Local path only: native text plus local Tesseract |
| Phase 2 | Self-hosted OCR with a FastAPI queue and bounded worker pool, Docker CPU first |
| Phase 3 | Optional Hugging Face fallback with provider checks, quotas, visible consent |
| Phase 4 | Multi-user production: Redis-backed queue, multiple replicas, metrics, load tests |

Phase 4 additions: Redis queue state, separately scaled OCR workers, tracing and alerts, and
load tests including 500 concurrent sessions with a smaller controlled number of OCR jobs, plus
a maximum-size job with cancellation and resume.

## Honest capacity statement

Do not promise that a 400 to 600 page camera-captured book completes in two minutes. That
depends on page quality, rendering time, hardware, model choice, queue depth, and bandwidth. The
documentation is explicit about this, and the claim discipline in [[Ethical Guardrails]] applies.

## Verification

```bash
docker compose up -d
docker compose ps
curl http://localhost:8080/health     # PaddleOCR worker
curl http://localhost:8000/api/health # Gateway
```

Then confirm an end-to-end scan in the browser and compare recognized page order against the
source images.

Related: [[Backend OCR Engine]], [[OCR Decision Tree]], [[Testing Pipeline]], [[Dev Setup]].