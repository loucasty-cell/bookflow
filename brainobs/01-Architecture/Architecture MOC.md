---
title: Architecture MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, architecture, moc]
source-files: [src/features/reader/index.js,src/features/lens-bar/index.js,backend/main.py]
---

# Architecture MOC

How Bookflow is put together and how data moves through it.

## Architecture notes

- [[Full-Stack Overview]] - the frontend and backend roles, and why the split exists
- [[Frontend Architecture]] - seven features with barrel APIs, two store factories, four shared layers
- [[Backend Architecture]] - two competing FastAPI apps, the one that serves, the one the tests hit
- [[Data Flow]] - end-to-end journey from file selection to restored reading position
- [[Normalized Book Contract]] - the shared JSON shape every parser emits
- [[Storage and Persistence]] - every storage key, and why only settings reach `localStorage` wholesale
- [[Library and Reading Stats]] - metadata-only return loop and the recent shelf
- [[Privacy Model]] - what stays on device, what leaves, and when
- [[Tech Stack]] - every dependency with its exact responsibility

## Features that changed the architecture

- [[Reading Lens]] - consented remote passage questions, with a local fallback
- [[Reading Lens Bar]] - the lens feature folder, its own store, and its own CSS
- [[Command Palette]] - reader-owned palette, not a cross-feature component
- [[Graphics Quality Tiers]] - the single atmosphere budget decision shared by the ambient layer

`Library and Reading Stats` now lives in `02-Features/`, not `05-Roadmap/Future Features/`.
Wikilinks key on basename, so the link above still resolves.

## The one-paragraph summary

Bookflow is a decoupled full stack where the browser does the work by default and the backend
is an optional accelerator that the user must explicitly start. Both sides emit the identical
`NormalizedBook` shape, so reader components never need to know which path produced the book.
The PDF path prepares units progressively but opens the reader only after a terminal 100% import
state. Local state lives in safe storage, with a separate metadata-only `bookflow:library`; the
app still functions when storage is blocked.

## Related

- [[Invariants]] - rules that constrain both sides
- [[File Placement Map]] - where new code belongs
- [[Agent Quickstart]] - how an agent should orient in this repository
- [[Current State Matrix]] - what is verified versus planned