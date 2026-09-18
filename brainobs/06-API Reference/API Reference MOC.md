---
title: API Reference MOC
type: MOC
status: living
updated: 2026-09-18
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

## Ground rules

| Rule | Reason |
| --- | --- |
| Import through `index.js` only | Features stay replaceable |
| Never import feature internals | Prevents hidden coupling |
| Alias fields in Pydantic v2 | snake_case Python, camelCase JSON |
| Keep JSON wire contract camelCase | The frontend contract |
| Cache nothing content-bearing | Privacy invariant |

Detail: [[Invariants]], [[Frontend Architecture]], [[Backend Architecture]].

## Related

- [[Normalized Book Contract]] - the shape that crosses every boundary
- [[OCR-Frontend Sync Contract]] - the highest-traffic integration
- [[Storage and Persistence]] - the local storage contracts