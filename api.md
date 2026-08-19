# Bookflow API and Data Contracts

This document specifies the internal JavaScript interfaces, browser-storage contracts, and FastAPI backend REST API endpoints used across the Bookflow application.

## 1. System Boundaries and Data Flow

```text
[Frontend Browser]
  Local File / Scanned Document
    |-> Browser File API
    |-> (Option A: Local Processing) Local JS Parsers (PDF.js / JSZip / Tesseract WASM)
    |-> (Option B: Backend Fast Processing) FastAPI Backend (/api/documents/parse or /api/ocr/...)
          |-> Hugging Face Vision Inference API (TrOCR / Nougat / GOT-OCR 2.0)
    |-> Normalized Book Object
    |-> React Reader State (Focus Rail, Active Sentence)
    `-> localStorage (Reading Progress, Bookmarks, Notes)
```

Document contents stay on the user's device by default. When the backend or Hugging Face OCR is utilized for accelerated scanning, requests are transmitted securely to the configured backend API endpoints.

---

## 2. Frontend Document Import API

Public exports from `src/features/document-import/index.js`:

```js
parseDocument(file, onProgress);
ACCEPTED_FILES;
```

### `parseDocument(file, onProgress)`

Returns a promise that resolves to a normalized book object.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `file` | Browser `File` | Local document selected by the user |
| `onProgress` | Optional function | Receives `(percent, label)` parsing updates |

#### Supported Extensions & Limits

- `.pdf` (Native text + local English OCR fallback)
- `.epub` (EPUB 2 / EPUB 3 packages)
- `.txt` (Plain UTF-8 text)
- `.md`, `.markdown` (CommonMark / GFM)
- Maximum file size: 50 MB

---

## 3. Normalized Book Data Contract

All document parsers (frontend and backend) return data conforming to the **Normalized Book Contract**:

```json
{
  "title": "Document Title",
  "author": "Author Name (or null)",
  "kind": "PDF | EPUB | TEXT | MARKDOWN",
  "chapters": [
    {
      "title": "Chapter 1",
      "focusEligible": true,
      "paragraphs": [
        "First complete paragraph text.",
        "Second complete paragraph text."
      ],
      "subheadings": [
        {
          "title": "Subheading Title",
          "paragraphs": [
            "Paragraph within subheading."
          ]
        }
      ]
    }
  ]
}
```

### Enriched Reader Paragraph Model

Inside `App.jsx`, each paragraph is enriched for the reading rail:

```json
{
  "id": "paragraph-0-0",
  "text": "A complete paragraph text.",
  "chapterIndex": 0,
  "paragraphIndex": 0
}
```

Paragraph identifiers follow `paragraph-{chapterIndex}-{paragraphIndex}` and are indexed in document order.

---

## 4. Browser Storage API

### Global Settings

- **Storage Key**: `bookflow:settings`
- **Schema**:

```json
{
  "fontSize": 20,
  "lineHeight": 1.9,
  "columnWidth": 720,
  "focus": "soft",
  "theme": "paper"
}
```

- `focus`: `"off"` | `"soft"` | `"deep"`
- `theme`: `"paper"` | `"dusk"`

### Per-Document Reading State

- **Identity**: `filename:size:lastModified`
- **Storage Key**: `bookflow:document:<document-identity>`
- **Schema**:

```json
{
  "notes": [
    {
      "id": "uuid-v4",
      "paragraphId": "paragraph-0-0",
      "quote": "Selected quote excerpt.",
      "text": "User margin note."
    }
  ],
  "bookmarks": ["paragraph-0-0"],
  "progress": 42,
  "scrollTop": 1850
}
```

---

## 5. FastAPI Backend REST API

Base URL: `http://127.0.0.1:8000`

### 5.1 System & Health

#### `GET /api/health`
Returns system status, service version, and server timestamp.

**Response** (`200 OK`):
```json
{
  "status": "healthy",
  "app": "Bookflow Backend",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": 1724112000
}
```

#### `GET /api/info`
Returns server capabilities, supported file formats, and OCR model configuration.

**Response** (`200 OK`):
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

### 5.2 Hugging Face OCR & Vision Endpoints

#### `GET /api/ocr/models`
Lists recommended Hugging Face Image-to-Text vision models.

**Response** (`200 OK`):
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

#### `POST /api/ocr/image`
Performs fast image-to-text OCR extraction on a single uploaded image.

- **Content-Type**: `multipart/form-data`
- **Headers** (Optional): `Authorization: Bearer <hf_token>` or `X-HF-Token: <token>`
- **Form Fields**:
  - `file`: Image file binary (JPEG, PNG, WEBP, TIFF, BMP)
  - `model_id` (Optional): Specific Hugging Face model identifier

**Response** (`200 OK`):
```json
{
  "pageNumber": 1,
  "text": "Extracted text from image.",
  "paragraphs": [
    "Extracted text from image."
  ],
  "confidence": null,
  "modelUsed": "microsoft/trocr-base-stage1",
  "latencyMs": 142.5,
  "success": true,
  "error": null
}
```

#### `POST /api/ocr/batch`
Performs concurrent OCR text extraction on multiple image files.

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `files`: Array of image files (maximum 20 per request)
  - `model_id` (Optional): Hugging Face model identifier

**Response** (`200 OK`):
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

#### `POST /api/ocr/pdf`
Processes a scanned PDF document: uses native text when available, and automatically dispatches scanned/image pages to Hugging Face Vision OCR models.

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF document binary
  - `force_ocr` (Optional, boolean): Force OCR for all pages
  - `model_id` (Optional): Hugging Face model identifier

**Response** (`200 OK`):
```json
{
  "success": true,
  "title": "Document Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page 1 contents...",
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

### 5.3 Document Parsing Endpoints

#### `POST /api/documents/validate`
Validates file extension and size constraints.

- **Content-Type**: `application/x-www-form-urlencoded`
- **Parameters**: `file_name` (string), `file_size_bytes` (integer)

**Response** (`200 OK`):
```json
{
  "valid": true,
  "kind": "PDF",
  "fileName": "book.pdf",
  "fileSizeBytes": 1048576,
  "error": null
}
```

#### `POST /api/documents/parse`
Parses a document file on the server and returns the Normalized Book structure.

- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (binary)

**Response** (`200 OK`):
```json
{
  "success": true,
  "book": {
    "title": "The Art of Reading",
    "author": "Jane Doe",
    "kind": "MARKDOWN",
    "chapters": [
      {
        "title": "Chapter 1",
        "paragraphs": ["First paragraph."],
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

### 5.4 Reader Utilities Endpoints

#### `POST /api/reader/segment`
Segments text into normalized paragraphs and abbreviation-aware sentences.

- **Request Body**:
```json
{
  "text": "Dr. Smith arrived at 3.14 Baker St. The door opened immediately.",
  "language": "en"
}
```

- **Response** (`200 OK`):
```json
{
  "paragraphs": [
    "Dr. Smith arrived at 3.14 Baker St. The door opened immediately."
  ],
  "sentences": [
    "Dr. Smith arrived at 3.14 Baker St.",
    "The door opened immediately."
  ],
  "wordCount": 11,
  "estimatedReadingSeconds": 3
}
```

#### `POST /api/reader/reading-time`
Calculates reading time estimation for a given word count or text sample.

- **Request Body**:
```json
{
  "wordCount": 440,
  "wordsPerMinute": 220
}
```

- **Response** (`200 OK`):
```json
{
  "wordCount": 440,
  "wordsPerMinute": 220,
  "minutes": 2,
  "seconds": 0,
  "formattedLabel": "2 min read"
}
```

#### `POST /api/reader/notes/export` & `POST /api/reader/notes/import`
Validates user notes and bookmark export bundles for cross-device portability.
