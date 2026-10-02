---
title: Focus Rail
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, focus, core-interaction]
source-files: [src/features/reader/lib/readingController.js, src/features/reader/lib/focusRail.js, src/features/reader/lib/staticRegion.js, src/features/reader/lib/focusEligibility.js, src/features/reader/lib/useScrollPosition.js, src/features/reader/hooks/useReaderInput.js, src/features/reader/hooks/useReaderNavigation.js, src/features/reader/hooks/useReaderStaticRegion.js, src/features/reader/components/SaccadicGuide.jsx]
---

# Focus Rail

The central interaction. As the reader scrolls, the eligible paragraph nearest the reading rail
becomes active, so attention does not have to be managed manually.

## The rail

```text
anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO
FOCUS_RAIL_RATIO = 0.38
```

`FOCUS_RAIL_RATIO` is declared in `src/features/reader/lib/readingController.js:1`, not in
`focusRail.js`. Everything that needs the rail position imports it from there: the scroll input
hooks, the static-region resolver, and the viewport helper `readerViewport.js`, which aliases it as
`DEFAULT_FOCUS_RATIO`.

The anchor sits at 38 percent of the reader viewport height, leaving comfortable context above and
below the active unit.

`SaccadicGuide.jsx` exists in the reader components tree but is not imported anywhere in `src/`, so
it is not mounted. Do not describe it as visible behaviour.

Detail: [[Cognitive Ergonomics]], [[Navigation and Controls]].

## Selection algorithm

This runs on every scroll frame, so it is the hottest path in the reader. Three exports in
`focusRail.js`:

| Function | Line | Purpose |
| --- | --- | --- |
| `selectClosestParagraph` | `focusRail.js:90` | Paragraph nearest the anchor, with a previous-id bias to avoid flip-flop |
| `selectNextParagraph` | `focusRail.js:134` | Sequential advance for keyboard and step controls |
| `selectFocusTarget` | `focusRail.js:155` | Focus target within a section; delegates to `selectClosestParagraph` |

### Two caches make it cheap

Paragraph tops are already in document order, so re-sorting the list on every frame to rediscover
that order is wasted work.

| Mechanism | Line | Behaviour |
| --- | --- | --- |
| `WeakMap` order cache | `focusRail.js:14` | Keyed on the *input array identity*, holding `{ sourceLength, ordered, stacked }`. A fresh array is a fresh measurement; the cache is invalidated when the cached `sourceLength` no longer matches the array length |
| Stacked-bottoms fast path | `focusRail.js:43` | When paragraph bottoms are non-decreasing, the set crossing the anchor is a contiguous run, so a binary search finds it. Overlapping blocks break that invariant, so `hasStackedBottoms` selects between a binary search and an exact linear scan |

Ordering falls back to a sort only when the input is genuinely out of order, so the selection result
is identical to a naive implementation. The cache is an optimisation, never a semantic change.

Measured effect: the cached-and-binary-searched path is an order of magnitude cheaper than
re-sorting plus linear scanning on the same machine. This is an order-of-magnitude claim, not an
exact factor. Absolute numbers vary substantially by machine, browser, and paragraph count, so do
not quote a specific multiple as a baseline.

Detail: [[Focus Rail Performance]].

## Scroll intent accumulator

Trackpad and wheel input is noisy. Instead of stepping on every event, Bookflow accumulates:

| Constant | Line | Value | Role |
| --- | --- | --- | --- |
| `MAX_SCROLL_INPUT` | `readingController.js:2` | `64` | Caps the delta taken from a single event |
| `SCROLL_INTENT_THRESHOLD` | `readingController.js:3` | `96` | Accumulated delta required to commit a step |
| `LINE_COOLDOWN` | `readingController.js:4` | `240` ms | Prevents rapid retriggering after a committed step |

Functions in the same file: `accumulateScrollIntent` (`:6`), `getIntentDirection` (`:17`),
`getNavigationStep` (`:26`, returns `3` when rapid and `1` otherwise), `readingProgress` (`:30`),
and `estimateReadingMs` (`:36`, default 220 wpm, clamped to 900 to 8000 ms).

A sign change in the accumulator resets it to the new delta rather than summing across directions,
so reversing a flick does not have to unwind the whole accumulated intent.

Effect: the active paragraph feels deliberate rather than jittery, and a trackpad flick does not
blow through half a chapter.

## Static regions

Front matter and end matter should not snap paragraph by paragraph. When the rail detects a
non-eligible region, scrolling becomes native and a small label appears. Focus resumes automatically
when the rail crosses back into eligible content.

### Resolving the section under the anchor

`sectionAtFocusRail(reader)` in `staticRegion.js:3` computes the anchor at
`bounds.top + clientHeight * FOCUS_RAIL_RATIO` (`:7`) and resolves in this order:

1. `document.elementFromPoint` at the anchor, then `closest('.reading-section')`, accepted only
   when the reader contains it (`:9-11`).
2. Fall back to a geometry scan for the section whose bounds contain the anchor (`:13-18`).
3. If the anchor sits above the first section and that section carries
   `data-focus-eligible="false"`, return it, so front matter can be detected (`:20-27`).

### Naming the region

`staticRegionName(section)` (`staticRegion.js:31`) reads the section's first `h2` and tests it
against a back-matter pattern only:

```text
appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author
```

Match returns `"Reading the end matter"`; anything else returns `"Reading the intro"`. So the label
is a two-way split, not a general classifier, and a section titled neither way still gets a label.

`useReaderStaticRegion.js` is the hook that wires this into the reader.

## Focus eligibility

`isFocusEligibleChapter(chapter, index, total)` in `focusEligibility.js:6` decides whether a chapter
participates in automatic focus at all:

| Pattern | Line | Rejects |
| --- | --- | --- |
| `FRONT_MATTER_PATTERN` | `focusEligibility.js:3` | cover, title page, contents, table of contents, copyright, dedication, acknowledg, preface, foreword, prologue, introduction, epigraph, author's note, opening note |
| `BACK_MATTER_PATTERN` | `focusEligibility.js:4` | appendix, bibliography, references, glossary, index, credits, afterword, epilogue, about the author |

Both are matched against the chapter title. Three further rules use word count and title shape, not
just the patterns: very short generic-titled chapters near the start or the end of the book are also
ineligible.

Detail: [[Paragraph Classification]].

## Pin and resume

| Action | Input |
| --- | --- |
| Pin or unpin a focused paragraph | Click or tap it, or focus it and use `Enter` or `Space` |
| Hold or release automatic focus | `Escape` in the reader |
| Step back or forward | `ArrowDown`/`ArrowUp`, `J`/`K`, `PageDown`/`PageUp`, or `Space`/`Shift+Space` |
| Resume automatic focus | Resume control in the reader |

Pinning freezes focus so the reader can scroll through nearby context without the highlight
moving. Pinned state is persisted as `pinnedId` in the document session.

A pinned paragraph intentionally blocks arrow navigation until `Escape` releases the hold. That is
the "hold this paragraph in focus" behaviour, not a failure.

## Focus intensities

| Setting | Behaviour |
| --- | --- |
| `soft` (default) | Gentle background emphasis on the active unit |
| `deep` | Strong emphasis, subdued surrounding text that remains legible |
| `off` | Continuous reading view with no rail emphasis |

`focusPace` (default 240 ms, `config.js:8`) tunes transition timing rather than the rail position.

## Visual treatment

The active paragraph uses a pale-blue highlight, a red edge accent, and increased weight.
Transition timing follows `focusPace` and honours `prefers-reduced-motion`, in which case the
change is applied without animation.

Detail: [[Design Tokens]], [[Motion and Transitions]].

## Reading progress

`readingProgress` in `readingController.js:30` computes deterministic progress from position, not
from time or engagement. Progress is honest: it reflects how far the reader has moved through the
document.

## Tests

`textFormatter`, `readingController`, `focusEligibility`, `focusRail`, and the scroll helpers all
have unit coverage. Real behaviour should still be verified in a browser: scroll, confirm the active
paragraph changes, confirm static regions do not snap, and confirm pin and resume work.

Detail: [[Verification Checklist]].

Related: [[Reader Engine MOC]], [[Sentence-Paced Scroll]], [[Library and Reading Stats]].