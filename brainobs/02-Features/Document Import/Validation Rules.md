---
title: Validation Rules
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, import, validation, security]
source-files: [src/features/document-import/lib/fileValidation.js, src/features/document-import/index.js, src/features/document-import/hooks/useDocumentImport.js, backend/app/models/document.py, backend/app/routers/documents.py, backend/app/services/document_service.py, backend/app/core/config.py, backend/main.py]
---

# Validation Rules

Validation runs before parsing and treats every input as hostile. Cheap checks first means a bad
file never reaches an expensive parser.

## Accepted formats

Declared in `src/features/document-import/lib/fileValidation.js`:

| Constant | Line | Value |
| --- | --- | --- |
| `MAX_FILE_SIZE` | `fileValidation.js:1` | `50 * 1024 * 1024` (50 MB) |
| `SUPPORTED_EXTENSIONS` | `fileValidation.js:2` | `["pdf", "epub", "txt", "md", "markdown"]` |
| `ACCEPTED_FILES` | `fileValidation.js:3` | `".pdf,.epub,.txt,.md,.markdown"` |

`ACCEPTED_FILES` is the string handed to the file input, and `SUPPORTED_EXTENSIONS` is the array the
validator tests against, so the accepted set has exactly one source of truth.

Note that `.markdown` is accepted alongside `.md`. Do not document only four extensions.

## Size ceiling

50 MB maximum, checked before parsing so an oversized file cannot exhaust memory. The size test runs
at `fileValidation.js:57` and the extension test at `:61`.

## Validation order

```text
1  Extension allowed?
2  Size within 50 MB?
3  Structural sanity (archive readable, header present)
4  Only then: parse
```

Failing fast at step 1 or 2 costs nothing and prevents the expensive paths from ever running.

## Server-side opinion

`POST /api/documents/validate` mirrors the local rules for callers that want a backend opinion.

Request:

```json
{ "file_name": "book.pdf", "file_size_bytes": 1048576 }
```

Response, from `DocumentValidationResponse` at `backend/app/models/document.py:75`:

```json
{ "valid": true, "kind": "PDF", "fileName": "book.pdf", "fileSizeBytes": 1048576, "error": null }
```

`kind` is one of the `Literal["PDF", "EPUB", "TEXT", "MARKDOWN"]` values from the same module, so
the server and client agree on the four kinds even though the client accepts five extensions.

## Untrusted input rules

Document markup, archives, filenames, and metadata are untrusted. Applied consistently:

| Input | Treatment |
| --- | --- |
| Filename | Used for identity and a default title only. Never executed, never trusted as a path |
| Archives | Entries validated before extraction, not after |
| Markup | Parsed for text and structure, never injected as HTML |
| Metadata | Displayed as text nodes, sanitized of unexpected content |
| Page count | Bounded before allocating per-page work |
| MIME type | Checked server-side for uploads |

## Backend upload validation

The backend adds its own bounds on top of the shared extension and size rules:

| Guard | Value | Where |
| --- | --- | --- |
| Upload ceiling | `MAX_UPLOAD_MB = 50`, `MAX_UPLOAD_BYTES = 52428800` | `backend/main.py:90-91` |
| Declared-size pre-check | rejects before reading the body | `backend/main.py:179` |
| Actual-bytes check | rejects after reading the body | `backend/main.py:191` |
| EPUB archive guards | 500 entries, 100 MB uncompressed, 10 MB per XML entry | `document_service.py:326-328` |
| OCR page ceiling | `max_pdf_pages_ocr` 1000 | `backend/app/core/config.py:93` |
| OCR batch ceiling | `max_batch_images` 32 | `backend/app/core/config.py:92`, checked at `routers/ocr.py:215` |
| OCR image ceiling | `OCR_MAX_IMAGE_MB` default 20 | `backend/ocr_worker.py:26` |

Both the declared size and the actual byte count are checked, because a client-supplied size header
is untrusted in the same way a filename is.

## User-visible behaviour

| Failure | Message style |
| --- | --- |
| Unsupported extension | States supported types |
| Over 50 MB | States the ceiling |
| Corrupt file | Offers the repair-tolerant path where one exists |
| Empty document | Says no readable text was found, rather than opening a blank reader |

No failure path silently discards content without telling the user.

Detail: [[Invariants]], [[Privacy Model]], [[Import Scheduler]].

## Verification

- Test an unsupported extension.
- Test a file just over 50 MB.
- Test a renamed file with the wrong extension.
- Test a `.markdown` file, not only `.md`.
- Test an empty document.
- Test a malformed archive.
- Confirm each produces a clear message and no partial silent success.

Detail: [[Verification Checklist]].