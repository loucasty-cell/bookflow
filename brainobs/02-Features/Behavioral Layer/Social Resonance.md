---
title: Social Resonance
type: feature
status: planned
updated: 2026-10-02
tags: [bookflow, behavioral, social, privacy, planned]
source-files: [backend/routers/social.py]
---

# Social Resonance

Planned. A privacy-preserving social layer where readers of the same book can see each other's
reflections in the margin, without anyone uploading a book or an identity.

Status: **planned, and the backend side is mocks**. Do not describe any part of this as shipped.
See "What actually exists today" below for the precise boundary.

## The core idea

```text
paragraph text --SHA-256--> hash (client-side)
client sends: hash + reaction
server stores: hash + reaction counts
another reader with the same paragraph derives the same hash and sees the reflections
```

The server never receives the paragraph. It receives a fixed-length digest it cannot reverse. Two
people reading the same book align automatically because the same text produces the same hash.

## Why this design

| Property | Result |
| --- | --- |
| Zero content upload | Only digests leave the device |
| Zero account requirement | Identity is not needed to derive a hash |
| Exact alignment | Matching is on the paragraph, not on a page number that varies by edition |
| Deniability | Hashes reveal nothing about the text to the server |

## What actually exists today

The only real code for this feature is a router of mock endpoints. Be precise about this, because
"the endpoints exist" reads as "the feature works".

| Fact | Evidence |
| --- | --- |
| Router file | `backend/routers/social.py` |
| Router location | It sits at `backend/routers/social.py`, **outside** the `backend/app/` package that every other router uses |
| `GET /api/social/resonance/{paragraph_hash}` | `social.py:50`, returns `MOCK_RESONANCES` |
| `POST /api/social/events/session-pulse` | `social.py:62`, `status_code=202`, logs and returns `{"status": "tracked"}` |
| The returned data | Two hard-coded reflection records in `MOCK_RESONANCES` (`social.py:29-48`) |
| Database | None. The source comments state the DB is "intentionally disconnected" |
| Frontend | **None.** There is no persisted frontend community experience anywhere in `src/` |

Two consequences follow. The mock `resonance` payload includes a plain `quote` field
(`social.py:13,33`), which is the opposite of the zero-content-upload property described above; that
is mock fixture data, not the intended schema, and it must not be quoted as the design. And
`session-pulse` accepting a `user_id` would also conflict with the deniability property, so it is
prototype scaffolding rather than a contract to build on.

Neither endpoint is registered in the running app in a way that any Bookflow client calls.

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
| Hash reversibility in practice | A short, well-known paragraph is enumerable by brute force, so "cannot be reversed" is weaker than it sounds for canonical phrases |

Mitigation direction: include a document-level salt derived from book metadata in the hash input so
identical strings in different books do not collide, and version the hashing scheme so a format
change does not silently split the community.

## Build rules when implementing

- Hash computation happens client-side. The paragraph is never sent.
- The hashing scheme carries an explicit version identifier.
- Rate limit writes. Validate hash format strictly.
- Show nothing rather than something misleading when data is absent.
- Respect the calm-reader rule: social signals must never become task-switching triggers.
- Keep the feature off by default.
- Move the router under `backend/app/routers/` with its models under `backend/app/models/`, matching
  every other router, and delete the mocks rather than leaving them reachable.

Detail: [[Privacy Model]], [[Ethical Guardrails]], [[Invariants]], [[File Placement Map]].

Related: [[Roadmap MOC]], [[Behavioral Layer MOC]], [[Competitor Analysis]].