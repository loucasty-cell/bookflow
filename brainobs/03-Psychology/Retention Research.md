---
title: Retention Research
type: research
status: verified
updated: 2026-09-18
tags: [bookflow, psychology, research, evidence, retention]
source-files: [Bookflowideas.md, improvements.md, goals.md, detailsinfo.md]
---

# Retention Research

What the evidence supports, what it does not, and how that shapes Bookflow's claims.

This note exists because the project's own documentation is explicit that product intuition is
not evidence. Claims about comprehension or reading time are marked as requiring a study.

## The central finding

A 2026 network meta-analysis of 56 studies and 79 effect sizes ranked paper highest for
expository reading comprehension, followed by tablets, e-readers, computers, and smartphones.

The nuance matters more than the ranking. The specific result:

| Condition | Paper versus digital |
| --- | --- |
| Vertical scrolling required | Paper had a reliable advantage |
| No scrolling required | Differences were small or not reliable |

That is the result Bookflow acts on. The problem is not screens. The problem is uncontrolled
scrolling with no stable landmarks.

Source: `https://link.springer.com/article/10.1007/s10639-025-13843-8`, cited in
`Bookflowideas.md`.

## Proposed mechanisms

The meta-analysis authors discuss several plausible causes:

| Mechanism | Bookflow response |
| --- | --- |
| Place-on-page tracking | Deterministic progress plus an explicit active unit |
| Screen size limits visible text | Adjustable measure and typography |
| Eye strain | Themes, contrast discipline, accessible typefaces |
| Cognitive load | One active unit, no competing chrome |
| Overconfidence | Progress shown honestly rather than assumed |

Note the framing: these are plausible mechanisms under discussion, not proven causal chains. The
documentation treats them as such.

## Why PDFs feel bad specifically

People rarely hate books. They hate the interaction cost around PDF reading. The documented
causes:

| Cause | Effect |
| --- | --- |
| Fixed layout, not reflowable | Tiny text, awkward columns, zoom and pan |
| Vertical scrolling | Lost spatial landmarks, harder look-back |
| Small screens | More navigation, higher working-memory demand |
| Scanned pages with no text layer | No search, selection, highlighting, or screen reader |
| Headers, footers, page numbers, hyphenation | Polluted extracted text |
| Mixed content: prose, equations, tables, figures | Plain extraction cannot reconstruct it |
| Large files | Long parse, high memory, frozen interface |
| Notification-heavy devices | Task switching and attention leakage |

Each row maps to either a built feature or a documented gap. Reader controls expose zoom,
layout, theme, focus, and progress rather than leaving each to be discovered.

Detail: [[PDF Parsing]], [[OCR Decision Tree]].

## What this justifies building

| Evidence | Build response |
| --- | --- |
| Scrolling hurts comprehension | Focus rail with a stable active unit |
| Native text is higher quality than OCR | Native-first OCR decision tree |
| Long waits break sessions | Progressive import, per-page streaming |
| Small screens raise load | Responsive design with zero overflow targets |
| Scanned pages break accessibility | OCR plus React text nodes plus accessible typefaces |

## Claims that require a study

Do not state these without measurement:

- "Improves comprehension."
- "Makes you read faster."
- "Reduces eye strain."
- "Helps you read more books."

The honest position: Bookflow reduces specific interaction costs that are known to hurt reading,
and measurement is pending. That position is stronger than an unsupported promise because it
survives scrutiny.

Detail: [[Ethical Guardrails]], [[Success Metrics]].

## What premium readers do differently

From the improvement analysis, mature reading products protect four things:

```text
fast first content
stable reading position
resilient offline and persistent state
invisible background work
```

Bookflow's progressive scheduler, deterministic progress, safe storage wrapper, and bounded
background OCR map directly onto those four.

## Sources

- Digital reading meta-analysis: `https://link.springer.com/article/10.1007/s10639-025-13843-8`
- PaddleX OCR pipeline documentation: `https://paddlepaddle.github.io/PaddleX/3.2/en/pipeline_usage/tutorials/ocr_pipelines/OCR.html`
- MDN File System API: `https://developer.mozilla.org/en-US/docs/Web/API/File_System_API`
- Tesseract OCR: `https://github.com/tesseract-ocr/tesseract`
- PaddleOCR: `https://github.com/PaddlePaddle/PaddleOCR`

Related: [[Cognitive Ergonomics]], [[Competitor Analysis]], [[Ethical Guardrails]].