---
title: Future Features MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, roadmap, future, moc]
source-files: [brainobs/05-Roadmap/Future Features/PWA Offline.md,brainobs/05-Roadmap/Future Features/TTS Synchronization.md,brainobs/05-Roadmap/Future Features/Concept Graph.md,brainobs/02-Features/Library and Reading Stats.md,index.html,src/features/reader/config.js]
---

# Future Features MOC

Spec-ready designs for larger capabilities. Each note carries a status field.

Folder state as of 2026-10-02: this folder holds **PWA Offline**, **TTS Synchronization**, and
**Concept Graph**, and all three are still planned. **Library and Reading Stats** is no longer
here; it moved to `02-Features/` because the metadata library, measured stats, opt-in goals, and
deterministic achievements are built. Wikilinks to it still resolve, since the vault keys on note
basename rather than folder.

## Still in this folder

| Note | Status | Anchor |
| --- | --- | --- |
| [[PWA Offline]] | Planned | `TODO(backlog-17)` in `index.html:74`; no manifest or service worker is committed |
| [[TTS Synchronization]] | Planned | No `TODO(backlog-N)` marker was found for it |
| [[Concept Graph]] | Planned | No `TODO(backlog-N)` marker was found for it |

## Moved out because it shipped

| Note | Lives in | Why it moved |
| --- | --- | --- |
| [[Library and Reading Stats]] | `02-Features/` | `libraryStore.js`, `readingStats.js`, `readingSpeed.js`, `readingGoals.js`, `achievements.js`, `BadgeGallery`, `ResumeCard`, `SessionRecap`, and `RecentShelf` all exist |

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