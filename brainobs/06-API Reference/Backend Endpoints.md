---
title: Backend Endpoints
type: reference
status: verified
updated: 2026-09-25
tags: [bookflow, api, backend, endpoints]
source-files: [backend/main.py, backend/app/routers/health.py, backend/app/routers/ocr.py, backend/app/routers/documents.py, backend/app/routers/reader.py, api.md]
---

# Backend Endpoints

Complete route reference. All routes are optional: the app reads documents without the backend.
The OCR scan route is called only after the user explicitly starts the accelerated OCR flow.

Base URL in development: `http://127.0.0.1:8000`, reached through the Vite `/api` proxy.

## OCR scan and streaming

### `POST /api/ocr/scan`

Starts a scanned-PDF job. Returns immediately with a job id.

- Content-Type: `multipart/form-data`
- Maximum PDF size: `50` MB
- Fields: `file` (PDF), `batch_size` (default 16), `ocr_profile` (`small` or `medium`)

```json
{ "job_id": "8b1c...", "total_pages": 240 }
```

### `GET /api/ocr/progress/{job_id}`

Server-Sent Events stream. Events: `initial`, `progress`, `completed`, `error`. Emits
`: keepalive` every 8 seconds.

Progress payload:

```json
{ "current_page": 42, "total_pages": 240, "percent": 17.5, "total_words": 12480 }
```

Completion payload adds `status`, `filename`, `total_words`, `pages_per_second`,
`elapsed_seconds`, `failed_pages`, `markdown`, and `pages`.

Detail: [[SSE Progress Streaming]].

### `POST /api/ocr/cancel/{job_id}`

Aborts the job and frees in-memory buffers.

### `POST /api/ocr/image`

Scans a single image.

### `POST /api/ocr/batch`

Scans a bounded batch of images.

### `POST /api/ocr/pdf`

Processes a PDF synchronously, using native text where available.

- Fields: `file`, `force_ocr` (optional boolean), `model_id` (optional)

Returns `success`, `title`, `pages`, `totalPages`, `successfulPages`, `failedPages`,
`totalWordCount`, `totalLatencyMs`, `modelUsed`.

### `GET /api/ocr/models`

Lists available OCR models and profiles.

## Documents

### `POST /api/documents/validate`

Validates extension and size without parsing.

- Content-Type: `application/x-www-form-urlencoded`
- Parameters: `file_name`, `file_size_bytes`

```json
{ "valid": true, "kind": "PDF", "fileName": "book.pdf", "fileSizeBytes": 1048576, "error": null }
```

### `POST /api/documents/parse`

Parses a document server-side and returns the normalized book.

- Content-Type: `multipart/form-data`, field `file`

```json
{
  "success": true,
  "book": { "title": "...", "author": null, "kind": "MARKDOWN", "chapters": [] },
  "message": "Document parsed successfully",
  "pageCount": 1,
  "wordCount": 180
}
```

Detail: [[Normalized Book Contract]].

## Reader utilities

### `POST /api/reader/segment`

Segments text into paragraphs and abbreviation-aware sentences.

Request: `{ "text": "...", "language": "en" }`

Response: `{ "paragraphs": [], "sentences": [], "wordCount": 11, "estimatedReadingSeconds": 3 }`

### `POST /api/reader/reading-time`

Request: `{ "wordCount": 440, "wordsPerMinute": 220 }`

Response: `{ "wordCount": 440, "wordsPerMinute": 220, "minutes": 2, "seconds": 0, "formattedLabel": "2 min read" }`

### `POST /api/reading-lens`

Status: **Partial** — explicit opt-in, bounded, streaming.

Sends only the selected passage and the reader's command to the configured Gemini model chain.
The request must include `consent: true`; the endpoint rejects requests without it, bounds prompt and
passage length, and never returns a fabricated answer when the provider is unconfigured.

Request: `{ "prompt": "...", "passage": "...", "action": "summarize|explain|translate|trivia", "consent": true }`

Response: `text/event-stream` with `start`, zero or more `delta`, and exactly one `completed` or `error`
event. `completed` includes the model, fallback state, and attempted model chain. Provider keys are read
from backend settings and sent upstream in a header. The endpoint is rate-limited per client and does
not echo upstream credentials or raw provider errors.

Consent and provider configuration live in [[Environment Config]].

### `POST /api/reader/notes/export` and `POST /api/reader/notes/import`

Validate note and bookmark bundles for cross-device portability.

## System

### `GET /api/health`

Service health check.

### `GET /api/info`

Configuration and model information.

## Current and planned

| Route | Purpose | Status |
| --- | --- | --- |
| `GET /api/social/resonance/{paragraph_hash}` | Mock paragraph-hash resonance response | Partial scaffold |
| `POST /api/social/events/session-pulse` | Mock session-pulse event intake | Partial scaffold |
| `POST /api/social/reactions` | Persistent social reactions | Planned |
| `POST /api/ai/intervention` | Drop-off detection micro-intervention | Planned |

Detail: [[Social Resonance]], [[Intervention Engine]].

## Error behaviour

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `400` | Invalid request or unreadable document |
| `422` | Validation failure with a `detail` payload |
| `500` | Internal failure |

The frontend surfaces `detail` when present so the user sees the real cause rather than a generic
failure.

Detail: [[OCR Decision Tree]].

## Aliasing convention

Every model uses Pydantic v2 `serialization_alias` and `validation_alias` with
`populate_by_name=True`, so Python snake_case maps to JSON camelCase on the wire without
duplicating models.

Detail: [[Backend Architecture]], [[Invariants]].

## CORS

Allowed origins come from `CORS_ORIGINS`, defaulting to ports 5173 and 3000 on localhost and
127.0.0.1. Add any other deployment origin explicitly.

Related: [[Environment Config]], [[Dev Setup]], [[Frontend Public APIs]].