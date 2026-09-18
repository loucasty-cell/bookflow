---
title: TTS Synchronization
type: spec
status: planned
updated: 2026-09-18
tags: [bookflow, roadmap, tts, accessibility, planned]
source-files: [Bookflowideas.md, src/features/reader/lib/readingController.js, src/features/reader/lib/focusRail.js]
---

# TTS Synchronization

Planned. Text to speech locked to the focus rail, so the spoken word and the highlighted
paragraph stay in step in both directions.

Status: **planned**. Text-to-speech synchronization is listed in the P1 backlog.

## Why it belongs in this product

| Audience | Benefit |
| --- | --- |
| Low vision or reading difficulty | Independent access to the same documents |
| Commuting and walking | Continues the book without reading |
| Focus assist | Hearing the sentence while reading it can improve comprehension |
| Language learners | Spoken and written forms together |

It is an accessibility feature first and a convenience feature second.

## The synchronization problem

Most readers let the read-aloud and the highlight drift apart, which is worse than no highlight
at all. The requirement is bidirectional lock with one source of truth.

```text
Single source of truth: the active unit (paragraph or sentence)

Speech -> reader   utterance boundary maps to a unit, rail moves to it
Reader -> speech   rail moves to a new unit, speech jumps to it
```

## Two-way sync

| Direction | Mechanism |
| --- | --- |
| Speech to rail | `SpeechSynthesisUtterance` boundary events map offsets to the active unit; the rail scrolls to it |
| Rail to speech | A rail change cancels the current utterance and enqueues the new unit |
| Sentence level | Uses sentence segmentation, not paragraphs, so highlight granularity matches speech |

Sentence-level granularity matters. Paragraph-level highlighting alongside sentence-level speech
loses the reader completely.

Detail: [[Focus Rail]], [[TXT and Markdown]] for the segmentation helper.

## Implementation approach

```text
API used    Web Speech API: speechSynthesis, SpeechSynthesisUtterance
Voices      Enumerate available voices, let the user choose, remember the choice
Rate        Adjustable, persisted in settings
Queue       One utterance at a time, plus a small lookahead buffer
Boundary    Use onboundary events for word and sentence position
Cancellation Full cancel on pause, panel close, or book close
```

Feature detection is required. Where the API is unavailable, hide the control entirely rather
than showing a broken one.

## Interaction rules

| Rule | Reason |
| --- | --- |
| Speech never starts automatically | Library reading is a deliberate choice |
| Never speaks while the user is scrolling fast | Would fight the rail |
| Pause resumes from the current unit | Not from the start of the paragraph |
| Speech and rail never both lag | Drift is worse than absence |
| Works with every typeface setting | Typography must not affect speech |
| Respects Bionic setting | Bionic is visual only, speech is unaffected |

Detail: [[Invariants]], [[Bionic Reading]].

## Accessibility integration

- Exposes play, pause, stop, rate, and voice as labelled controls.
- Announces state changes for assistive technology.
- Never becomes the only way to access content. Reading remains primary.
- Does not require an audio file, network, or account.

## Risks

| Risk | Mitigation |
| --- | --- |
| Voice availability varies by platform | Enumerate first, degrade gracefully |
| Boundary events are inconsistent across engines | Fall back to per-sentence utterances |
| Long utterances get cut off on some engines | Chunk at sentence boundaries, not paragraphs |
| Mobile browsers restrict audio without a gesture | Require an explicit start action |
| Battery drain on long sessions | Warn and allow stop, never auto-continue forever |

## Acceptance criteria

- [ ] Speech and highlight stay within one unit with no visible drift.
- [ ] Moving the rail while speaking jumps the speech correctly.
- [ ] Pause and resume continue from the current unit.
- [ ] Controls are keyboard reachable and labelled.
- [ ] Feature-detected. Absent API hides the control rather than breaking it.
- [ ] No audio starts without an explicit user action.
- [ ] Works with every theme and typeface combination.
- [ ] Cancellation on book close and panel close is reliable.

Related: [[Future Features MOC]], [[Accessibility Rules]], [[Feature Spec Template]].