---
title: Cognitive Ergonomics
type: research
status: verified
updated: 2026-09-18
tags: [bookflow, psychology, ergonomics, reading-science, research]
source-files: [src/features/reader/lib/readingController.js, src/features/reader/lib/focusRail.js, src/features/reader/lib/textFormatter.js, src/features/reader/components/SaccadicGuide.jsx, frontendskills.md]
---

# Cognitive Ergonomics

The reading-science basis for the focus rail and the bionic engine. These two features are not
aesthetics; they target specific, studied costs of screen reading.

## Problem statement

Unassisted screen reading imposes measurable costs:

| Cost | Mechanism |
| --- | --- |
| Saccadic regression | The eye jumps backward to re-read, wasting fixations |
| Visual fatigue | Sustained effort to track position in long text |
| Working-memory load | The reader must hold their place, not just comprehend |
| Overconfidence | Digital readers often believe they read better than they did |

Detail and sources: [[Retention Research]].

## The focus rail response

```text
FOCUS_RAIL_RATIO = 0.42
anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO
```

The rail places the active unit at 42 percent of the reader viewport height. Rationale:

| Reason | Effect |
| --- | --- |
| Upper-middle placement | The eye rests slightly above centre, so context above and below feels balanced |
| One active unit | Removes the position-tracking burden |
| Nearest-unit selection | Follows natural reading progress without manual selection |
| Previous-id bias | Prevents flickering between two equidistant paragraphs |
| Static region handling | Front and end matter scroll naturally instead of snapping |

The rail answers the deepest ergonomic complaint: nowhere to look. A reader always knows which
paragraph is current without deciding where to place attention.

Detail: [[Focus Rail]].

## Saccadic guide

`SaccadicGuide.jsx` computes the same rail position and can draw attention to the active unit
itself, so the reading line is visible rather than implied. It reads `FOCUS_RAIL_RATIO` from the
reader public API, keeping one source of truth for the geometry.

## The bionic response

Fixation weighting targets saccadic efficiency. Human perceptual span is asymmetric: roughly
three to four characters to the left of a fixation and fourteen to fifteen to the right. Bionic
reading bolds the leading characters of each word so the eye has a reliable anchor.

`getFixationLength` scales by word length:

| Word length | Fixation |
| --- | --- |
| 1 to 2 | 1 |
| 3 to 5 | 2 |
| 6 to 8 | 3 |
| 9 to 12 | 4 |
| 13 or more | 6 |

The result is a fixation anchor proportional to word length rather than a uniform prefix.

Detail: [[Bionic Reading]].

## The scroll intent response

Continuous scrolling is ergonomically hostile in a specific way: it produces no stable
landmarks. Bookflow reduces that with accumulators rather than raw event handling.

| Constant | Value | Ergonomics role |
| --- | --- | --- |
| `MAX_SCROLL_INPUT` | `64` | Ignores the spike of a violent wheel or flick |
| `SCROLL_INTENT_THRESHOLD` | `96` | Requires deliberate intent before committing a step |
| `LINE_COOLDOWN` | cooldown | Prevents rapid retriggering |

Effect: the active unit changes when the reader means it to change, not every time the trackpad
sends noise. This reduces the disorientation that makes vertical scrolling worse than paging.

Detail: [[Navigation and Controls]].

## Typography as ergonomics

| Control | Ergonomic purpose |
| --- | --- |
| Typeface | Match letterform clarity to the reader's visual processing |
| Letter tracking | Reduce crowding for readers who need separation |
| Line height | Prevent line-skipping and return-losing |
| Measure | Keep line length within comfortable saccade range |
| Font size | Reduce strain at distance or with low vision |

`OpenDyslexic` and `Atkinson Hyperlegible` exist because for some readers the default is not a
preference question but a legibility requirement.

Detail: [[Typography System]].

## Claim discipline

Approved:

- "Places the active paragraph near the golden-ratio reading line."
- "Reduces the need to manually track position."
- "Offers accessible typefaces and letter tracking for readers who need them."

Not approved:

- "Eliminates eye strain."
- "Guarantees better comprehension."
- "Proven to make you read faster."

The mechanical claims are defensible. Outcome claims require a study, and Bookflow does not
have one yet.

Detail: [[Ethical Guardrails]].

Related: [[Flow State Science]], [[Focus Rail]], [[Retention Research]].