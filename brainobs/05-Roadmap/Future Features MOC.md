---
title: Future Features MOC
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, roadmap, future, moc]
---

# Future Features MOC

Spec-ready designs for larger capabilities. Nothing here is built. Each note carries a status
field, and all of them are planned or exploratory.

## Notes

- [[Library and Reading Stats]] - persistent library, gentle continuity, reading garden
- [[TTS Synchronization]] - speech output locked to the focus rail
- [[PWA Offline]] - installable app with durable local storage
- [[Concept Graph]] - cross-chapter definition linking

## Also planned elsewhere in the vault

| Feature | Note |
| --- | --- |
| Social resonance layer | [[Social Resonance]] |
| Researcher-grade polish items | [[Premium Micro-interactions]] |
| Annotation portability | [[Notes and Bookmarks]] |
| Library resume card | [[Atomic Habits Framework]] |
| Multi-column layout sorting | [[OCR Decision Tree]] |

## Rules for every future feature

| Rule | Consequence |
| --- | --- |
| Opt-in if behavioral | Default `false`, exposed in settings |
| Local-first if it touches content | Private by default, disclosed if remote |
| No new dependency without approval | Prefer native APIs and existing packages |
| Reduced motion respected | Remove motion, keep content |
| No blocking of reading | Supplementary surfaces only |
| Measurable | State the metric before building |

Detail: [[Invariants]], [[Ethical Guardrails]], [[Feature Spec Template]].

## How to promote a note from planned to built

```text
1  Implement the smallest complete version in the stated location
2  Add tests beside the code
3  Run lint, test, build, and the backend suite
4  Verify in a browser at desktop, 390x844, and 320px
5  Update the status field and the updated field
6  Update [[Current State Matrix]] with evidence
7  Follow [[Context Sync Protocol]]
```