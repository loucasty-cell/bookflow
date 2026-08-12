# Bookflow Detailed Product Information

This document is the detailed source of truth for Bookflow's present behavior, limitations, design language, and future decision rules.

## Product summary

Bookflow is a local-first browser reader for PDF, EPUB, TXT, and Markdown files. Its main interaction is scroll-driven sentence focus: the complete sentence closest to an upper-page focus rail becomes bold and softly highlighted so the reader can maintain attention without manually selecting text.

## Current user journey

### 1. Open Bookflow

The landing page presents the product purpose, supported file types, privacy message, and a built-in sample reader.

### 2. Select or drop a book

The browser validates the extension and 50 MB size limit. The selected file remains on the device and is parsed locally.

### 3. Parse the document

- PDF: PDF.js extracts selectable text page by page.
- EPUB: JSZip reads the package, manifest, spine, metadata, and XHTML chapter content.
- Markdown: headings create sections when available, and Markdown syntax is reduced to readable text.
- TXT: normalized paragraphs are grouped into sections.

Heavy PDF and EPUB code is loaded only when its format is opened.

### 4. Prepare the reading model

Bookflow normalizes chapters and paragraphs, segments complete sentences, assigns sentence identifiers, counts words, estimates reading time at 230 words per minute, and determines which sections may participate in automatic focus.

### 5. Read with sentence focus

While the reader scrolls, Bookflow selects the eligible sentence nearest 32% from the top of the reading viewport. Hovering does not change focus. The selected sentence uses a pale-blue highlight, red edge, and stronger weight.

### 6. Control the reading session

The reader can:

- Click or use Enter or Space to hold a sentence in focus.
- Resume automatic focus.
- Bookmark the focused sentence.
- Copy the focused sentence.
- Add and delete margin notes.
- Navigate by current page or section, total count, slider, previous, and next.
- Change text size, line spacing, column width, focus intensity, and paper or dusk atmosphere.
- Return to the landing page and open another book.

### 7. Restore local state

When the same file is opened again, Bookflow uses its name, size, and last-modified value to restore notes, bookmarks, progress, and scroll position from the same browser profile.

## Current visual system

| Role | Value | Usage |
| --- | --- | --- |
| Main surface | Soft white | Low-fatigue reader background |
| Primary filler | `#507B9C` | Brand, controls, and blue structure |
| Focus color | `#C2DCFF` | Sentence highlight and calm supporting surfaces |
| Interaction accent | `#E3242B` | Focus edge, progress, and important active details |
| Typography | DM Sans and Newsreader | Interface clarity and long-form readability |

Buttons use smooth color, border, shadow, and movement transitions. Motion must remain subtle and should respect reduced-motion preferences as that support is expanded.

## Focus eligibility behavior

Automatic focus currently ignores likely non-body sections based on titles, location, and section length.

Common front-matter indicators include:

- Cover and title pages.
- Contents and table of contents.
- Copyright and dedication.
- Acknowledgements.
- Preface, foreword, prologue, and introduction.
- Epigraph and author notes.

Common end-matter indicators include:

- Appendix and bibliography.
- References and glossary.
- Index and credits.
- Afterword and epilogue.
- About the author.

Explicit chapter-like titles such as chapter, part, section, lesson, unit, act, and volume are protected from generic short-section filtering. If every section is filtered, Bookflow restores all sections as eligible rather than leaving the reader without focus targets.

This behavior is heuristic. It does not fully understand a book's meaning, and a future manual include/exclude control is recommended.

## Privacy and security boundary

### Current guarantees

- No account is required.
- No backend is connected.
- No analytics or advertising service is connected.
- No AI service receives book text.
- Imported document contents stay in browser memory during the reading session.
- Only preferences and reading state are persisted in `localStorage`.
- EPUB paths are normalized before archive entries are opened.
- Imported markup is converted to text and rendered through React text nodes.

### User responsibility

- Browser storage belongs to the browser profile and can be removed by clearing site data.
- Anyone with access to the same browser profile may be able to see saved notes and quoted sentences.
- Bookflow does not remove DRM and should be used with files the reader is allowed to access.

## Accessibility currently covered

- Keyboard activation for selectable sentences.
- Accessible names for settings, notes, page navigation, and panel controls.
- Responsive layout for desktop and mobile.
- Visible keyboard focus outlines.
- Focus modes that retain nearby reading context.
- Text sizing, line-height, and column-width controls.

Accessibility still needs broader screen-reader, zoom, reduced-motion, high-contrast, and cross-browser testing before claiming full conformance with a specific standard.

## Known limitations

| Area | Current limitation |
| --- | --- |
| Scanned PDFs | No OCR; image-only pages have no selectable text |
| PDF layout | Complex columns, tables, headers, and footers may reconstruct imperfectly |
| EPUB styling | Bookflow extracts readable text rather than reproducing publisher layout |
| Matter detection | Heuristic and may classify unusual books incorrectly |
| Document identity | A changed filename, size, or modified time creates a different saved-state key |
| Persistence | State is limited to one browser profile and device |
| Notes | No export, import, search, or jump-to-quote yet |
| Library | No persistent book library or recent-books screen yet |
| Testing | Text helpers have automated coverage; parser and reader integration coverage should grow |

## Current technology

| Technology | Current responsibility |
| --- | --- |
| React 18 | Components and application state |
| Vite 6 | Development and production build |
| PDF.js | Local PDF text extraction |
| JSZip | Local EPUB archive reading |
| Lucide React | Interface icons |
| `Intl.Segmenter` | Sentence segmentation with fallback |
| `localStorage` | Local settings and reading state |
| Vitest | Automated unit tests |
| ESLint | Static code-quality checks |

## Future implementation principles

1. Improve reading correctness before adding broad social or AI features.
2. Keep the core reader functional offline and without an account.
3. Make document transmission explicit and opt-in if external services are ever added.
4. Provide manual controls when heuristics can make an incorrect decision.
5. Prefer native browser capabilities and existing dependencies.
6. Validate representative real documents for every parser change.
7. Keep long documents responsive and avoid loading unnecessary work into the initial bundle.
8. Update claims in all project documentation whenever behavior changes.

## Verification baseline

Every completed change should run:

```bash
npm run lint
npm run test
npm run build
```

Reader or parser changes should also be checked with a representative document, browser console inspection, desktop layout, mobile layout, scroll focus, pin/resume, bookmarks, notes, settings, and restored progress.

## Related documents

- `README.md`: setup and concise product overview.
- `AGENTS.md`: mandatory development and Git rules.
- `structure.md`: file placement and architecture boundaries.
- `goals.md`: current outcomes and prioritized roadmap.
- `api.md`: internal interfaces, data shapes, and future external API rules.
