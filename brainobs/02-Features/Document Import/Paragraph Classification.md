---
title: Paragraph Classification
type: feature
status: verified
updated: 2026-09-23
tags: [bookflow, import, classification, heuristic]
source-files: [src/shared/lib/text.js, src/shared/lib/text.test.js, src/features/reader/lib/focusEligibility.js, book-structure-algorithm.md]
---

# Paragraph Classification

A rule-based classifier that tags prose paragraphs by rhetorical role. Implemented as
`classifyParagraph` in `src/shared/lib/text.js`, alongside `formatClassification` for
human-readable output.

Status: **verified implementation**, with a deliberate accuracy caveat. The classifier exists,
is exported through `src/shared/lib/index.js`, and is unit tested in `text.test.js`. It is
heuristic, not a model, and must never be described as understanding a document.

## The seven categories

| Category | Signals used in the implementation |
| --- | --- |
| `STRUCTURAL_MARKER` | Horizontal rules or headings under 50 characters |
| `DIALOGUE` | Quoted spans, with dialogue-tag detection and a speech-ratio threshold |
| `VERSE / POETRY` | Line-broken text where every line is under 50 characters |
| `TRANSITIONAL` | Time or place bridge openers such as "Three hours later", "Meanwhile" |
| `INTERNAL_MONOLOGUE` | Thought framing and reflective question patterns |
| `DESCRIPTIVE` | High density of state verbs such as was, were, seemed, appeared, felt |
| `EXPOSITORY` | Background and definitional markers such as because, history, century |
| `ACTION` | Fallback for movement and real-time event language |

`DIALOGUE` also reports a variant: `Pure Dialogue` or `Dialogue + Action Beat`.

## Return shape

```json
{
  "type": "DIALOGUE",
  "variant": "Pure Dialogue",
  "logic": "Contains spoken communication with standard tags."
}
```

The `logic` string explains the decision, which makes the classifier inspectable rather than
opaque.

## Why it exists

Structural awareness lets the reader treat different content differently. A section of pure
headings and dividers should not behave like narrative prose for focus purposes, and front matter
should scroll natively instead of snapping paragraph by paragraph.

Detail: [[Focus Rail]].

## Accuracy discipline

The classifier is regex and heuristic based. It will misclassify unusual documents, and that is
expected and acceptable. Do not state that Bookflow "knows where the book starts" or "classifies
all books correctly". Related: [[Ethical Guardrails]].

## How it is tested

`src/shared/lib/text.test.js` covers dialogue classification with formatting output, and
structural marker classification for both headings and horizontal rules. Any change to the
category rules must add matching test coverage.

Detail: [[Testing Pipeline]].

## Focus eligibility

`isFocusEligibleChapter` in `src/features/reader/lib/focusEligibility.js` separately decides
whether a chapter participates in automatic focus. It is the structural consumer inside the
reader, and it is distinct from paragraph-level classification.

## Planned

Spatial multi-column layout sorting to eliminate column interleaving in two-column PDFs, which
is the largest remaining structural fidelity gap.

Detail: [[Roadmap MOC]], [[PDF Parsing]].