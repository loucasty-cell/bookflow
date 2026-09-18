---
title: Concept Graph
type: spec
status: exploratory
updated: 2026-09-18
tags: [bookflow, roadmap, concept-graph, exploratory]
source-files: [frontendskills.md, features.md]
---

# Concept Graph

Exploratory. In-memory cross-chapter linking so a term defined earlier can be recalled when it
reappears later.

Status: **exploratory**. No implementation exists. This note records the design space and the
constraints, not a commitment.

## The problem

Long non-fiction introduces a term once, then uses it fifty pages later assuming the reader
remembers it. Flipping back destroys the reading position and the flow. That cost is real, and it
is exactly the kind of friction Bookflow exists to remove.

## Design space

| Level | Approach | Cost | Value |
| --- | --- | --- | --- |
| 1 | Index headings and bolded or emphasized terms | Low | Moderate |
| 2 | Track repeated capitalized noun phrases per chapter | Low | Good |
| 3 | Pattern-match explicit definition phrasing | Medium | Good |
| 4 | Local embedding search across chapters | High | High |
| 5 | Remote semantic indexing | Rejected | Violates privacy |

Levels 1 to 3 are feasible with the current dependency set and no new packages. Level 4 would
require a local model, which is real weight and real complexity. Level 5 is out of scope because
it would send book content off the device.

Detail: [[Privacy Model]].

## Honest constraint

There is no reliable local semantic model in the current project, and adding one is a
significant dependency decision requiring explicit approval. Any documentation claiming
"semantic understanding" today would be false.

Detail: [[Invariants]], [[Ethical Guardrails]].

## Candidate design, level 2

```text
Build phase   During import, per chapter, collect candidate terms
Candidate     Repeated capitalized phrases; emphasized spans; heading terms
Store         Map of term -> [{ chapterIndex, paragraphIndex }]
Exclude       Common words, sentence-initial false positives, dialogue
Memory        In-memory only for the session. Never persisted. Never uploaded.
Surface       When a tracked term appears again, offer a subtle affordance
Reveal        A popover with the first definition context, not a full-text search
Never         A floating tooltip on every term, which would cover the text
```

The look-up must be one deliberate action, not automatic decoration. Automatically annotating
text competes directly with the focus rail.

## Rules

| Rule | Reason |
| --- | --- |
| Opt-in | Same standard as bionic reading |
| In-memory only | No content persistence |
| Never covers the text | The reading column stays clear |
| Never fires automatically on hover | Hover is inert in the reader by design |
| Reduced motion compliant | Any reveal transition respects the preference |
| No accuracy claims | A heuristic index is a heuristic |

## Why this is interesting for technical books

The same mechanism serves technical Markdown well: a function or type introduced in chapter two
and used in chapter nine. It extends naturally toward the planned AST-guided structural chunking
and dual-pane code and prose highlighting ideas.

Detail: [[Bionic Reading]], [[TXT and Markdown]].

## Decision required before building

This needs an explicit answer before implementation:

```text
Choice A   Heuristic term index only, no new dependency
Choice B   Add a small local model for embedding search, new dependency, approval required
Choice C   Defer indefinitely until the library and storage work is complete
```

Given the backlog ordering in [[Backlog P0-P1-P2]], Choice C is the current default.

## Acceptance criteria if built

- [ ] Index is built in memory and never persisted.
- [ ] Feature is opt-in and off by default.
- [ ] Reveal requires a deliberate action, never hover.
- [ ] No new dependency without explicit approval.
- [ ] No accuracy claim appears in any user-facing copy.
- [ ] Text is never obscured by an automatic annotation.

Related: [[Future Features MOC]], [[Feature Spec Template]], [[Roadmap MOC]].