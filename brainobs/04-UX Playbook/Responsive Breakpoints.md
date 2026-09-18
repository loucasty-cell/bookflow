---
title: Responsive Breakpoints
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, ux, responsive, mobile, layout]
source-files: [reactUIUXcover.md, frontendskills.md, src/styles.css]
---

# Responsive Breakpoints

Three layouts, one set of rules. The hard requirement is no horizontal overflow at any mobile
width.

## Desktop large, over 1040px

| Aspect | Behaviour |
| --- | --- |
| Landing | Two-column hero: copy plus artwork |
| Contents navigator | Fixed collapsible sidebar, 294px |
| Reader canvas | Centred, `margin-right: 336px` with settings open, `356px` with notes open |
| Panels | Side materials, not sheets |

## Tablet and small desktop, 660px to 1040px

| Aspect | Behaviour |
| --- | --- |
| Landing | Single-column stacked hero |
| Focus card | `min(340px, calc(100vw - 36px))` |
| Contents | Off-canvas slide-in drawer with `.mobile-scrim` |
| Panels | Drawers rather than permanent columns |

The focus card width formula is the important detail. It prevents the card from ever exceeding
the viewport minus a safe gutter, which is what produces overflow bugs at this range.

## Mobile, under 660px

| Aspect | Behaviour |
| --- | --- |
| Topbar | Condensed brand, compact action icons |
| Trust badges | Tucked into the menu rather than shown inline |
| Drawers | Swipe navigation supported |
| Panels | Bottom sheets, one at a time |
| Insets | `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` honoured |

## The overflow rule

```text
No horizontal overflow from 320px to 430px. Any width. Any content. Any theme.
```

Common causes to check explicitly:

| Cause | Check |
| --- | --- |
| Long unbroken filename | `overflow-wrap: anywhere` on the title |
| Long chapter name | Same treatment in the navigator |
| Focus card wider than viewport | Use the `min()` formula |
| Fixed-width element | Replace with `max-width` plus percentage |
| Horizontal margins plus padding | Reduce margins at small widths |
| Long token in a note | Wrap in the note list |

## Verification widths

| Width | Purpose |
| --- | --- |
| `320px` | Hardest mobile case, smallest common viewport |
| `390 x 844` | Representative modern phone |
| `430px` | Largest common phone width |
| `660px` | Breakpoint boundary |
| `1040px` | Breakpoint boundary |
| `1440px` | Standard desktop |

Check the boundaries explicitly, since a rule that works at 650px and 700px can still break at
exactly 660px.

## Reading comfort on small screens

Small screens raise working-memory load because less text is visible at once. Mitigations:

- The focus rail keeps exactly one unit active regardless of viewport.
- Measure adjusts so lines do not become crowded or absurdly short.
- Chrome stays minimal, so more of the screen is text.
- Bottom sheets preserve the reading area instead of replacing it permanently.

Detail: [[Cognitive Ergonomics]].

## Verification checklist

- [ ] 320px: no horizontal overflow on landing or reader.
- [ ] 320px: reader text readable at minimum font size.
- [ ] 390 x 844: touch targets measured at 44 by 44 minimum.
- [ ] Boundaries at 660px and 1040px show no layout break.
- [ ] Long filenames and chapter names wrap instead of overflowing.
- [ ] Focus card never exceeds viewport minus gutter.
- [ ] Safe area insets applied on notched devices.
- [ ] Only one sheet open at a time on mobile.

Related: [[Screen Architectures]], [[Accessibility Rules]], [[Design Tokens]].