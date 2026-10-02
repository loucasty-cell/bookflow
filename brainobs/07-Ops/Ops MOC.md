---
title: Ops MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, ops, moc]
source-files: [brainobs/07-Ops/Testing Pipeline.md,brainobs/07-Ops/Dev Setup.md,brainobs/07-Ops/Docker OCR.md,brainobs/07-Ops/Debugging Playbook.md,package.json,playwright.config.js]

---

# Ops MOC

Setup, deployment, testing, and debugging.

## Notes

- [[Dev Setup]] - local environment, both services, ports, scripts
- [[Docker OCR]] - self-hosted PaddleOCR profiles
- [[Testing Pipeline]] - the real gate set, and the missing DOM test environment
- [[Debugging Playbook]] - common failures and their causes

## Command summary

Every command below was verified against `package.json` or the repository on
2026-10-02.

```bash
npm install             # Dependencies
npm run dev             # Vite on port 3000, host 0.0.0.0
npm run lint            # ESLint, 0 errors + 1 known warning
npm test                # Vitest, 52 test files and 506 tests
npm run build           # Production bundle
npm run preview         # vite preview, no arguments
npm run test:e2e        # Playwright, 19 tests in 4 specs, against preview on port 4175
npm run check:vault     # brainobs vault integrity
node scripts/security/contrast.mjs   # WCAG contrast gate, manual, not an npm script
pytest backend/tests/   # Backend suite, 75 tests
npx pyright             # Backend type check
git diff --check        # Whitespace and conflict check
```

Two gotchas worth carrying in your head:

- `npm run preview` is `vite preview` and takes no argument. Playwright passes
  `--port 4175 --strictPort` itself, so the browser suite runs against a
  production preview build and never against `npm run dev`.
- Use the system Chrome channel for the browser suite:
  `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e`. There is no `projects`
  block, so there is no project to select.

## The verification rule

Every completed change runs lint, test, build, vault, and diff check. Reader,
parser, or visual changes additionally require a browser pass. Backend changes
additionally require pytest and pyright. Changing a token or theme file also
requires the contrast script.

CI (`.github/workflows/webpack.yml`) runs only lint, test, build, and pytest, so
the vault, contrast, browser, and pyright gates are yours to run.

Detail: [[Verification Checklist]], [[Testing Pipeline]].

Related: [[Environment Config]], [[Success Metrics]].
