---
title: Paragraph Classification
type: feature
status: partial
updated: 2026-09-18
tags: [bookflow, import, classification, heuristic]
source-files: [book-structure-algorithm.md, src/features/reader/lib/focusEligibility.js]
---

# Paragraph Classification

A heuristic, rule-based classifier that tags prose paragraphs by rhetorical role. It is used to
reason about section structure and focus eligibility.

Status: partial. The classifier is heuristic, not a model. Treat its output as a hint, never as
a ground truth about the document.

## The seven categories

| Category | Signals |
| --- | --- |
| `DIALOGUE` | Quotation marks, dialogue tags, dashes |
| `ACTION` | Physical movement verbs, real-time event language |
| `DESCRIPTIVE` | Sensory detail, worldbuilding vocabulary |
| `EXPOSITORY` | Background, history, definitional language |
| `INTERNAL_MONOLOGUE` | Thought framing, reflective verb patterns |
| `STRUCTURAL_MARKER` | Headings, dividers, scene breaks |
| `VERSE` / POETRY | Short line-broken structures |

## Why it exists

Structural awareness lets the reader treat different content differently: a section of pure
headings and dividers should not behave like narrative prose for focus purposes, and front
matter should scroll natively instead of snapping paragraph by paragraph.

Detail: [[Focus Rail]].

## Accuracy discipline

The project documentation is explicit that classification accuracy claims require validation.
Do not state that Bookflow "knows where the book starts" or "classifies all books correctly".
Heuristics misclassify unusual documents, and that is expected.

Related: [[Ethical Guardrails]].

## Focus eligibility

`isFocusEligibleChapter` in `focusEligibility.js` decides whether a chapter participates in
automatic focus, exposed through the reader public API. It is the concrete consumer of
structural judgement in the reader.

## Planned

Spatial multi-column layout sorting to eliminate column interleaving in two-column PDFs, which
is currently the largest structural fidelity gap.

Detail: [[Roadmap MOC]], [[PDF Parsing]].