---
title: Agent Context MOC
type: MOC
status: living
updated: 2026-09-24
tags: [bookflow, agent, moc]
---

# Agent Context MOC

Everything an AI agent needs before touching this codebase.

## Notes

- [[Agent Quickstart]] - read this first
- [[Invariants]] - rules that must not be broken
- [[File Placement Map]] - where each kind of change belongs
- [[Verification Checklist]] - what to run and inspect
- [[Context Sync Protocol]] - how to keep this vault true after a change

## Hard rules in one block

```text
Local-first privacy          book text stays on device by default
React text nodes only        never dangerouslySetInnerHTML for book contents
Focus rail                   FOCUS_RAIL_RATIO = 0.38
Opt-in behavioral layer      capsules and interventions default false
Deterministic progress       no variable-ratio reward mechanics
No unapproved dependencies   ask first
No emojis, no co-author trailers, no unnecessary comments
Never claim planned as built
Refactor status                reader hooks and feature boundaries are extracted; App composition remains
```

## Reading order for a new task

```text
1  [[Agent Quickstart]]            what the project is, constants, commands
2  [[Invariants]]                  what must not break
3  The feature note for your area  behavior and constraints
4  [[File Placement Map]]          where the code goes
5  [[Verification Checklist]]      how to prove it works
6  [[Context Sync Protocol]]       update the vault before finishing
```

## Status discipline

Never describe a planned capability as implemented. Every note carries a `status` field, and
[[Current State Matrix]] is the authority. If the matrix says planned, the feature does not
exist yet.

Detail: [[Ethical Guardrails]].

Related: [[Architecture MOC]], [[Roadmap MOC]].