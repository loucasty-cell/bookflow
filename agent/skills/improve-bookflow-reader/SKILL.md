---
name: improve-bookflow-reader
description: Audit, diagnose, design, implement, and verify improvements to this Bookflow React/Next.js repository. Use for Bookflow reader focus or navigation changes, private local PDF OCR, PDF/EPUB/TXT/Markdown imports, file validation, loading progress, privacy, accessibility, responsive layouts, long-title overflow, reading-time consistency, logo usage, Apple-inspired content-first design, near-black dark mode, theme and color-palette work, five-star web polish, regression testing, documentation alignment, or an explicitly requested commit and push. Do not use to claim native App Store or Google Play readiness, universal ebook or language support, AI processing, analytics, cloud sync, or perfect book classification unless those capabilities are explicitly implemented and verified.
---

# Improve Bookflow Reader

Improve this repository as a calm, private, production-quality reading app. Ground every decision and claim in the current source, tests, and rendered application.

## Establish the current truth

1. Read the repository `AGENTS.md` completely and follow it.
2. Run `git status --short --branch`; preserve unrelated and pre-existing work.
3. Read `package.json`, `README.md`, and the source involved in the request.
4. Search the current reader controller, components, styles, parsing, storage, and tests before changing behavior.
5. Consult `structure.md`, `goals.md`, `api.md`, `detailsinfo.md`, and `book-structure-algorithm.md` only when relevant. Verify their claims against source and runtime behavior.
6. If documentation disagrees with the implemented focus unit, format support, palette, or navigation model, report the mismatch and use the requested product direction rather than silently restoring stale behavior.

Never assume a previous Bookflow checkout represents this repository. The current working tree and runtime are authoritative.

## Match the requested action

- For an audit or diagnosis, inspect and report evidence without editing.
- For a change, implement the smallest complete improvement and verify it.
- For a design request, extend the current semantic tokens and components instead of replacing unrelated reader behavior.
- Do not add dependencies without explicit approval.
- Do not commit or push unless the user explicitly requests it.
- When a push is authorized, fetch, check divergence, stage only intended files, avoid force push, and preserve local editor files and unrelated work.

## Protect Bookflow invariants

- Process imported document contents locally by default.
- Do not transmit book text to AI, analytics, logs, or external services without explicit architectural approval.
- Render imported text through React text nodes, never untrusted HTML.
- Treat archives, filenames, metadata, and extracted markup as untrusted input.
- Keep every page or section reachable; do not silently discard uncertain content.
- Keep scanned-PDF OCR inside the browser, preserve the original page order, and state that the bundled model currently targets English text.
- Preserve keyboard, pointer, wheel, touch, reduced-motion, desktop, and mobile behavior.
- Avoid decorative motion, popups, or gamification that competes with long-form reading.

## Audit as a five-star web product

Treat "five-star" as a quality target, not a real rating.

| Area | Inspect |
| --- | --- |
| Reading correctness | Import order, paragraph reconstruction, focus unit, progress, resume, bookmarks, notes, and structural filtering |
| Interaction quality | Wheel, keyboard, touch, settings, error recovery, loading feedback, and compact navigation |
| Visual polish | Typography, spacing, hierarchy, tokens, logo placement, restrained motion, empty/loading/error states, and theme cohesion |
| Responsive quality | Long filenames, long chapter names, narrow screens, zoom/reflow, touch targets, and horizontal overflow |
| Accessibility | Accessible names, focus order, contrast, disabled states, screen-reader state, and reduced motion |
| Privacy and security | Local processing, storage scope, archive paths, file signatures, untrusted text, and truthful privacy copy |
| Performance | Lazy parser chunks, long-book responsiveness, scroll work, re-renders, asset weight, and storage writes |
| Engineering | Feature boundaries, effect cleanup, tests, error handling, source/documentation agreement, and maintainability |

Rank verified findings as:

- `P0`: privacy, security, data loss, broken reading, or inaccessible core control.
- `P1`: major correctness, navigation, responsive, or performance failure.
- `P2`: meaningful polish, consistency, or maintainability improvement.

Do not invent benchmarks, user research, store ratings, or support claims.

## Maintain honest document imports

1. Read the active import constants and parser code before listing supported formats or limits.
2. Validate extension and size before expensive parsing.
3. Verify PDF and EPUB signatures instead of trusting filenames alone.
4. Reject binary or disguised text files with actionable errors while allowing legitimate short prose.
5. Keep PDF and EPUB parsing asynchronous and heavy parser dependencies lazy.
6. Prefer native PDF text and invoke OCR only for pages whose selectable text is missing or too sparse.
7. Reuse one OCR worker across scanned pages, terminate it after every success or failure, and use bundled same-origin worker, WebAssembly, and language assets.
8. Show an actionable error when neither native extraction nor local English OCR finds readable text.
9. Ensure import progress is monotonic and visibly reaches `100%` before the reader replaces the loading state.
10. Test a native-text PDF, a controlled image-only English PDF, and a disguised or unsupported file when PDF import behavior changes.

Describe file detection as format and readable-content validation, not guaranteed proof that a file is a book.

## Preserve the Bookflow visual identity

Use semantic CSS variables. Keep long-form surfaces calm and reserve strong accents for focus, progress, selection, and important actions.

| Role | Current direction |
| --- | --- |
| Soft white surface | `#FFFEFA` or the active reader surface token |
| Bookflow blue | `#507B9C` |
| Pale blue fill | `#C2DCFF` |
| Interactive red | `#E3242B` |
| Logo navy | `#171D3A` |
| Royal blue | `#4169E1` |
| Ink wine | `#7B1020` |
| Logo cream | `#F3EAD9` |

For theme or logo work:

1. Reuse the repository logo asset purposefully in brand, import, or book-identity states; do not wallpaper the interface with it.
2. Map colors to surface, text, muted text, border, primary action, focus fill, focus edge, warning, and destructive roles.
3. Verify hover, active, disabled, selected, keyboard-focus, and every supported theme.
4. Keep long titles inside flex and grid layouts with `min-width: 0`, wrapping or clamping, and full-title access where useful.
5. Use tabular numerals and consistent formatting for time, progress, page counts, and compact statistics.
6. Check actual contrast and computed styles before calling a palette accessible.

## Apply Apple-inspired design without copying a scaffold

1. Favor simplicity, content-first hierarchy, semantic tokens, restrained chrome, and motion that explains state or space.
2. Preserve Bookflow's current React/Next.js architecture. Zustand, Framer Motion, and SWR are configured for global state, spring-physics UI, and caching; do not add extra unapproved dependencies or router libraries without explicit approval and a real product need.
3. Use the system UI stack for interface chrome and a proven local serif stack for long-form reading. Do not fetch fonts that weaken local-first privacy.
4. Use a consistent spacing scale, layered soft shadows, purposeful glass materials, and safe-area insets instead of scattered one-off values.
5. Make mobile buttons and interactive controls at least `44 x 44` CSS pixels. Verify actual rendered rectangles, not just declared styles.
6. Keep the light atmosphere soft white with Bookflow blue, pale blue, and red accents. Make black mode genuinely near-black using `#000000` app surroundings and approximately `#070708` reading surfaces, with restrained blue and wine depth.
7. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`. Never make blur required for legibility.
8. Present settings and notes as side materials on desktop and bottom sheets on narrow mobile screens. Keep only one sheet open at a time and remove closed sheets from keyboard focus.
9. Use compact real progress, calm loading feedback, and contextual controls. Avoid decorative celebrations, noisy badges, or unverified haptic claims.

After each visual browser pass, record the weakest verified state, correct it, and repeat lint, focused tests, and browser inspection until no material issue remains or a limitation is explicitly reported.

## Work within the architecture

- Keep document parsing and validation in `src/features/document-import/`.
- Keep reader components, controllers, and reader-only utilities in `src/features/reader/`.
- Put code in `src/shared/` only when at least two features use it.
- Import feature behavior through each feature's `index.js` public API.
- Keep `App.jsx` focused on state and feature composition; extract cohesive behavior when it becomes too large.
- Reuse current components, icons, tokens, and interaction primitives.
- Add or update focused tests for parsing, validation, controllers, storage, text, and display formatting.

## Verify in proportion to risk

Always run:

```bash
npm run lint
npm run test
npm run build
git diff --check
```

For reader, parser, or visual changes, use the real browser to verify:

- Landing and sample-book entry.
- A representative imported document when parsing or structure changes.
- A controlled scanned PDF with no selectable text when OCR behavior changes, confirming the recognized page order against the source image.
- A renamed, malformed, empty, oversized, or unsupported file relevant to the change.
- The active focus/navigation model with relevant wheel, keyboard, and touch-equivalent input.
- Notes, bookmarks, settings, progress restoration, and error states touched by the change.
- Desktop and a `390 x 844` narrow viewport with no page or sidebar overflow.
- Actual `44 x 44` minimum touch targets for visible mobile controls.
- Long book and chapter titles.
- Every changed theme, including near-black surface values, and the loading state with a visible `100%` stage.
- Loaded logo assets and browser console warnings or errors.

Use computed styles, dimensions, active identifiers, and progress samples when screenshots alone are weak evidence.

## Use store language accurately

- `Web-ready`: responsive React/Next.js app verified in browsers.
- `PWA-ready`: manifest, icons, service worker, offline behavior, and installation flow implemented and tested.
- `Native-store-ready`: iOS or Android packaging, platform permissions, signing, policies, store assets, and device testing completed.
- `Published`: accepted and publicly available in the named store.

Visual polish alone makes Bookflow web-polished, not App Store-ready or Google Play-ready.

## Finish safely

1. Review the diff for unrelated files, secrets, debug output, generated builds, test books, local editor files, and unsupported claims.
2. Update `README.md` only when verified setup, formats, limits, privacy behavior, or user-facing capabilities change.
3. Report what changed, what was verified, remaining limitations, and the final Git state.
4. If pushing is authorized, follow the repository commit format, include bullet points in the commit body, recheck divergence, and never add co-author trailers.
