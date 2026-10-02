---
title: API Reference MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, api, reference, moc]
---

# API Reference MOC

Every interface: HTTP endpoints, frontend public APIs, and environment configuration.

## Notes

- [[Backend Endpoints]] - every FastAPI route with request and response shapes
- [[Frontend Public APIs]] - the exports from each feature's `index.js`
- [[Environment Config]] - every environment variable and port

## Orientation

```text
Frontend public APIs   what one feature may use from another
Backend endpoints      what the browser may call, opt-in
Environment config     what changes between devices and deployments
```

There are **seven** features under `src/features/` and each exposes one `index.js` barrel:
`reader`, `document-import`, `library`, `landing`, `lens-bar`, `widgets`, and `scroll`.

## Ground rules

| Rule | Reason |
| --- | --- |
| Import through `index.js` only | Features stay replaceable |
| Never import feature internals | Prevents hidden coupling |
| Alias fields in Pydantic v2 | snake_case Python, camelCase JSON |
| Keep JSON wire contract camelCase | The frontend contract |
| Cache nothing content-bearing | Privacy invariant |
| Provider keys never enter the browser bundle | All remote Lens traffic goes through the backend |
| No selection means no Lens request | Egress is opt-in per session |

## Two contracts worth knowing before you read the endpoints

- **Two backend apps exist.** `backend/main.py` is the app Docker serves;
  `backend/tests/conftest.py` imports `app.main`. An endpoint present in only one of them is
  either unserved or untested.
- **`.env.example` is incomplete.** It lists 21 bare keys and omits the `GEMINI_*` family that
  the Reading Lens needs. See [[Environment Config]].

## Detail

Detail: [[Invariants]], [[Frontend Architecture]], [[Backend Architecture]], [[Verification Checklist]].

## Related

- [[Normalized Book Contract]] - the shape that crosses every boundary
- [[OCR-Frontend Sync Contract]] - the highest-traffic integration
- [[Storage and Persistence]] - the local storage contracts
- [[Reading Lens]] - the one consented remote path
- [[File Placement Map]] - where new code belongs