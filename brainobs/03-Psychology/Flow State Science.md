---
title: Flow State Science
type: research
status: verified
updated: 2026-09-18
tags: [bookflow, psychology, flow, research, attention]
source-files: [src/App.jsx, src/components/InterventionModal.jsx, goals.md, Bookflowideas.md]
---

# Flow State Science

Why the reader is designed around uninterrupted attention, and why the intervention engine uses
a four-minute stillness window rather than a timer.

## Flow conditions

Flow requires three things at once:

| Condition | Reader requirement | Bookflow response |
| --- | --- | --- |
| Clear goals | Know what to do next | Rail makes the next unit obvious |
| Immediate feedback | See progress as it happens | Focus advance plus deterministic progress |
| Challenge and skill balance | Text neither trivial nor overwhelming | Typography, measure, and focus intensity are adjustable |

The third condition is why the typography controls are a flow feature, not a cosmetic one. A
reader who cannot find a comfortable measure is fighting the interface instead of reading.

Detail: [[Typography System]].

## The four-minute window

`App.jsx` detects drift when navigation has not occurred for 240000 ms:

```text
performance.now() - lastNavigationAt > 240000
```

This is a measure of stillness, not of elapsed time. Two consequences:

1. A reader absorbed in a long paragraph is never interrupted, because reading is not
   navigation but genuine engagement.
2. A reader who has actually disengaged gets exactly one quiet prompt.

The check runs on a 10 second interval, so in practice the prompt lands shortly after four
minutes of stillness rather than precisely at the four-minute mark. That is acceptable for the
purpose and avoids a hot timer.

Detail: [[Intervention Engine]].

## Flow cost of interruption

The intervention copy leans on a real phenomenon: re-entering deep focus after an interruption
takes time. The modal's own framing is careful about it:

```text
"If you leave now, your flow state might take 23 minutes to rebuild when you return."
```

The word "might" matters. The claim is framed as a risk, not a manufactured certainty. That is
the difference between an honest re-anchor and manufactured urgency.

Detail: [[Ethical Guardrails]].

## Designing for unbroken attention

| Interruption source | Bookflow stance |
| --- | --- |
| Push notifications | None. The app never requests notification permission for retention |
| Autoplay of the next chapter | None |
| Animated chrome while reading | Motion is restrained and reduced-motion compliant |
| Loading states that block | Progressive import keeps text available |
| Modal prompts | Off by default, and only on measured drift when enabled |
| Refocusing the page | The reader is single-purpose: no feed, no recommendations surface |

## Attention support, not attention capture

The distinction the project holds to:

| Support | Capture |
| --- | --- |
| Gentle sentence highlighting | Flashing or pulsing emphasis |
| Rail that follows the reader | Auto-scroll that moves text on its own |
| Optional bionic emphasis | Forced formatting |
| One re-anchor after real drift | Escalating prompts |
| Deterministic progress | Engagement-inflated progress |

Attention support makes reading easier. Attention capture makes leaving harder. Bookflow builds
the first and explicitly rejects the second.

## Related

- [[Cognitive Ergonomics]] - the mechanical side of sustained reading
- [[Intervention Engine]] - the implementation
- [[Ethical Guardrails]] - the limits
- [[Retention Research]] - what the evidence supports