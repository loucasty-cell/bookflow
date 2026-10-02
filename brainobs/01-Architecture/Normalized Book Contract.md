---
title: Normalized Book Contract
type: contract
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, contract, data]
source-files: [src/features/document-import/lib/documentParsers.js,src/features/document-import/lib/pdfParser.js,src/features/document-import/lib/epubParser.js,src/features/document-import/lib/textParser.js,src/features/document-import/lib/manifestToBook.js,src/features/document-import/lib/ocrResultToBook.js,src/features/document-import/lib/backendOcrFallback.js,src/features/reader/lib/chapterEnrichment.js,src/features/reader/lib/focusEligibility.js,backend/app/models/document.py]
---

# Normalized Book Contract

Every parser in Bookflow, browser or server, emits this shape. Reader components depend on the
contract, not on the parser. Changing it is a breaking change for both sides.

## Shape

```json
{
  "title": "Document Title",
  "author": "Author Name or empty string",
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
| `title` | Non-empty string. Producers fall back to the filename without extension |
| `author` | String, possibly empty. The backend schema allows `null`; the browser producers emit `""` |
| `kind` | One of `PDF`, `EPUB`, `TEXT`, `MARKDOWN` |
| `chapters` | Array. Must preserve document order |
| `chapters[].title` | Human-readable label. Backend OCR uses `Page N` |
| `chapters[].paragraphs` | Non-empty paragraph strings, already split |
| `chapters[].subheadings` | Optional, one level deep only. Always `[]` or omitted for PDF and OCR |
| `chapters[].focusEligible` | **Computed at enrichment, not by the parser.** False for front matter and end matter that should not snap |

## What each producer actually emits

This is the part that drifted. Verified against the source on 2026-10-02.

| Producer | `title` | `author` | `kind` | `subheadings` | `focusEligible` | Extras |
| --- | --- | --- | --- | --- | --- | --- |
| `pdfParser.js:54-60` | PDF metadata `Title`, else `cleanTitle(file.name)` | PDF metadata `Author`, normalized. `""` when absent | `PDF` | never set | not set | `ocrPageCount` |
| `epubParser.js:116` | OPF `title` element, else `cleanTitle(file.name)` | OPF `creator` element, normalized. `""` when absent | `EPUB` | always `[]` (line 104) | not set | none |
| `textParser.js:197-199` | first Markdown H1, else `cleanTitle(file.name)` | `""` always | `MARKDOWN` for `.md`/`.markdown`, else `TEXT` | populated from H2 sections | not set | none |
| `manifestToBook.js:5-14` | `manifest.title` | `manifest.author ?? ""` | `manifest.kind` | never set | not set | `ocrPageCount` |
| `scanPdfViaBackend` (`backendOcrFallback.js:169-177`) | filename with `.pdf` stripped | `""` | `PDF` | never set | not set | `ocrPageCount`, `totalWords`, `skippedPages` |
| `ocrResultToBook.js` | `ocrResult.title` or `"OCR Document"` | **`"Hugging Face OCR"`** hardcoded | `PDF` | never set | not set | `ocrPageCount`, `totalWords`, `skippedPages` |

Three honest notes:

- **No browser producer sets `focusEligible`.** It is added by `enrichChapters` via
  `isFocusEligibleChapter(chapter, chapterIndex, sourceChapters.length)`, at
  `chapterEnrichment.js:47`. A contract consumer reading a raw parser output must not expect the key.
- **`ocrResultToBook` hardcodes the author as `"Hugging Face OCR"`.** That names the provider, not
  the writer, and contradicts the "author is never guessed" rule. It is the one clear contract bug
  in the current code.
- **`author` is `""`, not `null`, on the browser side.** The backend Pydantic model allows both. A
  consumer must handle both, or normalize on read.

### Structural difference between Markdown and the rest

`textParser.js` splits a Markdown document into chapters per H1 and subheadings per H2, and keeps a
leading `title: null` section (line 140) for text that appears before the first heading. EPUB does
the same shape from the spine. PDF and both OCR paths produce **flat chapters with no
subheadings** -- one chapter per page for OCR, and for PDF whatever the extractor decided.

## Backend OCR extensions

Additive fields. A consumer that ignores them still works.

| Field | Meaning |
| --- | --- |
| `ocrPageCount` | Chapters produced from scanned pages, or pages that needed local OCR |
| `totalWords` | Word total reported by the backend, or summed from page `word_count` |
| `skippedPages` | Page numbers that could not be read. Never silently dropped |

`getOcrSkippedPages` in `ocrResultToBook.js` collects a page number when the page is unreadable
**and** that number is not already covered by a readable page, then unions in any numbers the server
reported in `failedPages`, and returns them sorted. A duplicated page number therefore appears once.

`normalizeOcrPages` sorts by `page_number` with the original array index as a tiebreaker, so
duplicate page numbers keep a stable order instead of depending on server iteration order.

## The server-side schema

`backend/app/models/document.py` defines the Pydantic v2 equivalents.

```python
class NormalizedBook(BaseModel):
    title: str
    author: Optional[str] = None
    kind: Literal["PDF", "EPUB", "TEXT", "MARKDOWN"]
    chapters: List[Chapter] = Field(default_factory=list)

class Chapter(BaseModel):
    title: str
    paragraphs: List[str] = Field(default_factory=list)
    subheadings: Optional[List[Subheading]] = Field(default=None)
    focus_eligible: Optional[bool] = Field(default=True,
        serialization_alias="focusEligible", validation_alias="focusEligible")

class Subheading(BaseModel):
    title: Optional[str] = None
    paragraphs: List[str] = Field(default_factory=list)
```

The alias mapping is deliberate: `Paragraph.chapter_index` and `Paragraph.paragraph_index` both carry
`serialization_alias="chapterIndex"` and `validation_alias="chapterIndex"`, so Python snake_case maps
to the camelCase the browser expects in both directions. `Chapter` and `Paragraph` set
`model_config = ConfigDict(populate_by_name=True)`, which is required for that to work.

`ParseResponse` adds `page_count` and `word_count` as `pageCount` and `wordCount`.
`DocumentValidationResponse` adds `fileName` and `fileSizeBytes`.

Because `Chapter.focus_eligible` defaults to `True`, a server response that omits the key is read as
focus-eligible -- which matches the browser default and keeps the two sides consistent.

## Enriched reader paragraph model

`enrichChapters` in `src/features/reader/lib/chapterEnrichment.js` flattens and enriches the
contract for the focus rail:

```json
{
  "id": "paragraph-0-0",
  "text": "A complete paragraph text.",
  "chapterIndex": 0,
  "paragraphIndex": 0
}
```

Id format is `paragraph-{chapterIndex}-{paragraphIndex}`, assigned in document order across the
flattened chapters.

`readingMinutes(totalWords)` in the same module is `Math.max(1, Math.ceil(totalWords / 230))`.
This is a fixed estimate and is deliberately separate from the measured pace in
`features/library/lib/readingSpeed.js`, which blends observed words-per-minute with a prior.

## Why ids matter

`paragraph-0-0` is the anchor for bookmarks, notes, the pinned focus state, and progress
restoration. Ids are stable within a single parse of an unchanged file.

Known limitation, and it is real: if the document changes so that paragraph order shifts,
previously stored ids can point at different text. Settings and annotations are not silently
deleted, but the mapping can be lost for that file. `useReaderPersistence.js:55` carries an open
TODO (`improvements-gap-4`) to replace these anchors with quote selectors plus a normalized quote
hash, resolve by exact location first with prefix and suffix fallback, surface a "Review location"
prompt on ambiguity, and store the parser version in the document metadata.

Detail: [[Storage and Persistence]], [[Notes and Bookmarks]].

## Contract tests that exist

Not aspirations. Each of these is a real test file.

| Guarantee | Test |
| --- | --- |
| Manifest conversion keeps only READY units, ordered by page | `manifestToBook.test.js` |
| OCR result conversion, page ordering, skipped-page collection | `ocrResultToBook.test.js` |
| Chapter flattening and `paragraph-{c}-{p}` id assignment | `chapterEnrichment.test.js` |
| Front matter and end matter are not focus-eligible | `focusEligibility.test.js` |
| Progress clamping and label formatting | `progressLabel.test.js` |
| Book text renders as React text nodes, never raw HTML | `reader` component tests |
| Backend Pydantic schema accepts a browser-shaped payload | `backend/tests/test_documents.py`, `test_document_pdf_guards.py` |

## Rules for changing this contract

1. Add new fields as **optional with a default**. `ocrPageCount`, `totalWords`, and `skippedPages`
   are the precedent.
2. Never reorder or rename `chapters`, `paragraphs`, `title`, `author`, or `kind`.
3. If a producer starts setting `focusEligible`, `enrichChapters` must keep overwriting it. Today
   enrichment is the single source of that decision.
4. If a producer starts setting `subheadings`, check `enrichChapters` flattening first: PDF and OCR
   paths assume flat chapters.
5. Change `backend/app/models/document.py` and the browser parser in the same commit, or the two
   sides drift silently. Nothing enforces this.

Detail: [[Testing Pipeline]], [[API Reference MOC]], [[Backend Architecture]].