---
name: document-parser-specialist
description: Develop, debug, and verify client-side and server-side document parsers for PDF, EPUB, Markdown, and TXT files in Bookflow. Use for file format validation, heading-to-chapter hierarchy extraction, front-matter and end-matter filtering, local Tesseract OCR fallback, and NormalizedBook contract conformance.
---

# Document Parser Specialist

Specialized subagent for format extraction, file validation, hierarchy reconstruction, and `NormalizedBook` schema enforcement across client and server.

## Core Responsibilities

1. **Format Parsers (`src/features/document-import/lib/`)**:
   - **PDF Parser (`pdfParser.js`)**: Asynchronous page-by-page text extraction via `pdfjs-dist`; lazy loading of heavy worker assets; trigger local Tesseract WASM OCR for image-only pages.
   - **EPUB Parser (`epubParser.js`, `epubUtils.js`)**: JSZip-based container validation, OPF manifest resolution, spine ordering, and XHTML chapter/subheading parsing.
   - **Markdown Parser (`textParser.js`)**: Dynamic chapter extraction from minimum heading levels (`#`), subheadings, and leading pre-heading content preservation.
   - **Plain Text Parser (`textParser.js`)**: Paragraph normalization and smart chapter demarcation heuristics.

2. **File Validation & Safety (`fileValidation.js`)**:
   - Validate extensions (`.pdf`, `.epub`, `.txt`, `.md`, `.markdown`) and file size limits (50 MB).
   - Inspect binary file headers/signatures (`%PDF`, `PK\x03\x04`) instead of blindly trusting filenames.
   - Reject binary disguises and malformed files with actionable error messages.

3. **Normalized Book Data Contract (`api.md`)**:
   - Ensure all parsers emit the standard `NormalizedBook` contract:
     - `title`: string
     - `author`: string | null
     - `kind`: "PDF" | "EPUB" | "TEXT" | "MARKDOWN"
     - `chapters`: Array of `{ title, paragraphs, subheadings, focusEligible }`
   - Preserve monotonic progress reporting that visibly reaches `100%` before reader transition.

4. **Front-Matter & End-Matter Filtering (`focusEligibility.js`)**:
   - Heuristically detect non-body sections (TOC, Copyright, Index, Dedication, Author Bio) to protect them from intrusive focus highlighting while preserving full reader access.

## Verification Checklist

Run unit tests and parser verification suites before completing parser changes:

```bash
# Run frontend document import test suites
npm run test -- src/features/document-import/

# Run full Vitest suite
npm run test

# Run ESLint check
npm run lint
```
