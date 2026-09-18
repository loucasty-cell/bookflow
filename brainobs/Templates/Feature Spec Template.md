---
title: Feature Spec Template
type: template
status: living
updated: 2026-09-18
tags: [bookflow, template, spec]
---

# Feature Spec Template

Copy this into a new note when designing a feature. Delete the guidance lines.

```markdown
---
title: Feature Name
type: spec
status: planned
updated: YYYY-MM-DD
tags: [bookflow, area, planned]
source-files: [src/path/file.js]
---

# Feature Name

One sentence stating what it is and why it matters.

Status: **planned**. Do not describe as shipped until implemented and verified.

## Problem

What is broken or missing today, in concrete terms.

## Design

What the feature does, with the specific behavior.

| Element | Behavior |
| --- | --- |
| ... | ... |

## Where it lives

| Piece | Location |
| --- | --- |
| Component | `src/features/<area>/components/Foo.jsx` |
| Logic | `src/features/<area>/lib/foo.js` |
| Setting | `src/features/reader/config.js` |
| Test | Beside the logic as `foo.test.js` |

## Invariants checked

- [ ] Local-first privacy preserved
- [ ] Book text rendered through React text nodes
- [ ] Behavioral feature defaults to off
- [ ] Reduced motion respected
- [ ] No new dependency without approval
- [ ] No horizontal overflow from 320px to 430px

## Interaction with existing features

| Feature | Interaction |
| --- | --- |
| Focus rail | ... |
| Storage | ... |

## Risks

| Risk | Mitigation |
| --- | --- |
| ... | ... |

## Measurement

State the metric before building.

| Metric | Target |
| --- | --- |
| ... | ... |

## Acceptance criteria

- [ ] Criterion one
- [ ] Criterion two
- [ ] Verified at 320px, 390x844, and desktop

## Related

- [[Invariants]]
- [[File Placement Map]]
- Relevant MOC
```

## Rules for using this template

| Rule | Reason |
| --- | --- |
| Always set a real `status` | Prevents claiming unbuilt work |
| Always name the metric | Features without measurement cannot be evaluated |
| Always check the invariants | Prevents a well-designed feature that breaks the product |
| Always state the location | Makes the spec directly implementable |
| Link from a MOC | Keeps the note reachable |

Related: [[Current State Matrix]], [[Context Sync Protocol]].