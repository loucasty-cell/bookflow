---
title: Social Resonance
type: feature
status: planned
updated: 2026-09-18
tags: [bookflow, behavioral, social, privacy, planned]
source-files: [goals.md, features.md, api.md, AGENTS.md]
---

# Social Resonance

Planned. A privacy-preserving social layer where readers of the same book can see each other's
reflections in the margin, without anyone uploading a book or an identity.

Status: **planned**. The endpoints and hashing approach are specified. Do not describe this as
shipped functionality until it is implemented and verified.

## The core idea

```text
paragraph text --SHA-256--> hash (client-side)
client sends: hash + reaction
server stores: hash + reaction counts
another reader with the same paragraph derives the same hash and sees the reflections
```

The server never receives the paragraph. It receives a fixed-length digest it cannot reverse.
Two people reading the same book align automatically because the same text produces the same
hash.

## Why this design

| Property | Result |
| --- | --- |
| Zero content upload | Only digests leave the device |
| Zero account requirement | Identity is not needed to derive a hash |
| Exact alignment | Matching is on the paragraph, not on a page number that varies by edition |
| Deniability | Hashes reveal nothing about the text to the server |

## Planned endpoints

### `GET /api/social/resonance/{hash}`

Returns aggregated reflections anchored to a paragraph hash.

### `POST /api/social/reactions`

Records a reader reaction against a hash.

Both are described in `goals.md` Phase 3 as the async in-margin social layer, with
`/api/social/resonance/{hash}` for zero-data-leakage shared marginalia.

## Planned experience

| Feature | Description |
| --- | --- |
| Thought whispers | A quiet marker showing N readers reflected on this paragraph |
| Reaction capsules | Time-shifted reactions that surface later, for discovery |
| No leaderboards | Ranking readers against each other is out of scope by design |

## Risks to resolve before shipping

| Risk | Concern |
| --- | --- |
| Ordering | Paragraph splitting must be deterministic across clients and versions, or hashes diverge |
| Duplicate text | Common boilerplate paragraphs collide across unrelated books |
| Seasonal uniformity | Very short paragraphs produce many collisions |
| Spam and abuse | An unauthenticated write endpoint needs rate limiting and moderation |
| Empty-start problem | A new reader may see nothing, which reads as broken rather than as early |

Mitigation direction: include a document-level salt derived from book metadata in the hash input
so identical strings in different books do not collide, and version the hashing scheme so a
format change does not silently split the community.

## Build rules when implementing

- Hash computation happens client-side. The paragraph is never sent.
- The hashing scheme carries an explicit version identifier.
- Rate limit writes. Validate hash format strictly.
- Show nothing rather than something misleading when data is absent.
- Respect the calm-reader rule: social signals must never become task-switching triggers.
- Keep the feature off by default.

Detail: [[Privacy Model]], [[Ethical Guardrails]], [[Invariants]].

## Backend hooks already present

The backend context notes behavioral and social endpoints alongside the OCR pipeline, so the
natural home is a new router in `backend/app/routers/` with models in `backend/app/models/`.

Detail: [[File Placement Map]], [[Backend Endpoints]].

Related: [[Roadmap MOC]], [[Competitor Analysis]].