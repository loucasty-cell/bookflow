---
title: Behavioral Layer MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, behavioral, moc]
source-files: [src/features/reader/config.js, src/components/VariableRewardCapsule.jsx, src/components/InterventionModal.jsx, src/App.jsx]
---

# Behavioral Layer MOC

Retention features. All opt-in, all off by default, none allowed to block reading.

## Notes

- [[Reward Capsules]] - chapter completion capsules with spring physics
- [[Intervention Engine]] - drop-off detection and re-anchoring
- [[Social Resonance]] - SHA-256 paragraph hashing for shared marginalia (**planned only**)

## Defaults, verified in code

Both gating settings are declared in `DEFAULT_SETTINGS` at `src/features/reader/config.js:4`:

| Setting | Default | Line |
| --- | --- | --- |
| `showRewardCapsules` | **`false`** | `config.js:15` |
| `showInterventionModals` | **`false`** | `config.js:16` |

Both are exposed in the settings panel as explicit on/off choices. The calm reader is the default
reader: a user who never opens settings never sees a capsule or an intervention. A capsule or modal
cannot appear in a default session under any timing.

## Gating in code

```text
ReaderShell receives showRewardCapsules and showIntervention
App.jsx passes  settings.showRewardCapsules === true
                settings.showInterventionModals === true && showIntervention
```

Interventions are triple-gated: user setting on, store flag true, and an actual detected drift.
A modal cannot appear by accident.

## What is real and what is not

| Surface | State |
| --- | --- |
| Reward capsule component | Built, `src/components/VariableRewardCapsule.jsx` with `capsule.css` |
| Intervention modal component | Built, `src/components/InterventionModal.jsx` with `intervention.css` |
| Both wired behind `false` defaults | Yes |
| Social Resonance frontend experience | **Not built.** No persisted frontend community surface exists |
| Social Resonance backend | **Mocks only.** See [[Social Resonance]] |

## Design rules for everything here

- Never block or interrupt reading for a user who did not opt in.
- Respect `prefers-reduced-motion`.
- No streak punishment, no fake urgency, no variable-ratio gambling loops.
- Deterministic progress, not engagement-inflated progress.
- Copy frames momentum, curiosity, and completion, never guilt or fear of loss.

Detail: [[Ethical Guardrails]], [[Atomic Habits Framework]].

Related: [[Psychology MOC]], [[Roadmap MOC]], [[Invariants]].