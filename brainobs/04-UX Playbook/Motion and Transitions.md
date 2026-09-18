---
title: Motion and Transitions
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, ux, motion, animation, accessibility]
source-files: [src/styles.css, src/components/VariableRewardCapsule.jsx, src/components/InterventionModal.jsx, src/features/reader/components/ReaderShell.jsx]
---

# Motion and Transitions

Motion exists to explain state changes, not to entertain. Every animation must earn its place
against the calm-reader rule.

## Duration scale

```text
--duration-micro     120ms     presses, toggles, micro feedback
--duration-short     220ms     panel and sheet transitions
--duration-medium    320ms     larger reveals and layout shifts
--spring             cubic-bezier(0.25, 0.46, 0.45, 0.94)
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

An accessibility failure here would be skipping the content, not just the animation. Reduced
motion never means reduced information.

`prefers-reduced-transparency` is also respected. Blur is never required for legibility, so a
user who disables transparency still reads everything.

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

Detail: [[Success Metrics]].

## Verification

- Enable reduced motion and confirm every feature still delivers its content.
- Confirm theme switching is instant rather than animated.
- Confirm no animation runs continuously on the landing page or in the reader.
- Check the console for animation warnings during a full import.
- Confirm panels open and close without layout shift in the controls.

Related: [[Accessibility Rules]], [[Premium Micro-interactions]], [[Screen Architectures]].