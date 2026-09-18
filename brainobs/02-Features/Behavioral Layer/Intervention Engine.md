---
title: Intervention Engine
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, behavioral, intervention, retention]
source-files: [src/components/InterventionModal.jsx, src/components/intervention.css, src/App.jsx, src/features/reader/components/ReaderShell.jsx, src/features/reader/config.js]
---

# Intervention Engine

A gentle re-engagement prompt that fires only when the reader's attention has visibly drifted.
The trigger is measured behaviour, not a timer that punishes a break.

Setting: `showInterventionModals`, default `false`.

## Trigger logic

`App.jsx` runs an interval every 10 seconds while a book is open:

```text
if lastNavigationAt exists and
   performance.now() - lastNavigationAt > 240000   (4 minutes)
then setShowIntervention(true)
```

`lastNavigationAt` updates on reader navigation. So the condition is not "4 minutes have
passed". It is "4 minutes have passed without the reader moving". A reader deep in a long
paragraph is untouched. A reader who put the phone down gets one quiet nudge.

## Triple gating

The modal can only render when all three are true:

```text
settings.showInterventionModals === true     user opted in
showIntervention === true                    trigger detected
```

plus `ReaderShell` re-checking `showIntervention && settings.showInterventionModals === true`.
Defence in depth, so no future refactor can accidentally show an unrequested modal.

## Copy strategy

The modal uses two psychological levers, applied honestly:

| Lever | How it is used | How it is not used |
| --- | --- | --- |
| Curiosity gap | Previews that a shift is close by | Clickbait with no real payoff |
| Loss aversion | Notes the cost of losing flow | Threatening a streak that never existed |

Real copy examples from the implementation:

```text
"You're just 3 pages away from the moment where everything in this chapter flips on its head."
"If you leave now, your flow state might take 23 minutes to rebuild when you return."
```

Both statements describe a genuine reading phenomenon. Neither fabricates a consequence.

## Actions

| Action | Result |
| --- | --- |
| Keep reading | Dismisses and resumes, revealing the teaser |
| Stop for now | Dismisses respectfully, with no guilt copy and no penalty |

Stopping must always be a first-class, unpenalized choice. A reading app that punishes rest is
working against its own purpose.

## Technical facts

- Built with Framer Motion and `AnimatePresence`.
- Respects `prefers-reduced-motion`.
- Rendered from `ReaderShell`, so it sits outside the reader content tree.
- Dismissal is single-action and never traps focus.

Detail: [[Motion and Transitions]], [[Accessibility Rules]].

## Why the 4-minute window

Attention research and product telemetry both point to an early drop-off band. Four minutes of
stillness is long enough to be a real signal rather than a pause, and short enough to catch a
drift before the reader disengages entirely.

Detail: [[Flow State Science]], [[Cognitive Ergonomics]].

## Where this must not go

| Never | Why |
| --- | --- |
| Fire for a reader who did not opt in | Violates the calm-by-default rule |
| Fire while the reader is actively scrolling | It is a drift signal, not a nag timer |
| Escalate frequency | Punitive and manipulative |
| Add fake scarcity or countdown pressure | Fabricated urgency |
| Block dismissal | Hostile interaction |

Detail: [[Ethical Guardrails]].

## Verification

- Leave the feature off, confirm no modal can appear under any timing.
- Enable it, sit idle past 4 minutes, confirm exactly one prompt.
- Dismiss both ways, confirm reading resumes cleanly with no penalty.
- Confirm reduced motion removes animation without removing function.

Related: [[Reward Capsules]], [[Habit Loop Design]], [[Retention Research]].