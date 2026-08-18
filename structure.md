# Bookflow Project Structure

This document defines the current repository layout and the structure future changes should follow. It is descriptive for existing files and prescriptive for new work.

## Current structure

```text
bookflow/
|-- src/
|   |-- features/
|   |   |-- document-import/
|   |   |   |-- lib/
|   |   |   |   |-- documentParsers.js
|   |   |   |   |-- epubParser.js
|   |   |   |   |-- epubUtils.js
|   |   |   |   |-- pdfParser.js
|   |   |   |   `-- textParser.js
|   |   |   `-- index.js
|   |   |-- landing/
|   |   |   |-- components/
|   |   |   |   `-- LandingPage.jsx
|   |   |   |-- sampleBook.js
|   |   |   `-- index.js
|   |   `-- reader/
|   |       |-- components/
|   |       |   |-- ContentsPanel.jsx
|   |       |   |-- FocusCard.jsx
|   |       |   |-- NotesPanel.jsx
|   |       |   |-- ReaderPage.jsx
|   |       |   `-- SettingsPanel.jsx
|   |       |-- config.js
|   |       `-- index.js
|   |-- shared/
|   |   |-- components/
|   |   |   |-- Brand.jsx
|   |   |   |-- LoadingOverlay.jsx
|   |   |   `-- index.js
|   |   `-- lib/
|   |       |-- index.js
|   |       |-- storage.js
|   |       |-- text.js
|   |       `-- text.test.js
|   |-- App.jsx
|   |-- main.jsx
|   `-- styles.css
|-- AGENTS.md
|-- README.md
|-- api.md
|-- detailsinfo.md
|-- goals.md
|-- structure.md
|-- eslint.config.js
|-- index.html
|-- package.json
|-- package-lock.json
`-- vite.config.js
```

## Responsibilities

### Application composition

- `src/App.jsx` owns application-level state, document lifecycle, focus state, reader progress, notes, bookmarks, and browser persistence.
- `src/main.jsx` mounts the React application.
- `src/styles.css` contains the current responsive design system and reader themes.

### Features

- `features/document-import/` validates and parses PDF, EPUB, TXT, and Markdown files.
- `features/landing/` contains the import experience and built-in sample book.
- `features/reader/` contains the reading layout, page navigator, sentence focus card, notes, and settings.
- Each feature exposes its public interface through its own `index.js`.

### Shared code

- `shared/components/` contains UI used by more than one feature.
- `shared/lib/text.js` handles normalization, sentence boundaries, paragraphs, Markdown stripping, word counts, and document identifiers.
- `shared/lib/storage.js` contains safe JSON parsing and storage-key creation.
- Shared utilities are exported through `shared/lib/index.js`.

## Placement rules for future work

| Change | Location |
| --- | --- |
| New import format or parser behavior | `src/features/document-import/` |
| Reader-only component or hook | `src/features/reader/` |
| Landing/import-screen behavior | `src/features/landing/` |
| Code used by two or more features | `src/shared/` |
| Small unit test | Beside the tested module |
| Cross-feature integration test | `tests/`, created only when the first test is added |
| Static image, font, or icon not provided by a package | `src/assets/`, created only when required |
| Optional backend approved in the future | A separate top-level service directory with its own documentation and dependency manifest |

Do not create empty roadmap folders. A folder should be added only with the feature that needs it.

## Dependency boundaries

- A feature may import from `shared/`.
- A feature must not import another feature's internal files.
- Cross-feature imports must use the target feature's public `index.js`.
- `App.jsx` may compose feature exports but should not absorb feature-specific rendering.
- Imported book text must remain React text content; do not render it with `dangerouslySetInnerHTML`.

## Naming rules

| Item | Convention | Example |
| --- | --- | --- |
| Feature folder | kebab-case | `document-import` |
| Component | PascalCase | `ReaderPage.jsx` |
| Hook | `use` prefix | `useSentenceFocus.js` |
| Utility | camelCase | `documentParsers.js` |
| Public feature export | `index.js` | `features/reader/index.js` |
| Documentation | lowercase name requested by the project | `goals.md` |

## Structure quality checks

Before completing structural work:

1. Confirm the file belongs to one clear feature.
2. Avoid adding a dependency for behavior available in the browser or current stack.
3. Keep heavy PDF and EPUB libraries dynamically imported.
4. Add tests for parsing, storage, or text behavior that changes.
5. Run `npm run lint`, `npm run test`, and `npm run build`.
6. Confirm the final diff contains no generated builds, logs, test books, or private content.
