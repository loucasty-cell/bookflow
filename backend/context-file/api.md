# Bookflow Backend API Reference

Comprehensive REST API contracts and endpoints exposed by the Bookflow FastAPI backend.

Base URL: `http://127.0.0.1:8000`  
Interactive Docs: `http://127.0.0.1:8000/docs` (Swagger UI) / `http://127.0.0.1:8000/redoc` (ReDoc)

---

## 1. System & Health Endpoints

### `GET /api/health`
Returns service health, version, and server timestamp.

**Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "app": "Bookflow Backend",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": 1724112000
}
```

### `GET /api/info`
Returns server capabilities, supported file formats, and Hugging Face OCR config.

**Response (`200 OK`)**:
```json
{
  "app": "Bookflow Backend",
  "version": "1.0.0",
  "supported_formats": [".pdf", ".epub", ".txt", ".md", ".markdown"],
  "max_upload_size_mb": 50,
  "hf_ocr": {
    "default_model": "microsoft/trocr-base-stage1",
    "token_configured": true,
    "available_models_count": 4
  }
}
```

---

## 2. Hugging Face OCR & Vision Endpoints

### `GET /api/ocr/models`
Lists recommended Hugging Face Vision/OCR models.

**Response (`200 OK`)**:
```json
{
  "defaultModel": "microsoft/trocr-base-stage1",
  "hfTokenConfigured": true,
  "availableModels": [
    {
      "id": "microsoft/trocr-base-stage1",
      "name": "TrOCR Base (Stage 1)",
      "description": "Fast and lightweight transformer OCR for printed and handwritten text.",
      "recommendedFor": "General single/multi-line text segments and pages."
    },
    {
      "id": "microsoft/trocr-large-printed",
      "name": "TrOCR Large (Printed)",
      "description": "High-accuracy transformer OCR optimized for printed book text.",
      "recommendedFor": "High-fidelity book pages and dense typography."
    },
    {
      "id": "stepfun-ai/GOT-OCR2_0",
      "name": "GOT-OCR 2.0",
      "description": "General OCR Theory 2.0 model handling plain text, formatting, and tables.",
      "recommendedFor": "Full page scans with complex formatting."
    },
    {
      "id": "facebook/nougat-base",
      "name": "Nougat Base",
      "description": "Neural Optical Understanding for Academic Documents.",
      "recommendedFor": "Academic papers and technical books."
    }
  ]
}
```

### `POST /api/ocr/image`
Single-image OCR extraction via Hugging Face Inference API.

- **Content-Type**: `multipart/form-data`
- **Headers (Optional)**: `Authorization: Bearer <token>` or `X-HF-Token: <token>`
- **Form Fields**:
  - `file`: Image binary (JPEG, PNG, WEBP, TIFF, BMP)
  - `model_id` (Optional): Hugging Face model ID

**Response (`200 OK`)**:
```json
{
  "pageNumber": 1,
  "text": "Extracted paragraph content.",
  "paragraphs": ["Extracted paragraph content."],
  "confidence": null,
  "modelUsed": "microsoft/trocr-base-stage1",
  "latencyMs": 142.5,
  "success": true,
  "error": null
}
```

### `POST /api/ocr/batch`
Concurrent OCR extraction over multiple image files (bounded by semaphore).

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `files`: Image binaries (max 20)
  - `model_id` (Optional): Hugging Face model ID

**Response (`200 OK`)**:
```json
{
  "success": true,
  "results": [
    {
      "pageNumber": 1,
      "text": "Page 1 text",
      "paragraphs": ["Page 1 text"],
      "modelUsed": "microsoft/trocr-base-stage1",
      "latencyMs": 120.0,
      "success": true,
      "error": null
    }
  ],
  "totalImages": 1,
  "modelUsed": "microsoft/trocr-base-stage1",
  "totalLatencyMs": 125.4
}
```

### `POST /api/ocr/pdf`
Processes a PDF document: uses native text stream first, falling back to Hugging Face Vision OCR for scanned pages.

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF binary
  - `force_ocr` (Optional, bool, default: `false`): Force vision OCR on all pages
  - `model_id` (Optional): Hugging Face model ID

**Response (`200 OK`)**:
```json
{
  "success": true,
  "title": "Document Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page 1 text content...",
      "paragraphs": ["Paragraph 1", "Paragraph 2"],
      "modelUsed": "microsoft/trocr-base-stage1",
      "latencyMs": 210.0,
      "success": true,
      "error": null
    }
  ],
  "totalPages": 1,
  "successfulPages": 1,
  "failedPages": 0,
  "totalWordCount": 240,
  "totalLatencyMs": 215.3,
  "modelUsed": "microsoft/trocr-base-stage1",
  "error": null
}
```

---

## 3. Document Ingestion Endpoints

### `POST /api/documents/validate`
Validates file extension and size constraints prior to transmission.

- **Content-Type**: `application/x-www-form-urlencoded`
- **Parameters**: `file_name` (str), `file_size_bytes` (int)

**Response (`200 OK`)**:
```json
{
  "valid": true,
  "kind": "PDF",
  "fileName": "sample.pdf",
  "fileSizeBytes": 1048576,
  "error": null
}
```

### `POST /api/documents/parse`
Parses PDF, EPUB, TXT, or Markdown into Normalized Book contract.

- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (binary)

**Response (`200 OK`)**:
```json
{
  "success": true,
  "book": {
    "title": "Principles of Reading",
    "author": "Author Name",
    "kind": "EPUB",
    "chapters": [
      {
        "title": "Chapter 1",
        "paragraphs": ["First paragraph text.", "Second paragraph text."],
        "subheadings": null,
        "focusEligible": true
      }
    ]
  },
  "message": "Document parsed successfully",
  "pageCount": 1,
  "wordCount": 180
}
```

---

## 4. Reader Utility Endpoints

### `POST /api/reader/segment`
Splits raw text into normalized paragraphs and abbreviation-aware sentences.

**Request Body**:
```json
{
  "text": "Dr. Watson met Mr. Holmes at 221B Baker St. The investigation began.",
  "language": "en"
}
```

**Response (`200 OK`)**:
```json
{
  "paragraphs": ["Dr. Watson met Mr. Holmes at 221B Baker St. The investigation began."],
  "sentences": [
    "Dr. Watson met Mr. Holmes at 221B Baker St.",
    "The investigation began."
  ],
  "wordCount": 11,
  "estimatedReadingSeconds": 3
}
```

### `POST /api/reader/reading-time`
Calculates reading duration metrics from word counts.

**Request Body**:
```json
{
  "wordCount": 440,
  "wordsPerMinute": 220
}
```

**Response (`200 OK`)**:
```json
{
  "wordCount": 440,
  "wordsPerMinute": 220,
  "minutes": 2,
  "seconds": 0,
  "formattedLabel": "2 min read"
}
```

### `POST /api/reader/notes/export` & `POST /api/reader/notes/import`
Validates export/import payloads for user notes and bookmarks.

---

## 5. Error Schema & HTTP Status Codes

All errors conform to standardized JSON:

```json
{
  "success": false,
  "error": "Error description or code",
  "detail": "Actionable failure details",
  "path": "/api/ocr/image"
}
```

| HTTP Code | Description | Typical Cause |
| --- | --- | --- |
| `400 Bad Request` | Validation failure | Unsupported extension, empty file, batch limit exceeded |
| `422 Unprocessable Entity` | Extraction failure | Password-protected PDF, malformed EPUB XML |
| `500 Internal Server Error` | Server exception | Network timeout reaching Hugging Face API |
