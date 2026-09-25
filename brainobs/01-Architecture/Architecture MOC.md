---
title: Architecture MOC
type: MOC
status: living
updated: 2026-09-25
tags: [bookflow, architecture, moc]
---

# Architecture MOC

How Bookflow is put together and how data moves through it.

## Notes

- [[Full-Stack Overview]] - the frontend and backend roles, and why the split exists
- [[Frontend Architecture]] - React 19, Vite 8, feature folders, stores, code splitting
- [[Backend Architecture]] - FastAPI, PyMuPDF thread pool, job store, connection pooling
- [[Data Flow]] - end-to-end journey from file selection to restored reading position
- [[Normalized Book Contract]] - the shared JSON shape every parser emits
- [[Storage and Persistence]] - what is saved locally and under which keys
- [[Library and Reading Stats]] - metadata-only return loop and remaining storage work
- [[Privacy Model]] - what stays on device, what leaves, and when
- [[Tech Stack]] - every dependency with its exact responsibility

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
- [[Current State Matrix]] - what is verified versus planned