---
title: Focus Rail
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, focus, core-interaction]
source-files: [src/features/reader/lib/readingController.js, src/features/reader/lib/focusRail.js, src/features/reader/lib/useScrollPosition.js, src/features/reader/hooks/useReaderNavigation.js, src/App.jsx, src/features/reader/components/SaccadicGuide.jsx]
---

# Focus Rail

The central interaction. As the reader scrolls, the eligible paragraph nearest the golden
ratio reading line becomes active, so attention does not have to be managed manually.

## The rail

```text
anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO
FOCUS_RAIL_RATIO = 0.42
```

The anchor sits at 42 percent of the reader viewport height, which is where the eye naturally
rests and slightly above the true golden ratio line, leaving comfortable context above and
below the active unit.

Implemented in `readingController.js` and consumed by `useScrollPosition.js`,
`useReaderNavigation.js`, and `SaccadicGuide.jsx`.

## Selection algorithm

Two related helpers in `focusRail.js`:

| Function | Purpose |
| --- | --- |
| `selectClosestParagraph` | Nearest eligible paragraph to the anchor, with a previous-id bias to avoid flip-flop |
| `selectFocusTarget` | Resolves the focus target within a section |
| `selectNextParagraph` | Sequential advance for keyboard and step controls |

`App.jsx` also runs `sectionAtFocusRail(reader)`, which resolves the section under the anchor
in this order:

1. `document.elementFromPoint` at the anchor, then `closest('.reading-section')`.
2. Fall back to the section whose bounds contain the anchor.
3. If the anchor is above the first section and that section is not focus eligible, return it
   so front matter can be detected.

## Scroll intent accumulator

Trackpad and wheel input is noisy. Instead of stepping on every event, Bookflow accumulates:

| Constant | Value | Role |
| --- | --- | --- |
| `MAX_SCROLL_INPUT` | `64` | Caps the delta taken from a single event |
| `SCROLL_INTENT_THRESHOLD` | `96` | Accumulated delta required to commit a step |
| `LINE_COOLDOWN` | cooldown between committed steps | Prevents rapid retriggering |

Functions: `accumulateScrollIntent`, `getIntentDirection`, `getNavigationStep`.

Effect: the active paragraph feels deliberate rather than jittery, and a trackpad flick does
not blow through half a chapter.

Detail: [[Cognitive Ergonomics]], [[Navigation and Controls]].

## Pin and resume

| Action | Input |
| --- | --- |
| Pin the active paragraph | Click or tap the card, `Space`, `Enter`, `Escape` |
| Resume automatic focus | Resume control in the reader |
| Step back or forward | Previous or next controls, arrow and `J`/`K` keys |

Pinning freezes focus so the reader can scroll through nearby context without the highlight
moving. Pinned state is persisted as `pinnedId` in the document session.

## Static regions

Front matter and end matter should not snap paragraph by paragraph. When the rail detects a
non-eligible region, scrolling becomes native and a small label appears
(`Reading the intro`, `Reading the end matter`). Focus resumes automatically when the rail
crosses back into eligible content.

Detection in `App.jsx` uses a title test:

```text
appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author
```

Matching chapters are treated as end matter and labelled accordingly.

Eligibility itself comes from `isFocusEligibleChapter` in `focusEligibility.js`, exposed
through the reader public API.

## Focus intensities

| Setting | Behaviour |
| --- | --- |
| `soft` (default) | Gentle background emphasis on the active unit |
| `deep` | Strong emphasis, subdued surrounding text that remains legible |
| `off` | Continuous reading view with no rail emphasis |

`focusPace` (default 240 ms) tunes transition timing rather than the rail position.

## Visual treatment

The active paragraph uses a pale-blue highlight, a red edge accent, and increased weight.
Transition timing follows `focusPace` and honours `prefers-reduced-motion`, in which case the
change is applied without animation.

Detail: [[Design Tokens]], [[Motion and Transitions]].

## Reading progress

`readingProgress` in `readingController.js` computes deterministic progress from position, not
from time or engagement. Progress is honest: it reflects how far the reader has moved through
the document.

## Tests

`textFormatter`, `readingController`, `focusEligibility`, and scroll helpers all have unit
coverage. Real behaviour should still be verified in a browser: scroll, confirm the active
paragraph changes, confirm static regions do not snap, and confirm pin and resume work.

Detail: [[Verification Checklist]].