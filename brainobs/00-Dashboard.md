---
title: Bookflow Brain
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, index, moc]
---

# Bookflow Brain

Second-brain vault for the Bookflow project. One Obsidian vault that explains what Bookflow
is today, how the full stack actually runs, why the reading experience is designed the way it
is, and what can be built next without breaking the invariants.

Read this note first. Every other note is one hop away.

## Start here

| If you are... | Read this |
| --- | --- |
| An AI agent picking up a task | [[Agent Quickstart]] then [[Invariants]] |
| A new developer | [[Full-Stack Overview]] then [[Dev Setup]] |
| Working on the reader | [[Focus Rail]], [[Reader Engine MOC]] |
| Working on import or OCR | [[OCR Pipeline MOC]], [[OCR-Frontend Sync Contract]] |
| Working on UX or visual design | [[Design Tokens]], [[Premium Micro-interactions]] |
| Working on growth or retention | [[Atomic Habits Framework]], [[Ethical Guardrails]] |
| Writing a new feature spec | [[Feature Spec Template]] |
| Updating this vault after a code change | [[Context Sync Protocol]] |

## Maps of content

- [[Architecture MOC]] - stack, data flow, contracts, persistence
- [[Reader Engine MOC]] - focus, typography, themes, notes
- [[Document Import MOC]] - parsers, validation, scheduler
- [[OCR Pipeline MOC]] - decision tree, local and backend engines, SSE
- [[Behavioral Layer MOC]] - capsules, interventions, social resonance
- [[Psychology MOC]] - habit science, flow, ethics, competition
- [[UX Playbook MOC]] - tokens, layouts, motion, accessibility
- [[Roadmap MOC]] - current state, backlog, future features, metrics
- [[API Reference MOC]] - endpoints, public APIs, environment
- [[Ops MOC]] - setup, Docker, testing, debugging
- [[Agent Context MOC]] - invariants, file map, verification
- [[Competitor Research MOC]] - primary-source research on Kindle, Apple Books, Everand, Libby, Goodreads, Bookly, Fable
- [[Vault Maintenance]] - how to keep this vault true
- [[Context Sync Protocol]] - the update process after every code change

## The project in five lines

```text
Bookflow is a private, local-first browser reader for PDF, EPUB, TXT, and Markdown.
Its core interaction is scroll-driven sentence and paragraph focus at FOCUS_RAIL_RATIO = 0.42.
The frontend (React 19 + Vite 8 + Zustand) parses documents in-browser and keeps text on device.
The backend (FastAPI + PyMuPDF + PaddleOCR) is an optional accelerator for scanned pages only.
Behavioral features exist but are opt-in and disabled by default, by design.
```

## Non-negotiables in one glance

1. Local-first privacy. Book text stays on the device unless the user explicitly starts a scan.
2. React text nodes only. Never `dangerouslySetInnerHTML` for book contents.
3. Golden-ratio focus rail. Scrolling pulls the active unit into focus at 42 percent.
4. Opt-in behavioral layer. Reward capsules and interventions default to `false`.
5. Deterministic progress. No variable-ratio reward mechanics, no streak punishment.

Full detail in [[Invariants]].

## Status legend

Every note carries frontmatter so status is never guessed:

| Field | Meaning |
| --- | --- |
| `status: verified` | Confirmed against source code in this repository |
| `status: partial` | Partially implemented; scope is stated in the note |
| `status: planned` | Designed but not implemented; do not describe as existing |
| `status: living` | Index or process note that changes as the project changes |
| `source-files:` | Real repository paths that back the note's claims |
| `updated:` | Date the note was last reconciled with source |

## Vault rules

- This vault describes the repository as it is, plus clearly labelled plans.
- Never blur "verified" with "planned".
- When code changes, update the affected note and its `updated` field in the same change.
- Process for that: [[Context Sync Protocol]].