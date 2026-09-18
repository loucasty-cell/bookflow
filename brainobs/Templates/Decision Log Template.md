---
title: Decision Log Template
type: template
status: living
updated: 2026-09-18
tags: [bookflow, template, adr, decisions]
---

# Decision Log Template

Record significant decisions so future work does not relitigate them or silently reverse them.

```markdown
---
title: ADR-NNN Short Decision Title
type: decision
status: accepted
updated: YYYY-MM-DD
tags: [bookflow, decision, adr]
source-files: [src/path/file.js]
---

# ADR-NNN: Short Decision Title

## Status

Accepted | Superseded by ADR-NNN | Rejected | Under review

## Context

What situation forced a decision. Facts only, no advocacy.

## Decision

What was decided, in one paragraph.

## Rationale

Why this option won.

| Criterion | This option | Alternative |
| --- | --- | --- |
| Privacy | ... | ... |
| Complexity | ... | ... |
| Performance | ... | ... |

## Consequences

What becomes easier, what becomes harder, and what is now constrained.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| ... | ... |

## Guardrails affected

- [ ] Privacy model
- [ ] React text nodes
- [ ] Opt-in behavioral defaults
- [ ] Reduced motion
- [ ] Dependency policy

## Related

- [[Invariants]]
- [[Ethical Guardrails]]
```

## When to write one

| Write an ADR | Skip it |
| --- | --- |
| Choosing a storage mechanism | Renaming a variable |
| Adding or rejecting a dependency | Fixing a CSS value |
| Changing the OCR tier order | Adding a test |
| A decision that constrains the future | A decision that is trivially reversible |
| Resolving a conflict with a guardrail | Anything already documented elsewhere |

## Why this matters here

The project already contains recorded decisions worth preserving as ADRs, for example the
deterministic-progress choice and the native-text-first OCR order. Writing them as decisions with
rationale prevents a future contributor from "optimizing" them away without understanding the
reasoning.

Detail: [[Ethical Guardrails]], [[OCR Decision Tree]], [[Context Sync Protocol]].