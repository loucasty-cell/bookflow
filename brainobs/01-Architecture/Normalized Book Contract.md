---
title: Normalized Book Contract
type: contract
status: verified
updated: 2026-09-25
tags: [bookflow, architecture, contract, data]
source-files: [src/features/document-import/lib/documentParsers.js, src/features/document-import/lib/backendOcrFallback.js, src/features/reader/lib/chapterEnrichment.js, backend/app/models/document.py, api.md]
---

# Normalized Book Contract

Every parser in Bookflow, browser or server, emits this shape. Reader components depend on
the contract, not on the parser. Changing it is a breaking change for both sides.

## Shape

```json
{
  "title": "Document Title",
  "author": "Author Name or null",
  "kind": "PDF | EPUB | TEXT | MARKDOWN",
  "chapters": [
    {
      "title": "Chapter 1",
      "focusEligible": true,
      "paragraphs": ["First complete paragraph text.", "Second complete paragraph text."],
      "subheadings": [
        { "title": "Subheading Title", "paragraphs": ["Paragraph within subheading."] }
      ]
    }
  ]
}
```

## Field rules

| Field | Rule |
| --- | --- |
| `title` | Non-empty string. Callers fall back to the filename without extension |
| `author` | String or `null`. Never guessed from filename |
| `kind` | One of `PDF`, `EPUB`, `TEXT`, `MARKDOWN` |
| `chapters` | Array. Must preserve document order |
| `chapters[].title` | Human-readable label. Backend OCR uses `Page N` |
| `chapters[].paragraphs` | Non-empty paragraph strings, already split |
| `chapters[].subheadings` | Optional, one level deep only |
| `chapters[].focusEligible` | False for front matter and end matter that should not snap |

## Backend OCR extensions

`scanPdfViaBackend` returns the base contract plus diagnostics:

| Extra field | Meaning |
| --- | --- |
| `ocrPageCount` | Number of chapters produced from scanned pages |
| `totalWords` | Word total reported by the backend |
| `skippedPages` | Page numbers the backend could not read |

These are additive. Anything consuming the contract can ignore them.

## Enriched reader paragraph model

`enrichChapters` in the reader feature flattens and enriches the contract for the focus rail;
`App.jsx` composes that result:

```json
{
  "id": "paragraph-0-0",
  "text": "A complete paragraph text.",
  "chapterIndex": 0,
  "paragraphIndex": 0
}
```

Id format is `paragraph-{chapterIndex}-{paragraphIndex}`, indexed in document order.

## Why ids matter

`paragraph-0-0` is the anchor for bookmarks, notes, the pinned focus state, and progress
restoration. Ids are stable within a single parse of an unchanged file.

Known limitation: if the document changes so that paragraph order shifts, previously stored
ids can point at different text. Settings and annotations are not silently deleted, but the
mapping can be lost for that file.

Detail: [[Storage and Persistence]], [[Notes and Bookmarks]].

## Contract tests to keep green

- Parsers produce `kind` values from the allowed set.
- `chapters` order matches source order.
- No empty paragraph strings survive into the contract.
- Backend OCR output passes the same shape checks as local output.
- Unreadable pages appear in `skippedPages` rather than disappearing.

Detail: [[Testing Pipeline]].

## Server-side schema

`backend/app/models/document.py` defines the Pydantic v2 equivalents: `NormalizedBook`,
`Chapter`, and paragraph structures, using `serialization_alias` and `validation_alias` so the
JSON on the wire matches the browser contract exactly.

Related: [[API Reference MOC]], [[Backend Architecture]].