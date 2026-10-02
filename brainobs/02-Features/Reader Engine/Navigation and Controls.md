---
title: Navigation and Controls
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, navigation, keyboard, touch]
source-files: [src/features/reader/hooks/useReaderNavigation.js, src/features/reader/hooks/useReaderInput.js, src/features/reader/hooks/useReaderMeasurement.js, src/features/reader/hooks/useReaderStaticRegion.js, src/features/reader/lib/readingController.js, src/features/reader/components/ReaderPage.jsx, src/features/reader/components/NotesPanel.jsx, src/features/reader/components/ContentsPanel.jsx, src/App.jsx]
---

# Navigation and Controls

Every input method a reader might use must work. Navigation is designed so no single input device
is required.

## Keyboard map

| Key | Action |
| --- | --- |
| `ArrowDown` | Advance focus |
| `ArrowUp` | Move focus back |
| `J` / `K` | Advance / move focus back |
| `PageDown` / `PageUp` | Move three paragraphs rapidly |
| `Space` / `Shift+Space` | Advance / move focus back |
| `Enter` / `Space` on a focused paragraph | Toggle that paragraph's pin |
| `Escape` | Hold or release the active focus; panels also use it to dismiss |
| `Ctrl/Cmd` + `K` | Open the Command Palette |
| `Ctrl/Cmd` + `B` | Toggle bookmark while the notes panel has focus |
| `Ctrl/Cmd` + `Enter` | Save the note draft |

Both arrow-style and vim-style keys are supported because both habits exist. The global reader
handler ignores form controls and other interactive descendants. Global `Space` navigates focus;
`Enter` or `Space` on a focused paragraph toggles that paragraph's pin. `Escape` toggles the active
hold and is also used by the focus-managed panels to dismiss them.

`getNavigationStep({ rapid })` in `readingController.js:26` is what makes `PageDown` and `PageUp`
skip three paragraphs while a single arrow moves one.

### Command Palette

`Ctrl/Cmd+K` is bound in `ReaderPage.jsx:136` and opens the Command Palette, which is rendered from
the same component at `ReaderPage.jsx:304`. The handler bails unless a modifier is held and the key
lowercases to `k`, so a plain `k` still steps focus forward.

Detail: [[Command Palette]].

### Notes panel shortcuts

`NotesPanel.jsx` binds two panel-scoped shortcuts:

| Shortcut | Line | Action |
| --- | --- | --- |
| `Ctrl/Cmd+B` | `NotesPanel.jsx:385` | Toggle bookmark for the selected paragraph |
| `Ctrl/Cmd+Enter` | `NotesPanel.jsx:390` | Save the note draft |

### The handler is scoped to the canvas, and focus is claimed on arrival

`useReaderInput` binds `keydown` to the reader element itself, not to `document`. Keyboard events
only reach it while focus is inside the reader, so **on arrival the reader claims focus once** with
`focus({ preventScroll: true })`.

Without that claim, opening a book left focus on the "Read the sample" button, which unmounts, so
focus fell back to `document.body` and every arrow key went nowhere until the reader was clicked.
Keyboard navigation works immediately on arrival because of this claim, not because of a global
listener.

Two details make the claim safe:

- `preventScroll` keeps the saved resume position. Plain `focus()` would scroll the canvas to the top
  and silently discard where the reader left off, which is why the naive fix was rejected.
- The claim only happens when `document.activeElement` is `document.body`, and only once, so an open
  settings panel or a focused button is never stolen from. The rule lives in the exported pure
  function `shouldClaimReaderFocus({ reader, activeElement, body, alreadyClaimed })` at
  `useReaderInput.js:22`, so it is unit-tested rather than buried in the effect.

`useReaderNavigation.js:10-11` composes `useReaderMeasurement` and `useReaderInput`, then re-exports
`moveFocus` and `lastNavigationAtRef`, which `src/App.jsx:282` consumes.

A pinned paragraph intentionally blocks arrow navigation until `Escape` releases the hold. That is
the "hold this paragraph in focus" behaviour, not a failure.

## Wheel and trackpad

Raw wheel deltas are unreliable, so the reader accumulates intent:

```text
raw event delta -> clamp to MAX_SCROLL_INPUT (64) -> add to accumulator
accumulator >= SCROLL_INTENT_THRESHOLD (96) -> commit one step, reset
LINE_COOLDOWN (240 ms) -> block immediate retrigger
```

Helpers: `accumulateScrollIntent`, `getIntentDirection`, `getNavigationStep`, all in
`readingController.js`.

This is why the focus rail feels calm on a trackpad and does not jump on a mouse wheel burst.

Detail: [[Focus Rail]], [[Cognitive Ergonomics]].

## Mouse and pointer

| Action | Result |
| --- | --- |
| Scroll | Focus follows the rail |
| Click a paragraph card | Pin that paragraph |
| Hover | Does not change focus |
| Drag over the landing intake | Import affordance |

Hover is deliberately inert for focus. Bookflow may use restrained hover feedback for controls, but
that is a Bookflow enhancement: the reviewed Figma files contain no hover state. Accidental focus
changes while moving the pointer around the page are a common complaint in reading apps, and
Bookflow avoids them.

Detail: [[Figma Inspection Evidence]].

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
| Commands | Open the Command Palette |
| Theme toggle | Switch light and dusk atmospheres |
| Close | Return to the landing page |

## Contents panel

`ContentsPanel.jsx` provides the chapter list, quick jump, and compact book statistics. On desktop it
is a collapsible sidebar. Below the tablet breakpoint it becomes an off-canvas drawer with a scrim.

`jumpToChapter` also notifies the import scheduler through `jumpToUnit`, so a reader moving ahead in
the book reprioritizes the units to be parsed. In the current app the PDF import handle is disposed
at terminal import, so that reprioritization only has an effect while an import is still live.

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

Detail: [[Accessibility Rules]], [[Reader Engine MOC]].