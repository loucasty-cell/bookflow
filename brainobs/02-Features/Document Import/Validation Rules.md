---
title: Validation Rules
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, import, validation, security]
source-files: [src/features/document-import/lib/fileValidation.js, src/features/document-import/index.js, backend/app/routers/documents.py, AGENTS.md]
---

# Validation Rules

Validation runs before parsing and treats every input as hostile. Cheap checks first means a
bad file never reaches an expensive parser.

## Accepted formats

| Extension | Kind | Path |
| --- | --- | --- |
| `.pdf` | `PDF` | Native text then OCR if needed |
| `.epub` | `EPUB` | JSZip archive reading |
| `.txt` | `TEXT` | Paragraph grouping |
| `.md`, `.markdown` | `MARKDOWN` | Heading-derived structure |

`ACCEPTED_FILES` is the exported source of truth for the accepted set.

## Size ceiling

50 MB maximum. The check happens before parsing so an oversized file cannot exhaust memory.

`POST /api/documents/validate` mirrors this on the server for callers that want a server-side
opinion:

```json
{ "file_name": "book.pdf", "file_size_bytes": 1048576 }
```

Response:

```json
{ "valid": true, "kind": "PDF", "fileName": "book.pdf", "fileSizeBytes": 1048576, "error": null }
```

## Validation order

```text
1  Extension allowed?
2  Size within 50 MB?
3  Structural sanity (archive readable, header present)
4  Only then: parse
```

Failing fast at step 1 or 2 costs nothing and prevents the expensive paths from ever running.

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

The backend additionally checks:

- MIME type and declared type agreement.
- Image dimensions for image uploads.
- Decompression size, to prevent archive bombs.
- PDF page count, before scheduling per-page work.

## User-visible behaviour

| Failure | Message style |
| --- | --- |
| Unsupported extension | States supported types |
| Over 50 MB | States the ceiling |
| Corrupt file | Offers the repair-tolerant path where one exists |
| Empty document | Says no readable text was found, rather than opening a blank reader |

No failure path silently discards content without telling the user.

Detail: [[Invariants]], [[Privacy Model]].

## Verification

- Test an unsupported extension.
- Test a file just over 50 MB.
- Test a renamed file with the wrong extension.
- Test an empty document.
- Test a malformed archive.
- Confirm each produces a clear message and no partial silent success.

Detail: [[Verification Checklist]].