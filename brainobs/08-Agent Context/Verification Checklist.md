---
title: Verification Checklist
type: reference
status: verified
updated: 2026-09-24
tags: [bookflow, agent, verification, checklist]
source-files: [AGENTS.md, scripts/bench.md, .agents/skills/reader-ergonomics-qa/SKILL.md]
---

# Verification Checklist

What to run and inspect before declaring a change complete. Scale the depth to the risk.

## Always run

```bash
npm run lint
npm test
npm run test:e2e
npm run build
npm run check:vault
git diff --check
```

Backend changes additionally:

```bash
pytest backend/tests/ -v
npx pyright
```

## Reader and visual changes

Use a real browser and check:

- [ ] Landing page and sample-book entry work.
- [ ] A representative document imports.
- [ ] The focus rail follows scroll to the correct unit.
- [ ] Pin works via click, focused-paragraph `Enter`/`Space`, and `Escape`. Resume restores auto-focus.
- [ ] Step controls advance and reset pin state.
- [ ] Static regions scroll without snapping and show the reading label.
- [ ] Notes, bookmarks, and settings work and persist across reload.
- [ ] Progress restoration returns to the exact position.
- [ ] Error states render a clear, actionable message.
- [ ] Desktop and `390 x 844` both show no overflow.
- [ ] Visible mobile controls measure at least `44 x 44` CSS pixels.
- [ ] Long book and chapter titles wrap rather than overflow.
- [ ] Every changed theme renders correct token values, including near-black.
- [ ] Loading reaches a visible 100 percent before the surface changes.
- [ ] Long-book import is measured with a generated 400+ page fixture and reports progress, mounted sections, and overflow.
- [ ] Logo assets load and the console shows no warnings or errors.

Use computed styles and measured dimensions as evidence. A screenshot alone is weak proof of
geometry.

## Parser changes

- [ ] A representative file of the affected format imports.
- [ ] Chapter and paragraph order matches the source.
- [ ] No empty paragraphs or dropped content.
- [ ] Unusual structure is preserved as readable text, not discarded.
- [ ] One malformed file produces a clear error.

Detail: [[Validation Rules]], [[Normalized Book Contract]].

## OCR changes

- [ ] A controlled scanned PDF imports, and recognized page order matches the source images.
- [ ] Pages with selectable text bypass OCR.
- [ ] Progress streams with sensible percentages and never claims early completion.
- [ ] Cancellation actually stops work on both sides.
- [ ] Unreadable pages are reported rather than dropped.
- [ ] Local OCR completes with the network disabled.

Detail: [[OCR Decision Tree]], [[Local Tesseract.js]].

## Behavioral feature changes

- [ ] Default remains off in `DEFAULT_SETTINGS`.
- [ ] Nothing appears for a user who has not opted in.
- [ ] Reduced motion removes animation without removing content.
- [ ] The reading text is never obscured or blocked.
- [ ] Dismissal is single-action and focus is not trapped after close.
- [ ] No streak punishment, fake urgency, or variable-ratio payout was introduced.

Detail: [[Ethical Guardrails]], [[Behavioral Layer MOC]].

## Accessibility pass

- [ ] Keyboard-only navigation works through landing, import, reader, notes, settings.
- [ ] Every icon-only control has an accessible name.
- [ ] `aria-pressed` matches visible state on every toggle.
- [ ] Overlays use `aria-modal` and manage focus correctly.
- [ ] Closed panels leave the focus order.
- [ ] Contrast verified in each exposed theme.
- [ ] No horizontal overflow at 320px.
- [ ] Progress and status changes are announced.

Detail: [[Accessibility Rules]].

## Performance pass

- [ ] `bookflow:` performance marks inspected for the changed pipeline.
- [ ] No long task over 100ms during import or OCR.
- [ ] Memory growth is bounded on a long book.
- [ ] Initial bundle did not regress materially.

Detail: [[Success Metrics]].

## Before finishing

- [ ] `git status --short --branch` reviewed for unintended files.
- [ ] No secrets, tokens, or private documents staged.
- [ ] No debug output or console noise left behind.
- [ ] Claims match implementation and status vocabulary.
- [ ] Affected vault notes updated with a new `updated` date.
- [ ] `npm run check:vault` passes if vault notes were edited.
- [ ] [[Current State Matrix]] updated if capability status changed.
- [ ] [[Context Sync Protocol]] followed for linked notes.

Related: [[Testing Pipeline]], [[Invariants]], [[Debugging Playbook]].