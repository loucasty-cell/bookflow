# Bookflow Development Guide

Follow this file whenever modifying Bookflow. Apply the global rules first, then the project-specific rules. Do not implement roadmap ideas unless the user explicitly requests them.

## Global rules

- Do not add `Co-Authored-By` or other co-author messages to commits.
- Do not use emojis in code, commits, or user-facing development output.
- Keep responses concise and omit unnecessary preambles.
- Search the repository before writing code.
- Read a file before editing it.
- Follow neighboring patterns and existing formatting.
- Do not add code comments unless the user explicitly asks for them.
- Do not add dependencies unless the user explicitly approves them.
- Never log or commit secrets, API keys, tokens, credentials, or private documents.
- Edit existing files when practical. Create files only when the requested change or established structure requires them.
- Ask for clarification instead of guessing when project documentation and existing patterns do not resolve an important decision.

## Commit rules

Prefix every commit subject with one of these conventional types:

- `feat`: add a user-facing feature.
- `fix`: correct or edit existing behavior.
- `refactor`: reorganize code without changing behavior.
- `docs`: change documentation.
- `test`: add or edit tests.
- `chore`: change dependencies, build scripts, or other non-source maintenance.
- `style`: change or fix visual layout and CSS.

List the included changes as `-` bullets in the commit body.

```text
refactor: organize the reader by feature

- separate reader panels from application state
- move shared utilities behind public exports
```

## Product purpose

Bookflow is a private, browser-based reading application that turns PDFs, EPUB ebooks, text files, and Markdown into a calm, sentence-focused reading experience.

Sentence focus is the primary behavior. As the reader scrolls, one complete sentence receives a gentle highlight near the natural reading line. Readers can pin a sentence, bookmark it, or attach a note.

## Non-negotiable product rules

1. Keep imported book contents on the user's device.
2. Do not send document text to AI services, analytics providers, or external APIs unless the user explicitly requests and approves that architecture.
3. Preserve sentence focus as the main feature.
4. Maintain accessible keyboard controls and responsive desktop, tablet, and mobile layouts.
5. Never describe an unimplemented or unverified feature as complete.
6. State that image-only or scanned PDFs require OCR before Bookflow can extract their text.
7. Avoid unnecessary dependencies, backend services, and abstractions.

## Current technology

- React for components and state.
- Vite for development and production builds.
- PDF.js for local PDF text extraction.
- JSZip for local EPUB package extraction.
- Lucide React for interface icons.
- `Intl.Segmenter` with a fallback for sentence boundaries.
- `localStorage` for settings, notes, bookmarks, and reading progress.
- Vitest for automated tests.
- ESLint for code-quality checks.

Consult `package.json` before changing versions or proposing another library.

## Project structure

Bookflow uses a feature-based React structure with shared code reserved for behavior used by multiple features.

```text
src/
|-- features/
|   |-- document-import/
|   |   |-- lib/
|   |   |   `-- documentParsers.js
|   |   `-- index.js
|   |-- landing/
|   |   |-- components/
|   |   |   `-- LandingPage.jsx
|   |   |-- sampleBook.js
|   |   `-- index.js
|   `-- reader/
|       |-- components/
|       |   |-- ContentsPanel.jsx
|       |   |-- FocusCard.jsx
|       |   |-- NotesPanel.jsx
|       |   |-- ReaderPage.jsx
|       |   `-- SettingsPanel.jsx
|       |-- config.js
|       `-- index.js
|-- shared/
|   |-- components/
|   |   |-- Brand.jsx
|   |   |-- LoadingOverlay.jsx
|   |   `-- index.js
|   `-- lib/
|       |-- storage.js
|       |-- text.js
|       |-- text.test.js
|       `-- index.js
|-- App.jsx
|-- main.jsx
`-- styles.css
```

Create folders only when they contain real files required by a requested change. Do not add empty placeholder folders.

## Feature boundaries

- Keep each feature self-contained.
- Do not import another feature's internal files. Import through that feature's `index.js` public API.
- Put code in `shared/` only when at least two features use it.
- Keep feature-specific components, data, configuration, and future hooks inside that feature.
- Keep `App.jsx` focused on application state and feature composition.
- Keep reusable storage and text behavior in `shared/lib/`.
- Keep document parsing inside `features/document-import/`.
- Keep tests beside small utility modules or use a top-level `tests/` folder for cross-feature integration tests.

## Naming conventions

| Type | Convention | Example |
| --- | --- | --- |
| Feature folder | kebab-case | `document-import/` |
| React component | PascalCase | `ReaderPage.jsx` |
| Hook | `use` prefix | `useReadingProgress.js` |
| Utility | camelCase | `storage.js` |
| Public export | `index.js` | `export { ReaderPage } from './components/ReaderPage.jsx'` |

## React and JavaScript rules

- Use functional components and focused hooks.
- Use descriptive names instead of abbreviations.
- Keep JavaScript strict and avoid unsafe dynamic values.
- Use `useMemo` only when computation or stable identity justifies it.
- Keep effects limited to synchronization with browser or external state.
- Clean up event listeners, timers, animation frames, and observers.
- Avoid direct DOM manipulation when React state can express the behavior.
- Render imported text through React text nodes. Never use `dangerouslySetInnerHTML` for book content.
- Handle parser failures with clear, actionable messages.
- Preserve lazy loading for heavy PDF and EPUB dependencies.
- Do not introduce a global state library unless the user approves it and the application genuinely requires it.
- Match the codebase's imports, spacing, and component conventions.

## Reader experience rules

- Keep the active sentence readable without harsh contrast.
- Do not make non-active text inaccessible.
- Support scrolling, pointer input, keyboard input, and touch layouts.
- Prevent horizontal overflow at supported mobile widths.
- Give focus, notes, and settings controls accessible names.
- Respect `prefers-reduced-motion`.
- Preserve comfortable typography, readable line length, and clear hierarchy.
- Avoid animations, badges, popups, or gamification that competes with reading.

## Document-processing rules

- Validate supported extensions and file-size limits before parsing.
- Keep PDF and EPUB parsing asynchronous.
- Preserve document order and useful chapter or page labels.
- Remove repeated headers, footers, and page numbers only when detection is reliable.
- Never silently discard large portions of a document.
- Show an explicit message when a PDF has no selectable text.
- Treat document markup, archives, filenames, and metadata as untrusted input.
- Validate archive paths inside EPUB files.
- Do not log or persist full imported book contents.

## Change workflow

1. Read this file, `README.md`, `package.json`, and files related to the request.
2. Run `git status` and preserve unrelated user work.
3. Search for existing patterns before writing.
4. Confirm current behavior instead of relying on assumptions.
5. Make the smallest complete change that satisfies the request.
6. Add or update tests for changed parsing, storage, and text behavior.
7. Test layout or interaction changes in a real browser.
8. Update `README.md` only when setup, supported formats, limitations, or user-visible capabilities change.
9. Review the final diff for accidental files, secrets, debug output, comments, and unsupported claims.

Do not perform unrelated refactors during a narrowly scoped request.

## Required verification

Run the available checks before pushing:

```bash
npm run lint
npm run test
npm run build
```

For reader, parser, or visual changes, also verify:

- A representative document imports successfully.
- Sentence focus follows the reading position.
- Pin and resume work.
- Bookmarks and notes work.
- Settings and reading progress persist.
- The browser console has no errors.
- Desktop and mobile layouts remain usable.

When a format-specific parser changes, test that format directly. State clearly if a format could not be tested.

## Git workflow

- Fetch and check branch divergence before pushing.
- Stage only files belonging to the requested change.
- Do not commit `node_modules/`, `dist/`, logs, environment files, or test documents.
- Follow the commit subject prefix and bullet-body rules in this file.
- Do not add co-author trailers.
- Never force-push unless the user explicitly requests it and understands the risk.
- Do not rewrite or discard unrelated user work.
- Push only when the user requests it or the active request already includes it.

## Definition of done

A change is complete only when:

- The requested behavior works in the real application.
- Existing core reading behavior still works.
- Privacy and accessibility rules remain satisfied.
- Relevant tests pass.
- Lint and the production build pass.
- Browser interaction and responsive layout are checked when applicable.
- Documentation matches the verified implementation.
- The final diff contains only intended files.

If a required check cannot be completed, report that limitation instead of presenting the change as fully verified.
