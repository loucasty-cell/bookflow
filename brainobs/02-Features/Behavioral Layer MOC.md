---
title: Behavioral Layer MOC
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, behavioral, moc]
---

# Behavioral Layer MOC

Retention features. All opt-in, all off by default, none allowed to block reading.

## Notes

- [[Reward Capsules]] - chapter completion capsules with spring physics
- [[Intervention Engine]] - 4-minute drop-off detection and re-anchoring
- [[Social Resonance]] - SHA-256 paragraph hashing for shared marginalia (planned)

## Defaults

| Setting | Default | File |
| --- | --- | --- |
| `showRewardCapsules` | `false` | `src/features/reader/config.js` |
| `showInterventionModals` | `false` | `src/features/reader/config.js` |

Both are exposed in the settings panel as explicit on/off choices. The calm reader is the
default reader: a user who never opens settings never sees a capsule or an intervention.

## Gating in code

```text
ReaderShell receives showRewardCapsules and showIntervention
App.jsx passes  settings.showRewardCapsules === true
                settings.showInterventionModals === true && showIntervention
```

Triple-gated for interventions: user setting on, store flag true, and an actual detected drift.
A modal cannot appear by accident.

## Design rules for everything here

- Never block or interrupt reading for a user who did not opt in.
- Respect `prefers-reduced-motion`.
- No streak punishment, no fake urgency, no variable-ratio gambling loops.
- Deterministic progress, not engagement-inflated progress.
- Copy frames momentum, curiosity, and completion, never guilt or fear of loss.

Detail: [[Ethical Guardrails]], [[Atomic Habits Framework]].

Related: [[Psychology MOC]], [[Roadmap MOC]].