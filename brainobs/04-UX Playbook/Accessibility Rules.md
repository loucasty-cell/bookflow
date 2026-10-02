---
title: Accessibility Rules
type: rules
status: verified
updated: 2026-10-02
tags: [bookflow, ux, accessibility, a11y, rules]
source-files: [AGENTS.md, frontendskills.md, src/shared/lib/focusManagement.js, src/shared/lib/index.js, src/styles/tokens.css, src/styles/motion.css, src/features/widgets/components/WidgetFrame.jsx, src/features/reader/components/SettingsPanel.jsx, src/features/reader/components/ReaderPage.jsx, src/features/reader/components/CommandPalette.jsx, src/features/reader/hooks/useReaderInput.js, src/features/reader/hooks/useReaderStaticRegion.js]
---

# Accessibility Rules

Accessibility is a reader requirement, not a compliance task. Some readers use Bookflow
specifically because the typography options exist.

## Interaction targets

- Every interactive control is at least `--control-size` square, and `--control-size` is `44px`.
  It is defined once in `src/styles/tokens.css` and consumed via `min-height`, `min-width`, `width`,
  and `height` in `src/styles/components.css`.
- Verify actual rendered rectangles, not declared styles. A 44px button with 8px of negative
  margin is a 36px target.

## Keyboard

| Key | Action |
| --- | --- |
| `ArrowDown` / `J` | Advance focus |
| `ArrowUp` / `K` | Move focus back |
| `PageDown` / `PageUp` | Move three paragraphs rapidly |
| `Space` / `Shift+Space` | Advance / move focus back |
| `Enter` / `Space` on a focused paragraph | Toggle that paragraph's pin |
| `Escape` | Hold or release focus, or dismiss a panel |

Requirements:

- Every control is reachable by keyboard.
- Focus order follows visual order.
- Closed panels are removed from the focus order.
- Opening a panel moves focus into it and closing returns focus to its trigger.
- Focus is always visible. The global `:focus-visible` outline is 3px at a 3px offset, coloured
  from `--accent` with `--brand-royal` as the fallback.

Detail: [[Navigation and Controls]], [[Figma Inspection Evidence]].

## One focus trap, not several

`useModalFocus` in `src/shared/lib/focusManagement.js` is the single focus-trap implementation for
the whole app. It is exported from `src/shared/lib/index.js` and every modal consumer imports it
from there.

| Consumer | Notes |
| --- | --- |
| `SettingsPanel.jsx` | Reader settings drawer |
| `ContentsPanel.jsx` | Contents navigator |
| `NotesPanel.jsx` | Notes drawer |
| `CommandPalette.jsx` | Delegates containment, Escape, and restoration entirely |
| `SessionRecap.jsx` | Library session recap |
| `InterventionModal.jsx` | Opt-in drift intervention |
| `App.jsx` | Root-level layer |

The rule is that a new overlay uses `useModalFocus` rather than hand-rolling a Tab handler. Two
traps in one tree fight each other, and the reader loses focus containment entirely.

Its signature is
`useModalFocus({ open, containerRef, onClose, initialFocusRef, returnFocusRef })`. Four properties
worth knowing:

- Focus moves in on the next animation frame, after layout, so the first focusable element is
  measurable.
- `Escape` calls `preventDefault` and `stopPropagation`, so one Escape cannot close two layers.
- Focusable candidates are filtered to elements that are not `aria-hidden` and that actually have
  client rects, so a visually hidden control never becomes a trap stop.
- On close, if the remembered trigger is gone, disconnected, or inside `[inert]` or
  `[aria-hidden="true"]`, focus falls to `[data-modal-fallback-focus]` rather than to `document.body`.

A consumer must not implement its own Tab handling on top of this.

## Screen readers and semantics

| Element | Requirement |
| --- | --- |
| Overlay panels | `role="dialog"`, `aria-modal="true"` |
| Toggle controls | `aria-pressed` reflecting real state |
| Icon-only buttons | `aria-label` describing the action |
| Grouped controls | `role="group"` with an accessible label |
| Loading and progress | Announced, not only drawn |
| Book text | React text nodes, so it is real text to assistive tech |

The React text node rule serves accessibility as well as security. Text rendered through
element trees is selectable, searchable, and screen-reader readable, which HTML injection would
not reliably be. `RecentShelf` states the same rule in its own header: a hostile filename or EPUB
title must never execute.

Widget progress uses `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and
`aria-valuenow`. Widget ring SVGs are `aria-hidden="true"` and `focusable="false"`, because the
percentage is already exposed as a text label beside them.

Detail: [[Invariants]].

## Colour and contrast

- Prose meets WCAG AAA against its own surface.
- Muted text stays legible rather than decorative.
- Active state is never conveyed by colour alone. Weight and edge treatment carry it too.
- Themes are verified individually, including near-black Dusk.

`node scripts/security/contrast.mjs` is the gate. It parses `src/styles/tokens.css`,
`src/styles/themes.css`, `src/styles/themes-overrides.css`, and `src/features/lens-bar/lens-bar.css`
directly, rather than reading a duplicated table, so a token change that breaks legibility fails
the check instead of shipping. It uses `4.5` for body pairs and `3.0` for large ones.

The lens bar is measured separately because it is portaled to `body` and themes itself, so its
contrast cannot be inferred from the app theme layer.

Measured 2026-10-02: PASS, 63 pairs checked, 11 skipped as token-absent.

Detail: [[Themes and Atmospheres]].

## Motion and transparency

- `prefers-reduced-motion: reduce` removes animation without removing content. `src/styles/motion.css`
  clamps every CSS animation and transition to `0.01ms`, and JS-driven surfaces check
  `matchMedia` or `useReducedMotion` themselves.
- `prefers-reduced-transparency` is respected. Blur is never required for legibility. The
  reduced-transparency blocks in `motion.css` and `responsive.css` remove `backdrop-filter` and
  supply an opaque background fallback.

Detail: [[Motion and Transitions]], [[Home Widgets]].

## Typography accommodations

| Accommodation | Purpose |
| --- | --- |
| Atkinson Hyperlegible | High letterform distinction for low vision |
| OpenDyslexic | Weighted baselines that resist letter inversion |
| Wide and spacious tracking | Reduce character crowding |
| Line height control | Prevent line-skipping |
| Measure control | Keep line length comfortable |
| Font size control | Reduce strain |

Detail: [[Typography System]].

## Layout requirements

- No horizontal overflow from 320px to 430px.
- Safe area insets honoured for notches and home bars.
- Content remains usable at browser zoom and with text-only scaling.

Detail: [[Responsive Breakpoints]].

## Verification checklist

- [ ] Keyboard-only pass through landing, import, reader, notes, and settings.
- [ ] Focus trapped correctly in each overlay, restored on close.
- [ ] No overlay implements its own Tab handling; all of them call `useModalFocus`.
- [ ] Every icon button has an accessible name.
- [ ] `aria-pressed` matches visible state on every toggle.
- [ ] Reduced motion removes animation, keeps content.
- [ ] `node scripts/security/contrast.mjs` passes.
- [ ] 320px viewport has no horizontal overflow.
- [ ] Touch targets measured against `--control-size`, not assumed.
- [ ] Progress and status changes announced.

Detail: [[Verification Checklist]].