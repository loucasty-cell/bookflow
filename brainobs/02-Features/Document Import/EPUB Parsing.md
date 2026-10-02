---
title: EPUB Parsing
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, import, epub, parser]
source-files: [src/features/document-import/lib/epubParser.js, src/features/document-import/lib/epubUtils.js, src/features/document-import/lib/documentParsers.js, backend/app/services/document_service.py]
---

# EPUB Parsing

EPUB is a zip archive of XHTML documents with a package manifest describing reading order. JSZip
reads the archive locally in the browser; nothing is uploaded.

`epubParser.js` owns the parse and `epubUtils.js` holds the archive helpers it shares. Neither is
exported from the feature barrel.

## Which path runs today

EPUB uses the **blocking** parser in `handleFile`, not the progressive coordinator. A
`progressiveEpubImport` coordinator is implemented and exported from the public API, but it is not
wired into the app. Do not describe EPUB import as progressive or cancellable today.

Detail: [[Document Import MOC]], [[Import Scheduler]].

## Resolution sequence

```text
1  Open the .epub archive with JSZip
2  Read META-INF/container.xml to locate the OPF package
3  Parse the OPF: metadata, manifest, and spine
4  Walk the spine in order; each spine item becomes a chapter
5  Within each item, read h2 and h3 into one subheading level
6  Deeper headings stay as inline readable text
7  Collect title and author from metadata
```

## Structure rules

| Element | Becomes |
| --- | --- |
| Spine item | Chapter |
| `h2`, `h3` | Subheading section inside the chapter |
| Deeper headings | Inline text, never dropped |
| Metadata title | `title` |
| Metadata creator | `author` |

One subheading level is a deliberate simplification. It keeps the reader model predictable and the
navigation honest. Deeper heading text is still rendered; it just is not a separate navigation level.

Detail: [[Normalized Book Contract]].

## Supported versions

EPUB 2 and EPUB 3 packages. Both are handled through the same container and OPF resolution path, so
version differences do not require separate parsing logic.

## Security posture

Archives are untrusted input. The backend parser is explicit about this, with three hard caps
declared in `backend/app/services/document_service.py:326-328`:

| Guard | Value | Why |
| --- | --- | --- |
| `MAX_EPUB_ENTRIES` | `500` | Bounds archive-bomb fan-out |
| `MAX_EPUB_UNCOMPRESSED_BYTES` | `100 MB` | Bounds total inflated size |
| `MAX_XML_BYTES` | `10 MB` | Bounds a single XML entry before parsing |

XML is parsed with `defusedxml` when it is installed, falling back to the standard library otherwise,
and an oversized entry raises rather than being truncated.

Client-side rules:

- Entry names are treated as hostile, not as safe paths.
- Extracted markup is parsed for text and structure, never injected as HTML.
- Book text reaches the reader as React text nodes.
- Malformed archives fail with a clear error rather than a partial silent success.

Detail: [[Validation Rules]], [[Invariants]].

## Failure modes

| Situation | Behaviour |
| --- | --- |
| Missing container.xml | Parse error reported to the user |
| OPF present but spine empty | Error rather than an empty book |
| XHTML entry unreadable | That chapter is skipped and reported, others continue |
| Encrypted or DRM-protected | Not supported, error surfaced |
| Entry count or inflated size over the caps | Error rather than partial extraction |
| Deeply nested headings | Rendered as inline text |

## Known limitation

Re-parsing a changed EPUB can shift the flat paragraph order, which can orphan annotations stored
against paragraph ids for that file. The imported text itself is never deleted.

Detail: [[Storage and Persistence]], [[Notes and Bookmarks]].

## Verification

- Import an EPUB 2 and an EPUB 3 file and confirm chapter order matches spine order.
- Confirm title and author come from metadata.
- Confirm subheadings appear and deeper headings remain readable.
- Confirm a malformed archive produces a clear error.
- `pytest backend/tests/` covers the backend archive guards.

Detail: [[Testing Pipeline]], [[Backend Architecture]].