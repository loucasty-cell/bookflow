---
title: Premium Micro-interactions
type: spec
status: planned
updated: 2026-09-18
tags: [bookflow, ux, polish, spec, micro-interactions]
source-files: [src/App.jsx, src/features/reader/components/ReaderShell.jsx, src/features/reader/config.js, src/styles.css]
---

# Premium Micro-interactions

Build-ready specs for the polish layer. Each item states what exists, what to build, where it
lives, and what constraint it must respect.

Status labels below are per item. Nothing in this note should be described as shipped until the
relevant component exists and is verified.

## Build order

```text
1  Haptic vocabulary           cheap, high perceptible value
2  Resume pulse                reaches the return loop
3  Page-turn feel              core reading texture
4  Loading choreography        removes the last dead wait
5  Flow sparkline              session recap support
6  Ambient depth               optional, must never cost legibility
```

## 1. Haptic vocabulary

**Status:** partial. Haptic helpers are referenced in the frontend architecture notes.

| Action | Haptic | Reason |
| --- | --- | --- |
| Pin a paragraph | Short light pulse | Confirms a deliberate state change |
| Toggle bookmark | Short light pulse | Confirms the bookmark took |
| Copy paragraph | Single micro pulse | Confirms the clipboard write |
| Chapter complete | Double gentle pulse | Marks a milestone |
| Rapid step navigation | Suppressed | Prevents buzzing during fast navigation |

Rules:

- Feature-detect `navigator.vibrate`. Never assume support.
- Never vibrate on scroll or focus change. Those are continuous, and buzzing would be hostile.
- Suppress haptics under reduced-motion preferences.
- Keep it under 20ms. A long buzz is jarring in a calm reading app.

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

Detail: [[Motion and Transitions]], [[Ethical Guardrails]].

## Cross-cutting rules for all polish work

| Rule | Consequence |
| --- | --- |
| Token-first | All timing and colour from tokens in `styles.css` |
| Reduced motion honoured | Remove motion, keep content |
| Never compete with text | Polish lives at the edges of the reading column |
| No new dependency without approval | SVG and CSS before any library |
| Measure, do not assume | Verify rendered behaviour in a browser |

Detail: [[Design Tokens]], [[Accessibility Rules]].

## Acceptance criteria

- [ ] Each built item has a token-driven implementation in the stated location.
- [ ] Each built item degrades correctly under reduced motion.
- [ ] No item causes a long task over 100ms.
- [ ] No item overlaps or animates the reading text.
- [ ] Each item is verified at 320px and at a 390x844 viewport.
- [ ] No new dependency added without explicit approval.

Related: [[UX Playbook MOC]], [[Roadmap MOC]], [[Feature Spec Template]].