---
title: TXT and Markdown
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, import, markdown, text, parser]
source-files: [src/features/document-import/lib/textParser.js, src/features/document-import/lib/documentParsers.js, src/shared/lib/text.js, src/features/document-import/lib/importCoordinator.js]
---

# TXT and Markdown

The two simplest formats, and the ones technical readers use most. The rule for both is: build
structure from what the document already declares, and never lose text that does not fit the
structure.

## Which path runs today

Both TXT and Markdown use the **blocking** parser in `handleFile`. A `progressiveTextImport`
coordinator is implemented and exported from the public API, but it is not wired into the app. Do not
describe TXT or Markdown import as progressive.

Detail: [[Document Import MOC]], [[Import Scheduler]].

## Markdown

Heading levels define the structure:

| Markdown | Becomes |
| --- | --- |
| Minimum heading level in the document | Chapter |
| Next level down | Subheading |
| Deeper levels | Inline readable text |
| Text before the first heading | Leading content, retained |
| Front matter fences | Stripped safely |

Using the minimum level present means a document that starts at `##` produces the same structure as
one that starts at `#`. The document declares its own base level.

## Plain text

Plain text has no declared structure, so sections are inferred:

- Paragraphs are split on blank lines and normalised.
- Section breaks are inferred from double line breaks and numeric markers.

Detail: [[Paragraph Classification]], [[Validation Rules]].

## Text normalization

`src/shared/lib/text.js` provides `splitParagraphs`, shared with the backend OCR path. Using the same
splitter on both sides means OCR output and local text produce consistent paragraph units, so the
reader behaves identically regardless of origin.

Also relevant:

| Helper | Purpose |
| --- | --- |
| `wordCount` | Word totals for reading time and statistics |
| `documentId` | Builds the `filename:size:lastModified` identity |
| Sentence segmentation | Uses `Intl.Segmenter` with a fallback for older engines |
| `classifyParagraph`, `formatClassification` | The paragraph classifier; see [[Paragraph Classification]] |

`Intl.Segmenter` gives correct sentence boundaries for abbreviations and decimals without a custom
rule set, and the fallback keeps older browsers working.

## Reading time

Two different numbers exist on purpose, and conflating them is a documentation error:

| Consumer | Default | Source |
| --- | --- | --- |
| Reader, per-paragraph duration estimate | `220` wpm, clamped to 900 to 8000 ms | `estimateReadingMs` in `readingController.js:36` |
| Library, pace assumption when nothing is measured | `230` wpm | `DEFAULT_WORDS_PER_MINUTE` in `readingSpeed.js:7` |

Once the library has enough samples (`MIN_SAMPLES_FOR_CONFIDENCE = 3`), the measured pace is used
instead of the default. The backend exposes the same calculation through
`POST /api/reader/reading-time` with a configurable `wordsPerMinute`.

Detail: [[Backend Endpoints]], [[Library and Reading Stats]].

## Known limitation

Markdown and EPUB structure is limited to one subheading level by design, and re-parsing a changed
file can reorder the flat paragraph list. Annotations stored against paragraph ids can therefore
orphan for that file. Text is preserved; the anchors may not be.

Detail: [[Storage and Persistence]], [[Notes and Bookmarks]].

## Verification

- Import Markdown starting at `#` and at `##` and confirm equivalent structure.
- Confirm text before the first heading survives.
- Confirm deeper headings render as text, not as navigation.
- Import a `.txt` with numbered sections and confirm chapters appear.

Detail: [[Testing Pipeline]], [[Document Import MOC]].