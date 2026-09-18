---
title: TXT and Markdown
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, import, markdown, text, parser]
source-files: [src/features/document-import/lib/textParser.js, src/features/document-import/lib/documentParsers.js, src/shared/lib/text.js]
---

# TXT and Markdown

The two simplest formats, and the ones technical readers use most. The rule for both is: build
structure from what the document already declares, and never lose text that does not fit the
structure.

## Markdown

Heading levels define the structure:

| Markdown | Becomes |
| --- | --- |
| Minimum heading level in the document | Chapter |
| Next level down | Subheading |
| Deeper levels | Inline readable text |
| Text before the first heading | Leading content, retained |
| Front matter fences | Stripped safely |

Using the minimum level present means a document that starts at `##` produces the same
structure as one that starts at `#`. The document declares its own base level.

## Plain text

Plain text has no declared structure, so sections are inferred:

- Paragraphs are split on blank lines and normalized.
- Section breaks are inferred from double line breaks and numeric markers.

Detail: [[Paragraph Classification]], [[Validation Rules]].

## Text normalization

`src/shared/lib/text.js` provides `splitParagraphs`, shared with the backend OCR path. Using the
same splitter on both sides means OCR output and local text produce consistent paragraph units,
so the reader behaves identically regardless of origin.

Also relevant:

| Helper | Purpose |
| --- | --- |
| `wordCount` | Word totals for reading time and statistics |
| `documentId` | Builds the `filename:size:lastModified` identity |
| Sentence segmentation | Uses `Intl.Segmenter` with a fallback for older engines |

`Intl.Segmenter` gives correct sentence boundaries for abbreviations and decimals without a
custom rule set, and the fallback keeps older browsers working.

## Reading time

Estimated at 230 words per minute. The backend exposes the same calculation through
`POST /api/reader/reading-time` with a configurable `wordsPerMinute`.

Detail: [[Backend Endpoints]].

## Known limitation

Markdown and EPUB structure is limited to one subheading level by design, and re-parsing a
changed file can reorder the flat paragraph list. Annotations stored against paragraph ids can
therefore orphan for that file. Text is preserved; the anchors may not be.

Detail: [[Storage and Persistence]].

## Verification

- Import Markdown starting at `#` and at `##` and confirm equivalent structure.
- Confirm text before the first heading survives.
- Confirm deeper headings render as text, not as navigation.
- Import a `.txt` with numbered sections and confirm chapters appear.

Detail: [[Testing Pipeline]].