---
title: Accessibility Rules
type: rules
status: verified
updated: 2026-09-18
tags: [bookflow, ux, accessibility, a11y, rules]
source-files: [AGENTS.md, frontendskills.md, src/features/reader/components/SettingsPanel.jsx, src/features/reader/components/ReaderPage.jsx]
---

# Accessibility Rules

Accessibility is a reader requirement, not a compliance task. Some readers use Bookflow
specifically because the typography options exist.

## Interaction targets

- Every interactive control is at least `44 x 44` CSS pixels on mobile.
- Verify actual rendered rectangles, not declared styles. A 44px button with 8px of negative
  margin is a 36px target.

## Keyboard

| Key | Action |
| --- | --- |
| `Down` / `J` | Advance focus |
| `Up` / `K` | Move focus back |
| `Space` / `Enter` | Pin the active paragraph |
| `Escape` | Pin, or dismiss the open panel |

Requirements:

- Every control is reachable by keyboard.
- Focus order follows visual order.
- Closed panels are removed from the focus order.
- Opening a panel moves focus into it and closing returns focus to its trigger.
- Focus is always visible.

Detail: [[Navigation and Controls]].

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
not reliably be.

Detail: [[Invariants]].

## Colour and contrast

- Prose meets WCAG AAA against its own surface.
- Muted text stays legible rather than decorative.
- Active state is never conveyed by colour alone. Weight and edge treatment carry it too.
- Themes are verified individually, including near-black Dusk.

Detail: [[Themes and Atmospheres]].

## Motion and transparency

- `prefers-reduced-motion: reduce` removes animation without removing content.
- `prefers-reduced-transparency` is respected. Blur is never required for legibility.

Detail: [[Motion and Transitions]].

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
- [ ] Every icon button has an accessible name.
- [ ] `aria-pressed` matches visible state on every toggle.
- [ ] Reduced motion removes animation, keeps content.
- [ ] Contrast verified in each theme the panel exposes.
- [ ] 320px viewport has no horizontal overflow.
- [ ] Touch targets measured, not assumed.
- [ ] Progress and status changes announced.

Detail: [[Verification Checklist]].