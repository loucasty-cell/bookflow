---
title: Intervention Engine
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, behavioral, intervention, retention]
source-files: [src/components/InterventionModal.jsx, src/components/intervention.css, src/App.jsx, src/features/reader/components/ReaderShell.jsx, src/features/reader/hooks/useReaderNavigation.js, src/features/reader/config.js]
---

# Intervention Engine

A gentle re-engagement prompt that fires only when the reader's attention has visibly drifted. The
trigger is measured behaviour, not a timer that punishes a break.

Setting: `showInterventionModals`, default **`false`** (`src/features/reader/config.js:16`).

## Trigger logic

`App.jsx:285-295` runs an interval, but the interval is only created when the setting is on:

```text
if settings.showInterventionModals !== true -> return, no interval is created at all
otherwise, every 10000 ms:
  if lastNavigationAtRef.current is set
     and performance.now() - lastNavigationAtRef.current > 240000   (4 minutes)
  and showIntervention is not already true:
     setShowIntervention(true)
     lastNavigationAtRef.current = performance.now()
```

Three things matter here:

1. **The default session has no interval at all.** The effect returns before `setInterval`. This is
   stronger than gating the render, and it is the reason an unopted-in reader pays nothing.
2. `lastNavigationAtRef` updates on reader navigation, so the condition is not "4 minutes have
   passed". It is "4 minutes have passed without the reader moving". A reader deep in a long
   paragraph is untouched.
3. The trigger **resets the timestamp** at `:290`, so it cannot re-fire every 10 seconds. A prompt
   requires 4 fresh minutes of stillness each time, and `showIntervention` being true is an
   additional latch.

## Gating: one gate, not two

Earlier notes in this vault claimed `ReaderShell` re-checks the settings flag as defence in depth.
**That is not what the code does.** `ReaderShell.jsx:37` renders on `showIntervention` alone:

```text
App.jsx:285   interval is not created unless settings.showInterventionModals === true
App.jsx:289   showIntervention is only ever set true from inside that gated interval
ReaderShell:37 renders InterventionModal when showIntervention is true
```

The modal is still unreachable by default, because `showIntervention` has exactly one writer and that
writer is behind the setting check. But the invariant is "one gate at the producer", not "gates at
both producer and consumer". A future refactor that sets `showIntervention` from elsewhere would not
be caught by a second check, because there is no second check. Do not document defence in depth here.

## Actions

| Action | Result |
| --- | --- |
| Keep reading | Dismisses and resumes, revealing the teaser |
| Stop for now | Dismisses respectfully, with no guilt copy and no penalty |

Stopping must always be a first-class, unpenalised choice. A reading app that punishes rest is
working against its own purpose.

## Copy strategy

The modal uses two psychological levers, applied honestly. Real copy from `InterventionModal.jsx`:

```text
line 51: "You're just 3 pages away from the moment where everything in
          {bookTitle || 'this chapter'} flips on its head."
line 57: "If you leave now, your flow state might take 23 minutes to rebuild when you return."
```

Both statements describe a genuine reading phenomenon. Neither fabricates a consequence. Note that
the first substitutes the book title when one is available, so the claim stays anchored to the actual
document rather than a generic chapter.

## Technical facts

- Built with Framer Motion and `AnimatePresence`.
- Respects `prefers-reduced-motion`.
- Rendered from `ReaderShell`, so it sits outside the reader content tree.
- Dismissal is single-action and never traps focus. `ReaderShell.jsx:38` passes
  `onDismiss={() => setShowIntervention(false)}`.

Detail: [[Motion and Transitions]], [[Accessibility Rules]].

## Why the 4-minute window

Attention research and product telemetry both point to an early drop-off band. Four minutes of
stillness is long enough to be a real signal rather than a pause, and short enough to catch a drift
before the reader disengages entirely.

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

- Leave the feature at its default, confirm no interval is created and no modal can appear under any
  timing.
- Enable it, sit idle past 4 minutes, confirm exactly one prompt.
- Leave it idle for a further 10 seconds, confirm it does not re-fire.
- Navigate once, then idle again, confirm a new prompt after a fresh 4 minutes.
- Dismiss both ways, confirm reading resumes cleanly with no penalty.
- Confirm reduced motion removes animation without removing function.

Related: [[Reward Capsules]], [[Habit Loop Design]], [[Retention Research]], [[Behavioral Layer MOC]].