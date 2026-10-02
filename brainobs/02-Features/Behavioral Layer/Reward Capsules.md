---
title: Reward Capsules
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, behavioral, rewards, retention]
source-files: [src/components/VariableRewardCapsule.jsx, src/components/capsule.css, src/features/reader/components/ReaderShell.jsx, src/features/reader/config.js, src/App.jsx]
---

# Reward Capsules

A capsule that appears when a reader finishes a chapter, carrying a short synthesis tied to the
chapter.

Setting: `showRewardCapsules`, default **`false`** (`src/features/reader/config.js:15`).

Status: **verified off by default**. The component is built and wired, but no default session renders
it. `App.jsx` passes `settings.showRewardCapsules === true`, so a capsule cannot appear unless the
reader turned it on.

## What it is

| Element | Purpose |
| --- | --- |
| Serendipitous synthesis | A short intellectual payoff for finishing a chapter |
| Cross-domain connection | Links the chapter's idea to another field |
| Cognitive flow sparkline | Shows pace stability across the session |
| Spring-physics reveal | Feels earned rather than issued |

The satisfaction comes from the thought, not from a jingle. Slot-machine feedback in a reading app
would undermine the product's purpose.

## Why variable timing and not variable reward

The capsule timing is not announced, which creates mild anticipation. But the content is
substantive and deterministic, not a randomized jackpot. This distinction is what keeps the feature
defensible: it is a curiosity and completion cue, not a variable-ratio reinforcement schedule.

Detail: [[Ethical Guardrails]], [[Habit Loop Design]].

## Implementation

```text
ReaderShell.jsx
  -> lazy-loads VariableRewardCapsule (code-split, not in the initial bundle)
  -> renders only when showRewardCapsules is true
  -> receives chapterTitle for contextual copy
```

Lazy loading matters: a reader with the feature off never pays the bundle cost.

## Motion and accessibility

- Uses Framer Motion spring physics for the reveal.
- Respects `prefers-reduced-motion`. With reduced motion, present the capsule without the spring
  animation rather than skipping the content.
- Never traps focus and never blocks scrolling behind it.
- Dismissible in one action and never modal-blocking.

Detail: [[Motion and Transitions]], [[Accessibility Rules]].

## Positioning

| Do | Do not |
| --- | --- |
| Appear after a chapter completes | Interrupt mid-paragraph |
| Say something true about the chapter | Insert generic praise |
| Be dismissed with one action | Require multiple clicks to dismiss |
| Stay out of the way of the next chapter | Cover the reading text |

## Relationship to other features

| Feature | Relationship |
| --- | --- |
| Intervention engine | Both opt-in, both off by default, opposite moments (completion vs drift) |
| Progress | Capsules reward completion; progress stays deterministic |
| Notes | Both give the session a tangible artifact |

## Verification

- Leave the feature at its default and confirm no capsule can appear under any chapter completion.
- Enable capsules, finish a chapter, confirm the capsule appears once.
- Disable capsules, confirm nothing appears and nothing is loaded.
- Enable reduced motion, confirm no spring animation.
- Confirm the reading text is never obscured.

Related: [[Behavioral Layer MOC]], [[Psychology MOC]].