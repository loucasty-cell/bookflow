# Bookflow Development Guide

This file defines how future changes to Bookflow should be planned, implemented, verified, and organized. Follow it whenever modifying this repository. Do not implement roadmap ideas unless the user explicitly requests them.

## Product purpose

Bookflow is a private, browser-based reading application that turns PDFs, EPUB ebooks, text files, and Markdown into a calm, sentence-focused reading experience.

The primary product behavior is sentence focus: as the reader scrolls, one complete sentence receives a gentle highlight near the natural reading line. Readers can also pin a sentence, bookmark it, or attach a note.

## Non-negotiable principles

1. Keep imported book contents on the user's device.
2. Do not send document text to AI services, analytics providers, or external APIs unless the user explicitly requests and approves that architecture.
3. Preserve the sentence-focus experience as the main feature.
4. Maintain accessible keyboard controls and responsive desktop, tablet, and mobile layouts.
5. Keep claims accurate. Never describe an unimplemented or unverified feature as complete.
6. Do not hide limitations. Image-only or scanned PDFs require OCR before Bookflow can extract their text.
7. Avoid unnecessary dependencies, backend services, and complex abstractions.

## Current technology

- React for interface components and state.
- Vite for development and production builds.
- PDF.js for local PDF text extraction.
- JSZip for local EPUB package extraction.
- Lucide React for interface icons.
- `Intl.Segmenter` with a fallback for sentence boundaries.
- `localStorage` for settings, notes, bookmarks, and reading progress.
- Vitest for automated tests.
- ESLint for code-quality checks.

Consult `package.json` before changing versions or introducing another library.

## Professional project structure

Keep the repository root limited to project configuration, documentation, and entry files. Place application code inside `src/`.

```text
bookflow/
├── src/
│   ├── components/        # Reusable interface components
│   │   ├── common/        # Buttons, dialogs, loading and feedback UI
│   │   ├── landing/       # Home and document-import UI
│   │   └── reader/        # Reader, contents, notes and settings UI
│   ├── hooks/             # Reusable React behavior
│   ├── lib/               # Parsing, text and storage utilities
│   ├── styles/            # Design tokens and feature styles when split is useful
│   ├── App.jsx            # Application composition and routing state
│   └── main.jsx           # React entry point
├── public/                # Static assets that must not be bundled
├── tests/                 # Cross-feature or integration tests when needed
├── AGENTS.md              # Future development rules
├── README.md              # User-facing setup and feature documentation
├── package.json
└── vite.config.js
```

Create folders only when they contain real files needed by the requested change. Do not add empty folders. Small, closely related logic may remain together until separating it makes the code easier to understand or test.

## File responsibilities

- Keep document parsing in `src/lib/documentParsers.js` or focused parser modules under `src/lib/parsers/`.
- Keep sentence segmentation and text normalization in `src/lib/text.js`.
- Keep persistent browser-storage access behind a small utility if storage behavior grows.
- Keep reusable stateful behavior in hooks rather than duplicating effects across components.
- Keep components focused on one clear responsibility.
- Keep global design tokens and responsive rules consistent; avoid scattered inline styles.
- Keep tests near small utility modules or in `tests/` for cross-feature behavior.

## Change workflow

When the user asks for a future change:

1. Read this file, `README.md`, `package.json`, and the files related to the request.
2. Check `git status` before editing and preserve unrelated user changes.
3. Confirm the real current behavior instead of relying on assumptions.
4. Make the smallest complete change that satisfies the request.
5. Update or add tests for changed parsing, storage, and text behavior.
6. Test the feature in a browser when it affects layout or interaction.
7. Update `README.md` only when setup, supported formats, limitations, or user-visible capabilities change.
8. Review the final diff for accidental files, secrets, debug output, and unsupported claims.

Do not perform unrelated refactors during a narrowly scoped request.

## React and JavaScript standards

- Prefer functional components and focused custom hooks.
- Use descriptive names instead of abbreviations.
- Keep derived values in `useMemo` only when computation or stable identity justifies it.
- Keep effects limited to synchronization with browser or external state.
- Clean up event listeners, timers, animation frames, and observers.
- Avoid direct DOM manipulation when React state can express the behavior clearly.
- Render imported text through React text nodes; do not inject untrusted HTML.
- Handle parser failures with clear, actionable messages.
- Preserve lazy loading for heavy PDF and EPUB dependencies.
- Avoid adding global state libraries unless the application genuinely outgrows local state and hooks.

## Reader experience standards

- The active sentence must remain readable without harsh contrast.
- Non-active text must never become so faint that it is inaccessible.
- Sentence focus must work with scrolling, pointer input, keyboard input, and touch layouts.
- Reader settings must not cause horizontal overflow at supported mobile widths.
- Focus, notes, and settings controls require accessible names.
- Respect `prefers-reduced-motion`.
- Preserve comfortable typography, readable line length, and clear visual hierarchy.
- Avoid distracting animations, badges, popups, or gamification that competes with reading.

## Document-processing standards

- Enforce supported extensions and file-size limits before expensive parsing.
- Keep PDF and EPUB parsing asynchronous so the interface remains responsive.
- Preserve document order and useful chapter or page labels.
- Remove obvious repeated headers, footers, and page numbers only when detection is reliable.
- Never silently discard large portions of a document.
- Provide an explicit message when no selectable PDF text is available.
- Treat imported document markup and metadata as untrusted input.
- Do not use `dangerouslySetInnerHTML` for book content.

## Privacy and security

- Never commit API keys, tokens, credentials, private documents, or local environment files.
- Do not log imported document contents.
- Do not store full book contents in `localStorage`.
- Keep `.env*`, build output, dependencies, and logs ignored.
- Validate and safely parse archive paths inside EPUB files.
- Avoid remote scripts and runtime code execution.
- If a future feature requires uploading content, clearly explain the destination, purpose, retention, and privacy impact before implementation.

## Required verification

Run these commands after relevant changes:

```bash
npm run lint
npm run test
npm run build
```

For reader, parser, or styling changes, also verify the actual app in a browser:

- Import a representative supported document.
- Confirm sentence focus follows the reading position.
- Confirm pin and resume behavior.
- Confirm bookmarks and notes.
- Confirm settings and progress persistence.
- Check for browser console errors.
- Check at least one desktop and one mobile viewport.

When a format-specific parser changes, test that format directly. State clearly if a format could not be tested.

## Git standards

- Fetch and check branch divergence before pushing.
- Stage only files belonging to the requested change.
- Do not commit `node_modules/`, `dist/`, logs, environment files, or test documents.
- Use a concise commit message describing the user-visible outcome.
- Never force-push unless the user explicitly requests it and understands the risk.
- Do not rewrite or discard unrelated user work.
- Push only when the user requests a push or the active request already includes it.

## Definition of done

A future change is complete only when:

- The requested behavior works in the real application.
- Existing core reading behavior still works.
- Privacy and accessibility rules remain satisfied.
- Relevant tests pass.
- Lint and production build pass.
- Browser interaction and responsive layout are checked when applicable.
- Documentation matches the verified implementation.
- The final diff contains only intended files.

If any required check cannot be completed, report that limitation directly instead of presenting the change as fully verified.
