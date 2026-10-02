---
title: Responsive Breakpoints
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, ux, responsive, mobile, layout]
source-files: [src/styles/responsive.css, src/styles/tokens.css, src/styles/components.css, src/styles/landing-components.css, src/styles/reading-lens.css, src/features/widgets/lib/widgets.css, src/features/lens-bar/lens-bar.css, reactUIUXcover.md, frontendskills.md]
---

# Responsive Breakpoints

Three layouts, one set of rules. The hard requirement is no horizontal overflow at any mobile
width.

## Where the media queries live

`src/styles/responsive.css` is 337 lines and owns the breakpoint queries. Its query map, by line:

| Line | Query | Purpose |
| --- | --- | --- |
| 1 | `(hover: hover)` | Hover affordances only on real pointers |
| 13 | `(max-width: 1040px)` | Hero collapses to one column |
| 37 | `(max-width: 900px)` | Contents becomes an off-canvas drawer |
| 73 | `(max-width: 660px)` | Mobile layout |
| 316 | `(prefers-reduced-transparency: reduce)` | Reader and panel surfaces drop blur |

`src/styles.css` holds none of this. It is a 13-line `@import` manifest, and `responsive.css` is
its sixth entry.

Other sheets add their own narrower queries, which is normal rather than a second system:
`components.css` has 660px at lines 150, 164, 413, 488, 1183, plus 900px at 392, 360px at 1324,
and `hover: hover` at 380. `landing-components.css` has 480px at 831. `reading-lens.css` has
660px at 646. `reader.css` has `hover: hover` at 657.

## Pointer capability is a separate axis from width

The `@media (hover: hover)` queries exist so that hover styling is applied only where a real
pointer can produce a hover state. A touch device at 1280px wide still gets no hover affordance.
This is why the hover rules are not simply inside a width query.

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
| Landing | Single-column stacked hero, width `min(900px, calc(100% - 40px))` |
| Hero copy column | Widens to 720px so the line length stays readable |
| Hero artwork | `min(600px, 76vw)` tall |
| Contents | Off-canvas slide-in drawer with `.mobile-scrim`, `width: min(320px, 88vw)`, `translateX(-105%)` when closed |
| Focus card | `min(340px, calc(100vw - 36px))` |
| Panels | Drawers rather than permanent columns |

The 900px query is where the contents panel changes mode, not the 660px query. Below 900px it
becomes `position: absolute`, gets an off-canvas transform, and gains a scrim. The
`.mobile-only` utility becomes visible in the same block.

The focus card width formula is the important detail. It prevents the card from ever exceeding
the viewport minus a safe gutter, which is what produces overflow bugs at this range.

## Mobile, under 660px

| Aspect | Behaviour |
| --- | --- |
| Topbar | Condensed brand, compact action icons, nav min-height 66px |
| Trust badges | `display: none` on `.nav-trust` |
| Drawers | Swipe navigation supported |
| Panels | Bottom sheets, one at a time |
| Insets | `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` honoured via `--safe-top` and `--safe-bottom` |

## The overflow rule

```text
No horizontal overflow from 320px to 430px. Any width. Any content. Any theme.
```

`src/styles/tokens.css` sets `body { min-width: 320px }`, which is the floor this contract is
measured from.

Common causes to check explicitly:

| Cause | Check |
| --- | --- |
| Long unbroken filename | `overflow-wrap: anywhere` on the title |
| Long chapter name | Same treatment in the navigator |
| Focus card wider than viewport | Use the `min()` formula |
| Fixed-width element | Replace with `max-width` plus percentage |
| Horizontal margins plus padding | Reduce margins at small widths |
| Long token in a note | Wrap in the note list |
| Widget wider than its cell | Aspect-ratio cells plus `grid-column: 1 / -1` for medium and large |

## Verification widths

| Width | Purpose |
| --- | --- |
| `320px` | Hardest mobile case, smallest common viewport |
| `360px` | `components.css` has its own 360px query |
| `390 x 844` | Representative modern phone |
| `430px` | Largest common phone width |
| `660px` | Breakpoint boundary |
| `900px` | Breakpoint boundary, where the drawer switch happens |
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
- [ ] 390 x 844: touch targets measured at `--control-size`, which is 44px.
- [ ] Boundaries at 660px, 900px, and 1040px show no layout break.
- [ ] Contents panel is off-canvas and inert below 900px, not merely narrow.
- [ ] Long filenames and chapter names wrap instead of overflowing.
- [ ] Focus card never exceeds viewport minus gutter.
- [ ] Safe area insets applied on notched devices.
- [ ] Only one sheet open at a time on mobile.
- [ ] Hover affordances absent on a touch-emulated device at desktop width.

Related: [[Screen Architectures]], [[Accessibility Rules]], [[Design Tokens]].