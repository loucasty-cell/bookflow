---
title: Motion and Transitions
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, ux, motion, animation, accessibility]
source-files: [src/styles/tokens.css, src/styles/motion.css, src/styles/reader.css, src/styles/components.css, src/styles/reading-lens.css, src/shared/motion/presets.js, src/shared/motion/presets.test.js, src/components/VariableRewardCapsule.jsx, src/components/InterventionModal.jsx, src/features/reader/components/ReaderShell.jsx, src/features/widgets/lib/widgetMotion.js, src/features/widgets/lib/useWidgetReveal.js]
---

# Motion and Transitions

Motion exists to explain state changes, not to entertain. Every animation must earn its place
against the calm-reader rule.

## Where motion lives

`src/styles.css` holds no motion tokens. The token definitions are in `src/styles/tokens.css`; the
`@media (prefers-reduced-motion: reduce)` clamp and the reduced-transparency handling are in
`src/styles/motion.css`, which is 30 lines and is imported seventh in the manifest so it can clamp
sheets loaded before it.

`src/shared/motion/presets.js` is the JS mirror. Its header states that it mirrors the CSS layer so
the two stay in step, and that new easings must not be inlined at call sites. `presets.test.js`
covers it with 7 unit tests.

| Export | Purpose |
| --- | --- |
| `motionPresets.springSoft` | stiffness 260, damping 30, mass 0.9 |
| `motionPresets.springSheet` | stiffness 340, damping 34, mass 0.86 |
| `motionPresets.fade` | 0.18s, ease `[0.2, 0.8, 0.2, 1]` |
| `motionPresets.page` | 0.52s, ease `[0.16, 1, 0.3, 1]` |
| `reducedTransition` | `{ duration: 0.01 }` |

## Duration scale

```text
--duration-micro     120ms     presses, toggles, micro feedback
--duration-short     220ms     panel and sheet transitions
--duration-medium    320ms     larger reveals and layout shifts
--duration-enter     380ms     enter transitions
--spring             cubic-bezier(0.25, 0.46, 0.45, 0.94)
--ease-emphasized    cubic-bezier(0.2, 0.8, 0.2, 1)
--ease-enter         cubic-bezier(0.16, 1, 0.3, 1)
```

These are the only durations. A bespoke duration value is a token defect.

Detail: [[Design Tokens]].

## What motion is used for

| Surface | Motion | Purpose |
| --- | --- | --- |
| Reward capsule | Spring reveal via Framer Motion | Make completion feel earned |
| Intervention modal | Enter and exit with `AnimatePresence` | Signal a temporary, dismissible layer |
| Panels and sheets | Slide with the short duration | Show where the surface came from |
| Focus transition | `focusPace` scaled opacity and weight | Track the reader's eye smoothly |
| Landing drag state | Border glow and fill | Confirm the drop will be accepted |
| Upload progress | Progress bar advance | Show that work is happening |

## Reduced motion

`prefers-reduced-motion: reduce` must be respected everywhere. The rule is: remove the motion,
keep the function.

| Feature | With reduced motion |
| --- | --- |
| Reward capsule | Content appears without the spring |
| Intervention modal | Appears without the enter animation |
| Focus transition | Applied instantly instead of eased |
| Panel transitions | Opened without slide |
| Progress | Value updates without animated interpolation |
| Widget value tween | `tweenNumber` writes the final value and returns null |
| Widget ring tween | `tweenRing` sets `strokeDashoffset` directly and returns null |
| Widget grid reveal | `useWidgetReveal` returns before importing gsap; the grid is simply present |

An accessibility failure here would be skipping the content, not just the animation. Reduced
motion never means reduced information.

### The global clamp

`src/styles/motion.css` lines 1 to 10 apply a blanket clamp to every element under
`prefers-reduced-motion: reduce`:

```text
scroll-behavior           auto !important
animation-duration        0.01ms !important
animation-iteration-count 1 !important
transition-duration       0.01ms !important
```

This is a CSS safety net, not the mechanism. It cannot express a JS-driven animation, so
Framer Motion surfaces call `useReducedMotion()` themselves, and the widget hooks check
`matchMedia` and return early. Both layers are needed: the clamp covers everything declarative, the
hooks cover everything imperative.

### Reduced transparency

`prefers-reduced-transparency: reduce` is also respected. `src/styles/motion.css` lines 12 to 30
remove `backdrop-filter` from five surfaces and give each an opaque background fallback:
`.drop-card`, `.nav-trust`, `.theme-toggle`, `.hero-artwork figcaption`, and `.loading-overlay`.
`src/styles/responsive.css` line 316 and `src/styles/reader-extras.css` line 967 carry their own
reduced-transparency blocks.

Blur is never required for legibility, so a user who disables transparency still reads everything.

## Anti-patterns

| Do not | Why |
| --- | --- |
| Animate body text | Constantly moving text is unreadable |
| Parallax while scrolling | Competes directly with reading |
| Infinite decorative loops | Draws attention away from the paragraph |
| Animate on every scroll event | Causes jank and distracts |
| Hover animations on paragraphs | Encourages unintended focus changes |
| Motion required to understand state | Fails without animation |

## Physics versus easing

Framer Motion springs are reserved for moments that should feel physical and earned, such as the
reward capsule. CSS transitions with the duration tokens handle everything structural, because
they are cheaper and predictable.

```text
Spring physics      reward capsule, intervention enter
CSS eased transition  panels, sheets, focus, controls, toggles
Instant             theme swaps, typography changes, reduced motion fallback
```

## Performance rules

- Animate `opacity` and `transform`, not layout properties.
- Never animate anything inside the paragraph tree during reading.
- Keep long-running animation off the main thread where possible.
- Verify no long task exceeds 100ms during import or OCR.

Detail: [[Success Metrics]], [[Home Widgets]].

## Verification

- Enable reduced motion and confirm every feature still delivers its content.
- Confirm theme switching is instant rather than animated.
- Confirm no animation runs continuously on the landing page or in the reader.
- Check the console for animation warnings during a full import.
- Confirm panels open and close without layout shift in the controls.
- Confirm the widget grid is fully visible, not left at opacity 0, with reduced motion on. The
  reveal sets cards invisible before the trigger fires, so a broken reduced-motion early return
  would show an empty grid rather than a static one.

Related: [[Accessibility Rules]], [[Premium Micro-interactions]], [[Screen Architectures]].