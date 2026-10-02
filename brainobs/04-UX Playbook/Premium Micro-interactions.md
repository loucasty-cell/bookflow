---
title: Premium Micro-interactions
type: spec
status: planned
updated: 2026-10-02
tags: [bookflow, ux, polish, spec, micro-interactions]
source-files: [src/App.jsx, src/shared/lib/haptics.js, src/styles/tokens.css, src/styles/motion.css, src/shared/motion/presets.js, src/features/reader/components/ReaderShell.jsx, src/features/widgets/lib/widgetMotion.js, src/features/widgets/lib/useWidgetReveal.js, src/features/landing/components/ThreeDBookCard.jsx, src/features/reader/config.js]
---

# Premium Micro-interactions

Build-ready specs for the polish layer. Each item states what exists, what to build, where it
lives, and what constraint it must respect.

Status labels below are per item. Nothing in this note should be described as shipped until the
relevant component exists and is verified.

Motion tokens are in `src/styles/tokens.css`, not `src/styles.css`, which is only an import
manifest. JS motion goes through `src/shared/motion/presets.js`, whose header forbids inlining new
easings at call sites.

## Build order

```text
1  Haptic vocabulary           cheap, high perceptible value
2  Resume pulse                reaches the return loop
3  Page-turn feel              core reading texture
4  Loading choreography        removes the last dead wait
5  Flow sparkline               session recap support
6  Ambient depth               optional, must never cost legibility
```

## 1. Haptic vocabulary

**Status:** verified and wired. Implemented in `src/shared/lib/haptics.js` and consumed by
`FocusCard.jsx` and `SelectionTooltip.jsx`.

Implemented API:

| Export | Purpose |
| --- | --- |
| `triggerHaptic(pattern)` | Calls `navigator.vibrate` when available, fails silently otherwise |
| `HAPTIC_PATTERNS.LIGHT` | 15 ms, used for pin, dismiss, step, resume, note actions |
| `HAPTIC_PATTERNS.MEDIUM` | 35 ms, used for bookmark toggle |
| `HAPTIC_PATTERNS.SUCCESS` | 20/30/40 ms pattern, used for copy confirmation |
| `HAPTIC_PATTERNS.HEAVY` | 50 ms, unused at present |
| `HAPTIC_PATTERNS.WARNING` | 40/40/40 ms pattern, unused at present |
| `HAPTIC_PATTERNS.SELECTION` | 10 ms selection tick, unused at present |

Current mapping in the reader:

| Action | Pattern |
| --- | --- |
| Restore the hidden focus card | `LIGHT` |
| Dismiss the focus card | `LIGHT` |
| Step focus back or forward | `LIGHT` |
| Toggle bookmark | `MEDIUM` |
| Copy focused paragraph | `SUCCESS` |
| Resume automatic flow | `LIGHT` |
| Copy selected text | `SUCCESS` |
| Add note from selection | `LIGHT` |
| Bookmark from selection tooltip | `MEDIUM` |

Rules:

- Feature detection is already handled inside `triggerHaptic`. Never call `navigator.vibrate`
  directly.
- Never vibrate on scroll or focus change. Those are continuous, and buzzing would be hostile.
- Suppress haptics under reduced-motion preferences. Not yet implemented; tracked in
  [[Massive Upgrade Backlog]].
- Keep it under 20 ms for continuous-use interactions. A long buzz is jarring in a calm reader.

`HEAVY`, `WARNING`, and `SELECTION` are defined but unused. Either wire them to a real action or
leave them documented as reserved.

## 2. Resume pulse

**Status:** planned.

```text
Component   src/features/reader/components/ResumePulse.jsx
Trigger     On open, when a restored position exists
Effect      One soft emphasis on the restored paragraph: a brief background
            lift over --duration-medium, then settle
Copy        "Picked up where you left off", dismissed on first scroll
Rules       Never scrolls on its own. Never blocks input. Under reduced motion,
            show the label with no animation.
```

The value here is trust: the reader sees proof that their place was remembered, which is the
strongest contributor to the return loop.

Detail: [[Atomic Habits Framework]], [[Storage and Persistence]].

## 3. Page-turn feel

**Status:** planned.

A subtle physicality on advance and retreat, never a literal page flip:

```text
Advance    content shifts up 6px over --duration-short with an ease-out
Retreat    content shifts down 6px over --duration-short
Opacity    0.98 to 1.0 on the incoming unit
Never      No 3D rotation, no shadow sweep, no paper texture animation
```

Why 6px: enough to register as movement, small enough that the eye does not have to re-fixate.
This is the difference between a reader that feels alive and one that feels like a scroll
container, without introducing anything that competes with the text.

Constraint: never animate during active scrolling, only on committed steps.

Detail: [[Motion and Transitions]], [[Navigation and Controls]].

## 4. Loading choreography

**Status:** partial. Import progress exists with percent and labels.

| Moment | Treatment |
| --- | --- |
| File selected | Immediate visible feedback, no perceptible delay |
| Validation | Fast, effectively invisible for valid files |
| Parsing | Percent with a human label, never a bare spinner |
| Reader opens | Text fades in over --duration-short rather than popping |
| Background units | Silent. Progress continues without a visible indicator |
| Completion | Reaches a visible 100 percent before the surface changes |

The last row matters: a bar that disappears at 97 percent reads as broken. Show the finish.

Never use an indeterminate spinner when progress is measurable. Page numbers and word counts are
already available and are strictly better.

Detail: [[SSE Progress Streaming]], [[Success Metrics]].

## 5. Flow sparkline

**Status:** partial. The capsule design includes a cognitive flow sparkline.

```text
Component   src/features/reader/components/FlowSparkline.jsx
Data        Session pace samples: words or units per minute, per interval
Render      A calm hand-drawn style line. No grid, no axes, no numbers by default.
Rules       Honest data only. An empty session produces no sparkline at all.
            Under reduced motion, draw instantly rather than animating the stroke.
```

Uses SVG, not a charting library, to keep the bundle small and the styling token-driven.

Detail: [[Reward Capsules]], [[Tech Stack]].

## 6. Ambient depth

**Status:** exploratory. Three.js is a dependency, so a subtle ambient layer is available.

Hard constraints if built:

```text
Never render book text in WebGL
Never block first paint
Never run when WebGL is unavailable; degrade silently to a static surface
Never overlap the reading column with anything moving
Always respect reduced motion
```

Given the risk to legibility and the cost to performance, this is last for a reason. A static,
well-composed surface is a legitimate final answer.

Detail: [[Motion and Transitions]], [[Ethical Guardrails]], [[Graphics Quality Tiers]].

## 7. Widget value and reveal motion

**Status:** partially built. The technique is shipped and verified; the React wrapper is not wired.

`lib/widgetMotion.js` in the widgets feature is the reference implementation for animating a number
without re-rendering React. The rule it encodes: the animated value lives on a plain proxy object,
and `onUpdate` writes `textContent` straight to the DOM node. React never re-renders, so a 60fps
counter costs no reconciliation.

```text
tweenNumber  animates proxy.value over 900ms with out(3), then writes formatted text
tweenRing    animates strokeDashoffset over 780ms with out(2), clamping ratio to 0..1
Reduced      both check matchMedia first, write the final value, and return null
Scope        createScope(node) ties every tween in a widget to one revert point
```

`lib/useWidgetReveal.js` is the counterpart for entrances. It dynamically imports `gsap` and
`gsap/ScrollTrigger`, so neither lands in the entry bundle, sets `.widget-frame` cards to opacity 0
and y 18, and creates one ScrollTrigger at `start: "top 92%"` with `once: true` that animates them
to opacity 1 and y 0 over 0.62s with `power3.out` and a 0.055s stagger. It returns early, before the
imports, under reduced motion, and kills its trigger on unmount.

Three properties worth carrying into any new animated surface:

- Check reduced motion before doing any work, not after starting the animation.
- Animate `opacity` and `transform`, so nothing triggers layout.
- Load a heavy animation library dynamically, and only inside the code path that needs it.

The gap: `src/features/widgets/components/AnimatedValue.jsx`, which would call these, is dead code.
Nothing in the shipped grid uses the anime.js tween today.

Detail: [[Home Widgets]], [[Motion and Transitions]].

## 8. Proximity response instead of hover

**Status:** verified and wired. `src/features/landing/components/LivingShelf.jsx` and
`ThreeDBookCard.jsx`.

Two hooks, two different jobs:

| Hook | Default properties | Used by |
| --- | --- | --- |
| `usePointerCssVars` | `--pointer-x`, `--pointer-y` | `LandingPage.jsx`, the hero drag card |
| `useProximityCssVars` | caller-supplied, `reachY: 320`, `reachXPadding: 120` | `LivingShelf.jsx` |

Proximity is the better model for a shelf. A card that responds only when hovered feels broken on
touch and lights up when the pointer merely passes across it. Reacting within a 320px vertical
reach means the response matches intent.

`ThreeDBookCard` adds the physical layer: `useMotionValue` for the raw pointer, `useTransform` to
map it to `rotateX`, `rotateY`, and a specular highlight, then `useSpring` on the rotations so the
tilt settles rather than snapping. Under `useReducedMotion` both rotations are forced to `0`.

Detail: [[Screen Architectures]], [[Motion and Transitions]].

## Cross-cutting rules for all polish work

| Rule | Consequence |
| --- | --- |
| Token-first | All timing and colour from tokens in `src/styles/tokens.css` |
| Preset-first in JS | Animate through `src/shared/motion/presets.js`, never an inlined easing |
| Reduced motion honoured | Remove motion, keep content |
| Never compete with text | Polish lives at the edges of the reading column |
| No new dependency without approval | SVG and CSS before any library |
| Dynamic import for heavy motion | gsap and anime.js load inside the code path that needs them |
| Measure, do not assume | Verify rendered behaviour in a browser |

Detail: [[Design Tokens]], [[Accessibility Rules]].

## Acceptance criteria

- [ ] Each built item has a token-driven implementation in the stated location.
- [ ] Each built item degrades correctly under reduced motion.
- [ ] No item causes a long task over 100ms.
- [ ] No item overlaps or animates the reading text.
- [ ] Each item is verified at 320px and at a 390x844 viewport.
- [ ] No new dependency added without explicit approval.

Related: [[UX Playbook MOC]], [[Roadmap MOC]], [[Feature Spec Template]], [[Home Widgets]].