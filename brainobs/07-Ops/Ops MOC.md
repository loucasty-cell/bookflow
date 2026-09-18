---
title: Ops MOC
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, ops, moc]
---

# Ops MOC

Setup, deployment, testing, and debugging.

## Notes

- [[Dev Setup]] - local environment, both services, ports, scripts
- [[Docker OCR]] - self-hosted PaddleOCR profiles
- [[Testing Pipeline]] - every check to run and what it covers
- [[Debugging Playbook]] - common failures and their causes

## Command summary

```bash
npm run dev             # Vite on port 3000
npm run lint            # ESLint
npm test                # Vitest
npm run build           # Production build
pytest backend/tests/   # Backend suite
npx pyright             # Backend type check
git diff --check        # Whitespace and conflict check
```

## The verification rule

Every completed change runs lint, test, build, and diff check. Reader, parser, or visual changes
additionally require a browser pass. Backend changes additionally require pytest and pyright.

Detail: [[Verification Checklist]].

Related: [[Environment Config]], [[Success Metrics]].