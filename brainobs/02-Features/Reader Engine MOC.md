---
title: Reader Engine MOC
type: MOC
status: living
updated: 2026-09-25
tags: [bookflow, reader, moc]
---

# Reader Engine MOC

The reader is Bookflow's product. Everything else supports it.

## Notes

- [[Focus Rail]] - the 38 percent rail, selection algorithm, pinning, static regions
- [[Bionic Reading]] - fixation weighting and the pure-React tokenizer
- [[Typography System]] - typefaces, letter tracking, slider ranges
- [[Themes and Atmospheres]] - theme tokens per atmosphere
- [[Navigation and Controls]] - keyboard, scroll intent, progress, touch
- [[Notes and Bookmarks]] - selection tooltip, margin notes, persistence
- [[Reading Lens and Focus Bar]] - consent-gated assistant card, both surfaces, drag, minimal card
- [[Sentence-Paced Scroll]] - Lenis configuration, single-ticker rule, programmatic scroll routing
- Long-book windowing - `useChapterWindow` keeps a bounded chapter window with spacers
- Local definition lookup - opt-in starter lexicon in `dictionary.js`; no network lookup

## The reading loop

```text
scroll -> rail anchor at 38% -> nearest eligible paragraph becomes active
       -> user reads, scrolls again -> focus advances
       -> Escape holds or releases the active paragraph
       -> focused paragraph plus Enter or Space toggles its pin
       -> note or bookmark attaches to the pinned id
       -> progress persists against the document identity
```

## Core constants

| Constant | Value | File |
| --- | --- | --- |
| `FOCUS_RAIL_RATIO` | `0.38` | `src/features/reader/lib/readingController.js` |
| `MAX_SCROLL_INPUT` | `64` | same |
| `SCROLL_INTENT_THRESHOLD` | `96` | same |
| `FONT_SIZE_MIN` | `17` | `src/features/reader/config.js` |
| `FONT_SIZE_MAX` | `24` | same |
| Default `focusPace` | `240` ms | `src/features/reader/config.js` |

## Defaults that matter

`focus: 'soft'`, `mode: 'focus'`, `theme: 'paper'`, `bionic: false`, `letterSpacing: 'normal'`.
`showRewardCapsules`, `showInterventionModals`, `showAchievements`, `showDefinitionLookup`, and
`enableAnnualGoal` are opt-in. Bionic reading and the behavioral layer are not the default.

## Reader rules

- Keep the active unit readable, never harsh.
- Never make inactive text unreadable.
- Support keyboard, pointer, wheel, and touch.
- Global focus keys are `ArrowDown`/`ArrowUp`, `J`/`K`, `PageDown`/`PageUp`, and `Space`/`Shift+Space`; `Escape` toggles the active hold.
- A focused paragraph uses `Enter` or `Space` to toggle its pin; global `Space` navigates focus.
- No horizontal overflow from 320px to 430px.
- Respect `prefers-reduced-motion`.

Related: [[Invariants]], [[Cognitive Ergonomics]], [[Accessibility Rules]].