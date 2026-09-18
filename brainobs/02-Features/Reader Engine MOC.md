---
title: Reader Engine MOC
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, reader, moc]
---

# Reader Engine MOC

The reader is Bookflow's product. Everything else supports it.

## Notes

- [[Focus Rail]] - the 42 percent rail, selection algorithm, pinning, static regions
- [[Bionic Reading]] - fixation weighting and the pure-React tokenizer
- [[Typography System]] - typefaces, letter tracking, slider ranges
- [[Themes and Atmospheres]] - theme tokens per atmosphere
- [[Navigation and Controls]] - keyboard, scroll intent, progress, touch
- [[Notes and Bookmarks]] - selection tooltip, margin notes, persistence

## The reading loop

```text
scroll -> rail anchor at 42% -> nearest eligible paragraph becomes active
       -> user reads, scrolls again -> focus advances
       -> Space or Escape pins a paragraph to hold it
       -> note or bookmark attaches to the pinned id
       -> progress persists against the document identity
```

## Core constants

| Constant | Value | File |
| --- | --- | --- |
| `FOCUS_RAIL_RATIO` | `0.42` | `src/features/reader/lib/readingController.js` |
| `MAX_SCROLL_INPUT` | `64` | same |
| `SCROLL_INTENT_THRESHOLD` | `96` | same |
| `FONT_SIZE_MIN` | `17` | `src/features/reader/config.js` |
| `FONT_SIZE_MAX` | `24` | same |
| Default `focusPace` | `240` ms | `src/features/reader/config.js` |

## Defaults that matter

`focus: 'soft'`, `mode: 'focus'`, `theme: 'paper'`, `bionic: false`, `letterSpacing: 'normal'`.
Bionic reading and the behavioral layer are opt-in. The calm reader is the default reader.

## Reader rules

- Keep the active unit readable, never harsh.
- Never make inactive text unreadable.
- Support keyboard, pointer, wheel, and touch.
- No horizontal overflow from 320px to 430px.
- Respect `prefers-reduced-motion`.

Related: [[Invariants]], [[Cognitive Ergonomics]], [[Accessibility Rules]].