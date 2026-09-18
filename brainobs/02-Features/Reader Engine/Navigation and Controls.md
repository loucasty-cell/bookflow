---
title: Navigation and Controls
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, navigation, keyboard, touch]
source-files: [src/features/reader/hooks/useReaderNavigation.js, src/features/reader/lib/readingController.js, src/features/reader/components/ContentsPanel.jsx, src/App.jsx]
---

# Navigation and Controls

Every input method a reader might use must work. Navigation is designed so no single input
device is required.

## Keyboard map

| Key | Action |
| --- | --- |
| `Down` | Advance focus |
| `Up` | Move focus back |
| `J` | Advance focus |
| `K` | Move focus back |
| `Space` | Pin or resume the active paragraph |
| `Enter` | Pin the active paragraph |
| `Escape` | Pin, or dismiss the open panel |

Both arrow-style and vim-style keys are supported because both habits exist.

## Wheel and trackpad

Raw wheel deltas are unreliable, so the reader accumulates intent:

```text
raw event delta -> clamp to MAX_SCROLL_INPUT (64) -> add to accumulator
accumulator >= SCROLL_INTENT_THRESHOLD (96) -> commit one step, reset
LINE_COOLDOWN -> block immediate retrigger
```

Helpers: `accumulateScrollIntent`, `getIntentDirection`, `getNavigationStep`.

This is why the focus rail feels calm on a trackpad and does not jump on a mouse wheel burst.

Detail: [[Focus Rail]], [[Cognitive Ergonomics]].

## Mouse and pointer

| Action | Result |
| --- | --- |
| Scroll | Focus follows the rail |
| Click a paragraph card | Pin that paragraph |
| Hover | Does not change focus |
| Drag over the landing intake | Import affordance |

Hover is deliberately inert. Accidental focus changes while moving the pointer around the page
are a common complaint in reading apps, and Bookflow avoids it.

## Touch

- Swipe opens and closes drawers via the off-canvas panel.
- Tap pins the active card.
- All interactive controls meet a 44 by 44 CSS pixel minimum.
- Safe area insets are respected so controls are not lost under notches or home bars.

## Reader controls

| Control | Purpose |
| --- | --- |
| Resume | Return to automatic focus |
| Chapter navigation | Jump by chapter or section |
| Progress | Percentage, slider, total unit count |
| Previous / next | Step through units deterministically |
| Bookmark | Toggle a bookmark on the focused unit |
| Copy | Copy the focused paragraph |
| Note | Add a margin note to the focused unit |
| Settings | Open the appearance and ergonomics panel |
| Theme toggle | Switch light and dusk atmospheres |
| Close | Return to the landing page |

## Contents panel

`ContentsPanel.jsx` provides the chapter list, quick jump, and compact book statistics. On
desktop it is a collapsible sidebar. Below the tablet breakpoint it becomes an off-canvas
drawer with a scrim.

`jumpToChapter` also notifies the import scheduler through `jumpToUnit`, so a reader moving
ahead in the book reprioritizes the units to be parsed.

Detail: [[Import Scheduler]].

## Progress semantics

`readingProgress` derives progress from position in the document. It is deterministic:

- No time-based or engagement-based inflation.
- No variable-ratio reward mechanic.
- Progress only moves when the reader moves.

This is intentional and reinforced by [[Ethical Guardrails]].

## Accessibility of controls

- Every control has an accessible name.
- Overlay panels set `aria-modal` and move focus correctly when opened and closed.
- Closed panels are removed from keyboard focus order.
- Status changes are announced rather than only shown visually.

Detail: [[Accessibility Rules]].